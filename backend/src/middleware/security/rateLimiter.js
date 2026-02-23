const rateLimit = require('express-rate-limit');

// Rate limiting global para la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 peticiones por ventana
  message: {
    status: 'error',
    message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting más estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // límite de 20 intentos de inicio de sesión por ventana
  message: {
    status: 'error',
    message: 'Demasiados intentos de inicio de sesión, por favor intente de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter
};
