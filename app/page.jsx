"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Función helper para obtener URL de imagen
const getImageUrl = (imagePath) => {
  // Si la imagen ya es una URL completa (Cloudinary), usarla directamente
  if (imagePath && (imagePath.startsWith('http') || imagePath.startsWith('https'))) {
    return imagePath;
  }
  // Si es una ruta local, agregar el API_URL
  return `${API_URL}${imagePath}`;
};

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [adminModalStep, setAdminModalStep] = useState(null);
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState(["Todo"]);
  const [selectedCategory, setSelectedCategory] = useState("Todo");
  const [productImages, setProductImages] = useState({});
  const [cart, setCart] = useState([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [checkoutCliente, setCheckoutCliente] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    email: ''
  });
  const [submittingPedido, setSubmittingPedido] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imagesModalOpen, setImagesModalOpen] = useState(false);
  const [shouldDeleteImages, setShouldDeleteImages] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({
    tipo: "",
    nombre: "",
    descripcion: "",
    precio: "",
    precioAnterior: "",
    imagenes: [],
    talles: "",
    colores: "",
    stock: "",
  });

  const validatePortraitImages = async (files) => {
    const validations = await Promise.all(
      files.map((file) =>
        new Promise((resolve) => {
          const objectUrl = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            const isPortrait = img.naturalHeight > img.naturalWidth;
            URL.revokeObjectURL(objectUrl);
            resolve({ file, isPortrait, width: img.naturalWidth, height: img.naturalHeight });
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ file, isPortrait: false, width: 0, height: 0 });
          };
          img.src = objectUrl;
        })
      )
    );

    const validFiles = validations.filter(v => v.isPortrait).map(v => v.file);
    const invalid = validations.filter(v => !v.isPortrait);
    return { validFiles, invalid };
  };

  const handleImagesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      setNewProduct({ ...newProduct, imagenes: [] });
      return;
    }

    const { validFiles, invalid } = await validatePortraitImages(files);
    if (invalid.length > 0) {
      const detail = invalid
        .map(v => `${v.file.name}${v.width && v.height ? ` (${v.width}x${v.height})` : ''}`)
        .join('\n');
      alert(`Solo se permiten imágenes más altas que anchas (verticales).\n\nImágenes rechazadas:\n${detail}`);
      e.target.value = '';
      setNewProduct({ ...newProduct, imagenes: [] });
      return;
    }

    setNewProduct({ ...newProduct, imagenes: validFiles });
  };

  useEffect(() => {
    if (!selectedProduct) return;
    setCurrentImageIndex(0);
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!selectedProduct) return;
    const imagesCount = productImages[selectedProduct.id]?.length || 1;
    if (currentImageIndex >= imagesCount) setCurrentImageIndex(0);
  }, [selectedProduct, productImages, currentImageIndex]);

  // Función para filtrar productos por categoría
  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    if (category === "Todo") {
      setProducts(allProducts);
    } else {
      const filtered = allProducts.filter(product => product.tipo === category);
      setProducts(filtered);
    }
  };

  // Función para agregar producto al carrito
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.name === product.name);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    
    // Validar stock disponible
    if (currentQuantity >= product.stock) {
      alert(`No hay suficiente stock. Solo hay ${product.stock} unidades disponibles.`);
      return;
    }
    
    if (existingItem) {
      // Si el producto ya está en el carrito, aumentar cantidad
      setCart(cart.map(item => 
        item.name === product.name 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Si es un producto nuevo, agregarlo con cantidad 1
      setCart([...cart, { 
        ...product, 
        quantity: 1,
        cartId: Date.now() // ID único para el carrito
      }]);
    }
    
    // Cerrar el modal del producto después de agregar al carrito
    setSelectedProduct(null);
  };

  // Función para actualizar cantidad en el carrito
  const updateCartQuantity = (cartId, quantity) => {
    const item = cart.find(item => item.cartId === cartId);
    
    if (quantity <= 0) {
      removeFromCart(cartId);
    } else if (quantity > item.stock) {
      alert(`No hay suficiente stock. Solo hay ${item.stock} unidades disponibles.`);
      return;
    } else {
      setCart(cart.map(cartItem => 
        cartItem.cartId === cartId 
          ? { ...cartItem, quantity }
          : cartItem
      ));
    }
  };

  // Función para eliminar del carrito
  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  // Calcular total del carrito
  const cartTotal = cart.reduce((total, item) => {
    const price = parseFloat(item.price.replace('$', ''));
    return total + (price * item.quantity);
  }, 0);

  const submitPedido = async () => {
    const { nombre, cedula, telefono, email } = checkoutCliente;
    if (!nombre || !cedula || !telefono || !email) {
      alert('Debes completar: nombre, cédula, teléfono y email.');
      return;
    }

    if (cart.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }

    const items = cart.map((item) => ({
      productoId: item.id,
      nombre: item.name,
      precio: parseFloat(String(item.price).replace('$', '')),
      cantidad: item.quantity
    }));

    setSubmittingPedido(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/pedidos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          items,
          total: cartTotal,
          cliente: {
            nombre,
            cedula,
            telefono,
            email
          }
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.error || 'Error al confirmar el pedido');
        return;
      }

      setCart([]);
      setCartModalOpen(false);
      setCheckoutStep('cart');
      setCheckoutCliente({ nombre: '', cedula: '', telefono: '', email: '' });
      alert(`Pedido confirmado. Número de pedido: ${data?.id ?? ''}`);
    } catch (error) {
      console.error(error);
      alert('Error al conectar con el servidor');
    } finally {
      setSubmittingPedido(false);
    }
  };

  // Contador de items en el carrito
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Función para eliminar producto
  const deleteProduct = async (product) => {
    console.log('=== INICIANDO ELIMINACIÓN DE PRODUCTO ===');
    console.log('Producto recibido:', product);
    console.log('ID del producto:', product.id);
    console.log('Tipo de ID en frontend:', typeof product.id);
    console.log('Propiedades del producto:', Object.keys(product));
    
    if (!confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
      return;
    }
    
    if (!product.id) {
      console.error('❌ El producto no tiene ID:', product);
      alert('Error: El producto no tiene un ID válido');
      return;
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = `${API_URL}/api/productos/${product.id}`;
      console.log('URL de eliminación:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        // Eliminar del estado
        const updatedProducts = allProducts.filter(p => p.id !== product.id);
        setAllProducts(updatedProducts);
        setProducts(updatedProducts.filter(p => selectedCategory === "Todo" || p.tipo === selectedCategory));

        setProductImages(prev => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });

        if (selectedProduct?.id === product.id) {
          setSelectedProduct(null);
          setCurrentImageIndex(0);
        }
        
        // Eliminar del carrito si está ahí
        setCart(cart.filter(item => item.name !== product.name));
        
        alert("Producto eliminado exitosamente");
      } else {
        const error = await response.json();
        alert(error.error || "Error al eliminar producto");
      }
    } catch (error) {
      console.error('Error:', error);
      alert("Error al conectar con el servidor");
    }
  };

  // Función para cargar producto en formulario de edición
  const loadProductForEdit = (product) => {
    console.log('=== CARGANDO PRODUCTO PARA EDITAR ===');
    console.log('Producto completo:', product);
    console.log('Tipo de prenda:', product.tipo);
    console.log('Imágenes:', product.imagenes);
    
    setEditingProduct(product);
    setShouldDeleteImages(false); // Resetear estado de eliminación de imágenes
    setNewProduct({
      tipo: product.tipo || "",
      nombre: product.name || "",
      descripcion: product.descripcion || "",
      precio: product.price?.replace('$', '') || "",
      precioAnterior: product.oldPrice?.replace('$', '') || "",
      imagenes: [],
      talles: product.talles?.join(', ') || "",
      colores: product.colores?.join(', ') || "",
      stock: product.stock?.toString() || "",
    });
    setAdminModalStep("edit");
  };

  const handleAdminLogin = async (e) => {
    console.log("hola");
    e.preventDefault();
    const user = e.target.usuario.value;
    const pass = e.target.password.value;
    console.log(user, pass);
    try {
      const response = await fetch(`${API_URL}/api/usuarios/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user, password: pass }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Verificar si es admin
        if (data.usuario.rol === 'admin') {
          // Guardar token en localStorage
          localStorage.setItem('adminToken', data.token);
          setAdminModalStep("manage");
        } else {
          alert("Acceso denegado. Se requiere rol de administrador.");
        }
      } else {
        const error = await response.json();
        alert(error.error || "Credenciales incorrectas");
      }
    } catch (error) {
      console.error('Error:', error);
      alert("Error al conectar con el servidor");
    }
  };

  // Cargar productos desde el servidor
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/productos`);
        if (response.ok) {
          const data = await response.json();
          // Convertir formato del servidor al formato del frontend
          const formattedProducts = data.map(p => {
            console.log('Procesando producto del servidor:', p);
            const formatted = {
              id: p.id, // Agregar id numérico para identificar
              productId: p.productId, // Mantener productId para imágenes
              name: p.nombre,
              price: `$${p.precio}`,
              ...(p.precioAnterior && { oldPrice: `$${p.precioAnterior}` }),
              image: p.imagenes && p.imagenes.length > 0 ? p.imagenes[0] : null,
              descripcion: p.descripcion,
              talles: p.talles,
              colores: p.colores,
              stock: p.stock,
              tipo: p.tipo, // Agregar tipo para filtrar
            };
            console.log('Producto formateado:', formatted);
            return formatted;
          });
          
          console.log('Productos cargados en frontend:', formattedProducts.map(p => ({ 
          id: p.id, 
          productId: p.productId,
          name: p.name, 
          image: p.image,
          tipo: typeof p.id,
          hasId: !!p.id,
          hasProductId: !!p.productId
        })));
          setAllProducts(formattedProducts);
          // Extraer categorías únicas de los productos
          const uniqueTypes = [...new Set(data.map(p => p.tipo))];
          const allCategories = ["Todo", ...uniqueTypes];
          
          setProducts(formattedProducts);
          setCategories(allCategories);
          
          console.log('Productos del servidor:', data);
          console.log('Productos formateados:', formattedProducts);
          console.log('Categorías encontradas:', allCategories);
          console.log('URL de la primera imagen:', getImageUrl(formattedProducts[0]?.image));
          
          // Actualizar productImages
          const newProductImages = {};
          data.forEach(p => {
            newProductImages[p.id] = p.imagenes;
          });
          setProductImages(newProductImages);
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleProductUpdate = async (e) => {
    console.log('=== INICIANDO ACTUALIZACIÓN DE PRODUCTO ===');
    e.preventDefault();
    
    setSubmittingProduct(true);
    
    console.log('Datos del formulario:', newProduct);
    console.log('Producto a editar:', editingProduct);
    
    const tallesArray = newProduct.talles.split(',').map(t => t.trim()).filter(t => t);
    const coloresArray = newProduct.colores.split(',').map(c => c.trim()).filter(c => c);
    
    console.log('Talles procesados:', tallesArray);
    console.log('Colores procesados:', coloresArray);
    
    if (newProduct.imagenes.length > 0) {
      const { invalid } = await validatePortraitImages(newProduct.imagenes);
      if (invalid.length > 0) {
        const detail = invalid
          .map(v => `${v.file.name}${v.width && v.height ? ` (${v.width}x${v.height})` : ''}`)
          .join('\n');
        alert(`Solo se permiten imágenes más altas que anchas (verticales).\n\nImágenes rechazadas:\n${detail}`);
        setSubmittingProduct(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('tipo', newProduct.tipo);
    formData.append('nombre', newProduct.nombre);
    formData.append('descripcion', newProduct.descripcion);
    formData.append('precio', newProduct.precio);
    formData.append('precioAnterior', newProduct.precioAnterior);
    formData.append('talles', JSON.stringify(tallesArray));
    formData.append('colores', JSON.stringify(coloresArray));
    formData.append('stock', newProduct.stock);
    
    // Agregar imágenes si se seleccionaron nuevas
    for (let i = 0; i < newProduct.imagenes.length; i++) {
      formData.append('imagenes', newProduct.imagenes[i]);
    }
    
    console.log('FormData creado:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = `${API_URL}/api/productos/${editingProduct.id}`;
      console.log('URL de actualización:', url);
      console.log('Token:', token ? 'Presente' : 'Ausente');
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      
      console.log('Respuesta del servidor:', response.status);
      
      if (response.ok) {
        const updatedProductData = await response.json();
        console.log('Datos actualizados del servidor:', updatedProductData);
        
        // Actualizar el producto en el estado
        const updatedProducts = allProducts.map(p => 
          p.id === editingProduct.id 
            ? {
                id: p.id,
                productId: p.productId,
                name: updatedProductData.nombre,
                price: `$${updatedProductData.precio}`,
                ...(updatedProductData.precioAnterior && { oldPrice: `$${updatedProductData.precioAnterior}` }),
                image: updatedProductData.imagenes[0] || p.image,
                descripcion: updatedProductData.descripcion,
                talles: updatedProductData.talles,
                colores: updatedProductData.colores,
                stock: updatedProductData.stock,
                tipo: updatedProductData.tipo,
              }
            : p
        );
        
        console.log('Productos actualizados en frontend:', updatedProducts);
        
        setAllProducts(updatedProducts);
        setProducts(updatedProducts.filter(p => selectedCategory === "Todo" || p.tipo === selectedCategory));

        setProductImages(prev => ({
          ...prev,
          [editingProduct.id]: updatedProductData.imagenes || []
        }));
        
        // Resetear formulario
        setNewProduct({
          tipo: "",
          nombre: "",
          descripcion: "",
          precio: "",
          precioAnterior: "",
          imagenes: [],
          talles: "",
          colores: "",
          stock: "",
        });
        setEditingProduct(null);
        setAdminModalStep("manage");
        
        alert("Producto actualizado exitosamente");
      } else {
        const error = await response.json();
        alert(error.error || "Error al actualizar producto");
      }
    } catch (error) {
      console.error('Error:', error);
      alert("Error al conectar con el servidor");
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    setSubmittingProduct(true);
    
    try {
      const tallesArray = newProduct.talles.split(',').map(t => t.trim()).filter(t => t);
      const coloresArray = newProduct.colores.split(',').map(c => c.trim()).filter(c => c);
      
      const { invalid } = await validatePortraitImages(newProduct.imagenes);
      if (invalid.length > 0) {
        const detail = invalid
          .map(v => `${v.file.name}${v.width && v.height ? ` (${v.width}x${v.height})` : ''}`)
          .join('\n');
        alert(`Solo se permiten imágenes más altas que anchas (verticales).\n\nImágenes rechazadas:\n${detail}`);
        setSubmittingProduct(false);
        return;
      }

      const formData = new FormData();
      formData.append('tipo', newProduct.tipo);
      formData.append('nombre', newProduct.nombre);
      formData.append('descripcion', newProduct.descripcion);
      formData.append('precio', newProduct.precio);
      formData.append('precioAnterior', newProduct.precioAnterior);
      formData.append('talles', JSON.stringify(tallesArray));
      formData.append('colores', JSON.stringify(coloresArray));
      formData.append('stock', newProduct.stock);
      
      // Agregar imágenes
      for (let i = 0; i < newProduct.imagenes.length; i++) {
        formData.append('imagenes', newProduct.imagenes[i]);
      }
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/productos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      
      if (response.ok) {
        const newProductData = await response.json();
        
        // Agregar a la lista de productos
        const formattedNewProduct = {
          id: newProductData.id,
          productId: newProductData.productId,
          name: newProductData.nombre,
          price: `$${newProductData.precio}`,
          ...(newProductData.precioAnterior && { oldPrice: `$${newProductData.precioAnterior}` }),
          image: newProductData.imagenes[0],
          descripcion: newProductData.descripcion,
          talles: newProductData.talles,
          colores: newProductData.colores,
          stock: newProductData.stock,
          tipo: newProductData.tipo,
        };
        
        const updatedProducts = [...allProducts, formattedNewProduct];
        setAllProducts(updatedProducts);
        setProducts(updatedProducts.filter(p => selectedCategory === "Todo" || p.tipo === selectedCategory));

        setProductImages(prev => ({
          ...prev,
          [formattedNewProduct.id]: newProductData.imagenes || []
        }));
        
        // Resetear formulario
        setNewProduct({
          tipo: "",
          nombre: "",
          descripcion: "",
          precio: "",
          precioAnterior: "",
          imagenes: [],
          talles: "",
          colores: "",
          stock: "",
        });
        setAdminModalStep("manage");
        
        alert("Producto agregado exitosamente");
      } else {
        const error = await response.json();
        alert(error.error || "Error al agregar producto");
      }
    } catch (error) {
      console.error('Error:', error);
      alert("Error al conectar con el servidor");
    } finally {
      setSubmittingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0b1220] via-[#0d1c30] to-[#0a1628]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="relative h-10 w-10 overflow-hidden rounded-lg">
              <img src="/logo3.png" alt="Cheapshop" className="absolute inset-0 h-full w-full object-cover scale-179" />
            </div>
            <span className="text-xl font-bold text-white">Cheapshop</span>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden gap-6 md:flex">
            {[
              { name: "Inicio", href: "#inicio" },
              { name: "Productos", href: "#productos" },
              { name: "Ofertas", href: "#ofertas" },
              { name: "Contacto", href: "#contacto" },
            ].map((link) => (
              <a key={link.name} href={link.href} className="text-sm text-slate-300 hover:text-white transition">
                {link.name}
              </a>
            ))}
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden items-center gap-4 md:flex">
            <button
              onClick={() => setCartModalOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">
                  {cartItemsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setAdminModalStep("login")}
              className="flex items-center gap-2 px-4 py-2 h-10 rounded-lg bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-white font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl border border-amber-400/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="hidden lg:inline">Admin</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-4 md:hidden">
            <button
              onClick={() => setCartModalOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">
                  {cartItemsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 top-[73px] bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed right-0 top-[73px] bottom-0 w-72 bg-[#0d1c30] border-l border-white/10 shadow-2xl z-50 md:hidden overflow-y-auto">
            <div className="px-4 py-6 space-y-6">
              {/* Mobile Navigation */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Navegación</h3>
                <div className="space-y-1">
                  {[
                    { name: "Inicio", href: "#inicio" },
                    { name: "Productos", href: "#productos" },
                    { name: "Ofertas", href: "#ofertas" },
                    { name: "Contacto", href: "#contacto" },
                  ].map((link) => (
                    <a 
                      key={link.name} 
                      href={link.href} 
                      className="block px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.name}
                    </a>
                  ))}
                </div>
              </div>
              
              {/* Mobile Admin Button */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Administración</h3>
                <button
                  onClick={() => {
                    setAdminModalStep("login");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-3 h-12 rounded-lg bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-white font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl border border-amber-400/20"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span className="font-medium">Panel de Administración</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hero compacto - Inicio */}
      <section id="inicio" className="mx-auto max-w-6xl px-4 pt-10 pb-12 text-center scroll-mt-16">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Ropa que queda bien
        </h1>
        <h1 className="text-3xl font-bold text-white sm:text-4xl uppercase">
          <span className="text-amber-400"> a precios que te convienen</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Explora nuestra selección
        </p>
      </section>

      {/* Filtros por categoría */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryFilter(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedCategory === cat
                  ? "bg-amber-400 text-slate-900"
                  : "bg-white/10 text-slate-300 hover:bg-white/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid de productos */}
      <section id="productos" className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition"
            >
              <div
                className="relative aspect-4/3 overflow-hidden cursor-pointer"
                onClick={() => {
                  setSelectedProduct(product);
                  setCurrentImageIndex(0);
                }}
              >
                <img
                  src={getImageUrl(product.image)}
                  alt={product.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {product.oldPrice && (
                  <span className="absolute top-2 left-2 rounded bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                    Oferta
                  </span>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                  <svg className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                  </svg>
                </div>
              </div>
              <div className="p-1.5">
                <h3 className="text-xs font-medium text-white truncate">{product.name}</h3>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="text-sm font-bold text-amber-400">{product.price}</span>
                  {product.oldPrice && (
                    <span className="text-xs text-slate-500 line-through">{product.oldPrice}</span>
                  )}
                </div>
                <button 
                  onClick={() => addToCart(product)}
                  className="mt-1 w-full rounded-lg bg-white/10 py-1 text-xs font-medium text-white hover:bg-amber-400 hover:text-slate-900 transition"
                >
                  Agregar al carrito
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Sección de Ofertas */}
      <section id="ofertas" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Ofertas Especiales</h2>
            <p className="mt-2 text-slate-400">Aprovecha los descuentos exclusivos.</p>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.filter(p => p.oldPrice).map((product) => (
              <article
                key={product.id}
                className="group overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 transition"
              >
                <div
                  className="relative aspect-4/3 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedProduct(product);
                    setCurrentImageIndex(0);
                  }}
                >
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 rounded bg-red-500 px-1 py-0.5 text-xs font-semibold text-white">
                    {Math.round(((parseInt(product.oldPrice.slice(1)) - parseInt(product.price.slice(1))) / parseInt(product.oldPrice.slice(1))) * 100)}% OFF
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                    <svg className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                    </svg>
                  </div>
                </div>
                <div className="p-1.5">
                  <h3 className="text-xs font-medium text-white truncate">{product.name}</h3>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="text-sm font-bold text-amber-400">{product.price}</span>
                    <span className="text-xs text-slate-500 line-through">{product.oldPrice}</span>
                  </div>
                  <button 
                    onClick={() => addToCart(product)}
                    className="mt-1 w-full rounded-lg bg-white/10 py-1 text-xs font-medium text-white hover:bg-amber-400 hover:text-slate-900 transition"
                  >
                    Agregar al carrito
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de Contacto */}
      <section id="contacto" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Contacto</h2>
            <p className="mt-2 text-slate-400">Estamos aquí para ayudarte</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10">
                <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2c.828 0 1.5-.672 1.5-1.5v-1.5c0-.828-.672-1.5-1.5-1.5H18c-.828 0-1.5.672-1.5 1.5v1.5c0 .828-.672 1.5-1.5 1.5H9A7.5 7.5 0 011.5 9V4.5C1.5 3.672 2.172 3 3 3h1.5c.828 0 1.5.672 1.5 1.5v1.5c0 .828-.672 1.5-1.5 1.5H3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">WhatsApp</h3>
              <p className="mt-2 text-sm text-slate-400">+58 412 2918294</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10">
                <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Email</h3>
              <p className="mt-2 text-sm text-slate-400">zulmi13.gra@gmail.com</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/10">
                <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Ubicación</h3>
              <p className="mt-2 text-sm text-slate-400">Coro, Venezuela</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500"> 2025 Cheapshop. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="text-sm text-slate-400 hover:text-white">Instagram</a>
            <a href="#" className="text-sm text-slate-400 hover:text-white">WhatsApp</a>
          </div>
        </div>
      </footer>

      {/* Modal de producto */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            className="relative max-w-2xl w-full max-h-[92vh] bg-[#0d1c30] rounded-2xl overflow-hidden border border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid md:grid-cols-2 gap-2 md:gap-6">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-3/4 w-full max-w-[360px] mx-auto md:mx-0">
                  <img
                    src={getImageUrl(productImages[selectedProduct.id]?.[currentImageIndex] || selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover"
                  />
                  {/* Flechas de navegación */}
                  <button
                    onClick={() => setCurrentImageIndex((prev) => prev === 0 ? (productImages[selectedProduct.id]?.length || 1) - 1 : prev - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => prev === (productImages[selectedProduct.id]?.length || 1) - 1 ? 0 : prev + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {/* Indicadores */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {productImages[selectedProduct.id]?.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`h-2 w-2 rounded-full transition ${idx === currentImageIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-2 sm:p-0 flex flex-col justify-center overflow-hidden md:overflow-y-auto md:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg sm:text-2xl font-bold text-white">{selectedProduct.name}</h2>
                    <div className="sm:hidden text-right shrink-0">
                      <div className="text-xs font-medium text-white uppercase tracking-wide">Stock</div>
                      <div className={`text-xs ${selectedProduct.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedProduct.stock > 0 ? `${selectedProduct.stock} unidades` : 'Sin stock'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xl sm:text-3xl font-bold text-amber-400">{selectedProduct.price}</span>
                    {selectedProduct.oldPrice && (
                      <span className="text-sm sm:text-lg text-slate-500 line-through">{selectedProduct.oldPrice}</span>
                    )}
                  </div>
                  <p className="mt-1.5 sm:mt-3 text-slate-400 text-xs sm:text-sm leading-snug">
                    {selectedProduct.descripcion || 'Prenda de alta calidad con materiales seleccionados.'}
                  </p>
                  
                  {/* Detalles compactos */}
                  <div className="mt-2 sm:mt-4 space-y-2 sm:space-y-3">
                    {(selectedProduct.talles && selectedProduct.talles.length > 0) || (selectedProduct.colores && selectedProduct.colores.length > 0) ? (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Talles */}
                        <div>
                          <h4 className="text-xs font-medium text-white mb-1 uppercase tracking-wide">Talla</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedProduct.talles?.map((talle, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-white/10 text-white text-[11px] rounded-md border border-white/20">
                                {talle}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* Colores */}
                        <div>
                          <h4 className="text-xs font-medium text-white mb-1 uppercase tracking-wide">Color</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedProduct.colores?.map((color, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-white/10 text-white text-[11px] rounded-md border border-white/20">
                                {color}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    
                    {/* Stock */}
                    <div className="hidden sm:flex items-center gap-2">
                      <h4 className="text-xs font-medium text-white uppercase tracking-wide">Stock</h4>
                      <p className={`text-xs ${selectedProduct.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedProduct.stock > 0 ? `${selectedProduct.stock} unidades` : 'Sin stock'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-white/10 bg-[#0d1c30] p-3 sm:p-6">
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => selectedProduct.stock > 0 && addToCart(selectedProduct)}
                  className={`w-full rounded-lg py-2.5 sm:py-3 text-sm font-semibold transition ${
                    selectedProduct.stock > 0 
                      ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={selectedProduct.stock <= 0}
                >
                  {selectedProduct.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
                </button>
                <button className="w-full rounded-lg border border-white/20 py-2 sm:py-3 text-sm font-medium text-white hover:border-white/40 transition">
                  Consultar por WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Administrador */}
      {adminModalStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            className="relative max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] bg-[#0d1c30] rounded-2xl overflow-hidden border border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAdminModalStep(null)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {adminModalStep === "manage" ? (
              <div className="p-6 overflow-y-auto flex-1">
                <h2 className="text-2xl font-bold text-white">Gestionar Productos</h2>
                <div className="mt-6 space-y-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setAdminModalStep("form")}
                      className="flex-1 rounded-lg bg-amber-400 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition"
                    >
                      Agregar Nuevo Producto
                    </button>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    <h3 className="text-lg font-medium text-white mb-3">Productos Existentes</h3>
                    {allProducts.length === 0 ? (
                      <p className="text-slate-400 text-center py-8">No hay productos registrados</p>
                    ) : (
                      <div className="space-y-2">
                        {allProducts.map((product) => (
                          <div key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <img
                                src={getImageUrl(product.image)}
                                alt={product.name}
                                className="h-16 w-16 sm:h-12 sm:w-12 rounded-lg object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium truncate">{product.name}</h4>
                                <p className="text-amber-400 text-sm">{product.price}</p>
                                {product.oldPrice && (
                                  <p className="text-slate-500 text-xs line-through">{product.oldPrice}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                              <button
                                onClick={() => loadProductForEdit(product)}
                                className="flex-1 sm:flex-none px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition font-medium"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => deleteProduct(product)}
                                className="flex-1 sm:flex-none px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition font-medium"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : adminModalStep === "login" ? (
              <div className="p-6 overflow-y-auto flex-1">
                <h2 className="text-2xl font-bold text-white">Acceso Administrador</h2>
                <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Email</label>
                    <input
                      name="usuario"
                      type="email"
                      required
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      placeholder="admin@cheapshop.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300">Contraseña</label>
                    <input
                      name="password"
                      type="password"
                      required
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      placeholder="admin123"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-amber-400 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition"
                  >
                    Iniciar sesión
                  </button>
                </form>
              </div>
            ) : (adminModalStep === "form" || adminModalStep === "edit") ? (
              <div className="p-6 overflow-y-auto flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {adminModalStep === "edit" ? "Editar Producto" : "Nuevo Producto"}
                </h2>
                <form onSubmit={adminModalStep === "edit" ? handleProductUpdate : handleProductSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Tipo de prenda</label>
                    <select
                      value={newProduct.tipo}
                      onChange={(e) => setNewProduct({...newProduct, tipo: e.target.value})}
                      required
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                    >
                      <option value="" className="bg-[#0d1c30]">Seleccionar...</option>
                      <option value="franela" className="bg-[#0d1c30]">Franela</option>
                      <option value="camisa" className="bg-[#0d1c30]">Camisa</option>
                      <option value="chemise" className="bg-[#0d1c30]">Chemise</option>
                      <option value="pantalon" className="bg-[#0d1c30]">Pantalón</option>
                      <option value="campera" className="bg-[#0d1c30]">Campera</option>
                      <option value="sweater" className="bg-[#0d1c30]">Sweater</option>
                      <option value="vestido" className="bg-[#0d1c30]">Vestido</option>
                      <option value="conjunto" className="bg-[#0d1c30]">Conjunto</option>
                      <option value="short" className="bg-[#0d1c30]">Short</option>
                      {/* <option value="bolso" className="bg-[#0d1c30]">Bolso</option>
                      <option value="accesorio" className="bg-[#0d1c30]">Accesorio</option> */}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300">Nombre</label>
                    <input
                      value={newProduct.nombre}
                      onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})}
                      type="text"
                      required
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      placeholder="Campera de algodón"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300">Descripción</label>
                    <textarea
                      value={newProduct.descripcion}
                      onChange={(e) => setNewProduct({...newProduct, descripcion: e.target.value})}
                      required
                      rows={3}
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      placeholder="Descripción del producto..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Precio</label>
                      <input
                        value={newProduct.precio}
                        onChange={(e) => setNewProduct({...newProduct, precio: e.target.value})}
                        type="number"
                        required
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                        placeholder="99"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">Precio anterior (opcional)</label>
                      <input
                        value={newProduct.precioAnterior}
                        onChange={(e) => setNewProduct({...newProduct, precioAnterior: e.target.value})}
                        type="number"
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                        placeholder="149"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300">Imágenes</label>
                    {adminModalStep === "edit" && editingProduct && productImages[editingProduct.id]?.length > 0 && !shouldDeleteImages ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setImagesModalOpen(true)}
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm hover:bg-white/10 transition"
                        >
                          Ver imágenes guardadas ({productImages[editingProduct.id]?.length || 0})
                        </button>
                        <p className="mt-1 text-xs text-slate-500">
                          Elimina las imágenes actuales para poder subir nuevas
                        </p>
                      </div>
                    ) : (
                      <>
                        {adminModalStep === "edit" && editingProduct && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => setImagesModalOpen(true)}
                              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm hover:bg-white/10 transition"
                            >
                              Ver imágenes guardadas ({productImages[editingProduct.id]?.length || 0})
                            </button>
                          </div>
                        )}
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImagesChange}
                          required={adminModalStep !== "edit"}
                          className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-400 file:text-slate-900 hover:file:bg-amber-300"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {newProduct.imagenes.length > 0 
                            ? `${newProduct.imagenes.length} archivo(s) seleccionado(s)`
                            : adminModalStep === "edit" 
                              ? "Selecciona nuevas imágenes (opcional)"
                              : "Selecciona una o más imágenes"}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Talles (separados por coma)</label>
                      <input
                        value={newProduct.talles}
                        onChange={(e) => setNewProduct({...newProduct, talles: e.target.value})}
                        required
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                        placeholder="S, M, L, XL"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300">Colores (separados por coma)</label>
                      <input
                        value={newProduct.colores}
                        onChange={(e) => setNewProduct({...newProduct, colores: e.target.value})}
                        required
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                        placeholder="Negro, Blanco, Azul"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300">Stock</label>
                    <input
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                      type="number"
                      required
                      className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                      placeholder="50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submittingProduct}
                    className={`w-full rounded-lg py-3 text-sm font-semibold transition ${
                      submittingProduct 
                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                        : 'bg-amber-400 text-slate-900 hover:bg-amber-300'
                    }`}
                  >
                    {submittingProduct ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        {adminModalStep === "edit" ? "Actualizando..." : "Agregando..."}
                      </span>
                    ) : (
                      adminModalStep === "edit" ? "Actualizar producto" : "Agregar producto"
                    )}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal de Imágenes Guardadas */}
      {imagesModalOpen && editingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            className="relative max-w-4xl w-full max-h-[85vh] bg-[#0d1c30] rounded-2xl overflow-hidden border border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Imágenes de {editingProduct.name}</h2>
              <button
                onClick={() => setImagesModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {productImages[editingProduct.id]?.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={getImageUrl(image)}
                      alt={`${editingProduct.name} ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border border-white/10"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm">Imagen {index + 1}</span>
                    </div>
                  </div>
                )) || (
                  <div className="col-span-full text-center text-slate-400 py-8">
                    No hay imágenes guardadas
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    if (confirm('¿Estás seguro de que quieres eliminar todas las imágenes? Las imágenes se eliminarán permanentemente cuando presiones "Actualizar producto".')) {
                      setShouldDeleteImages(true);
                      setImagesModalOpen(false);
                      alert('Las imágenes serán eliminadas cuando actualices el producto. Ahora puedes subir nuevas imágenes.');
                    }
                  }}
                  className="flex-1 rounded-lg bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 transition"
                >
                  Eliminar todas las imágenes
                </button>
                <button
                  onClick={() => setImagesModalOpen(false)}
                  className="flex-1 rounded-lg bg-amber-400 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal del Carrito */}
      {cartModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            className="relative max-w-2xl w-full bg-[#0d1c30] rounded-2xl overflow-hidden border border-white/10 max-h-[85vh] sm:max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white">Mi Carrito</h2>
              <button
                onClick={() => {
                  setCartModalOpen(false);
                  setCheckoutStep('cart');
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {checkoutStep === 'cliente' && cart.length > 0 && (
                <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
                  <h3 className="text-white font-semibold">Datos para confirmar pedido</h3>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-300">Nombre</label>
                      <input
                        value={checkoutCliente.nombre}
                        onChange={(e) => setCheckoutCliente({ ...checkoutCliente, nombre: e.target.value })}
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300">Cédula</label>
                      <input
                        value={checkoutCliente.cedula}
                        onChange={(e) => setCheckoutCliente({ ...checkoutCliente, cedula: e.target.value })}
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                        placeholder="V- / E- / número"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300">Teléfono</label>
                      <input
                        value={checkoutCliente.telefono}
                        onChange={(e) => setCheckoutCliente({ ...checkoutCliente, telefono: e.target.value })}
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                        placeholder="0412..."
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300">Email</label>
                      <input
                        type="email"
                        value={checkoutCliente.email}
                        onChange={(e) => setCheckoutCliente({ ...checkoutCliente, email: e.target.value })}
                        className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>
                </div>
              )}
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-4 text-slate-400">Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.cartId} className="flex gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{item.name}</h3>
                        <p className="text-amber-400 font-semibold">{item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartQuantity(item.cartId, item.quantity - 1)}
                          className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="text-white w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.cartId, item.quantity + 1)}
                          className="h-8 w-8 rounded-full bg-white/10 text-white hover:bg-white/20 transition flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.cartId)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="border-t border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-white">Total:</span>
                  <span className="text-2xl font-bold text-amber-400">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-3">
                  {checkoutStep === 'cart' ? (
                    <button
                      onClick={() => setCheckoutStep('cliente')}
                      className="flex-1 rounded-lg bg-amber-400 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition"
                    >
                      Confirmar pedido
                    </button>
                  ) : (
                    <button
                      onClick={submitPedido}
                      disabled={submittingPedido}
                      className="flex-1 rounded-lg bg-amber-400 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submittingPedido ? 'Enviando...' : 'Enviar pedido'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (checkoutStep === 'cliente') {
                        setCheckoutStep('cart');
                      } else {
                        setCartModalOpen(false);
                      }
                    }}
                    className="flex-1 rounded-lg border border-white/20 py-3 text-sm font-medium text-white hover:border-white/40 transition"
                  >
                    {checkoutStep === 'cliente' ? 'Volver' : 'Seguir comprando'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
