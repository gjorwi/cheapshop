require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('./config/db');
const Usuario = require('./models/Usuario');
const Counter = require('./models/Counter');

async function initDatabase() {
  try {
    console.log('Inicializando base de datos (MongoDB)...');

    await connectDB();

    await Counter.updateOne(
      { name: 'usuarios' },
      { $setOnInsert: { seq: 0 } },
      { upsert: true }
    );
    await Counter.updateOne(
      { name: 'productos' },
      { $setOnInsert: { seq: 0 } },
      { upsert: true }
    );
    await Counter.updateOne(
      { name: 'pedidos' },
      { $setOnInsert: { seq: 0 } },
      { upsert: true }
    );

    const adminEmail = 'admin@cheapshop.com';
    const adminPasswordPlain = 'admin123';

    const existing = await Usuario.findOne({ email: adminEmail });
    if (existing) {
      console.log('Usuario admin ya existe. No se recrea.');

      await Counter.updateOne(
        { name: 'usuarios', seq: { $lt: 1 } },
        { $set: { seq: 1 } }
      );
      return;
    }

    const adminPassword = await bcrypt.hash(adminPasswordPlain, 10);
    await Usuario.create({
      id: 1,
      nombre: 'Administrador',
      email: adminEmail,
      password: adminPassword,
      telefono: null,
      direccion: null,
      rol: 'admin'
    });

    await Counter.updateOne(
      { name: 'usuarios', seq: { $lt: 1 } },
      { $set: { seq: 1 } }
    );

    console.log('Base de datos inicializada exitosamente');
    console.log('Usuario admin creado:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Contraseña: ${adminPasswordPlain}`);
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exitCode = 1;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
