import api from '../utils/axiosConfig';

const extractCollection = (response = {}, key) => {
  return response?.data?.data?.[key] ?? response?.data?.[key] ?? response?.data ?? [];
};

export const obtenerRoles = async () => {
  const response = await api.get('/roles');
  return extractCollection(response, 'roles');
};
