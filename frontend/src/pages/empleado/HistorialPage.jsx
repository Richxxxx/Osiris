import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Typography, 
  Space, 
  message,
  Spin,
  Empty,
  Progress,
  Tooltip
} from 'antd';
import { 
  EyeOutlined, 
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { authService } from '../../services/auth';
import axios from '../../utils/axiosConfig';
import VerEvaluacionModal from '../../components/empleado/VerEvaluacionModal';

const { Title, Text } = Typography;

// Función para formatear fecha (igual que en otros perfiles)
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  
  // Extraer los componentes directamente en UTC para evitar conversión de zona horaria
  const year = date.getUTCFullYear().toString().slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${day}/${month}/${year}`;
};

const HistorialPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [showEvaluacionModal, setShowEvaluacionModal] = useState(false);
  const [evaluacionSeleccionadaId, setEvaluacionSeleccionadaId] = useState(null);

  // Cargar historial de evaluaciones
  const cargarHistorial = useCallback(async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const response = await axios.get('/empleado/mis-evaluaciones', {
        headers: { 
          'Authorization': `Bearer ${currentUser.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.status === 'success') {
        const evaluacionesData = response.data.data.evaluaciones || [];
        
        // Procesar datos para mostrar
        const evaluacionesProcesadas = evaluacionesData.map(evaluacion => {
          // Extraer año de forma segura
          const year = evaluacion.anio || '';
          
          return {
            // Mantener todos los campos originales
            ...evaluacion,
            
            // Campos procesados para frontend
            evaluadorNombre: `${evaluacion.evaluador?.nombre || ''} ${evaluacion.evaluador?.apellido || ''}`.trim(),
            formularioNombre: evaluacion.periodo && year ? `${evaluacion.periodo} - ${year}` : 'Evaluación',
            fechaEvaluacion: evaluacion.fechaFin,
            valoracion: evaluacion.valoracion
          };
        });
        
        setEvaluaciones(evaluacionesProcesadas);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
      message.error('Error al cargar el historial de evaluaciones');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Verificar autenticación y rol
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.role !== authService.roles.EMPLEADO) {
      navigate('/login');
      return;
    }

    cargarHistorial();
  }, [navigate, cargarHistorial]);

  // Ver detalles de una evaluación (usar el mismo modal que el evaluador)
  const handleVerDetalles = (evaluacionId) => {
    setEvaluacionSeleccionadaId(evaluacionId);
    setShowEvaluacionModal(true);
  };

  // Cerrar modal
  const closeEvaluacionModal = () => {
    setShowEvaluacionModal(false);
    setEvaluacionSeleccionadaId(null);
  };

  // Ver resultados si está completada (usar modal como el evaluador)
  const handleVerResultados = (evaluacionId) => {
    setEvaluacionSeleccionadaId(evaluacionId);
    setShowEvaluacionModal(true);
  };

  // Obtener color de estado
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'completada':
        return 'success';
      case 'en_progreso':
        return 'processing';
      case 'pendiente':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Obtener icono de estado
  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'completada':
        return <CheckCircleOutlined />;
      case 'en_progreso':
        return <ClockCircleOutlined />;
      case 'pendiente':
        return <PlayCircleOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  // Obtener texto de estado
  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'completada':
        return 'Completada';
      case 'en_progreso':
        return 'En Progreso';
      case 'pendiente':
        return 'Pendiente';
      default:
        return estado;
    }
  };

  // Columnas de la tabla
  const columns = [
    {
      title: 'Evaluación',
      dataIndex: 'formularioNombre',
      key: 'formularioNombre',
      width: 120,
      render: (text) => (
        <div>
          <Text strong>{text}</Text>
        </div>
      ),
    },
    {
      title: 'Evaluador',
      dataIndex: 'evaluadorNombre',
      key: 'evaluadorNombre',
      width: 140,
      render: (text) => (
        <div className="flex items-center">
          <UserOutlined className="mr-1 text-gray-400" />
          <Text>{text}</Text>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (estado) => (
        <Tag 
          color={getEstadoColor(estado)} 
          icon={getEstadoIcon(estado)}
        >
          {getEstadoTexto(estado)}
        </Tag>
      ),
    },
    {
      title: 'Fecha Finalización',
      dataIndex: 'fechaEvaluacion',
      key: 'fechaEvaluacion',
      width: 120,
      render: (fecha) => {
        if (!fecha || fecha === null || fecha === undefined) {
          return <Text type="secondary">-</Text>;
        }
        
        // Si es un objeto con fecha, extraer la fecha
        let fechaAProcesar = fecha;
        if (typeof fecha === 'object' && fecha.fecha) {
          fechaAProcesar = fecha.fecha;
        }
        
        const date = new Date(fechaAProcesar);
        if (Number.isNaN(date.getTime())) {
          return <Text type="secondary">-</Text>;
        }
        
        const year = date.getUTCFullYear().toString().slice(-2);
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        
        return (
          <div className="flex items-center">
            <CalendarOutlined className="mr-1 text-gray-400" />
            <Text>{`${day}/${month}/${year}`}</Text>
          </div>
        );
      },
    },
    {
      title: 'Puntuación',
      dataIndex: 'puntuacionTotal',
      key: 'puntuacionTotal',
      width: 100,
      render: (puntuacion, record) => {
        if (record.estado !== 'completada' || !puntuacion) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Tag color="blue">
            {puntuacion} pts
          </Tag>
        );
      },
    },
    {
      title: 'Valoración',
      dataIndex: 'valoracion',
      key: 'valoracion',
      width: 110,
      render: (valoracion, record) => {
        if (record.estado !== 'completada') {
          return <Text type="secondary">-</Text>;
        }
        
        // Si es un objeto, extraer el valor
        let valoracionAProcesar = valoracion;
        if (typeof valoracion === 'object' && valoracion.valoracion) {
          valoracionAProcesar = valoracion.valoracion;
        }
        
        // Si no hay valoración o está vacía, mostrar mensaje
        if (!valoracionAProcesar || valoracionAProcesar === '' || valoracionAProcesar === null || valoracionAProcesar === undefined) {
          return <Text type="secondary">Sin valoración</Text>;
        }
        
        return (
          <span className={`px-1 py-0.5 text-xs font-medium rounded ${
            valoracionAProcesar === 'EXCELENTE' ? 'bg-purple-100 text-purple-700' :
            valoracionAProcesar === 'SOBRESALIENTE' ? 'bg-blue-100 text-blue-700' :
            valoracionAProcesar === 'BUENO' ? 'bg-green-100 text-green-700' :
            valoracionAProcesar === 'ACEPTABLE' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {valoracionAProcesar}
          </span>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          {record.estado === 'completada' ? (
            <Button 
              type="primary" 
              size="small"
              onClick={() => handleVerResultados(record.id)}
            >
              Ver Resultados
            </Button>
          ) : record.estado === 'en_progreso' ? (
            <button
              onClick={() => handleVerDetalles(record.id)}
              className="text-blue-600 hover:text-blue-900 font-medium text-sm"
            >
              Ver Evaluación
            </button>
          ) : (
            <Button 
              type="default" 
              size="small"
              disabled
            >
              Pendiente
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spin size="large" />
        <p className="mt-4 text-gray-600">Cargando historial de evaluaciones...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Tarjeta de resumen */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">{evaluaciones.length}</div>
            <div className="text-sm font-medium text-blue-700">Total Evaluaciones</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {evaluaciones.filter(e => e.estado === 'completada').length}
            </div>
            <div className="text-sm font-medium text-green-700">Completadas</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {evaluaciones.filter(e => e.estado === 'en_progreso').length}
            </div>
            <div className="text-sm font-medium text-yellow-700">En Progreso</div>
          </div>
        </div>
      </Card>

      {/* Tabla de evaluaciones */}
      <Card>
        <Title level={5} className="mb-4">Lista de Evaluaciones</Title>
        
        {evaluaciones.length === 0 ? (
          <Empty
            description="No tienes evaluaciones registradas"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              onClick={() => navigate('/empleado/dashboard')}
            >
              Volver al Dashboard
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={evaluaciones}
            rowKey="id"
            size="small"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} de ${total} evaluaciones`,
            }}
            scroll={{ x: 800 }}
            className="shadow-sm compact-table"
          />
        )}
      </Card>

      {/* Modal de Evaluación (usar el mismo que el evaluador) */}
      <VerEvaluacionModal
        visible={showEvaluacionModal}
        onClose={closeEvaluacionModal}
        evaluacionId={evaluacionSeleccionadaId}
      />
    </div>
  );
};

export default HistorialPage;
