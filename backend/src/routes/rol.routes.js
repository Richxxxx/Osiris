const express = require('express');
const rolController = require('../controllers/rol.controller');

const router = express.Router();

// Ruta para crear un rol
router.post('/', rolController.crearRol);

// Ruta para obtener todos los roles
router.get('/', rolController.obtenerRoles);

module.exports = router;
