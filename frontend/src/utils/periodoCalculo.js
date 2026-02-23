// Funciones para calcular período de evaluación
export const formatearFecha = (fecha) => {
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const anio = fecha.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
};

export const calcularPeriodoReal = (fechaIngreso, periodicidad) => {
  if (!fechaIngreso) return { inicio: '01/01/2024', fin: '31/12/2024' };
  
  const fechaIng = new Date(fechaIngreso);
  const hoy = new Date();
  
  if (periodicidad === 'anual') {
    const fechaInicioAnual = new Date(fechaIng);
    fechaInicioAnual.setFullYear(fechaInicioAnual.getFullYear() + 1);
    
    if (hoy >= fechaInicioAnual) {
      return {
        inicio: formatearFecha(fechaIng),
        fin: formatearFecha(fechaInicioAnual)
      };
    } else {
      return {
        inicio: formatearFecha(fechaIng),
        fin: formatearFecha(hoy)
      };
    }
  } else {
    const hoy = new Date();
    let fechaPeriodoInicio = new Date(fechaIng);
    
    while (true) {
      const fechaPeriodoFin = new Date(fechaPeriodoInicio);
      fechaPeriodoFin.setUTCMonth(fechaPeriodoFin.getUTCMonth() + 3);
      
      if (hoy >= fechaPeriodoInicio && hoy <= fechaPeriodoFin) {
        return {
          inicio: formatearFecha(fechaPeriodoInicio),
          fin: formatearFecha(fechaPeriodoFin)
        };
      }
      
      fechaPeriodoInicio = new Date(fechaPeriodoFin);
    }
  }
};
