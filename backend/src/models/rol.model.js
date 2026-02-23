const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Rol = sequelize.define('Rol', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.ENUM('administrador', 'evaluador', 'empleado', 'gestion'),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    permisos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
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
    tableName: 'roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: false // No usar paranoid en roles para evitar problemas con ENUM
  });

  // Asociaciones
  Rol.associate = (models) => {
    Rol.hasMany(models.Usuario, {
      foreignKey: 'rol_id',
      as: 'usuarios'
    });
  };

  return Rol;
};
