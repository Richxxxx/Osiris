const express = require('express');
const formularioController = require('../controllers/formulario.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authController.protect);

// ====================
// RUTAS DE FORMULARIOS - ADMINISTRADOR
// ====================

// Crear un nuevo formulario
router.post(
  '/crear',
  authController.restrictTo('administrador'),
  formularioController.crearFormulario
);

// Listar todos los formularios
router.get(
  '/listar',
  authController.restrictTo('administrador'),
  formularioController.obtenerFormularios
);

// Obtener un formulario por ID
router.get(
  '/:id/ver',
  authController.restrictTo('administrador'),
  formularioController.obtenerFormulario
);

// Actualizar un formulario
router.patch(
  '/:id/actualizar',
  authController.restrictTo('administrador'),
  formularioController.actualizarFormulario
);

// Eliminar un formulario
router.delete(
  '/:id/eliminar',
  authController.restrictTo('administrador'),
  formularioController.eliminarFormulario
);

// ====================
// RUTAS PÚBLICAS DE FORMULARIOS
// ====================

// Obtener preguntas existentes por departamento (para reutilización)
router.get(
  '/preguntas/existentes',
  authController.restrictTo('administrador'),
  formularioController.obtenerPreguntasExistentes
);

// Obtener formularios activos (disponibles para evaluadores y administradores)
router.get(
  '/activos/listar',
  authController.restrictTo('administrador', 'evaluador'),
  formularioController.obtenerFormulariosActivos
);

module.exports = router;
