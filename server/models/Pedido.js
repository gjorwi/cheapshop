const mongoose = require('mongoose');

const PedidoItemSchema = new mongoose.Schema(
  {
    productoId: { type: Number, required: true },
    nombre: { type: String, required: true },
    precio: { type: Number, required: true },
    cantidad: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true }
  },
  { _id: false }
);

const PedidoClienteSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    cedula: { type: String, required: true },
    telefono: { type: String, required: true },
    email: { type: String, required: true }
  },
  { _id: false }
);

const PedidoSchema = new mongoose.Schema(
  {
    id: { type: Number, index: true, unique: true, sparse: true },
    usuarioId: { type: Number, required: false, index: true },
    cliente: { type: PedidoClienteSchema, required: true },
    items: { type: [PedidoItemSchema], required: true },
    total: { type: Number, required: true },
    direccionEnvio: { type: String, required: true },
    estado: {
      type: String,
      enum: ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'],
      default: 'pendiente'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pedido', PedidoSchema);
