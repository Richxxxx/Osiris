'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Primero creamos el tipo ENUM si no existe
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        -- Eliminar la tabla si existe para evitar conflictos
        DROP TABLE IF EXISTS roles CASCADE;
        
        -- Eliminar el tipo ENUM si existe
        DROP TYPE IF EXISTS enum_roles_nombre CASCADE;
        
        -- Crear el tipo ENUM
        CREATE TYPE enum_roles_nombre AS ENUM ('administrador', 'evaluador', 'empleado', 'gestion');
      END $$;
    `);

    // 2. Creamos la tabla con el tipo ENUM pero sin la restricción UNIQUE
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nombre: {
        type: 'enum_roles_nombre',
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      permisos: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
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

    // 3. Añadimos la restricción UNIQUE por separado
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        -- Eliminar la restricción si ya existe
        IF EXISTS (
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'roles' AND constraint_name = 'roles_nombre_unique'
        ) THEN
          ALTER TABLE roles DROP CONSTRAINT roles_nombre_unique;
        END IF;
        
        -- Añadir la restricción UNIQUE
        ALTER TABLE roles 
        ADD CONSTRAINT roles_nombre_unique 
        UNIQUE (nombre);
      END $$;
    `);

    // ✅ MOVIDO A SEEDER: No insertar datos en migración
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('roles');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_roles_nombre" CASCADE');
  }
};
