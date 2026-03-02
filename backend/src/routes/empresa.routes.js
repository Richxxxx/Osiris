const express = require('express');
const router = express.Router();
const { 
  obtenerEmpresas, 
  obtenerEmpresaPorId, 
  crearEmpresa, 
  actualizarEmpresa, 
  eliminarEmpresa 
} = require('../controllers/empresa.controller');

// Obtener todas las empresas
router.get('/', obtenerEmpresas);

// Obtener una empresa por ID
router.get('/:id', obtenerEmpresaPorId);

// Crear una nueva empresa
router.post('/', crearEmpresa);

// Actualizar una empresa
router.put('/:id', actualizarEmpresa);

// Eliminar (desactivar) una empresa
router.delete('/:id', eliminarEmpresa);

module.exports = router;
