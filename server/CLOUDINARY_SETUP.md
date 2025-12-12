# Configuración de Cloudinary para almacenamiento gratuito de imágenes

## Pasos para configurar:

### 1. Crear cuenta gratuita en Cloudinary
1. Ve a https://cloudinary.com/users/register/free
2. Regístrate con tu email o cuenta Google/GitHub
3. Verifica tu email

### 2. Obtener tus credenciales
1. Inicia sesión en tu dashboard de Cloudinary
2. En el dashboard, verás tu "Cloud name"
3. Haz clic en "Settings" (ícono de engranaje)
4. Ve a la sección "Account Details"
5. Copia tu "API Key" y "API Secret"

### 3. Configurar las variables de entorno
Crea un archivo `.env` en la carpeta `server` con:

```
CLOUDINARY_CLOUD_NAME=tu_cloud_name_aqui
CLOUDINARY_API_KEY=tu_api_key_aqui
CLOUDINARY_API_SECRET=tu_api_secret_aqui
PORT=3001
```

Reemplaza los valores con tus credenciales reales.

### 4. Instalar dotenv en el servidor
```bash
cd server
npm install dotenv
```

### 5. Actualizar index.js para cargar variables de entorno
Agrega al principio de `server/index.js`:
```javascript
require('dotenv').config();
```

## Beneficios del plan gratuito:
- ✅ 25GB de almacenamiento
- ✅ 25GB de ancho de banda mensual
- ✅ Optimización automática de imágenes
- ✅ CDN global para entrega rápida
- ✅ Transformaciones de imágenes on-the-fly
- ✅ URLs seguras con HTTPS

## Características implementadas:
- Subida automática de imágenes a Cloudinary
- Optimización y compresión automática
- Redimensionamiento inteligente (máximo 1200x1200)
- Formato automático (WebP/AVIF cuando sea posible)
- Calidad automática ajustada
- URLs seguras (HTTPS)

## Uso:
Las imágenes se subirán automáticamente cuando:
- Crees un nuevo producto
- Actualices un producto con nuevas imágenes
- Las URLs guardadas serán de Cloudinary: `https://res.cloudinary.com/...`

No necesitas hacer cambios en el frontend, todo funciona automáticamente.
