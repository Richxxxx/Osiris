const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Usuario, Rol, Departamento, Evaluacion, Objetivo, Comentario, Sequelize, Cargo, Formulario, Pregunta, Opcion, Respuesta } = require('../models');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const crypto = require('crypto');
const notificationService = require('../services/notificationService');

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
 * Función para calcular meses de diferencia entre dos fechas
 */
const calcularMesesDiferencia = (fechaInicio, fechaFin) => {
  return (fechaFin.getFullYear() - fechaInicio.getFullYear()) * 12 + 
         (fechaFin.getMonth() - fechaInicio.getMonth());
};

/**
 * Función para obtener trimestre de una fecha
 */
const obtenerTrimestreDeFecha = (fecha) => {
  return `Q${Math.floor((fecha.getMonth() + 3) / 3)}`;
};

/**
 * Función para calcular la próxima fecha de evaluación de un empleado
 * @param {Date} fechaIngreso - Fecha de ingreso del empleado
 * @param {Date} fechaActual - Fecha actual para cálculos
 * @returns {Date} - Próxima fecha de evaluación
 */
const calcularProximaEvaluacion = (fechaIngreso, fechaActual = new Date()) => {
  const mesesDesdeIngreso = calcularMesesDiferencia(fechaIngreso, fechaActual);
  
  if (mesesDesdeIngreso < 12) {
    // Aún en fase trimestral - calcular próxima evaluación trimestral
    let mesesParaSiguienteEvaluacion = 3 - (mesesDesdeIngreso % 3);
    if (mesesParaSiguienteEvaluacion === 0) mesesParaSiguienteEvaluacion = 3;
    
    const proximaEvaluacion = new Date(fechaIngreso);
    proximaEvaluacion.setMonth(proximaEvaluacion.getMonth() + mesesDesdeIngreso + mesesParaSiguienteEvaluacion);
    
    return proximaEvaluacion;
  } else {
    // Ya es anual - todas en diciembre del año actual
    return new Date(fechaActual.getFullYear(), 11, 31); // 31 de diciembre
  }
};

/**
 * Función para calcular cuántas evaluaciones deberían existir en un trimestre específico
 * @param {string} trimestre - Trimestre a calcular (Q1, Q2, Q3, Q4)
 * @param {number} anio - Año a calcular
 * @returns {Promise<number>} - Número de evaluaciones esperadas
 */
const calcularEvaluacionesEsperadasPorTrimestre = async (trimestre, anio) => {
  const rolEmpleado = await Rol.findOne({ where: { nombre: 'empleado' } });
  
  const empleados = await Usuario.findAll({
    where: { 
      rol_id: rolEmpleado.id,
      estado: 'activo'
    },
    attributes: ['id', 'fecha_ingreso_empresa']
  });
  
  let contadorEvaluaciones = 0;
  
  for (const empleado of empleados) {
    if (!empleado.fecha_ingreso_empresa) {
      continue;
    }
    
    const fechaIngreso = new Date(empleado.fecha_ingreso_empresa);
    const fechaReferencia = new Date(anio, 
      trimestre === 'Q1' ? 2 : trimestre === 'Q2' ? 5 : trimestre === 'Q3' ? 8 : 11, 15);
    const mesesDesdeIngreso = calcularMesesDiferencia(fechaIngreso, fechaReferencia);
    
    let debeTenerEvaluacion = false;
    let tipoEvaluacion = '';
    
    if (mesesDesdeIngreso < 12) {
      // Menos de 1 año: evaluaciones trimestrales cada 3 meses exactos
      const trimestresCompletados = Math.floor(mesesDesdeIngreso / 3);
      
      if (trimestresCompletados >= 1) {
        debeTenerEvaluacion = true;
        tipoEvaluacion = 'TRIMESTRAL';
      }
    } else {
      // Más de 1 año: SOLO evaluaciones anuales
      // Una vez que tiene anual, ya no tiene trimestrales
      // Y solo tiene UNA anual por año
      
      if (mesesDesdeIngreso >= 12 && mesesDesdeIngreso < 15) {
        // Caso 1: Cumple exactamente 12 meses en este trimestre (12-14 meses)
        // Esta es su PRIMERA evaluación anual
        debeTenerEvaluacion = true;
        tipoEvaluacion = 'ANUAL';
      } else {
        // Caso 2: Ya tuvo su primera anual, verificar si le toca anual este año
        // Primero, verificar si ya tuvo anual este año
        const evaluacionAnualExistente = await Evaluacion.findOne({
          where: {
            evaluado_id: empleado.id,
            periodicidad: 'anual',
            anio: anio
          }
        });
        
        // Solo tiene anual si NO tiene anual este año Y estamos en Q4
        if (!evaluacionAnualExistente && trimestre === 'Q4') {
          // Verificar si es antiguo (más de 15 meses)
          if (mesesDesdeIngreso >= 15) {
            // Es antiguo, le toca anual en Q4
            debeTenerEvaluacion = true;
            tipoEvaluacion = 'ANUAL';
          }
          // Si no es antiguo, no tiene evaluación (ya tuvo su primera anual)
        }
        // Si ya tuvo anual este año o no estamos en Q4, no tiene evaluación
      }
    }
    
    const evaluacionExistente = await Evaluacion.findOne({
      where: {
        evaluado_id: empleado.id,
        periodo: trimestre,
        anio: anio
      }
    });
    
    if (evaluacionExistente && !debeTenerEvaluacion) {
      debeTenerEvaluacion = true;
      tipoEvaluacion = evaluacionExistente.periodicidad || 'EXISTENTE';
    }
    
    if (debeTenerEvaluacion) {
      contadorEvaluaciones++;
    }
  }
  
  return contadorEvaluaciones;
};

const cargoInclude = {
  model: Cargo,
  as: 'cargo',
  attributes: ['id', 'nombre', 'descripcion']
};

const formatearUsuarioConCargo = (usuario) => {
  if (!usuario) return null;
  const data = typeof usuario.toJSON === 'function' ? usuario.toJSON() : usuario;
  const cargoInfo = usuario.cargo ? {
    id: usuario.cargo.id,
    nombre: usuario.cargo.nombre,
    descripcion: usuario.cargo.descripcion || null
  } : null;

  return {
    ...data,
    cedula: data.cedula,
    empresa: data.empresa,
    fecha_ingreso_empresa: data.fecha_ingreso_empresa,
    cargo: cargoInfo ? cargoInfo.nombre : null,
    cargoInfo
  };
};

const extraerCargoIdDesdePayload = async (payload = {}) => {
  if (Object.prototype.hasOwnProperty.call(payload, 'cargo_id')) {
    return { proporcionado: true, valor: payload.cargo_id || null };
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'cargoId')) {
    return { proporcionado: true, valor: payload.cargoId || null };
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'cargo')) {
    const cargoEntrada = payload.cargo;

    if (cargoEntrada === null || cargoEntrada === '') {
      return { proporcionado: true, valor: null };
    }

    if (typeof cargoEntrada === 'object' && cargoEntrada) {
      if (cargoEntrada.id) {
        return { proporcionado: true, valor: cargoEntrada.id };
      }

      if (cargoEntrada.nombre) {
        const cargoEncontrado = await Cargo.findOne({ where: { nombre: cargoEntrada.nombre.trim() } });
        if (!cargoEncontrado) {
          throw new AppError('El cargo especificado no existe', 400);
        }
        return { proporcionado: true, valor: cargoEncontrado.id };
      }
    }

    if (!Number.isNaN(Number(cargoEntrada))) {
      return { proporcionado: true, valor: Number(cargoEntrada) };
    }

    const cargoNormalizado = typeof cargoEntrada === 'string' ? cargoEntrada.trim() : cargoEntrada;
    if (!cargoNormalizado) {
      return { proporcionado: true, valor: null };
    }

    const cargoEncontrado = await Cargo.findOne({ where: { nombre: cargoNormalizado } });
    if (!cargoEncontrado) {
      throw new AppError('El cargo especificado no existe', 400);
    }
    return { proporcionado: true, valor: cargoEncontrado.id };
  }

  return { proporcionado: false };
};

// Obtener usuarios por departamento (hiper-optimizado)
exports.obtenerUsuariosPorDepartamento = catchAsync(async (req, res, next) => {
  try {
    const { departamentoId } = req.params;
    const usuarioActual = req.user;
    
    if (!departamentoId) {
      return next(new AppError('Se requiere el ID del departamento', 400));
    }

    // Verificación rápida sin consulta adicional si es evaluador
    if (usuarioActual.rol_id === 2 && usuarioActual.departamento_id !== parseInt(departamentoId)) {
      return next(new AppError('No tienes permiso para ver este departamento', 403));
    }

    // Construir where clause optimizada
    const whereClause = {
      departamento_id: departamentoId,
      estado: 'activo',
      id: { [Op.ne]: usuarioActual.id }
    };

    // Si es evaluador, filtrar por rol directamente
    if (usuarioActual.rol_id === 2) {
      whereClause.rol_id = 3; // ID del rol 'empleado'
    }

    // Obtener usuarios con includes mínimos
    const usuarios = await Usuario.findAll({
      where: whereClause,
      attributes: ['id', 'nombre', 'apellido', 'email', 'cargo_id'],
      include: [
        {
          model: Cargo,
          as: 'cargo',
          attributes: ['id', 'nombre']
        }
      ],
      order: [['apellido', 'ASC']],
      limit: 100,
      raw: false
    });

    const usuariosConCargo = usuarios.map(formatearUsuarioConCargo);

    res.status(200).json({
      status: 'success',
      results: usuariosConCargo.length,
      data: {
        usuarios: usuariosConCargo
      }
    });
  } catch (error) {
    next(new AppError('Error al obtener los usuarios del departamento: ' + error.message, 500));
  }
});

// Obtener todos los usuarios
exports.obtenerUsuarios = catchAsync(async (req, res, next) => {
  const usuarios = await Usuario.findAll({
    attributes: { exclude: ['password'] },
    include: [
      { model: Rol, as: 'rol', attributes: ['id', 'nombre', 'descripcion'] },
      { model: Departamento, as: 'departamento', attributes: ['id', 'nombre'] },
      cargoInclude
    ]
  });

  const usuariosConCargo = usuarios.map(formatearUsuarioConCargo);

  res.status(200).json({
    status: 'success',
    results: usuariosConCargo.length,
    data: {
      usuarios: usuariosConCargo
    }
  });
});

