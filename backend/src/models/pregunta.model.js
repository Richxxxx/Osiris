const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Pregunta = sequelize.define('Pregunta', {
    // Campos principales (más usados)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    formulario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'formulario_id',
      references: {
        model: 'formularios',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    enunciado: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    
    // Campos de configuración (AGRUPADOS JUNTOS)
    tipo: {
      type: DataTypes.ENUM('abierta', 'opcion_multiple', 'escala', 'si_no', 'titulo_seccion'),
      allowNull: false,
      defaultValue: 'opcion_multiple',
    },
    apartado: {
      type: DataTypes.ENUM('competencias', 'experiencia', 'convivencia', 'desempeno', 'comentarios'),
      allowNull: true, // Cambiado a true para soportar titulos de sección
      defaultValue: 'competencias',
      field: 'apartado'
    },
    opciones: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Opciones para preguntas de opción múltiple o escala en formato: [{valor: "Opción 1", puntuacion: 1}, ...]',
      get() {
        const rawValue = this.getDataValue('opciones');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        // Si es null, mantenerlo como null (para preguntas abiertas)
        if (value === null) {
          this.setDataValue('opciones', null);
        } else {
          this.setDataValue('opciones', JSON.stringify(value || []));
        }
      }
    },
    peso: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
      validate: {
        min: 0  // Permitir peso 0 para preguntas de comentarios
      }
    },
    obligatoria: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    activa: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // Campos de relación (menos usados)
    cargo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'cargo_id',
      references: {
        model: 'cargos',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    seccion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'seccion_id',
      references: {
        model: 'preguntas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Referencia al título de sección para formularios trimestrales'
    }
  }, {
    tableName: 'preguntas',
    timestamps: true,  // ✅ Usa created_at y updated_at automáticamente
    paranoid: true,     // ✅ Usa deleted_at automáticamente
    underscored: false,  // ✅ NO usar snake_case (evita fecha_creacion)
    createdAt: 'created_at',  // ✅ Forzar nombre exacto
    updatedAt: 'updated_at',  // ✅ Forzar nombre exacto
    deletedAt: 'deleted_at',   // ✅ Forzar nombre exacto
    getterMethods: {
      // Método para obtener las opciones como array
      opcionesArray() {
        return this.opciones || [];
      }
    }
  });

  Pregunta.associate = function(models) {
    // Relación con Cargo
    Pregunta.belongsTo(models.Cargo, {
      foreignKey: 'cargo_id',
      as: 'cargo',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Relación con Formulario
    Pregunta.belongsTo(models.Formulario, {
      foreignKey: 'formulario_id',
      as: 'formulario',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Auto-relación para títulos de sección (trimestral)
    Pregunta.hasMany(Pregunta, {
      foreignKey: 'seccion_id',
      as: 'preguntasDeSeccion',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    Pregunta.belongsTo(Pregunta, {
      foreignKey: 'seccion_id',
      as: 'seccion',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  return Pregunta;
};
