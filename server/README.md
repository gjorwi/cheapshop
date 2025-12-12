# Cheapshop API - Servidor Backend

API REST para tienda de ropa con almacenamiento en archivos JSON planos.

## Características

- ✅ Gestión de productos con imágenes
- ✅ Registro y autenticación de usuarios (JWT)
- ✅ Sistema de pedidos con control de stock
- ✅ Almacenamiento en archivos JSON (sin base de datos)
- ✅ Upload de imágenes organizadas por producto

## Instalación

1. Instalar dependencias:
```bash
cd server
npm install
```

2. Inicializar base de datos:
```bash
node init-db.js
```
Esto creará los archivos JSON en `bdplana/` y un usuario admin:
- Email: `admin@cheapshop.com`
- Contraseña: `admin123`

3. Iniciar servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor correrá en `http://localhost:3001`

## Endpoints

### Productos
- `GET /api/productos` - Obtener todos los productos
- `POST /api/productos` - Crear producto (admin)
- `PUT /api/productos/:id` - Actualizar producto (admin)
- `DELETE /api/productos/:id` - Eliminar producto (admin)

### Usuarios
- `POST /api/usuarios/register` - Registrar nuevo usuario
- `POST /api/usuarios/login` - Iniciar sesión
- `GET /api/usuarios/perfil` - Obtener perfil (requiere token)
- `GET /api/usuarios/` - Obtener todos los usuarios (admin)

### Pedidos
- `GET /api/pedidos` - Obtener todos los pedidos (admin)
- `GET /api/pedidos/mis-pedidos` - Pedidos del usuario actual
- `POST /api/pedidos` - Crear nuevo pedido
- `PUT /api/pedidos/:id/estado` - Actualizar estado de pedido (admin)

## Estructura de Archivos

```
server/
├── bdplana/           # Archivos JSON de "base de datos"
│   ├── productos.json
│   ├── usuarios.json
│   └── pedidos.json
├── public/uploads/    # Imágenes subidas
│   └── productos/
│       └── [productId]/
├── controllers/       # Lógica de negocio
├── routes/           # Definición de rutas
├── utils/            # Utilidades (fileDb.js)
└── index.js          # Servidor principal
```

## Uso con Frontend

El frontend (Next.js) debe hacer peticiones a `http://localhost:3001/api/*`

Las imágenes se acceden via: `http://localhost:3001/uploads/productos/[productId]/[imagen]`

## Variables de Entorno

- `PORT` - Puerto del servidor (default: 3001)
- `JWT_SECRET` - Clave secreta para JWT (default: 'cheapshop-secret-key')

## Notas

- Los archivos JSON se manejan de forma atómica para evitar corrupción
- Las imágenes se guardan en carpetas únicas por producto
- El sistema incluye control de stock automático
- Los passwords se hashean con bcrypt
