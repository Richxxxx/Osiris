const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Empresa = sequelize.define('Empresa', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Nombre único de la empresa'
    },
    identificacion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Identificación fiscal (NIT, RUC, etc.)'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción de la empresa'
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Estado activo/inactivo de la empresa'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de creación del registro'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de última actualización'
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de borrado lógico'
    }
  }, {
    tableName: 'empresas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
    // Scopes para consultas comunes
    scopes: {
      activas: {
        where: { estado: true }
      }
    }
  });

  // Asociaciones
  Empresa.associate = (models) => {
    // Una empresa tiene muchos usuarios
    Empresa.hasMany(models.Usuario, {
      foreignKey: 'empresa_id',
      as: 'usuarios',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    // Una empresa tiene muchos departamentos
    Empresa.hasMany(models.Departamento, {
      foreignKey: 'empresa_id',
      as: 'departamentos',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    // Una empresa tiene muchos cargos
    Empresa.hasMany(models.Cargo, {
      foreignKey: 'empresa_id',
      as: 'cargos',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
  };

  return Empresa;
};