// Obtener un usuario por ID
exports.obtenerUsuario = catchAsync(async (req, res, next) => {
  const usuario = await Usuario.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
    include: [
      { model: Rol, as: 'rol', attributes: ['id', 'nombre', 'descripcion'] },
      { model: Departamento, as: 'departamento', attributes: ['id', 'nombre'] },
      cargoInclude
    ]
  });

  if (!usuario) {
    return next(new AppError('No se encontró ningún usuario con ese ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      usuario: formatearUsuarioConCargo(usuario)
    }
  });
});

// Crear un nuevo usuario (solo administradores)
exports.crearUsuario = catchAsync(async (req, res, next) => {
  // 1) Verificar si la cédula ya está en uso
  const existeCedula = await Usuario.findOne({ where: { cedula: req.body.cedula } });
  if (existeCedula) {
    return next(new AppError('Ya existe un usuario con esa cédula', 400));
  }

  // 2) Verificar si el email ya está en uso (solo si se proporciona email)
  if (req.body.email) {
    const existeUsuario = await Usuario.findOne({ where: { email: req.body.email } });
    if (existeUsuario) {
      return next(new AppError('Ya existe un usuario con ese correo electrónico', 400));
    }
  }

  // 3) Validar fecha de ingreso obligatoria
  if (!req.body.fecha_ingreso_empresa) {
    return next(new AppError('La fecha de ingreso (fecha_ingreso_empresa) es obligatoria', 400));
  }

  // 4) Crear el usuario
  const { proporcionado: cargoProporcionado, valor: cargoId } = await extraerCargoIdDesdePayload(req.body);

  const nuevoUsuario = await Usuario.create({
    cedula: req.body.cedula,
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    empresa: req.body.empresa || null,
    email: req.body.email || null,
    password: req.body.password,
    cargo_id: cargoProporcionado ? cargoId : null,
    rol_id: req.body.rol_id,
    departamento_id: req.body.departamento_id,
    fecha_ingreso_empresa: req.body.fecha_ingreso_empresa,
    estado: 'activo'
  });

  const usuarioConRelaciones = await Usuario.findByPk(nuevoUsuario.id, {
    attributes: { exclude: ['password'] },
    include: [
      { model: Rol, as: 'rol', attributes: ['id', 'nombre', 'descripcion'] },
      { model: Departamento, as: 'departamento', attributes: ['id', 'nombre'] },
      cargoInclude
    ]
  });

  // Enviar notificación de bienvenida al nuevo usuario
  try {
    await notificationService.notificarNuevoUsuario(nuevoUsuario.id, req.body.password);
  } catch (notificationError) {
    // No fallamos la petición si las notificaciones fallan
  }

  // 🔥 NUEVO: Enviar notificación a administradores
  try {
    await notificationService.notificarAdminNuevoUsuario(nuevoUsuario.id);
      } catch (notificationError) {
    // No fallamos la petición si las notificaciones fallan
  }

  res.status(201).json({
    status: 'success',
    data: {
      usuario: formatearUsuarioConCargo(usuarioConRelaciones)
    }
  });
});

// Actualizar un usuario
exports.actualizarUsuario = catchAsync(async (req, res, next) => {
  const camposPermitidos = ['cedula', 'nombre', 'apellido', 'empresa', 'email', 'rol_id', 'departamento_id', 'fecha_ingreso_empresa', 'estado', 'cargo_id'];
  const camposActualizados = {};

  // Filtrar solo los campos permitidos
  Object.keys(req.body).forEach(campo => {
    if (camposPermitidos.includes(campo)) {
      camposActualizados[campo] = req.body[campo];
    }
  });

  const { proporcionado: cargoProporcionado, valor: cargoId } = await extraerCargoIdDesdePayload(req.body);
  if (cargoProporcionado) {
    camposActualizados.cargo_id = cargoId;
  }

  // Si no hay campos para actualizar
  if (Object.keys(camposActualizados).length === 0) {
    return next(new AppError('No se proporcionaron datos para actualizar', 400));
  }

  // Si se está actualizando la cédula, verificar que no esté en uso
  if (camposActualizados.cedula) {
    const existeCedula = await Usuario.findOne({ 
      where: { 
        cedula: camposActualizados.cedula,
        id: { [Op.ne]: req.params.id } // Excluir el usuario actual
      } 
    });
    
    if (existeCedula) {
      return next(new AppError('Ya existe un usuario con esa cédula', 400));
    }
  }

  // Si se está actualizando el email, verificar que no esté en uso (solo si se proporciona email)
  if (camposActualizados.email) {
    const existeUsuario = await Usuario.findOne({ 
      where: { 
        email: camposActualizados.email,
        id: { [Op.ne]: req.params.id } // Excluir el usuario actual
      } 
    });
    
    if (existeUsuario) {
      return next(new AppError('Ya existe un usuario con ese correo electrónico', 400));
    }
  }

  // Si se está actualizando el rol o departamento, verificar que el rol y departamento existan
  if (camposActualizados.rol_id) {
    const rol = await Rol.findByPk(camposActualizados.rol_id);
    if (!rol) {
      return next(new AppError('El rol especificado no existe', 400));
    }
  }

  if (camposActualizados.departamento_id) {
    const departamento = await Departamento.findByPk(camposActualizados.departamento_id);
    if (!departamento) {
      return next(new AppError('El departamento especificado no existe', 400));
    }
  }

  if (cargoProporcionado && camposActualizados.cargo_id) {
    const cargo = await Cargo.findByPk(camposActualizados.cargo_id);
    if (!cargo) {
      return next(new AppError('El cargo especificado no existe', 400));
    }
  }

  // Obtener el usuario actual para verificar si está activo
  const usuarioActual = await Usuario.findByPk(req.params.id);
  if (!usuarioActual) {
    return next(new AppError('No se encontró ningún usuario con ese ID', 404));
  }

  // Si el usuario está inactivo y se intenta actualizar, devolver error
  if (usuarioActual.estado === 'inactivo') {
    return next(new AppError('No se puede actualizar un usuario inactivo', 400));
  }

  // Actualizar el usuario
  const [filasActualizadas] = await Usuario.update(camposActualizados, {
    where: { id: req.params.id },
    returning: true,
    individualHooks: true
  });

  if (filasActualizadas === 0) {
    return next(new AppError('No se pudo actualizar el usuario', 500));
  }

  // Obtener el usuario actualizado con sus relaciones
  const usuarioActualizado = await Usuario.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
    include: [
      { 
        model: Rol, 
        as: 'rol',
        attributes: ['id', 'nombre', 'descripcion'] 
      },
      { 
        model: Departamento, 
        as: 'departamento',
        attributes: ['id', 'nombre'] 
      },
      cargoInclude
    ]
  });

  res.status(200).json({
    status: 'success',
    data: {
      usuario: formatearUsuarioConCargo(usuarioActualizado)
    }
  });
});

// Eliminar un usuario (borrado lógico)
exports.eliminarUsuario = catchAsync(async (req, res, next) => {
  // Verificar si el usuario existe
  const usuario = await Usuario.findByPk(req.params.id);
  
  if (!usuario) {
    return next(new AppError('No se encontró ningún usuario con ese ID', 404));
  }

  // Verificar si el usuario ya está inactivo
  if (usuario.estado === 'inactivo') {
    return next(new AppError('El usuario ya está inactivo', 400));
  }

  // Verificar si el usuario tiene evaluaciones activas
  const tieneEvaluaciones = await Evaluacion.findOne({
    where: {
      evaluado_id: req.params.id,
      estado: { [Op.ne]: 'completada' }
    }
  });

  if (tieneEvaluaciones) {
    return next(new AppError(
      'No se puede desactivar el usuario porque tiene evaluaciones pendientes o en progreso. ' +
      'Por favor, complete o cancele las evaluaciones antes de desactivar al usuario.',
      400
    ));
  }

  // Realizar el borrado lógico
  const [filasActualizadas] = await Usuario.update(
    { estado: 'inactivo' },
    {
      where: { id: req.params.id },
      individualHooks: true
    }
  );

  if (filasActualizadas === 0) {
    return next(new AppError('No se pudo desactivar el usuario', 500));
  }

  res.status(200).json({
    status: 'success',
    message: 'Usuario desactivado exitosamente',
    data: null
  });
});

// Eliminar un usuario definitivamente (solo para administradores)
exports.eliminarUsuarioDefinitivo = catchAsync(async (req, res, next) => {
  const usuario = await Usuario.findByPk(req.params.id);
  
  if (!usuario) {
    return next(new AppError('No se encontró ningún usuario con ese ID', 404));
  }

  // Verificar que el usuario no tenga evaluaciones, objetivos o comentarios asociados
  const tieneEvaluaciones = Evaluacion
    ? await Evaluacion.count({
        where: {
          [Op.or]: [
            { evaluador_id: req.params.id },
            { evaluado_id: req.params.id }
          ]
        }
      })
    : 0;

  const tieneObjetivos = Objetivo
    ? await Objetivo.count({ where: { usuario_id: req.params.id } })
    : 0;

  const tieneComentarios = Comentario
    ? await Comentario.count({ where: { usuario_id: req.params.id } })
    : 0;

  if (tieneEvaluaciones > 0 || tieneObjetivos > 0 || tieneComentarios > 0) {
    return next(new AppError(
      'No se puede eliminar el usuario porque tiene evaluaciones, objetivos o comentarios asociados. ' +
      'Elimine primero los registros relacionados o desactive al usuario en su lugar.',
      400
    ));
  }

  // Si no hay registros relacionados, proceder con la eliminación
  await usuario.destroy();

  res.status(204).json({
    status: 'success',
    message: 'Usuario eliminado permanentemente',
    data: null
  });
});

