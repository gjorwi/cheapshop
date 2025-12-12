const express = require('express');
const { 
  getPedidos, 
  getPedidosUsuario, 
  createPedido, 
  updateEstadoPedido 
} = require('../controllers/pedidosController');
const { verifyToken, verifyTokenOptional, verifyAdmin } = require('../controllers/usuariosController');

const router = express.Router();

// Rutas protegidas
router.get('/', verifyToken, verifyAdmin, getPedidos);
router.get('/mis-pedidos', verifyToken, getPedidosUsuario);
router.post('/', verifyTokenOptional, createPedido);
router.put('/:id/estado', verifyToken, verifyAdmin, updateEstadoPedido);

module.exports = router;
