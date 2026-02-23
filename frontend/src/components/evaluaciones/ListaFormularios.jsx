import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  message, 
  Modal, 
  Card,
  List,
  Divider,
  Tooltip
} from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined,
  FileTextOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { obtenerFormularios, eliminarFormulario } from '../../services/formularioService';
import CrearFormulario from './CrearFormulario';

const ListaFormularios = () => {
  const [formularios, setFormularios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crearModalVisible, setCrearModalVisible] = useState(false);
  const [vistaPreviaModal, setVistaPreviaModal] = useState(false);
  const [formularioSeleccionado, setFormularioSeleccionado] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [formularioAEliminar, setFormularioAEliminar] = useState(null);

  useEffect(() => {
    cargarFormularios();
  }, []);

  const cargarFormularios = async () => {
    try {
      setLoading(true);
      const response = await obtenerFormularios();
      setFormularios(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error('Error al cargar los formularios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearSuccess = () => {
    cargarFormularios();
    setCrearModalVisible(false);
  };

  const handleVerFormulario = (formulario) => {
    setFormularioSeleccionado(formulario);
    setVistaPreviaModal(true);
  };

  const handleEliminarFormulario = (formulario) => {
    setFormularioAEliminar(formulario);
    setDeleteModalVisible(true);
  };

  const confirmarEliminacion = async () => {
    if (!formularioAEliminar) return;

    try {
      await eliminarFormulario(formularioAEliminar.id);
      message.success('Formulario eliminado exitosamente');
      cargarFormularios();
      setDeleteModalVisible(false);
      setFormularioAEliminar(null);
    } catch (error) {
      message.error('Error al eliminar el formulario');
      console.error(error);
    }
  };

  const getTipoPreguntaLabel = (tipo) => {
    const tipos = {
      texto: 'Texto libre',
      opcion_unica: 'Opción única',
      opcion_multiple: 'Opción múltiple',
      escala: 'Escala numérica'
    };
    return tipos[tipo] || tipo;
  };

  const getTituloApartado = (key) => {
    const titulos = {
      competencias: 'Competencias',
      experiencia: 'Experiencia',
      convivencia: 'Convivencia',
      desempeno: 'Desempeño'
    };
    return titulos[key] || key;
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.descripcion}
          </div>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag color={estado === 'activo' ? 'green' : 'red'}>
          {estado.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Preguntas',
      dataIndex: 'preguntas',
      key: 'preguntas',
      render: (preguntas) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {preguntas?.length || 0} preguntas
          </div>
          {preguntas && preguntas.length > 0 && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.keys(
                preguntas.reduce((acc, p) => {
                  acc[p.apartado] = (acc[p.apartado] || 0) + 1;
                  return acc;
                }, {})
              ).map(apartado => `${getTituloApartado(apartado)}: ${
                preguntas.filter(p => p.apartado === apartado).length
              }`).join(' | ')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Departamento',
      dataIndex: ['departamento', 'nombre'],
      key: 'departamento',
      render: (departamento) => departamento || 'No asignado',
    },
    {
      title: 'Fecha de creación',
      dataIndex: 'fecha_creacion',
      key: 'fecha_creacion',
      render: (fecha) => {
        if (!fecha) return '—';
        const fechaUTC = new Date(fecha + 'Z');
        return fechaUTC.toLocaleDateString('es-ES', { 
          timeZone: 'UTC',
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Ver formulario">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleVerFormulario(record)}
            />
          </Tooltip>
          <Tooltip title="Editar formulario">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => {/* Implementar edición */}}
            />
          </Tooltip>
          <Tooltip title="Eliminar formulario">
            <Button 
              type="text" 
              danger
              icon={<DeleteOutlined />} 
              onClick={() => handleEliminarFormulario(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const renderVistaPreviaModal = () => (
    <Modal
      title={`Vista previa: ${formularioSeleccionado?.nombre}`}
      visible={vistaPreviaModal}
      onCancel={() => setVistaPreviaModal(false)}
      footer={[
        <Button key="close" onClick={() => setVistaPreviaModal(false)}>
          Cerrar
        </Button>
      ]}
      width={800}
    >
      {formularioSeleccionado && (
        <div>
          <Card size="small" style={{ marginBottom: 16 }}>
            <p><strong>Descripción:</strong> {formularioSeleccionado.descripcion}</p>
            <p><strong>Estado:</strong> 
              <Tag color={formularioSeleccionado.estado === 'activo' ? 'green' : 'red'} style={{ marginLeft: 8 }}>
                {formularioSeleccionado.estado.toUpperCase()}
              </Tag>
            </p>
            <p><strong>Departamento:</strong> {formularioSeleccionado.departamento?.nombre || 'No asignado'}</p>
            <p><strong>Total de preguntas:</strong> {formularioSeleccionado.preguntas?.length || 0}</p>
          </Card>

          <Divider />

          {['competencias', 'experiencia', 'convivencia', 'desempeno'].map(apartado => {
            const preguntasApartado = formularioSeleccionado.preguntas?.filter(p => p.apartado === apartado) || [];
            if (preguntasApartado.length === 0) return null;
            
            return (
              <div key={apartado} style={{ marginBottom: 24 }}>
                <h4>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  {getTituloApartado(apartado)} ({preguntasApartado.length})
                </h4>
                <List
                  itemLayout="horizontal"
                  dataSource={preguntasApartado}
                  renderItem={(pregunta, index) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span>
                            {index + 1}. {pregunta.enunciado}
                            {pregunta.obligatoria && <Tag color="red" style={{ marginLeft: 8 }}>Obligatoria</Tag>}
                          </span>
                        }
                        description={
                          <div>
                            <p><strong>Tipo:</strong> {getTipoPreguntaLabel(pregunta.tipo)}</p>
                            {pregunta.opciones && pregunta.opciones.length > 0 && (
                              <p><strong>Opciones:</strong> {pregunta.opciones.map(o => o.valor).join(', ')}</p>
                            )}
                            {pregunta.cargos && pregunta.cargos.length > 0 && (
                              <p>
                                <strong>Aplica a:</strong> 
                                <Tag color="blue" style={{ marginLeft: 8 }}>
                                  <TeamOutlined style={{ marginRight: 4 }} />
                                  {pregunta.cargos.length} cargo{pregunta.cargos.length > 1 ? 's' : ''}
                                </Tag>
                              </p>
                            )}
                            <p><strong>Peso:</strong> {pregunta.peso || 1.0}</p>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal
      title="Confirmar eliminación"
      visible={deleteModalVisible}
      onOk={confirmarEliminacion}
      onCancel={() => {
        setDeleteModalVisible(false);
        setFormularioAEliminar(null);
      }}
      okText="Eliminar"
      cancelText="Cancelar"
      okButtonProps={{ danger: true }}
    >
      <p>¿Está seguro que desea eliminar el formulario "{formularioAEliminar?.nombre}"?</p>
      <p style={{ color: '#ff4d4f' }}>Esta acción no se puede deshacer.</p>
    </Modal>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          Formularios de Evaluación
        </h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setCrearModalVisible(true)}
        >
          Crear Nuevo Formulario
        </Button>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={formularios} 
        rowKey="id" 
        loading={loading}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} formularios`
        }}
        locale={{
          emptyText: 'No hay formularios registrados'
        }}
      />

      <CrearFormulario
        visible={crearModalVisible}
        onClose={() => setCrearModalVisible(false)}
        onSuccess={handleCrearSuccess}
      />

      {renderVistaPreviaModal()}
      {renderDeleteModal()}
    </div>
  );
};

export default ListaFormularios;
