import React, { useState } from 'react';
import { Card, Radio, Typography, Space, Alert, Input, Select } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const FormularioTrimestral = ({ preguntas, onRespuestaChange, respuestasIniciales = {} }) => {
  const [respuestas, setRespuestas] = useState(respuestasIniciales);

  // Agrupar preguntas por sección usando seccion_id
  const preguntasPorSeccion = {};
  
  // Primero, obtener los títulos de sección
  const titulosSeccion = preguntas.filter(p => p.tipo === 'titulo_seccion');
  
  // Agrupar preguntas por su sección
  preguntas.forEach(pregunta => {
    if (pregunta.tipo !== 'titulo_seccion') {
      let seccion = null;
      
      // Buscar el título de sección por seccion_id
      if (pregunta.seccion_id) {
        seccion = titulosSeccion.find(t => t.id === pregunta.seccion_id);
      }
      
      const nombreSeccion = seccion ? seccion.enunciado : 'General';
      
      if (!preguntasPorSeccion[nombreSeccion]) {
        preguntasPorSeccion[nombreSeccion] = {
          titulo: nombreSeccion,
          preguntas: []
        };
      }
      preguntasPorSeccion[nombreSeccion].preguntas.push(pregunta);
    }
  });

  // Contador global para preguntas (excluyendo títulos)
  let contadorGlobalPreguntas = 1;

  const handleRespuestaChange = (preguntaId, valor) => {
    const nuevasRespuestas = {
      ...respuestas,
      [preguntaId]: valor
    };
    setRespuestas(nuevasRespuestas);
    
    if (onRespuestaChange) {
      onRespuestaChange(nuevasRespuestas);
    }
  };

  const renderPregunta = (pregunta, indexGlobal) => {
    if (pregunta.tipo === 'abierta') {
      return (
        <div key={pregunta.id} className="border-l-4 border-blue-200 pl-4 mb-4">
          <div className="flex items-start mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full mr-3">
              {indexGlobal}
            </span>
            <div className="flex-1">
              <Text className="text-base text-gray-900">
                {pregunta.enunciado}
              </Text>
            </div>
          </div>

          <TextArea
            rows={4}
            placeholder="Escriba su respuesta aquí..."
            value={respuestas[pregunta.id] || ''}
            onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
            className="w-full ml-9"
          />
        </div>
      );
    }

    if (pregunta.tipo === 'escala') {
      return (
        <div key={pregunta.id} className="border-l-4 border-blue-200 pl-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start flex-1">
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full mr-3">
                {indexGlobal}
              </span>
              <div className="flex-1">
                <Text className="text-base text-gray-900">
                  {pregunta.enunciado}
                </Text>
              </div>
            </div>

            {/* Menú desplegable compacto con números */}
            <div className="ml-4">
              <Select
                value={respuestas[pregunta.id]}
                onChange={(value) => handleRespuestaChange(pregunta.id, value)}
                placeholder="..."
                className="w-20"
                size="small"
                style={{ 
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px'
                }}
              >
                <Option value={4}>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">4</span>
                    {respuestas[pregunta.id] === 4 && (
                      <CheckCircleOutlined className="text-green-600 ml-2 text-xs" />
                    )}
                  </div>
                </Option>
                <Option value={3}>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">3</span>
                    {respuestas[pregunta.id] === 3 && (
                      <CheckCircleOutlined className="text-green-600 ml-2 text-xs" />
                    )}
                  </div>
                </Option>
                <Option value={2}>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">2</span>
                    {respuestas[pregunta.id] === 2 && (
                      <CheckCircleOutlined className="text-green-600 ml-2 text-xs" />
                    )}
                  </div>
                </Option>
                <Option value={1}>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">1</span>
                    {respuestas[pregunta.id] === 1 && (
                      <CheckCircleOutlined className="text-green-600 ml-2 text-xs" />
                    )}
                  </div>
                </Option>
              </Select>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      {/* Instrucciones serias */}
      <Alert
        message="Instrucciones de Evaluación Trimestral"
        description={
          <div>
            <Paragraph className="mb-2">
              Evalúe el desempeño del colaborador utilizando la siguiente escala:
            </Paragraph>
            <ul className="mb-0">
              <li><strong>4 - Totalmente de Acuerdo:</strong> Supera consistentemente las expectativas</li>
              <li><strong>3 - De Acuerdo:</strong> Cumple con las expectativas</li>
              <li><strong>2 - En Desacuerdo:</strong> Requiere mejoras</li>
              <li><strong>1 - Totalmente en Desacuerdo:</strong> No cumple con las expectativas mínimas</li>
            </ul>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* Renderizar secciones usando seccion_id */}
      {Object.entries(preguntasPorSeccion).map(([seccionKey, seccion]) => (
        <div key={seccionKey} className="border rounded-lg p-4 shadow-sm mb-4">
          <div className="flex items-center mb-4">
            <Title level={4} className="mb-0 text-gray-900">
              {seccion.titulo}
            </Title>
            <span className="inline-flex px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded border border-blue-200 ml-3">
              {seccion.preguntas.length} preguntas
            </span>
          </div>

          <div className="space-y-4">
            {seccion.preguntas.map((pregunta) => {
              const indexActual = contadorGlobalPreguntas++;
              return renderPregunta(pregunta, indexActual);
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FormularioTrimestral;
