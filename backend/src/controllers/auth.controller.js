const bcrypt = require('bcryptjs');

const { Op } = require('sequelize');

const { Usuario, Rol, Departamento, Cargo } = require('../models');

const AppError = require('../utils/appError');

const catchAsync = require('../utils/catchAsync');

const crypto = require('crypto');

const { generateAccessToken, generateRefreshToken, verifyToken, verifyRefreshToken, getCookieOptions } = require('../utils/tokenUtils');

const { resetLoginAttempts } = require('../middleware/security/blockBruteForce');

const { sendPasswordResetEmail } = require('../utils/email');



const cargoInclude = {

  model: Cargo,

  as: 'cargo',

  attributes: ['id', 'nombre', 'descripcion']

};



const includeRelacionesUsuario = [

  { model: Rol, as: 'rol' },

  { model: Departamento, as: 'departamento' },

  cargoInclude

];



const normalizarAsociacion = (modelo) => {

  if (!modelo) return null;

  return typeof modelo.toJSON === 'function' ? modelo.toJSON() : modelo;

};



const construirRespuestaUsuario = (user) => {

  if (!user) return null;

  const cargoInfo = normalizarAsociacion(user.cargo);

  // Orden intuitivo: principales → organizacionales → relaciones
  return {
    // Campos principales (más usados)
    id: user.id,
    cedula: user.cedula,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    
    // Campos organizacionales
    empresa: user.empresa,
    fecha_ingreso_empresa: user.fecha_ingreso_empresa,
    cargo: cargoInfo?.nombre || null,
    rol_id: user.rol_id,
    departamento_id: user.departamento_id,
    
    // Objetos de relaciones (menos usados)
    cargoInfo,
    rol: normalizarAsociacion(user.rol),
    departamento: normalizarAsociacion(user.departamento)

  };

};



// Generar token de restablecimiento de contraseña

exports.forgotPassword = catchAsync(async (req, res, next) => {

  // 1) Obtener usuario basado en el email

  const user = await Usuario.findOne({ 

    where: { email: req.body.email },

    include: [

      { model: Rol, as: 'rol' },

      { model: Departamento, as: 'departamento' },

      cargoInclude

    ]

  });



  if (!user) {

    return next(new AppError('No hay ningún usuario con esa dirección de correo.', 404));

  }



  // 2) Generar el token de restablecimiento

  const resetToken = crypto.randomBytes(16).toString('hex'); // 32 caracteres en lugar de 64

  const passwordResetToken = crypto

    .createHash('sha256')

    .update(resetToken)

    .digest('hex');



  const passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutos en lugar de 1 hora // 1 hora



  // 3) Actualizar el usuario con el token y la fecha de expiración

  await user.update({

    passwordResetToken,

    passwordResetExpires

  });



  // 4) Enviar el correo electrónico

  try {

    await sendPasswordResetEmail(user, resetToken);

    

    res.status(200).json({
    // Campos principales de respuesta
    status: 'success',
    message: 'Se ha enviado un correo con las instrucciones para restablecer la contraseña.'
  });

  } catch (err) {
    // Si hay un error al enviar el correo, limpiar los campos
    await user.update({
      passwordResetToken: null,
      passwordResetExpires: null
    });

    return next(
      new AppError('Hubo un error al enviar el correo. Por favor, inténtalo de nuevo más tarde.', 500)
    );
  }
});



// Restablecer contraseña

exports.resetPassword = catchAsync(async (req, res, next) => {

  // 1) Obtener usuario basado en el token

  const hashedToken = crypto

    .createHash('sha256')

    .update(req.params.token)

    .digest('hex');



  const user = await Usuario.findOne({

    where: {

      passwordResetToken: hashedToken,

      passwordResetExpires: { [Op.gt]: Date.now() }

    },

    include: [

      { model: Rol, as: 'rol' },

      { model: Departamento, as: 'departamento' },

      cargoInclude

    ]

  });



  // 2) Si el token no ha expirado y hay un usuario, establecer la nueva contraseña

  if (!user) {

    return next(new AppError('El token es inválido o ha expirado', 400));

  }



  // 3) Actualizar la contraseña y limpiar los campos de restablecimiento

  user.password = req.body.password;

  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = null;

  user.passwordResetExpires = null;

  

  await user.save();



  // 4) Iniciar sesión del usuario, enviar JWT

  createSendTokens(user, 200, req, res);

});