// Obtener el perfil del usuario actual
exports.getMiPerfil = catchAsync(async (req, res, next) => {
  const usuario = await Usuario.findByPk(req.user.id, {
    attributes: { exclude: ['password'] },
    include: [
      { model: Rol, attributes: ['id', 'nombre', 'descripcion'] },
      { model: Departamento, attributes: ['id', 'nombre'] },
      cargoInclude
    ]
  });

  if (!usuario) {
    return next(new AppError('No se encontró el perfil del usuario', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      usuario: formatearUsuarioConCargo(usuario)
    }
  });
});

// Actualizar el perfil del usuario actual
exports.actualizarMiPerfil = catchAsync(async (req, res, next) => {
  // 1) Verificar si el usuario está actualizando su contraseña
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Esta ruta no es para actualizar contraseñas. Por favor use /actualizarMiContraseña',
        400
      )
    );
  }

  // 2) Filtrar campos no permitidos
  const { nombre, email } = req.body;
  const camposActualizados = {};
  
  if (nombre) camposActualizados.nombre = nombre;
  if (email) camposActualizados.email = email;

  // 3) Actualizar el usuario
  const [filasActualizadas] = await Usuario.update(camposActualizados, {
    where: { id: req.user.id },
    returning: true,
    individualHooks: true
  });

  if (filasActualizadas === 0) {
    return next(new AppError('No se pudo actualizar el perfil', 400));
  }

  // 4) Obtener el usuario actualizado
  const usuarioActualizado = await Usuario.findByPk(req.user.id, {
    attributes: { exclude: ['password'] },
    include: [
      { model: Rol, attributes: ['id', 'nombre', 'descripcion'] },
      { model: Departamento, attributes: ['id', 'nombre'] },
      cargoInclude
    ]
  });

  res.status(200).json({
    status: 'success',
    data: {
      usuario: formatearUsuarioConCargo(usuarioActualizado)
    }
  });
});

// Actualizar la contraseña del usuario actual
exports.actualizarMiContraseña = catchAsync(async (req, res, next) => {
  // 1) Obtener el usuario de la colección
  const usuario = await Usuario.findByPk(req.user.id);

  // 2) Verificar si la contraseña actual es correcta
  if (!(await usuario.validarPassword(req.body.contraseñaActual, usuario.password))) {
    return next(new AppError('Tu contraseña actual es incorrecta', 401));
  }

  // 3) Si es correcta, actualizar la contraseña
  usuario.password = req.body.nuevaContraseña;
  usuario.cambioPasswordEn = Date.now() - 1000; // Restar 1 segundo para asegurar que el token se emitió después del cambio
  await usuario.save();

  // 4) Iniciar sesión al usuario, enviar JWT
  createSendToken(usuario, 200, res);
});

// Obtener estadísticas generales para el dashboard de gestión
exports.obtenerEstadisticasGestion = catchAsync(async (req, res) => {
  try {
    const { trimestre } = req.query;
    
    // Obtener el rol evaluador y empleado de forma separada
    const rolEvaluador = await Rol.findOne({ where: { nombre: 'evaluador' } });
    const rolEmpleado = await Rol.findOne({ where: { nombre: 'empleado' } });
    
    if (!rolEmpleado) {
      return res.status(400).json({
        status: 'error',
        message: 'No se encontró el rol de empleado'
      });
    }

    // Construir filtro de evaluaciones por trimestre si se especifica
    const evaluacionFilter = {};
    let trimestreCalculado = '';
    let anioCalculado = 0;
    
    if (trimestre) {
      // Si viene en formato YYYY-QX, extraer año y trimestre
      if (trimestre.includes('-')) {
        const [year, quarter] = trimestre.split('-');
        evaluacionFilter.periodo = quarter;
        evaluacionFilter.anio = parseInt(year);
        trimestreCalculado = quarter;
        anioCalculado = parseInt(year);
      } else {
        // Formato antiguo (solo QX)
        evaluacionFilter.periodo = trimestre;
        evaluacionFilter.anio = new Date().getFullYear();
        trimestreCalculado = trimestre;
        anioCalculado = new Date().getFullYear();
      }
    } else {
      // Si no se especifica trimestre, usar el trimestre actual
      const fechaActual = new Date();
      trimestreCalculado = obtenerTrimestreDeFecha(fechaActual);
      anioCalculado = fechaActual.getFullYear();
      evaluacionFilter.periodo = trimestreCalculado;
      evaluacionFilter.anio = anioCalculado;
    }

    // 🔥 NUEVA LÓGICA: Calcular evaluaciones esperadas en este trimestre
    const evaluacionesEsperadas = await calcularEvaluacionesEsperadasPorTrimestre(trimestreCalculado, anioCalculado);
    
    // Total de empleados (se mantiene para referencia, pero no para cálculos)
    const totalEmpleados = await Usuario.count({ 
      where: { 
        rol_id: rolEmpleado.id,
        estado: 'activo'
      }
    });

    // Estadísticas de evaluaciones existentes (filtradas por trimestre si se especifica)
    const [totalEvaluacionesCreadas, evaluacionesCompletadas, evaluacionesEnProgreso, evaluacionesPendientes] = await Promise.all([
      Evaluacion.count(evaluacionFilter),
      Evaluacion.count({ where: { ...evaluacionFilter, estado: 'completada' } }),
      Evaluacion.count({ where: { ...evaluacionFilter, estado: 'en_progreso' } }),
      Evaluacion.count({ where: { ...evaluacionFilter, estado: 'pendiente' } })
    ]);

    // 🔥 LÓGICA CORREGIDA: Pendientes = evaluaciones esperadas - (completadas + en_progreso)
    // Las evaluaciones que deberían existir pero aún no están completadas ni en progreso
    const evaluacionesConEstado = evaluacionesCompletadas + evaluacionesEnProgreso;
    const totalPendientes = Math.max(0, evaluacionesEsperadas - evaluacionesConEstado);

    const estadisticas = await Promise.all([
      // Líderes activos (usuarios con rol evaluador)
      Usuario.count({ 
        where: { 
          rol_id: rolEvaluador?.id,
          estado: 'activo'
        }
      }),
      
      // Departamentos activos (estado es booleano, true = activo)
      Departamento.count({ where: { estado: true } })
    ]);

    const [lideresActivos, departamentos] = estadisticas;

    // 🔥 NUEVA LÓGICA: Tasa de completitud basada en evaluaciones esperadas
    const tasaCompletitud = evaluacionesEsperadas > 0 ? Math.round((evaluacionesCompletadas / evaluacionesEsperadas) * 100) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        estadisticas: {
          // 🔥 CAMBIADO: Ahora usa evaluaciones esperadas como base
          totalEmpleados, // Se mantiene para referencia
          evaluacionesEsperadas, // 🔥 NUEVO: Evaluaciones que deberían existir
          totalEvaluaciones: totalEvaluacionesCreadas, // Evaluaciones reales creadas
          evaluacionesCompletadas,
          evaluacionesEnProgreso,
          evaluacionesPendientes: totalPendientes,
          tasaCompletitud, // 🔥 CAMBIADO: Basado en evaluaciones esperadas
          lideresActivos,
          departamentos
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener las estadísticas',
      error: error.message
    });
  }
});

