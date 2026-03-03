#!/usr/bin/env node

const { sequelize } = require('./backend/src/models');

async function testSeeders() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa');

    console.log('\n📊 Probando seeders en orden...');
    
    // 1. Roles
    console.log('\n1️⃣ Ejecutando seeder de roles...');
    await sequelize.import('./database/seeders/001-roles.js').up(sequelize.getQueryInterface(), require('sequelize'));
    console.log('✅ Roles creados');

    // 2. Empresas
    console.log('\n2️⃣ Ejecutando seeder de empresas...');
    await sequelize.import('./database/seeders/002-empresas.js').up(sequelize.getQueryInterface(), require('sequelize'));
    console.log('✅ Empresas creadas');

    // 3. Departamentos
    console.log('\n3️⃣ Ejecutando seeder de departamentos...');
    await sequelize.import('./database/seeders/003-departamentos.js').up(sequelize.getQueryInterface(), require('sequelize'));
    console.log('✅ Departamentos creados');

    // 4. Cargos
    console.log('\n4️⃣ Ejecutando seeder de cargos...');
    await sequelize.import('./database/seeders/004-cargos.js').up(sequelize.getQueryInterface(), require('sequelize'));
    console.log('✅ Cargos creados');

    // 5. Formularios
    console.log('\n5️⃣ Ejecutando seeder de formularios...');
    await sequelize.import('./database/seeders/005-formularios.js').up(sequelize.getQueryInterface(), require('sequelize'));
    console.log('✅ Formularios creados');

    // 6. Preguntas
    console.log('\n6️⃣ Ejecutando seeder de preguntas...');
    await sequelize.import('./database/seeders/006-preguntas.js').up(sequelize.getQueryInterface(), require('sequelize'));
    console.log('✅ Preguntas creadas');

    // 7. Usuarios
    console.log('\n7️⃣ Ejecutando seeder de usuarios...');
    await sequelize.import('./database/seeders/008-usuarios.js').up(sequelize.getQueryInterface(), require('sequelize'));
    console.log('✅ Usuarios creados');

    console.log('\n🎉 TODOS LOS SEEDERS FUNCIONAN CORRECTAMENTE');
    
    // Verificar datos
    console.log('\n📊 Verificando datos creados...');
    const [rolesCount] = await sequelize.query("SELECT COUNT(*) as count FROM roles");
    const [empresasCount] = await sequelize.query("SELECT COUNT(*) as count FROM empresas");
    const [departamentosCount] = await sequelize.query("SELECT COUNT(*) as count FROM departamentos");
    const [cargosCount] = await sequelize.query("SELECT COUNT(*) as count FROM cargos");
    const [formulariosCount] = await sequelize.query("SELECT COUNT(*) as count FROM formularios");
    const [preguntasCount] = await sequelize.query("SELECT COUNT(*) as count FROM preguntas");
    const [usuariosCount] = await sequelize.query("SELECT COUNT(*) as count FROM usuarios");

    console.log(`📊 Roles: ${rolesCount[0].count}`);
    console.log(`🏢 Empresas: ${empresasCount[0].count}`);
    console.log(`🏢 Departamentos: ${departamentosCount[0].count}`);
    console.log(`💼 Cargos: ${cargosCount[0].count}`);
    console.log(`📋 Formularios: ${formulariosCount[0].count}`);
    console.log(`❓ Preguntas: ${preguntasCount[0].count}`);
    console.log(`👥 Usuarios: ${usuariosCount[0].count}`);

    console.log('\n✅ Seeders listos para producción');

  } catch (error) {
    console.error('❌ Error en seeders:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testSeeders();
