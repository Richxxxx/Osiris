const catchAsync = require('../utils/catchAsync');
const { Evaluacion, Usuario, Formulario, Pregunta, Respuesta, Apartado } = require('../models');
const { Op } = require('sequelize');

/**
 * @desc    Obtener evaluaciones del empleado autenticado
 * @route   GET /api/empleado/mis-evaluaciones
 * @access  Privado/Empleado
 */
exports.getMisEvaluaciones = catchAsync(async (req, res, next) => {
  // Obtener ID del usuario autenticado
  const usuarioId = req.user.id;

  const evaluaciones = await Evaluacion.findAll({
    where: { 
      evaluado_id: usuarioId 
    },
    include: [
      {
        model: Formulario,
        as: 'formulario',
        include: [
          {
            model: Pregunta,
            as: 'preguntas',
            attributes: ['id', 'apartado', 'tipo']
          }
        ]
      },
      {
        model: Respuesta,
        as: 'respuestas',
        attributes: ['pregunta_id', 'puntuacion']
      },
      {
        model: Usuario,
        as: 'evaluador',
        attributes: ['id', 'nombre', 'apellido']
      }
    ],
    order: [['id', 'DESC']]
  });

  // Calcular progreso para cada evaluación (igual que el evaluador)
  const evaluacionesConProgreso = evaluaciones.map(evaluacion => {
    const esTrimestral = (evaluacion.periodicidad || '').toLowerCase() === 'trimestral' ||
      (evaluacion.formulario?.periodicidad || '').toLowerCase() === 'trimestral';

    const preguntas = evaluacion.formulario?.preguntas || [];
    const preguntasValidas = esTrimestral
      ? preguntas.filter(p => p.tipo !== 'titulo_seccion')
      : preguntas;
    const preguntasValidasIds = new Set(preguntasValidas.map(p => p.id));

    const totalPreguntas = preguntasValidas.length;
    const respuestas = evaluacion.respuestas || [];
    const contestadas = respuestas.filter(r => preguntasValidasIds.has(r.pregunta_id)).length;
    const progreso = totalPreguntas > 0 ? Math.round((contestadas / totalPreguntas) * 100) : 0;

    return {
      id: evaluacion.id,
      estado: evaluacion.estado,
      periodo: evaluacion.periodo,
      anio: evaluacion.anio,
      periodicidad: evaluacion.periodicidad,
      evaluador: evaluacion.evaluador,
      formulario: evaluacion.formulario,
      progreso: progreso,
      totalPreguntas: totalPreguntas,
      contestadas: contestadas,
      fechaFin: evaluacion.fechaFin,
      valoracion: esTrimestral ? evaluacion.valoracion_trimestral : evaluacion.valoracion_anual,
      fechaLimite: evaluacion.fechaLimite,
      updatedAt: evaluacion.updatedAt,
      createdAt: evaluacion.createdAt,
      puntuacionTotal: evaluacion.puntuacionTotal
    };
  });

  res.status(200).json({
    status: 'success',
    results: evaluacionesConProgreso.length,
    data: {
      evaluaciones: evaluacionesConProgreso
    }
  });
});

/**
 * @desc    Obtener detalle de una evaluación específica del empleado
 * @route   GET /api/empleado/mi-evaluacion/:id
 * @access  Privado/Empleado
 */
exports.getMiEvaluacion = catchAsync(async (req, res, next) => {
  const usuarioId = req.user.id;
  const { id } = req.params;

  const evaluacion = await Evaluacion.findOne({
    where: { 
      id: id,
      evaluado_id: usuarioId 
    },
    include: [
      {
        model: Formulario,
        as: 'formulario',
        include: [
          {
            model: Pregunta,
            as: 'preguntas'
          }
        ]
      },
      {
        model: Respuesta,
        as: 'respuestas'
      },
      {
        model: Usuario,
        as: 'evaluador',
        attributes: ['id', 'nombre', 'apellido']
      }
    ]
  });

  if (!evaluacion) {
    return res.status(404).json({
      status: 'error',
      message: 'Evaluación no encontrada'
    });
  }

  // Calcular progreso (igual que el evaluador)
  const esTrimestral = (evaluacion.periodicidad || '').toLowerCase() === 'trimestral' ||
    (evaluacion.formulario?.periodicidad || '').toLowerCase() === 'trimestral';
  const preguntas = evaluacion.formulario?.preguntas || [];
  const preguntasValidas = esTrimestral
    ? preguntas.filter(p => p.tipo !== 'titulo_seccion')
    : preguntas;
  const preguntasValidasIds = new Set(preguntasValidas.map(p => p.id));

  const totalPreguntas = preguntasValidas.length;
  const respuestas = evaluacion.respuestas || [];
  const contestadas = respuestas.filter(r => preguntasValidasIds.has(r.pregunta_id)).length;
  const progreso = totalPreguntas > 0 ? Math.round((contestadas / totalPreguntas) * 100) : 0;

  res.status(200).json({
    status: 'success',
    data: {
      evaluacion: {
        ...evaluacion.toJSON(),
        progreso: progreso,
        totalPreguntas: totalPreguntas,
        contestadas: contestadas
      }
    }
  });
});

/**
 * @desc    Obtener progreso detallado de evaluación actual por apartados
 * @route   GET /api/empleado/progreso-evaluacion-actual
 * @access  Privado/Empleado
 */
