const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI||"mongodb+srv://cheapshop:Jf18769212..@cluster0.hj2m2at.mongodb.net/?appName=Cluster0";
  if (!uri) {
    console.warn('MONGODB_URI no configurada. El servidor continuará sin conexión a MongoDB.');
    return null;
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);
  return mongoose.connection;
}

module.exports = { connectDB };
