const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Departamento = sequelize.define('Departamento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'empresa_id',
      comment: 'Empresa a la que pertenece el departamento'
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'departamentos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true
  });

  // Asociaciones
  Departamento.associate = (models) => {
    Departamento.belongsTo(models.Empresa, {
      foreignKey: 'empresa_id',
      as: 'empresa',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    
    Departamento.hasMany(models.Usuario, {
      foreignKey: 'departamento_id',
      as: 'usuarios'
    });
  };

  return Departamento;
};
