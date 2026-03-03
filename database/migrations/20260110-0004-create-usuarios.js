'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('usuarios', {
      // Campos principales (más usados)
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      cedula: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Identificación única del usuario'
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nombre del usuario'
      },
      apellido: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Apellido del usuario'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true, // Permitir usuarios sin email
        unique: true,
        validate: {
          isEmail: true
        },
        comment: 'Correo electrónico (opcional)'
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Contraseña encriptada'
      },
      
      // Campos organizacionales
      rol_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        field: 'rol_id',
        comment: 'Rol del usuario en el sistema'
      },
      departamento_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'departamentos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'departamento_id',
        comment: 'Departamento al que pertenece'
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
        comment: 'Cargo o posición del usuario'
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'empresas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        field: 'empresa_id',
        comment: 'Empresa a la que pertenece el usuario (puede ser nulo)'
      },
      
      // Campos de estado y fechas laborales
      estado: {
        type: Sequelize.ENUM('activo', 'inactivo'),
        defaultValue: 'activo',
        comment: 'Estado del usuario en el sistema'
      },
      fecha_ingreso_empresa: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE'),
        comment: 'Fecha de ingreso específica a la empresa actual'
      },
      
      // Campos de autenticación (menos usados)
      refresh_token: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'refresh_token',
        comment: 'Token de refresco para JWT'
      },
      refresh_token_expires: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'refresh_token_expires',
        comment: 'Expiración del token de refresco'
      },
      
      // Campos de recuperación de contraseña (menos usados)
      password_reset_token: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'password_reset_token',
        comment: 'Token para recuperación de contraseña'
      },
      password_reset_expires: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'password_reset_expires',
        comment: 'Expiración del token de recuperación'
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
    await queryInterface.addIndex('usuarios', ['cedula'], { unique: true });
    await queryInterface.addIndex('usuarios', ['email'], { unique: true, where: { email: { [Sequelize.Op.ne]: null } } });
    await queryInterface.addIndex('usuarios', ['rol_id']);
    await queryInterface.addIndex('usuarios', ['departamento_id']);
    await queryInterface.addIndex('usuarios', ['cargo_id']);
    await queryInterface.addIndex('usuarios', ['estado']);
    await queryInterface.addIndex('usuarios', ['empresa_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('usuarios');
  }
};
