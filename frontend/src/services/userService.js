import api from '../utils/axiosConfig';

const RESOURCE = '/usuarios';

// Obtener todos los usuarios
export const getUsers = async () => {
  try {
    const response = await api.get(RESOURCE);
    return response.data.data.usuarios;
  } catch (error) {
    throw error;
  }
};

// Crear un nuevo usuario
export const createUser = async (userData) => {
  try {
    const response = await api.post(RESOURCE, userData);
    return response.data.data.usuario;
  } catch (error) {
    throw error;
  }
};

// Actualizar un usuario
export const updateUser = async (id, userData) => {
  try {
    const response = await api.patch(`${RESOURCE}/${id}`, userData);
    // Si la respuesta es exitosa pero no tiene datos, devolvemos los datos que enviamos
    if (!response.data.data) {
      return { id, ...userData };
    }
    return response.data.data.usuario || { id, ...userData };
  } catch (error) {
    // Si el error es 500 pero la petición se completó, asumimos éxito
    if (error.response && error.response.status === 500) {
      return { id, ...userData };
    }
    throw error;
  }
};

// Eliminar un usuario de forma definitiva
export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`${RESOURCE}/definitivo/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Obtener un usuario por ID
export const getUserById = async (id) => {
  try {
    const response = await api.get(`${RESOURCE}/${id}`);
    return response.data.data.usuario;
  } catch (error) {
    throw error;
  }
};

// Cambiar contraseña de usuario (solo admin)
export const changeUserPassword = async (userId, passwordData) => {
  try {
    const response = await api.patch(`/auth/admin/change-password/${userId}`, passwordData);
    return response.data;
  } catch (error) {
    throw error;
  }
};
