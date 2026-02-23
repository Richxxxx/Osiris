const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Formulario = sequelize.define('Formulario', {
    // Campos principales (más usados)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Campos de configuración (AGRUPADOS JUNTOS)
    tipo: {
      type: DataTypes.ENUM('evaluacion', 'autoevaluacion'),
      allowNull: false,
      defaultValue: 'evaluacion',
      comment: 'Tipo de formulario: evaluación por líder o autoevaluación'
    },
    periodicidad: {
      type: DataTypes.ENUM('trimestral', 'anual'),
      allowNull: false,
      defaultValue: 'trimestral',
      comment: 'Periodicidad del formulario: trimestral (Q1,Q2,Q3,Q4) o anual'
    },
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      allowNull: false,
      defaultValue: 'activo',
      comment: 'Estado del formulario'
    },
    porcentajes_apartados: {
      type: DataTypes.JSONB,
      allowNull: true, // Cambiado a true para formularios trimestrales
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
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'fecha_inicio',
      comment: 'Fecha de inicio del formulario'
    },
    fecha_fin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'fecha_fin',
      comment: 'Fecha de fin del formulario'
    },
    
    // Campos de relación (menos usados)
    creado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'creado_por',
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Usuario que creó el formulario'
    }
  }, {
    tableName: 'formularios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true
  });

  // Definir las asociaciones
  Formulario.associate = function(models) {
    // Un formulario puede tener muchas preguntas
    Formulario.hasMany(models.Pregunta, {
      foreignKey: 'formulario_id',
      as: 'preguntas',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Un formulario puede estar asociado a muchos cargos (a través de las preguntas)
    Formulario.belongsToMany(models.Cargo, {
      through: models.FormularioCargo,
      foreignKey: 'formulario_id',
      otherKey: 'cargo_id',
      as: 'cargos',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return Formulario;
};
