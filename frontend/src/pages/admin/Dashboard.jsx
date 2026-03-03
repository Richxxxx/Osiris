import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message, Card, Table, Button, Space, Tag, Input } from 'antd';
import { authService } from '../../services/auth';
import { useUsers } from '../../context/UserContext';
import EditarUsuarioModal from '../../components/users/EditarUsuarioModal';
import CrearEvaluacionForm from '../../components/evaluaciones/CrearEvaluacionForm';
import CrearUsuarioModal from '../../components/users/CrearUsuarioModal';
import CrearFormulario from '../../components/evaluaciones/CrearFormulario';
import EditarFormulario from '../../components/evaluaciones/EditarFormulario';
import EliminarFormularioModal from '../../components/evaluaciones/EliminarFormularioModal';
import EliminarUsuarioModal from '../../components/users/EliminarUsuarioModal';
import LayoutAdmin from '../../components/admin/Layout';
import UserMenu from '../../components/UserMenu';
import { Users, FileText, TrendingUp, Building, Plus, Edit, Trash2, BarChart3 } from 'lucide-react';

// Componentes de las tarjetas de resumen
const SummaryCard = ({ title, value, icon, color, trend, percentage, trendText, bgColor, textColor, borderColor }) => (
  <div className={`bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-6`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="flex items-end mt-1">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <span className={`ml-2 text-xs font-medium ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'} flex items-center`}>
              {trend} {trendText && `(${trendText})`}
            </span>
          )}
        </div>
      </div>
      <div className={`p-3 rounded-lg ${bgColor} bg-opacity-10`}>
        {icon}
      </div>
    </div>
    {percentage && (
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${bgColor}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    )}
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { users, loading, error, updateUser, getUserById, deleteUser, createModalOpen, setCreateModalOpen } = useUsers();
  const [editingUser, setEditingUser] = useState(null);
  const [showCrearEvaluacion, setShowCrearEvaluacion] = useState(false);
  const [showCrearFormulario, setShowCrearFormulario] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmDeleteFormulario, setConfirmDeleteFormulario] = useState(null);
  const [isDeletingFormulario, setIsDeletingFormulario] = useState(false);
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    totalEvaluadores: 0,
    totalGestores: 0,
    totalEvaluaciones: 0
  });
  const [formularios, setFormularios] = useState([]);
  const [loadingFormularios, setLoadingFormularios] = useState(false);
  const [editingFormulario, setEditingFormulario] = useState(null);
  const [filtroFormularios, setFiltroFormularios] = useState('');
  const [filtroUsuarios, setFiltroUsuarios] = useState('');
  const [paginationConfigUsuarios, setPaginationConfigUsuarios] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [paginationConfig, setPaginationConfig] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  
  // Obtener la pestaña activa de los parámetros de búsqueda
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Actualizar estadísticas basadas en los usuarios
  useEffect(() => {
    if (!users || users.length === 0) {
      setStats({
        totalEmpleados: 0,
        totalEvaluadores: 0,
        totalGestores: 0,
        totalEvaluaciones: 0
      });
      return;
    }

    const getRoleSlug = (user) => (user?.rol?.nombre || user?.rol || '').toLowerCase();
    const totalEmpleados = users.filter(u => getRoleSlug(u) === 'empleado').length;
    const totalEvaluadores = users.filter(u => getRoleSlug(u) === 'evaluador').length;
    const totalGestores = users.filter(u => getRoleSlug(u) === 'gestion').length;
    
    setStats(prev => ({
      ...prev,
      totalEmpleados,
      totalEvaluadores,
      totalGestores
    }));
  }, [users]);

  // Cargar evaluaciones desde la base de datos
  useEffect(() => {
    cargarEvaluaciones();
  }, []);

  const cargarEvaluaciones = async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const response = await fetch('/api/evaluaciones', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const totalEvaluaciones = data.data?.evaluaciones?.length || 0;
        
        setStats(prev => ({
          ...prev,
          totalEvaluaciones
        }));
      }
    } catch (error) {
    }
  };

  // Cargar formularios
  useEffect(() => {
    if (activeTab === 'formularios') {
      cargarFormularios();
    }
  }, [activeTab]);

  const cargarFormularios = async () => {
    try {
      setLoadingFormularios(true);
      const user = authService.getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const response = await fetch('/api/formularios/listar', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const formulariosData = data.data?.formularios || [];
        setFormularios(formulariosData);
        setPaginationConfig(prev => ({
          ...prev,
          total: formulariosData.length
        }));
      } else {
        message.error('Error al cargar los formularios');
      }
    } catch (error) {
      message.error('Error al cargar los formularios');
    } finally {
      setLoadingFormularios(false);
    }
  };

  // Función para filtrar formularios
  const filtrarFormularios = (formulariosList, filtro) => {
    if (!filtro) return formulariosList;
    
    const filtroLower = filtro.toLowerCase();
    return formulariosList.filter(formulario => 
      formulario.nombre?.toLowerCase().includes(filtroLower) ||
      formulario.descripcion?.toLowerCase().includes(filtroLower) ||
      formulario.cargos?.[0]?.nombre?.toLowerCase().includes(filtroLower) ||
      formulario.cargos?.[0]?.departamento?.nombre?.toLowerCase().includes(filtroLower)
    );
  };

  // Manejar cambio de página
  const handleTableChange = (pagination) => {
    setPaginationConfig({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total
    });
  };

  // Función para filtrar usuarios
  const filtrarUsuarios = (usuariosList, filtro) => {
    if (!filtro) return usuariosList;
    
    const filtroLower = filtro.toLowerCase();
    return usuariosList.filter(usuario => 
      usuario.nombre?.toLowerCase().includes(filtroLower) ||
      usuario.apellido?.toLowerCase().includes(filtroLower) ||
      usuario.email?.toLowerCase().includes(filtroLower) ||
      (usuario.rol?.nombre || usuario.rol || '').toLowerCase().includes(filtroLower)
    );
  };

  // Manejar cambio de página de usuarios
  const handleTableChangeUsuarios = (pagination) => {
    setPaginationConfigUsuarios({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total
    });
  };

  // Manejar cambio de filtro de usuarios
  const handleFiltroChangeUsuarios = (e) => {
    const valor = e.target.value;
    setFiltroUsuarios(valor);
    setPaginationConfigUsuarios(prev => ({ ...prev, current: 1 })); // Resetear a primera página
  };

  // Manejar cambio de filtro de formularios
  const handleFiltroChange = (e) => {
    const valor = e.target.value;
    setFiltroFormularios(valor);
    setPaginationConfig(prev => ({ ...prev, current: 1 })); // Resetear a primera página
  };

  const cargarFormularioParaEditar = async (formularioId) => {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const response = await fetch(`/api/formularios/${formularioId}/ver`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEditingFormulario(data.data.formulario);
      } else {
        message.error('Error al cargar el formulario');
      }
    } catch (error) {
      message.error('Error al cargar el formulario');
    }
  };

  const handleEditUser = async (user) => {
    try {
      const userToEdit = await getUserById(user.id, { forceRefresh: true });
      if (userToEdit) {
        setEditingUser(userToEdit);
      }
    } catch (err) {
      message.error('No se pudo cargar la información del usuario');
    }
  };

  const handleUserUpdated = async () => {
    try {
      setEditingUser(null);
      message.success('Usuario actualizado exitosamente');
    } catch (error) {
      message.error('Error al actualizar usuario');
    }
  };

  const handleSaveUser = async (updatedUser) => {
    try {
      await updateUser(editingUser.id, updatedUser);
      setEditingUser(null);
      alert('Usuario actualizado correctamente');
    } catch (error) {
      alert('Ocurrió un error al actualizar el usuario');
    }
  };

  const handleDeleteFormulario = (formulario) => {
    setConfirmDeleteFormulario(formulario);
  };

  const handleFormularioDeleted = () => {
    setConfirmDeleteFormulario(null);
    cargarFormularios(); // Recargar la lista
  };

  const handleDeleteUser = (user) => {
    setConfirmDeleteUser(user);
    setShowDeleteModal(true);
  };

  const confirmEliminarUsuario = async () => {
    if (!confirmDeleteUser) return;
    setIsDeleting(true);
    try {
      await deleteUser(confirmDeleteUser.id);
      setConfirmDeleteUser(null);
    } catch (error) {
      alert('Ocurrió un error al eliminar el usuario');
    } finally {
      setIsDeleting(false);
    }
  };

  // Datos para la tarjeta de usuario actual
  const currentUser = authService.getCurrentUser();
  const userProfile = {
    nombre: currentUser?.nombre || 'Usuario',
    rol: currentUser?.rol?.nombre ? currentUser?.rol?.nombre : currentUser?.role || 'Administrador',
    id: currentUser?.id ? `ADM-${currentUser.id}` : 'ADM-001',
    email: currentUser?.email || 'admin@empresa.com',
    direccion: currentUser?.direccion || '—',
    evaluaciones: stats.totalEvaluaciones,
    promedio: 0
  };

  // Columnas para la tabla de usuarios
  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 180,
      render: (text, record) => `${text} ${record.apellido || ''}`,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 220,
      ellipsis: true,
    },
    {
      title: 'Rol',
      dataIndex: ['rol', 'nombre'],
      key: 'rol',
      width: 120,
      render: (rol) => {
        const colorMap = {
          'administrador': 'red',
          'evaluador': 'blue',
          'gestión': 'purple',
          'gestion': 'purple',
          'default': 'green'
        };
        const normalizedRol = rol?.toLowerCase();
        const color = colorMap[normalizedRol] || colorMap.default;
        return <Tag color={color}>{rol}</Tag>;
      },
    },
    {
      title: 'Departamento',
      dataIndex: ['departamento', 'nombre'],
      key: 'departamento',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Empresa',
      dataIndex: ['empresa', 'nombre'],
      key: 'empresa',
      width: 120,
      render: (empresa) => (
        <Tag color="blue" style={{ fontSize: '12px' }}>
          {empresa || 'Sin asignar'}
        </Tag>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 90,
      align: 'center',
      render: (estado) => (
        <Tag color={estado === 'activo' ? 'green' : 'red'} style={{ fontSize: '12px' }}>
          {estado}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button 
            size="small"
            style={{ backgroundColor: '#fefce8', borderColor: '#f59e0b', color: '#92400e' }}
            onClick={() => handleEditUser(record)}
          >
            Editar
          </Button>
          <Button 
            size="small" 
            danger
            onClick={() => handleDeleteUser(record)}
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  // Columnas para la tabla de formularios
  const formularioColumns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Departamento',
      key: 'departamento',
      width: 140,
      ellipsis: true,
      render: (text, record) => {
        if (record.cargos && record.cargos.length > 0) {
          return record.cargos[0].departamento?.nombre || 'No asignado';
        }
        return 'No asignado';
      },
    },
    {
      title: 'Cargo',
      key: 'cargo',
      width: 140,
      ellipsis: true,
      render: (text, record) => {
        if (record.cargos && record.cargos.length > 0) {
          return record.cargos[0].nombre;
        }
        return 'No asignado';
      },
    },
    {
      title: 'Empresa',
      key: 'empresa',
      width: 140,
      ellipsis: true,
      render: (text, record) => (
        <Tag color="blue" style={{ fontSize: '12px' }}>
          {record.empresa?.nombre || 'Sin asignar'}
        </Tag>
      ),
    },
    {
      title: 'Periodicidad',
      dataIndex: 'periodicidad',
      key: 'periodicidad',
      width: 120,
      align: 'center',
      render: (periodicidad) => (
        <Tag 
          color={periodicidad === 'trimestral' ? 'blue' : 'purple'}
          style={{ 
            margin: 0,
            fontSize: '12px',
            textTransform: 'capitalize',
            fontWeight: 'bold'
          }}
        >
          {periodicidad}
        </Tag>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 90,
      align: 'center',
      render: (estado) => (
        <Tag 
          color={estado === 'activo' ? 'green' : 'red'}
          style={{ 
            margin: 0,
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          {estado}
        </Tag>
      ),
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'fecha_inicio',
      key: 'fecha_inicio',
      width: 140,
      align: 'center',
      render: (fecha) => {
        if (!fecha) return '—';
        // Formatear fecha DD/MM/YYYY
        const fechaObj = new Date(fecha);
        return fechaObj.toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        });
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button 
            size="small"
            style={{ 
              backgroundColor: '#fefce8', 
              borderColor: '#f59e0b', 
              color: '#92400e',
              fontSize: '12px',
              height: '24px',
              padding: '0 8px'
            }}
            onClick={() => cargarFormularioParaEditar(record.id)}
          >
            Editar
          </Button>
          <Button 
            size="small" 
            danger
            style={{
              fontSize: '12px',
              height: '24px',
              padding: '0 8px'
            }}
            onClick={() => handleDeleteFormulario(record)}
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    // Verificar autenticación y rol
    const user = authService.getCurrentUser();
    if (!user || user.role !== authService.roles.ADMIN) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    // Cargar formularios cuando la pestaña activa es 'formularios'
    if (activeTab === 'formularios') {
      cargarFormularios();
    }
  }, [activeTab]);

  // Escuchar eventos del sidebar para acciones rápidas
  useEffect(() => {
    const handleOpenCrearFormulario = () => setShowCrearFormulario(true);
    const handleOpenCrearEvaluacion = () => setShowCrearEvaluacion(true);

    window.addEventListener('openCrearFormulario', handleOpenCrearFormulario);
    window.addEventListener('openCrearEvaluacion', handleOpenCrearEvaluacion);

    return () => {
      window.removeEventListener('openCrearFormulario', handleOpenCrearFormulario);
      window.removeEventListener('openCrearEvaluacion', handleOpenCrearEvaluacion);
    };
  }, []);


  const renderLoadingState = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );

  const renderErrorState = () => (
    <div className="p-4 bg-red-100 text-red-700 rounded-md mb-6">
      {error}
    </div>
  );

  // Manejo de estados de carga y error
  if (loading) {
    return (
      <LayoutAdmin>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </LayoutAdmin>
    );
  }

  if (error) {
    return (
      <LayoutAdmin>
        <div className="p-4 bg-red-100 text-red-700 rounded-md m-6">
          Error: {error}
        </div>
      </LayoutAdmin>
    );
  }

  // Renderizar contenido basado en la pestaña activa
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <SummaryCard
                title="Total Empleados"
                value={stats.totalEmpleados}
                icon={<Users className="h-6 w-6 text-blue-600" />}
                bgColor="bg-blue-600"
                borderColor="border-blue-100"
              />
              <SummaryCard
                title="Total Evaluadores"
                value={stats.totalEvaluadores}
                icon={<Building className="h-6 w-6 text-green-600" />}
                bgColor="bg-green-600"
                borderColor="border-green-100"
              />
              <SummaryCard
                title="Total Gestores"
                value={stats.totalGestores}
                icon={<BarChart3 className="h-6 w-6 text-orange-600" />}
                bgColor="bg-orange-600"
                borderColor="border-orange-100"
              />
              <SummaryCard
                title="Evaluaciones Totales"
                value={stats.totalEvaluaciones}
                icon={<FileText className="h-6 w-6 text-purple-600" />}
                bgColor="bg-purple-600"
                borderColor="border-purple-100"
              />
            </div>

            {/* Tabla de Usuarios */}
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>Gestión de Usuarios</span>
                  <Input.Search
                    placeholder="Buscar usuarios..."
                    value={filtroUsuarios}
                    onChange={handleFiltroChangeUsuarios}
                    allowClear
                    style={{ width: 300, marginLeft: 16 }}
                  />
                </div>
              }
              extra={
                <Button 
                  type="primary" 
                  icon={<Plus />}
                  onClick={() => setCreateModalOpen(true)}
                >
                  Nuevo Usuario
                </Button>
              }
            >
              <Table
                columns={columns}
                dataSource={filtrarUsuarios(users, filtroUsuarios)}
                loading={loading}
                rowKey="id"
                size="small"
                className="large-header-table"
                onChange={handleTableChangeUsuarios}
                pagination={{
                  current: paginationConfigUsuarios.current,
                  pageSize: paginationConfigUsuarios.pageSize,
                  total: filtrarUsuarios(users, filtroUsuarios).length,
                  showSizeChanger: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} de ${total} usuarios${filtroUsuarios ? ' (filtrados)' : ''}`,
                  pageSizeOptions: ['10', '20', '50'],
                  showQuickJumper: false
                }}
              />
            </Card>
          </div>
        );
      
      case 'formularios':
        // Filtrar formularios según el texto de búsqueda
        const formulariosFiltrados = filtrarFormularios(formularios, filtroFormularios);
        
        return (
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>Lista de Formularios</span>
                <Input.Search
                  placeholder="Buscar formularios..."
                  value={filtroFormularios}
                  onChange={handleFiltroChange}
                  allowClear
                  style={{ width: 300, marginLeft: 16 }}
                />
              </div>
            }
            extra={
              <Button 
                type="primary" 
                icon={<Plus />}
                onClick={() => setShowCrearFormulario(true)}
              >
                Crear Formulario
              </Button>
            }
          >
            <Table
              columns={formularioColumns}
              dataSource={formulariosFiltrados}
              loading={loadingFormularios}
              rowKey="id"
              size="small"
              className="large-header-table"
              onChange={handleTableChange}
              pagination={{
                current: paginationConfig.current,
                pageSize: paginationConfig.pageSize,
                total: formulariosFiltrados.length,
                showSizeChanger: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} de ${total} formularios${filtroFormularios ? ' (filtrados)' : ''}`,
                pageSizeOptions: ['10', '20', '50'],
                showQuickJumper: false
              }}
            />
          </Card>
        );
      
      case 'reportes':
        return (
          <div>
            <Card title="Reportes y Estadísticas">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card size="small" title="Reporte de Evaluaciones">
                  <p className="text-gray-500 mb-4">Generar reportes de evaluaciones por período y departamento.</p>
                  <Button type="primary" block>Generar Reporte</Button>
                </Card>
                <Card size="small" title="Estadísticas de Desempeño">
                  <p className="text-gray-500 mb-4">Ver estadísticas detalladas de desempeño por área.</p>
                  <Button type="primary" block>Ver Estadísticas</Button>
                </Card>
                <Card size="small" title="Reporte de Usuarios">
                  <p className="text-gray-500 mb-4">Reporte de usuarios activos y su participación.</p>
                  <Button type="primary" block>Generar Reporte</Button>
                </Card>
                <Card size="small" title="Análisis de Formularios">
                  <p className="text-gray-500 mb-4">Análisis del uso y efectividad de los formularios.</p>
                  <Button type="primary" block>Ver Análisis</Button>
                </Card>
              </div>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <LayoutAdmin>
      <style>{`
        .large-header-table .ant-table-thead > tr > th {
          font-size: 18px !important;
          font-weight: 600 !important;
          padding: 18px 8px !important;
        }
      `}</style>
      <div className="space-y-6">
        {renderContent()}
      </div>

      {/* Modales */}
      {createModalOpen && (
        <CrearUsuarioModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
            message.success('Usuario creado exitosamente');
          }}
        />
      )}

      {editingUser && (
        <EditarUsuarioModal
          open={!!editingUser}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={handleUserUpdated}
        />
      )}

      {showCrearFormulario && (
        <CrearFormulario
          open={showCrearFormulario}
          onClose={() => setShowCrearFormulario(false)}
          onSuccess={() => {
            setShowCrearFormulario(false);
            message.success('Formulario creado exitosamente');
            if (activeTab === 'formularios') {
              cargarFormularios();
            }
          }}
        />
      )}

      {editingFormulario && (
        <EditarFormulario
          open={!!editingFormulario}
          formularioId={editingFormulario.id}
          onClose={() => setEditingFormulario(null)}
          onSuccess={() => {
            setEditingFormulario(null);
            message.success('Formulario actualizado exitosamente');
            if (activeTab === 'formularios') {
              cargarFormularios();
            }
          }}
        />
      )}

      <EliminarUsuarioModal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setConfirmDeleteUser(null);
        }}
        user={confirmDeleteUser}
        onUserUpdated={handleUserUpdated}
      />

      <EliminarFormularioModal
        open={!!confirmDeleteFormulario}
        onClose={() => setConfirmDeleteFormulario(null)}
        formulario={confirmDeleteFormulario}
        onFormularioDeleted={handleFormularioDeleted}
      />
    </LayoutAdmin>
  );
};

export default AdminDashboard;
