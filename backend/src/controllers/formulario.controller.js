const { Formulario, Pregunta, Cargo, Departamento, Op, sequelize } = require('../models');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const validarOpcionesPregunta = (opciones, tipo) => {
  // Si opciones es null, es una pregunta abierta, no necesita validación
  if (opciones === null) {
    return;
  }
  
  // Las preguntas abiertas y títulos de sección no necesitan opciones
  if (tipo === 'abierta' || tipo === 'titulo_seccion') {
    return;
  }
  
  if (!Array.isArray(opciones) || opciones.length === 0) {
    throw new AppError('Cada pregunta de opción múltiple debe incluir al menos una opción de respuesta', 400);
  }
  opciones.forEach((opcion, index) => {
    if (typeof opcion !== 'object' || opcion === null) {
      throw new AppError(`La opción #${index + 1} no es válida`, 400);
    }
    const { valor, puntuacion } = opcion;
    if (typeof valor !== 'string' || valor.trim() === '') {
      throw new AppError(`La opción #${index + 1} debe incluir un texto (valor)`, 400);
    }
    if (typeof puntuacion !== 'number' || Number.isNaN(puntuacion)) {
      throw new AppError(`La opción #${index + 1} debe incluir una puntuación numérica`, 400);
    }
  });
};
// Crear un nuevo formulario con preguntas
exports.crearFormulario = catchAsync(async (req, res, next) => {
  const {
    nombre,
    descripcion,
    tipo = 'evaluacion',
    periodicidad = 'trimestral',
    estado = 'activo',
    preguntas,
    fechaFin,
    cargo_id // Solo para formularios anuales
  } = req.body;

  // Validar que vengan preguntas
  if (!preguntas || !Array.isArray(preguntas) || preguntas.length === 0) {
    return next(new AppError('Debe incluir al menos una pregunta', 400));
  }
  // Validar periodicidad
  if (!['trimestral', 'anual'].includes(periodicidad)) {
    return next(new AppError('La periodicidad debe ser "trimestral" o "anual"', 400));
  }
  
  // Validaciones específicas según periodicidad
  if (periodicidad === 'trimestral') {
    // Formularios trimestrales no requieren cargo_id
    if (cargo_id) {
      return next(new AppError('Los formularios trimestrales no deben especificar cargo_id', 400));
    }
    
    
    // Validar que las preguntas trimestrales tengan la estructura correcta
    for (const pregunta of preguntas) {
      if (pregunta.tipo === 'titulo_seccion') {
        // Los títulos de sección no necesitan opciones ni apartado
        if (pregunta.opciones) {
          return next(new AppError('Los títulos de sección no deben tener opciones', 400));
        }
        // Validar que el título de sección tenga enunciado
        if (!pregunta.enunciado || pregunta.enunciado.trim() === '') {
          return next(new AppError('Los títulos de sección deben tener un enunciado', 400));
        }
      } else if (pregunta.tipo === 'escala') {
        // Validar que la pregunta de escala tenga enunciado
        if (!pregunta.enunciado || pregunta.enunciado.trim() === '') {
          return next(new AppError('Las preguntas de escala deben tener un enunciado', 400));
        }
        // Preguntas de escala trimestral deben tener opciones 1-4
        if (!pregunta.opciones || pregunta.opciones.length !== 4) {
          return next(new AppError('Las preguntas de escala trimestral deben tener exactamente 4 opciones (1-4)', 400));
        }
      } else if (pregunta.tipo === 'abierta') {
        // Validar que la pregunta abierta tenga enunciado
        if (!pregunta.enunciado || pregunta.enunciado.trim() === '') {
          return next(new AppError('Las preguntas abiertas deben tener un enunciado', 400));
        }
        // Las preguntas abiertas no deben tener opciones
        if (pregunta.opciones) {
          return next(new AppError('Las preguntas abiertas no deben tener opciones', 400));
        }
      } else {
        return next(new AppError('Los formularios trimestrales solo pueden tener preguntas de tipo "escala", "titulo_seccion" o "abierta"', 400));
      }
    }
  } else {
    // Formularios anuales sí requieren cargo_id
    if (!cargo_id) {
      return next(new AppError('Los formularios anuales deben especificar un cargo_id', 400));
    }
  }
  
  // Iniciar transacción para crear formulario y preguntas
  const resultado = await sequelize.transaction(async (t) => {
    // Preparar datos del formulario
    const formularioData = {
      nombre,
      descripcion: descripcion || '',
      tipo,
      periodicidad,
      estado,
      fechaInicio: new Date(), // Fecha actual
      fechaFin: fechaFin ? new Date(fechaFin) : null
    };
    
    // Para formularios trimestrales, porcentajes_apartados es null
    if (periodicidad === 'trimestral') {
      formularioData.porcentajes_apartados = null;
    }
    // Para formularios anuales, usar los valores por defecto del modelo
    // No se especifica nada, el modelo usará su defaultValue
    
    // Crear formulario
    const formulario = await Formulario.create(formularioData, { transaction: t });
    // Asociar con cargo solo si es anual
    if (periodicidad === 'anual') {
      await formulario.addCargo(cargo_id, { transaction: t });
    }
    // Crear preguntas
    const preguntasCreadas = [];
    
    for (const pregunta of preguntas) {
      // Validar opciones según el tipo
      if (pregunta.tipo !== 'titulo_seccion') {
        try {
          validarOpcionesPregunta(pregunta.opciones, pregunta.tipo);
        } catch (error) {
          throw error;
        }
      }
      
      // Preparar datos de la pregunta - SOLO campos que existen en BD
      const preguntaData = {
        enunciado: pregunta.enunciado,
        tipo: pregunta.tipo || 'opcion_multiple',
        opciones: pregunta.opciones,
        peso: pregunta.peso || 1.0,
        obligatoria: pregunta.obligatoria ?? true,
        activa: true,  // ✅ Campo que existe en migración
        formulario_id: formulario.id
      };
      
      // Para formularios anuales, asignar cargo_id y apartado
      if (periodicidad === 'anual') {
        preguntaData.cargo_id = cargo_id;
        preguntaData.apartado = pregunta.apartado;
      } else {
        // Para trimestrales, usar seccion_id para relacionar con títulos
        preguntaData.cargo_id = null;
        preguntaData.apartado = null; // No usar apartado para trimestrales
        
        // Si es un título de sección, no necesita seccion_id
        if (pregunta.tipo === 'titulo_seccion') {
          preguntaData.seccion_id = null;
        } else {
          // Para preguntas de escala/abiertas, se asignará después
          preguntaData.seccion_id = null; // Temporal, se actualizará después
        }
      }
      
      try {
        const preguntaCreada = await Pregunta.create(preguntaData, { 
          transaction: t,
          fields: ['id', 'enunciado', 'tipo', 'apartado', 'seccion_id', 'opciones', 'peso', 'obligatoria', 'activa', 'cargo_id', 'formulario_id']
        });
        preguntasCreadas.push(preguntaCreada);
      } catch (error) {
        throw error;
      }
    }
    // 🔄 Para formularios trimestrales: asociar preguntas con sus títulos usando seccion_id
    if (periodicidad === 'trimestral') {
      let tituloActual = null;
      let contadorAsociaciones = 0;
      
      // Ordenar preguntas por ID para mantener el orden original
      const preguntasOrdenadas = preguntasCreadas.sort((a, b) => a.id - b.id);
      
      for (const pregunta of preguntasOrdenadas) {
        
        if (pregunta.tipo === 'titulo_seccion') {
          // Guardar el título actual
          tituloActual = pregunta;
        } else if (pregunta.tipo === 'escala' || pregunta.tipo === 'abierta') {
          // Asociar la pregunta con el título actual usando seccion_id
          if (tituloActual) {
            await pregunta.update({ 
              seccion_id: tituloActual.id,
              apartado: null // Limpiar apartado para trimestrales
            }, { transaction: t });
            contadorAsociaciones++;
          } else {
            // Si no hay título, dejar seccion_id como null
            await pregunta.update({ 
              seccion_id: null,
              apartado: null
            }, { transaction: t });
          }
        }
      }
    }
    return formulario;
  });

  // Obtener el formulario con sus preguntas y cargos asociados para la respuesta
  const formularioCompleto = await Formulario.findByPk(resultado.id, {
    include: [
      {
        model: Pregunta,
        as: 'preguntas',
        include: [
          {
            model: Cargo,
            as: 'cargo',
            attributes: ['id', 'nombre'],
            required: false
          }
        ]
      },
      {
        model: Cargo,
        as: 'cargos',
        required: false
      }
    ]
  });
  res.status(201).json({
    status: 'success',
    data: {
      formulario: formularioCompleto
    }
  });
});

