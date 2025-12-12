const bcrypt = require('bcryptjs');
const { writeJSON } = require('./utils/fileDb');

async function initDatabase() {
  try {
    console.log('Inicializando base de datos...');
    
    // Crear usuario admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      id: 1,
      nombre: 'Administrador',
      email: 'admin@cheapshop.com',
      password: adminPassword,
      telefono: null,
      direccion: null,
      rol: 'admin',
      createdAt: new Date().toISOString()
    };
    
    await writeJSON('usuarios.json', [adminUser]);
    await writeJSON('productos.json', []);
    await writeJSON('pedidos.json', []);
    
    console.log('Base de datos inicializada exitosamente');
    console.log('Usuario admin creado:');
    console.log('  Email: admin@cheapshop.com');
    console.log('  Contraseña: admin123');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
