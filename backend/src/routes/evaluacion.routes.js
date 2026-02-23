const express = require('express');
const { Op } = require('sequelize');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../utils/appError');
const authController = require('../controllers/auth.controller');
const evaluacionController = require('../controllers/evaluacion.controller');
const { validarPeriodoEvaluacion } = require('../middleware/validarPeriodo');
const PeriodosEvaluacion = require('../utils/periodos');
const { Evaluacion, Usuario, Departamento, Formulario, Pregunta, Respuesta } = require('../models');

const router = express.Router();

// Router sin protección para pruebas
const publicRouter = express.Router();

// Aplicar protección a todas las rutas MENOS las de prueba
router.use(authController.protect);

// ====================
// RUTAS DE EVALUACIÓN
// ====================

/**
 * @route   POST /api/evaluaciones/crear
 * @desc    Crear una o varias evaluaciones para un departamento con múltiples cargos y períodos
 * @access  Privado/Admin
 */
router.post('/crear',
  authController.restrictTo('administrador'),
  validarPeriodoEvaluacion,
  evaluacionController.crearEvaluacion
);

/**
 * @route   POST /api/evaluaciones
 * @desc    Crear una nueva evaluación para un departamento y cargo (mantenido por compatibilidad)
 * @access  Privado/Admin
 */
router.post('/',
  authController.restrictTo('administrador'),
  validarPeriodoEvaluacion,
  evaluacionController.crearEvaluacion
);

/**
 * @route   GET /api/evaluaciones
 * @desc    Obtener todas las evaluaciones (con filtros opcionales)
 * @access  Privado/Admin
 * @query   {number} [departamentoId] - Filtrar por ID de departamento
 * @query   {string} [periodo] - Filtrar por período (Q1, Q2, Q3, Q4)
 * @query   {number} [anio] - Filtrar por año
 */
router.get('/',
  authController.restrictTo('administrador'),
  evaluacionController.obtenerEvaluaciones
);

// ====================
// RUTAS DE FORMULARIOS
// ====================

/**
 * @route   GET /api/evaluaciones/formularios/activo
 * @desc    Obtener el formulario activo actualmente
 * @access  Privado/Evaluador, Admin
 */
router.get('/formularios/activo', 
  authController.restrictTo('evaluador', 'administrador', 'gestion'),
  evaluacionController.obtenerFormularioActivo
);

/**
 * @route   GET /api/evaluaciones/departamentos/:id/empleados
 * @desc    Obtener empleados de un departamento para evaluación
 * @access  Privado/Evaluador, Admin
 */
router.get('/departamentos/:id/empleados',
  authController.restrictTo('evaluador', 'administrador', 'gestion'),
  evaluacionController.obtenerEmpleadosParaEvaluacion
);

// ====================
// RUTAS DE EVALUACIÓN - COMPARTIDAS
// ====================

// Obtener evaluación activa por departamento y cargo
router.get('/departamento/:departamentoId/cargo/:cargo',
  authController.restrictTo('evaluador', 'administrador', 'gestion'),
  evaluacionController.obtenerEvaluacionActiva
);

// ====================
// RUTAS ESPECÍFICAS (deben ir ANTES de /:id)
// ====================

// Obtener datos para botones (ID + estado de cada evaluación del evaluador)
router.get('/botones',
  authController.restrictTo('evaluador'),
  authController.protect,
  evaluacionController.obtenerDatosBotones
);

// Obtener estado de evaluación por empleado (solo para estilos de botones)
router.get('/estados',
  authController.restrictTo('evaluador'),
  authController.protect,
  evaluacionController.obtenerEstadosEvaluaciones
);

// Listar evaluaciones asignadas al evaluador
router.get('/asignadas',
  authController.restrictTo('evaluador'),
  authController.protect,
  evaluacionController.obtenerEvaluacionesAsignadas
);

