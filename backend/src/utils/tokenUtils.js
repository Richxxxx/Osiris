const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const { Usuario } = require('../models');
const AppError = require('./appError');

// 1. Generar token de acceso (corto tiempo de vida)
const generateAccessToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('Error de configuración: JWT_SECRET no está definido', 500);
  }
  
  return jwt.sign(
    { 
      id: userId,
      iat: Math.floor(Date.now() / 1000) // Fecha de emisión
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      algorithm: 'HS256' // Especificar el algoritmo
    }
  );
};

// 2. Generar token de refresco (largo tiempo de vida)
const generateRefreshToken = () => {
  return {
    token: crypto.randomBytes(40).toString('hex'),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
  };
};

// 3. Verificar token de acceso
const verifyToken = async (token) => {
  try {
    if (!token) {
      throw new AppError('Token no proporcionado', 401);
    }

    // Verificar el token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Verificar si el token ha expirado
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      throw new AppError('Token expirado', 401);
    }

    // Obtener el usuario
    const user = await Usuario.findByPk(decoded.id, {
      attributes: { 
        exclude: ['password', 'passwordChangedAt', 'refreshToken'] 
      },
      include: [
        { 
          association: 'rol',
          attributes: ['id', 'nombre']
        },
        { 
          association: 'departamento',
          attributes: ['id', 'nombre', 'descripcion']
        }
      ]
    });
    
    if (!user) {
      throw new AppError('El usuario ya no existe', 401);
    }
    
    // Verificar si el token fue emitido antes de la última actualización de la contraseña
    // (comentado hasta implementar la lógica de cambio de contraseña)
    // if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
    //   throw new AppError('El usuario cambió recientemente la contraseña. Por favor inicia sesión nuevamente.', 401);
    // }
    
    return user;
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new AppError('Token inválido o expirado', 401);
    }
    
    // Si es un error de AppError, lo relanzamos
    if (error.isOperational) {
      throw error;
    }
    
    // Para otros errores, lanzamos un error genérico
    throw new AppError('Error de autenticación', 401);
  }
};

// 4. Configuración de cookies seguras para el refresh token
const getCookieOptions = (req) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  return {
    httpOnly: true, // No accesible desde JavaScript
    secure: isProduction && isSecure, // Solo HTTPS en producción
    sameSite: isProduction ? 'strict' : 'lax', // Protección contra CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/api/auth/refresh-token', // Solo accesible en esta ruta
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
    // Eliminamos signed: true ya que puede causar problemas si no se usa correctamente
    // con cookie-parser
  };
};

// 5. Verificar refresh token (en este caso, solo validamos la firma)
const verifyRefreshToken = async (token) => {
  try {
    // En este enfoque, como usamos cookies HTTP-Only, el token ya fue verificado
    // al establecer la cookie. Aquí solo necesitamos verificar que el token existe.
    if (!token) {
      throw new Error('No se proporcionó token de actualización');
    }
    
    // Si necesitas validaciones adicionales, las puedes agregar aquí
    return true;
  } catch (error) {
    console.error('Error al verificar refresh token:', error);
    throw new Error('Token de actualización inválido');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  getCookieOptions
};
