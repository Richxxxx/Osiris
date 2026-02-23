'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cargo extends Model {
  // Las asociaciones se definen más abajo en Cargo.associate
}

  Cargo.init({
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    departamento_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departamentos',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Cargo',
    tableName: 'cargos',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  // Definir las asociaciones
  Cargo.associate = function(models) {
    // Un cargo puede tener muchos usuarios
    Cargo.hasMany(models.Usuario, {
      foreignKey: 'cargo_id',
      as: 'usuarios',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Un cargo puede tener muchas preguntas
    Cargo.hasMany(models.Pregunta, {
      foreignKey: 'cargo_id',
      as: 'preguntas',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Un cargo puede estar asociado a muchos formularios
    Cargo.belongsToMany(models.Formulario, {
      through: models.FormularioCargo,
      foreignKey: 'cargo_id',
      otherKey: 'formulario_id',
      as: 'formularios',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Un cargo pertenece a un departamento
    Cargo.belongsTo(models.Departamento, {
      foreignKey: 'departamento_id',
      as: 'departamento',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  return Cargo;
};