// Obtener evaluaciones completadas por departamento para seguimiento
exports.obtenerEvaluacionesCompletadasPorDepartamento = catchAsync(async (req, res) => {
  try {
    const { departamento } = req.query;
    
    // Obtener roles necesarios
    const rolEmpleado = await Rol.findOne({ where: { nombre: 'empleado' } });
    const rolEvaluador = await Rol.findOne({ where: { nombre: 'evaluador' } });

    if (!rolEmpleado) {
      return res.status(400).json({
        status: 'error',
        message: 'No se encontró el rol de empleado'
      });
    }

    // Construir filtro de departamento
    const whereCondition = { estado: true };
    if (departamento) {
      whereCondition.nombre = departamento;
    }

    // Obtener departamentos con sus empleados y evaluaciones completadas
    const departamentos = await Departamento.findAll({
      where: whereCondition,
      include: [
        {
          model: Usuario,
          as: 'usuarios',
          where: { 
            estado: 'activo',
            rol_id: rolEmpleado.id
          },
          include: [
            {
              model: Evaluacion,
              as: 'evaluacionesRecibidas',
              where: { estado: 'completada' },
              required: false // Incluir empleados aunque no tengan evaluaciones completadas
            }
          ],
          required: false
        }
      ]
    });

    // Procesar datos para mostrar solo usuarios con evaluaciones completadas
    const resultado = departamentos.map(depto => {
      const usuariosConEvaluacionesCompletadas = depto.usuarios
        .filter(usuario => usuario.evaluacionesRecibidas && usuario.evaluacionesRecibidas.length > 0)
        .map(usuario => ({
          id: usuario.id,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          cargo: usuario.cargo?.nombre || 'N/A',
          evaluacionesCompletadas: usuario.evaluacionesRecibidas.map(evaluacion => ({
            id: evaluacion.id,
            estado: evaluacion.estado,
            calificacion: evaluacion.calificacion,
            fecha_completado: evaluacion.updated_at,
            evaluador: evaluacion.evaluador ? {
              nombre: evaluacion.evaluador.nombre,
              apellido: evaluacion.evaluador.apellido
            } : null
          }))
        }));

      return {
        departamento: depto.nombre,
        totalUsuarios: depto.usuarios.length,
        usuariosConEvaluaciones: usuariosConEvaluacionesCompletadas.length,
        usuarios: usuariosConEvaluacionesCompletadas
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        departamentos: resultado
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener las evaluaciones completadas',
      error: error.message
    });
  }
});

// Obtener estadísticas por departamento para gráficas
exports.obtenerEstadisticasPorDepartamento = catchAsync(async (req, res) => {
  try {
    const { trimestre, ordenarPor, ordenDireccion } = req.query;
    
    // Obtener roles necesarios
    const rolEmpleado = await Rol.findOne({ where: { nombre: 'empleado' } });
    const rolEvaluador = await Rol.findOne({ where: { nombre: 'evaluador' } });

    if (!rolEmpleado) {
      return res.status(400).json({
        status: 'error',
        message: 'No se encontró el rol de empleado'
      });
    }

    // Obtener todos los departamentos activos
    const departamentos = await Departamento.findAll({
      where: { estado: true },
      include: [
        {
          model: Usuario,
          as: 'usuarios',
          where: { 
            estado: 'activo',
            rol_id: rolEmpleado.id
          },
          required: false // Incluir departamentos sin empleados
        }
      ]
    });

    // Construir filtro de evaluaciones por trimestre si se especifica
    const evaluacionFilter = {};
    let trimestreCalculado = '';
    let anioCalculado = 0;
    
    if (trimestre) {
      // Si viene en formato YYYY-QX, extraer año y trimestre
      if (trimestre.includes('-')) {
        const [year, quarter] = trimestre.split('-');
        evaluacionFilter.periodo = quarter;
        evaluacionFilter.anio = parseInt(year);
        trimestreCalculado = quarter;
        anioCalculado = parseInt(year);
      } else {
        // Formato antiguo (solo QX)
        evaluacionFilter.periodo = trimestre;
        evaluacionFilter.anio = new Date().getFullYear();
        trimestreCalculado = trimestre;
        anioCalculado = new Date().getFullYear();
      }
    } else {
      // Si no se especifica trimestre, usar el trimestre actual
      const fechaActual = new Date();
      trimestreCalculado = obtenerTrimestreDeFecha(fechaActual);
      anioCalculado = fechaActual.getFullYear();
      evaluacionFilter.periodo = trimestreCalculado;
      evaluacionFilter.anio = anioCalculado;
    }
    
    // Para cada departamento, calcular estadísticas
    const estadisticasDepartamentos = await Promise.all(
      departamentos.map(async (depto) => {
        const empleados = depto.usuarios || [];
        const totalEmpleados = empleados.length;

        if (totalEmpleados === 0) {
          return {
            departamento: depto.nombre,
            estadisticas: {
              totalEmpleados: 0,
              evaluacionesEsperadas: 0, // 🔥 NUEVO
              evaluacionesCompletadas: 0,
              evaluacionesEnProgreso: 0,
              evaluacionesPendientes: 0,
              evaluacionesAsignadas: 0, // 🔥 NUEVO
              valoracion: {
                EXCELENTE: 0,
                SOBRESALIENTE: 0,
                BUENO: 0,
                ACEPTABLE: 0,
                DEFICIENTE: 0
              },
              valoracion_anual: { // 🔥 NUEVO
                EXCELENTE: 0,
                SOBRESALIENTE: 0,
                BUENO: 0,
                ACEPTABLE: 0,
                DEFICIENTE: 0
              },
              valoracion_trimestral: { // 🔥 NUEVO
                EXCELENTE: 0,
                SOBRESALIENTE: 0,
                BUENO: 0,
                ACEPTABLE: 0,
                DEFICIENTE: 0
              },
              tasaCompletitud: 0 // 🔥 NUEVO
            }
          };
        }

        // 🔥 LÓGICA CORREGIDA: Calcular evaluaciones esperadas para este departamento
        let evaluacionesEsperadasDepto = 0;
        // 🔥 CORRECCIÓN: Usar for...of en lugar de forEach para poder usar await
        for (const empleado of empleados) {
          if (!empleado.fecha_ingreso_empresa) return;
          
          const fechaIngreso = new Date(empleado.fecha_ingreso_empresa);
          const mesesDesdeIngreso = calcularMesesDiferencia(fechaIngreso, new Date(anioCalculado, 
            trimestreCalculado === 'Q1' ? 2 : trimestreCalculado === 'Q2' ? 5 : trimestreCalculado === 'Q3' ? 8 : 11, 15));
          
          // Aplicar misma lógica que en la función principal
          let debeTenerEvaluacion = false;
          
          if (mesesDesdeIngreso < 12) {
            // Menos de 1 año: evaluaciones trimestrales cada 3 meses exactos
            const trimestresCompletados = Math.floor(mesesDesdeIngreso / 3);
            
            if (trimestresCompletados >= 1) {
              debeTenerEvaluacion = true;
            }
          } else {
            // Más de 1 año: SOLO evaluaciones anuales
            // Una vez que tiene anual, ya no tiene trimestrales
            // Y solo tiene UNA anual por año
            
            if (mesesDesdeIngreso >= 12 && mesesDesdeIngreso < 15) {
              // Caso 1: Cumple exactamente 12 meses en este trimestre (12-14 meses)
              // Esta es su PRIMERA evaluación anual
              debeTenerEvaluacion = true;
              tipoEvaluacion = 'ANUAL';
            } else {
              // Caso 2: Ya tuvo su primera anual, verificar si le toca anual este año
              // Primero, verificar si ya tuvo anual este año
              const evaluacionAnualExistente = await Evaluacion.findOne({
                where: {
                  evaluado_id: empleado.id,
                  periodicidad: 'anual',
                  anio: anioCalculado
                }
              });
              
              if (!evaluacionAnualExistente && trimestreCalculado === 'Q4') {
                // No tiene anual este año y estamos en Q4, le toca anual
                debeTenerEvaluacion = true;
                tipoEvaluacion = 'ANUAL';
              }
              // Si ya tuvo anual este año o no estamos en Q4, no tiene evaluación
            }
          }
          
          if (debeTenerEvaluacion) {
            evaluacionesEsperadasDepto++;
          }
        }

        // Obtener evaluaciones de todos los empleados del departamento (filtradas por trimestre si se especifica)
        const evaluaciones = await Evaluacion.findAll({
          where: {
            evaluado_id: empleados.map(emp => emp.id),
            ...evaluacionFilter
          }
          // Sin attributes para traer todos los campos incluyendo dataValues
        });

        const evaluacionesCompletadas = evaluaciones.filter(e => e.estado === 'completada').length;
        const evaluacionesEnProgreso = evaluaciones.filter(e => e.estado === 'en_progreso').length;
        const evaluacionesPendientes = evaluaciones.filter(e => e.estado === 'pendiente').length;
        const evaluacionesAsignadas = evaluaciones.filter(e => e.estado === 'asignada').length;
        
        // 🔥 CORRECCIÓN: Calcular promedio real separando anual y trimestral
        const evaluacionesCompletadasAnuales = evaluaciones.filter(e => 
          e.estado === 'completada' && e.periodicidad === 'anual'
        );
        
        const evaluacionesCompletadasTrimestrales = evaluaciones.filter(e => 
          e.estado === 'completada' && e.periodicidad === 'trimestral'
        );
        
        // Calcular promedio real para evaluaciones anuales
        let promedioAnual = 0;
        if (evaluacionesCompletadasAnuales.length > 0) {
          const totalPuntuacionAnual = evaluacionesCompletadasAnuales.reduce((sum, evaluacion) => {
            const puntuacion = evaluacion.dataValues?.puntuacionTotal || 0;
            return sum + parseFloat(puntuacion);
          }, 0);
          promedioAnual = totalPuntuacionAnual / evaluacionesCompletadasAnuales.length;
        }
        
        // Calcular promedio real para evaluaciones trimestrales
        let promedioTrimestral = 0;
        if (evaluacionesCompletadasTrimestrales.length > 0) {
          const totalPuntuacionTrimestral = evaluacionesCompletadasTrimestrales.reduce((sum, evaluacion) => {
            const puntuacion = evaluacion.dataValues?.puntuacionTotal || 0;
            return sum + parseFloat(puntuacion);
          }, 0);
          promedioTrimestral = totalPuntuacionTrimestral / evaluacionesCompletadasTrimestrales.length;
        }

        // Calcular estadísticas de valoración separadas por tipo
        const evaluacionesConValoracionAnual = evaluaciones.filter(e => 
          e.estado === 'completada' && e.valoracion_anual
        );
        
        const evaluacionesConValoracionTrimestral = evaluaciones.filter(e => 
          e.estado === 'completada' && e.valoracion_trimestral
        );
        
        // 🔥 CORRECCIÓN: Usar valores reales sin mapeo - Separar completamente
        // Valoraciones anuales separadas
        const valoracion_anualStats = {
          EXCELENTE: evaluacionesConValoracionAnual.filter(e => e.valoracion_anual === 'EXCELENTE').length,
          SOBRESALIENTE: evaluacionesConValoracionAnual.filter(e => e.valoracion_anual === 'SOBRESALIENTE').length,
          BUENO: evaluacionesConValoracionAnual.filter(e => e.valoracion_anual === 'BUENO').length,
          ACEPTABLE: evaluacionesConValoracionAnual.filter(e => e.valoracion_anual === 'ACEPTABLE').length,
          DEFICIENTE: evaluacionesConValoracionAnual.filter(e => e.valoracion_anual === 'DEFICIENTE').length
        };
        
        // Valoraciones trimestrales separadas
        const valoracion_trimestralStats = {
          DESTACADO: evaluacionesConValoracionTrimestral.filter(e => e.valoracion_trimestral === 'DESTACADO').length,
          BUENO: evaluacionesConValoracionTrimestral.filter(e => e.valoracion_trimestral === 'BUENO').length,
          BAJO: evaluacionesConValoracionTrimestral.filter(e => e.valoracion_trimestral === 'BAJO').length
        };
        
        // Valoraciones combinadas (para compatibilidad) - NO USAR en gráficas separadas
        const valoracionStats = {
          EXCELENTE: valoracion_anualStats.EXCELENTE,
          SOBRESALIENTE: valoracion_anualStats.SOBRESALIENTE,
          BUENO: valoracion_anualStats.BUENO + valoracion_trimestralStats.BUENO,
          ACEPTABLE: valoracion_anualStats.ACEPTABLE,
          DEFICIENTE: valoracion_anualStats.DEFICIENTE
        };
        
                
        // 🔥 LÓGICA CORREGIDA: Pendientes = evaluaciones esperadas - (completadas + en_progreso)
        const evaluacionesConEstado = evaluacionesCompletadas + evaluacionesEnProgreso;
        const totalPendientes = Math.max(0, evaluacionesEsperadasDepto - evaluacionesConEstado);
        
        // 🔥 NUEVA LÓGICA: Tasa de completitud basada en evaluaciones esperadas
        const tasaCompletitud = evaluacionesEsperadasDepto > 0 ? Math.round((evaluacionesCompletadas / evaluacionesEsperadasDepto) * 100) : 0;

        return {
          departamento: depto.nombre,
          estadisticas: {
            totalEmpleados, // Se mantiene para referencia
            evaluacionesEsperadas: evaluacionesEsperadasDepto, // 🔥 NUEVO
            evaluacionesCompletadas,
            evaluacionesEnProgreso,
            evaluacionesPendientes: totalPendientes,
            evaluacionesAsignadas, // 🔥 NUEVO
            valoracion: valoracionStats, // Combinadas para compatibilidad
            valoracion_anual: valoracion_anualStats, // 🔥 NUEVO
            valoracion_trimestral: valoracion_trimestralStats, // 🔥 NUEVO
            // 🔥 NUEVO: Promedios reales calculados
            promedioAnual: parseFloat(promedioAnual.toFixed(2)),
            promedioTrimestral: parseFloat(promedioTrimestral.toFixed(2)),
            tasaCompletitud // 🔥 NUEVO
          }
        };
      })
    );

    // 🔥 SIMPLIFICADO: Solo filtro de valoración
    let estadisticasOrdenadas = estadisticasDepartamentos;
    
    if (ordenarPor === 'valoracion' && ordenDireccion) {
      estadisticasOrdenadas = estadisticasDepartamentos.sort((a, b) => {
        const valorA = calcularValoracionPromedio(a.estadisticas.valoracion);
        const valorB = calcularValoracionPromedio(b.estadisticas.valoracion);
        
        // Aplicar dirección del ordenamiento
        if (ordenDireccion === 'desc') {
          return valorB > valorA ? 1 : valorB < valorA ? -1 : 0;
        } else {
          // asc (por defecto)
          return valorA > valorB ? 1 : valorA < valorB ? -1 : 0;
        }
      });
    }
    
    // Función auxiliar para calcular valoración promedio ponderada
    function calcularValoracionPromedio(valoracion) {
      const pesos = {
        'EXCELENTE': 5,
        'SOBRESALIENTE': 4,
        'BUENO': 3,
        'ACEPTABLE': 2,
        'DEFICIENTE': 1
      };
      
      let totalPonderado = 0;
      let totalEvaluaciones = 0;
      
      Object.entries(valoracion).forEach(([nivel, cantidad]) => {
        if (pesos[nivel] && cantidad > 0) {
          totalPonderado += pesos[nivel] * cantidad;
          totalEvaluaciones += cantidad;
        }
      });
      
      return totalEvaluaciones > 0 ? totalPonderado / totalEvaluaciones : 0;
    }

    res.status(200).json({
      status: 'success',
      data: {
        departamentos: estadisticasOrdenadas
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener las estadísticas por departamento',
      error: error.message
    });
  }
});

// Obtener seguimiento de evaluaciones por departamento
exports.obtenerSeguimientoPorDepartamento = catchAsync(async (req, res) => {
  const { periodo } = req.query;
  
  // Función para obtener fechas del Q actual dinámicamente
  const obtenerFechasQActual = () => {
    const fechaActual = new Date();
    const anio = fechaActual.getFullYear();
    const mes = fechaActual.getMonth(); // 0-11
    
    let qInicio, qFin;
    
    if (mes >= 0 && mes <= 2) { // Q1: Enero-Marzo
      qInicio = new Date(anio, 0, 1); // 1 de Enero
      qFin = new Date(anio, 2, 31); // 31 de Marzo
    } else if (mes >= 3 && mes <= 5) { // Q2: Abril-Junio
      qInicio = new Date(anio, 3, 1); // 1 de Abril
      qFin = new Date(anio, 5, 30); // 30 de Junio
    } else if (mes >= 6 && mes <= 8) { // Q3: Julio-Septiembre
      qInicio = new Date(anio, 6, 1); // 1 de Julio
      qFin = new Date(anio, 8, 30); // 30 de Septiembre
    } else { // Q4: Octubre-Diciembre
      qInicio = new Date(anio, 9, 1); // 1 de Octubre
      qFin = new Date(anio, 11, 31); // 31 de Diciembre
    }
    
    return { qInicio, qFin };
  };

  // Función para calcular fecha límite basada en el Q actual
  const calcularFechaLimite = (fechaIngreso, periodicidad, mesesDesdeIngreso, periodoSeleccionado) => {
    // Obtener fechas del Q actual dinámicamente
    const { qInicio, qFin } = obtenerFechasQActual();
    
    if (periodicidad === 'anual') {
      // Verificar si es primer año o usuario antiguo
      if (mesesDesdeIngreso >= 12 && mesesDesdeIngreso < 24) {
        // Primer año: calcular fecha exacta de evaluación + 5 días
        const fechaIngresoObj = new Date(fechaIngreso + 'T00:00:00-05:00'); // Corregir timezone
        const fechaEvaluacion = new Date(fechaIngresoObj);
        fechaEvaluacion.setFullYear(fechaEvaluacion.getFullYear() + 1);
        // Corregir el día para que sea exacto
        fechaEvaluacion.setDate(fechaIngresoObj.getDate());
        
        // Verificar si esta evaluación cae dentro del Q actual
        if (fechaEvaluacion >= qInicio && fechaEvaluacion <= qFin) {
          // Sumar 5 días de forma robusta
          const fechaLimite = new Date(fechaEvaluacion);
          fechaLimite.setTime(fechaLimite.getTime() + (5 * 24 * 60 * 60 * 1000));
          const resultado = fechaLimite.toISOString().split('T')[0];
          return resultado;
        } else {
          return null;
        }
      } else if (mesesDesdeIngreso >= 24) {
        // Usuario antiguo: siempre 31 de diciembre del año actual (Q4)
        return null;
      } else {
        // Entre 9.5 y 12 meses: anual pero sin cumplir año completo - calcular fecha exacta
        const fechaIngresoObj = new Date(fechaIngreso + 'T00:00:00-05:00'); // Corregir timezone
        const fechaEvaluacion = new Date(fechaIngresoObj);
        fechaEvaluacion.setFullYear(fechaEvaluacion.getFullYear() + 1);
        // Corregir el día para que sea exacto
        fechaEvaluacion.setDate(fechaIngresoObj.getDate());
        
        // Verificar si esta evaluación cae dentro del Q actual
        if (fechaEvaluacion >= qInicio && fechaEvaluacion <= qFin) {
          // Sumar 5 días de forma robusta
          const fechaLimite = new Date(fechaEvaluacion);
          fechaLimite.setTime(fechaLimite.getTime() + (5 * 24 * 60 * 60 * 1000));
          const resultado = fechaLimite.toISOString().split('T')[0];
          return resultado;
        } else {
          return null;
        }
      }
    } else {
      // Evaluaciones trimestrales: cada 3 meses exactos desde la fecha de ingreso
      const fechaIngresoObj = new Date(fechaIngreso + 'T00:00:00-05:00'); // Corregir timezone
      
      // Calcular todas las evaluaciones trimestrales hasta la fecha actual
      const evaluaciones = [];
      let mesesTranscurridos = 0;
      
      // Calcular evaluaciones cada 3 meses
      while (mesesTranscurridos <= 24) { // hasta 2 años
        const fechaEvaluacion = new Date(fechaIngresoObj);
        fechaEvaluacion.setMonth(fechaEvaluacion.getMonth() + mesesTranscurridos);
        
        // Verificar si esta evaluación cae dentro del Q actual
        if (fechaEvaluacion >= qInicio && fechaEvaluacion <= qFin) {
          // Esta es la evaluación del Q actual
          const fechaLimite = new Date(fechaEvaluacion);
          fechaLimite.setTime(fechaLimite.getTime() + (5 * 24 * 60 * 60 * 1000));
          const resultado = fechaLimite.toISOString().split('T')[0];
          return resultado;
        }
        
        mesesTranscurridos += 3;
      }
      
      return null;
    }
  };
  
  // Obtener roles necesarios
  const rolEmpleado = await Rol.findOne({ where: { nombre: 'empleado' } });
  const rolEvaluador = await Rol.findOne({ where: { nombre: 'evaluador' } });
  
  const departamentos = await Departamento.findAll({
    where: { estado: true },
    include: [
      {
        model: Usuario,
        as: 'usuarios',
        where: { estado: 'activo' },
        include: [
          {
            model: Rol,
            as: 'rol',
            where: { nombre: ['empleado', 'evaluador'] } // Incluir empleados y evaluadores
          },
          {
            model: Cargo,
            as: 'cargo',
            attributes: ['id', 'nombre'],
            required: false
          }
        ]
      }
    ],
    order: [
      ['nombre', 'ASC'],
      [{ model: Usuario, as: 'usuarios' }, 'apellido', 'ASC']
    ]
  });

  // Obtener el periodo solicitado o el actual
  const getPeriodo = (periodoParam) => {
    if (periodoParam) {
      // Extraer solo el trimestre (Q1, Q2, Q3, Q4) del formato YYYY-Qx
      const match = periodoParam.match(/Q([1-4])/);
      return match ? `Q${match[1]}` : 'Q1';
    }
    
    const month = new Date().getMonth() + 1; // Meses 1-12
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
  };

  const selectedPeriodo = getPeriodo(periodo);
  const selectedAnio = periodo ? parseInt(periodo.split('-')[0]) || new Date().getFullYear() : new Date().getFullYear();

  const seguimiento = await Promise.all(
    departamentos.map(async (depto) => {
      const usuarios = depto.usuarios || [];
      
      // Separar evaluadores y empleados
      const evaluadores = usuarios.filter(u => u.rol.nombre === 'evaluador');
      const empleados = usuarios.filter(u => u.rol.nombre === 'empleado');
      
      // Para cada evaluador, obtener TODAS sus evaluaciones asignadas (incluyendo las no creadas)
        const evaluacionesPorEvaluador = await Promise.all(
          evaluadores.map(async (evaluador) => {
            // Obtener empleados del mismo departamento que este evaluador debe evaluar
            const empleadosAsignados = await Usuario.findAll({
              where: { 
                estado: 'activo',
                rol_id: rolEmpleado.id,
                departamento_id: depto.id // Solo empleados del mismo departamento
              },
              include: [
                {
                  model: Cargo,
                  as: 'cargo',
                  attributes: ['id', 'nombre'],
                  required: false
                }
              ]
            });

                        
            // Obtener evaluaciones existentes de este evaluador
            const evaluacionesExistentes = await Evaluacion.findAll({
              where: { 
                evaluador_id: evaluador.id,
                periodo: selectedPeriodo,
                anio: selectedAnio
              },
              attributes: [
                'id', 
                'evaluado_id', 
                'estado', 
                'periodicidad',
                'puntuacion_total', 
                'valoracion_anual',
                'valoracion_trimestral',
                'fecha_fin'
              ]
            });
            
            
            // Crear mapa de evaluaciones existentes por evaluadoId
            const evaluacionesExistentesMap = new Map();
            evaluacionesExistentes.forEach(evaluacion => {
              const evaluadoId = evaluacion.get('evaluado_id');
              evaluacionesExistentesMap.set(evaluadoId, evaluacion);
                          });

            // 🔥 SIMPLIFICAR: Incluir TODOS los empleados con evaluaciones existentes + los que deben tener evaluación
            const empleadosFiltrados = await Promise.all(
              empleadosAsignados.map(async (empleado) => {
                // 🔥 SIEMPRE incluir si tiene evaluación existente (sin importar si "debe tener")
                const evaluacionExistente = evaluacionesExistentesMap.get(empleado.id);
                if (evaluacionExistente) {
                  return empleado;
                }
                
                // Si no tiene evaluación existente, verificar si debe tener una
                if (!empleado.fecha_ingreso_empresa) {
                  return null;
                }
                
                const fechaIngreso = new Date(empleado.fecha_ingreso_empresa);
                const fechaReferencia = new Date(selectedAnio, 
                  selectedPeriodo === 'Q1' ? 2 : selectedPeriodo === 'Q2' ? 5 : selectedPeriodo === 'Q3' ? 8 : 11, 15);
                const mesesDesdeIngreso = calcularMesesDiferencia(fechaIngreso, fechaReferencia);
                
                // Aplicar lógica de evaluaciones esperadas
                let debeTenerEvaluacion = false;
                
                if (mesesDesdeIngreso < 12) {
                  // Menos de 1 año: evaluaciones trimestrales cada 3 meses exactos
                  const trimestresCompletados = Math.floor(mesesDesdeIngreso / 3);
                  
                  if (trimestresCompletados >= 1) {
                    debeTenerEvaluacion = true;
                  }
                } else {
                  // Más de 1 año: SOLO evaluaciones anuales
                  if (mesesDesdeIngreso >= 12 && mesesDesdeIngreso < 15) {
                    // Caso 1: Cumple exactamente 12 meses en este trimestre (12-14 meses)
                    debeTenerEvaluacion = true;
                  } else {
                    // Caso 2: Ya tuvo su primera anual, verificar si le toca anual este año
                    const evaluacionAnualExistente = await Evaluacion.findOne({
                      where: {
                        evaluado_id: empleado.id,
                        periodicidad: 'anual',
                        anio: selectedAnio
                      }
                    });
                    
                    if (!evaluacionAnualExistente && selectedPeriodo === 'Q4') {
                      // No tiene anual este año y estamos en Q4, le toca anual
                      debeTenerEvaluacion = true;
                    }
                  }
                }
                
                return debeTenerEvaluacion ? empleado : null;
              })
            );
            
            // Filtrar nulos y mantener solo empleados que deben tener evaluación
            const empleadosConEvaluacion = empleadosFiltrados.filter(emp => emp !== null);

          // Generar lista completa de evaluaciones (existentes + pendientes por crear)
          const todasLasEvaluaciones = empleadosConEvaluacion.map(empleado => {
            const evaluacionExistente = evaluacionesExistentesMap.get(empleado.id);
            
            // 🔥 CALCULAR PERIODICIDAD BASADO EN FECHA DE INGRESO (9.5 meses para anual)
            let periodicidadCalculada = 'trimestral'; // Por defecto
            let mesesDesdeIngreso = 0;
            
            if (empleado.fecha_ingreso_empresa) {
              const fechaIngreso = new Date(empleado.fecha_ingreso_empresa);
              const fechaActual = new Date();
              
              // Cálculo preciso de meses diferencia
              const yearDiff = fechaActual.getFullYear() - fechaIngreso.getFullYear();
              const monthDiff = fechaActual.getMonth() - fechaIngreso.getMonth();
              mesesDesdeIngreso = yearDiff * 12 + monthDiff;
              
              // Ajustar por día del mes
              if (fechaActual.getDate() < fechaIngreso.getDate()) {
                mesesDesdeIngreso -= 1;
              }
              
              // 🔥 A partir de 9.5 meses es anual (últimos 3 meses del primer año)
              periodicidadCalculada = mesesDesdeIngreso >= 9.5 ? 'anual' : 'trimestral';
            }
            
            if (evaluacionExistente) {
              // Evaluación REAL existe
              return {
                id: evaluacionExistente.id,
                evaluado: {
                  id: empleado.id,
                  nombre: empleado.nombre,
                  apellido: empleado.apellido,
                  cargo: empleado.cargo,
                  fechaIngreso: empleado.fecha_ingreso_empresa
                },
                estado: evaluacionExistente.get('estado'),
                puntuacion: evaluacionExistente.get('puntuacion_total'),
                valoracion: evaluacionExistente.get('valoracion_anual') || evaluacionExistente.get('valoracion_trimestral'),
                fechaFin: evaluacionExistente.get('fecha_fin'),
                periodicidad: evaluacionExistente.get('periodicidad')
              };
            } else {
              // Evaluación SUPUESTA (no existe en BD)
              return {
                id: null,
                evaluado: {
                  id: empleado.id,
                  nombre: empleado.nombre,
                  apellido: empleado.apellido,
                  cargo: empleado.cargo,
                  fechaIngreso: empleado.fecha_ingreso_empresa
                },
                estado: 'pendiente',
                puntuacion: null,
                valoracion: null,
                periodicidad: periodicidadCalculada
              };
            }
          });

          const estadisticas = todasLasEvaluaciones.reduce((acc, evaluacion) => {
            acc.total++;
            if (evaluacion.estado === 'completada') acc.completadas++;
            else if (evaluacion.estado === 'pendiente') acc.pendientes++;
            else if (evaluacion.estado === 'en_progreso') acc.enProgreso++;
            return acc;
          }, { total: 0, completadas: 0, pendientes: 0, enProgreso: 0 });

          return {
            usuario: {
              id: evaluador.id,
              nombre: evaluador.nombre,
              apellido: evaluador.apellido,
              email: evaluador.email,
              cargo: evaluador.cargo?.nombre || 'Sin cargo',
              rol: 'evaluador'
            },
            totalEvaluaciones: estadisticas.total,
            evaluacionesCompletadas: estadisticas.completadas,
            evaluacionesPendientes: estadisticas.pendientes,
            evaluacionesEnProgreso: estadisticas.enProgreso,
            evaluacionesDetalle: todasLasEvaluaciones,
            ultimaEvaluacion: evaluacionesExistentes.length > 0 ? 
              Math.max(...evaluacionesExistentes.map(e => new Date(e.updated_at))) : null
          };
        })
      );
      
      // Para cada empleado, obtener sus evaluaciones como evaluado
      const evaluacionesPorEmpleado = await Promise.all(
        empleados.map(async (empleado) => {
          const evaluaciones = await Evaluacion.findAll({
            where: { 
              evaluado_id: empleado.id,
              periodo: selectedPeriodo,
              anio: selectedAnio
            }
          });

          return {
            usuario: {
              id: empleado.id,
              nombre: empleado.nombre,
              apellido: empleado.apellido,
              email: empleado.email,
              cargo: empleado.cargo?.nombre || 'Sin cargo',
              rol: 'empleado'
            },
            totalEvaluaciones: evaluaciones.length,
            evaluacionesCompletadas: evaluaciones.filter(e => e.estado === 'completada').length,
            evaluacionesPendientes: evaluaciones.filter(e => ['pendiente', 'en_progreso'].includes(e.estado)).length,
            ultimaEvaluacion: evaluaciones.length > 0 ? 
              Math.max(...evaluaciones.map(e => new Date(e.updated_at))) : null
          };
        })
      );

      // Combinar todos los usuarios y calcular estadísticas únicas del departamento
      const todosLosUsuarios = [...evaluacionesPorEvaluador, ...evaluacionesPorEmpleado];
      
      // Obtener todas las evaluaciones únicas del departamento para este periodo
      const todasLasEvaluacionesDepto = await Evaluacion.findAll({
        where: { 
          periodo: selectedPeriodo,
          anio: selectedAnio
        },
        include: [
          {
            model: Usuario,
            as: 'evaluado',
            where: { departamento_id: depto.id },
            include: [
              {
                model: Cargo,
                as: 'cargo',
                attributes: ['id', 'nombre'],
                required: false
              }
            ]
          }
        ]
      });

      // Calcular estadísticas correctas del departamento
      // Contar todos los empleados activos como evaluaciones esperadas
      const totalEmpleadosDepto = empleados.length;
      const totalEvaluacionesEsperadas = totalEmpleadosDepto * evaluadores.length;
      
      // Pero si no hay evaluadores, el total es solo el número de empleados
      const totalEvaluaciones = evaluadores.length > 0 ? totalEvaluacionesEsperadas : totalEmpleadosDepto;
      
      const deptoStats = todasLasEvaluacionesDepto.reduce((acc, evaluacion) => {
        acc.completadas++;
        if (evaluacion.estado === 'pendiente') acc.pendientes++;
        else if (evaluacion.estado === 'en_progreso') acc.enProgreso++;
        return acc;
      }, { totalEvaluaciones, completadas: 0, pendientes: 0, enProgreso: 0 });

      return {
        departamento: {
          id: depto.id,
          nombre: depto.nombre
        },
        stats: deptoStats,
        usuarios: todosLosUsuarios.sort((a, b) => a.usuario.apellido.localeCompare(b.usuario.apellido))
      };
    })
  );

  res.status(200).json({
    status: 'success',
    results: seguimiento.length,
    data: {
      seguimiento
    }
  });
});

// Obtener detalles de evaluaciones de un líder específico
exports.obtenerDetalleEvaluacionesLider = catchAsync(async (req, res) => {
  const { liderId } = req.params;
  const { periodo } = req.query;
  
  // Función para calcular fecha límite (fecha de evaluación + 5 días)
  const calcularFechaLimite = (fechaEvaluacion) => {
    const fechaLimite = new Date(fechaEvaluacion);
    fechaLimite.setDate(fechaLimite.getDate() + 5);
    return fechaLimite.toISOString().split('T')[0];
  };
  
  // Verificar que el líder existe y es evaluador
  const lider = await Usuario.findOne({
    where: { 
      id: liderId,
      estado: 'activo'
    },
    include: [
      {
        model: Rol,
        as: 'rol',
        where: { nombre: 'evaluador' }
      },
      {
        model: Departamento,
        as: 'departamento'
      }
    ]
  });

  if (!lider) {
    return res.status(404).json({
      status: 'error',
      message: 'Líder no encontrado o no tiene rol de evaluador'
    });
  }

  // Construir filtro de periodo
  const filtroEvaluacion = { evaluador_id: liderId };
  if (periodo) {
    // Extraer solo el trimestre (Q1, Q2, Q3, Q4) del formato YYYY-Qx
    const match = periodo.match(/Q([1-4])/);
    filtroEvaluacion.periodo = match ? `Q${match[1]}` : 'Q1';
    filtroEvaluacion.anio = parseInt(periodo.split('-')[0]) || new Date().getFullYear();
  }

  // Obtener todas las evaluaciones del líder
  const evaluaciones = await Evaluacion.findAll({
    where: filtroEvaluacion,
    include: [
      {
        model: Usuario,
        as: 'evaluado',
        attributes: ['id', 'nombre', 'apellido', 'email', 'cargo_id'],
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
      }
    ],
    order: [['fecha_fin', 'DESC']]
  });

  // Modificar las evaluaciones para incluir fecha límite
  const evaluacionesConFechaLimite = evaluaciones.map(evaluacion => {
    const evaluacionJSON = evaluacion.toJSON();
    
    // Calcular fecha límite basada en la fecha de inicio o fin
    const fechaBase = evaluacion.fecha_fin || evaluacion.fecha_inicio || new Date();
    evaluacionJSON.fechaLimite = calcularFechaLimite(fechaBase);
    
    return evaluacionJSON;
  });

  const estadisticas = {
    total: evaluaciones.length,
    completadas: evaluaciones.filter(e => e.estado === 'completada').length,
    pendientes: evaluaciones.filter(e => e.estado === 'pendiente').length,
    en_progreso: evaluaciones.filter(e => e.estado === 'en_progreso').length
  };

  res.status(200).json({
    status: 'success',
    data: {
      lider: {
        id: lider.id,
        nombre: lider.nombre,
        apellido: lider.apellido,
        email: lider.email,
        departamento: lider.departamento
      },
      estadisticas,
      evaluaciones: evaluacionesConFechaLimite
    }
  });
});

// Obtener evaluación para gestión (acceso para rol gestión)
exports.obtenerEvaluacionParaGestion = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const evaluacion = await Evaluacion.findOne({
    where: { id },
    include: [
      {
        model: Usuario,
        as: 'evaluado',
        attributes: ['id', 'nombre', 'apellido', 'email', 'cargo_id'],
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
      },
      {
        model: Usuario,
        as: 'evaluador',
        attributes: ['id', 'nombre', 'apellido', 'email']
      },
      {
        model: Formulario,
        as: 'formulario',
        include: [
          {
            model: Pregunta,
            as: 'preguntas'
          }
        ]
      }
    ]
  });

  if (!evaluacion) {
    return res.status(404).json({
      status: 'error',
      message: 'Evaluación no encontrada'
    });
  }

  // Obtener respuestas por separado para evitar problemas de include
  const respuestas = await Respuesta.findAll({
    where: { evaluacion_id: id },
    attributes: ['pregunta_id', 'respuesta']
  });

  // Transformar respuestas a formato plano
  const respuestasPlano = {};
  respuestas.forEach(respuesta => {
    respuestasPlano[respuesta.pregunta_id] = respuesta.respuesta;
  });

  res.status(200).json({
    status: 'success',
    data: {
      evaluacion: {
        ...evaluacion.toJSON(),
        respuestas: respuestasPlano
      }
    }
  });
});

