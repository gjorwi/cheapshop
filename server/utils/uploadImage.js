const cloudinary = require('../config/cloudinary');

const uploadImage = async (file, folder = 'productos') => {
  try {
    console.log('=== SUBIENDO IMAGEN A CLOUDINARY ===');
    console.log('Archivo recibido:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer ? Buffer.byteLength(file.buffer) + ' bytes' : 'no buffer',
      path: file.path || 'no path'
    });
    
    // Verificar configuración de Cloudinary
    console.log('Configuración Cloudinary:', {
      cloud_name: cloudinary.config().cloud_name,
      api_key: cloudinary.config().api_key ? 'presente' : 'ausente',
      api_secret: cloudinary.config().api_secret ? 'presente' : 'ausente'
    });
    
    // Para multer con memoryStorage, usar el buffer directamente
    let uploadSource;
    if (file.buffer) {
      // Convertir buffer a base64
      const base64 = file.buffer.toString('base64');
      uploadSource = `data:${file.mimetype};base64,${base64}`;
      console.log('Usando buffer como base64');
    } else if (file.path) {
      uploadSource = file.path;
      console.log('Usando file path');
    } else {
      throw new Error('No se encontró ni buffer ni path en el archivo');
    }
    
    console.log('Iniciando upload a Cloudinary...');
    const result = await cloudinary.uploader.upload(uploadSource, {
      folder: `cheapshop/${folder}`,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1200, height: 1200, crop: 'limit' }
      ]
    });

    console.log('✅ Upload exitoso:', {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    });

    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  } catch (error) {
    console.error('❌ Error subiendo imagen a Cloudinary:', error);
    console.error('Detalles del error:', {
      message: error.message,
      code: error.code,
      http_code: error.http_code
    });
    throw error;
  }
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Error eliminando imagen de Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  uploadImage,
  deleteImage
};
