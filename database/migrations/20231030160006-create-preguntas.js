'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('preguntas', {
      // Campos principales (más usados)
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      formulario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'formularios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      enunciado: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      
      // Campos de configuración (AGRUPADOS JUNTOS)
      tipo: {
        type: Sequelize.ENUM('abierta', 'opcion_multiple', 'escala', 'si_no', 'titulo_seccion'),
        allowNull: false,
        defaultValue: 'opcion_multiple',
      },
      apartado: {
        type: Sequelize.ENUM('competencias', 'experiencia', 'convivencia', 'desempeno', 'comentarios'),
        allowNull: true, // Cambiado a true para permitir preguntas de sección
        defaultValue: 'competencias',
        comment: 'Área de evaluación a la que pertenece la pregunta'
      },
      opciones: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Opciones para preguntas de opción múltiple o escala'
      },
      peso: {
        type: Sequelize.FLOAT,
        defaultValue: 1.0,
        validate: {
          min: 0.1
        }
      },
      obligatoria: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      activa: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      
      // Campos de relación (menos usados)
      cargo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'cargos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      seccion_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'preguntas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Referencia al título de sección para formularios trimestrales'
      },
      
      // Timestamps (siempre al final)
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

    // Índices optimizados
    await queryInterface.addIndex('preguntas', ['formulario_id']);
    await queryInterface.addIndex('preguntas', ['apartado']);
    await queryInterface.addIndex('preguntas', ['cargo_id']);
    await queryInterface.addIndex('preguntas', ['seccion_id']);
    await queryInterface.addIndex('preguntas', ['activa']);
    await queryInterface.addIndex('preguntas', ['orden']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('preguntas');
  }
};
