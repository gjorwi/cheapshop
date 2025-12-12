const express = require('express');
const { 
  getUsuarios, 
  register, 
  login, 
  getPerfil, 
  verifyToken, 
  verifyAdmin 
} = require('../controllers/usuariosController');

const router = express.Router();

// Rutas públicas
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas
router.get('/perfil', verifyToken, getPerfil);
router.get('/', verifyToken, verifyAdmin, getUsuarios);

module.exports = router;
