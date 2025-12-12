require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');

// Importar rutas
const productosRoutes = require('./routes/productos');
const usuariosRoutes = require('./routes/usuarios');
const pedidosRoutes = require('./routes/pedidos');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
const allowedOrigins = [
  'https://cheapshop.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin Origin (por ejemplo, health checks / curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(new Error(`CORS bloqueado para el origen: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes)
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, 'public/uploads')));

// Rutas
app.use('/api/productos', productosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/pedidos', pedidosRoutes);

// Ruta de prueba
app.get('/api', (req, res) => {
  res.json({ message: 'API de Cheapshop funcionando' });
});

// Manejo de errores
app.use((err, req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && (allowedOrigins.includes(requestOrigin) || requestOrigin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function startServer() {
  try {
    await connectDB();
    console.log('MongoDB conectado');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

startServer();