// Actualizar contraseña para usuarios autenticados

exports.updatePassword = catchAsync(async (req, res, next) => {

  // 1) Obtener usuario de la colección

  const user = await Usuario.findByPk(req.user.id, {

    include: [

      { model: Rol, as: 'rol' },

      { model: Departamento, as: 'departamento' },

      cargoInclude

    ]

  });



  // 2) Verificar si la contraseña actual es correcta

  if (!(await user.validarPassword(req.body.currentPassword, user.password))) {

    return next(new AppError('Tu contraseña actual es incorrecta.', 401));

  }



  // 3) Si es correcta, actualizar la contraseña

  user.password = req.body.newPassword;

  user.passwordConfirm = req.body.newPasswordConfirm;

  await user.save();



  // 4) Iniciar sesión del usuario, enviar JWT

  createSendTokens(user, 200, req, res);

});



// Cambiar contraseña de usuario (solo admin)

exports.adminChangePassword = catchAsync(async (req, res, next) => {

  // 1) Obtener usuario a modificar

  const user = await Usuario.findByPk(req.params.userId, {

    include: [

      { model: Rol, as: 'rol' },

      { model: Departamento, as: 'departamento' },

      cargoInclude

    ]

  });



  if (!user) {

    return next(new AppError('Usuario no encontrado', 404));

  }



  // 2) Actualizar la contraseña sin afectar la sesión del admin

  user.password = req.body.password;

  user.passwordConfirm = req.body.passwordConfirm;

  

  // Guardar sin usar el método save() que podría afectar la sesión

  await user.update({

    password: req.body.password,

    passwordConfirm: req.body.passwordConfirm

  });



  // 3) Responder con éxito (sin generar nuevos tokens)

  res.status(200).json({
    // Campos principales de respuesta
    status: 'success',
    message: `Contraseña del usuario ${user.nombre} ${user.apellido} actualizada exitosamente`
  });

});



const resolverCargoId = async (cargoEntrada) => {

  if (cargoEntrada === undefined) {

    return { proporcionado: false };

  }



  if (cargoEntrada === null || cargoEntrada === '') {

    return { proporcionado: true, valor: null };

  }



  if (typeof cargoEntrada === 'object' && cargoEntrada) {

    if (cargoEntrada.id) {

      return { proporcionado: true, valor: cargoEntrada.id };

    }

    if (cargoEntrada.nombre) {

      const cargo = await Cargo.findOne({ where: { nombre: cargoEntrada.nombre.trim() } });

      if (!cargo) {

        throw new AppError('El cargo especificado no existe', 400);

      }

      return { proporcionado: true, valor: cargo.id };

    }

  }



  const posibleId = Number(cargoEntrada);

  if (!Number.isNaN(posibleId)) {

    return { proporcionado: true, valor: posibleId };

  }



  if (typeof cargoEntrada === 'string') {

    const cargo = await Cargo.findOne({ where: { nombre: cargoEntrada.trim() } });

    if (!cargo) {

      throw new AppError('El cargo especificado no existe', 400);

    }

    return { proporcionado: true, valor: cargo.id };

  }



  return { proporcionado: false };

};



// Crear y enviar tokens

const createSendTokens = async (user, statusCode, req, res) => {

  try {

    // 1) Generar tokens

    const accessToken = generateAccessToken(user.id);

    const refreshTokenObj = generateRefreshToken();

    

    // 2) Guardar el refresh token en la base de datos

    await user.update({ 

      refreshToken: refreshTokenObj.token,

      refreshTokenExpires: refreshTokenObj.expires

    });



    // 3) Configurar opciones de cookies

    const cookieOptions = getCookieOptions(req);



    // 4) Obtener la versión más reciente del usuario con sus relaciones

    const usuarioCompleto = await Usuario.findByPk(user.id, {

      include: includeRelacionesUsuario

    });



    if (!usuarioCompleto) {

      throw new AppError('No se pudo obtener la información del usuario', 500);

    }



    // 5) Configurar datos del usuario para la respuesta (sin información sensible)

    const userData = construirRespuestaUsuario(usuarioCompleto);



    // 6) Configurar cookie HTTP-Only segura para el refresh token

    res.cookie('jwt', refreshTokenObj.token, cookieOptions);



    // 7) Enviar respuesta con el access token
    res.status(statusCode).json({
      // Campos principales de respuesta
      status: 'success',
      accessToken,
      expiresIn: 15 * 60 * 1000, // 15 minutos en milisegundos
      
      // Datos del usuario (organizados)
      data: {
        user: userData
      }

    });

  } catch (error) {
    throw new AppError('Error al generar los tokens de autenticación', 500);

  }

};



