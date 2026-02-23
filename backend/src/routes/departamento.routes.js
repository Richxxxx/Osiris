const express = require('express');
const departamentoController = require('../controllers/departamento.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Proteger todas las rutas
router.use(authController.protect);

// Rutas accesibles para administradores
router.use(authController.restrictTo('administrador'));

// Ruta para crear un departamento
router.post('/', departamentoController.crearDepartamento);

// Ruta para obtener todos los departamentos
router.get('/', departamentoController.obtenerDepartamentos);

// Ruta para obtener cargos por departamento (admins y evaluadores propios)
router.get('/:departamentoId/cargos', authController.restrictTo('administrador', 'evaluador'), departamentoController.obtenerCargosPorDepartamento);

module.exports = router;
