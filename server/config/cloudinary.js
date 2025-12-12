const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dxjfo6whd',
  api_key: process.env.CLOUDINARY_API_KEY || '896638362276395',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'j0JKXPGg-Dzq6e5CL8Iez26jHkw'
});

module.exports = cloudinary;
