const { AppError } = require('../utils/appError');
const PeriodosEvaluacion = require('../utils/periodos');

/**
 * Middleware para validar que la operación se realiza en el trimestre correcto
 */
const validarPeriodoEvaluacion = (req, res, next) => {
  try {
    const trimestre = req.params.trimestre || req.body.trimestre;
    const anio = req.params.anio || req.body.anio;

    // Si no se proporcionan, usar el trimestre y año actual
    const trimestreActual = trimestre || PeriodosEvaluacion.getTrimestreActual();
    const anioActual = anio ? parseInt(anio, 10) : PeriodosEvaluacion.getAnioActual();

    // Verificar si el trimestre es válido
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(trimestreActual)) {
      return next(new AppError('Trimestre no válido. Debe ser Q1, Q2, Q3 o Q4', 400));
    }

    // Verificar si el trimestre está en el pasado
    if (PeriodosEvaluacion.esTrimestrePasado(trimestreActual, anioActual)) {
      return next(new AppError('No se pueden realizar operaciones en trimestres pasados', 400));
    }

    // Obtener el rango del trimestre
    const { inicio, fin } = PeriodosEvaluacion.getRangoTrimestre(trimestreActual, anioActual);

    // Adjuntar información del período a la solicitud para su uso posterior
    req.periodoEvaluacion = {
      trimestre: trimestreActual,
      anio: anioActual,
      inicio: new Date(inicio),
      fin: new Date(fin)
    };

    next();
  } catch (error) {
    next(new AppError('Error al validar el período de evaluación: ' + error.message, 500));
  }
};

module.exports = { validarPeriodoEvaluacion };