// Obtener reportes y estadísticas avanzadas
exports.obtenerReportesGestion = catchAsync(async (req, res) => {
  const { periodo, departamentoId } = req.query;
  const añoActual = periodo || new Date().getFullYear();

  // Construir filtros - corregir para usar anio en lugar de periodo
  const whereClause = {
    anio: añoActual
  };

  if (departamentoId) {
    // Agregar filtro por departamento a través de las relaciones
    whereClause[Op.or] = [
      { '$evaluado.departamento_id$': departamentoId },
      { '$evaluador.departamento_id$': departamentoId }
    ];
  }

  // Obtener evaluaciones con relaciones
  const evaluaciones = await Evaluacion.findAll({
    where: whereClause,
    include: [
      {
        model: Usuario,
        as: 'evaluado',
        include: [
          {
            model: Departamento,
            as: 'departamento'
          }
        ]
      },
      {
        model: Usuario,
        as: 'evaluador',
        include: [
          {
            model: Departamento,
            as: 'departamento'
          }
        ]
      }
    ]
  });

  // Estadísticas por departamento
  const statsPorDepartamento = {};
  evaluaciones.forEach(evaluacion => {
    const deptoNombre = evaluacion.evaluado?.departamento?.nombre || 'Sin departamento';
    
    if (!statsPorDepartamento[deptoNombre]) {
      statsPorDepartamento[deptoNombre] = {
        total: 0,
        completadas: 0,
        pendientes: 0,
        en_progreso: 0
      };
    }
    
    statsPorDepartamento[deptoNombre].total++;
    statsPorDepartamento[deptoNombre][evaluacion.estado]++;
  });

  // Estadísticas por mes
  const statsPorMes = {};
  evaluaciones.forEach(evaluacion => {
    const mes = new Date(evaluacion.created_at).toLocaleString('es', { month: 'long', year: 'numeric' });
    
    if (!statsPorMes[mes]) {
      statsPorMes[mes] = {
        total: 0,
        completadas: 0,
        pendientes: 0,
        en_progreso: 0
      };
    }
    
    statsPorMes[mes].total++;
    statsPorMes[mes][evaluacion.estado]++;
  });

  // Tendencia de completitud
  const tendencia = Object.keys(statsPorMes).map(mes => ({
    mes,
    tasaCompletitud: statsPorMes[mes].total > 0 ? 
      Math.round((statsPorMes[mes].completadas / statsPorMes[mes].total) * 100) : 0,
    total: statsPorMes[mes].total
  }));

  res.status(200).json({
    status: 'success',
    data: {
      resumen: {
        totalEvaluaciones: evaluaciones.length,
        completadas: evaluaciones.filter(e => e.estado === 'completada').length,
        pendientes: evaluaciones.filter(e => e.estado === 'pendiente').length,
        en_progreso: evaluaciones.filter(e => e.estado === 'en_progreso').length,
        tasaCompletitudGeneral: evaluaciones.length > 0 ? 
          Math.round((evaluaciones.filter(e => e.estado === 'completada').length / evaluaciones.length) * 100) : 0
      },
      porDepartamento: statsPorDepartamento,
      porMes: statsPorMes,
      tendencia
    }
  });
});

