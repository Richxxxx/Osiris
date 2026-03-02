const { Empresa } = require('../models');

// Obtener todas las empresas
const obtenerEmpresas = async (req, res) => {
  try {
    const empresas = await Empresa.findAll({
      attributes: ['id', 'nombre', 'identificacion', 'descripcion', 'estado'],
      order: [['nombre', 'ASC']]
    });

    res.json({
      status: 'success',
      data: {
        empresas: empresas
      }
    });
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener las empresas'
    });
  }
};

// Obtener una empresa por ID
const obtenerEmpresaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    const empresa = await Empresa.findByPk(id, {
      attributes: ['id', 'nombre', 'identificacion', 'descripcion', 'estado']
    });

    if (!empresa) {
      return res.status(404).json({
        status: 'error',
        message: 'Empresa no encontrada'
      });
    }

    res.json({
      status: 'success',
      data: {
        empresa: empresa
      }
    });
  } catch (error) {
    console.error('Error al obtener empresa:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener la empresa'
    });
  }
};

// Crear una nueva empresa
const crearEmpresa = async (req, res) => {
  try {
    const { nombre, identificacion, descripcion } = req.body;

    if (!nombre || !identificacion) {
      return res.status(400).json({
        status: 'error',
        message: 'El nombre y la identificación son obligatorios'
      });
    }

    // Verificar si ya existe una empresa con la misma identificación
    const empresaExistente = await Empresa.findOne({
      where: { identificacion }
    });

    if (empresaExistente) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya existe una empresa con esta identificación'
      });
    }

    const nuevaEmpresa = await Empresa.create({
      nombre,
      identificacion,
      descripcion: descripcion || null,
      estado: true
    });

    res.status(201).json({
      status: 'success',
      data: {
        empresa: nuevaEmpresa,
        message: 'Empresa creada exitosamente'
      }
    });
  } catch (error) {
    console.error('Error al crear empresa:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al crear la empresa'
    });
  }
};

// Actualizar una empresa
const actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, identificacion, descripcion, estado } = req.body;

    const empresa = await Empresa.findByPk(id);

    if (!empresa) {
      return res.status(404).json({
        status: 'error',
        message: 'Empresa no encontrada'
      });
    }

    // Si se cambia la identificación, verificar que no exista otra empresa con esa identificación
    if (identificacion && identificacion !== empresa.identificacion) {
      const empresaExistente = await Empresa.findOne({
        where: { identificacion }
      });

      if (empresaExistente) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe otra empresa con esta identificación'
        });
      }
    }

    await empresa.update({
      nombre: nombre || empresa.nombre,
      identificacion: identificacion || empresa.identificacion,
      descripcion: descripcion !== undefined ? descripcion : empresa.descripcion,
      estado: estado !== undefined ? estado : empresa.estado
    });

    const empresaActualizada = await Empresa.findByPk(id);

    res.json({
      status: 'success',
      data: {
        empresa: empresaActualizada,
        message: 'Empresa actualizada exitosamente'
      }
    });
  } catch (error) {
    console.error('Error al actualizar empresa:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar la empresa'
    });
  }
};

// Eliminar una empresa (desactivar)
const eliminarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    const empresa = await Empresa.findByPk(id);

    if (!empresa) {
      return res.status(404).json({
        status: 'error',
        message: 'Empresa no encontrada'
      });
    }

    // No eliminar físicamente, solo desactivar
    await empresa.update({ estado: false });

    res.json({
      status: 'success',
      data: {
        message: 'Empresa desactivada exitosamente'
      }
    });
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al desactivar la empresa'
    });
  }
};

module.exports = {
  obtenerEmpresas,
  obtenerEmpresaPorId,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa
};
