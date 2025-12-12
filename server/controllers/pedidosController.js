const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const { getNextSequence } = require('../utils/counter');

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
        // Verificar stock y actualizarlo de forma segura
        for (const item of items) {
          const updated = await Producto.findOneAndUpdate(
            { id: item.productoId, stock: { $gte: item.cantidad } },
            { $inc: { stock: -item.cantidad } },
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

    // Si se cancela, devolver stock
    if (estado === 'cancelado' && pedido.estado !== 'cancelado') {
      for (const item of pedido.items) {
        await Producto.updateOne(
          { id: item.productoId },
          { $inc: { stock: item.cantidad } }
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

module.exports = {
  getPedidos,
  getPedidosUsuario,
  createPedido,
  updateEstadoPedido
};
