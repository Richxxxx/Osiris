# Sistema de Evaluación de Desempeño

## 🌟 Características Principales

- 🏢 **Gestión de empleados** con roles y departamentos
- 📊 **Evaluaciones trimestrales y anuales** automáticas
- 👤 **Dashboard para empleados** con progreso en tiempo real
- 🔍 **Panel de evaluadores** con asignaciones automáticas
- 📧 **Sistema de notificaciones** por correo electrónico
- 🔐 **Autenticación JWT** segura y robusta
- 📱 **Interfaz moderna** con Ant Design y TailwindCSS
- 🐳 **Soporte Docker** para producción

## 📁 Estructura del Proyecto

```
EvaluacionesDes/
├── backend/                 # 🚀 Backend Node.js + Express
│   ├── src/
│   │   ├── controllers/     # Lógica de negocio
│   │   ├── models/          # Modelos Sequelize
│   │   ├── routes/          # Rutas API
│   │   ├── middleware/      # Middlewares
│   │   ├── services/        # Servicios
│   │   ├── utils/           # Utilidades
│   │   └── server.js        # Servidor principal
│   ├── config/              # Configuración
│   ├── package.json         # Dependencias backend
│   └── .env                 # Variables entorno backend
├── frontend/                # 🎨 Frontend React + Vite
│   ├── src/                 # Código fuente
│   ├── public/              # Archivos estáticos
│   └── package.json         # Dependencias frontend
├── database/                # 🗄️ Base de datos
│   ├── migrations/          # Migraciones Sequelize
│   └── seeders/             # Datos iniciales
├── docs/                    # 📚 Documentación
├── test/                    # 🧪 Tests
└── package.json             # Scripts de orquestación
```

## 🚀 Comandos de Desarrollo

### Instalación
```bash
npm run install:all  # Instala dependencias de todo el proyecto
```

### Desarrollo Local
```bash
npm run dev           # Inicia backend (5000) y frontend (3000) simultáneamente
npm run backend:dev   # Solo backend en modo desarrollo
npm run frontend:dev  # Solo frontend en modo desarrollo
```

### Producción Local
```bash
npm run dev:prod       # Inicia backend (9092) y frontend (3000) en modo producción
npm run backend:prod   # Solo backend en puerto 9092 producción
npm run frontend:build # Construye frontend para producción
npm run frontend:preview # Previsualiza frontend construido
```

### Docker Producción
```bash
# Iniciar todos los servicios en producción
docker-compose up -d

# Detener servicios
docker-compose down

# Ver logs
docker-compose logs -f
```

### Base de Datos
```bash
npm run db:migrate       # Ejecuta migraciones
npm run db:seed          # Inserta datos iniciales
npm run db:reset         # Reinicia base de datos completa
```

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 13+
- npm 9+

## 🔧 Configuración

1. **Variables de entorno:**
   ```bash
   # Copiar archivo de ejemplo
   cp backend/.env.example backend/.env
   
   # Configurar credenciales (NO usar las del ejemplo)
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña_segura
   DB_NAME=EvaluacionesDesem
   JWT_SECRET=tu_clave_secreta_muy_larga_y_segura
   ```

2. **Instalación de dependencias:**
   ```bash
   npm run install:all  # Instala todo el proyecto
   ```

3. **Base de datos:**
   ```bash
   npm run db:migrate  # Crea tablas
   npm run db:seed     # Inserta datos iniciales
   ```

4. **Iniciar desarrollo:**
   ```bash
   npm run dev  # Backend (5000) + Frontend (3000)
   ```

## 🎯 ¿Cómo usar el sistema?

### **Para Administradores:**
1. Ingresar como administrador
2. Crear departamentos y roles
3. Registrar empleados con sus fechas de ingreso
4. Configurar formularios de evaluación
5. Monitorear el progreso general

### **Para Evaluadores:**
1. Acceder al panel de evaluaciones
2. Ver evaluaciones asignadas automáticamente
3. Evaluar empleados durante las ventanas activas
4. Generar reportes y estadísticas

### **Para Empleados:**
1. Ver dashboard personal
2. Completar autoevaluaciones
3. Ver historial de evaluaciones
4. Recibir notificaciones por correo

## 🌐 Puertos

### Desarrollo Local
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

### Producción Local
- Backend: http://localhost:9092
- Frontend: http://localhost:3000

### Docker Producción
- Backend: http://localhost:9092
- Frontend: http://localhost:3000
- Base de Datos: localhost:5432

## �️ Solución de Problemas Comunes

### **❌ Error: "Base de datos no conecta"**
```bash
# Verificar que PostgreSQL esté corriendo
pg_isready -h localhost -p 5432

# Verificar credenciales en .env
cat backend/.env
```

### **❌ Error: "Puerto en uso"**
```bash
# Matar procesos en puertos
npx kill-port 5000 3000 9092

# O usar otros puertos cambiando en .env
PORT=5001
```

### **❌ Error: "Módulo no encontrado"**
```bash
# Reinstalar dependencias
npm run install:all

# Limpiar caché npm
npm cache clean --force
```

### **❌ Error: "Token JWT inválido"**
```bash
# Verificar JWT_SECRET en .env
# Debe ser la misma en backend y frontend
# Reiniciar servidor después de cambiar
```

## � Tecnologías

**Backend:**
- Node.js + Express
- Sequelize ORM
- PostgreSQL
- JWT Authentication
- Nodemailer

**Frontend:**
- React 18
- Vite
- Ant Design
- TailwindCSS
- Axios

## 🐳 Docker para Producción

### **Configuración rápida:**
```bash
# Clonar repositorio
git clone https://github.com/Richxxxx/Osiris.git
cd Osiris

# Configurar variables de entorno
cp backend/.env.example backend/.env
# EDITAR backend/.env con credenciales reales

# Iniciar todos los servicios
docker-compose up -d
```

### **Servicios incluidos:**
- 🐘 **PostgreSQL** con persistencia de datos
- 🚀 **Backend Node.js** en modo producción
- 🎨 **Frontend React** servido estáticamente
- 🔄 **Balanceo de carga** y redes internas

## 📝 Notas Importantes

- **⚠️ Seguridad:** Nunca subir archivos `.env` a repositorios
- **🔐 Contraseñas:** Usar claves seguras en producción
- **📧 Correo:** Configurar SMTP real para notificaciones
- **🗄️ Backups:** Realizar respaldos periódicos de la base de datos

---

## 🚀 **Desarrollado por:**
**Sistema de Evaluación de Desempeño v2.0**  
*Plataforma completa para gestión de evaluaciones de personal*

📧 **Soporte:** Para problemas o sugerencias, abrir issue en GitHub
