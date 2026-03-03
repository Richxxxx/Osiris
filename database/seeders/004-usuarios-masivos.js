'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Obtener IDs de roles, empresas y departamentos
    const [rolesResult] = await queryInterface.sequelize.query(
      'SELECT id, nombre FROM roles ORDER BY id'
    );
    
    const [empresasResult] = await queryInterface.sequelize.query(
      'SELECT id, nombre FROM empresas ORDER BY id'
    );
    
    const [departamentosResult] = await queryInterface.sequelize.query(
      'SELECT id, nombre FROM departamentos ORDER BY id'
    );

    const roles = rolesResult.reduce((acc, role) => {
      acc[role.nombre] = role.id;
      return acc;
    }, {});

    const empresas = empresasResult.reduce((acc, empresa) => {
      acc[empresa.nombre] = empresa.id;
      return acc;
    }, {});

    const departamentos = departamentosResult.reduce((acc, depto) => {
      acc[depto.nombre] = depto.id;
      return acc;
    }, {});

    // Usuarios masivos con contraseñas seguras
    const usuarios = [
      // Administradores
      {
        cedula: '801234567',
        nombre: 'Administrador Principal',
        email: 'admin@solucionescorporativas.com',
        password: await bcrypt.hash('Admin123!', 10),
        rol_id: roles.administrador,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Sistemas'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '802345678',
        nombre: 'Administrador EMTRA',
        email: 'admin@emtra.com',
        password: await bcrypt.hash('Admin123!', 10),
        rol_id: roles.administrador,
        empresa_id: empresas['EMTRA'],
        departamento_id: departamentos['Sistemas'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      
      // Evaluadores por departamento
      {
        cedula: '803456789',
        nombre: 'Jefe Calidad',
        email: 'jefe.calidad@solucionescorporativas.com',
        password: await bcrypt.hash('Eval123!', 10),
        rol_id: roles.evaluador,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Calidad y SST'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '804567890',
        nombre: 'Jefe Comercial',
        email: 'jefe.comercial@solucionescorporativas.com',
        password: await bcrypt.hash('Eval123!', 10),
        rol_id: roles.evaluador,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Comercial'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '805678901',
        nombre: 'Jefe Logistica',
        email: 'jefe.logistica@solucionescorporativas.com',
        password: await bcrypt.hash('Eval123!', 10),
        rol_id: roles.evaluador,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Logistica y Compras'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '806789012',
        nombre: 'Jefe Finanzas',
        email: 'jefe.finanzas@solucionescorporativas.com',
        password: await bcrypt.hash('Eval123!', 10),
        rol_id: roles.evaluador,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Financiera'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '807890123',
        nombre: 'Jefe RRHH',
        email: 'jefe.rrhh@solucionescorporativas.com',
        password: await bcrypt.hash('Eval123!', 10),
        rol_id: roles.evaluador,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Gestion Humana'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      
      // Personal de RRHH para gestión
      {
        cedula: '808901234',
        nombre: 'Personal RRHH 1',
        email: 'rrhh1@solucionescorporativas.com',
        password: await bcrypt.hash('Gestion123!', 10),
        rol_id: roles.gestion,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Gestion Humana'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '809012345',
        nombre: 'Personal RRHH 2',
        email: 'rrhh2@solucionescorporativas.com',
        password: await bcrypt.hash('Gestion123!', 10),
        rol_id: roles.gestion,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Gestion Humana'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      
      // Empleados de ejemplo por departamento
      {
        cedula: '810123456',
        nombre: 'Empleado Calidad 1',
        email: 'emp.calidad1@solucionescorporativas.com',
        password: await bcrypt.hash('Emp123!', 10),
        rol_id: roles.empleado,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Calidad y SST'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '811234567',
        nombre: 'Empleado Comercial 1',
        email: 'emp.comercial1@solucionescorporativas.com',
        password: await bcrypt.hash('Emp123!', 10),
        rol_id: roles.empleado,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Comercial'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '812345678',
        nombre: 'Empleado Logistica 1',
        email: 'emp.logistica1@solucionescorporativas.com',
        password: await bcrypt.hash('Emp123!', 10),
        rol_id: roles.empleado,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Logistica y Compras'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '813456789',
        nombre: 'Empleado Finanzas 1',
        email: 'emp.finanzas1@solucionescorporativas.com',
        password: await bcrypt.hash('Emp123!', 10),
        rol_id: roles.empleado,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Financiera'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '814567890',
        nombre: 'Empleado Produccion 1',
        email: 'emp.produccion1@solucionescorporativas.com',
        password: await bcrypt.hash('Emp123!', 10),
        rol_id: roles.empleado,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Produccion'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        cedula: '815678901',
        nombre: 'Empleado Sistemas 1',
        email: 'emp.sistemas1@solucionescorporativas.com',
        password: await bcrypt.hash('Emp123!', 10),
        rol_id: roles.empleado,
        empresa_id: empresas['SOLUCIONES CORPORATIVAS INTEGRALES'],
        departamento_id: departamentos['Sistemas'],
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Insertar todos los usuarios
    await queryInterface.bulkInsert('usuarios', usuarios);

    // Crear notificaciones para todos los usuarios creados
    const notificaciones = usuarios.map(usuario => ({
      usuario_id: null, // Se asignará después de obtener los IDs
      titulo: 'Bienvenido al Sistema de Evaluaciones',
      mensaje: `Hola ${usuario.nombre}, tu cuenta ha sido creada exitosamente. Tu usuario es: ${usuario.email} y tu contraseña temporal es la asignada por el administrador. Por favor, cambia tu contraseña en tu primer inicio de sesión.`,
      tipo: 'bienvenida',
      leida: false,
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Obtener los IDs de los usuarios recién creados
    const [usuariosCreados] = await queryInterface.sequelize.query(
      `SELECT id, email FROM usuarios WHERE email IN (${usuarios.map(u => `'${u.email}'`).join(',')}) ORDER BY id`
    );

    // Asignar notificaciones a cada usuario
    const notificacionesFinales = usuariosCreados.map(usuario => ({
      usuario_id: usuario.id,
      titulo: 'Bienvenido al Sistema de Evaluaciones',
      mensaje: `Tu cuenta ha sido creada exitosamente. Tu usuario es: ${usuario.email}. Por favor, cambia tu contraseña en tu primer inicio de sesión.`,
      tipo: 'bienvenida',
      leida: false,
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Insertar notificaciones
    if (notificacionesFinales.length > 0) {
      await queryInterface.bulkInsert('notificaciones', notificacionesFinales);
    }

    console.log(`✅ ${usuarios.length} usuarios creados exitosamente`);
    console.log(`✅ ${notificacionesFinales.length} notificaciones de bienvenida enviadas`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('usuarios', null, {});
    await queryInterface.bulkDelete('notificaciones', { tipo: 'bienvenida' }, {});
  }
};
