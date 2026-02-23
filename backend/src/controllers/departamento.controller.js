const { Departamento, Pregunta, Cargo } = require('../models');

// Crear un nuevo departamento
exports.crearDepartamento = async (req, res) => {
  try {
    const { nombre } = req.body;
    const departamento = await Departamento.create({ nombre });
    res.status(201).json({
      status: 'success',
      data: {
        departamento
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Obtener cargos por departamento
exports.obtenerCargosPorDepartamento = async (req, res) => {
  try {
    const { departamentoId } = req.params;
    const usuarioActual = req.user;

    const departamento = await Departamento.findByPk(departamentoId);
    if (!departamento) {
      return res.status(404).json({
        status: 'error',
        message: 'Departamento no encontrado'
      });
    }

    if (usuarioActual?.rol?.nombre === 'evaluador' && usuarioActual.departamento_id !== Number(departamentoId)) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para ver los cargos de este departamento'
      });
    }

    const cargos = await Cargo.findAll({
      where: { departamento_id: departamentoId },
      attributes: ['id', 'nombre', 'descripcion'],
      order: [['nombre', 'ASC']]
    });

    res.status(200).json({
      status: 'success',
      results: cargos.length,
      data: {
        cargos
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener los cargos del departamento'
    });
  }
};

// Obtener todos los departamentos
exports.obtenerDepartamentos = async (req, res) => {
  try {
    const departamentos = await Departamento.findAll({
      attributes: ['id', 'nombre']
    });
    
    res.status(200).json({
      status: 'success',
      results: departamentos.length,
      data: {
        departamentos
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};
