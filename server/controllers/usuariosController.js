const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readJSON, writeJSON, getNextId } = require('../utils/fileDb');

const JWT_SECRET = process.env.JWT_SECRET || 'cheapshop-secret-key';

// Obtener todos los usuarios (admin)
async function getUsuarios(req, res) {
  try {
    const usuarios = await readJSON('usuarios.json');
    // No enviar contraseñas
    const usuariosSinPassword = usuarios.map(u => {
      const { password, ...usuario } = u;
      return usuario;
    });
    res.json(usuariosSinPassword);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
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

    // Verificar si el usuario ya existe
    const usuarios = await readJSON('usuarios.json');
    const usuarioExistente = usuarios.find(u => u.email === email);
    
    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const usuario = {
      id: await getNextId('usuarios.json'),
      nombre,
      email,
      password: hashedPassword,
      telefono: telefono || null,
      direccion: direccion || null,
      rol: 'cliente',
      createdAt: new Date().toISOString()
    };

    usuarios.push(usuario);
    await writeJSON('usuarios.json', usuarios);

    // Generar token
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Responder sin contraseña
    const { password: _, ...usuarioSinPassword } = usuario;
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

    // Buscar usuario
    const usuarios = await readJSON('usuarios.json');
    const usuario = usuarios.find(u => u.email === email);

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
    const usuarios = await readJSON('usuarios.json');
    const usuario = usuarios.find(u => u.id === req.usuario.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { password, ...usuarioSinPassword } = usuario;
    res.json(usuarioSinPassword);
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
  verifyAdmin
};
