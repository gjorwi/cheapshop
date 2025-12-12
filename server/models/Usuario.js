const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true, unique: true, sparse: true },
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    telefono: { type: String, default: null },
    direccion: { type: String, default: null },
    rol: { type: String, enum: ['admin', 'cliente'], default: 'cliente' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Usuario', UsuarioSchema);
