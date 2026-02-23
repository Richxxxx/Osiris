'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Primero eliminamos la tabla si existe
    await queryInterface.dropTable('evaluaciones');

    // Luego la creamos con la estructura definitiva y actualizada
    await queryInterface.createTable('evaluaciones', {
      // Campos principales (más usados)
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      evaluadoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        field: 'evaluado_id',
        comment: 'Usuario que es evaluado'
      },
      evaluadorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        field: 'evaluador_id',
        comment: 'Usuario que realiza la evaluación'
      },
      
      // Campos de período y estado
      periodo: {
        type: Sequelize.ENUM('Q1', 'Q2', 'Q3', 'Q4'),
        allowNull: false,
        comment: 'Trimestre de evaluación'
      },
      anio: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Año de evaluación'
      },
      estado: {
        type: Sequelize.ENUM('pendiente', 'en_progreso', 'asignada', 'completada'),
        defaultValue: 'pendiente',
        comment: 'Estado actual de la evaluación'
      },
      periodicidad: {
        type: Sequelize.ENUM('trimestral', 'anual'),
        allowNull: false,
        defaultValue: 'trimestral',
        comment: 'Tipo de periodicidad: trimestral o anual'
      },
      
      // Campos organizacionales
      departamento_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'departamentos',
          key: 'id'
        },
        field: 'departamento_id',
        comment: 'Departamento del evaluado'
      },
      cargo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'cargos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'cargo_id',
        comment: 'Cargo del evaluado'
      },
      formulario_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'formularios',
          key: 'id'
        },
        field: 'formulario_id',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Formulario utilizado para la evaluación'
      },
      
      // Campos de resultados (AGRUPADOS JUNTOS)
      puntuacionTotal: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: null,
        field: 'puntuacion_total',
        comment: 'Puntuación total obtenida'
      },
      valoracion_anual: {
        type: Sequelize.ENUM('EXCELENTE', 'SOBRESALIENTE', 'BUENO', 'ACEPTABLE', 'DEFICIENTE'),
        allowNull: true,
        comment: 'Valoración cualitativa final para evaluaciones anuales'
      },
      valoracion_trimestral: {
        type: Sequelize.ENUM('DESTACADO', 'BUENO', 'BAJO'),
        allowNull: true,
        field: 'valoracion_trimestral',
        comment: 'Valoración cualitativa final para evaluaciones trimestrales'
      },
      
      // Campos de fechas
      fechaInicio: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE'),
        field: 'fecha_inicio',
        comment: 'Fecha de inicio de la evaluación'
      },
      fechaFin: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'fecha_fin',
        comment: 'Fecha de finalización de la evaluación'
      },
      
      // Timestamps (siempre al final)
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

    // Índices para optimizar consultas frecuentes
    await queryInterface.addIndex('evaluaciones', ['evaluado_id'], {
      comment: 'Búsquedas por evaluado'
    });
    await queryInterface.addIndex('evaluaciones', ['evaluador_id'], {
      comment: 'Búsquedas por evaluador'
    });
    await queryInterface.addIndex('evaluaciones', ['departamento_id'], {
      comment: 'Búsquedas por departamento'
    });
    await queryInterface.addIndex('evaluaciones', ['estado'], {
      comment: 'Búsquedas por estado'
    });
    await queryInterface.addIndex('evaluaciones', ['periodo', 'anio'], {
      comment: 'Búsquedas por período'
    });
    
    // Índice compuesto para evitar duplicados - un evaluado solo puede tener una evaluación por período
    await queryInterface.addIndex('evaluaciones', {
      fields: ['evaluado_id', 'periodo', 'anio'],
      unique: true,
      name: 'evaluaciones_evaluado_periodo_anio',
      comment: 'Evita evaluaciones duplicadas por usuario y período'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('evaluaciones');
  }
};
