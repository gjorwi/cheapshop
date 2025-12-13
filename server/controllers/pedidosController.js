const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const { getNextSequence } = require('../utils/counter');
const { sendNewOrderEmail } = require('../utils/mailer');

// Obtener todos los pedidos (admin)
async function getPedidos(req, res) {
  try {
    const pedidos = await Pedido.find({}).sort({ id: -1 }).lean();
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
}

// Obtener pedidos de un usuario
async function getPedidosUsuario(req, res) {
  try {
    const pedidos = await Pedido.find({ usuarioId: req.usuario.id }).sort({ id: -1 }).lean();
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos del usuario' });
  }
}

// Crear nuevo pedido
async function createPedido(req, res) {
  try {
    const { items, total, cliente } = req.body;

    // Validar datos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
    }

    if (total === undefined || total === null) {
      return res.status(400).json({ error: 'Total es requerido' });
    }

    if (!cliente || typeof cliente !== 'object') {
      return res.status(400).json({ error: 'Datos del cliente son requeridos' });
    }

    const { nombre, cedula, telefono, email } = cliente;
    if (!nombre || !cedula || !telefono || !email) {
      return res.status(400).json({ error: 'Nombre, cédula, teléfono y email son requeridos' });
    }

    const session = await mongoose.startSession();
    let created;

    try {
      await session.withTransaction(async () => {
        // Verificar disponibilidad (stock - reservadoPendiente) y reservar (pendiente)
        for (const item of items) {
          const updated = await Producto.findOneAndUpdate(
            {
              id: item.productoId,
              $expr: {
                $gte: [
                  { $subtract: ['$stock', { $ifNull: ['$reservadoPendiente', 0] }] },
                  item.cantidad
                ]
              }
            },
            { $inc: { reservadoPendiente: item.cantidad } },
            { new: true, session }
          );
          if (!updated) {
            throw new Error(`Stock insuficiente o producto no encontrado: ${item.productoId}`);
          }
        }

        const pedidoId = await getNextSequence('pedidos');
        const pedidoDoc = await Pedido.create(
          [
            {
              id: pedidoId,
              usuarioId: req.usuario?.id ?? null,
              cliente: {
                nombre,
                cedula: String(cedula),
                telefono: String(telefono),
                email: String(email)
              },
              items: items.map(item => ({
                productoId: item.productoId,
                nombre: item.nombre,
                precio: item.precio,
                cantidad: item.cantidad,
                subtotal: item.precio * item.cantidad
              })),
              total: parseFloat(total),
              direccionEnvio: '-',
              estado: 'pendiente'
            }
          ],
          { session }
        );

        created = pedidoDoc[0].toObject();
      });
    } finally {
      session.endSession();
    }

    res.status(201).json(created);

    // Notificación por email al vendedor (best-effort)
    try {
      await sendNewOrderEmail({
        pedido: created,
        items: created?.items,
        total: created?.total,
        cliente: created?.cliente
      });
    } catch (e) {
      console.error('Error enviando email de nuevo pedido:', e);
    }
  } catch (error) {
    console.error(error);
    if (String(error.message || '').includes('Stock insuficiente')) {
      return res.status(400).json({ error: error.message });
    }
    if (String(error.message || '').includes('Transaction numbers are only allowed')) {
      return res.status(500).json({ error: 'MongoDB debe ser Replica Set para transacciones. Usa MongoDB Atlas.' });
    }
    res.status(500).json({ error: 'Error al crear pedido' });
  }
}

