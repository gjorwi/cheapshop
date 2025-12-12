const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadImage, deleteImage } = require('../utils/uploadImage');
const { readJSON, writeJSON, getNextId } = require('../utils/fileDb');

// Obtener todos los productos
async function getProductos(req, res) {
  try {
    const productos = await readJSON('productos.json');
    res.json(productos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
}

// Crear nuevo producto
async function createProducto(req, res) {
  try {
    console.log('=== CREANDO PRODUCTO ===');
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);
    console.log('req.files.length:', req.files?.length);
    
    const { tipo, nombre, descripcion, precio, precioAnterior, talles, colores, stock } = req.body;
    
    // Validar datos
    if (!tipo || !nombre || !descripcion || !precio || !talles || !colores || !stock) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Generar ID único
    const id = await getNextId('productos.json');
    const productId = uuidv4();
    console.log('ID generado:', id, 'ProductID:', productId);
    
    // Procesar imágenes con Cloudinary
    let imagenes = [];
    if (req.files && req.files.length > 0) {
      console.log(`Subiendo ${req.files.length} imágenes a Cloudinary...`);
      
      // Subir imágenes a Cloudinary
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        console.log(`Procesando archivo ${i + 1}:`, {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          buffer: file.buffer ? 'presente' : 'ausente'
        });
        
        try {
          const result = await uploadImage(file);
          imagenes.push(result.url);
          console.log('✅ Imagen subida exitosamente:', result.url);
        } catch (error) {
          console.error('❌ Error subiendo imagen:', error);
          // Continuar con las otras imágenes si una falla
        }
      }
    } else {
      console.log('⚠️ No se encontraron archivos en req.files');
    }
    
    console.log('Total de imágenes procesadas:', imagenes.length);

    // Crear objeto producto
    const producto = {
      id,
      productId,
      tipo,
      nombre,
      descripcion,
      precio: parseFloat(precio),
      precioAnterior: precioAnterior ? parseFloat(precioAnterior) : null,
      imagenes,
      talles: JSON.parse(talles),
      colores: JSON.parse(colores),
      stock: parseInt(stock),
      createdAt: new Date().toISOString()
    };

    // Guardar producto
    const productos = await readJSON('productos.json');
    productos.push(producto);
    await writeJSON('productos.json', productos);

    res.status(201).json(producto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
}

// Actualizar producto
async function updateProducto(req, res) {
  try {
    console.log('=== ACTUALIZANDO PRODUCTO ===');
    console.log('req.params completo:', req.params);
    console.log('req.url:', req.url);
    console.log('req.method:', req.method);
    
    // Intentar diferentes formas de extraer el ID
    let id = req.params.id;
    console.log('ID recibido para actualizar (req.params.id):', id);
    
    // Si req.params.id es undefined, intentar extraer de la URL
    if (!id && req.url) {
      const urlParts = req.url.split('/');
      id = urlParts[urlParts.length - 1];
      console.log('ID extraído de URL:', id);
    }
    
    console.log('ID final a usar:', id);
    
    const productos = await readJSON('productos.json');
    console.log('Productos disponibles:', productos.map(p => ({ id: p.id, name: p.nombre, tipo: typeof p.id })));
    
    const productoIndex = productos.findIndex(p => p.id == id);
    console.log('Índice encontrado:', productoIndex);

    if (productoIndex === -1) {
      console.log('❌ Producto no encontrado');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Actualizar datos
    const producto = productos[productoIndex];
    console.log('Producto antes de actualizar:', producto);
    console.log('req.body recibido:', req.body);
    console.log('req.files recibido:', req.files);
    
    // Actualizar campos del formulario
    if (req.body.tipo) producto.tipo = req.body.tipo;
    if (req.body.nombre) producto.nombre = req.body.nombre;
    if (req.body.descripcion) producto.descripcion = req.body.descripcion;
    if (req.body.precio) producto.precio = parseFloat(req.body.precio);
    if (req.body.precioAnterior) producto.precioAnterior = parseFloat(req.body.precioAnterior);
    if (req.body.talles) producto.talles = JSON.parse(req.body.talles);
    if (req.body.colores) producto.colores = JSON.parse(req.body.colores);
    if (req.body.stock) producto.stock = parseInt(req.body.stock);
    
    // Si se subieron nuevas imágenes, actualizarlas con Cloudinary
    if (req.files && req.files.length > 0) {
      console.log('Subiendo nuevas imágenes a Cloudinary...');
      const nuevasImagenes = [];
      
      for (const file of req.files) {
        try {
          const result = await uploadImage(file);
          nuevasImagenes.push(result.url);
          console.log('Nueva imagen subida:', result.url);
        } catch (error) {
          console.error('Error subiendo nueva imagen:', error);
        }
      }
      
      producto.imagenes = nuevasImagenes;
      console.log('Imágenes actualizadas:', nuevasImagenes);
    }
    
    producto.updatedAt = new Date().toISOString();
    console.log('Producto después de actualizar:', producto);

    await writeJSON('productos.json', productos);
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
}

// Eliminar producto
async function deleteProducto(req, res) {
  try {
    console.log('=== ELIMINANDO PRODUCTO ===');
    console.log('req.params completo:', req.params);
    console.log('req.url:', req.url);
    console.log('req.method:', req.method);
    
    // Intentar diferentes formas de extraer el ID
    let id = req.params.id;
    console.log('ID recibido para eliminar (req.params.id):', id);
    
    // Si req.params.id es undefined, intentar extraer de la URL
    if (!id && req.url) {
      const urlParts = req.url.split('/');
      id = urlParts[urlParts.length - 1];
      console.log('ID extraído de URL:', id);
    }
    
    console.log('ID final a usar:', id);
    console.log('Tipo de ID recibido:', typeof id);
    
    const productos = await readJSON('productos.json');
    console.log('Productos disponibles:', productos.map(p => ({ id: p.id, name: p.nombre, tipo: typeof p.id })));
    
    const productoIndex = productos.findIndex(p => p.id == id);
    console.log('Índice encontrado:', productoIndex);

    if (productoIndex === -1) {
      console.log('❌ Producto no encontrado');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = productos[productoIndex];
    
    // Eliminar carpeta de imágenes
    if (producto.productId) {
      const productDir = path.join(__dirname, '../public/uploads/productos', producto.productId);
      try {
        await fs.rmdir(productDir, { recursive: true });
      } catch {}
    }

    // Eliminar del array
    productos.splice(productoIndex, 1);
    await writeJSON('productos.json', productos);

    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
}

module.exports = {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto
};