// Registrar un nuevo usuario

exports.registro = async (req, res, next) => {

  try {

    const { cedula, nombre, apellido, email, password, passwordConfirm, cargo, cargo_id, cargoId, rol_id, departamento_id, fecha_ingreso_empresa } = req.body;

    // 1) Verificar si las contraseñas coinciden
    if (password !== passwordConfirm) {
      return next(new AppError('Las contraseñas no coinciden', 400));
    }

    // 2) Usar fecha de ingreso enviada o fecha actual como fallback
    const fechaIngresoFinal = fecha_ingreso_empresa || new Date().toISOString().split('T')[0];



    const { proporcionado: cargoProporcionado, valor: cargoResuelto } = await resolverCargoId(

      cargo_id ?? cargoId ?? cargo

    );



    const cargoIdFinal = cargoProporcionado ? cargoResuelto : null;



    // 3) Crear el usuario con la fecha actual

    const nuevoUsuario = await Usuario.create({

      cedula,

      nombre,

      apellido,

      email,

      password,

      cargo_id: cargoIdFinal,

      rol_id,

      departamento_id,

      fecha_ingreso_empresa: fechaIngresoFinal

    });





    // 3) Iniciar sesión automáticamente

    await createSendTokens(nuevoUsuario, 201, req, res);

  } catch (error) {

    next(error);

  }

};



// Iniciar sesión

exports.login = catchAsync(async (req, res, next) => {

  const { email, password } = req.body;

  const ip = req.ip || req.connection.remoteAddress;

  const userAgent = req.get('User-Agent') || 'Desconocido';



  // 1) Verificar si el email y la contraseña existen

  if (!email || !password) {
    return next(new AppError('Por favor ingrese email y contraseña', 400));

  }



  // 2) Verificar si el usuario existe y la contraseña es correcta

  const user = await Usuario.findOne({

    where: { 

      email: { [Op.iLike]: email } // Búsqueda case-insensitive

    },

    include: [

      { model: Rol, as: 'rol' },

      { model: Departamento, as: 'departamento' },

      cargoInclude

    ]

  });



  if (!user || !(await user.validarPassword(password, user.password))) {
    return next(new AppError('Credenciales incorrectas', 401));

  }



  // 3) Verificar si el usuario está activo

  if (user.estado !== 'activo') {
    return next(new AppError('Su cuenta ha sido desactivada. Por favor contacte al administrador.', 403));

  }



  // 4) Registrar el inicio de sesión exitoso

  try {

    await user.update({

      ultimoInicioSesion: new Date(),

      ultimaIp: ip,

      intentosFallidos: 0, // Resetear el contador de intentos fallidos

      bloqueadoHasta: null // Desbloquear la cuenta si estaba bloqueada

    });

  } catch (error) {
    // No detenemos el flujo por este error

  }



  // 5) Generar tokens y enviar respuesta

  try {

    // Generar tokens

    const accessToken = generateAccessToken(user.id);

    const refreshTokenObj = generateRefreshToken();



    // Guardar el refresh token en la base de datos

    await user.update({

      refreshToken: refreshTokenObj.token,

      refreshTokenExpires: refreshTokenObj.expires

    });



    // Configurar cookie segura para el refresh token

    const cookieOptions = getCookieOptions(req);

    res.cookie('jwt', refreshTokenObj.token, cookieOptions);



    // Obtener versión actualizada del usuario con sus relaciones para garantizar datos completos

    const usuarioActualizado = await Usuario.findByPk(user.id, {

      include: includeRelacionesUsuario

    });



    if (!usuarioActualizado) {

      return next(new AppError('No se pudo obtener la información actualizada del usuario', 500));

    }



    // Configurar datos del usuario para la respuesta (sin información sensible)

    const userData = construirRespuestaUsuario(usuarioActualizado);



    // Enviar respuesta
    res.status(200).json({
      // Campos principales de respuesta
      status: 'success',
      accessToken,
      expiresIn: 15 * 60 * 1000, // 15 minutos
      
      // Datos del usuario (organizados)
      ...userData  // userData ya está organizado en construirRespuestaUsuario

    });

  } catch (error) {
    return next(new AppError('Error al iniciar sesión. Por favor intente de nuevo.', 500));
  }
});



