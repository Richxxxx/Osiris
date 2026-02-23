const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    // Campos principales (más usados)
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cedula: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Identificación única del usuario'
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del usuario'
    },
    apellido: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'apellido',
      comment: 'Apellido del usuario'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true, // Permitir usuarios sin email
      unique: true,
      validate: {
        isEmail: true
      },
      comment: 'Correo electrónico (opcional)'
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Contraseña encriptada'
    },
    
    // Campos organizacionales
    rol_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'rol_id',
      comment: 'Rol del usuario en el sistema'
    },
    departamento_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'departamento_id',
      comment: 'Departamento al que pertenece'
    },
    cargo_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'cargo_id',
      comment: 'Cargo o posición del usuario'
    },
    empresa: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Empresa a la que pertenece el usuario'
    },
    
    // Campos de estado y fechas laborales
    estado: {
      type: DataTypes.ENUM('activo', 'inactivo'),
      defaultValue: 'activo',
      comment: 'Estado del usuario en el sistema'
    },
    fecha_ingreso_empresa: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'fecha_ingreso_empresa',
      comment: 'Fecha de ingreso específica a la empresa actual'
    },
    
    // Campos de autenticación (menos usados)
    refresh_token: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'refresh_token',
      comment: 'Token de refresco para JWT'
    },
    refresh_token_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'refresh_token_expires',
      comment: 'Expiración del token de refresco'
    },
    
    // Campos de recuperación de contraseña (menos usados)
    password_reset_token: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'password_reset_token',
      comment: 'Token para recuperación de contraseña'
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_reset_expires',
      comment: 'Expiración del token de recuperación'
    }
  }, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true, // Habilitar borrado lógico
    hooks: {
      beforeCreate: async (usuario) => {
        // Encriptar contraseña si existe
        if (usuario.password) {
          const salt = await bcrypt.genSalt(10);
          usuario.password = await bcrypt.hash(usuario.password, salt);
        }
      },
      beforeUpdate: async (usuario) => {
        // Si se actualiza la contraseña, encriptarla
        if (usuario.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          usuario.password = await bcrypt.hash(usuario.password, salt);
        }
      }
    }
  });

  // Método para comparar contraseñas
  Usuario.prototype.validarPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  // Asociaciones
  Usuario.associate = (models) => {
    Usuario.belongsTo(models.Rol, {
      foreignKey: 'rol_id',
      as: 'rol',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
    
    Usuario.belongsTo(models.Departamento, {
      foreignKey: 'departamento_id',
      as: 'departamento',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    
    Usuario.belongsTo(models.Cargo, {
      foreignKey: 'cargo_id',
      as: 'cargo',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  return Usuario;
};
