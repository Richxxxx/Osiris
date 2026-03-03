'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('empresas', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Nombre único de la empresa'
      },
      identificacion: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Identificación fiscal (NIT, RUC, etc.)'
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Descripción de la empresa'
      },
      estado: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Estado activo/inactivo de la empresa'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Fecha de creación del registro'
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Fecha de última actualización'
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Fecha de borrado lógico'
      }
    });

    // Índices
    await queryInterface.addIndex('empresas', ['nombre'], { unique: true });
    await queryInterface.addIndex('empresas', ['identificacion'], { unique: true, where: { identificacion: { [Sequelize.Op.ne]: null } } });
    await queryInterface.addIndex('empresas', ['estado']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('empresas');
  }
};
