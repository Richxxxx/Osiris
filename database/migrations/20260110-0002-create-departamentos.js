'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('departamentos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nombre: {
        type: Sequelize.STRING,
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'empresas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        field: 'empresa_id',
        comment: 'Empresa a la que pertenece el departamento'
      },
      estado: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // Índices
    await queryInterface.addIndex('departamentos', ['empresa_id']);
    await queryInterface.addIndex('departamentos', ['estado']);
    // Índice compuesto único por empresa y nombre
    await queryInterface.addIndex('departamentos', {
      fields: ['empresa_id', 'nombre'],
      unique: true,
      name: 'departamentos_empresa_nombre_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('departamentos');
  }
};
