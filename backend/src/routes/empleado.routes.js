const express = require('express');
const authController = require('../controllers/auth.controller');
const empleadoController = require('../controllers/empleado.controller');

const router = express.Router();

// Proteger todas las rutas
router.use(authController.protect);

// Restringir a empleados
router.use(authController.restrictTo('empleado'));

/**
 * @desc    Obtener todas las evaluaciones del empleado
 * @route   GET /api/empleado/mis-evaluaciones
 * @access  Privado/Empleado
 */
router.get('/mis-evaluaciones', empleadoController.getMisEvaluaciones);

/**
 * @desc    Obtener detalle de una evaluación específica
 * @route   GET /api/empleado/mi-evaluacion/:id
 * @access  Privado/Empleado
 */
router.get('/mi-evaluacion/:id', empleadoController.getMiEvaluacion);

/**
 * @desc    Obtener progreso detallado de evaluación actual por apartados
 * @route   GET /api/empleado/progreso-evaluacion-actual
 * @access  Privado/Empleado
 */
router.get('/progreso-evaluacion-actual', empleadoController.getProgresoEvaluacionActual);

module.exports = router;
