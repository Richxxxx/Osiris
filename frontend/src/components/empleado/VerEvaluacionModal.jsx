import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Typography, Space, message, Spin, Alert, Tag } from 'antd';
import '../evaluador/EvaluacionModal.css';
import { 
  FileTextOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  StarOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { authService } from '../../services/auth';
import EvaluacionHeader from '../evaluaciones/EvaluacionHeader';
import '../evaluaciones/EvaluacionHeader.css';
import PDFGenerator from '../evaluaciones/PDFGenerator';

const { Title, Text, Paragraph } = Typography;

const VerEvaluacionModal = ({ visible, onClose, evaluacionId }) => {
  const [loading, setLoading] = useState(true);
  const [evaluacion, setEvaluacion] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [puntajesPorApartado, setPuntajesPorApartado] = useState({});
  const [calificacionTotal, setCalificacionTotal] = useState(0);
  const [valoracionFinal, setValoracionFinal] = useState('');

  // Función para descargar PDF con estilos completos
  const handleDownloadPDF = useCallback(async () => {
    if (!evaluacion || !formulario) {
      message.error('No hay datos para generar el PDF');
      return;
    }

    try {
      const { htmlContent, fileName } = await PDFGenerator.generateStyledPDF(
        evaluacion, 
        formulario, 
        respuestas
      );
      
      await PDFGenerator.downloadPDF(htmlContent, fileName);
      message.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      message.error('Error al descargar el PDF. Intente nuevamente.');
    }
  }, [evaluacion, formulario, respuestas]);

  // Función para imprimir directamente
  const handlePrintPreview = useCallback(async () => {
    if (!evaluacion || !formulario) {
      message.error('No hay datos para imprimir');
      return;
    }

    try {
      const { htmlContent } = await PDFGenerator.generateStyledPDF(
        evaluacion, 
        formulario, 
        respuestas
      );
      
      await PDFGenerator.printDirect(htmlContent);
      message.success('Ventana de impresión abierta');
    } catch (error) {
      console.error('Error al abrir impresión:', error);
      message.error('Error al abrir la ventana de impresión. Intente nuevamente.');
    }
  }, [evaluacion, formulario, respuestas]);

  // Función para calcular la valoración final del desempeño
  const calcularValoracionFinal = (puntaje, esTrimestral) => {
    if (esTrimestral) {
      // Valoración para formularios trimestrales
      if (puntaje >= 80 && puntaje <= 100) return 'DESTACADO';
      if (puntaje >= 60 && puntaje <= 79) return 'BUENO';
      if (puntaje >= 25 && puntaje <= 59) return 'BAJO';
      return 'BAJO';
    } else {
      // Valoración existente para formularios anuales
      if (puntaje === 5) return 'EXCELENTE';
      if (puntaje >= 4 && puntaje <= 4.99) return 'SOBRESALIENTE';
      if (puntaje >= 3 && puntaje <= 3.99) return 'BUENO';
      if (puntaje >= 2.6 && puntaje <= 2.99) return 'ACEPTABLE';
      if (puntaje < 2.6) return 'DEFICIENTE';
      return 'DEFICIENTE';
    }
  };

  // Función para obtener el color de la valoración
  const getColorValoracion = (valoracion, esTrimestral) => {
    if (esTrimestral) {
      const coloresTrimestral = {
        'DESTACADO': '#52c41a',
        'BUENO': '#1890ff',
        'BAJO': '#fa8c16'
      };
      return coloresTrimestral[valoracion] || '#666';
    } else {
      const coloresAnuales = {
        'EXCELENTE': '#52c41a',
        'SOBRESALIENTE': '#1890ff',
        'BUENO': '#52c41a',
        'ACEPTABLE': '#fa8c16',
        'DEFICIENTE': '#f5222d'
      };
      return coloresAnuales[valoracion] || '#666';
    }
  };

  // Cargar datos de la evaluación
  const cargarEvaluacion = useCallback(async () => {
    if (!evaluacionId) return;
    
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        onClose();
        return;
      }

      // Usar la ruta original que funcionaba
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
        
        // Usar la valoración guardada del backend si existe, sino calcularla
        const esTrimestral = evaluacionData.formulario?.periodicidad === 'trimestral';
        
        if (esTrimestral && evaluacionData.valoracionTrimestral) {
          setValoracionFinal(evaluacionData.valoracionTrimestral);
          
          // Usar calificación guardada del backend
          if (evaluacionData.puntuacionTotal) {
            setCalificacionTotal(evaluacionData.puntuacionTotal);
          }
        } else if (!esTrimestral && evaluacionData.valoracionAnual) {
          setValoracionFinal(evaluacionData.valoracionAnual);
          
          // Usar calificación guardada del backend
          if (evaluacionData.puntuacionTotal) {
            setCalificacionTotal(evaluacionData.puntuacionTotal);
          }
        }
        
        // Cargar respuestas existentes
        if (evaluacionData.respuestas && evaluacionData.respuestas.length > 0) {
          const respuestasExistentes = {};
          evaluacionData.respuestas.forEach(respuesta => {
            respuestasExistentes[respuesta.preguntaId] = respuesta.respuesta;
          });
          setRespuestas(respuestasExistentes);
          
          // Calcular puntajes SOLO si no hay valoración ni calificación guardada
          if ((!esTrimestral && !evaluacionData.valoracionAnual && !evaluacionData.puntuacionTotal) ||
              (esTrimestral && !evaluacionData.valoracionTrimestral && !evaluacionData.puntuacionTotal)) {
            calcularPuntajes(evaluacionData.formulario, respuestasExistentes, esTrimestral);
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

  // Calcular puntajes por apartado y totales
  const calcularPuntajes = (formulario, respuestas, esTrimestral) => {
    if (esTrimestral) {
      // Lógica para trimestrales
      const preguntasEscala = formulario.preguntas?.filter(p => p.tipo === 'escala') || [];
      
      if (preguntasEscala.length > 0) {
        const respuestasEscala = Object.keys(respuestas).filter(preguntaId => 
          preguntasEscala.some(p => p.id === preguntaId)
        );
        
        // Sumar todas las calificaciones (escala 1-4)
        const sumaCalificaciones = respuestasEscala.reduce((sum, preguntaId) => {
          return sum + parseFloat(respuestas[preguntaId]);
        }, 0);
        
        // Aplicar fórmula: (suma × 100) ÷ (número_preguntas × 4)
        const maximoPosible = preguntasEscala.length * 4;
        const calificacionTotalCalculada = (sumaCalificaciones * 100) / maximoPosible;
        
        setCalificacionTotal(calificacionTotalCalculada.toFixed(2));
        setValoracionFinal(calcularValoracionFinal(calificacionTotalCalculada, true));
      }
    } else {
      // Lógica existente para anuales
      const apartados = ['competencias', 'experiencia', 'convivencia', 'desempeno'];
      const porcentajes = formulario.porcentajes_apartados || {};
      const puntajesCalculados = {};
      let calificacionTotalCalculada = 0;

      apartados.forEach(apartado => {
        const preguntasApartado = formulario.preguntas?.filter(p => p.apartado === apartado) || [];
        
        if (preguntasApartado.length > 0) {
          // Calcular puntaje promedio del apartado
          let sumaPuntos = 0;
          let cantidadPreguntas = 0;

          preguntasApartado.forEach(pregunta => {
            const respuesta = respuestas[pregunta.id];
            
            if (respuesta && pregunta.opciones) {
              // Buscar la opción seleccionada y obtener su puntuación
              const opcionSeleccionada = pregunta.opciones.find(op => op.valor === respuesta);
              
              if (opcionSeleccionada && opcionSeleccionada.puntuacion) {
                const puntuacion = parseFloat(opcionSeleccionada.puntuacion);
                sumaPuntos += puntuacion;
                cantidadPreguntas++;
              }
            }
          });

          if (cantidadPreguntas > 0) {
            const promedio = sumaPuntos / cantidadPreguntas;
            const porcentajeApartado = (porcentajes[apartado] || 0) * 100;
            const puntajeFinal = promedio * (porcentajeApartado / 100);
            
            puntajesCalculados[apartado] = {
              promedio: promedio.toFixed(2),
              porcentaje: porcentajeApartado,
              puntajeFinal: puntajeFinal.toFixed(2)
            };
            
            calificacionTotalCalculada += puntajeFinal;
          }
        }
      });
      
      setPuntajesPorApartado(puntajesCalculados);
      setCalificacionTotal(calificacionTotalCalculada.toFixed(2));
      setValoracionFinal(calcularValoracionFinal(calificacionTotalCalculada, false));
    }
  };

  // Cargar evaluación cuando el modal se abre
  useEffect(() => {
    if (visible && evaluacionId) {
      cargarEvaluacion();
    } else if (!visible) {
      // Resetear estados cuando se cierra el modal
      setEvaluacion(null);
      setFormulario(null);
      setRespuestas({});
      setPuntajesPorApartado({});
      setCalificacionTotal(0);
      setValoracionFinal('');
      setLoading(true);
    }
  }, [visible, evaluacionId, cargarEvaluacion]);

  // Separar las preguntas de comentarios
  const preguntasComentarios = formulario?.preguntas
    ?.filter(p => p.apartado === 'comentarios')
    ?.sort((a, b) => (a.orden || 0) - (b.orden || 0)) || [];

  // Determinar si es trimestral para mostrar información correcta
  const esTrimestral = formulario?.periodicidad === 'trimestral';

  // Agrupar preguntas por apartado (para ambos tipos de evaluación)
  const preguntasPorApartado = {};
  const apartados = ['competencias', 'experiencia', 'convivencia', 'desempeno'];
  
  // Agrupar preguntas para formularios anuales
  apartados.forEach(apartado => {
    preguntasPorApartado[apartado] = formulario?.preguntas
      ?.filter(p => p.apartado === apartado)
      ?.sort((a, b) => (a.orden || 0) - (b.orden || 0)) || [];
  });

  // Agrupar preguntas para formularios trimestrales por sección
  const seccionesTrimestrales = {};
  if (esTrimestral && formulario?.preguntas) {
    formulario.preguntas.forEach(pregunta => {
      if (pregunta.tipo === 'titulo_seccion') {
        // Crear sección si no existe
        if (!seccionesTrimestrales[pregunta.id]) {
          seccionesTrimestrales[pregunta.id] = {
            titulo: pregunta.enunciado,
            preguntas: []
          };
        }
      } else if (pregunta.seccion_id) {
        // Asignar pregunta a su sección
        if (!seccionesTrimestrales[pregunta.seccion_id]) {
          seccionesTrimestrales[pregunta.seccion_id] = {
            titulo: 'Sin título',
            preguntas: []
          };
        }
        seccionesTrimestrales[pregunta.seccion_id].preguntas.push(pregunta);
      }
    });
  }

  // Función para obtener el título del apartado
  const getTituloApartado = (apartado) => {
    const titulos = {
      'competencias': 'Competencias',
      'experiencia': 'Experiencia',
      'convivencia': 'Convivencia',
      'desempeno': 'Desempeño'
    };
    return titulos[apartado] || apartado;
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="90%"
      style={{ maxWidth: '1200px' }}
      className="evaluacion-modal"
      destroyOnHidden
      styles={{
        body: { 
          padding: '0',
          maxHeight: '80vh',
          overflow: 'auto'
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

          {/* Resumen de calificaciones - SOLO cuando está completada */}
          {evaluacion.estado === 'completada' && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start mb-2">
                    <StarOutlined className="text-xl text-blue-600 mr-2" />
                    <span className="text-lg font-semibold text-gray-900">
                      {esTrimestral ? 'DEFINITIVA' : 'CALIFICACIÓN TOTAL'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {esTrimestral ? calificacionTotal : `${calificacionTotal} / 5.00`}
                  </div>
                </div>
                
                <div className="text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-end mb-2">
                    <TrophyOutlined className="text-xl text-blue-600 mr-2" />
                    <span className="text-lg font-semibold text-gray-900">VALORACIÓN FINAL</span>
                  </div>
                  <div 
                    className="text-2xl font-bold px-3 py-1 rounded inline-block"
                    style={{ 
                      color: getColorValoracion(valoracionFinal, esTrimestral),
                      backgroundColor: `${getColorValoracion(valoracionFinal, esTrimestral)}15`
                    }}
                  >
                    {valoracionFinal}
                  </div>
                </div>
              </div>
            </div>
          )}

          
          {/* Contenido de las preguntas */}
          <div className="space-y-6">
            {esTrimestral ? (
              // Renderizado para formularios trimestrales agrupados por sección
              <>
                {/* Instrucciones para evaluaciones trimestrales */}
                <Alert
                  message="Instrucciones de Evaluación Trimestral"
                  description={
                    <div>
                      <Paragraph className="mb-2">
                        Evalúe el desempeño del colaborador utilizando la siguiente escala:
                      </Paragraph>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="flex items-center">
                          <span className="text-sm font-medium">4 - Sobresaliente</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium">3 - Bueno</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium">2 - Regular</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium">1 - Necesita Mejorar</span>
                        </div>
                      </div>
                    </div>
                  }
                  type="info"
                  showIcon
                  className="mb-4"
                />

                {/* Renderizar secciones trimestrales */}
                {Object.entries(seccionesTrimestrales).map(([seccionId, seccion]) => (
                  <div key={seccionId} className="border rounded-lg p-4 shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Title level={4} className="mb-0 text-gray-900">
                          {seccion.titulo}
                        </Title>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className="inline-flex px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded border border-blue-200">
                            {seccion.preguntas.length} pregunta{seccion.preguntas.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {seccion.preguntas.map((pregunta, index) => (
                        <div key={pregunta.id} className="border-l-4 border-blue-200 pl-4">
                          <div className="flex items-start mb-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full mr-3">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <Text className="text-base text-gray-900">
                                {pregunta.enunciado}
                              </Text>
                            </div>
                          </div>

                          {/* Mostrar respuesta */}
                          <div className="ml-9">
                            {pregunta.tipo === 'escala' ? (
                              <div className="flex items-center">
                                <span className="text-lg font-medium text-blue-600">
                                  {respuestas[pregunta.id] || 'No respondido'}
                                </span>
                                <span className="ml-2 text-sm text-gray-500">/ 4</span>
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-3 rounded border">
                                <Text className="text-gray-900">
                                  {respuestas[pregunta.id] || 'No respondido'}
                                </Text>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // Renderizado para formularios anuales (existente)
              <>
                {apartados.map(apartado => {
                  const preguntas = preguntasPorApartado[apartado];
                  if (preguntas && preguntas.length > 0) {
                    return (
                      <div key={apartado} className="border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <Title level={4} className="mb-0 text-gray-900">
                              {getTituloApartado(apartado)}
                            </Title>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded border border-gray-200">
                                {Math.round((formulario?.porcentajes_apartados?.[apartado] || 0) * 100)}% del total
                              </span>
                              <span className="inline-flex px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded border border-blue-200">
                                {preguntas.length} pregunta{preguntas.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {preguntas.map((pregunta, index) => {
                        const respuesta = respuestas[pregunta.id];
                        
                        return (
                          <div key={pregunta.id} className="border-l-4 border-gray-200 pl-4">
                            <div className="mb-2">
                              <div className="flex items-start mb-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full mr-3">
                                  {index + 1}
                                </span>
                                <div className="flex-1">
                                  <Paragraph className="text-base font-medium text-gray-900 mb-2">
                                    {pregunta.enunciado}
                                  </Paragraph>
                                </div>
                              </div>
                            </div>
                            
                            {pregunta.opciones && (
                              <div className="space-y-2">
                                {pregunta.opciones.map((opcion, idx) => {
                                  const esSeleccionada = opcion.valor === respuestas[pregunta.id];
                                  
                                  return (
                                    <div 
                                      key={idx}
                                      className={`border rounded-lg p-2 transition-all duration-200 ${
                                        esSeleccionada 
                                          ? 'border-blue-400 bg-blue-50' 
                                          : 'border-gray-200 bg-white'
                                      }`}
                                      style={{ 
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <div className="flex items-center w-full">
                                        <div className="flex items-center flex-1 min-w-0 pr-4">
                                          <span className={`text-sm truncate ${
                                            esSeleccionada ? 'font-medium text-gray-900' : 'text-gray-600'
                                          }`}>
                                            {opcion.valor}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {esSeleccionada && (
                                            <CheckCircleOutlined className="text-green-600 mr-2 text-base" />
                                          )}
                                          <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                                            esSeleccionada 
                                              ? 'bg-blue-100 text-blue-700' 
                                              : 'bg-gray-100 text-gray-600'
                                          }`}>
                                            {opcion.puntuacion} pts
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {!respuestas[pregunta.id] && (
                                  <div className="text-sm text-gray-500 italic mt-2">
                                    Sin respuesta registrada
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {/* Sección de comentarios */}
            {preguntasComentarios.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <InfoCircleOutlined className="text-lg text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Comentarios Adicionales
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {preguntasComentarios.map((pregunta, index) => (
                    <div key={pregunta.id} className="border-l-4 border-blue-200 pl-4">
                      <div className="mb-2">
                        <div className="flex items-start mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full mr-3">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <Paragraph className="text-base font-medium text-gray-900 mb-2">
                              {pregunta.enunciado}
                            </Paragraph>
                          </div>
                        </div>
                      </div>

                      <div className="ml-9">
                        <div className="bg-gray-50 p-3 rounded border">
                          <Text className="text-gray-900">
                            {respuestas[pregunta.id] || 'No respondido'}
                          </Text>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end items-center gap-3 mt-6 pt-4 border-t">
            <Button 
              type="default"
              size="large"
              icon={<DownloadOutlined />}
              onClick={handleDownloadPDF}
              className="px-6"
            >
              Descargar PDF
            </Button>
            <Button 
              type="primary"
              size="large"
              icon={<PrinterOutlined />}
              onClick={handlePrintPreview}
              className="px-6"
            >
              Imprimir
            </Button>
            <Button 
              type="default"
              size="large"
              onClick={onClose}
              className="px-6"
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default VerEvaluacionModal;
