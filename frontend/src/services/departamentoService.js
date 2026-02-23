import api from '../utils/axiosConfig';

const extractCollection = (response = {}, key) => {
  return response?.data?.data?.[key] ?? response?.data?.[key] ?? response?.data ?? [];
};

export const obtenerDepartamentos = async () => {
  const response = await api.get('/departamentos');
  return extractCollection(response, 'departamentos');
};

export const obtenerCargosPorDepartamento = async (departamentoId) => {
  if (!departamentoId) return [];
  const response = await api.get(`/departamentos/${departamentoId}/cargos`);
  return extractCollection(response, 'cargos');
};
