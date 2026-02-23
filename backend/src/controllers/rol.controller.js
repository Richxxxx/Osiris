const { Rol } = require('../models');

// Crear un nuevo rol
exports.crearRol = async (req, res) => {
  try {
    const { nombre } = req.body;
    const rol = await Rol.create({ nombre });
    
    res.status(201).json({
      status: 'success',
      data: {
        rol
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener todos los roles
exports.obtenerRoles = async (req, res) => {
  try {
    const roles = await Rol.findAll({
      attributes: ['id', 'nombre']
    });
    
    res.status(200).json({
      status: 'success',
      results: roles.length,
      data: {
        roles
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};
