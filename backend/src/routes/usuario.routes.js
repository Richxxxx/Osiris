const express = require('express');
const authController = require('../controllers/auth.controller');
const usuarioController = require('../controllers/usuario.controller');

const router = express.Router();

// Aplicar protección a todas las rutas siguientes
router.use(authController.protect);

// Rutas para el perfil del usuario actual
router.get('/mi-perfil', usuarioController.getMiPerfil);
router.patch('/actualizar-perfil', usuarioController.actualizarMiPerfil);
router.patch('/actualizar-contraseña', usuarioController.actualizarMiContraseña);

// Ruta para obtener usuarios por departamento (accesible para administradores y evaluadores de su propio departamento)
router.get('/departamento/:departamentoId', 
  // Middleware para verificar si el usuario es administrador o evaluador de ese departamento
  (req, res, next) => {
    const { departamentoId } = req.params;
    const usuario = req.user;
    
    // Si el usuario es administrador, continuar
    if (usuario.rol && usuario.rol.nombre === 'administrador') {
      return next();
    }
    
    // Si el usuario es evaluador, verificar que esté intentando acceder a su propio departamento
    if (usuario.rol && usuario.rol.nombre === 'evaluador' && 
        parseInt(departamentoId) === usuario.departamento_id) {
      return next();
    }
    
    // Si no cumple con ninguna condición, denegar acceso
    return res.status(403).json({
      status: 'error',
      message: 'No tienes permiso para acceder a este recurso'
    });
  },
  usuarioController.obtenerUsuariosPorDepartamento
);

// Rutas protegidas (solo administradores y gestión)
router.use((req, res, next) => {
  const usuario = req.user;
  
  // Si el usuario es administrador o gestión, continuar
  if (usuario.rol && (usuario.rol.nombre === 'administrador' || usuario.rol.nombre === 'gestion')) {
    return next();
  }
  
  // Si no cumple, denegar acceso
  return res.status(403).json({
    status: 'error',
    message: 'No tienes permiso para acceder a este recurso'
  });
});

// Rutas de gestión (accesibles para administradores y rol gestión)
router.get('/gestion/estadisticas', usuarioController.obtenerEstadisticasGestion);
router.get('/gestion/estadisticas/departamentos', usuarioController.obtenerEstadisticasPorDepartamento);
router.get('/gestion/estadisticas/departamentos/valoracion-trimestral', usuarioController.obtenerValoracionTrimestralPorDepartamento);
router.get('/gestion/evaluaciones-completadas', usuarioController.obtenerEvaluacionesCompletadasPorDepartamento);
router.get('/gestion/seguimiento/departamentos', usuarioController.obtenerSeguimientoPorDepartamento);
router.get('/gestion/seguimiento/lider/:liderId', usuarioController.obtenerDetalleEvaluacionesLider);
router.get('/gestion/evaluacion/:id', usuarioController.obtenerEvaluacionParaGestion);
router.get('/gestion/reportes', usuarioController.obtenerReportesGestion);

// Rutas para búsqueda y asignación de evaluaciones (solo gestión)
router.get('/gestion/buscar-usuarios', usuarioController.buscarUsuariosParaAsignacion);
router.post('/gestion/asignar-evaluacion', usuarioController.asignarEvaluacionManual);
router.get('/gestion/ultima-evaluacion/:empleadoId', usuarioController.obtenerUltimaEvaluacionEmpleado);

// Rutas protegidas (solo administradores)
router.use(authController.restrictTo('administrador'));

router
  .route('/')
  .get(usuarioController.obtenerUsuarios)
  .post(usuarioController.crearUsuario);

router
  .route('/:id')
  .get(usuarioController.obtenerUsuario)
  .patch(usuarioController.actualizarUsuario)
  .delete(usuarioController.eliminarUsuario);

// Ruta para eliminar un usuario definitivamente (solo administradores)
router.delete('/definitivo/:id', usuarioController.eliminarUsuarioDefinitivo);

module.exports = router;
