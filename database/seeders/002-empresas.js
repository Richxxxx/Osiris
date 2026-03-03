'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const empresas = [
      {
        nombre: 'SOLUCIONES CORPORATIVAS INTEGRALES',
        identificacion: '9003214725',
        descripcion: 'Empresa de impresión y servicios asociados',
        estado: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'EMTRA',
        identificacion: '9002780198',
        descripcion: 'Empresa de servicios de tránsito y transporte',
        estado: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('empresas', empresas);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('empresas', null, {});
  }
};
