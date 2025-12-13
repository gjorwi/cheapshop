const express = require('express');
const { 
  getPedidos, 
  getPedidosUsuario, 
  createPedido, 
  updateEstadoPedido,
  removePedidoItem
} = require('../controllers/pedidosController');
const { verifyToken, verifyTokenOptional, verifyAdmin } = require('../controllers/usuariosController');

const router = express.Router();

// Rutas protegidas
router.get('/', verifyToken, verifyAdmin, getPedidos);
router.get('/mis-pedidos', verifyToken, getPedidosUsuario);
router.post('/', verifyTokenOptional, createPedido);
router.put('/:id/estado', verifyToken, verifyAdmin, updateEstadoPedido);
router.put('/:id/items/remove', verifyToken, verifyAdmin, removePedidoItem);

module.exports = router;
