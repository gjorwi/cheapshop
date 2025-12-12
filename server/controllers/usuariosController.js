const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { getNextSequence } = require('../utils/counter');

const JWT_SECRET = process.env.JWT_SECRET || 'cheapshop-secret-key';

// Obtener todos los usuarios (admin)
async function getUsuarios(req, res) {
  try {
    const usuarios = await Usuario.find({}).select('-password').sort({ id: 1 }).lean();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

// Middleware para verificar token de forma opcional
function verifyTokenOptional(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    req.usuario = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    req.usuario = null;
    next();
  }
}

// Registrar nuevo usuario
async function register(req, res) {
  try {
    const { nombre, email, password, telefono, direccion } = req.body;

    // Validar datos
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y password son requeridos' });
    }

    const usuarioExistente = await Usuario.findOne({ email });
    
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const id = await getNextSequence('usuarios');
    const usuario = await Usuario.create({
      id,
      nombre,
      email,
      password: hashedPassword,
      telefono: telefono || null,
      direccion: direccion || null,
      rol: 'cliente'
    });

    // Generar token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Responder sin contraseña
    const usuarioSinPassword = usuario.toObject();
    delete usuarioSinPassword.password;
    res.status(201).json({ usuario: usuarioSinPassword, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

// Login de usuario
async function login(req, res) {
  try {
    const { email, password } = req.body;
    console.log(email, password);
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password son requeridos' });
    }

    const usuario = await Usuario.findOne({ email }).lean();

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password);
    
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Responder sin contraseña
    const { password: _, ...usuarioSinPassword } = usuario;
    res.json({ usuario: usuarioSinPassword, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el login' });
  }
}

// Obtener perfil de usuario
async function getPerfil(req, res) {
  try {
    const usuario = await Usuario.findOne({ id: req.usuario.id }).select('-password').lean();
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

// Middleware para verificar token
function verifyToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Middleware para verificar admin
function verifyAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

module.exports = {
  getUsuarios,
  register,
  login,
  getPerfil,
  verifyToken,
  verifyTokenOptional,
  verifyAdmin
};
