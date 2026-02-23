import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import {
  getUsers as fetchUsersApi,
  createUser as createUserApi,
  updateUser as updateUserApi,
  deleteUser as deleteUserApi,
  getUserById as getUserByIdApi
} from '../services/userService';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return [];
    }

    // Verificar si el usuario es administrador antes de cargar usuarios
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol?.nombre !== 'administrador') {
      // Si no es administrador, no cargar usuarios
      setUsers([]);
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsersApi();
      const usersList = Array.isArray(data) ? data : [];
      setUsers(usersList);
      return usersList;
    } catch (err) {
      setError('No se pudo cargar la lista de usuarios');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para cargar usuarios manualmente
  const refreshUsers = useCallback(async () => {
    return await loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const addUser = async (userData) => {
    try {
      const createdUser = await createUserApi(userData);
      setUsers(prev => [...prev, createdUser]);
      return createdUser;
    } catch (err) {
      throw err;
    }
  };

  const updateUser = async (id, updatedUser) => {
    try {
      const usuarioActualizado = await updateUserApi(id, updatedUser);
      setUsers(prev => prev.map(user => (user.id === id ? usuarioActualizado : user)));
      return usuarioActualizado;
    } catch (err) {
      throw err;
    }
  };
  
  const getUserById = async (id, { forceRefresh = false } = {}) => {
    if (!forceRefresh) {
      const localUser = users.find(user => user.id === id);
      if (localUser) {
        return localUser;
      }
    }

    try {
      const remoteUser = await getUserByIdApi(id);
      setUsers(prev => {
        const exists = prev.some(user => user.id === id);
        return exists ? prev.map(user => (user.id === id ? remoteUser : user)) : [...prev, remoteUser];
      });
      return remoteUser;
    } catch (err) {
      throw err;
    }
  };

  const deleteUser = async (id) => {
    try {
      await deleteUserApi(id);
      setUsers(prev => prev.filter(user => user.id !== id));
      return true;
    } catch (err) {
      throw err;
    }
  };

  return (
    <UserContext.Provider value={{ 
      loadUsers,
      refreshUsers,
      addUser,
      updateUser,
      deleteUser,
      getUserById,
      createModalOpen,
      setCreateModalOpen,
      users,
      loading,
      error
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers debe usarse dentro de un UserProvider');
  }
  return context;
};

export default UserContext;