// Buscar usuarios para asignación de evaluaciones (solo gestión)
exports.buscarUsuariosParaAsignacion = catchAsync(async (req, res) => {
  const { termino, departamentoId } = req.query;
  
  try {
    const whereClause = {};
    
    // Filtrar por término de búsqueda (nombre, apellido o email)
    if (termino) {
      // Limpiar el término sin decodificar (axios ya lo envía codificado correctamente)
      const terminoLimpio = termino.trim();
      
      if (terminoLimpio.length > 0) {
        // Dividir el término en palabras para búsqueda combinada
        const palabras = terminoLimpio.split(/\s+/).filter(p => p.length > 0);
        
        if (palabras.length === 1) {
          // Búsqueda simple de una palabra
          whereClause[Op.or] = [
            { nombre: { [Op.iLike]: `%${palabras[0]}%` } },
            { apellido: { [Op.iLike]: `%${palabras[0]}%` } },
            { email: { [Op.iLike]: `%${palabras[0]}%` } }
          ];
        } else if (palabras.length === 2) {
          // Búsqueda de dos palabras (nombre + apellido)
          whereClause[Op.or] = [
            // Nombre contiene primera palabra Y apellido contiene segunda palabra
            { 
              [Op.and]: [
                { nombre: { [Op.iLike]: `%${palabras[0]}%` } },
                { apellido: { [Op.iLike]: `%${palabras[1]}%` } }
              ]
            },
            // Nombre contiene segunda palabra Y apellido contiene primera palabra
            { 
              [Op.and]: [
                { nombre: { [Op.iLike]: `%${palabras[1]}%` } },
                { apellido: { [Op.iLike]: `%${palabras[0]}%` } }
              ]
            },
            // Nombre contiene ambas palabras
            { nombre: { [Op.iLike]: `%${palabras[0]}% ${palabras[1]}%` } },
            // Apellido contiene ambas palabras
            { apellido: { [Op.iLike]: `%${palabras[0]}% ${palabras[1]}%` } },
            // Email contiene término completo
            { email: { [Op.iLike]: `%${terminoLimpio}%` } }
          ];
        } else {
          // Búsqueda de más de dos palabras (buscar término completo)
          whereClause[Op.or] = [
            { nombre: { [Op.iLike]: `%${terminoLimpio}%` } },
            { apellido: { [Op.iLike]: `%${terminoLimpio}%` } },
            { email: { [Op.iLike]: `%${terminoLimpio}%` } }
          ];
        }
      }
    }
    
    // Filtrar por departamento si se especifica
    if (departamentoId) whereClause.departamento_id = departamentoId;
    
    // Mostrar empleados y evaluadores (roles 2 y 3)
    whereClause.rol_id = [2, 3]; // IDs de roles: empleado y evaluador
    
    const usuarios = await Usuario.findAll({
      where: whereClause,
      include: [
        {
          model: Rol,
          as: 'rol',
          attributes: ['id', 'nombre']
        },
        {
          model: Departamento,
          as: 'departamento',
          attributes: ['id', 'nombre']
        },
        {
          model: Cargo,
          as: 'cargo',
          attributes: ['id', 'nombre']
        }
      ],
      attributes: ['id', 'nombre', 'apellido', 'email', 'fecha_ingreso_empresa'],
      limit: 20
    });
    
    res.status(200).json({
      status: 'success',
      data: usuarios
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al buscar usuarios',
      error: error.message
    });
  }
});

