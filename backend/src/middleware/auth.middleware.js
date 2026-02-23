const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

// Middleware para proteger rutas
exports.protect = async (req, res, next) => {
  try {
    // 1. Obtener el token del encabezado
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No estás autorizado para acceder a esta ruta',
      });
    }

    // 2. Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto_por_defecto');

    // 3. Obtener el usuario del token
    const currentUser = await Usuario.findByPk(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'El usuario ya no existe',
      });
    }

    // 4. Añadir usuario al request
    req.user = currentUser;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Token inválido o expirado',
    });
  }
};

// Middleware para verificar roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol_id)) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para realizar esta acción',
      });
    }
    next();
  };
};
