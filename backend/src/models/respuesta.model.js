const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Respuesta = sequelize.define('Respuesta', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    evaluacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'evaluacion_id',
      references: {
        model: 'evaluaciones',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    pregunta_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'pregunta_id',
      references: {
        model: 'preguntas',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    valor: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'valor',
      comment: 'Puede ser texto, número o JSON según el tipo de pregunta'
    },
    puntuacion: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'puntuacion'
    },
    comentarios: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'comentarios'
    }
  }, {
    tableName: 'respuestas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
  });

  // Definir las asociaciones
  Respuesta.associate = function(models) {
    // Una respuesta pertenece a una evaluación
    Respuesta.belongsTo(models.Evaluacion, {
      foreignKey: 'evaluacion_id',
      as: 'evaluacion',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Una respuesta pertenece a una pregunta
    Respuesta.belongsTo(models.Pregunta, {
      foreignKey: 'pregunta_id',
      as: 'pregunta',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return Respuesta;
};
