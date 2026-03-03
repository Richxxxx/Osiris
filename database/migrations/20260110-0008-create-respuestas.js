'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('respuestas', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      evaluacion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'evaluaciones',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      pregunta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'preguntas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      valor: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Puede ser texto, número o JSON según el tipo de pregunta'
      },
      puntuacion: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      comentarios: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('respuestas');
  }
};
