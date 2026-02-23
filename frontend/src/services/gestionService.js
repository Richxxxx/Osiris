import api from '../utils/axiosConfig';



// Sistema de caché simple

const cache = new Map();

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos - datos de gestión cambian frecuentemente



const getCacheKey = (url, params = {}) => {

  return `${url}?${JSON.stringify(params)}`;

};



const isCacheValid = (timestamp) => {

  return Date.now() - timestamp < CACHE_DURATION;

};



const getFromCache = (key) => {

  const cached = cache.get(key);

  if (cached && isCacheValid(cached.timestamp)) {

    return cached.data;

  }

  cache.delete(key);

  return null;

};



const setCache = (key, data) => {

  cache.set(key, {

    data,

    timestamp: Date.now()

  });

};



const extractData = (response) => {

  return response?.data?.data || response?.data || {};

};



const extractCollection = (response = {}, key) => {

  // Backend envía: { status: 'success', data: { seguimiento: [...] } }

  return response?.data?.data?.[key] || response?.data?.data || response?.data?.[key] || response?.data || [];

};



// Estadísticas del dashboard

export const obtenerEstadisticas = async (trimestre = null) => {

  const url = trimestre ? `/usuarios/gestion/estadisticas?trimestre=${trimestre}` : '/usuarios/gestion/estadisticas';

  const cacheKey = getCacheKey(url);

  

  // Verificar caché primero

  const cached = getFromCache(cacheKey);

  if (cached) {

    return cached;

  }

  

  const response = await api.get(url);

  const data = extractData(response);

  setCache(cacheKey, data);

  return data;

};



// Estadísticas por departamento para gráficas

export const obtenerEstadisticasPorDepartamento = async (params = null) => {

  let url = '/usuarios/gestion/estadisticas/departamentos';

  

  // Si params es string, es el formato antiguo (solo trimestre)

  if (typeof params === 'string') {

    url += `?trimestre=${params}`;

  } 

  // Si params es objecto, construir query string

  else if (params && typeof params === 'object') {

    const searchParams = new URLSearchParams(params);

    url += `?${searchParams.toString()}`;

  }

  

  const cacheKey = getCacheKey(url);

  

  const cached = getFromCache(cacheKey);

  if (cached) {

    return cached;

  }

  

  const response = await api.get(url);

  const data = extractCollection(response, 'departamentos');

  setCache(cacheKey, data);

  return data;

};



// Seguimiento por departamento

export const obtenerSeguimientoPorDepartamento = async (periodo = null) => {

  const url = periodo ? `/usuarios/gestion/seguimiento/departamentos?periodo=${periodo}` : '/usuarios/gestion/seguimiento/departamentos';

  const cacheKey = getCacheKey(url);

  

  const cached = getFromCache(cacheKey);

  if (cached) {

    return cached;

  }

  

  const response = await api.get(url);

  

  // Forzar la extracción correcta

  let data;

  if (response.data?.data?.seguimiento) {

    // Estructura correcta: { data: { seguimiento: [...] } }

    data = response.data.data.seguimiento;

  } else if (Array.isArray(response.data?.data)) {

    // Viene como array directo en data.data

    data = response.data.data;

  } else if (Array.isArray(response.data)) {

    // Viene como array directo en response.data

    data = response.data;

  } else {

    // Fallback

    data = response.data?.data?.seguimiento || response.data?.data || response.data || [];

  }

  

  setCache(cacheKey, data);

  return data;

};



// Detalle de evaluaciones de un líder

export const obtenerDetalleEvaluacionesLider = async (liderId, periodo = null) => {

  const url = periodo ? `/usuarios/gestion/seguimiento/lider/${liderId}?periodo=${periodo}` : `/usuarios/gestion/seguimiento/lider/${liderId}`;

  const cacheKey = getCacheKey(url);

  

  const cached = getFromCache(cacheKey);

  if (cached) {

    return cached;

  }

  

  const response = await api.get(url);

  const data = extractData(response);

  setCache(cacheKey, data);

  return data;

};



// Evaluaciones de un líder con formato similar al evaluador

export const obtenerEvaluacionesPorLider = async (liderId, periodo = null) => {

  const url = periodo ? `/usuarios/gestion/evaluaciones/lider/${liderId}?periodo=${periodo}` : `/usuarios/gestion/evaluaciones/lider/${liderId}`;

  const cacheKey = getCacheKey(url);

  

  const cached = getFromCache(cacheKey);

  if (cached) {

    return cached;

  }

  

  const response = await api.get(url);

  const data = extractData(response);

  setCache(cacheKey, data);

  return data;

};



// Reportes y estadísticas avanzadas

export const obtenerReportes = async (filtros = {}) => {

  const params = new URLSearchParams();

  

  if (filtros.periodo) params.append('periodo', filtros.periodo);

  if (filtros.departamento && filtros.departamento !== 'todos') {

    params.append('departamento_id', filtros.departamento);

  }

  

  const url = `/usuarios/gestion/reportes?${params}`;

  const cacheKey = getCacheKey(url, filtros);

  

  const cached = getFromCache(cacheKey);

  if (cached) {

    return cached;

  }

  

  const response = await api.get(url);

  const data = response?.data?.data || response?.data || {};

  setCache(cacheKey, data);

  return data;

};



// 🔥 NUEVO: Obtener valoración trimestral promedio por departamento

export const obtenerValoracionTrimestralPorDepartamento = async (filtros = {}) => {

  const params = new URLSearchParams();

  

  if (filtros.trimestre) params.append('trimestre', filtros.trimestre);

  if (filtros.anio) params.append('anio', filtros.anio);

  

  const url = `/usuarios/gestion/estadisticas/departamentos/valoracion-trimestral?${params}`;

  const cacheKey = getCacheKey(url, filtros);

  

  const cached = getFromCache(cacheKey);

  if (cached) {

    return cached;

  }

  

  const response = await api.get(url);

  const data = response?.data?.data || response?.data || {};

  setCache(cacheKey, data);

  return data;

};



// 🔥 Función para invalidar caché específica (menos invasiva)
export const invalidateCache = (pattern = null) => {
  if (pattern) {
    // Invalidar solo claves que coincidan con el patrón
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    // Invalidar todo (uso raro)
    cache.clear();
  }
};

// Función para limpiar caché manualmente si es necesario
export const limpiarCacheGestion = () => {
  cache.clear();
};

