'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class FormularioCargo extends Model {
    static associate(models) {
      // Relaciones explícitas
      FormularioCargo.belongsTo(models.Formulario, {
        foreignKey: 'formulario_id',
        as: 'formulario'
      });
      
      FormularioCargo.belongsTo(models.Cargo, {
        foreignKey: 'cargo_id',
        as: 'cargo'
      });
    }
  }

  FormularioCargo.init({
    formulario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'formularios',
        key: 'id'
      },
      primaryKey: true
    },
    cargo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cargos',
        key: 'id'
      },
      primaryKey: true
    }
  }, {
    sequelize,
    modelName: 'FormularioCargo',
    tableName: 'formulario_cargos',
    timestamps: false,  // Desactivar timestamps
    underscored: true
  });

  return FormularioCargo;
};
