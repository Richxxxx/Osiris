'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('formulario_cargos', {
      formulario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'formularios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        primaryKey: true,
        comment: 'ID del formulario asociado'
      },
      cargo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cargos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        primaryKey: true,
        comment: 'ID del cargo asociado'
      }
    });

    // Índices para optimizar consultas
    await queryInterface.addIndex('formulario_cargos', ['formulario_id']);
    await queryInterface.addIndex('formulario_cargos', ['cargo_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('formulario_cargos');
  }
};
