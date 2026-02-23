# Sistema de Evaluación de Desempeño

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

1. Copiar `.env.example` a `.env` en backend/
2. Configurar credenciales de base de datos
3. Ejecutar `npm run install:all`
4. Ejecutar `npm run db:migrate`
5. Iniciar con `npm run dev`

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

## 📊 Tecnologías

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