// Cerrar sesión

exports.logout = catchAsync(async (req, res, next) => {

  // 1) Obtener el token de la cookie

  const refreshToken = req.cookies.jwt || req.signedCookies.jwt;

  

  // 2) Si hay un token, invalidarlo en la base de datos

  if (refreshToken) {

    try {

      await Usuario.update(

        { 

          refreshToken: null,

          refreshTokenExpires: null

        },

        { 

          where: { refreshToken },

          individualHooks: true,

          silent: true // No actualizar updatedAt

        }

      );

      

    } catch (error) {

      // Continuamos con el proceso aunque falle la invalidación

    }

  } else {
    // Intento de cierre de sesión sin token de refresco

  }

  

  // 3) Eliminar la cookie

  const cookieOptions = getCookieOptions(req);

  res.clearCookie('jwt', {

    ...cookieOptions,

    maxAge: 0 // Inmediatamente expira la cookie

  });

  

  // 4) Eliminar también la cookie firmada si existe

  if (req.signedCookies.jwt) {

    res.clearCookie('jwt', {

      ...cookieOptions,

      signed: true,

      maxAge: 0

    });

  }

  

  // 5) Enviar respuesta exitosa
  res.status(200).json({
    // Campos principales de respuesta
    status: 'success',
    message: 'Sesión cerrada correctamente',
    timestamp: new Date().toISOString()
  });
});



// Refrescar token

exports.refreshToken = catchAsync(async (req, res, next) => {

  // 1) Obtener el refresh token de las cookies

  const refreshToken = req.cookies.jwt;

  

  // 2) Verificar que el token existe

  if (!refreshToken) {
    return next(new AppError('No se proporcionó token de actualización', 401));

  }



  try {

    // 3) Buscar el usuario con el token de refresco

    const user = await Usuario.findOne({

      where: { 

        refreshToken,

        refreshTokenExpires: { [Op.gt]: new Date() } // Verificar que no haya expirado

      },

      include: [

        { model: Rol, as: 'rol' },

        { model: Departamento, as: 'departamento' },

        cargoInclude

      ]

    });



    // 4) Verificar si el token es válido

    if (!user) {
      return next(new AppError('Token de actualización inválido o expirado', 401));

    }



    // 5) Verificar si el usuario está activo

    if (user.estado !== 'activo') {
      return next(new AppError('Su cuenta ha sido desactivada', 403));

    }



    // 6) Generar un nuevo access token

    const accessToken = generateAccessToken(user.id);

    

    // 7) Opcional: Rotar el refresh token (mejor seguridad)

    const refreshTokenObj = generateRefreshToken();

    

    // 8) Actualizar el refresh token en la base de datos

    await user.update({

      refreshToken: refreshTokenObj.token,

      refreshTokenExpires: refreshTokenObj.expires

    });

    

    // 9) Configurar la nueva cookie de refresh token

    const cookieOptions = getCookieOptions(req);

    res.cookie('jwt', refreshTokenObj.token, cookieOptions);



    // 10) Configurar datos del usuario para la respuesta

    const userData = construirRespuestaUsuario(user);



    // 11) Enviar respuesta con el nuevo access token
    res.status(200).json({
      // Campos principales de respuesta
      status: 'success',
      accessToken,
      expiresIn: 15 * 60 * 1000, // 15 minutos
      
      // Datos del usuario (organizados)
      data: {
        user: userData
      }

    });

  } catch (error) {
    // Si hay un error, limpiar la cookie para forzar un nuevo inicio de sesión

    res.clearCookie('jwt', {

      ...getCookieOptions(req),

      maxAge: 0

    });

    

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {

      return next(new AppError('Sesión expirada. Por favor inicie sesión nuevamente.', 401));

    }

    

    // Pasar el error al manejador de errores global
    next(error);
  }
});



