# Frontend - Gestión de Formularios

## Descripción

Se ha implementado una nueva funcionalidad en el frontend para la gestión de formularios de evaluación. Esta funcionalidad permite a los administradores crear, visualizar y gestionar formularios con preguntas organizadas por apartados y asociadas a cargos específicos.

## Componentes

### 1. CrearFormulario.jsx
**Ubicación**: `src/components/evaluaciones/CrearFormulario.jsx`

Componente modal para crear nuevos formularios con las siguientes características:
- **Interfaz de pestañas** para organizar preguntas por apartados
- **Editor visual** para cada tipo de pregunta
- **Asociación de preguntas a cargos** específicos
- **Vista previa** del formulario antes de guardarlo
- **Validación** de campos obligatorios

**Características principales**:
- 4 pestañas: Competencias, Experiencia, Convivencia, Desempeño
- Tipos de pregunta: Texto libre, Opción única, Opción múltiple, Escala
- Asociación dinámica de preguntas a cargos
- Preguntas obligatorias u opcionales
- Peso configurable para cada pregunta

### 2. ListaFormularios.jsx
**Ubicación**: `src/components/evaluaciones/ListaFormularios.jsx`

Componente para listar y gestionar los formularios existentes:
- **Tabla** con todos los formularios
- **Vista previa** de cada formulario
- **Acciones** de ver, editar y eliminar
- **Filtros** por estado y departamento
- **Paginación** de resultados

### 3. Formularios.jsx
**Ubicación**: `src/pages/admin/Formularios.jsx`

Página que envuelve el componente ListaFormularios para acceso directo.

## Servicios

### formularioService.js
**Ubicación**: `src/services/formularioService.js`

Servicios para interactuar con la API de formularios:
- `crearFormulario()`: Crear nuevo formulario
- `obtenerFormularios()`: Obtener lista de formularios
- `obtenerFormularioPorId()`: Obtener formulario específico
- `actualizarFormulario()`: Actualizar formulario existente
- `eliminarFormulario()`: Eliminar formulario
- `obtenerFormulariosActivos()`: Obtener solo formularios activos

### cargoService.js
**Ubicación**: `src/services/cargoService.js`

Servicios para gestionar cargos:
- `obtenerCargos()`: Obtener todos los cargos
- `obtenerCargosPorDepartamento()`: Obtener cargos por departamento
- `crearCargo()`: Crear nuevo cargo
- `actualizarCargo()`: Actualizar cargo existente
- `eliminarCargo()`: Eliminar cargo

## Integración en el Dashboard

Se ha actualizado el Dashboard del administrador para incluir:

### Nueva Acción Rápida
- **Crear Formulario**: Botón para abrir el modal de creación de formularios
- **Icono**: Documento con color púrpura
- **Descripción**: "Diseña formularios de evaluación"

### Estado del Modal
- `showCrearFormulario`: Estado para controlar la visibilidad del modal
- Función `onSuccess`: Callback para actualizar la lista después de crear

## Rutas

### Nueva Ruta de Formularios
- **Path**: `/admin/formularios`
- **Componente**: `Formularios.jsx`
- **Acceso**: Solo administradores

## Flujo de Uso

### 1. Crear un Formulario

1. **Acceder al Dashboard** del administrador
2. **Hacer clic** en "Nuevo Formulario" en la sección de acciones rápidas
3. **Completar** los campos básicos:
   - Nombre del formulario
   - Descripción
   - Departamento (opcional)
4. **Agregar preguntas** en las diferentes pestañas:
   - Seleccionar la pestaña del apartado
   - Completar el enunciado
   - Seleccionar el tipo de pregunta
   - Agregar opciones (si aplica)
   - Seleccionar los cargos asociados
   - Marcar como obligatoria u opcional
   - Hacer clic en "Agregar pregunta"
5. **Revisar** las preguntas agregadas en cada sección
6. **Vista previa** (opcional) para verificar el formulario
7. **Guardar** el formulario

### 2. Ver Formularios Existentes

1. **Navegar** a `/admin/formularios`
2. **Ver** la lista de formularios con:
   - Nombre y descripción
   - Estado (activo/inactivo)
   - Número de preguntas por apartado
   - Departamento asociado
   - Fecha de creación
3. **Acciones disponibles**:
   - **Ver**: Vista previa completa del formulario
   - **Editar**: Modificar el formulario (por implementar)
   - **Eliminar**: Eliminar el formulario

## Características Técnicas

### Validaciones
- **Campos obligatorios**: Nombre y descripción del formulario
- **Enunciado de pregunta**: Requerido para cada pregunta
- **Opciones**: Requeridas para preguntas de opción
- **Cargos**: Validación de existencia en la base de datos

### Estados
- **loading**: Estado de carga durante peticiones API
- **activeTab**: Pestaña activa en el editor
- **preguntas**: Objeto con preguntas por apartado
- **previewVisible**: Visibilidad del modal de vista previa

### Manejo de Errores
- **Mensajes de error** descriptivos usando Ant Design message
- **Validación** de respuestas API
- **Manejo** de errores de red y servidor

## Estilos y UI

### Diseño Consistente
- **Ant Design** como librería principal
- **Colores consistentes** con el resto de la aplicación
- **Iconos significativos** para cada acción
- **Tooltips** para mejorar la usabilidad

### Responsive Design
- **Modal** adaptable a diferentes tamaños de pantalla
- **Tabla** con paginación y responsividad
- **Pestañas** funcionales en móviles

## Pruebas

### Casos de Prueba Recomendados

1. **Crear formulario básico**:
   - Nombre y descripción válidos
   - Una pregunta de texto libre
   - Sin asociación de cargos

2. **Crear formulario completo**:
   - Múltiples preguntas en diferentes apartados
   - Todos los tipos de pregunta
   - Asociación con varios cargos
   - Preguntas obligatorias y opcionales

3. **Validación de errores**:
   - Intentar guardar sin nombre
   - Intentar agregar pregunta sin enunciado
   - Seleccionar cargos inexistentes

4. **Vista previa**:
   - Ver formulario completo con todas las preguntas
   - Verificar distribución por apartados
   - Verificar asociación de cargos

5. **Lista de formularios**:
   - Ver todos los formularios
   - Probar paginación
   - Ver detalles de un formulario

## Mejoras Futuras

### Funcionalidades por Implementar
- **Edición de formularios**: Modificar formularios existentes
- **Clonación de formularios**: Duplicar formularios existentes
- **Exportación**: Exportar formularios a PDF/Excel
- **Plantillas**: Crear plantillas de formularios
- **Historial**: Versionado de cambios en formularios

### Mejoras de UX
- **Drag & Drop**: Reorganizar preguntas arrastrando
- **Autoguardado**: Guardar borradores automáticamente
- **Búsqueda**: Búsqueda rápida de formularios
- **Filtros avanzados**: Más opciones de filtrado

## Dependencias

### Nuevas Dependencias
- `@ant-design/icons`: Iconos para la interfaz

### Dependencias Existentes Utilizadas
- `antd`: Componentes de UI
- `axios`: Peticiones HTTP
- `react-router-dom`: Navegación

## Configuración

### Variables de Entorno
No se requieren variables de entorno adicionales para esta funcionalidad.

### Configuración de API
Asegúrese de que los endpoints del backend estén configurados correctamente en `src/services/api.js`.
