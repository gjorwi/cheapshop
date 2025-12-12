const { readJSON, writeJSON, getNextId } = require('../utils/fileDb');

// Obtener todos los pedidos (admin)
async function getPedidos(req, res) {
  try {
    const pedidos = await readJSON('pedidos.json');
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
}

// Obtener pedidos de un usuario
async function getPedidosUsuario(req, res) {
  try {
    const pedidos = await readJSON('pedidos.json');
    const pedidosUsuario = pedidos.filter(p => p.usuarioId === req.usuario.id);
    res.json(pedidosUsuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos del usuario' });
  }
}

// Crear nuevo pedido
async function createPedido(req, res) {
  try {
    const { items, total, direccionEnvio } = req.body;

    // Validar datos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
    }

    if (!total || !direccionEnvio) {
      return res.status(400).json({ error: 'Total y dirección de envío son requeridos' });
    }

    // Verificar stock disponible
    const productos = await readJSON('productos.json');
    for (const item of items) {
      const producto = productos.find(p => p.id === item.productoId);
      if (!producto) {
        return res.status(400).json({ error: `Producto con ID ${item.productoId} no encontrado` });
      }
      if (producto.stock < item.cantidad) {
        return res.status(400).json({ error: `Stock insuficiente para ${producto.nombre}` });
      }
    }

    // Crear pedido
    const pedido = {
      id: await getNextId('pedidos.json'),
      usuarioId: req.usuario.id,
      items: items.map(item => ({
        productoId: item.productoId,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
        subtotal: item.precio * item.cantidad
      })),
      total: parseFloat(total),
      direccionEnvio,
      estado: 'pendiente', // pendiente, confirmado, enviado, entregado, cancelado
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Actualizar stock
    for (const item of items) {
      const productoIndex = productos.findIndex(p => p.id === item.productoId);
      productos[productoIndex].stock -= item.cantidad;
    }
    await writeJSON('productos.json', productos);

    // Guardar pedido
    const pedidos = await readJSON('pedidos.json');
    pedidos.push(pedido);
    await writeJSON('pedidos.json', pedidos);

    res.status(201).json(pedido);
  } catch (error) {
    console.error(error);
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

    const pedidos = await readJSON('pedidos.json');
    const pedidoIndex = pedidos.findIndex(p => p.id == id);

    if (pedidoIndex === -1) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Si se cancela, devolver stock
    if (estado === 'cancelado' && pedidos[pedidoIndex].estado !== 'cancelado') {
      const productos = await readJSON('productos.json');
      for (const item of pedidos[pedidoIndex].items) {
        const productoIndex = productos.findIndex(p => p.id === item.productoId);
        productos[productoIndex].stock += item.cantidad;
      }
      await writeJSON('productos.json', productos);
    }

    pedidos[pedidoIndex].estado = estado;
    pedidos[pedidoIndex].updatedAt = new Date().toISOString();

    await writeJSON('pedidos.json', pedidos);
    res.json(pedidos[pedidoIndex]);
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
