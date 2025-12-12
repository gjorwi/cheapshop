const express = require('express');
const multer = require('multer');
const { getProductos, createProducto, updateProducto, deleteProducto } = require('../controllers/productosController');

const router = express.Router();

// Configurar multer para subir imágenes desde memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por archivo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// Rutas
router.get('/', getProductos);
router.post('/', upload.array('imagenes', 5), createProducto); // Máximo 5 imágenes
router.put('/:id', upload.array('imagenes', 5), updateProducto); // Máximo 5 imágenes
router.delete('/:id', deleteProducto);

module.exports = router;