exports.getProgresoEvaluacionActual = catchAsync(async (req, res, next) => {
  const usuarioId = req.user.id;
  
  // Obtener evaluación actual del trimestre/año actual
  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentYear = now.getFullYear();
  const periodoParam = req.query.periodo;
  const anioParam = req.query.anio;

  const periodo = periodoParam || `Q${currentQuarter}`;
  const anio = anioParam ? parseInt(anioParam, 10) : currentYear;
  
  const evaluacion = await Evaluacion.findOne({
    where: { 
      evaluado_id: usuarioId,
      periodo,
      anio,
      estado: { [Op.in]: ['pendiente', 'en_progreso'] }
    },
    include: [
      {
        model: Formulario,
        as: 'formulario',
        include: [
          {
            model: Pregunta,
            as: 'preguntas',
            where: {
              tipo: { [Op.ne]: 'titulo_seccion' } // Excluir títulos de sección
            },
            required: false
          }
        ]
      },
      {
        model: Respuesta,
        as: 'respuestas',
        include: [
          {
            model: Pregunta,
            as: 'pregunta',
            attributes: ['id', 'apartado', 'tipo', 'peso']
          }
        ]
      },
      {
        model: Usuario,
        as: 'evaluador',
        attributes: ['id', 'nombre', 'apellido']
      }
    ],
    order: [['id', 'DESC']]
  });

  if (!evaluacion) {
    return res.status(200).json({
      status: 'success',
      data: {
        evaluacion: null,
        mensaje: 'No tienes una evaluación activa en el período actual'
      }
    });
  }

  // Determinar si es trimestral o anual basado en el formulario
  const esTrimestral = (evaluacion.periodicidad || '').toLowerCase() === 'trimestral' ||
                      (evaluacion.formulario?.periodicidad || '').toLowerCase() === 'trimestral';

  // Agrupar preguntas por apartado
  const apartados = {};

  // Inicializar apartados desde las preguntas del formulario
  if (evaluacion.formulario?.preguntas) {
    evaluacion.formulario.preguntas.forEach(pregunta => {
      const apartadoNombre = pregunta.apartado || 'general';
      if (!apartados[apartadoNombre]) {
        apartados[apartadoNombre] = {
          nombre: apartadoNombre,
          totalPreguntas: 0,
          contestadas: 0,
          progreso: 0,
          puntuacion: 0,
          puntuacionMaxima: 0
        };
      }
      apartados[apartadoNombre].totalPreguntas++;
      
      // Calcular puntuación máxima para este apartado (solo para evaluaciones anuales)
      if (!esTrimestral && pregunta.peso > 0) {
        apartados[apartadoNombre].puntuacionMaxima += pregunta.peso * 5; // Máximo 5 puntos por pregunta
      }
    });
  }

  // Procesar respuestas
  if (evaluacion.respuestas) {
    evaluacion.respuestas.forEach(respuesta => {
      if (respuesta.pregunta) {
        const apartadoNombre = respuesta.pregunta.apartado || 'general';
        
        // Actualizar contador de contestadas
        if (apartados[apartadoNombre]) {
          apartados[apartadoNombre].contestadas++;
          
          // Sumar puntuación (solo para evaluaciones anuales)
          if (!esTrimestral && respuesta.puntuacion > 0) {
            apartados[apartadoNombre].puntuacion += respuesta.puntuacion;
          }
        }
      }
    });
  }

  // Calcular progreso y formatear resultado
  const resultado = {
    id: evaluacion.id,
    titulo: `Evaluación ${esTrimestral ? 'Trimestral' : 'Anual'} - ${evaluacion.periodo} ${evaluacion.anio}`,
    tipo: esTrimestral ? 'trimestral' : 'anual',
    estado: evaluacion.estado,
    evaluador: evaluacion.evaluador,
    fechaLimite: evaluacion.fechaLimite,
    progresoGeneral: 0,
    totalPreguntas: 0,
    totalContestadas: 0,
    apartados: []
  };

  let totalPreguntas = 0;
  let totalContestadas = 0;

  Object.values(apartados).forEach(apartado => {
    apartado.progreso = apartado.totalPreguntas > 0 ? 
      Math.round((apartado.contestadas / apartado.totalPreguntas) * 100) : 0;
    
    totalPreguntas += apartado.totalPreguntas;
    totalContestadas += apartado.contestadas;
    
    resultado.apartados.push(apartado);
  });

  resultado.progresoGeneral = totalPreguntas > 0 ? 
    Math.round((totalContestadas / totalPreguntas) * 100) : 0;

  resultado.totalPreguntas = totalPreguntas;
  resultado.totalContestadas = totalContestadas;
  
  // Incluir campos de valoración y puntuación para mostrar en frontend
  resultado.valoracionAnual = evaluacion.valoracion_anual;
  resultado.valoracionTrimestral = evaluacion.valoracion_trimestral;
  resultado.puntuacionTotal = evaluacion.puntuacionTotal;

  // Ordenar apartados por nombre
  resultado.apartados.sort((a, b) => a.nombre.localeCompare(b.nombre));

  res.status(200).json({
    status: 'success',
    data: {
      evaluacion: resultado
    }
  });
});
