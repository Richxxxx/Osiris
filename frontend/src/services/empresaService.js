// Servicio para gestionar empresas
import api from '../utils/axiosConfig';

const extractCollection = (response = {}, key) => {
  return response?.data?.data?.[key] ?? response?.data?.[key] ?? response?.data ?? [];
};

const obtenerEmpresas = async () => {
  const response = await api.get('/empresas');
  return extractCollection(response, 'empresas');
};

export { obtenerEmpresas };
