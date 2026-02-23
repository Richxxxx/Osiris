import React, { useState, useEffect, useCallback } from 'react';

import { Modal, Button, Radio, Progress, Typography, Space, message, Spin, Alert, Tag, Input } from 'antd';

import './EvaluacionModal.css';

import { 

  SaveOutlined, 

  CheckCircleOutlined,

  FileTextOutlined,

  InfoCircleOutlined,

  CheckOutlined

} from '@ant-design/icons';

import axios from '../../utils/axiosConfig';

import { authService } from '../../services/auth';

import EvaluacionHeader from '../evaluaciones/EvaluacionHeader';

import '../evaluaciones/EvaluacionHeader.css';

import FormularioTrimestral from '../evaluaciones/FormularioTrimestral';



const { Title, Text, Paragraph } = Typography;

const { TextArea } = Input;



const EvaluacionModal = ({ visible, onClose, evaluacionId, onSuccess }) => {

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [evaluacion, setEvaluacion] = useState(null);

  const [formulario, setFormulario] = useState(null);

  const [respuestas, setRespuestas] = useState({});

  const [progress, setProgress] = useState(0);

  const [completed, setCompleted] = useState(false);

  const [formularioNoDisponible, setFormularioNoDisponible] = useState(false);



  // Cargar datos de la evaluación

  const cargarEvaluacion = useCallback(async () => {

    if (!evaluacionId) return;

    

    try {

      const user = authService.getCurrentUser();

      if (!user) {

        onClose();

        return;

      }



      const response = await axios.get(`/evaluaciones/${evaluacionId}`, {

        headers: { 

          'Authorization': `Bearer ${user.token}`,

          'Content-Type': 'application/json'

        }

      });



      if (response.data && response.data.status === 'success') {

        const evaluacionData = response.data.data.evaluacion;

        setEvaluacion(evaluacionData);

        setFormulario(evaluacionData.formulario);

        

        // Validar si el formulario tiene preguntas

        if (!evaluacionData.formulario.preguntas || evaluacionData.formulario.preguntas.length === 0) {

          setFormularioNoDisponible(true);

          setLoading(false);

          return;

        }

        

        // Cargar respuestas existentes si las hay

        if (evaluacionData.respuestas && evaluacionData.respuestas.length > 0) {

          const respuestasExistentes = {};

          evaluacionData.respuestas.forEach(respuesta => {

            respuestasExistentes[respuesta.preguntaId] = respuesta.respuesta;

          });

          setRespuestas(respuestasExistentes);

          

          // Calcular progreso actual

          const preguntasRespondibles = evaluacionData.formulario.preguntas.filter(p => p.tipo !== 'titulo_seccion');

          const totalPreguntas = preguntasRespondibles.length;

          const contestadas = Object.keys(respuestasExistentes).length;

          

          setProgress(Math.round((contestadas / totalPreguntas) * 100));

          

          // Si ya está completada

          if (evaluacionData.estado === 'completada') {

            setCompleted(true);

          }

        }

      }

    } catch (error) {

      console.error('Error al cargar evaluación:', error);

      message.error('Error al cargar la evaluación');

      onClose();

    } finally {

      setLoading(false);

    }

  }, [evaluacionId, onClose]);



  // Cargar evaluación cuando el modal se abre

  useEffect(() => {

    if (visible && evaluacionId) {

      cargarEvaluacion();

    } else if (!visible) {

      // Resetear estados inmediatamente cuando se cierra el modal

      setEvaluacion(null);

      setFormulario(null);

      setRespuestas({});

      setProgress(0);

      setCompleted(false);

      setFormularioNoDisponible(false);

      setLoading(true);

    }

  }, [visible, evaluacionId, cargarEvaluacion]);



  // Actualizar progreso cuando cambian las respuestas

  useEffect(() => {

    if (formulario && Object.keys(respuestas).length > 0) {

      const preguntasRespondibles = formulario?.preguntas?.filter(p => p.tipo !== 'titulo_seccion') || [];

      const totalPreguntas = preguntasRespondibles.length;

      const contestadas = Object.keys(respuestas).length;

      

      const nuevoProgress = Math.round((contestadas / totalPreguntas) * 100);

      setProgress(nuevoProgress);

    }

  }, [respuestas, formulario]);



  // Manejar cambio de respuesta (para formulario anual)

  const handleRespuestaChange = (preguntaId, valor) => {

    setRespuestas(prev => ({

      ...prev,

      [preguntaId]: valor

    }));

  };



  const renderPregunta = (pregunta, index) => {

    if (pregunta.tipo === 'abierta') {

      return (

        <div key={pregunta.id} className="border-l-4 border-blue-200 pl-4 mb-4">

          <div className="flex items-start mb-2">

            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full mr-3">

              {index + 1}

            </span>

            <div className="flex-1">

              <Text strong className="text-base font-medium text-gray-900 mb-2">

                {pregunta.enunciado}

              </Text>

            </div>

          </div>



          <TextArea

            rows={4}

            placeholder="Escriba sus comentarios aquí..."

            value={respuestas[pregunta.id] || ''}

            onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}

            disabled={completed}

            className="w-full"

          />

        </div>

      );

    }



    return null;

  };



  // Guardar evaluación

  const handleGuardar = async () => {

    try {

      setSaving(true);

      const user = authService.getCurrentUser();

      

      // Preparar respuestas para enviar

      const respuestasArray = Object.entries(respuestas).map(([preguntaId, respuesta]) => ({

        preguntaId: parseInt(preguntaId),

        respuesta: respuesta

      }));



      await axios.put(`/evaluaciones/${evaluacionId}/respuestas`, {

        respuestas: respuestasArray,

        finalizar: false // No finalizar, solo guardar

      }, {

        headers: { 

          'Authorization': `Bearer ${user.token}`,

          'Content-Type': 'application/json'

        }

      });



      message.success('Evaluación guardada correctamente.');

      

      // Disparar evento para actualizar botones inmediatamente

      window.dispatchEvent(new CustomEvent('evaluacionCerrada'));

      

      // Cerrar modal y notificar éxito

      if (onSuccess) onSuccess();

      onClose();

    } catch (error) {

      console.error('Error al guardar evaluación:', error);

      

      // Manejo específico de errores

      if (!error.response) {

        message.error('Error de conexión. Verifique su internet');

      } else if (error.response.status === 401) {

        message.error('Sesión expirada. Inicie sesión nuevamente');

        onClose();

      } else if (error.response.status === 403) {

        message.error('No tiene permiso para modificar esta evaluación');

      } else {

        const mensaje = error.response?.data?.message || 'Error al guardar la evaluación';

        message.error(mensaje);

      }

    } finally {

      setSaving(false);

    }

  };



  // Finalizar evaluación

  const handleFinalizar = async () => {

    // Mostrar ventana de confirmación

    const confirmado = window.confirm('¿Está seguro de finalizar la evaluación? Las evaluaciones finalizadas no se podrán reabrir.');

    

    if (!confirmado) {

      return; // Usuario canceló

    }



    try {

      setSaving(true);

      const user = authService.getCurrentUser();

      

      // Validar que todas las preguntas estén respondidas

      const preguntasRespondibles = formulario?.preguntas?.filter(p => p.tipo !== 'titulo_seccion') || [];

      const totalPreguntas = preguntasRespondibles.length;

      const contestadas = Object.keys(respuestas).length;

      

      if (contestadas < totalPreguntas) {

        message.warning(`Debe responder todas las preguntas antes de finalizar (${contestadas}/${totalPreguntas})`);

        setSaving(false);

        return;

      }



      // Preparar respuestas para enviar

      const respuestasArray = Object.entries(respuestas).map(([preguntaId, respuesta]) => ({

        preguntaId: parseInt(preguntaId),

        respuesta: respuesta

      }));



      // Enviar y finalizar en una sola petición

      await axios.put(`/evaluaciones/${evaluacionId}/respuestas`, {

        respuestas: respuestasArray,

        finalizar: true

      }, {

        headers: { 

          'Authorization': `Bearer ${user.token}`,

          'Content-Type': 'application/json'

        },

        timeout: 10000 // Timeout de 10 segundos

      });



      message.success('Evaluación finalizada correctamente.');

      

      // Disparar evento para actualizar botones inmediatamente

      window.dispatchEvent(new CustomEvent('evaluacionCerrada'));

      

      // Mostrar alerta simple de éxito

      message.success('¡Evaluación completada! Puede revisar los resultados en el historial.');

      

      // Cerrar modal y notificar éxito

      if (onSuccess) onSuccess();

      onClose();

      

    } catch (error) {

      // Manejo de errores optimizado

      if (!error.response) {

        message.error('Error de conexión. Verifique su internet');

      } else if (error.response?.status === 401) {

        message.error('Sesión expirada');

        onClose();

      } else if (error.response?.status === 403) {

        message.error('No tiene permiso para modificar esta evaluación');

      } else if (error.response?.status === 404) {

        message.error('Evaluación no encontrada');

      } else {

        message.error(error.response?.data?.message || 'Error al finalizar la evaluación');

      }

    } finally {

      setSaving(false);

    }

  };



  // Agrupar preguntas por apartado para mostrarlas agrupadas

  const preguntasPorApartado = {};

  const apartados = ['competencias', 'experiencia', 'convivencia', 'desempeno'];

  

  apartados.forEach(apartado => {

    preguntasPorApartado[apartado] = formulario?.preguntas

      ?.filter(p => p.apartado === apartado)

      ?.sort((a, b) => (a.orden || 0) - (b.orden || 0)) || [];

  });



  // Separar las preguntas de comentarios

  const preguntasComentarios = formulario?.preguntas

    ?.filter(p => p.apartado === 'comentarios')

    ?.sort((a, b) => (a.orden || 0) - (b.orden || 0)) || [];



  const getTituloApartado = (apartado) => {

    const titulos = {

      'competencias': 'COMPETENCIAS, ACTITUD Y COMPORTAMIENTO',

      'experiencia': 'EXPERIENCIA LABORAL',

      'convivencia': 'CONVIVENCIA LABORAL',

      'desempeno': 'DESEMPEÑO INDIVIDUAL'

    };

    return titulos[apartado] || apartado.toUpperCase();

  };



  const getPorcentajeApartado = (apartado) => {

    const porcentajes = formulario?.porcentajes_apartados || {};

    return Math.round((porcentajes[apartado] || 0) * 100);

  };



  return (

    <Modal

      open={visible}

      onCancel={() => !saving && onClose()}

      footer={null}

      width="90%"

      style={{ maxWidth: '1200px' }}

      className="evaluacion-modal"

      destroyOnHidden

      transitionName="" // Eliminar animación de apertura

      maskTransitionName="" // Eliminar animación del fondo

      styles={{

        body: { 

          padding: '0',

          maxHeight: '80vh',

          overflow: 'hidden'

        },

        header: {

          borderBottom: '1px solid #f0f0f0',

          padding: '16px 24px',

          margin: 0

        },

        content: {

          padding: 0

        }

      }}

    >

      {loading ? (

        <div className="flex items-center justify-center py-12">

          <Spin size="large" />

        </div>

      ) : formularioNoDisponible ? (

        <div className="text-center py-12">

          <div className="mb-6">

            <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">

              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />

              </svg>

            </div>

          </div>

          <Title level={3} className="mb-4">Formulario no disponible</Title>

          <Text className="block mb-6">

            No hay un formulario de evaluación configurado para el cargo de <strong>{evaluacion?.evaluado?.cargo?.nombre || 'este empleado'}</strong> en el departamento <strong>{evaluacion?.evaluado?.departamento?.nombre || 'correspondiente'}</strong>.

          </Text>

          <Text type="secondary" className="block mb-6">

            Por favor, contacte al administrador del sistema para que configure un formulario adecuado para este puesto.

          </Text>

          <Button type="primary" onClick={onClose}>

            Cerrar

          </Button>

        </div>

      ) : !evaluacion || !formulario ? (

        <div className="text-center py-12">

          <Alert

            message="Evaluación no encontrada"

            description="No se pudo encontrar la evaluación solicitada."

            type="error"

            showIcon

            action={

              <Button type="primary" onClick={onClose}>

                Cerrar

              </Button>

            }

          />

        </div>

      ) : (

        <div className="modal-content">

          {/* Nuevo encabezado estandarizado */}

          <EvaluacionHeader evaluacion={evaluacion} formulario={formulario} />



          {/* 🔥 RENDERIZADO CONDICIONAL SEGÚN PERIODICIDAD */}

          {formulario?.periodicidad === 'trimestral' ? (

            // Formulario Trimestral

            <FormularioTrimestral

              preguntas={formulario?.preguntas || []}

              onRespuestaChange={setRespuestas}

              respuestasIniciales={respuestas}

            />

          ) : (

            // Formulario Anual (existente)

            <>

              <div className="space-y-4">

                {apartados.map(apartado => {

                  const preguntas = preguntasPorApartado[apartado];

                  if (preguntas.length === 0) return null;



                  return (

                    <div key={apartado} className="border rounded-lg p-4 shadow-sm">

                      <div className="flex items-center justify-between mb-3">

                        <div>

                          <Title level={4} className="mb-0 text-gray-900">

                            {getTituloApartado(apartado)}

                          </Title>

                          <div className="flex items-center mt-1 space-x-2">

                            <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded border border-gray-200">

                              {getPorcentajeApartado(apartado)}% del total

                            </span>

                            <span className="inline-flex px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded border border-blue-200">

                              {preguntas.length} pregunta{preguntas.length !== 1 ? 's' : ''}

                            </span>

                          </div>

                        </div>

                      </div>



                      <div className="space-y-3">

                        {preguntas.map((pregunta, index) => (

                          <div key={pregunta.id} className="border-l-4 border-gray-200 pl-4">

                            <div className="mb-2">

                              <div className="flex items-start mb-2">

                                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full mr-3">

                                  {index + 1}

                                </span>

                                <div className="flex-1">

                                  <Paragraph className="text-base font-medium text-gray-900 mb-2">

                                    {pregunta.enunciado}

                                    {pregunta.obligatoria && (

                                      <Text type="danger" className="ml-2">*</Text>

                                    )}

                                  </Paragraph>

                                </div>

                              </div>

                            </div>



                            {/* Opciones de respuesta */}

                            {pregunta.tipo === 'abierta' ? (

                              <TextArea

                                rows={4}

                                placeholder="Escriba su respuesta aquí..."

                                value={respuestas[pregunta.id] || ''}

                                onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}

                                disabled={completed}

                                className="w-full"

                              />

                            ) : (

                              <Radio.Group 

                                value={respuestas[pregunta.id]}

                                onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}

                                className="w-full"

                                disabled={completed}

                              >

                                <Space direction="vertical" className="w-full" size="small">

                                  {pregunta.opciones.map((opcion, opcionIndex) => (

                                    <Radio.Button 

                                      key={opcionIndex} 

                                      value={opcion.valor} 

                                      className="w-full text-left border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all"

                                      style={{ 

                                        height: 'auto', 

                                        padding: '8px 12px',

                                        display: 'flex',

                                        justifyContent: 'space-between',

                                        alignItems: 'center'

                                      }}

                                    >

                                      <div className="flex items-center w-full">

                                        <div className="flex items-center flex-1 min-w-0 pr-4">

                                          {respuestas[pregunta.id] === opcion.valor && (

                                            <CheckCircleOutlined className="text-green-600 mr-2 text-base flex-shrink-0" />

                                          )}

                                          <span className="text-sm font-medium truncate">{opcion.valor}</span>

                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">

                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">

                                            {opcion.puntuacion} pts

                                          </span>

                                        </div>

                                      </div>

                                    </Radio.Button>

                                  ))}

                                </Space>

                              </Radio.Group>

                            )}

                          </div>

                        ))}

                      </div>

                    </div>

                  );

                })}

              </div>



              {/* Sección de comentarios */}

              {preguntasComentarios.length > 0 && (

                <div className="border rounded-lg p-4 shadow-sm">

                  <div className="mb-3">

                    <Title level={4} className="mb-0 text-gray-900">

                      COMENTARIOS FINALES

                    </Title>

                    <Paragraph className="text-gray-600 mt-1">

                      Por favor, proporcione sus comentarios finales sobre la evaluación.

                    </Paragraph>

                  </div>

                  

                  <div className="space-y-3">

                    {preguntasComentarios.map((pregunta, index) => (

                      renderPregunta(pregunta, index)

                    ))}

                  </div>

                </div>

              )}

            </>

          )}



          {/* Acciones */}

          <div className="flex justify-between items-center mt-6 pt-4 border-t">

            <div className="text-sm text-gray-500">

              Todas las preguntas están disponibles para responder.

            </div>



            <div className="flex space-x-4">

              {/* Solo mostrar "Guardar progreso" si no es una evaluación asignada */}

              {evaluacion?.estado !== 'asignada' && (

                <Button 

                  onClick={handleGuardar}

                  loading={saving}

                  icon={<SaveOutlined />}

                  disabled={completed}

                >

                  Guardar progreso

                </Button>

              )}

              {!completed && (

                <Button 

                  type="primary"

                  onClick={handleFinalizar}

                  loading={saving}

                  icon={<CheckCircleOutlined />}

                  disabled={progress < 100}

                >

                  Finalizar Evaluación

                </Button>

              )}

            </div>

          </div>

        </div>

      )}

    </Modal>

  );

};



export default EvaluacionModal;

