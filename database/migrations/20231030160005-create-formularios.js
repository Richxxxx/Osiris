'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('formularios', {
      // Campos principales (más usados)
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      
      // Campos de configuración (AGRUPADOS JUNTOS)
      tipo: {
        type: Sequelize.ENUM('evaluacion', 'autoevaluacion'),
        allowNull: false,
        defaultValue: 'evaluacion',
        comment: 'Tipo de formulario: evaluación por líder o autoevaluación'
      },
      periodicidad: {
        type: Sequelize.ENUM('trimestral', 'anual'),
        allowNull: false,
        defaultValue: 'trimestral',
        comment: 'Periodicidad del formulario: trimestral o anual'
      },
      estado: {
        type: Sequelize.ENUM('activo', 'inactivo'),
        allowNull: false,
        defaultValue: 'activo',
        comment: 'Estado del formulario'
      },
      porcentajes_apartados: {
        type: Sequelize.JSONB,
        allowNull: true, // Permitir nulos para formularios trimestrales
        defaultValue: {
          competencias: 0.10,        // COMPETENCIAS, ACTITUD Y COMPORTAMIENTO 10%
          experiencia: 0.10,         // EXPERIENCIA LABORAL 10%
          convivencia: 0.10,         // CONVIVENCIA LABORAL 10%
          desempeno: 0.70            // DESEMPEÑO INDIVIDUAL 70%
        },
        comment: 'Distribución de peso por apartado (debe sumar 1). Null para formularios trimestrales'
      },
      
      // Campos de fechas
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE'),
        comment: 'Fecha de inicio del formulario'
      },
      fecha_fin: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Fecha de fin del formulario'
      },
      
      // Campos de relación (menos usados)
      creado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Usuario que creó el formulario'
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

    // Índices
    await queryInterface.addIndex('formularios', ['tipo']);
    await queryInterface.addIndex('formularios', ['periodicidad']);
    await queryInterface.addIndex('formularios', ['estado']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('formularios');
  }
};
