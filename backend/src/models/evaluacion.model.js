const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Evaluacion = sequelize.define('Evaluacion', {
    // Campos principales (más usados)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    evaluadoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'evaluado_id',
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'Usuario que es evaluado'
    },
    evaluadorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'evaluador_id',
      references: {
        model: 'usuarios',
        key: 'id'
      },
      comment: 'Usuario que realiza la evaluación'
    },
    
    // Campos de período y estado
    periodo: {
      type: DataTypes.ENUM('Q1', 'Q2', 'Q3', 'Q4'),
      allowNull: false,
      comment: 'Trimestre de evaluación'
    },
    anio: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Año de evaluación'
    },
    estado: {
      type: DataTypes.ENUM('pendiente', 'en_progreso', 'asignada', 'completada'),
      defaultValue: 'pendiente',
      comment: 'Estado actual de la evaluación'
    },
    periodicidad: {
      type: DataTypes.ENUM('trimestral', 'anual'),
      allowNull: false,
      defaultValue: 'trimestral',
      comment: 'Tipo de periodicidad: trimestral o anual'
    },
    
    // Campos organizacionales
    departamento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'departamento_id',
      references: {
        model: 'departamentos',
        key: 'id'
      },
      comment: 'Departamento del evaluado'
    },
    cargo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'cargo_id',
      references: {
        model: 'cargos',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Cargo del evaluado'
    },
    formulario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'formulario_id',
      references: {
        model: 'formularios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Formulario utilizado para la evaluación'
    },
    
    // Campos de resultados (AGRUPADOS JUNTOS)
    puntuacionTotal: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
      field: 'puntuacion_total',
      comment: 'Puntuación total obtenida'
    },
    valoracion_anual: {
      type: DataTypes.ENUM('EXCELENTE', 'SOBRESALIENTE', 'BUENO', 'ACEPTABLE', 'DEFICIENTE'),
      allowNull: true,
      comment: 'Valoración cualitativa final para evaluaciones anuales'
    },
    valoracion_trimestral: {
      type: DataTypes.ENUM('DESTACADO', 'BUENO', 'BAJO'),
      allowNull: true,
      field: 'valoracion_trimestral',
      comment: 'Valoración cualitativa final para evaluaciones trimestrales'
    },
    
    // Campos de fechas
    fechaInicio: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'fecha_inicio',
      comment: 'Fecha de inicio de la evaluación'
    },
    fechaFin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fecha_fin',
      comment: 'Fecha de finalización de la evaluación'
    }
  }, {
    tableName: 'evaluaciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
    indexes: [
      // Evitar evaluaciones duplicadas para el mismo evaluado en el mismo período
      {
        unique: true,
        fields: ['evaluadoId', 'periodo', 'anio'],
        name: 'evaluaciones_evaluado_periodo_anio'
      }
    ]
  });

  // Definir las asociaciones
  Evaluacion.associate = function(models) {
    // Asociación con Cargo
    Evaluacion.belongsTo(models.Cargo, {
      foreignKey: 'cargo_id',
      as: 'cargo',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Asociación con Departamento
    Evaluacion.belongsTo(models.Departamento, {
      foreignKey: 'departamento_id',
      as: 'departamento',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Asociación con Usuario (evaluador)
    Evaluacion.belongsTo(models.Usuario, {
      foreignKey: 'evaluadorId',
      as: 'evaluador',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Asociación con Usuario (evaluado)
    Evaluacion.belongsTo(models.Usuario, {
      foreignKey: 'evaluadoId',
      as: 'evaluado',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Asociación con Formulario
    Evaluacion.belongsTo(models.Formulario, {
      foreignKey: 'formulario_id',
      as: 'formulario',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Asociación con Respuesta
    Evaluacion.hasMany(models.Respuesta, {
      foreignKey: 'evaluacion_id',
      as: 'respuestas',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return Evaluacion;
};
