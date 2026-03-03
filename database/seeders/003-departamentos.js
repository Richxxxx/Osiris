'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const departamentos = [
      {
        nombre: 'Calidad y SST',
        descripcion: 'Departamento encargado del aseguramiento de calidad y seguridad y salud en el trabajo',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'Comercial',
        descripcion: 'Departamento responsable de ventas y gestión de clientes',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'Logistica y Compras',
        descripcion: 'Departamento encargado de almacenamiento, distribución, adquisiciones y gestión de proveedores',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'Financiera',
        descripcion: 'Departamento responsable de contabilidad y gestión financiera',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'Gestion Humana',
        descripcion: 'Departamento encargado de talento humano y bienestar laboral',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'Mantenimiento',
        descripcion: 'Departamento responsable del mantenimiento preventivo y correctivo',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'Produccion',
        descripcion: 'Departamento encargado de los procesos productivos',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'Sistemas',
        descripcion: 'Departamento de infraestructura tecnológica y soporte TI',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'Tesoreria',
        descripcion: 'Departamento encargado del manejo de caja y flujo de dinero',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        nombre: 'Transito Xpress',
        descripcion: 'Unidad operativa encargada de la gestión de trámites de tránsito',
        empresa_id: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('departamentos', departamentos);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('departamentos', null, {});
  }
};
