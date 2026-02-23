import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import Button from '../../components/Button';
import UserMenu from '../../components/UserMenu';
import EvaluacionHeader from '../../components/evaluaciones/EvaluacionHeader';
import '../../components/evaluaciones/EvaluacionHeader.css';
import { ArrowLeftOutlined } from '@ant-design/icons';

const EvaluacionCompletadaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [evaluacion, setEvaluacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostrarResumen, setMostrarResumen] = useState(false);

  useEffect(() => {
    const cargarEvaluacion = async () => {
      try {
        const user = authService.getCurrentUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`/api/evaluaciones/${id}`, {
          headers: { 
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.status === 'success') {
          setEvaluacion(response.data.data.evaluacion);
        }
      } catch (error) {
        console.error('Error al cargar evaluación:', error);
        toast.error('Error al cargar la evaluación');
        navigate('/evaluador/dashboard');
      } finally {
        setLoading(false);
      }
    };

    cargarEvaluacion();
  }, [id, navigate]);

  const handleVolver = () => {
    navigate('/evaluador/dashboard');
  };

  const getTituloApartado = (apartado) => {
    const titulos = {
      'competencias': 'COMPETENCIAS, ACTITUD Y COMPORTAMIENTO',
      'experiencia': 'EXPERIENCIA LABORAL',
      'convivencia': 'CONVIVENCIA LABORAL',
      'desempeno': 'DESEMPEÑO INDIVIDUAL',
      'comentarios': 'COMENTARIOS FINALES'
    };
    return titulos[apartado] || apartado.toUpperCase();
  };

  const getPorcentajeApartado = (apartado) => {
    const porcentajes = evaluacion?.formulario?.porcentajes_apartados || {};
    return (porcentajes[apartado] || 0) * 100;
  };

  const calcularPuntuacionApartado = (apartado) => {
    if (!evaluacion?.respuestas) return 0;
    
    const respuestasApartado = evaluacion.respuestas.filter(
      r => r.pregunta?.apartado === apartado
    );
    
    if (respuestasApartado.length === 0) return 0;
    
    // Calcular promedio del apartado
    const sumaPuntuaciones = respuestasApartado.reduce((sum, r) => sum + (parseFloat(r.puntuacion) || 0), 0);
    const promedioApartado = sumaPuntuaciones / respuestasApartado.length;
    
    // Aplicar porcentaje del apartado
    const porcentajes = evaluacion?.formulario?.porcentajes_apartados || {};
    const porcentaje = porcentajes[apartado] || 0;
    
    return promedioApartado * porcentaje;
  };

  const calcularPuntuacionTotal = () => {
    // Usar el valor guardado en la base de datos si está disponible
    if (evaluacion?.puntuacionTotal !== null && evaluacion?.puntuacionTotal !== undefined) {
      // Asegurarse de que sea un número
      return parseFloat(evaluacion.puntuacionTotal) || 0;
    }
    
    // Si no está guardado, calcularlo localmente (fallback)
    if (!evaluacion?.respuestas) return 0;
    
    return evaluacion.respuestas.reduce((total, respuesta) => {
      return total + (parseFloat(respuesta.puntuacion) || 0);
    }, 0);
  };

  const getValoracionDesempeno = () => {
    const puntuacion = calcularPuntuacionTotal();
    
    if (puntuacion === 5) {
      return { texto: 'EXCELENTE', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
    } else if (puntuacion >= 4 && puntuacion <= 4.99) {
      return { texto: 'SOBRESALIENTE', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
    } else if (puntuacion >= 3 && puntuacion <= 3.99) {
      return { texto: 'BUENO', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    } else if (puntuacion >= 2.6 && puntuacion <= 2.99) {
      return { texto: 'ACEPTABLE', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' };
    } else if (puntuacion < 2.6) {
      return { texto: 'DEFICIENTE', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
    } else {
      return { texto: 'SIN CALIFICAR', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  const getRespuestaTexto = (respuesta, pregunta) => {
    if (pregunta.tipo === 'opcion_multiple' || pregunta.tipo === 'escala') {
      // Buscar la opción seleccionada
      const opciones = pregunta.opciones || [];
      const opcionSeleccionada = opciones.find(op => op.valor === respuesta.respuesta);
      return opcionSeleccionada ? opcionSeleccionada.valor : respuesta.respuesta;
    }
    return respuesta.respuesta;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!evaluacion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Evaluación no encontrada</h2>
          <Button onClick={handleVolver}>Volver al Dashboard</Button>
        </div>
      </div>
    );
  }

  // Agrupar preguntas por apartado
  const preguntasPorApartado = {};
  const apartados = ['competencias', 'experiencia', 'convivencia', 'desempeno', 'comentarios'];
  
  apartados.forEach(apartado => {
    preguntasPorApartado[apartado] = evaluacion.formulario.preguntas
      .filter(p => p.apartado === apartado)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header estandarizado */}
      <EvaluacionHeader evaluacion={evaluacion} formulario={evaluacion?.formulario} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Información general */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {evaluacion.evaluado?.nombre} {evaluacion.evaluado?.apellido || ''}
              </h2>
              <p className="text-gray-600">{evaluacion.evaluado?.cargo?.nombre || 'Sin cargo especificado'}</p>
              <p className="text-sm text-gray-500 mt-1">
                Período: {evaluacion.periodo} {evaluacion.anio}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                evaluacion?.estado === 'completada' ? 'bg-green-100 text-green-800' :
                evaluacion?.estado === 'en_progreso' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {evaluacion?.estado === 'completada' ? '✅ Completada' :
                 evaluacion?.estado === 'en_progreso' ? '🔄 En Progreso' :
                 '📝 Pendiente'}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {(() => {
                  const fechaUTC = new Date(evaluacion.fechaFin + 'Z');
                  return fechaUTC.toLocaleDateString('es-ES', { 
                    timeZone: 'UTC',
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                  });
                })()}
              </p>
            </div>
          </div>

          {/* Resumen de puntuaciones */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Resumen de Evaluación</h3>
              <Button
                onClick={() => setMostrarResumen(!mostrarResumen)}
                variant="secondary"
                size="sm"
              >
                {mostrarResumen ? 'Ocultar' : 'Mostrar'} Resumen
              </Button>
            </div>

            {mostrarResumen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {apartados.map(apartado => {
                  const puntuacion = calcularPuntuacionApartado(apartado);
                  const porcentaje = getPorcentajeApartado(apartado);
                  
                  // Obtener respuestas del apartado para mostrar detalles
                  const respuestasApartado = evaluacion?.respuestas?.filter(
                    r => r.pregunta?.apartado === apartado
                  ) || [];
                  
                  // Calcular promedio para mostrar
                  const sumaPuntuaciones = respuestasApartado.reduce((sum, r) => sum + (parseFloat(r.puntuacion) || 0), 0);
                  const promedio = respuestasApartado.length > 0 ? sumaPuntuaciones / respuestasApartado.length : 0;
                  
                  return (
                    <div key={apartado} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {getTituloApartado(apartado)}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Promedio:</span>
                          <span className="text-lg font-medium text-gray-700">
                            {promedio.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Ponderado ({porcentaje}%):</span>
                          <span className="text-xl font-medium text-gray-700">
                            {puntuacion.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-gray-400 h-2 rounded-full" 
                            style={{ width: `${Math.min(puntuacion * 10, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {respuestasApartado.length} pregunta(s) respondida(s)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-lg font-semibold text-gray-900">Puntuación Total</span>
                  {evaluacion?.puntuacionTotal !== null && evaluacion?.puntuacionTotal !== undefined && (
                    <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded border border-green-200">
                      Guardada
                    </span>
                  )}
                </div>
                <span className="text-3xl font-medium text-gray-700">
                  {calcularPuntuacionTotal().toFixed(1)}
                </span>
              </div>
            </div>

            {/* Valoración Final del Desempeño */}
            <div className="mt-4">
              {(() => {
                const valoracion = getValoracionDesempeno();
                return (
                  <div className={`${valoracion.bg} p-4 rounded-lg border-2 ${valoracion.border}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-lg font-semibold text-gray-900">Valoración Final del Desempeño</span>
                        <div className="text-sm text-gray-600 mt-1">
                          Basado en la puntuación total obtenida
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-medium ${valoracion.color}`}>
                          {valoracion.texto}
                        </span>
                        <div className="text-sm text-gray-600 mt-1">
                          {calcularPuntuacionTotal().toFixed(1)} puntos
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Preguntas y respuestas por apartado */}
        {apartados.map(apartado => {
          const preguntas = preguntasPorApartado[apartado];
          if (preguntas.length === 0) return null;

          return (
            <div key={apartado} className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {getTituloApartado(apartado)}
                  </h3>
                  {/* Solo mostrar porcentaje y conteo para apartados que no sean comentarios */}
                  {apartado !== 'comentarios' && (
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded border border-gray-200">
                        {getPorcentajeApartado(apartado)}% del total
                      </span>
                      <span className="text-xs text-gray-400">
                        ({preguntas.length} pregunta{preguntas.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className={apartado === 'comentarios' ? 'space-y-4' : 'space-y-6'}>
                {apartado === 'comentarios' ? (
                  // Para comentarios, mostrar unificados
                  (() => {
                    const respuestaAreas = evaluacion.respuestas?.find(
                      r => r.pregunta?.enunciado === 'ÁREAS DE MEJORAMIENTO'
                    );
                    const respuestaFortalezas = evaluacion.respuestas?.find(
                      r => r.pregunta?.enunciado === 'FORTALEZAS'
                    );

                    return (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg space-y-4">
                        {/* Áreas de Mejoramiento */}
                        <div>
                          <h4 className="text-base font-semibold text-blue-900 mb-2">
                            ÁREAS DE MEJORAMIENTO
                          </h4>
                          <div className="bg-white p-3 rounded border border-blue-200">
                            <p className="text-gray-700 whitespace-pre-wrap text-sm">
                              {respuestaAreas?.respuesta || 'Sin comentarios'}
                            </p>
                          </div>
                        </div>

                        {/* Fortalezas */}
                        <div>
                          <h4 className="text-base font-semibold text-blue-900 mb-2">
                            FORTALEZAS
                          </h4>
                          <div className="bg-white p-3 rounded border border-blue-200">
                            <p className="text-gray-700 whitespace-pre-wrap text-sm">
                              {respuestaFortalezas?.respuesta || 'Sin comentarios'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // Para preguntas normales, mostrar como siempre
                  preguntas.map((pregunta, index) => {
                    const respuesta = evaluacion.respuestas?.find(
                      r => r.preguntaId === pregunta.id
                    );
                    
                    return (
                      <div key={pregunta.id} className="border-l-4 border-blue-500 pl-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {index + 1}. {pregunta.enunciado}
                          </h4>
                          {respuesta?.puntuacion && (
                            <span className="inline-flex px-2 py-1 text-sm font-medium text-gray-600 bg-gray-50 rounded border border-gray-200">
                              {respuesta.puntuacion.toFixed(1)} pts
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {pregunta.opciones?.map((opcion, opcionIndex) => {
                            const esSeleccionada = respuesta?.respuesta === opcion.valor;
                            
                            return (
                              <div 
                                key={opcionIndex}
                                className={`border rounded-lg p-3 transition-all duration-200 ${
                                  esSeleccionada 
                                    ? 'bg-green-50 border-green-300 shadow-sm' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center flex-1">
                                    {esSeleccionada && (
                                      <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    <span className={`text-sm ${esSeleccionada ? 'font-medium text-green-900' : 'text-gray-700'}`}>
                                      {opcion.valor}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                      esSeleccionada 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {opcion.puntuacion} pts
                                    </span>
                                    {esSeleccionada && (
                                      <span className="inline-flex px-2 py-1 text-xs font-medium text-green-600 bg-green-50 rounded border border-green-200">
                                        Seleccionada
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {respuesta?.comentario && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">Comentario:</span> {respuesta.comentario}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvaluacionCompletadaPage;
