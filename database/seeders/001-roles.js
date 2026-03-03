'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const roles = [
      { 
        nombre: 'administrador', 
        descripcion: 'Administrador del sistema con acceso completo',
        permisos: JSON.stringify({}), // Convertir a string para JSONB
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        nombre: 'evaluador', 
        descripcion: 'Líder que evalúa el desempeño de su equipo',
        permisos: JSON.stringify({}), // Convertir a string para JSONB
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        nombre: 'empleado', 
        descripcion: 'Empleado que es evaluado por su líder',
        permisos: JSON.stringify({}), // Convertir a string para JSONB
        created_at: new Date(), 
        updated_at: new Date() 
      },
      { 
        nombre: 'gestion', 
        descripcion: 'Personal de Recursos Humanos para gestión y seguimiento',
        permisos: JSON.stringify({}), // Convertir a string para JSONB
        created_at: new Date(), 
        updated_at: new Date() 
      }
    ];

    await queryInterface.bulkInsert('roles', roles);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles', null, {});
  }
};
