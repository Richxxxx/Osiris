import axios from '../utils/axiosConfig';

export const crearFormulario = async (formulario) => {
  try {
    const response = await axios.post('/formularios/crear', formulario);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const obtenerFormularios = async () => {
  try {
    const response = await axios.get('/formularios/listar');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const obtenerFormularioPorId = async (id) => {
  try {
    const response = await axios.get(`/formularios/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const actualizarFormulario = async (id, formulario) => {
  try {
    const response = await axios.put(`/formularios/${id}`, formulario);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const eliminarFormulario = async (id) => {
  try {
    const response = await axios.delete(`/formularios/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const obtenerPreguntasExistentes = async (departamentoId, apartado) => {
  try {
    const params = new URLSearchParams();
    if (departamentoId) params.append('departamento_id', departamentoId);
    if (apartado) params.append('apartado', apartado);
    
    const response = await axios.get(`/formularios/preguntas/existentes?${params}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const obtenerFormulariosActivos = async () => {
  try {
    const response = await axios.get('/formularios/activos');
    return response.data;
  } catch (error) {
    throw error;
  }
};