// Actualizar estado de pedido (admin)
async function updateEstadoPedido(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const pedido = await Pedido.findOne({ id: Number(id) });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Transiciones de estado que afectan reservas/stock
    // - pendiente -> confirmado: descontar stock real y liberar reserva pendiente
    // - pendiente -> cancelado: liberar reserva pendiente
    if (pedido.estado === 'pendiente' && estado === 'confirmado') {
      for (const item of pedido.items) {
        const updated = await Producto.findOneAndUpdate(
          {
            id: item.productoId,
            stock: { $gte: item.cantidad },
            reservadoPendiente: { $gte: item.cantidad }
          },
          { $inc: { stock: -item.cantidad, reservadoPendiente: -item.cantidad } },
          { new: true }
        );
        if (!updated) {
          return res.status(400).json({ error: `No se pudo confirmar por stock/reserva inválida: ${item.productoId}` });
        }
      }
    }

    if (pedido.estado === 'pendiente' && estado === 'cancelado') {
      for (const item of pedido.items) {
        await Producto.updateOne(
          { id: item.productoId },
          { $inc: { reservadoPendiente: -item.cantidad } }
        );
      }
    }

    pedido.estado = estado;
    await pedido.save();
    res.json(pedido.toObject());
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
}

async function removePedidoItem(req, res) {
  const { id } = req.params;
  const { productoId, cantidad } = req.body || {};

  const parsedProductoId = Number(productoId);
  const parsedCantidad = Number(cantidad);

  if (!Number.isFinite(parsedProductoId)) {
    return res.status(400).json({ error: 'productoId inválido' });
  }
  if (!Number.isFinite(parsedCantidad) || parsedCantidad <= 0) {
    return res.status(400).json({ error: 'cantidad inválida' });
  }

  const session = await mongoose.startSession();
  try {
    let updatedPedido;

    await session.withTransaction(async () => {
      const pedido = await Pedido.findOne({ id: Number(id) }).session(session);
      if (!pedido) {
        throw new Error('PEDIDO_NOT_FOUND');
      }
      if (pedido.estado !== 'pendiente') {
        throw new Error('PEDIDO_NOT_PENDIENTE');
      }

      const itemIndex = (pedido.items || []).findIndex((it) => Number(it.productoId) === parsedProductoId);
      if (itemIndex === -1) {
        throw new Error('ITEM_NOT_FOUND');
      }

      const item = pedido.items[itemIndex];
      const removeQty = Math.min(parsedCantidad, Number(item.cantidad));

      const producto = await Producto.findOneAndUpdate(
        {
          id: parsedProductoId,
          reservadoPendiente: { $gte: removeQty }
        },
        { $inc: { reservadoPendiente: -removeQty } },
        { new: true, session }
      );

      if (!producto) {
        throw new Error('RESERVA_INVALIDA');
      }

      const newQty = Number(item.cantidad) - removeQty;
      if (newQty <= 0) {
        pedido.items.splice(itemIndex, 1);
      } else {
        pedido.items[itemIndex].cantidad = newQty;
        pedido.items[itemIndex].subtotal = Number(pedido.items[itemIndex].precio) * newQty;
      }

      pedido.total = (pedido.items || []).reduce((acc, it) => acc + Number(it.subtotal ?? (it.precio * it.cantidad)), 0);

      if ((pedido.items || []).length === 0) {
        pedido.estado = 'cancelado';
      }

      await pedido.save({ session });
      updatedPedido = pedido.toObject();
    });

    return res.json(updatedPedido);
  } catch (error) {
    if (String(error.message || '') === 'PEDIDO_NOT_FOUND') {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    if (String(error.message || '') === 'PEDIDO_NOT_PENDIENTE') {
      return res.status(400).json({ error: 'Solo se puede modificar un pedido pendiente' });
    }
    if (String(error.message || '') === 'ITEM_NOT_FOUND') {
      return res.status(404).json({ error: 'Item no encontrado en el pedido' });
    }
    if (String(error.message || '') === 'RESERVA_INVALIDA') {
      return res.status(400).json({ error: 'No se pudo devolver la reserva (reserva inválida)' });
    }
    if (String(error.message || '').includes('Transaction numbers are only allowed')) {
      return res.status(500).json({ error: 'MongoDB debe ser Replica Set para transacciones. Usa MongoDB Atlas.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Error al modificar items del pedido' });
  } finally {
    session.endSession();
  }
}

module.exports = {
  getPedidos,
  getPedidosUsuario,
  createPedido,
  updateEstadoPedido,
  removePedidoItem
};
