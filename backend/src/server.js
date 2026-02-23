// Configuración de variables de entorno
require('dotenv').config();


// Importaciones principales
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { securityHeaders, noCache, apiLimiter } = require('./middleware/security');
const AppError = require('./utils/appError');

// Importaciones de base de datos
const db = require('./models');

// Importar el scheduler de evaluaciones
require('./services/evaluationScheduler');

// Configuración de Sequelize - Movida después de la autenticación

// Función para formatear la fecha
const formatDate = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
};

// Inicialización de la aplicación
const app = express();

// Crear servidor HTTP
const server = http.createServer(app);

// ====================================
// MIDDLEWARES DE SEGURIDAD
// ====================================

// Configuración de CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Configuración de seguridad
app.use(helmet());
app.use(securityHeaders);

// Configuración de cookies
const cookieSecret = process.env.COOKIE_SECRET || 'secreto-por-defecto-cambiar-en-produccion';
app.use(cookieParser(cookieSecret));
app.use(noCache);
app.use(compression());

// Parseo de JSON y URL-encoded
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Rate limiting global para la API
app.use('/api', apiLimiter);

// Middleware de logging personalizado
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Rutas de la API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/api/departamentos', require('./routes/departamento.routes'));
app.use('/api/evaluaciones', require('./routes/evaluacion.routes').router);
app.use('/api/evaluaciones-public', require('./routes/evaluacion.routes').publicRouter);
app.use('/api/formularios', require('./routes/formulario.routes'));
app.use('/api/roles', require('./routes/rol.routes'));
app.use('/api/empleado', require('./routes/empleado.routes'));

// Ruta de verificación de estado
app.get('/api/status', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API funcionando correctamente',
    timestamp: formatDate(),
    environment: process.env.NODE_ENV,
  });
});

// Manejador de rutas no encontradas
app.use((req, res, next) => {
  // Verificar si la ruta comienza con /api
  if (req.originalUrl.startsWith('/api')) {
    return next(new AppError(`No se pudo encontrar ${req.originalUrl} en este servidor.`, 404));
  }
  
  // Para rutas que no son API, podrías redirigir a la página de inicio o mostrar un error 404
  res.status(404).json({
    status: 'error',
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // En producción, no mostrar detalles del error
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    } else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Algo salió mal!',
      });
    }
  }
});

// ====================================
// INICIAR SERVIDOR
// ====================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Verificar que la conexión a la base de datos esté disponible
    if (!db.sequelize) {
      throw new Error('La conexión a la base de datos no está disponible');
    }

    // Autenticar la conexión a la base de datos
    await db.sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente');
        
    // Configurar logging
    db.sequelize.options.logging = process.env.NODE_ENV === 'development' ? console.log : false;
    
    // Sincronizar modelos con la base de datos (sin alter para tablas existentes)
    await db.sequelize.sync({ 
      force: false, 
      alter: false  // Desactivar alter para evitar conflictos con tablas existentes
    });
    console.log('🔄 Modelos sincronizados con la base de datos');
        
    // Iniciar servidor
    server.listen(PORT, () => {
      console.log('\n🚀 SISTEMA DE EVALUACIÓN DE DESEMPEÑO');
      console.log('=====================================');
      console.log(`✅ Backend: http://localhost:${PORT}`);
      console.log(`🌐 Frontend: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      console.log(`📅 ${formatDate()}`);
      console.log('=====================================\n');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejar eventos de cierre
process.on('unhandledRejection', (err) => {
    server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  });

// Iniciar el servidor
startServer();

// Exportar la aplicación para pruebas
module.exports = app;
