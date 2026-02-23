const { Evaluacion, Usuario, Formulario, Respuesta, Pregunta, Departamento, Rol, Cargo, Opcion, Apartado, sequelize } = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const PeriodosEvaluacion = require('../utils/periodos');
const { isWithinInterval, parseISO, isBefore, isAfter, format } = require('date-fns');
const notificationService = require('../services/notificationService');

const PERIODOS_VALIDOS = ['Q1', 'Q2', 'Q3', 'Q4'];

/**
 * Función para calcular periodicidad basada en fecha de ingreso
 * @param {string} fechaIngresoStr - Fecha de ingreso del empleado
 * @param {Date} fechaActual - Fecha actual para cálculos
 * @returns {string} - 'trimestral' o 'anual'
 */
const calcularPeriodicidadPorFechaIngreso = (fechaIngresoStr, fechaActual = new Date()) => {
  const fechaIngreso = new Date(fechaIngresoStr);
  const mesesDesdeIngreso = (fechaActual - fechaIngreso) / (1000 * 60 * 60 * 24 * 30);
  
  // 🔥 A partir de 9.5 meses es anual (últimos 3 meses del primer año)
  return mesesDesdeIngreso >= 9.5 ? 'anual' : 'trimestral';
};

/**
 * Función auxiliar para calcular fechas de evaluación según reglas core
 * @param {Date} fechaIngreso - Fecha de ingreso del empleado
 * @param {Date} fechaActual - Fecha actual para cálculos
 * @returns {Object} - Objeto con información de evaluaciones
 */

// Middleware para validar el período de evaluación
const validarPeriodoEvaluacion = catchAsync(async (req, res, next) => {
  const { trimestre, anio } = req.body;
  
  if (PeriodosEvaluacion.esTrimestrePasado(trimestre, anio)) {
    return next(new AppError('No se pueden crear o modificar evaluaciones de trimestres pasados', 403));
  }
  
  if (!PeriodosEvaluacion.esTrimestreActual(new Date())) {
    return next(new AppError('No se pueden crear o modificar evaluaciones fuera del trimestre actual', 403));
  }
  
  next();
});