// Obtener preguntas existentes por departamento y apartado (para reutilización)
exports.obtenerPreguntasExistentes = catchAsync(async (req, res, next) => {
  const { departamento_id, apartado } = req.query;
  
  // Obtener todos los cargos del departamento
  const cargos = await Cargo.findAll({
    where: { departamento_id },
    attributes: ['id', 'nombre']
  });
  
  const cargoIds = cargos.map(c => c.id);
  
  // Obtener preguntas existentes para esos cargos
  const preguntas = await Pregunta.findAll({
    where: {
      cargo_id: { [Op.in]: cargoIds },
      ...(apartado && { apartado })
    },
    include: [
      {
        model: Cargo,
        as: 'cargo',
        attributes: ['id', 'nombre']
      }
    ],
    order: [['enunciado', 'ASC']]
  });
  
  // Agrupar preguntas por enunciado para mostrar reutilización
  const preguntasAgrupadas = {};
  preguntas.forEach(pregunta => {
    const key = pregunta.enunciado.toLowerCase().trim();
    if (!preguntasAgrupadas[key]) {
      preguntasAgrupadas[key] = {
        enunciado: pregunta.enunciado,
        apartado: pregunta.apartado,
        opciones: pregunta.opciones,
        peso: pregunta.peso,
        obligatoria: pregunta.obligatoria,
        activa: pregunta.activa,
        cargos: [],
        id: pregunta.id
      };
    }
    preguntasAgrupadas[key].cargos.push({
      id: pregunta.cargo.id,
      nombre: pregunta.cargo.nombre
    });
  });
  
  res.status(200).json({
    status: 'success',
    results: Object.keys(preguntasAgrupadas).length,
    data: {
      preguntas: Object.values(preguntasAgrupadas),
      cargos: cargos
    }
  });
});
// Obtener todos los formularios
exports.obtenerFormularios = catchAsync(async (req, res, next) => {
  const formularios = await Formulario.findAll({
    include: [
      {
        model: Pregunta,
        as: 'preguntas',
        attributes: ['id', 'enunciado', 'tipo', 'apartado', 'opciones', 'peso', 'obligatoria', 'activa', 'cargo_id', 'formulario_id', 'created_at', 'updated_at', 'deleted_at'] // ✅ Solo campos existentes
      },
      {
        model: Cargo,
        as: 'cargos',
        include: [
          {
            model: Departamento,
            as: 'departamento'
          }
        ]
      }
    ]
  });
  res.status(200).json({
    status: 'success',
    results: formularios.length,
    data: {
      formularios
    }
  });
});
// Obtener un formulario por ID
exports.obtenerFormulario = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const formulario = await Formulario.findByPk(id, {
    include: [
      {
        model: Pregunta,
        as: 'preguntas',
        include: [
          {
            model: Cargo,
            as: 'cargo'
          }
        ]
      },
      {
        model: Cargo,
        as: 'cargos'
      }
    ]
  });
  if (!formulario) {
    return next(new AppError('No se encontró el formulario con el ID especificado', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      formulario
    }
  });
});
// Actualizar un formulario
exports.actualizarFormulario = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { nombre, descripcion, tipo, periodicidad, estado, preguntas, cargo_id } = req.body;
  const formulario = await Formulario.findByPk(id);
  if (!formulario) {
    return next(new AppError('No se encontró el formulario con el ID especificado', 404));
  }
  // Actualizar campos básicos del formulario
  if (nombre) formulario.nombre = nombre;
  if (descripcion) formulario.descripcion = descripcion;
  if (tipo) formulario.tipo = tipo;
  if (periodicidad) formulario.periodicidad = periodicidad;
  if (estado) formulario.estado = estado;
  await formulario.save();
  // Si se proporcionaron preguntas, actualizarlas
  if (preguntas && Array.isArray(preguntas) && preguntas.length > 0) {
    // Obtener preguntas existentes del formulario
    const preguntasExistentes = await Pregunta.findAll({ 
      where: { formulario_id: id } 
    });
    
    const resultado = await sequelize.transaction(async (t) => {
      const preguntasActualizadas = [];
      
      for (const pregunta of preguntas) {
        validarOpcionesPregunta(pregunta.opciones, pregunta.tipo);
        
        if (pregunta.id) {
          // Actualizar pregunta existente
          const preguntaExistente = preguntasExistentes.find(p => p.id === pregunta.id);
          if (preguntaExistente) {
            await preguntaExistente.update({
              enunciado: pregunta.enunciado,
              apartado: pregunta.apartado,
              tipo: pregunta.tipo || preguntaExistente.tipo,
              opciones: pregunta.opciones,
              peso: pregunta.peso ?? preguntaExistente.peso,
              obligatoria: pregunta.obligatoria ?? preguntaExistente.obligatoria,
              cargo_id: cargo_id || pregunta.cargo_id
            }, { transaction: t });
            
            preguntasActualizadas.push(preguntaExistente);
          }
        } else {
          // Crear pregunta nueva
          const preguntaCreada = await Pregunta.create({
            enunciado: pregunta.enunciado,
            apartado: pregunta.apartado,
            tipo: pregunta.tipo || 'opcion_multiple',
            opciones: pregunta.opciones,
            peso: pregunta.peso || 1.0,
            obligatoria: pregunta.obligatoria ?? true,
            cargo_id: cargo_id || pregunta.cargo_id,
            formulario_id: formulario.id
          }, { transaction: t });
          
          preguntasActualizadas.push(preguntaCreada);
        }
      }
      
      // Eliminar preguntas que no están en la lista actualizada
      const idsPreguntasActualizadas = preguntasActualizadas.map(p => p.id).filter(id => id);
      const preguntasAEliminar = preguntasExistentes.filter(p => !idsPreguntasActualizadas.includes(p.id));
      
      for (const preguntaAEliminar of preguntasAEliminar) {
        await preguntaAEliminar.destroy({ transaction: t });
      }
      
      return preguntasActualizadas;
    });
    res.status(200).json({
      status: 'success',
      message: 'Formulario actualizado correctamente',
      data: {
        formulario,
        preguntas: resultado
      }
    });
  } else {
    // Si no se proporcionaron preguntas, solo devolver el formulario actualizado
    res.status(200).json({
      status: 'success',
      message: 'Formulario actualizado correctamente',
      data: {
        formulario
      }
    });
  }
});
// Eliminar un formulario
exports.eliminarFormulario = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const formulario = await Formulario.findByPk(id);
  if (!formulario) {
    return next(new AppError('No se encontró el formulario con el ID especificado', 404));
  }
  // Eliminar en cascada las preguntas relacionadas
  await formulario.destroy();
  res.status(204).json({
    status: 'success',
    data: null
  });
});
// Obtener formularios activos
exports.obtenerFormulariosActivos = catchAsync(async (req, res, next) => {
  const formularios = await Formulario.findAll({
    where: { estado: 'activo' },
    include: [
      {
        model: Pregunta,
        as: 'preguntas',
        where: { estado: 'activo' },
        required: false,
        attributes: ['id', 'enunciado', 'tipo', 'apartado', 'opciones', 'peso', 'obligatoria', 'activa', 'cargo_id', 'formulario_id', 'created_at', 'updated_at', 'deleted_at'] // ✅ Solo campos existentes
      }
    ]
  });
  res.status(200).json({
    status: 'success',
    results: formularios.length,
    data: {
      formularios
    }
  });
});
