import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Radio, 
  Progress, 
  Divider, 
  Typography, 
  Space, 
  message,
  Spin,
  Alert,
  Steps,
  Tag,
  Input
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  CheckOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { authService } from '../../services/auth';
import UserMenu from '../../components/UserMenu';
import EvaluacionHeader from '../../components/evaluaciones/EvaluacionHeader';
import '../../components/evaluaciones/EvaluacionHeader.css';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { TextArea } = Input;

const EvaluacionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
          const totalPreguntas = evaluacionData.formulario.preguntas.length;
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
      navigate('/evaluador/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  // Cargar evaluación solo una vez al montar el componente
  useEffect(() => {
    if (!evaluacion) {
      cargarEvaluacion();
    }
  }, [id]);

  // Manejar cambio de respuesta
  const handleRespuestaChange = (preguntaId, valor) => {
    setRespuestas(prev => ({
      ...prev,
      [preguntaId]: valor
    }));
    
    // Actualizar progreso
    const totalPreguntas = formulario?.preguntas?.length || 0;
    const contestadas = Object.keys({ ...respuestas, [preguntaId]: valor }).length;
    setProgress(Math.round((contestadas / totalPreguntas) * 100));
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

      await axios.put(`/api/evaluaciones/${id}/respuestas`, {
        respuestas: respuestasArray,
        finalizar: false // No finalizar, solo guardar
      }, {
        headers: { 
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      message.success('Evaluación guardada correctamente');
      
      // Disparar evento para actualizar botones inmediatamente
      window.dispatchEvent(new CustomEvent('evaluacionCerrada'));
      
      // Navegación al dashboard
      navigate('/evaluador/dashboard', { replace: true });
    } catch (error) {
      console.error('Error al guardar evaluación:', error);
      
      // Manejo específico de errores
      if (!error.response) {
        message.error('Error de conexión. Verifique su internet');
      } else if (error.response.status === 401) {
        message.error('Sesión expirada. Inicie sesión nuevamente');
        navigate('/login');
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
      
      const totalPreguntas = formulario?.preguntas?.length || 0;
      const contestadas = Object.keys(respuestas).length;
      
      if (contestadas < totalPreguntas) {
        message.warning('Debe responder todas las preguntas antes de finalizar');
        setSaving(false);
        return;
      }

      // Preparar respuestas para enviar
      const respuestasArray = Object.entries(respuestas).map(([preguntaId, respuesta]) => ({
        preguntaId: parseInt(preguntaId),
        respuesta: respuesta
      }));

      // Enviar y finalizar en una sola petición
      await axios.put(`/api/evaluaciones/${id}/respuestas`, {
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
      
      // Navegación al dashboard
      navigate('/evaluador/dashboard', { replace: true });
      
    } catch (error) {
      // Manejo de errores optimizado
      if (!error.response) {
        message.error('Error de conexión. Verifique su internet');
      } else if (error.response?.status === 401) {
        message.error('Sesión expirada');
        navigate('/login');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (formularioNoDisponible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
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
          <div className="space-x-4">
            <Button 
              type="primary" 
              onClick={() => navigate('/evaluador/dashboard')}
              size="large"
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluacion || !formulario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert
          message="Evaluación no encontrada"
          description="No se pudo encontrar la evaluación solicitada."
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/evaluador/dashboard')}>
              Volver al Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  // Si la evaluación está completada, mostrar botón para verla
  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <CheckCircleOutlined className="text-6xl text-green-500" />
          </div>
          <Title level={3} className="mb-4">Evaluación Completada</Title>
          <Text className="block mb-6">
            Esta evaluación ya ha sido completada. Puedes ver los resultados detallados.
          </Text>
          <div className="space-x-4">
            <Button 
              type="primary" 
              onClick={() => navigate(`/evaluador/evaluacion-completada/${id}`)}
              size="large"
            >
              Ver Evaluación
            </Button>
            <Button 
              onClick={() => navigate('/evaluador/dashboard')}
              size="large"
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header estandarizado */}
      <EvaluacionHeader evaluacion={evaluacion} formulario={formulario} />
      
      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Información de la evaluación */}
        <Card className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <Title level={3}>{formulario.nombre}</Title>
              <Paragraph type="secondary">{formulario.descripcion}</Paragraph>
              <Space className="mt-2">
                <Tag color="blue" icon={<FileTextOutlined />}>
                  {formulario.preguntas.length} preguntas
                </Tag>
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  {progress}% completado
                </Tag>
                {completed && (
                  <Tag color="gold" icon={<CheckCircleOutlined />}>
                    Finalizada
                  </Tag>
                )}
              </Space>
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
              {completed && (
                <div className="mt-2 text-sm text-blue-600">
                  <InfoCircleOutlined /> Esta evaluación está finalizada y solo puede ser visualizada
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Text type="secondary">
              Evaluado: {evaluacion?.evaluado?.nombre} {evaluacion?.evaluado?.apellido} - {evaluacion?.evaluado?.cargo?.nombre}
            </Text>
            <div className="flex items-center">
              <Text type="secondary" className="mr-2">Progreso:</Text>
              <Progress 
                percent={progress} 
                status={completed ? 'success' : 'active'}
                strokeColor={completed ? '#52c41a' : '#1890ff'}
                className="w-32"
              />
            </div>
          </div>
        </Card>

        {/* Preguntas agrupadas por apartado */}
        <div className="space-y-6">
          {apartados.map(apartado => {
            const preguntas = preguntasPorApartado[apartado];
            if (preguntas.length === 0) return null;

            return (
              <Card key={apartado} className="shadow-sm">
                <div className="flex items-center justify-between mb-6">
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

                <div className="space-y-6">
                  {preguntas.map((pregunta, index) => (
                    <div key={pregunta.id} className="border-l-4 border-gray-200 pl-4">
                      <div className="mb-4">
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
                          <Space direction="vertical" className="w-full">
                            {pregunta.opciones.map((opcion, opcionIndex) => (
                              <Radio key={opcionIndex} value={opcion.valor} className="w-full">
                                <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                  <span className="text-base">{opcion.valor}</span>
                                  <div className="flex items-center gap-2">
                                    <Tag color="blue">{opcion.puntuacion} pts</Tag>
                                  </div>
                                  {respuestas[pregunta.id] === opcion.valor && (
                                    <CheckOutlined className="text-green-600 text-lg" />
                                  )}
                                </div>
                              </Radio>
                            ))}
                          </Space>
                        </Radio.Group>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Sección de comentarios - aparece después de todos los apartados */}
        {preguntasComentarios.length > 0 && (
          <Card className="shadow-sm">
            <div className="mb-6">
              <Title level={4} className="mb-0 text-gray-900">
                COMENTARIOS FINALES
              </Title>
              <Paragraph className="text-gray-600 mt-1">
                Por favor, proporcione sus comentarios finales sobre la evaluación.
              </Paragraph>
            </div>
            
            <div className="space-y-6">
              {preguntasComentarios.map((pregunta, index) => (
                <div key={pregunta.id} className="border-l-4 border-blue-200 pl-4">
                  <div className="mb-4">
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

                  {/* Campo de texto para comentarios */}
                  <TextArea
                    rows={4}
                    placeholder="Escriba sus comentarios aquí..."
                    value={respuestas[pregunta.id] || ''}
                    onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                    disabled={completed}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Acciones */}
        <Card>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Todas las preguntas están disponibles para responder. El progreso se guarda automáticamente.
            </div>

            <div className="flex space-x-4">
              <Button 
                onClick={handleGuardar}
                loading={saving}
                icon={<SaveOutlined />}
                disabled={completed}
              >
                Guardar progreso
              </Button>
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
        </Card>
      </div>
    </div>
  );
};

export default EvaluacionPage;
