import axios from 'axios';

// Crear instancia de Axios con configuración base
const axiosInstance = axios.create({
  baseURL: '/api', // La URL base ya incluye /api
  withCredentials: true, // Importante para enviar cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adjuntar el token en cada petición
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar errores globalmente
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Manejar errores de red
    if (!error.response) {
      return Promise.reject(new Error('Error de conexión. Por favor verifica tu conexión a internet.'));
    }

    // Manejar errores de autenticación
    if (error.response.status === 401) {
      // Redirigir al login si el token expira
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
