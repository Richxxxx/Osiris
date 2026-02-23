# API de Formularios - Documentación

## Endpoints para Formularios

### 1. Crear un nuevo formulario
```
POST /api/formularios/crear
```
**Descripción**: Crea un nuevo formulario con preguntas asociadas a cargos específicos.

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Cuerpo de la solicitud**:
```json
{
  "nombre": "Evaluación de Desempeño 2023",
  "descripcion": "Formulario para evaluar el desempeño de los empleados",
  "departamento_id": 1,
  "estado": "activo",
  "preguntas": [
    {
      "enunciado": "¿Cómo calificaría la puntualidad del empleado?",
      "tipo": "escala",
      "opciones": [
        {"valor": "1", "texto": "1 - Muy malo"},
        {"valor": "2", "texto": "2 - Malo"},
        {"valor": "3", "texto": "3 - Regular"},
        {"valor": "4", "texto": "4 - Bueno"},
        {"valor": "5", "texto": "5 - Excelente"}
      ],
      "obligatoria": true,
      "peso": 1.0,
      "apartado": "desempeno",
      "cargos": [1, 2, 3]
    },
    {
      "enunciado": "¿El empleado trabaja bien en equipo?",
      "tipo": "opcion_unica",
      "opciones": [
        {"valor": "si", "texto": "Sí"},
        {"valor": "no", "texto": "No"},
        {"valor": "a_veces", "texto": "A veces"}
      ],
      "obligatoria": true,
      "peso": 1.0,
      "apartado": "convivencia",
      "cargos": [1, 2]
    }
  ]
}
```

**Respuesta exitosa** (201):
```json
{
  "status": "success",
  "data": {
    "formulario": {
      "id": 1,
      "nombre": "Evaluación de Desempeño 2023",
      "descripcion": "Formulario para evaluar el desempeño de los empleados",
      "estado": "activo",
      "fecha_creacion": "2023-01-01T00:00:00.000Z",
      "preguntas": [
        {
          "id": 1,
          "enunciado": "¿Cómo calificaría la puntualidad del empleado?",
          "tipo": "escala",
          "opciones": [...],
          "obligatoria": true,
          "peso": 1.0,
          "apartado": "desempeno",
          "cargos": [
            {"id": 1, "nombre": "Desarrollador"},
            {"id": 2, "nombre": "Diseñador"}
          ]
        }
      ]
    }
  }
}
```

### 2. Obtener todos los formularios
```
GET /api/formularios/listar
```
**Descripción**: Obtiene la lista de todos los formularios del sistema.

**Headers**:
- `Authorization: Bearer <token>`

**Respuesta exitosa** (200):
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "nombre": "Evaluación de Desempeño 2023",
      "descripcion": "Formulario para evaluar el desempeño de los empleados",
      "estado": "activo",
      "fecha_creacion": "2023-01-01T00:00:00.000Z",
      "preguntas": [...]
    }
  ]
}
```

### 3. Obtener un formulario por ID
```
GET /api/formularios/:id/ver
```
**Descripción**: Obtiene los detalles de un formulario específico.

**Parámetros de URL**:
- `id`: ID del formulario

**Headers**:
- `Authorization: Bearer <token>`

**Respuesta exitosa** (200):
```json
{
  "status": "success",
  "data": {
    "formulario": {
      "id": 1,
      "nombre": "Evaluación de Desempeño 2023",
      "descripcion": "Formulario para evaluar el desempeño de los empleados",
      "estado": "activo",
      "fecha_creacion": "2023-01-01T00:00:00.000Z",
      "preguntas": [...]
    }
  }
}
```

### 4. Actualizar un formulario
```
PATCH /api/formularios/:id/actualizar
```
**Descripción**: Actualiza los datos de un formulario existente.

**Parámetros de URL**:
- `id`: ID del formulario

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Cuerpo de la solicitud**:
```json
{
  "nombre": "Evaluación de Desempeño 2023 - Actualizada",
  "descripcion": "Descripción actualizada",
  "estado": "inactivo"
}
```

### 5. Eliminar un formulario
```
DELETE /api/formularios/:id/eliminar
```
**Descripción**: Elimina un formulario del sistema.

**Parámetros de URL**:
- `id`: ID del formulario

**Headers**:
- `Authorization: Bearer <token>`

**Respuesta exitosa** (200):
```json
{
  "status": "success",
  "message": "Formulario eliminado exitosamente"
}
```

### 6. Obtener formularios activos
```
GET /api/formularios/activos
```
**Descripción**: Obtiene solo los formularios que están activos.

**Headers**:
- `Authorization: Bearer <token>`

**Respuesta exitosa** (200):
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "nombre": "Evaluación de Desempeño 2023",
      "estado": "activo",
      "preguntas": [...]
    }
  ]
}
```

## Tipos de Preguntas

### 1. Texto libre
```json
{
  "enunciado": "Describe brevemente tus logros este trimestre",
  "tipo": "texto",
  "obligatoria": true,
  "peso": 1.0
}
```

### 2. Opción única
```json
{
  "enunciado": "¿Estás satisfecho con tu trabajo?",
  "tipo": "opcion_unica",
  "opciones": [
    {"valor": "muy_satisfecho", "texto": "Muy satisfecho"},
    {"valor": "satisfecho", "texto": "Satisfecho"},
    {"valor": "neutral", "texto": "Neutral"},
    {"valor": "insatisfecho", "texto": "Insatisfecho"}
  ],
  "obligatoria": true,
  "peso": 1.0
}
```

### 3. Opción múltiple
```json
{
  "enunciado": "¿Qué habilidades te gustaría desarrollar?",
  "tipo": "opcion_multiple",
  "opciones": [
    {"valor": "liderazgo", "texto": "Liderazgo"},
    {"valor": "comunicacion", "texto": "Comunicación"},
    {"valor": "tecnica", "texto": "Técnica"},
    {"valor": "creatividad", "texto": "Creatividad"}
  ],
  "obligatoria": false,
  "peso": 1.0
}
```

### 4. Escala numérica
```json
{
  "enunciado": "¿Cómo calificarías tu desempeño general?",
  "tipo": "escala",
  "opciones": [
    {"valor": "1", "texto": "1 - Muy bajo"},
    {"valor": "2", "texto": "2 - Bajo"},
    {"valor": "3", "texto": "3 - Regular"},
    {"valor": "4", "texto": "4 - Bueno"},
    {"valor": "5", "texto": "5 - Excelente"}
  ],
  "obligatoria": true,
  "peso": 1.0
}
```

## Apartados de Preguntas

Los formularios organizan las preguntas en los siguientes apartados:

- **competencias**: Preguntas sobre habilidades y competencias
- **experiencia**: Preguntas sobre experiencia laboral
- **convivencia**: Preguntas sobre relaciones interpersonales
- **desempeno**: Preguntas sobre rendimiento y logros

## Asociación con Cargos

Cada pregunta puede estar asociada a uno o más cargos específicos. Esto permite que:
- Los evaluadores solo vean las preguntas relevantes para el cargo del evaluado
- Los formularios sean dinámicos según el rol del empleado
- Se pueda personalizar la evaluación por departamento o cargo

## Errores Comunes

### 400 Bad Request
- Faltan campos obligatorios
- El formato de las opciones es incorrecto
- Los cargos especificados no existen

### 401 Unauthorized
- Token no proporcionado o inválido

### 403 Forbidden
- El usuario no tiene permisos de administrador

### 404 Not Found
- El formulario no existe
- Los cargos especificados no existen

### 500 Internal Server Error
- Error en el servidor al procesar la solicitud
