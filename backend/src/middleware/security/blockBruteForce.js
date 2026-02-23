const { RateLimiterMemory } = require('rate-limiter-flexible');

// Configuración del rate limiter para intentos de inicio de sesión
const loginRateLimiter = new RateLimiterMemory({
  points: 50, // Aumentado temporalmente a 50 intentos
  duration: 60 * 5, // Bloquear por 5 minutos después de 50 intentos fallidos
  blockDuration: 60 * 5, // Bloquear por 5 minutos
});

const blockBruteForce = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    await loginRateLimiter.consume(ip);
    next();
  } catch (rejRes) {
    const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      status: 'error',
      message: `Demasiados intentos de inicio de sesión. Por favor intente de nuevo en ${retryAfter} segundos.`
    });
  }
};

// Función para resetear el contador después de un inicio de sesión exitoso
const resetLoginAttempts = async (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  try {
    await loginRateLimiter.delete(ip);
  } catch (error) {
    console.error('Error al resetear el contador de intentos de inicio de sesión:', error);
  }
};

module.exports = {
  blockBruteForce,
  resetLoginAttempts
};