// Obtener última evaluación de un empleado
exports.obtenerUltimaEvaluacionEmpleado = catchAsync(async (req, res) => {
  const { empleadoId } = req.params;
  
  try {
    const ultimaEvaluacion = await Evaluacion.findOne({
      where: {
        evaluado_id: empleadoId
      },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Usuario,
          as: 'evaluador',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: Usuario,
          as: 'evaluado',
          attributes: ['id', 'nombre', 'apellido']
        },
        {
          model: Departamento,
          as: 'departamento',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    res.status(200).json({
      status: 'success',
      data: ultimaEvaluacion
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener última evaluación',
      error: error.message
    });
  }
});

// Asignar evaluación manual (solo gestión)
exports.asignarEvaluacionManual = catchAsync(async (req, res) => {
  const { 
    evaluadorId, 
    empleadoId, 
    tipo, 
    periodo, 
    anio, 
    fechaLimite,
    esExistente = false // Nuevo parámetro para saber si es evaluación existente
  } = req.body;
  
  try {
    // Obtener datos del empleado para determinar departamento
    const empleado = await Usuario.findByPk(empleadoId, {
      include: [
        {
          model: Departamento,
          as: 'departamento',
          attributes: ['id', 'nombre']
        },
        {
          model: Cargo,
          as: 'cargo',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    if (!empleado) {
      return res.status(404).json({
        status: 'error',
        message: 'Empleado no encontrado'
      });
    }
    
    // Buscar evaluador del departamento si no se especifica
    let evaluadorFinalId = evaluadorId;
    if (!evaluadorId) {
            const evaluador = await Usuario.findOne({
        where: {
          departamento_id: empleado.departamento_id,
          rol_id: 2, // rol evaluador
          estado: 'activo'
        }
      });
      
      if (!evaluador) {
                return res.status(404).json({
          status: 'error',
          message: 'No se encontró un evaluador para este departamento'
        });
      }
      
      evaluadorFinalId = evaluador.id;
          }
    
    // Verificar si ya existe una evaluación completada para este período y año
    const evaluacionCompletadaExistente = await Evaluacion.findOne({
      where: {
        evaluadoId: empleadoId,
        periodo: periodo,
        anio: anio,
        estado: 'completada'
      }
    });
    
    if (evaluacionCompletadaExistente) {
      return res.status(400).json({
        status: 'error',
        message: `Este empleado ya tiene una evaluación completada para el período ${periodo} ${anio}. No se puede crear una nueva evaluación para el mismo período.`,
        evaluacionExistente: true,
        periodo: periodo,
        anio: anio
      });
    }
    
    let evaluacion;
    
    if (esExistente) {
      // Caso A: Cambiar estado de evaluación existente
      evaluacion = await Evaluacion.findOne({
        where: {
          evaluadoId: empleadoId,
          evaluadorId: evaluadorFinalId,
          periodo: periodo,
          anio: anio
        }
      });
      
      if (!evaluacion) {
        return res.status(404).json({
          status: 'error',
          message: 'Evaluación existente no encontrada'
        });
      }
      
      // Cambiar estado a asignada
      await evaluacion.update({
        estado: 'asignada'
      });
      
    } else {
      // Caso B: Crear nueva evaluación
      // Verificar que no exista evaluación duplicada (que no sea completada)
      const evaluacionExistente = await Evaluacion.findOne({
        where: {
          evaluadoId: empleadoId,
          evaluadorId: evaluadorFinalId,
          periodo: periodo,
          anio: anio,
          estado: { [Op.ne]: 'completada' } // Excluir completadas
        }
      });
      
      if (evaluacionExistente) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe una evaluación activa para este empleado, evaluador y período'
        });
      }
      
      // Obtener fecha local actual para evitar problemas de timezone
      const ahora = new Date();
      const fechaLocal = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
      
      // Obtener el formulario correspondiente usando la misma lógica que el evaluador
      let formulario = null;
      
      // Calcular periodicidad basada en fecha de ingreso (misma lógica que evaluador)
      const periodicidadCalculada = calcularPeriodicidadPorFechaIngreso(empleado.fecha_ingreso_empresa, new Date());
      
      if (periodicidadCalculada === 'trimestral') {
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
                id: empleado.cargo_id
              },
              through: {
                attributes: []
              }
            }
          ]
        });
      }
      
      const formulario_id = formulario ? formulario.id : null;
      
      if (!formulario) {
        // Sin formulario activo, continuar sin él
      }
      
      // Crear nueva evaluación
      evaluacion = await Evaluacion.create({
        evaluadorId: evaluadorFinalId,
        evaluadoId: empleadoId,
        departamento_id: empleado.departamento_id,
        cargo_id: empleado.cargo_id,
        periodo: periodo,
        anio: anio,
        periodicidad: tipo,
        estado: 'asignada',
        fechaInicio: fechaLocal.toISOString().split('T')[0],
        fechaLimite: fechaLimite,
        formulario_id: formulario_id // 🔥 IMPORTANTE: Asignar el formulario correcto
      });
      
          }
    
    // Obtener evaluación completa con relaciones
    const evaluacionCompleta = await Evaluacion.findByPk(evaluacion.id, {
      include: [
        {
          model: Usuario,
          as: 'evaluador',
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: Usuario,
          as: 'evaluado',
          attributes: ['id', 'nombre', 'apellido', 'email']
        },
        {
          model: Departamento,
          as: 'departamento',
          attributes: ['id', 'nombre']
        },
        {
          model: Cargo,
          as: 'cargo',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    // Enviar notificación de evaluación asignada al líder del departamento
    try {
      await notificationService.notificarNuevaEvaluacionAsignada(evaluacion.id);
          } catch (notificationError) {
      // No fallamos la petición si las notificaciones fallan
    }
    
    res.status(201).json({
      status: 'success',
      message: esExistente ? 'Evaluación asignada correctamente' : 'Evaluación creada y asignada correctamente',
      data: {
        ...evaluacionCompleta.toJSON(),
        evaluadorAsignado: {
          id: evaluadorFinalId,
          tipo: evaluadorId ? 'manual' : 'automatico'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al asignar evaluación',
      error: error.message
    });
  }
});

// Obtener valoración trimestral promedio por departamento para gráficas
exports.obtenerValoracionTrimestralPorDepartamento = catchAsync(async (req, res) => {
  try {
    const { trimestre, anio } = req.query;
    
    // Determinar trimestre y año actuales si no se especifican
    const fechaActual = new Date();
    const trimestreActual = trimestre || `Q${Math.floor(fechaActual.getMonth() / 3) + 1}`;
    const anioActual = anio || fechaActual.getFullYear();
    
    // Obtener todos los departamentos activos
    const departamentos = await Departamento.findAll({
      where: { estado: true },
      include: [
        {
          model: Usuario,
          as: 'usuarios',
          where: { 
            estado: 'activo',
            rol_id: (await Rol.findOne({ where: { nombre: 'empleado' } }))?.id
          },
          required: false
        }
      ]
    });

    // Función para determinar valoración trimestral a partir de puntuación
    const determinarValoracionTrimestral = (puntuacion) => {
      if (puntuacion >= 80 && puntuacion <= 100) return 'DESTACADO';
      if (puntuacion >= 60 && puntuacion <= 79) return 'BUENO';
      if (puntuacion >= 25 && puntuacion <= 59) return 'BAJO';
      return 'BAJO'; // Por debajo de 25 también es BAJO
    };

    // Para cada departamento, calcular promedio de valoración trimestral
    const valoracionPorDepartamento = await Promise.all(
      departamentos.map(async (depto) => {
        const empleados = depto.usuarios || [];
        
        if (empleados.length === 0) {
          return {
            departamento: depto.nombre,
            promedioPuntuacion: 0,
            valoracionTrimestral: 'SIN DATOS',
            totalEvaluaciones: 0
          };
        }

        // Obtener evaluaciones trimestrales completadas del departamento en el período
        const evaluaciones = await Evaluacion.findAll({
          where: {
            evaluado_id: empleados.map(emp => emp.id),
            periodo: trimestreActual,
            anio: anioActual,
            estado: 'completada',
            periodicidad: 'trimestral'
          }
          // Sin attributes para traer todos los campos
        });

        if (evaluaciones.length === 0) {
          return {
            departamento: depto.nombre,
            promedioPuntuacion: 0,
            valoracionTrimestral: 'SIN EVALUACIONES',
            totalEvaluaciones: 0
          };
        }

        // Promedio simple: SUM(puntuacion_total) / COUNT(evaluaciones)
        const totalPuntuacion = evaluaciones.reduce((sum, evaluacion) => {
          // Usar dataValues.puntuacionTotal que es donde está el valor real
          const puntuacion = evaluacion.dataValues?.puntuacionTotal || 0;
          return sum + parseFloat(puntuacion);
        }, 0);
        
        const promedioPuntuacion = totalPuntuacion / evaluaciones.length;

        // Determinar valoración a partir del promedio calculado
        const valoracionTrimestral = determinarValoracionTrimestral(promedioPuntuacion);

        return {
          departamento: depto.nombre,
          promedioPuntuacion: parseFloat(promedioPuntuacion.toFixed(2)),
          valoracionTrimestral,
          totalEvaluaciones: evaluaciones.length
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        periodo: trimestreActual,
        anio: anioActual,
        departamentos: valoracionPorDepartamento
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener valoración trimestral por departamento',
      error: error.message
    });
  }
});
