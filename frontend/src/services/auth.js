import axios from '../utils/axiosConfig';

const API_URL = '/auth'; // Ya incluye /api por la configuración base de axios

const login = async (email, password) => {
  try {
    const response = await axios.post(API_URL + '/login', {
      email,
      password,
    }, {
      withCredentials: true
    });
    
    if (response.data && response.data.accessToken) {
      // Extraer los datos del usuario de la respuesta
      const { accessToken, status, ...userData } = response.data;
      
      // Asegurarse de que el token esté incluido
      userData.token = accessToken;
      userData.status = status;
      
      // Almacenar información del usuario recibida del servidor
      localStorage.setItem('user', JSON.stringify(userData));

      // Guardar token por separado para que otros servicios puedan leerlo
      localStorage.setItem('token', accessToken);
      
      return userData;
    }
    
    throw new Error('No se pudo completar el inicio de sesión');
  } catch (error) {
    throw error;
  }
};

const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    
    // Asegurar que el rol esté disponible en la raíz del objeto de usuario
    if (user.rol) {
      user.role = user.rol.nombre || user.rol; // Asegurar compatibilidad
    }
    
    return user;
  } catch (error) {
    return null;
  }
};

const hasRole = (requiredRole) => {
  const user = getCurrentUser();
  return user?.role === requiredRole;
};

const forgotPassword = async (email) => {
  try {
    const response = await axios.post(API_URL + '/forgotPassword', {
      email,
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

const resetPassword = async (token, password) => {
  try {
    const response = await axios.patch(API_URL + `/resetPassword/${token}`, {
      password,
      passwordConfirm: password,
    }, {
      withCredentials: true
    });
    
    if (response.data && response.data.accessToken) {
      // Extraer los datos del usuario de la respuesta
      const { accessToken, status, ...userData } = response.data;
      
      // Asegurarse de que el token esté incluido
      userData.token = accessToken;
      userData.status = status;
      
      // Almacenar información del usuario recibida del servidor
      localStorage.setItem('user', JSON.stringify(userData));

      // Guardar token por separado para que otros servicios puedan leerlo
      localStorage.setItem('token', accessToken);
      
      return userData;
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const authService = {
  login,
  logout,
  getCurrentUser,
  hasRole,
  forgotPassword,
  resetPassword,
  roles: {
    ADMIN: 'administrador',
    EVALUADOR: 'evaluador',
    EMPLEADO: 'empleado',
  },
};
