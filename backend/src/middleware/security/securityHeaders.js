const helmet = require('helmet');

// Middleware para deshabilitar el cache en rutas sensibles
const noCache = (req, res, next) => {
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

const securityHeaders = (req, res, next) => {
  // Configuración de CSP mejorada
  const cspConfig = {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        "'unsafe-inline'" // Considerar eliminar en producción
      ],
      styleSrc: [
        "'self'",
        'https://fonts.googleapis.com',
        "'unsafe-inline'" // Considerar eliminar en producción
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      fontSrc: [
        "'self'",
        'data:',
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net'
      ],
      connectSrc: [
        "'self'",
        process.env.API_URL || 'http://localhost:5000',
        'ws://localhost:5000',
        'wss://' + (process.env.API_URL || 'localhost:5000').replace(/^https?:\/\//, '')
      ],
      frameSrc: ["'self'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
    reportOnly: process.env.NODE_ENV === 'development'
  };

  // Configuración de HSTS más estricta en producción
  const hstsConfig = process.env.NODE_ENV === 'production' 
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : { maxAge: 0 };

  // Aplicar todas las cabeceras de seguridad
  helmet({
    contentSecurityPolicy: cspConfig,
    crossOriginEmbedderPolicy: { policy: "credentialless" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false }, // Deshabilitar por defecto
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: hstsConfig,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    expectCt: process.env.NODE_ENV === 'production' ? {
      maxAge: 86400,
      enforce: true,
      reportUri: '/report-ct'
    } : false
  })(req, res, () => {
    // Cabeceras adicionales
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Solo en producción
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    next();
  });
};

// Middleware para deshabilitar el cache en rutas sensibles
exports.noCache = (req, res, next) => {
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// Middleware para habilitar CORS de forma segura
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Tiempo de caché para las opciones preflight (en segundos)
};

module.exports = {
  securityHeaders,
  noCache,
  corsOptions
};