// Middleware de autenticación

exports.protect = catchAsync(async (req, res, next) => {

  try {

    // 1) Obtener el token y verificar si existe

    let token;

    const authHeader = req.headers.authorization;

    

    // Intentar obtener el token del encabezado de autorización

    if (authHeader && authHeader.startsWith('Bearer ')) {

      token = authHeader.split(' ')[1];

    } 

    // Si no está en el encabezado, intentar obtenerlo de las cookies

    else if (req.cookies?.jwt || req.signedCookies?.jwt) {

      token = req.cookies.jwt || req.signedCookies.jwt;

    }



    if (!token) {
      return next(

        new AppError('No has iniciado sesión. Por favor inicia sesión para tener acceso.', 401)

      );

    }



    // 2) Verificar token

    const decoded = await verifyToken(token);

    

    // 3) Verificar si el usuario aún existe

    const currentUser = await Usuario.findByPk(decoded.id, {

      include: includeRelacionesUsuario

    });



    if (!currentUser) {

      return next(new AppError('El usuario ya no existe', 401));

    }



    // 4) Verificar si el usuario está activo

    if (currentUser.estado !== 'activo') {

      return next(new AppError('Su cuenta ha sido desactivada', 403));

    }



    // 5) Verificar si el usuario cambió la contraseña después de que se emitió el token

    if (currentUser.cambiarPassword && currentUser.cambiarPassword(decoded.iat)) {

      return next(

        new AppError('Su sesión ha expirado debido a un cambio de contraseña reciente. Por favor inicie sesión nuevamente.', 401)

      );

    }



    // 5) Registrar información de la solicitud (opcional)

    if (process.env.NODE_ENV === 'development') {
      // Log de desarrollo para acceso concedido
    }

    // 6) Otorgar acceso a la ruta protegida
    req.user = currentUser;
    res.locals.user = currentUser;

    next();

  } catch (error) {
    // Error en middleware de autenticación

    // Limpiar cookies en caso de error de autenticación

    res.clearCookie('jwt', {

      ...getCookieOptions(req),

      maxAge: 0

    });

    // Manejar errores específicos de JWT
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {

      return next(new AppError('Sesión inválida o expirada. Por favor inicie sesión nuevamente.', 401));

    }

    

    // Pasar otros errores al manejador de errores global
    next(error);
  }
});



// Obtener información del usuario actual
exports.getMe = catchAsync(async (req, res, next) => {
  // El usuario ya está disponible en req.user gracias al middleware protect
  const user = await Usuario.findByPk(req.user.id, {
    attributes: { 
      exclude: ['password', 'refreshToken', 'refreshTokenExpires', 'resetPasswordToken', 'resetPasswordExpires'] 
    },
    include: includeRelacionesUsuario
  });

  if (!user) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  // Responder con datos organizados del usuario
  const userData = construirRespuestaUsuario(user);

  res.status(200).json({
    // Campos principales de respuesta
    status: 'success',
    data: {
      user: userData
    }
  });
});


// Middleware de restricción por roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('No has iniciado sesión', 401));
    }

    if (!roles.includes(req.user.rol.nombre)) {
      return next(new AppError('No tienes permiso para realizar esta acción', 403));
    }

    next();
  };
};



// Exportar todas las funciones del controlador
module.exports = {
  // Funciones principales de autenticación
  registro: exports.registro,
  login: exports.login,
  logout: exports.logout,
  refreshToken: exports.refreshToken,
  getMe: exports.getMe,
  
  // Funciones de gestión de contraseñas
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword,
  updatePassword: exports.updatePassword,
  adminChangePassword: exports.adminChangePassword,
  
  // Middleware de autenticación
  protect: exports.protect,
  restrictTo: exports.restrictTo
};

