const rateLimit = require('express-rate-limit');

// Rate limiting para recuperación de contraseña
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // máximo 3 intentos por IP en 15 minutos
  message: {
    status: 'error',
    message: 'Demasiados intentos de recuperación de contraseña. Por favor, inténtalo de nuevo en 15 minutos.'
  },
  standardHeaders: true, // Enviar headers de rate limit
  legacyHeaders: false, // Desactivar headers X-RateLimit-*
  skip: (req) => {
    // Omitir rate limiting en desarrollo para evitar problemas
    return process.env.NODE_ENV === 'development';
  }
});

// Rate limiting general para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 intentos por IP en 15 minutos
  message: {
    status: 'error',
    message: 'Demasiados intentos. Por favor, inténtalo de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Omitir rate limiting en desarrollo para evitar problemas
    return process.env.NODE_ENV === 'development';
  }
});

module.exports = {
  passwordResetLimiter,
  authLimiter
};
