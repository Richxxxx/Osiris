const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const basename = path.basename(__filename);

// Configuración directa desde variables de entorno
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
      paranoid: false,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      defaultScope: {
        attributes: {
          exclude: ['created_at', 'updated_at', 'deleted_at']
        }
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Probar la conexión a la base de datos
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente.');
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
    process.exit(1);
  }
}

testConnection();

const db = {
  sequelize,  // Asegurarse de que sequelize esté disponible en el objeto db
  Sequelize,  // También exportar la clase Sequelize por si se necesita
  Op: Sequelize.Op  // Exportar los operadores de Sequelize
};

// Importar modelos
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Importar modelos en orden correcto para evitar dependencias circulares
const Rol = require('./rol.model')(sequelize, DataTypes);
const Usuario = require('./usuario.model')(sequelize, DataTypes);
const Departamento = require('./departamento.model')(sequelize, DataTypes);
const Cargo = require('./cargo.model')(sequelize, DataTypes);
const FormularioCargo = require('./formularioCargo.model')(sequelize, DataTypes);
const Formulario = require('./formulario.model')(sequelize, DataTypes);
const Pregunta = require('./pregunta.model')(sequelize, DataTypes);
const Evaluacion = require('./evaluacion.model')(sequelize, DataTypes);
const Respuesta = require('./respuesta.model')(sequelize, DataTypes);

// Asignar modelos al objeto db
db.Rol = Rol;
db.Usuario = Usuario;
db.Departamento = Departamento;
db.Cargo = Cargo;
db.FormularioCargo = FormularioCargo;
db.Formulario = Formulario;
db.Pregunta = Pregunta;
db.Evaluacion = Evaluacion;
db.Respuesta = Respuesta;

// Configurar asociaciones
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Asociación entre Usuario y Departamento
Usuario.belongsTo(Departamento, {
  foreignKey: 'departamento_id',
  as: 'departamentoPrincipal'
});

Departamento.hasMany(Usuario, {
  foreignKey: 'departamento_id',
  as: 'miembrosDepartamento'
});

// La relación entre Pregunta y Cargo ya está definida en el modelo Pregunta

// Asociación Usuario -> Rol (Muchos a Uno)
Usuario.belongsTo(Rol, { 
  foreignKey: 'rol_id',
  as: 'rolUsuario'
});

Rol.hasMany(Usuario, { 
  foreignKey: 'rol_id',
  as: 'usuariosConRol'
});

// La relación entre Formulario y Pregunta ya está definida en el modelo Formulario

// NOTA: La relación Evaluacion -> Formulario está definida en evaluacion.model.js
// para evitar duplicaciones y conflictos de alias

// Formulario.hasMany(Evaluacion, { 
//   foreignKey: 'formularioId',
//   as: 'evaluaciones'
// });

// Asociaciones de Evaluación con Usuario (Evaluador, Evaluado, Revisor)
// Estas asociaciones ahora están definidas en el modelo Evaluacion
// para evitar conflictos de alias

// Relaciones inversas para Usuario
Usuario.hasMany(Evaluacion, { 
  as: 'evaluacionesRealizadas', 
  foreignKey: 'evaluadorId' 
});

Usuario.hasMany(Evaluacion, { 
  as: 'evaluacionesRecibidas', 
  foreignKey: 'evaluadoId' 
});

// Las relaciones de Respuesta ya están definidas en el modelo Respuesta

module.exports = db;