// Listar evaluaciones asignadas con ventana de 5 días
router.get('/asignadas-activas',
  authController.restrictTo('evaluador'),
  authController.protect,
  evaluacionController.obtenerEvaluacionesAsignadasActivas
);

// Obtener historial de evaluaciones completadas del departamento
router.get('/historial',
  authController.restrictTo('evaluador', 'administrador', 'gestion'),
  authController.protect,
  evaluacionController.obtenerHistorialEvaluaciones
);

// ====================
// RUTAS DE EVALUACIÓN - EVALUADOR
// ====================

// Obtener detalles de una evaluación (todos los roles) - RUTA ORIGINAL
router.get('/:id',
  authController.restrictTo('administrador', 'evaluador', 'gestion', 'empleado'),
  evaluacionController.obtenerEvaluacionSimple
);

/**
 * @route   POST /api/evaluaciones/iniciar
 * @desc    Iniciar una nueva evaluación automáticamente para un empleado
 * @access  Privado/Evaluador
 * @body    {number} evaluadoId - ID del empleado a evaluar
 */
router.post('/iniciar', 
  authController.restrictTo('evaluador'),
  evaluacionController.iniciarEvaluacion
);

// Guardar respuestas de una evaluación
router.post('/:id/respuestas',
  authController.restrictTo('evaluador', 'administrador'),
  evaluacionController.guardarRespuestas
);

// Enviar respuestas (PUT - para compatibilidad con frontend)
router.put('/:id/respuestas',
  authController.restrictTo('evaluador', 'administrador'),
  evaluacionController.guardarRespuestas
);

router.post('/:id/respuestas/guardar',
  authController.restrictTo('evaluador', 'administrador'),
  evaluacionController.guardarRespuestas
);

// Finalizar una evaluación (usar guardarRespuestas con finalizar=true)
router.post('/:id/finalizar',
  authController.restrictTo('evaluador', 'administrador'),
  (req, res, next) => {
    // Transformar la petición para usar guardarRespuestas
    req.body.finalizar = true;
    req.body.respuestas = req.body.respuestas || [];
    evaluacionController.guardarRespuestas(req, res, next);
  }
);

// Actualizar estado de una evaluación (evaluador)
router.patch('/:id/estado',
  authController.restrictTo('evaluador', 'administrador'),
  evaluacionController.actualizarEstadoEvaluacion
);

// Actualizar una evaluación (solo admin)
router.patch('/:id',
  authController.restrictTo('administrador'),
  evaluacionController.actualizarEvaluacion
);

// Eliminar una evaluación (solo admin)
router.delete('/:id',
  authController.restrictTo('administrador'),
  evaluacionController.eliminarEvaluacion
);

// ====================
// RUTAS DE EMPLEADOS
// ====================

// Obtener las evaluaciones del empleado logueado
router.get('/mis-evaluaciones',
  authController.restrictTo('empleado'),
  evaluacionController.getMisEvaluaciones
);

// Ruta temporal de prueba sin autenticación
router.get('/mis-evaluaciones-test',
  evaluacionController.getMisEvaluaciones
);

// Ruta pública SIN PROTECCIÓN para debug
publicRouter.get('/mis-evaluaciones-debug',
  evaluacionController.getMisEvaluaciones
);

// ====================
// RUTAS DE REPORTES
// ====================

// Obtener reporte por departamento
router.get('/reportes/por-departamento',
  authController.restrictTo('administrador'),
  evaluacionController.obtenerReportePorDepartamento
);

// Obtener reporte por usuario
router.get('/reportes/por-usuario/:usuarioId',
  authController.restrictTo('administrador'),
  evaluacionController.obtenerReportePorUsuario
);

// Obtener reporte por trimestre
router.get('/reportes/trimestre/:trimestre/anio/:anio',
  authController.restrictTo('administrador'),
  evaluacionController.obtenerReportePorTrimestre
);

// ====================
// RUTAS DE PRUEBA
// ====================

module.exports = { router, publicRouter };