// Obtener todas las evaluaciones con filtros opcionales
exports.listarEvaluaciones = catchAsync(async (req, res, next) => {
  try {
    const { periodo, anio, departamentoId } = req.query;
    const usuario = req.user;
    
    // Validar que el usuario esté autenticado
    if (!usuario) {
      return next(new AppError('Debe iniciar sesión para ver las evaluaciones', 401));
    }

    // Construir condiciones de búsqueda según el rol del usuario
    let whereCondition = {};
    
    // Si es evaluador, solo puede ver sus propias evaluaciones o las de su departamento
    if (usuario.rol_id === 2) { // Asumiendo que 2 es el ID del rol evaluador
      whereCondition = {
        [Op.or]: [
          { evaluador_id: usuario.id },
          { 
            '$evaluado.departamento_id$': usuario.departamento_id,
            estado: { [Op.in]: ['pendiente', 'en_progreso', 'completada'] }
          }
        ]
      };
    } 
    // Si es empleado, solo puede ver sus propias evaluaciones
    else if (usuario.rol_id === 3) { // Asumiendo que 3 es el ID del rol empleado
      whereCondition = { 
        evaluado_id: usuario.id,
        estado: { [Op.in]: ['pendiente', 'en_progreso', 'completada'] }
      };
    }
    // Si es administrador, puede ver todas las evaluaciones
    else if (usuario.rol_id === 1) { // Asumiendo que 1 es el ID del rol administrador
      whereCondition = {};
    }

    // Aplicar filtros adicionales si se proporcionan
    if (periodo) whereCondition.periodo = periodo;
    if (anio) whereCondition.anio = anio;
    if (departamentoId) whereCondition.departamento_id = departamentoId;

    const evaluaciones = await Evaluacion.findAll({
      where: whereCondition,
      include: [
        {
          model: Usuario,
          as: 'evaluador',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          include: [
            {
              model: Departamento,
              as: 'departamento',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: Usuario,
          as: 'evaluado',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          include: [
            {
              model: Departamento,
              as: 'departamento',
              attributes: ['id', 'nombre']
            }
          ]
        },
        { 
          model: Formulario, 
          attributes: ['id', 'nombre', 'descripcion'] 
        }
      ],
      order: [
        ['anio', 'DESC'],
        ['periodo', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.status(200).json({
      status: 'success',
      results: evaluaciones.length,
      data: { evaluaciones }
    });
  } catch (error) {
    next(new AppError('Error al obtener las evaluaciones: ' + error.message, 500));
  }
});

// Obtener evaluación activa por departamento y cargo
exports.obtenerEvaluacionActiva = catchAsync(async (req, res, next) => {
  const { departamentoId, cargo } = req.params;
  const hoy = new Date();
  
  // Obtener el trimestre y año actual
  const trimestreActual = `Q${Math.floor((hoy.getMonth() + 3) / 3)}`;
  const anioActual = hoy.getFullYear();

  // Buscar evaluación activa para el departamento, cargo y período actual
  const evaluacion = await Evaluacion.findOne({
    where: {
      departamento_id: departamentoId,
      cargo,
      periodo: trimestreActual,
      anio: anioActual,
      estado: { [Op.in]: ['pendiente', 'en_progreso'] }
    },
    include: [
      { 
        model: Formulario,
        where: { 
          estado: 'activo',
          fecha_inicio: { [Op.lte]: hoy },
          [Op.or]: [
            { fecha_fin: null },
            { fecha_fin: { [Op.gte]: hoy } }
          ]
        },
        attributes: ['id', 'nombre', 'descripcion'],
        include: [
          {
            model: Pregunta,
            as: 'preguntas',
            where: { '$cargo.nombre$': cargo },
            include: [
              {
                model: Cargo,
                as: 'cargo',
                required: true
              }
            ],
            where: {
              [Op.or]: [
                { '$cargos.id$': { [Op.is]: null } }, // Preguntas sin restricción de cargo
                { '$cargos.cargo$': cargo } // Preguntas para este cargo específico
              ]
            },
            order: [['orden', 'ASC']]
          }
        ]
      }
    ]
  });

  if (!evaluacion) {
    return next(new AppError('No hay una evaluación activa para este departamento y cargo', 404));
  }

  // Si la evaluación está pendiente, actualizar a en_progreso
  if (evaluacion.estado === 'pendiente') {
    await evaluacion.update({ 
      estado: 'en_progreso',
      evaluador_id: req.user.id,
      fecha_inicio: new Date()
    });
  }

  // Obtener empleados a evaluar en este departamento y cargo
  const empleados = await Usuario.findAll({
    where: {
      departamento_id: departamentoId,
      cargo,
      estado: 'activo',
      id: { [Op.ne]: req.user.id } // Excluir al evaluador
    },
    attributes: ['id', 'nombres', 'apellidos', 'email', 'cargo'],
    order: [['apellidos', 'ASC'], ['nombres', 'ASC']]
  });

  // Formatear la respuesta
  const evaluacionData = {
    id: evaluacion.id,
    periodo: evaluacion.periodo,
    anio: evaluacion.anio,
    estado: evaluacion.estado,
    fecha_inicio: evaluacion.fecha_inicio,
    fecha_fin: evaluacion.fecha_fin,
    formulario: {
      id: evaluacion.Formulario.id,
      nombre: evaluacion.Formulario.nombre,
      descripcion: evaluacion.Formulario.descripcion,
      preguntas: evaluacion.Formulario.preguntas.map(p => ({
        id: p.id,
        texto: p.texto,
        tipo: p.tipo,
        opciones: p.opciones,
        esObligatoria: p.esObligatoria,
        orden: p.orden
      }))
    },
    empleados
  };

  res.status(200).json({
    status: 'success',
    data: {
      evaluacion: evaluacionData
    }
  });
});

// Obtener empleados de un departamento para evaluación
exports.finalizarEvaluacion = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const usuarioId = req.user.id;
  
  // Obtener la evaluación
  const evaluacion = await Evaluacion.findByPk(id, {
    include: [
      { 
        model: Formulario, 
        as: 'formulario',
        include: [
          { 
            model: Pregunta, 
            as: 'preguntas',
            include: [
              {
                model: Pregunta,
                as: 'seccion',
                required: false,
                attributes: ['id', 'enunciado']
              }
            ]
          }
        ]
      },
      { model: Usuario, as: 'evaluador' },
      { model: Usuario, as: 'evaluado' },
      { model: Respuesta, as: 'respuestas' }
    ]
  });
  
  // Verificar estructura de la tabla
  const tableInfo = await Evaluacion.describe();
  
  if (!evaluacion) {
    return next(new AppError('No se encontró la evaluación especificada', 404));
  }
  
  // Verificar que el usuario es el evaluador asignado
  if (evaluacion.evaluadorId !== usuarioId) {
    return next(new AppError('No tienes permiso para finalizar esta evaluación', 403));
  }
  
  // Verificar que la evaluación está en progreso
  if (evaluacion.estado !== 'en_progreso') {
    return next(new AppError('Esta evaluación no puede ser finalizada', 400));
  }
  
  // Verificar que el trimestre sigue activo
  if (PeriodosEvaluacion.esTrimestrePasado(evaluacion.trimestre, evaluacion.anio)) {
    return next(new AppError('El período de evaluación ya ha finalizado', 400));
  }
  
  // Verificar que todas las preguntas tienen respuesta
  const preguntas = evaluacion.formulario.preguntas;
  const respuestas = evaluacion.respuestas;
  
  let puntuacionFinal = 0;
  
  // Verificar si es un formulario trimestral o anual
  const esFormularioTrimestral = !formulario.porcentajes_apartados;
  
  // Calcular valoración final
  let valoracion_anual = null;
  let valoracion_trimestral = null;
  
  if (esFormularioTrimestral && preguntas.some(p => p.tipo === 'escala')) {
    valoracion_trimestral = calcularValoracionFinal(puntuacion_total, true);
  } else if (!esFormularioTrimestral && preguntas.some(p => p.tipo === 'escala')) {
    valoracion_anual = calcularValoracionFinal(puntuacion_total, false);
  }
  
  // Actualizar evaluación
  const updateData = {
    estado: 'completada',
    puntuacion_total: preguntasEscala.length > 0 ? puntuacion_total.toFixed(2) : null,
    valoracion_anual: valoracion_anual,
    valoracion_trimestral: valoracion_trimestral,
    fecha_fin: new Date(),
    updatedAt: new Date()
  };
  
  await evaluacion.update(updateData);
  
  // Enviar notificación de evaluación completada
  try {
    await notificationService.notificarEvaluacionCompletada(evaluacion.id);
    
    // 🔥 NUEVO: Si era una evaluación asignada, notificar a gestión
    if (evaluacion.estado === 'asignada') {
      await notificationService.notificarEvaluacionAsignadaFinalizada(evaluacion.id);
          }
  } catch (notificationError) {
    // No fallamos la petición si las notificaciones fallan
  }
  
  // Verificar que se guardó correctamente
  const evaluacionActualizada = await Evaluacion.findByPk(evaluacion.id, {
    attributes: ['id', 'puntuacion_total', 'valoracion_anual', 'valoracion_trimestral', 'estado']
  });
  
  // Intentar actualizar directamente con SQL si es necesario
  if (!evaluacionActualizada.valoracion_anual && valoracion_anual) {
    await sequelize.query(`
      UPDATE evaluaciones 
      SET valoracion_anual = :valoracion_anual 
      WHERE id = :id
    `, {
      replacements: { valoracion_anual, id: evaluacion.id },
      type: sequelize.QueryTypes.UPDATE
    });
    
    const evaluacionFinal = await Evaluacion.findByPk(evaluacion.id, {
      attributes: ['id', 'valoracion_anual']
    });
  }
  
  if (!evaluacionActualizada.valoracion_trimestral && valoracion_trimestral) {
    await sequelize.query(`
      UPDATE evaluaciones 
      SET valoracion_trimestral = :valoracion_trimestral 
      WHERE id = :id
    `, {
      replacements: { valoracion_trimestral, id: evaluacion.id },
      type: sequelize.QueryTypes.UPDATE
    });
    
    const evaluacionFinal = await Evaluacion.findByPk(evaluacion.id, {
      attributes: ['id', 'valoracion_trimestral']
    });
  }
  
  res.status(200).json({
    // Campos principales de respuesta
    status: 'success',
    message: 'Evaluación finalizada correctamente',
    data: { 
      evaluacion: {
        // Campos principales de evaluación
        id: evaluacion.id,
        estado: 'completada',
        
        // Campos de resultados (agrupados)
        puntuacion_total: preguntasEscala.length > 0 ? puntuacion_total.toFixed(2) : null,
        valoracion_anual: valoracion_anual,
        valoracion_trimestral: valoracion_trimestral
      }
    }
  });
});

// Obtener evaluaciones por período y departamento
exports.obtenerEvaluacionesPorPeriodo = catchAsync(async (req, res, next) => {
  const { periodo, anio, departamentoId } = req.params;
  
  // Validar que el período sea válido
  const periodosValidos = ['Q1', 'Q2', 'Q3', 'Q4'];
  if (!periodosValidos.includes(periodo)) {
    return next(new AppError('Período no válido. Debe ser Q1, Q2, Q3 o Q4', 400));
  }

  const evaluaciones = await Evaluacion.findAll({
    where: {
      periodo,
      anio: parseInt(anio)
    },
    include: [
      { 
        model: Usuario, 
        as: 'evaluado',
        where: departamentoId ? { departamento_id: departamentoId } : {},
        attributes: ['id', 'nombre', 'email', 'departamento_id'],
        include: [
          { model: Departamento, attributes: ['id', 'nombre'] }
        ]
      },
      { 
        model: Formulario, 
        attributes: ['id', 'nombre', 'descripcion'] 
      }
    ],
    order: [[{ model: Usuario, as: 'evaluado' }, 'nombre', 'ASC']]
  });

  res.status(200).json({
    status: 'success',
    results: evaluaciones.length,
    data: { evaluaciones }
  });
});

// Iniciar evaluación trimestral para un departamento
exports.iniciarEvaluacionTrimestral = catchAsync(async (req, res, next) => {
  const { departamentoId, periodo, anio, fecha_inicio, fecha_fin, formulario_id } = req.body;
  
  // Validar fechas
  const hoy = new Date();
  const fecha_inicioEvaluacion = new Date(fecha_inicio);
  const fecha_finEvaluacion = new Date(fecha_fin);

  if (fecha_inicioEvaluacion >= fecha_finEvaluacion) {
    return next(new AppError('La fecha de inicio debe ser anterior a la fecha de fin', 400));
  }

  // Validar que no se solapen con otras evaluaciones
  const evaluacionesExistentes = await Evaluacion.findAll({
    where: {
      periodo,
      anio,
      '$evaluado.departamento_id$': departamentoId
    },
    include: [
      { 
        model: Usuario, 
        as: 'evaluado',
        attributes: []
      }
    ]
  });

  if (evaluacionesExistentes.length > 0) {
    return next(new AppError('Ya existen evaluaciones para este departamento en el período especificado', 400));
  }

  // Obtener todos los usuarios del departamento
  const usuarios = await Usuario.findAll({
    where: { departamento_id: departamentoId },
    attributes: ['id']
  });

  // Crear evaluaciones para cada usuario
  const evaluaciones = await Promise.all(
    usuarios.map(usuario => 
      Evaluacion.create({
        evaluador_id: req.usuario.id, // El usuario que inicia la evaluación
        evaluado_id: usuario.id,
        formulario_id,
        periodo,
        anio,
        periodicidad: 'trimestral', // 🔥 Por defecto trimestral, debería calcularse
        fecha_inicio: fecha_inicioEvaluacion,
        fecha_fin: fecha_finEvaluacion,
        estado: 'pendiente'
      })
    )
  );

  res.status(201).json({
    status: 'success',
    results: evaluaciones.length,
    data: { evaluaciones }
  });
});

// Obtener evaluación actual del usuario autenticado
exports.obtenerMiEvaluacionActual = catchAsync(async (req, res, next) => {
  const evaluador_id = req.usuario.id;
  const hoy = new Date();

  const evaluacion = await Evaluacion.findOne({
    where: {
      evaluador_id,
      estado: 'en_progreso',
      fecha_inicio: { [Op.lte]: hoy },
      fecha_fin: { [Op.gte]: hoy }
    },
    include: [
      { 
        model: Formulario,
        include: [
          { 
            model: Pregunta,
            include: [
              { 
                model: Respuesta,
                where: { evaluacion_id: { [Op.col]: 'Evaluacion.id' } },
                required: false
              }
            ],
            order: [['orden', 'ASC']]
          }
        ]
      },
      { model: Usuario, as: 'evaluado', attributes: ['id', 'nombre', 'email'] }
    ]
  });

  if (!evaluacion) {
    return next(new AppError('No tienes evaluaciones en progreso actualmente', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { evaluacion }
  });
});

// -----------------------------
// Funciones placeholders para rutas faltantes
// -----------------------------

exports.obtenerMisEvaluaciones = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', data: [] });
});

exports.obtenerMiEvaluacion = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', data: {} });
});

/**
 * @desc    Iniciar una nueva evaluación automáticamente para un empleado
 * @route   POST /api/evaluaciones/iniciar
 * @access  Privado/Evaluador
 * @body    {number} evaluadoId - ID del empleado a evaluar
 */
exports.iniciarEvaluacion = catchAsync(async (req, res, next) => {
  const { evaluadoId } = req.body;
  const evaluadorId = req.user.id;
  
  if (!evaluadoId) {
    return next(new AppError('El ID del evaluado es requerido', 400));
  }
  
  try {
    // Verificar que el usuario sea un evaluador
    if (req.user.rol.nombre !== 'evaluador') {
      return next(new AppError('Solo los evaluadores pueden iniciar evaluaciones', 403));
    }
    
    // Obtener información completa del evaluado
    const evaluado = await Usuario.findByPk(evaluadoId, {
      attributes: ['id', 'nombre', 'apellido', 'email', 'fecha_ingreso_empresa', 'departamento_id', 'cargo_id'],
      include: [
        {
          model: Cargo,
          as: 'cargo',
          attributes: ['id', 'nombre']
        },
        {
          model: Departamento,
          as: 'departamento',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    // Formatear fecha de ingreso del evaluado para evitar problemas UTC
    if (evaluado && evaluado.fecha_ingreso_empresa) {
      const fechaEval = new Date(evaluado.fecha_ingreso_empresa);
      // Usar método local para evitar conversión UTC
      const year = fechaEval.getFullYear();
      const month = String(fechaEval.getMonth() + 1).padStart(2, '0');
      const day = String(fechaEval.getDate()).padStart(2, '0');
      evaluado.dataValues.fecha_ingreso_empresa_formateada = `${year}-${month}-${day}`;
    }
    
    if (!evaluado) {
      return next(new AppError('No se encontró el empleado a evaluar', 404));
    }

    // Función core para determinar periodicidad requerida
    const calcularPeriodicidadRequerida = (fechaIngresoStr, fechaActual = new Date()) => {
      const fechaIng = new Date(fechaIngresoStr);
      const hoy = new Date(fechaActual);
      
      // Calcular primera anual (12 meses después)
      const primeraAnual = new Date(fechaIng);
      primeraAnual.setFullYear(primeraAnual.getFullYear() + 1);
      
      // Determinar si está en primer año
      const enPrimerAno = hoy < primeraAnual;
      
      // Determinar trimestre actual
      const trimestreActual = `Q${Math.floor((hoy.getMonth() + 3) / 3)}`;
      const anioActual = hoy.getFullYear();
      
      // Función para verificar período de activación (15 días antes + 5 días después)
      // 🔥 CORRECCIÓN: Exactamente 20 días totales
      const estaEnPeriodoActivacion = (fechaEvaluacion) => {
        // Crear fechas en zona horaria UTC-5 (Bogotá/Lima)
        const fechaEval = new Date(fechaEvaluacion + 'T00:00:00-05:00');
        
        // 15 días ANTES (sin contar el día de evaluación)
        const dias15Antes = new Date(fechaEval);
        dias15Antes.setUTCDate(fechaEval.getUTCDate() - 15);
        dias15Antes.setUTCHours(0, 0, 0, 0);
        
        // 5 días DESPUÉS (contando desde el día siguiente a la evaluación)
        const dias5Despues = new Date(fechaEval);
        dias5Despues.setUTCDate(fechaEval.getUTCDate() + 5);
        dias5Despues.setUTCHours(23, 59, 59, 999);
        
        const hoy = new Date();
        const hoyUTC5 = new Date(hoy.toLocaleString("en-US", {timeZone: "America/Bogota"}));
        
        return hoyUTC5 >= dias15Antes && hoyUTC5 <= dias5Despues;
      };
      
      // Buscar evaluaciones activas en primer año
      if (enPrimerAno) {
        let fechaTrimestral = new Date(fechaIng);
        while (fechaTrimestral < primeraAnual) {
          fechaTrimestral.setMonth(fechaTrimestral.getMonth() + 3);
          if (fechaTrimestral <= primeraAnual) {
            const trimestreEval = `Q${Math.floor((fechaTrimestral.getMonth() + 3) / 3)}`;
            const anioEval = fechaTrimestral.getFullYear();
            
            if (trimestreEval === trimestreActual && anioEval === anioActual && estaEnPeriodoActivacion(fechaTrimestral)) {
              return {
                periodicidad: 'trimestral',
                periodo: trimestreEval,
                anio: anioEval,
                tipo: 'trimestral'
              };
            }
          }
        }
        
        // Verificar primera anual
        if (estaEnPeriodoActivacion(primeraAnual)) {
          const trimestreAnual = `Q${Math.floor((primeraAnual.getMonth() + 3) / 3)}`;
          const anioAnual = primeraAnual.getFullYear();
          
          return {
            periodicidad: 'anual',
            periodo: trimestreAnual,
            anio: anioAnual,
            tipo: 'primera_anual'
          };
        }
      } else {
        // Después del primer año: SOLO evaluaciones anuales en Q4
        if (trimestreActual === 'Q4') {
          const evaluacionAnualActual = new Date(anioActual, 11, 31); // 31 de diciembre
          
          if (estaEnPeriodoActivacion(evaluacionAnualActual)) {
            return {
              periodicidad: 'anual',
              periodo: 'Q4',
              anio: anioActual,
              tipo: 'anual'
            };
          }
        }
      }
      
      return null; // No hay evaluación activa
    };

    // Determinar periodicidad basada en fecha de ingreso actual
    const periodicidadCalculada = calcularPeriodicidadPorFechaIngreso(evaluado.fecha_ingreso_empresa);
    
    // Determinar período y año actual
    const fechaActual = new Date();
    const trimestreActual = `Q${Math.floor((fechaActual.getMonth() + 3) / 3)}`;
    const anioActual = fechaActual.getFullYear();
    
    const periodicidadInfo = {
      periodicidad: periodicidadCalculada,
      periodo: trimestreActual,
      anio: anioActual,
      tipo: periodicidadCalculada
    };
    
    // Buscar formulario correcto según periodicidad y cargo
    let formulario = null;
    
    if (periodicidadInfo.periodicidad === 'trimestral') {
      // Para trimestrales, buscar el formulario trimestral activo
            formulario = await Formulario.findOne({
        where: {
          estado: 'activo',
          periodicidad: 'trimestral'
        }
      });
    } else {
      // Para anuales, buscar el formulario por cargo a través de la tabla intermedia
      formulario = await Formulario.findOne({
        where: {
          estado: 'activo',
          periodicidad: 'anual'
        },
        include: [
          {
            model: Cargo,
            as: 'cargos',
            where: {
              id: evaluado.cargo_id
            },
            through: { attributes: [] },
            required: true
          }
        ]
      });
    }
    
    if (!formulario) {
      // Si no hay formulario, continuar sin él para no bloquear
            // NO retornar error, solo continuar sin formulario
    }
    
    // Verificar si ya existe una evaluación para este evaluado en este período
    const evaluacionExistente = await Evaluacion.findOne({
      where: {
        evaluadoId: evaluadoId,
        evaluadorId: evaluadorId,
        periodo: periodicidadInfo.periodo,
        anio: periodicidadInfo.anio
      }
    });
    
    if (evaluacionExistente) {
      return res.status(200).json({
        status: 'success',
        message: 'Ya existe una evaluación para este empleado en este período',
        data: {
          evaluacion: evaluacionExistente,
          formulario: formulario
        }
      });
    }
    
    // Crear nueva evaluación
    const nuevaEvaluacion = await Evaluacion.create({
      evaluadoId: evaluadoId,
      evaluadorId: evaluadorId,
      formulario_id: formulario ? formulario.id : null,
      departamento_id: evaluado.departamento_id,
      cargo_id: evaluado.cargo_id,
      periodo: periodicidadInfo.periodo,
      anio: periodicidadInfo.anio,
      periodicidad: periodicidadInfo.periodicidad,
      estado: 'pendiente',
      fecha_inicio: new Date().toISOString().split('T')[0]
    });
    
    res.status(201).json({
      status: 'success',
      message: `Evaluación ${periodicidadInfo.periodicidad} iniciada correctamente`,
      data: {
        evaluacion: nuevaEvaluacion,
        formulario: formulario,
        periodicidadInfo: periodicidadInfo,
        evaluado: {
          ...evaluado.toJSON(),
          fecha_ingreso_empresa_formateada: evaluado.dataValues.fecha_ingreso_empresa_formateada
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * @desc    Obtener evaluaciones por departamento y período
 * @route   GET /api/evaluaciones/departamento/:departamentoId
 * @access  Privado/Admin
 */

// ====================
// FUNCIÓN UNIFICADA SIMPLE Y ROBUSTA - SOLUCIÓN DEFINITIVA
// ====================

// Obtener evaluación específica - VERSIÓN FINAL CORREGIDA
exports.obtenerEvaluacionSimple = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const usuario = req.user;

  if (!id || isNaN(parseInt(id))) {
    return next(new AppError('ID de evaluación inválido', 400));
  }

  try {
    // Consulta básica sin relaciones primero
    let evaluacion = await Evaluacion.findOne({
      where: { id: parseInt(id) },
      attributes: ['id', 'evaluadoId', 'evaluadorId', 'formulario_id', 'estado', 'periodo', 'anio', 'periodicidad', 'puntuacionTotal', 'valoracion_anual', 'valoracion_trimestral', 'fechaInicio', 'fechaFin', 'created_at', 'updated_at']
    });

    if (!evaluacion) {
      return next(new AppError('Evaluación no encontrada', 404));
    }

    // Validar permisos según el rol
    if (usuario.rol.nombre === 'empleado') {
      if (evaluacion.evaluadoId !== usuario.id) {
        return next(new AppError('No tiene permiso para ver esta evaluación', 403));
      }
    } else if (usuario.rol.nombre === 'evaluador') {
      // 🔥 CORRECCIÓN: El evaluador puede ver si es el evaluador O si es el evaluado
      if (evaluacion.evaluadorId !== usuario.id && evaluacion.evaluadoId !== usuario.id) {
        if (evaluacion.estado === 'asignada') {
          await Evaluacion.update(
            { evaluadorId: usuario.id },
            { where: { id: evaluacion.id } }
          );
          evaluacion = await Evaluacion.findByPk(evaluacion.id);
          return next(new AppError('No tiene permiso para ver esta evaluación', 403));
        }
      } else if (evaluacion.evaluadorId === usuario.id) {
      } else if (evaluacion.evaluadoId === usuario.id) {
      }
    }

    // Agregar información básica de usuarios
    const evaluacionData = evaluacion.toJSON();
    
    try {
      // Agregar info del evaluador
      if (evaluacion.evaluadorId) {
        const evaluador = await Usuario.findByPk(evaluacion.evaluadorId, {
          attributes: ['id', 'nombre', 'apellido', 'email', 'fecha_ingreso_empresa'],
          include: [{
            model: Cargo,
            as: 'cargo',
            attributes: ['id', 'nombre']
          }]
        });
        
        // Formatear fecha de ingreso del evaluador para evitar problemas UTC
        if (evaluador && evaluador.fecha_ingreso_empresa) {
          const fechaEval = new Date(evaluador.fecha_ingreso_empresa);
          // Usar método local para evitar conversión UTC
          const year = fechaEval.getFullYear();
          const month = String(fechaEval.getMonth() + 1).padStart(2, '0');
          const day = String(fechaEval.getDate()).padStart(2, '0');
          evaluador.dataValues.fecha_ingreso_empresa_formateada = `${year}-${month}-${day}`;
        }
        
        evaluacionData.evaluador = evaluador;
      }

      // Agregar info del evaluado
      if (evaluacion.evaluadoId) {
        const evaluado = await Usuario.findByPk(evaluacion.evaluadoId, {
          attributes: ['id', 'nombre', 'apellido', 'email', 'fecha_ingreso_empresa'],
          include: [
            {
              model: Cargo,
              as: 'cargo',
              attributes: ['id', 'nombre']
            },
            {
              model: Departamento,
              as: 'departamento',
              attributes: ['id', 'nombre']
            }
          ]
        });
        
        // Formatear fecha de ingreso del evaluado para evitar problemas UTC
        if (evaluado && evaluado.fecha_ingreso_empresa) {
          const fechaEval = new Date(evaluado.fecha_ingreso_empresa);
          // Usar método local para evitar conversión UTC
          const year = fechaEval.getFullYear();
          const month = String(fechaEval.getMonth() + 1).padStart(2, '0');
          const day = String(fechaEval.getDate()).padStart(2, '0');
          evaluado.dataValues.fecha_ingreso_empresa_formateada = `${year}-${month}-${day}`;
        }
        
        evaluacionData.evaluado = evaluado;
      }

      // Agregar formulario si existe
      if (evaluacion.formulario_id) {
        const formulario = await Formulario.findByPk(evaluacion.formulario_id, {
          include: [{
            model: Pregunta,
            as: 'preguntas'
          }]
        });
        
        if (formulario) {
          // Ordenar preguntas por número
          const preguntas = formulario.preguntas.sort((a, b) => a.numero - b.numero);
          formulario.dataValues.preguntas = preguntas;
        }
        evaluacionData.formulario = formulario;
      }

      // Agregar respuestas si existen
      const respuestas = await Respuesta.findAll({
        where: { evaluacion_id: evaluacion.id },
        include: [{
          model: Pregunta,
          as: 'pregunta',
          attributes: ['id', 'tipo', 'enunciado', 'opciones']
        }]
      });
      
      // Formatear respuestas para el frontend
      const respuestasFormateadas = respuestas.map(r => ({
        preguntaId: r.pregunta_id,
        respuesta: r.valor,
        puntuacion: r.puntuacion,
        comentarios: r.comentarios,
        pregunta: r.pregunta
      }));
      
      evaluacionData.respuestas = respuestasFormateadas;

    } catch (relError) {
      // Si fallan las relaciones, devolver la evaluación básica
    }

    res.status(200).json({
      status: 'success',
      data: { evaluacion: evaluacionData }
    });

  } catch (error) {
    return next(new AppError('Error interno del servidor', 500));
  }
});

// ====================
// FUNCIONES ESPECÍFICAS POR ROL - SOLUCIÓN DEFINITIVA
// ====================

// Obtener evaluación específica para EMPLEADOS
exports.obtenerEvaluacionEmpleado = catchAsync(async (req, res, next) => {
  return exports.obtenerEvaluacionSimple(req, res, next);
});

// Obtener evaluación específica para GESTIÓN
exports.obtenerEvaluacionGestion = catchAsync(async (req, res, next) => {
  return exports.obtenerEvaluacionSimple(req, res, next);
});

// Obtener evaluación específica para EVALUADORES
exports.obtenerEvaluacionEvaluador = catchAsync(async (req, res, next) => {
  return exports.obtenerEvaluacionSimple(req, res, next);
});

// Obtener evaluación específica para ADMINISTRADORES
exports.obtenerEvaluacionAdmin = catchAsync(async (req, res, next) => {
  return exports.obtenerEvaluacionSimple(req, res, next);
});

// Obtener una evaluación específica - VERSIÓN CON DEBUGGING
exports.obtenerEvaluacion = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const usuario = req.user;

  // Validar que se proporcionó un ID
  if (!id) {
    return next(new AppError('Se requiere el ID de la evaluación', 400));
  }

  if (isNaN(parseInt(id))) {
    return next(new AppError('El ID de la evaluación debe ser un número válido', 400));
  }

  const where = { id: parseInt(id) };
  
  // Validar permisos según el rol
  if (!usuario || !usuario.rol || !usuario.rol.nombre) {
    return next(new AppError('Usuario no autenticado o sin rol definido', 401));
  }

  if (!['administrador', 'gestion'].includes(usuario.rol.nombre)) {
    // Si es evaluador o empleado, solo puede ver sus evaluaciones asignadas o propias
    if (usuario.rol.nombre === 'evaluador') {
      where[Op.or] = [
        { evaluador_id: usuario.id },
        { 
          evaluado_id: usuario.id,
          estado: { [Op.in]: ['pendiente', 'en_progreso', 'completada'] }
        }
      ];
    } else if (usuario.rol.nombre === 'empleado') {
      // Empleado solo puede ver sus propias evaluaciones
      where.evaluado_id = usuario.id;
    }
  }

  try {
    const evaluacion = await Evaluacion.findOne({
      where,
      include: [
        {
          model: Usuario,
          as: 'evaluador',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          include: [
            {
              model: require('./rol.model'),
              as: 'rol',
              attributes: ['id', 'nombre']
            },
            {
              model: require('./cargo.model'),
              as: 'cargo',
              attributes: ['id', 'nombre']
            },
            {
              model: require('./departamento.model'),
              as: 'departamento',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: Usuario,
          as: 'evaluado',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          include: [
            {
              model: require('./rol.model'),
              as: 'rol',
              attributes: ['id', 'nombre']
            },
            {
              model: require('./cargo.model'),
              as: 'cargo',
              attributes: ['id', 'nombre']
            },
            {
              model: require('./departamento.model'),
              as: 'departamento',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: require('./formulario.model'),
          as: 'formulario',
          attributes: ['id', 'nombre', 'descripcion', 'porcentajes_apartados'],
          include: [
            {
              model: Pregunta,
              as: 'preguntas',
              include: [
                {
                  model: require('./opcion.model'),
                  as: 'opciones'
                }
              ]
            }
          ]
        },
        {
          model: require('./respuesta.model'),
          as: 'respuestas',
          required: false
        }
      ]
    });

    if (!evaluacion) {
      return next(new AppError('No se encontró la evaluación o no tiene permiso para verla', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        evaluacion
      }
    });
  } catch (error) {
    return next(new AppError('Error interno del servidor al obtener la evaluación', 500));
  }
});

exports.enviarRespuestas = catchAsync(async (req, res, next) => {
  res.status(200).json({ status: 'success', message: 'Respuestas enviadas correctamente' });
});

// Obtener reporte por usuario
exports.obtenerReportePorUsuario = catchAsync(async (req, res, next) => {
  const { usuarioId } = req.params;
  
  if (!usuarioId) {
    return next(new AppError('Se requiere el ID del usuario', 400));
  }
  
  // Verificar que el usuario existe
  const usuario = await Usuario.findByPk(usuarioId, {
    attributes: ['id', 'nombre', 'apellido', 'email', 'cargo'],
    include: [
      {
        model: Departamento,
        attributes: ['id', 'nombre']
      },
      {
        model: Rol,
        attributes: ['id', 'nombre']
      }
    ]
  });
  
  if (!usuario) {
    return next(new AppError('No se encontró el usuario especificado', 404));
  }
  
  // Obtener evaluaciones del usuario (como evaluado)
  const evaluaciones = await Evaluacion.findAll({
    where: { evaluadoId: usuarioId },
    include: [
      {
        model: Usuario,
        as: 'evaluador',
        attributes: ['id', 'nombre', 'apellido', 'email']
      },
      {
        model: Formulario,
        attributes: ['id', 'nombre']
      },
      {
        model: Respuesta,
        include: [
          {
            model: Pregunta,
            attributes: ['id', 'enunciado', 'tipo']
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      usuario,
      evaluaciones
    }
  });
});

// Obtener reporte por trimestre
exports.obtenerReportePorTrimestre = catchAsync(async (req, res, next) => {
  const { trimestre, anio } = req.params;
  
  // Validar que el trimestre sea válido
  const trimestresValidos = ['Q1', 'Q2', 'Q3', 'Q4'];
  if (!trimestresValidos.includes(trimestre)) {
    return next(new AppError('Trimestre no válido. Debe ser Q1, Q2, Q3 o Q4', 400));
  }
  
  // Validar que el año sea un número
  const anioNum = parseInt(anio, 10);
  if (isNaN(anioNum)) {
    return next(new AppError('El año debe ser un número válido', 400));
  }
  
  // Obtener el rango de fechas del trimestre
  const { inicio, fin } = PeriodosEvaluacion.getRangoTrimestre(trimestre, anioNum);
  
  // Obtener evaluaciones del trimestre
  const evaluaciones = await Evaluacion.findAll({
    where: {
      createdAt: {
        [Op.gte]: inicio,
        [Op.lte]: fin
      }
    },
    include: [
      {
        model: Usuario,
        as: 'evaluado',
        attributes: ['id', 'nombre', 'apellido', 'email']
      },
      {
        model: Usuario,
        as: 'evaluador',
        attributes: ['id', 'nombre', 'apellido', 'email']
      },
      {
        model: Formulario,
        attributes: ['id', 'nombre']
      },
      {
        model: Departamento,
        attributes: ['id', 'nombre']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  // Agrupar por departamento para el reporte
  const reportePorDepartamento = {};
  evaluaciones.forEach(evaluacion => {
    const deptoId = evaluacion.departamento.id;
    if (!reportePorDepartamento[deptoId]) {
      reportePorDepartamento[deptoId] = {
        departamento: evaluacion.departamento,
        totalEvaluaciones: 0,
        evaluaciones: []
      };
    }
    reportePorDepartamento[deptoId].totalEvaluaciones++;
    reportePorDepartamento[deptoId].evaluaciones.push(evaluacion);
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      trimestre,
      anio: anioNum,
      totalEvaluaciones: evaluaciones.length,
      porDepartamento: Object.values(reportePorDepartamento)
    }
  });
});

/**
 * @desc    Crear una o varias evaluaciones para un departamento con múltiples cargos y períodos
 * @route   POST /api/evaluaciones
 * @access  Privado/Admin
 * @body    {number} departamentoId - ID del departamento
 * @body    {string|string[]} cargo - Nombre del cargo o array de cargos a evaluar
 * @body    {string|string[]} periodo - Período o array de períodos de evaluación (Q1, Q2, Q3, Q4)
 * @body    {string} [fechaLimite] - Fecha límite opcional para la evaluación
 */
exports.crearEvaluacion = catchAsync(async (req, res, next) => {
  const { departamentoId, cargoIds, periodo, fechaLimite } = req.body;
  const entradasDeCargo = cargoIds ?? req.body.cargos ?? cargo;
  const anioActual = new Date().getFullYear();
  const transaction = await sequelize.transaction();

  const normalizarArray = (valor) => {
    if (valor === undefined || valor === null) return [];
    return Array.isArray(valor) ? valor : [valor];
  };

  try {
    // Validar que el usuario sea administrador
    if (req.user.rol.nombre !== 'administrador') {
      await transaction.rollback();
      return next(new AppError('Solo los administradores pueden crear evaluaciones', 403));
    }

    const cargosNormalizados = normalizarArray(entradasDeCargo)
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));

    const periodosNormalizados = normalizarArray(periodo);
    const periodosSeleccionados = (periodosNormalizados.length > 0 ? periodosNormalizados : PERIODOS_VALIDOS)
      .map((p) => (typeof p === 'string' ? p.toUpperCase() : p));

    // Validar campos obligatorios
    if (!departamentoId || cargosNormalizados.length === 0) {
      await transaction.rollback();
      return next(new AppError('Faltan campos obligatorios: departamentoId y al menos un cargoId', 400));
    }

    // Validar formato de los periodos
    const periodosInvalidos = periodosSeleccionados.filter(p => !PERIODOS_VALIDOS.includes(p));
    if (periodosInvalidos.length > 0) {
      await transaction.rollback();
      return next(new AppError(`Períodos inválidos: ${periodosInvalidos.join(', ')}. Deben ser: Q1, Q2, Q3 o Q4`, 400));
    }

    // Verificar que el departamento existe
    const departamento = await Departamento.findByPk(departamentoId, { transaction });
    if (!departamento) {
      await transaction.rollback();
      return next(new AppError('No se encontró el departamento especificado', 404));
    }

    // Obtener un formulario activo existente
    const formularioExistente = await Formulario.findOne({
      where: { estado: 'activo' },
      order: [['fecha_creacion', 'DESC']], // Tomar el más reciente
      transaction
    });

    if (!formularioExistente) {
      await transaction.rollback();
      return next(new AppError('No se encontró ningún formulario activo. Por favor, crea un formulario primero.', 404));
    }

    // Obtener una pregunta del formulario
    const preguntaExistente = await Pregunta.findOne({
      where: { 
        formulario_id: formularioExistente.id,
        activa: true 
      },
      transaction
    });

    if (!preguntaExistente) {
      await transaction.rollback();
      return next(new AppError('El formulario seleccionado no tiene preguntas activas.', 400));
    }

    // Verificar que los cargos existan y pertenezcan al departamento
    const cargosExistentes = await Cargo.findAll({
      where: {
        id: {
          [Op.in]: cargosNormalizados
        },
        departamento_id: departamentoId,
      },
      transaction
    });

    if (cargosExistentes.length !== cargosNormalizados.length) {
      await transaction.rollback();
      const encontrados = new Set(cargosExistentes.map(c => c.id));
      const faltantes = cargosNormalizados.filter(id => !encontrados.has(id));
      return next(new AppError(`Uno o más cargos no existen o no pertenecen al departamento: ${faltantes.join(', ')}`, 400));
    }

    let fechaLimiteDate = null;
    if (fechaLimite) {
      const parsedFechaLimite = new Date(fechaLimite);
      if (Number.isNaN(parsedFechaLimite.getTime())) {
        await transaction.rollback();
        return next(new AppError('La fecha límite proporcionada no es válida', 400));
      }
      fechaLimiteDate = parsedFechaLimite;
    }

    // Crear las evaluaciones
    const evaluacionesCreadas = [];
    const errores = [];

    for (const cargoActual of cargosExistentes) {
      for (const p of periodosSeleccionados) {
        try {
          // Verificar si ya existe una evaluación plantilla para estos parámetros
          const evaluacionExistente = await Evaluacion.findOne({
            where: {
              departamento_id: departamentoId,
              cargo_id: cargoActual.id,
              periodo: p,
              anio: anioActual,
              evaluado_id: null  // Solo buscar plantillas sin asignar
            },
            transaction
          });

          if (evaluacionExistente) {
            errores.push(`Ya existe una evaluación para el cargo ${cargoActual.nombre} en ${p} ${anioActual}`);
            continue;
          }

          // Crear la evaluación
          const evaluacion = await Evaluacion.create({
            departamento_id: departamentoId,
            cargo_id: cargoActual.id,
            periodo: p,
            anio: anioActual,
            periodicidad: 'trimestral', // 🔥 Por defecto trimestral
            estado: 'pendiente',
            fecha_inicio: new Date(),
            fecha_fin: fechaLimiteDate,
            evaluador_id: null,
            evaluado_id: null
          }, { transaction });

          evaluacionesCreadas.push(evaluacion);
        } catch (error) {
          errores.push(`Error al crear evaluación para ${cargoActual.nombre} en ${p} ${anioActual}: ${error.message}`);
        }
      }
    }

    // Si no se pudo crear ninguna evaluación, devolver error
    if (evaluacionesCreadas.length === 0) {
      await transaction.rollback();
      return next(new AppError('No se pudo crear ninguna evaluación. Errores: ' + errores.join('; '), 400));
    }

    // Si todo salió bien, hacer commit de la transacción
    await transaction.commit();

    // Enviar notificaciones de correo para las evaluaciones creadas
    try {
      for (const evaluacion of evaluacionesCreadas) {
        await notificationService.notificarNuevaEvaluacion(evaluacion.id);
      }
    } catch (notificationError) {
      // No fallamos la petición si las notificaciones fallan
    }

    // Obtener las evaluaciones creadas con sus relaciones
    const evaluacionesConRelaciones = await Evaluacion.findAll({
      where: {
        id: evaluacionesCreadas.map(e => e.id)
      },
      include: [
        {
          model: Cargo,
          as: 'cargo',
          attributes: ['id', 'nombre', 'descripcion']
        },
        {
          model: Departamento,
          as: 'departamento',
          attributes: ['id', 'nombre']
        }
      ]
    });

    // Formatear la respuesta
    const response = {
      status: 'success',
      results: evaluacionesConRelaciones.length,
      data: {
        evaluaciones: evaluacionesConRelaciones.map(e => ({
          id: e.id,
          departamento: e.departamento.nombre,
          cargo: e.preguntaCargo?.cargo || e.cargo,
          periodo: e.periodo,
          anio: e.anio,
          estado: e.estado,
          fecha_inicio: e.fecha_inicio,
          fecha_fin: e.fecha_fin
        }))
      }
    };

    // Si hay errores, agregarlos a la respuesta
    if (errores.length > 0) {
      response.mensaje = 'Algunas evaluaciones no pudieron ser creadas';
      response.errores = errores;
    }

    res.status(201).json(response);
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

/**
 * @desc    Obtener todas las evaluaciones
 * @route   GET /api/evaluaciones
 * @access  Privado/Admin
 * @query   {number} [departamentoId] - Filtrar por ID de departamento
 * @query   {string} [periodo] - Filtrar por período (Q1, Q2, Q3, Q4)
 * @query   {number} [anio] - Filtrar por año
 */
exports.obtenerEvaluaciones = catchAsync(async (req, res, next) => {
  const { departamentoId, periodo, anio } = req.query;
  
  const where = {};
  if (departamentoId) where.departamento_id = departamentoId;
  if (periodo) where.periodo = periodo;
  if (anio) where.anio = anio;

  const evaluaciones = await Evaluacion.findAll({
    where,
    include: [
      {
        model: Departamento,
        as: 'departamento',
        attributes: ['id', 'nombre']
      }
    ],
    order: [['anio', 'DESC'], ['periodo', 'DESC']]
  });

  res.status(200).json({
    status: 'success',
    results: evaluaciones.length,
    data: {
      evaluaciones: evaluaciones.map(ev => ({
        id: ev.id,
        departamento: ev.departamento?.nombre || 'Desconocido',
        cargo: ev.cargo,
        periodo: ev.periodo,
        anio: ev.anio,
        estado: ev.estado,
        fecha_inicio: ev.fecha_inicio,
        fecha_fin: ev.fecha_fin
      }))
    }
  });
});

// Obtener formulario activo para el período actual
exports.obtenerFormularioActivo = catchAsync(async (req, res, next) => {
  const formulario = await Formulario.findOne({
    where: {
      tipo: 'evaluacion',
      estado: 'activo',
      [Op.and]: [
        { fecha_inicio: { [Op.lte]: new Date() } },
        { 
          [Op.or]: [
            { fecha_fin: null },
            { fecha_fin: { [Op.gte]: new Date() } }
          ]
        }
      ]
    },
    include: [
      {
        model: Pregunta,
        as: 'preguntas',
        include: [
          {
            model: Cargo,
            as: 'cargo',
            attributes: ['id', 'nombre']
          }
        ]
      }
    ]
  });

  if (!formulario) {
    return next(new AppError('No hay un formulario activo en este momento', 404));
  }

  // Formatear la respuesta
  const formData = {
    id: formulario.id,
    nombre: formulario.nombre,
    descripcion: formulario.descripcion,
    fecha_inicio: formulario.fecha_inicio,
    fecha_fin: formulario.fecha_fin,
    preguntas: formulario.preguntas.map(pregunta => ({
      id: pregunta.id,
      texto: pregunta.texto,
      tipo: pregunta.tipo,
      opciones: pregunta.opciones,
      cargos: pregunta.cargo.map(c => c.nombre)
    }))
  };

  res.status(200).json({
    status: 'success',
    data: {
      formulario: formData
    }
  });
});

// Obtener evaluadores de un departamento
exports.obtenerEvaluadores = catchAsync(async (req, res, next) => {
  const { departamentoId } = req.params;

  const evaluadores = await Usuario.findAll({
    where: { 
      departamento_id: departamentoId,
      estado: 'activo',
      '$rolUsuario.nombre$': 'evaluador'
    },
    include: [
      { 
        model: Rol,
        as: 'rolUsuario',
        attributes: ['id', 'nombre'],
        required: true
      }
    ],
    attributes: ['id', 'nombres', 'apellidos', 'email']
  });

  if (evaluadores.length === 0) {
    return next(new AppError('No hay evaluadores asignados a este departamento', 400));
  }

  // Obtener los empleados a evaluar (excluyendo a los evaluadores)
  const empleados = await Usuario.findAll({
    where: { 
      departamento_id: departamentoId,
      cargo: cargo,
      estado: 'activo',
      '$rolUsuario.nombre$': 'empleado'
    },
    include: [
      { 
        model: Rol, 
        as: 'rolUsuario',
        required: true
      }
    ]
  });

  if (empleados.length === 0) {
    return next(new AppError('No hay empleados con el cargo especificado en este departamento', 400));
  }

  const evaluacionesCreadas = [];
  const anioNum = parseInt(anio);
  
  // Iniciar transacción
  const transaction = await sequelize.transaction();

  try {
    // Asignar evaluaciones a los jefes de área
    for (const empleado of empleados) {
      // Asignar al siguiente evaluador disponible (round-robin)
      const evaluador = evaluadores[empleados.indexOf(empleado) % evaluadores.length];
      
      // Verificar si ya existe una evaluación para este empleado en el periodo
      const evaluacionExistente = await Evaluacion.findOne({
        where: {
          evaluado_id: empleado.id,
          periodo,
          anio: anioNum
        },
        transaction
      });

      if (!evaluacionExistente) {
        // Calcular periodicidad para este empleado
        const periodicidadCalculada = calcularPeriodicidadPorFechaIngreso(empleado.fecha_ingreso_empresa);
        
        // Crear la evaluación
        const evaluacionData = {
          formulario_id: formulario.id,
          evaluador_id: evaluador.id,
          evaluado_id: empleado.id,
          departamento_id: departamentoId,
          cargo,
          periodo,
          anio: anioNum,
          periodicidad: periodicidadCalculada, // 🔥 Añadido campo periodicidad
          estado: 'pendiente',
          creadoPor: usuarioId,
          // fecha_inicio se establece automáticamente a la fecha actual (ver modelo)
          // fecha_fin es opcional
          fechaLimite: fechaLimite ? new Date(fechaLimite) : null
        };

        const evaluacion = await Evaluacion.create(evaluacionData, { transaction });
        evaluacionesCreadas.push(evaluacion);
      }
    }

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      data: {
        evaluacionesCreadas,
        total: evaluacionesCreadas.length
      }
    });

  } catch (error) {
    await transaction.rollback();
    throw error; 
  }
});

/**
 * @desc    Obtener datos para botones (ID + estado de cada evaluación del evaluador) del trimestre actual
 * @route   GET /api/evaluaciones/botones
 * @access  Privado/Evaluador
 */
exports.obtenerDatosBotones = catchAsync(async (req, res, next) => {
  const usuarioId = req.user.id;

  try {
    // Obtener trimestre y año actual
    const hoy = new Date();
    const trimestreActual = `Q${Math.floor((hoy.getMonth() + 3) / 3)}`;
    const anioActual = hoy.getFullYear();

    // Obtener solo los campos necesarios: evaluado_id, estado, id, filtrando por trimestre actual
    const datosBotones = await Evaluacion.findAll({
      where: { 
        evaluadorId: usuarioId,
        periodo: trimestreActual,
        anio: anioActual
      },
      attributes: ['id', 'evaluadoId', 'estado'],  // Solo estos campos
      raw: true  // Solo datos planos, sin includes
    });

    // Convertir a objeto para fácil acceso: { empleadoId: {id, estado} }
    const datosPorEmpleado = {};
    datosBotones.forEach(ev => {
      datosPorEmpleado[ev.evaluadoId] = {
        id: ev.id,
        estado: ev.estado
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        datos: datosPorEmpleado
      }
    });
  } catch (error) {
    console.error('Error al obtener datos para botones:', error);
    res.status(200).json({
      status: 'success',
      data: {
        datos: {}
      }
    });
  }
});

/**
 * @desc    Obtener estado de evaluación por empleado (solo para estilos de botones)
 * @route   GET /api/evaluaciones/estados
 * @access  Privado/Evaluador
 */
exports.obtenerEstadosEvaluaciones = catchAsync(async (req, res, next) => {
  const usuarioId = req.user.id;

  try {
    // Obtener solo los campos necesarios: evaluadoId y estado
    const estados = await Evaluacion.findAll({
      where: { 
        evaluadorId: usuarioId
      },
      attributes: ['evaluadoId', 'estado'],  // Solo estos campos
      raw: true  // Solo datos planos, sin includes
    });

    // Convertir a objeto para fácil acceso { empleadoId: estado }
    const estadosPorEmpleado = {};
    estados.forEach(ev => {
      estadosPorEmpleado[ev.evaluadoId] = ev.estado;
    });


    res.status(200).json({
      status: 'success',
      data: {
        estados: estadosPorEmpleado
      }
    });
  } catch (error) {
    console.error('Error al obtener estados de evaluaciones:', error);
    res.status(200).json({
      status: 'success',
      data: {
        estados: {}
      }
    });
  }
});

/**
 * @desc    Obtener evaluaciones asignadas al evaluador actual (hiper-optimizado)
 * @route   GET /api/evaluaciones/asignadas
 * @access  Privado/Evaluador
 */
/**
 * @desc    Actualizar estado de una evaluación
 * @route   PATCH /api/evaluaciones/:id/estado
 * @access  Privado/Evaluador
 */
exports.actualizarEstadoEvaluacion = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { estado, evaluador_id } = req.body;
  
  // Buscar la evaluación
  const evaluacion = await Evaluacion.findByPk(id);
  
  if (!evaluacion) {
    return next(new AppError('Evaluación no encontrada', 404));
  }
  
  // Actualizar solo los campos proporcionados
  const updateData = {};
  if (estado !== undefined) {
    updateData.estado = estado;
  }
  if (evaluador_id !== undefined) {
    updateData.evaluador_id = evaluador_id;
  }
  
  await evaluacion.update(updateData);
  
  res.status(200).json({
    status: 'success',
    message: 'Evaluación actualizada correctamente',
    data: {
      id: evaluacion.id,
      estado: evaluacion.estado,
      evaluador_id: evaluacion.evaluadorId
    }
  });
});

/**
 * @desc    Obtener SOLO evaluaciones con estado 'asignada' del departamento
 * @route   GET /api/evaluaciones/asignadas-activas
 * @access  Privado/Evaluador
 */
exports.obtenerEvaluacionesAsignadasActivas = catchAsync(async (req, res, next) => {
  const usuarioId = req.user.id;
  
  try {
    // PASO 1: Obtener información del evaluador (departamento)
    const evaluador = await Usuario.findByPk(usuarioId, {
      attributes: ['id', 'departamento_id'],
      include: [
        {
          model: Departamento,
          as: 'departamento',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    if (!evaluador || !evaluador.departamento_id) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: []
      });
    }
    
    // PASO 2: Obtener TODOS los empleados del departamento (excepto el evaluador)
    const empleadosDelDepartamento = await Usuario.findAll({
      where: {
        departamento_id: evaluador.departamento_id,
        id: { [Op.ne]: usuarioId },
        deleted_at: null
      },
      attributes: ['id', 'nombre', 'apellido', 'email', 'fecha_ingreso_empresa', 'cargo_id'],
      include: [
        {
          model: Cargo,
          as: 'cargo',
          attributes: ['id', 'nombre']
        },
        {
          model: Departamento,
          as: 'departamento',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    // PASO 3: Obtener TODAS las evaluaciones para estos empleados (trimestrales y anuales)
    const idsEmpleados = empleadosDelDepartamento.map(emp => emp.id);
    
    if (idsEmpleados.length === 0) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: []
      });
    }
    
    const evaluacionesAsignadas = await Evaluacion.findAll({
      where: {
        evaluado_id: { [Op.in]: idsEmpleados },
        // 🔥 CORRECCIÓN: Mostrar SOLO evaluaciones con estado 'asignada'
        // Este endpoint es específico para evaluaciones asignadas
        estado: 'asignada'
      },
      attributes: ['id', 'evaluador_id', 'evaluado_id', 'estado', 'updated_at', 'periodo', 'anio', 'periodicidad'],
      include: [
        {
          model: Usuario,
          as: 'evaluado',
          attributes: ['id', 'nombre', 'apellido', 'email', 'fecha_ingreso_empresa'],
          include: [
            {
              model: Cargo,
              as: 'cargo',
              attributes: ['id', 'nombre']
            },
            {
              model: Departamento,
              as: 'departamento',
              attributes: ['id', 'nombre']
            }
          ]
        }
      ],
      order: [['updated_at', 'DESC']]
    });
        
    // PASO 4: Filtrar evaluaciones dentro de ventana de 5 días hábiles
    const evaluacionesActivas = [];
    
    for (const evaluacion of evaluacionesAsignadas) {
      // 🔥 CORRECCIÓN: Usar fecha de asignación simple
      // La evaluación se asigna cuando cambia a estado 'asignada'
      let fechaAsignacion;
      
      if (evaluacion.estado === 'asignada') {
        // Si está asignada, usar la fecha cuando se asignó (updated_at del cambio de estado)
        fechaAsignacion = new Date(evaluacion.updated_at);
        fechaAsignacion.setHours(0, 0, 0, 0);
      } else {
        // Si no está asignada, no aplica esta lógica
        continue;
      }
      
      // Calcular fecha de vencimiento (5 días hábiles desde la asignación)
      let diasHabilesTranscurridos = 0;
      let fechaVencimiento = new Date(fechaAsignacion);
      
      // 🔥 CORRECCIÓN: Incluir el día de asignación como día 1
      diasHabilesTranscurridos = 1;
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 4);
      // y contar 5 días hábiles totales incluyendo el primer día
      while (diasHabilesTranscurridos < 5) {
        const diaSemana = fechaVencimiento.getDay();
        
        // Contar solo días hábiles (lunes a viernes)
        if (diaSemana !== 0 && diaSemana !== 6) {
          diasHabilesTranscurridos++;
        }
        
        // Avanzar al siguiente día solo si no hemos completado los 5 días
        if (diasHabilesTranscurridos < 5) {
          fechaVencimiento.setDate(fechaVencimiento.getDate() + 1);
        }
      }
      
      // Establecer hora final del día
      fechaVencimiento.setHours(23, 59, 59, 999);
      
      // Verificar si aún está dentro de la ventana
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (hoy <= fechaVencimiento) {
        const diasRestantes = Math.max(0, Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24)));
        
        return res.status(200).json({
          ...evaluacion.toJSON(),
          diasRestantes,
          fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
          ventanaActiva: true,
          fechaAsignacion: fechaAsignacion.toISOString().split('T')[0]
        });
      } else {
        return res.status(200).json({
          ...evaluacion.toJSON(),
          ventanaActiva: false,
          mensaje: 'La evaluación está fuera del período de activación'
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      results: evaluacionesActivas.length,
      data: evaluacionesActivas
    });
    
  } catch (error) {
    console.error('Error en obtenerEvaluacionesAsignadasActivas:', error);
    next(new AppError('Error al obtener evaluaciones asignadas activas', 500));
  }
});

/**
 * @desc    Obtener evaluaciones asignadas al evaluador con lógica CORE
 * @route   GET /api/evaluaciones/asignadas
 * @access  Privado/Evaluador
 */
exports.obtenerEvaluacionesAsignadas = catchAsync(async (req, res, next) => {
  const { trimestre, anio } = req.query;
  const usuarioId = req.user.id;

  try {
    // Obtener evaluador con su departamento
    const evaluador = await Usuario.findByPk(usuarioId, {
      attributes: ['id', 'departamento_id'],
      include: [
        {
          model: Departamento,
          as: 'departamento',
          attributes: ['id', 'nombre']
        }
      ]
    });

    if (!evaluador || !evaluador.departamento_id) {
      return next(new AppError('No se encontró el departamento del evaluador', 404));
    }

    // Obtener empleados del departamento (excluyendo al evaluador)
    const empleados = await Usuario.findAll({
      where: {
        departamento_id: evaluador.departamento_id,
        id: { [Op.ne]: usuarioId },
        estado: 'activo'
      },
      attributes: ['id', 'nombre', 'apellido', 'email', 'fecha_ingreso_empresa'],
      include: [
        {
          model: Cargo,
          as: 'cargo',
          attributes: ['id', 'nombre']
        }
      ]
    });

    // Función para crear fecha local sin problemas de zona horaria
    const crearFechaLocal = (fechaString) => {
      if (typeof fechaString === 'string' && fechaString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = fechaString.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(fechaString);
    };

    // Función para calcular fecha límite (fecha de evaluación + 5 días)
    // 🔥 CORRECCIÓN: Simple y funcional
    const calcularFechaLimite = (fechaEvaluacion) => {
      // Crear fecha de evaluación simple
      const fechaEval = new Date(fechaEvaluacion);
      
      // 5 días DESPUÉS (contando desde el día siguiente a la evaluación)
      const fechaLimite = new Date(fechaEval);
      fechaLimite.setDate(fechaEval.getDate() + 5);
      fechaLimite.setHours(23, 59, 59, 999);
      
      // Formatear sin problemas de zona horaria
      return fechaLimite.getFullYear() + '-' + 
             String(fechaLimite.getMonth() + 1).padStart(2, '0') + '-' + 
             String(fechaLimite.getDate()).padStart(2, '0');
    };

    // Función core para calcular fechas de evaluación
    const calcularFechasEvaluacionCore = (fechaIngresoStr, fechaActual = new Date()) => {
      const fechaIng = crearFechaLocal(fechaIngresoStr);
      const hoy = crearFechaLocal(fechaActual.toISOString().split('T')[0]);
      
      // Calcular primera anual (12 meses después)
      const primeraAnual = crearFechaLocal(fechaIngresoStr);
      primeraAnual.setFullYear(primeraAnual.getFullYear() + 1);
      
      // Determinar trimestre actual
      const trimestreActual = `Q${Math.floor((hoy.getMonth() + 3) / 3)}`;
      const anioActual = hoy.getFullYear();
      
      // Determinar si está en primer año
      const enPrimerAno = hoy < primeraAnual;
      
      // Función para verificar período de activación (15 días antes + 5 días después)
      // 🔥 CORRECCIÓN: Simple y funcional sin problemas de zona horaria
      const estaEnPeriodoActivacion = (fechaEvaluacion) => {
        const fechaEval = new Date(fechaEvaluacion);
        const dias15Antes = new Date(fechaEval);
        dias15Antes.setDate(dias15Antes.getDate() - 15);
        dias15Antes.setHours(0, 0, 0, 0);
        
        const dias5Despues = new Date(fechaEval);
        dias5Despues.setDate(dias5Despues.getDate() + 5);
        dias5Despues.setHours(23, 59, 59, 999);
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        return hoy >= dias15Antes && hoy <= dias5Despues;
      };
      
      let evaluaciones = [];
      
      if (enPrimerAno) {
        // Evaluaciones trimestrales durante el primer año
        let fechaTrimestral = new Date(fechaIng);
        while (fechaTrimestral < primeraAnual) {
          fechaTrimestral.setMonth(fechaTrimestral.getMonth() + 3);
          if (fechaTrimestral <= primeraAnual) {
            const trimestreEval = `Q${Math.floor((fechaTrimestral.getMonth() + 3) / 3)}`;
            const anioEval = fechaTrimestral.getFullYear();
            
            evaluaciones.push({
              fecha: new Date(fechaTrimestral),
              trimestre: trimestreEval,
              anio: anioEval,
              tipo: 'trimestral',
              activa: estaEnPeriodoActivacion(fechaTrimestral),
              esHoy: trimestreEval === trimestreActual && anioEval === anioActual
            });
          }
        }
        
        // Agregar primera anual
        if (hoy >= primeraAnual || estaEnPeriodoActivacion(primeraAnual)) {
          const trimestreAnual = `Q${Math.floor((primeraAnual.getMonth() + 3) / 3)}`;
          const anioAnual = primeraAnual.getFullYear();
          
          evaluaciones.push({
            fecha: new Date(primeraAnual),
            trimestre: trimestreAnual,
            anio: anioAnual,
            tipo: 'primera_anual',
            activa: estaEnPeriodoActivacion(primeraAnual),
            esHoy: trimestreAnual === trimestreActual && anioAnual === anioActual
          });
        }
      } else {
        // Después del primer año: verificar si la primera anual necesita procesarse
        // La primera anual debe procesarse si está en ventana o si nunca se procesó
        
        // Verificar si la primera anual está en ventana de 20 días
        if (estaEnPeriodoActivacion(primeraAnual)) {
          const trimestreAnual = `Q${Math.floor((primeraAnual.getMonth() + 3) / 3)}`;
          const anioAnual = primeraAnual.getFullYear();
          
          evaluaciones.push({
            fecha: new Date(primeraAnual),
            trimestre: trimestreAnual,
            anio: anioAnual,
            tipo: 'primera_anual',
            activa: true,
            esHoy: trimestreAnual === trimestreActual && anioAnual === anioActual
          });
        }
        
        // Después del primer año: SOLO evaluaciones anuales en TODO DICIEMBRE (Q4) del AÑO SIGUIENTE
        // La normalización ocurre en el año siguiente a la primera anual
        if (trimestreActual === 'Q4') {
          // Verificar si ya pasó la primera anual
          const anioSiguienteNormalizacion = primeraAnual.getFullYear() + 1;
          
          // Solo crear evaluación anual si estamos en el año siguiente a la primera anual
          if (anioActual >= anioSiguienteNormalizacion) {
            // Evaluación anual en diciembre (cualquier día del mes)
            const evaluacionAnualActual = new Date(anioActual, 11, 15); // 15 de diciembre por defecto
            
            evaluaciones.push({
              fecha: evaluacionAnualActual,
              trimestre: 'Q4',
              anio: anioActual,
              tipo: 'anual',
              activa: estaEnPeriodoActivacion(evaluacionAnualActual),
              esHoy: true,
              esAnualQ4: true
            });
          }
        }
      }
      
      return {
        fechaIngreso: fechaIng.toISOString().split('T')[0],
        primeraAnual: primeraAnual.toISOString().split('T')[0],
        enPrimerAno,
        trimestreActual,
        evaluaciones,
        hayEvaluacionActiva: evaluaciones.some(ev => ev.activa)
      };
    };

    const todasLasEvaluaciones = [];
    const hoy = new Date();

    // Procesar cada empleado
    for (const empleado of empleados) {
      const fechasEvaluacion = calcularFechasEvaluacionCore(
        empleado.fecha_ingreso_empresa, 
        hoy
      );

      // Procesar cada evaluación calculada
      for (const evaluacionCalculada of fechasEvaluacion.evaluaciones) {
        // Verificar si ya existe en la base de datos
        const evaluacionExistente = await Evaluacion.findOne({
          where: {
            evaluadorId: usuarioId,
            evaluadoId: empleado.id,
            periodo: evaluacionCalculada.trimestre,
            anio: evaluacionCalculada.anio
          },
          attributes: ['id', 'estado', 'fecha_inicio']
        });

        // 🔥 DEBUG: Mostrar información para depuración
        if (evaluacionExistente && evaluacionExistente.estado === 'asignada') {
          // Evaluación asignada encontrada
        }

        // Determinar periodicidad basada en fecha de ingreso actual
        const periodicidadCalculada = calcularPeriodicidadPorFechaIngreso(empleado.fecha_ingreso_empresa, hoy);

        // Construir objeto para frontend
        const evaluacionParaFrontend = {
          id: evaluacionExistente?.id || null,
          evaluado_id: empleado.id,
          estado: evaluacionExistente?.estado || 'pendiente',
          periodo: evaluacionCalculada.trimestre,
          anio: evaluacionCalculada.anio,
          fecha_inicio: evaluacionExistente?.fecha_inicio || null,
          
          evaluado: empleado,
          
          tipoEvaluacion: evaluacionCalculada.tipo,
          periodicidad: periodicidadCalculada, // 🔥 Nuevo campo basado en cálculo real
          periodicidadRequerida: periodicidadCalculada, // Mantiene compatibilidad
          fechaEsperada: evaluacionCalculada.fecha.toISOString().split('T')[0],
          fechaLimite: calcularFechaLimite(evaluacionCalculada.fecha), // 🆕 Fecha límite (+5 días)
          activa: evaluacionCalculada.activa,
          esHoy: evaluacionCalculada.esHoy,
          esFutura: false,
          esAnualQ4: evaluacionCalculada.esAnualQ4 || false,
          yaExiste: evaluacionExistente !== null
        };

        todasLasEvaluaciones.push(evaluacionParaFrontend);
      }
    }

    // FILTRADO SEGÚN REGLAS ESTRICTAS
    const evaluacionesFiltradas = todasLasEvaluaciones.filter(ev => {
      // 🔥 BLOQUEO TOTAL: NINGUNA evaluación 'asignada' debe aparecer en dashboard principal
      if (ev.estado === 'asignada') {
        return false;
      }
      
      // 🔥 DOBLE VERIFICACIÓN: Si existe y está asignada, bloquear
      if (ev.yaExiste && ev.estado === 'asignada') {
        return false;
      }
      
      // Si ya existe, mostrar SOLO si está activa y no es asignada
      if (ev.yaExiste && ev.estado !== 'asignada') {
        return ev.activa; // Solo mostrar si está en ventana de tiempo
      }
      
      // Si no está activa, no mostrar
      if (!ev.activa) return false;
      
      // Si es anual y no es Q4, no mostrar (PERMITIR PRIMERA ANUAL)
      if (ev.tipoEvaluacion === 'anual' && !ev.esAnualQ4) {
        return false;
      }
      
      // Permitir trimestrales y primera anual si están activas
      if (ev.tipoEvaluacion === 'trimestral') return true;
      if (ev.tipoEvaluacion === 'primera_anual') return true;
      if (ev.tipoEvaluacion === 'anual' && ev.esAnualQ4) return true;
      
      return false;
    });

    // Ordenamiento prioritario
    evaluacionesFiltradas.sort((a, b) => {
      // 1) En progreso primero
      if (a.yaExiste && a.estado === 'en_progreso' && (!b.yaExiste || b.estado !== 'en_progreso')) return -1;
      if (b.yaExiste && b.estado === 'en_progreso' && (!a.yaExiste || a.estado !== 'en_progreso')) return 1;
      
      // 2) Existentes vs nuevas
      if (a.yaExiste && !b.yaExiste) return -1;
      if (b.yaExiste && !a.yaExiste) return 1;
      
      // 3) Por fecha esperada
      return new Date(a.fechaEsperada) - new Date(b.fechaEsperada);
    });

    // 🔥 RESUMEN FINAL: Mostrar estadísticas de filtrado
    const totalAntes = todasLasEvaluaciones.length;
    const totalDespues = evaluacionesFiltradas.length;
    const bloqueadas = totalAntes - totalDespues;
    
        
    
    res.status(200).json({
      status: 'success',
      results: evaluacionesFiltradas.length,
      data: { 
        evaluaciones: evaluacionesFiltradas,
        mensaje: evaluacionesFiltradas.length > 0 
          ? 'Mostrando evaluaciones disponibles (excluyendo asignadas activas que se muestran en apartado especial)'
          : 'No hay evaluaciones disponibles en este momento',
        debugInfo: {
          totalCalculadas: todasLasEvaluaciones.length,
          fechaActual: hoy.toISOString().split('T')[0],
          trimestreActual: `Q${Math.floor((hoy.getMonth() + 3) / 3)}`,
          anioActual: hoy.getFullYear()
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener evaluaciones asignadas:', error);
    next(error);
  }
});

/**
 * @desc    Obtener historial de evaluaciones completadas del departamento (hiper-optimizado)
 * @route   GET /api/evaluaciones/historial
 * @access  Privado/Evaluador/Administrador
 */
exports.obtenerHistorialEvaluaciones = catchAsync(async (req, res, next) => {
  const { trimestre, anio } = req.query;
  const usuarioId = req.user.id;

  try {
    // Obtener departamento_id directamente del usuario actual (sin include)
    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: ['id', 'departamento_id']
    });

    if (!usuario || !usuario.departamento_id) {
      return next(new AppError('No se encontró el departamento del evaluador', 404));
    }

    // 🔥 CORRECCIÓN: Filtrado estricto por año y trimestre
    const where = { 
      departamento_id: usuario.departamento_id,
      estado: 'completada'
    };
    
    if (trimestre) {
      where.periodo = trimestre;
    }
    
    if (anio) {
      where.anio = parseInt(anio);
    }

    // Consulta optimizada con campos necesarios para el frontend
    const evaluaciones = await Evaluacion.findAll({
      where,
      attributes: ['id', 'evaluado_id', 'evaluador_id', 'estado', 'periodo', 'anio', 'periodicidad', 'fecha_fin', 'fecha_inicio', 'puntuacion_total', 'valoracion_anual', 'valoracion_trimestral'],
      include: [
        { 
          model: Usuario, 
          as: 'evaluado',
          attributes: ['id', 'nombre', 'apellido', 'email'],
          include: [
            {
              model: Cargo,
              as: 'cargo',
              attributes: ['id', 'nombre']
            }
          ]
        }
      ],
      order: [
        ['anio', 'DESC'],
        ['periodo', 'DESC'],
        ['fecha_fin', 'DESC']
      ],
      limit: 50 // Limitar resultados para mayor velocidad
    });

    // 🔥 DEBUG: Mostrar resultados encontrados
    res.status(200).json({
      status: 'success',
      results: evaluaciones.length,
      data: evaluaciones
    });
  } catch (error) {
    console.error('Error al obtener historial de evaluaciones:', error);
    res.status(200).json({
      status: 'success',
      results: 0,
      data: []
    });
  }
});

// Actualizar una evaluación
exports.actualizarEvaluacion = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { estado, fechaLimite, comentarios } = req.body;

  const evaluacion = await Evaluacion.findByPk(id);
  
  if (!evaluacion) {
    return next(new AppError('No se encontró la evaluación especificada', 404));
  }

  // Actualizar solo los campos permitidos
  if (estado) evaluacion.estado = estado;
  if (fechaLimite) evaluacion.fechaLimite = fechaLimite;
  if (comentarios) evaluacion.comentarios = comentarios;

  await evaluacion.save();

  res.status(200).json({
    status: 'success',
    data: {
      evaluacion
    }
  });
});

// Eliminar una evaluación
exports.eliminarEvaluacion = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const evaluacion = await Evaluacion.findByPk(id);
  
  if (!evaluacion) {
    return next(new AppError('No se encontró la evaluación especificada', 404));
  }

  // Eliminar respuestas asociadas
  await Respuesta.destroy({ where: { evaluacion_id: id } });
  
  // Eliminar la evaluación
  await evaluacion.destroy();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Obtener empleados de un departamento para evaluación
exports.obtenerEmpleadosParaEvaluacion = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { evaluador_id } = req.query;
  
  // Verificar que el departamento existe
  const departamento = await Departamento.findByPk(id);
  if (!departamento) {
    return next(new AppError('No se encontró el departamento especificado', 404));
  }

  // Verificar que el evaluador existe y pertenece al departamento
  if (evaluador_id) {
    const evaluador = await Usuario.findOne({
      where: { 
        id: evaluador_id,
        departamento_id: id,
        '$rol.nombre$': { [Op.in]: ['evaluador', 'administrador'] }
      },
      include: [{ model: Rol, as: 'rol' }]
    });

    if (!evaluador) {
      return next(new AppError('El evaluador no existe o no tiene permisos para este departamento', 400));
    }
  }

  // Obtener empleados del departamento (excluyendo al evaluador si se especificó)
  const where = {
    departamento_id: id,
    estado: 'activo',
    '$rol.nombre$': 'empleado'
  };

  if (evaluador_id) {
    where.id = { [Op.ne]: evaluador_id };
  }

  const empleados = await Usuario.findAll({
    where,
    include: [
      { 
        model: Rol, 
        as: 'rol',
        attributes: []
      },
      {
        model: Departamento,
        as: 'departamento',
        attributes: ['id', 'nombre']
      }
    ],
    attributes: ['id', 'nombre', 'email', 'cargo', 'fecha_ingreso'],
    order: [['nombre', 'ASC']]
  });

  res.status(200).json({
    status: 'success',
    results: empleados.length,
    data: {
      empleados
    }
  });
});

// Función centralizada para calcular puntuación desde opciones
const calcularPuntuacionDesdeOpciones = (pregunta, respuestaSeleccionada) => {
  // Excluir preguntas de tipo título_sección y abiertas de puntuación
  if (!pregunta || pregunta.tipo === 'titulo_seccion' || pregunta.tipo === 'abierta') {
    return 0;
  }
  
  // LÓGICA TRIMESTRAL: Opciones 1-4 sin JSON
  if (pregunta.tipo === 'escala' && !pregunta.opciones) {
    // Para preguntas trimestrales de escala 1-4
    const valor = parseInt(respuestaSeleccionada);
    if (isNaN(valor) || valor < 1 || valor > 4) {
      console.log(`❌ Valor trimestral inválido: ${respuestaSeleccionada} → ${valor}`);
      return 0;
    }
    console.log(`✅ Puntuación trimestral: ${respuestaSeleccionada} → ${valor}`);
    return valor; // Puntuación directa: 1=1, 2=2, 3=3, 4=4
  }
  
  // LÓGICA ANUAL: Usar opciones JSON con puntuación
  if (!pregunta.opciones || !Array.isArray(pregunta.opciones)) {
    console.log(`❌ Pregunta anual sin opciones válidas: ${pregunta.tipo}`);
    return 0;
  }
  
  const opcionSeleccionada = pregunta.opciones.find(opcion => 
    opcion.valor === respuestaSeleccionada || 
    opcion.valor === respuestaSeleccionada.toString()
  );
  
  if (!opcionSeleccionada) {
    console.log(`❌ Opción no encontrada para respuesta: ${respuestaSeleccionada}`);
    return 0;
  }
  
  const puntuacion = parseFloat(opcionSeleccionada.puntuacion) || 0;
  console.log(`✅ Puntuación anual: ${respuestaSeleccionada} → ${puntuacion}`);
  
  return puntuacion;
};

// Función corregida para guardar respuestas
exports.guardarRespuestas = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { respuestas, finalizar = false } = req.body;
  const usuarioId = req.user.id;

  if (!respuestas || !Array.isArray(respuestas)) {
    return next(new AppError('Se requiere un arreglo de respuestas', 400));
  }

  // Verificar que la evaluación existe y el usuario tiene permiso para responderla
  const evaluacion = await Evaluacion.findOne({
    where: {
      id,
      [Op.or]: [
        { evaluadorId: usuarioId }, // El evaluador asignado
        { estado: 'asignada' } // O cualquier evaluación asignada (para que pueda tomarla)
      ],
      estado: { [Op.in]: ['pendiente', 'en_progreso', 'asignada'] }
    },
    include: [
      {
        model: Formulario,
        as: 'formulario',
        include: [
          {
            model: Pregunta,
            as: 'preguntas',
            where: { activa: true },
            required: true
          }
        ]
      }
    ]
  });

  if (!evaluacion) {
    return next(new AppError('No se encontró la evaluación o no tiene permiso para modificarla', 404));
  }

  // Si se va a finalizar, validar que todas las preguntas obligatorias estén respondidas
  if (finalizar) {
    const preguntasObligatorias = evaluacion.formulario.preguntas
      .filter(p => p.obligatoria && p.tipo !== 'titulo_seccion') // Excluir títulos de sección
      .map(p => p.id.toString());

    const preguntasRespondidas = new Set(
      respuestas
        .filter(r => r.pregunta_id || r.preguntaId)
        .map(r => (r.pregunta_id || r.preguntaId).toString())
    );

    const preguntasSinResponder = preguntasObligatorias.filter(id => !preguntasRespondidas.has(id));

    if (preguntasSinResponder.length > 0) {
      return next(new AppError(
        `Faltan responder ${preguntasSinResponder.length} preguntas obligatorias: ${preguntasSinResponder.join(', ')}`,
        400
      ));
    }
  }

  // Eliminar respuestas anteriores
  await Respuesta.destroy({ where: { evaluacion_id: id } });

  // Crear nuevas respuestas con puntuación calculada desde opciones
  const respuestasACrear = respuestas.map(respuesta => {
    // Validar que la respuesta tenga pregunta_id (aceptar ambos camelCase y snake_case)
    const preguntaId = respuesta.pregunta_id || respuesta.preguntaId;
    
    // FILTRAR RESPUESTAS VACÍAS O SIN PREGUNTA
    if (!preguntaId || respuesta.respuesta === null || respuesta.respuesta === undefined || 
        (typeof respuesta.respuesta === 'string' && respuesta.respuesta.trim() === '') ||
        (typeof respuesta.respuesta === 'number' && isNaN(respuesta.respuesta))) {
      console.log('❌ Respuesta inválida o vacía:', respuesta);
      return null;
    }
    
    // Encontrar la pregunta para obtener sus opciones
    const pregunta = evaluacion.formulario.preguntas.find(p => p.id === preguntaId);
    
    // Validar que la pregunta exista
    if (!pregunta) {
      console.log(`❌ Pregunta no encontrada: ${preguntaId}`);
      console.log('❌ Preguntas disponibles:', evaluacion.formulario.preguntas.map(p => p.id));
      return null; // Retornar null para que se filtre
    }
    
    // Calcular puntuación desde las opciones de la pregunta
    const puntuacionCalculada = calcularPuntuacionDesdeOpciones(pregunta, respuesta.respuesta);
    
    return {
      evaluacion_id: id,
      pregunta_id: preguntaId, // Usar el ID encontrado
      valor: respuesta.respuesta, // CAMPO REQUERIDO por la base de datos
      puntuacion: puntuacionCalculada,
      comentarios: respuesta.comentario // Usar campo correcto del modelo
    };
  }).filter(respuesta => respuesta !== null); // Filtrar respuestas nulas

  await Respuesta.bulkCreate(respuestasACrear);

  let puntuacionFinal = 0;
  let valoracionFinal = null;
  
  if (finalizar) {
    // Determinar si es formulario trimestral
    const esTrimestral = evaluacion.formulario?.periodicidad === 'trimestral';
    
    if (esTrimestral) {
      // CÁLCULO TRIMESTRAL - FÓRMULA EXCEL
      
      // 1. Sumar todos los puntos de respuestas válidas (solo preguntas escala 1-4)
      const respuestasValidas = respuestasACrear.filter(r => r.puntuacion > 0);
      const sumaPuntos = respuestasValidas.reduce((sum, r) => sum + r.puntuacion, 0);
      
      // 2. Aplicar fórmula del Excel: (suma / 100) * 96
      puntuacionFinal = (sumaPuntos / 100) * 96;
      
      // 3. Valoración trimestral según rangos del Excel
      if (puntuacionFinal >= 80 && puntuacionFinal <= 100) {
        valoracionFinal = 'DESTACADO';
      } else if (puntuacionFinal >= 60 && puntuacionFinal <= 79) {
        valoracionFinal = 'BUENO';
      } else if (puntuacionFinal >= 25 && puntuacionFinal <= 59) {
        valoracionFinal = 'BAJO';
      } else {
        valoracionFinal = 'BAJO'; // Por debajo de 25 también es BAJO
      }
      
    } else {
      // CÁLCULO ANUAL - CON PORCENTAJES Y OPCIONES
      
      // Obtener los porcentajes del formulario
      const porcentajes = evaluacion.formulario.porcentajesApartados || {
        competencias: 0.10,
        experiencia: 0.10,
        convivencia: 0.10,
        desempeno: 0.70
      };

      // Obtener todas las preguntas agrupadas por apartado
      const preguntasPorApartado = evaluacion.formulario.preguntas.reduce((acc, pregunta) => {
        const apartado = pregunta.apartado || 'competencias';
        if (!acc[apartado]) {
          acc[apartado] = [];
        }
        acc[apartado].push(pregunta);
        return acc;
      }, {});

      // Calcular puntuación por apartado
      for (const [apartado, preguntas] of Object.entries(preguntasPorApartado)) {
        if (porcentajes[apartado] !== undefined) {
          const respuestasApartado = respuestasACrear.filter(r => 
            preguntas.some(p => p.id === r.pregunta_id)
          );

          // Calcular promedio del apartado
          const sumaPuntuaciones = respuestasApartado.reduce((sum, r) => sum + (r.puntuacion || 0), 0);
          const promedioApartado = respuestasApartado.length > 0 
            ? sumaPuntuaciones / respuestasApartado.length 
            : 0;
          
          // Aplicar porcentaje del apartado
          const puntuacionApartado = promedioApartado * porcentajes[apartado];
          puntuacionFinal += puntuacionApartado;
        }
      }
      
      valoracionFinal = calcularValoracionFinal(puntuacionFinal);
    }
  }

  // Asignar valoraciones según el tipo
  let valoracion_anual = null;
  let valoracion_trimestral = null;
  
  if (finalizar && valoracionFinal) {
    const esTrimestral = evaluacion.formulario?.periodicidad === 'trimestral';
    
    if (esTrimestral) {
      // Para trimestrales, usar la valoración calculada con fórmula Excel
      valoracion_trimestral = valoracionFinal;
    } else {
      // Para anuales, usar la valoración calculada
      valoracion_anual = valoracionFinal;
    }
  }


  // Actualizar estado de la evaluación
  const nuevoEstado = finalizar ? 'completada' : 'en_progreso';
  const fecha_fin = finalizar ? new Date() : null;
  
  // Si es una evaluación asignada, actualizar el evaluador_id
  const updateData = {
    estado: nuevoEstado,
    ...(finalizar && { puntuacionTotal: puntuacionFinal }),
    ...(finalizar && valoracion_anual && { valoracion_anual: valoracion_anual }),
    ...(finalizar && valoracion_trimestral && { valoracion_trimestral: valoracion_trimestral }),
    ...(fecha_fin && { fechaFin: fecha_fin }),
    updatedAt: new Date()
  };
  
  // Si la evaluación estaba asignada, actualizar el evaluadorId
  if (evaluacion.estado === 'asignada') {
    updateData.evaluadorId = usuarioId;
  }
  
  await evaluacion.update(updateData);
  
  // Enviar notificaciones según el cambio de estado
  try {
    // Si cambió de pendiente a en_progreso, notificar progreso
    if (evaluacion.estado === 'pendiente' && nuevoEstado === 'en_progreso') {
      await notificationService.notificarProgresoEvaluacion(evaluacion.id);
    }
    
    // Si se finalizó la evaluación, notificar completado
    if (finalizar) {
      await notificationService.notificarEvaluacionCompletada(evaluacion.id);
    }
  } catch (notificationError) {
    console.error('❌ Error enviando notificación:', notificationError.message);
    // No fallamos la petición si las notificaciones fallan
  }

  res.status(200).json({
    status: 'success',
    message: finalizar ? 'Evaluación finalizada correctamente' : 'Respuestas guardadas correctamente',
    data: {
      evaluacion_id: id,
      respuestasGuardadas: respuestas.length,
      estado: nuevoEstado,
      finalizada: finalizar,
      ...(finalizar && {
        puntuacion_total: puntuacionFinal,
        valoracion: valoracionFinal
      })
    }
  });
});

// Obtener reporte de evaluaciones por departamento
exports.obtenerReportePorDepartamento = catchAsync(async (req, res, next) => {
  const { trimestre, anio } = req.query;
  
  const where = {};
  if (trimestre) where.trimestre = trimestre;
  if (anio) where.anio = anio;
  
  const departamentos = await Departamento.findAll({
    include: [
      {
        model: Usuario,
        as: 'empleados',
        attributes: ['id'],
        include: [
          {
            model: Evaluacion,
            as: 'evaluacionesRecibidas',
            where: {
              ...where,
              estado: 'completada'
            },
            required: false,
            include: [
              {
                model: Usuario,
                as: 'evaluador',
                attributes: ['id', 'nombre', 'email']
              },
              {
                model: Formulario,
                attributes: ['id', 'nombre']
              }
            ]
          }
        ]
      }
    ]
  });

  const reporte = departamentos.map(depto => {
    const evaluaciones = [];
    let totalPuntuacion = 0;
    let cantidadEvaluaciones = 0;

    depto.empleados.forEach(empleado => {
      empleado.evaluacionesRecibidas.forEach(evaluacion => {
        evaluaciones.push({
          id: evaluacion.id,
          evaluador: evaluacion.evaluador,
          formulario: evaluacion.formulario,
          puntuacion: evaluacion.puntuacion,
          fecha_finalizacion: evaluacion.fecha_fin
        });
        
        if (evaluacion.puntuacion) {
          totalPuntuacion += evaluacion.puntuacion;
          cantidadEvaluaciones++;
        }
      });
    });

    return {
      departamento: {
        id: depto.id,
        nombre: depto.nombre
      },
      cantidadEmpleados: depto.empleados.length,
      cantidadEvaluaciones: evaluaciones.length,
      promedioPuntuacion: cantidadEvaluaciones > 0 ? (totalPuntuacion / cantidadEvaluaciones).toFixed(2) : 0,
      evaluaciones
    };
  });

  res.status(200).json({
    status: 'success',
    results: reporte.length,
    data: {
      reporte,
      periodo: {
        trimestre: trimestre || 'Todos',
        anio: anio || 'Todos'
      }
    }
  });
});

// Obtener las evaluaciones del empleado logueado
exports.getMisEvaluaciones = catchAsync(async (req, res, next) => {
  // Para debug: usar ID fijo si no hay usuario autenticado
  let usuarioId;
  
  if (req.user && req.user.id) {
    usuarioId = req.user.id;
  } else {
    // ID fijo para pruebas (empleado valen@empresa.com que es ID 3)
    usuarioId = 3;
  }
  
  if (!usuarioId) {
    return res.status(401).json({
      status: 'error',
      message: 'Usuario no autenticado'
    });
  }

  const evaluaciones = await Evaluacion.findAll({
    where: { 
      evaluadoId: usuarioId 
    },
    attributes: ['id', 'estado', 'evaluadoId', 'evaluadorId', 'periodo', 'anio', 'fechaFin', 'createdAt', 'updatedAt', 'puntuacionTotal', 'valoracion'],
    include: [
      {
        model: Usuario,
        as: 'evaluado',
        attributes: ['id', 'nombre', 'apellido'],
        include: [
          {
            model: require('./rol.model'),
            as: 'rol',
            attributes: ['id', 'nombre']
          }
        ]
      },
      {
        model: Usuario,
        as: 'evaluador',
        attributes: ['id', 'nombre', 'apellido'],
        include: [
          {
            model: require('./rol.model'),
            as: 'rol',
            attributes: ['id', 'nombre']
          }
        ]
      },
      {
        model: Formulario,
        as: 'formulario',
        attributes: ['id', 'nombre', 'porcentajes_apartados'],
        include: [
          {
            model: Pregunta,
            as: 'preguntas',
            attributes: ['id', 'apartado']
          }
        ]
      },
      {
        model: Respuesta,
        as: 'respuestas',
        attributes: ['pregunta_id', 'puntuacion']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  console.log('📊 Backend - Evaluaciones encontradas:', evaluaciones.map(e => ({
    id: e.id,
    estado: e.estado,
    fecha_fin: e.fecha_fin,
    valoracion: e.valoracion,
    puntuacion_total: e.puntuacion_total
  })));

  res.status(200).json({
    status: 'success',
    results: evaluaciones.length,
    data: {
      evaluaciones
    }
  });
});

exports.validarPeriodoEvaluacion = validarPeriodoEvaluacion;
