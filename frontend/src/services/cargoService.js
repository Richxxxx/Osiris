import axios from '../utils/axiosConfig';

export const obtenerCargos = async () => {
  try {
    const response = await axios.get('/api/cargos');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const obtenerCargosPorDepartamento = async (departamentoId) => {
  try {
    const response = await axios.get(`/api/cargos/departamento/${departamentoId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const crearCargo = async (cargo) => {
  try {
    const response = await axios.post('/api/cargos', cargo);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const actualizarCargo = async (id, cargo) => {
  try {
    const response = await axios.patch(`/api/cargos/${id}`, cargo);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const eliminarCargo = async (id) => {
  try {
    const response = await axios.delete(`/api/cargos/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
