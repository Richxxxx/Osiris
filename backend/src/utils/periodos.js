const moment = require('moment');

/**
 * Utilidades para manejo de períodos de evaluación (trimestres)
 */
const PeriodosEvaluacion = {
  /**
   * Obtiene el trimestre actual (Q1, Q2, Q3, Q4)
   * @returns {string} Trimestre actual (ej: 'Q1')
   */
  getTrimestreActual: () => {
    const month = moment().month() + 1; // 1-12
    return `Q${Math.ceil(month / 3)}`;
  },

  /**
   * Obtiene el año actual
   * @returns {number} Año actual (ej: 2025)
   */
  getAnioActual: () => {
    return moment().year();
  },

  /**
   * Valida si una fecha está dentro del trimestre actual
   * @param {string|Date} fecha - Fecha a validar
   * @returns {boolean} true si la fecha está en el trimestre actual
   */
  esTrimestreActual: (fecha) => {
    const trimestreActual = PeriodosEvaluacion.getTrimestreActual();
    const trimestreFecha = `Q${Math.ceil((moment(fecha).month() + 1) / 3)}`;
    return trimestreActual === trimestreFecha;
  },

  /**
   * Obtiene el rango de fechas para un trimestre específico
   * @param {string} trimestre - Trimestre (Q1, Q2, Q3, Q4)
   * @param {number} anio - Año
   * @returns {{inicio: string, fin: string}} Objeto con fechas de inicio y fin
   */
  getRangoTrimestre: (trimestre, anio) => {
    const trimestreNum = parseInt(trimestre.replace('Q', ''));
    const inicio = moment().year(anio).month((trimestreNum - 1) * 3).date(1);
    const fin = moment(inicio).endOf('month').add(2, 'months');
    
    return {
      inicio: inicio.format('YYYY-MM-DD'),
      fin: fin.format('YYYY-MM-DD')
    };
  },

  /**
   * Valida si un trimestre está en el pasado
   * @param {string} trimestre - Trimestre a validar (Q1, Q2, Q3, Q4)
   * @param {number} anio - Año del trimestre
   * @returns {boolean} true si el trimestre ya pasó
   */
  esTrimestrePasado: (trimestre, anio) => {
    const ahora = moment();
    const { fin } = PeriodosEvaluacion.getRangoTrimestre(trimestre, anio);
    return moment(fin).isBefore(ahora, 'day');
  },

  /**
   * Obtiene la lista de trimestres disponibles para evaluación
   * @returns {Array<{valor: string, texto: string, anio: number}>} Lista de trimestres
   */
  getTrimestresDisponibles: () => {
    const trimestreActual = PeriodosEvaluacion.getTrimestreActual();
    const anioActual = PeriodosEvaluacion.getAnioActual();
    
    return [
      { valor: 'Q1', texto: 'Primer Trimestre', anio: anioActual },
      { valor: 'Q2', texto: 'Segundo Trimestre', anio: anioActual },
      { valor: 'Q3', texto: 'Tercer Trimestre', anio: anioActual },
      { valor: 'Q4', texto: 'Cuarto Trimestre', anio: anioActual }
    ].filter(t => {
      // Solo incluir trimestres futuros o el actual
      const esFuturo = t.anio > anioActual;
      const esActual = t.anio === anioActual && 
        parseInt(t.valor.replace('Q', '')) >= parseInt(trimestreActual.replace('Q', ''));
      return esFuturo || esActual;
    });
  }
};

module.exports = PeriodosEvaluacion;
