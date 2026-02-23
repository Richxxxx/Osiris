/**
 * Utilidades para determinar tipo de evaluación
 * Basado en la lógica del backend: calcularPeriodicidadPorFechaIngreso
 */

/**
 * Función para calcular periodicidad basada en fecha de ingreso
 * @param {string} fechaIngresoStr - Fecha de ingreso del empleado
 * @param {Date} fechaActual - Fecha actual para cálculos
 * @returns {string} - 'trimestral' o 'anual'
 */
export const calcularPeriodicidadPorFechaIngreso = (fechaIngresoStr, fechaActual = new Date()) => {
  if (!fechaIngresoStr) return 'trimestral'; // Por defecto
  
  const fechaIngreso = new Date(fechaIngresoStr);
  const mesesDesdeIngreso = (fechaActual - fechaIngreso) / (1000 * 60 * 60 * 24 * 30);
  
  // 🔥 A partir de 9.5 meses es anual (últimos 3 meses del primer año)
  return mesesDesdeIngreso >= 9.5 ? 'anual' : 'trimestral';
};

/**
 * Función para determinar qué tipo de evaluación le corresponde a un empleado
 * @param {Object} empleado - Datos del empleado con fecha_ingreso_empresa
 * @returns {Object} - Información completa del tipo de evaluación
 */
export const determinarTipoEvaluacion = (empleado) => {
  const fechaActual = new Date();
  const periodicidad = calcularPeriodicidadPorFechaIngreso(empleado?.fecha_ingreso_empresa, fechaActual);
  
  // Determinar período actual
  const currentMonth = fechaActual.getMonth();
  const currentYear = fechaActual.getFullYear();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  
  return {
    periodicidad: periodicidad,
    periodo: `Q${currentQuarter}`,
    anio: currentYear,
    tipoFormulario: periodicidad === 'anual' ? 'Anual por cargo/departamento' : 'Trimestral (único para todos)',
    label: periodicidad === 'anual' ? 'Evaluación Anual' : 'Evaluación Trimestral',
    color: periodicidad === 'anual' ? 'purple' : 'blue'
  };
};

/**
 * Función para verificar si un empleado debe mostrar botón de asignar
 * @param {Object} usuario - Usuario encontrado en búsqueda
 * @returns {boolean} - true si es empleado y debe mostrar botón asignar
 */
export const debeMostrarBotonAsignar = (usuario) => {
  // Si es evaluador, no mostrar botón
  if (usuario.rol?.nombre === 'evaluador') return false;
  
  // Si es empleado, mostrar botón
  if (usuario.rol?.nombre === 'empleado') return true;
  
  // Por defecto, no mostrar
  return false;
};
