const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true, unique: true, sparse: true },
    productId: { type: String, index: true },
    tipo: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true },
    precioAnterior: { type: Number, default: null },
    imagenes: { type: [String], default: [] },
    talles: { type: [String], default: [] },
    colores: { type: [String], default: [] },
    stock: { type: Number, required: true, min: 0 },
    reservadoPendiente: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Producto', ProductoSchema);
