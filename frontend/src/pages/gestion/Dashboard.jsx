import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Target,
  TrendingUp,
  FileText,
  BarChart3,
  Building2,
  Search,
  UserPlus,
  X,
  Info,
  Calendar,
  FileCheck
} from 'lucide-react';
import { obtenerEstadisticas } from '../../services/gestionService';
import { authService } from '../../services/auth';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import HeaderGestion from '../../components/gestion/Header';
import SidebarGestion from '../../components/gestion/Sidebar';
import ModalAsignacionEvaluacion from '../../components/gestion/ModalAsignacionEvaluacion';
import { determinarTipoEvaluacion, debeMostrarBotonAsignar } from '../../utils/evaluacionUtils';

// Obtener el periodo actual
const getCurrentPeriod = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentPeriod = Math.floor(currentMonth / 3) + 1;
  return {
    quarter: `Q${currentPeriod}`,
    year: currentYear,
    label: `Q${currentPeriod} - ${currentYear}`
  };
};

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState(getCurrentPeriod());
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    evaluacionesEsperadas: 0,
    totalEvaluaciones: 0,
    evaluacionesCompletadas: 0,
    evaluacionesPendientes: 0,
    evaluacionesEnProgreso: 0,
    lideresActivos: 0,
    departamentos: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para búsqueda y asignación
  const [busquedaActiva, setBusquedaActiva] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [modalAsignacionVisible, setModalAsignacionVisible] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [ultimaEvaluacion, setUltimaEvaluacion] = useState(null);

  // Debounce para evitar múltiples peticiones
  const debounceRef = useRef(null);

  // Función para buscar usuarios
  const buscarUsuarios = async (termino) => {
    // Limpiar y validar el término de búsqueda
    const terminoLimpio = termino.trim();
    
    if (!terminoLimpio || terminoLimpio.length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    
    setBuscando(true);
    try {
      const response = await axios.get('/usuarios/gestion/buscar-usuarios', {
        params: { termino: terminoLimpio }
      });
      
      if (response.data.status === 'success') {
        setResultadosBusqueda(response.data.data);
      }
      } catch (error) {
      toast.error('Error al buscar usuarios');
      setResultadosBusqueda([]);
    } finally {
      setBuscando(false);
    }
  };
  
  // Función para obtener última evaluación de un empleado
  const obtenerUltimaEvaluacion = async (empleadoId, empleado) => {
    try {
      const response = await axios.get(`/usuarios/gestion/ultima-evaluacion/${empleadoId}`);
      
      if (response.data.status === 'success') {
        setUltimaEvaluacion(response.data.data);
        
        // Calcular tipo de evaluación que le corresponde
        const tipoCalculado = determinarTipoEvaluacion(empleado);
        setTipoEvaluacionCalculado(tipoCalculado);
      }
    } catch (error) {
      toast.error('Error al obtener última evaluación');
    }
  };
  
  // Función para asignar evaluación
  const asignarEvaluacion = async (datos) => {
    try {
      const response = await axios.post('/usuarios/gestion/asignar-evaluacion', datos);
      
      if (response.data.status === 'success') {
        toast.success(response.data.message);
        
        // Cerrar modales
        setModalUsuarioVisible(false);
        setModalAsignacionVisible(false);
        
        // Limpiar búsqueda
        setTerminoBusqueda('');
        setResultadosBusqueda([]);
        setBusquedaActiva(false);
        setUsuarioSeleccionado(null);
        setUltimaEvaluacion(null);
      }
    } catch (error) {
      
      if (error.response?.data?.evaluacionExistente) {
        // Caso especial: evaluación completada existente
        toast.error(error.response.data.message);
      } else {
        // Error general
        toast.error(error.response?.data?.message || 'Error al asignar evaluación');
      }
    }
  };
  
  // Manejar clic en usuario
  const handleClicUsuario = async (usuario) => {
    setUsuarioSeleccionado(usuario);
    
    // Obtener última evaluación
    try {
      const response = await axios.get(`/usuarios/gestion/ultima-evaluacion/${usuario.id}`);
      
      if (response.data.status === 'success') {
        setUltimaEvaluacion(response.data.data);
      }
    } catch (error) {
      setUltimaEvaluacion(null);
    }
    
    // Mostrar modal de asignación
    setModalAsignacionVisible(true);
  };

  // Manejar cierre del modal y refrescar búsqueda
  const handleAsignacionCompletada = () => {
    setModalAsignacionVisible(false);
    setUsuarioSeleccionado(null);
    setUltimaEvaluacion(null);
    
    // Limpiar búsqueda y recargar si hay término
    if (terminoBusqueda.trim()) {
      buscarUsuarios(terminoBusqueda);
    }
  };
  
  // Manejar asignación de evaluación existente
  const handleAsignarExistente = () => {
    if (!ultimaEvaluacion) return;
    
    const datos = {
      evaluadorId: ultimaEvaluacion.evaluadorId,
      empleadoId: usuarioSeleccionado.id,
      tipo: ultimaEvaluacion.periodicidad,
      periodo: ultimaEvaluacion.periodo,
      anio: ultimaEvaluacion.anio,
      fechaLimite: ultimaEvaluacion.fechaLimite,
      esExistente: true // Indicar que es evaluación existente
    };
    
    asignarEvaluacion(datos);
  };
  
  // Manejar asignación de nueva evaluación
  const handleAsignarNueva = () => {
    if (!usuarioSeleccionado || !tipoEvaluacionCalculado) return;
    
    const datos = {
      evaluadorId: user.id, // El usuario de gestión asigna a sí mismo como evaluador
      empleadoId: usuarioSeleccionado.id,
      tipo: tipoEvaluacionCalculado.periodicidad, // Usar el tipo calculado
      periodo: tipoEvaluacionCalculado.periodo,
      anio: tipoEvaluacionCalculado.anio,
      // Obtener fecha local actual para evitar problemas de timezone
      fechaLimite: (() => {
        const ahora = new Date();
        const fechaLocal = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
        return fechaLocal.toISOString().split('T')[0];
      })(),
      esExistente: false // Indicar que es nueva evaluación
    };
    
    asignarEvaluacion(datos);
  };

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    const fetchData = async () => {
      try {
        // Obtener estadísticas del trimestre actual con formato YYYY-QX
        const periodoCompleto = `${currentPeriod.year}-${currentPeriod.quarter}`;
        const statsResponse = await obtenerEstadisticas(periodoCompleto);
        setStats(statsResponse.estadisticas);
        
      } catch (err) {
        setError('Error al cargar las estadísticas');
        // Usar datos de respaldo si falla el API
        setStats({
          totalEmpleados: 0,
          evaluacionesEsperadas: 0,
          totalEvaluaciones: 0,
          evaluacionesCompletadas: 0,
          evaluacionesEnProgreso: 0,
          evaluacionesPendientes: 0,
          lideresActivos: 0,
          departamentos: 0
        });
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchData();
    }
  }, []);

  // Skeleton loader para las tarjetas
  const StatCardSkeleton = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
        <div className="p-3 bg-gray-100 rounded-lg">
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderGestion />
        <div className="flex">
          <SidebarGestion />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Skeleton del título */}
              <div className="mb-8">
                <div className="h-10 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
              </div>
              
              {/* Skeleton de las tarjetas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderGestion />
        <div className="flex">
          <SidebarGestion />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-600 text-center">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">{error}</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-shrink-0">
        <HeaderGestion />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-shrink-0">
          <SidebarGestion />
        </div>
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {/* Título del Dashboard */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard de Evaluaciones
              </h1>
              <p className="text-gray-600 mt-2">
                Información general del {currentPeriod.label}
              </p>
            </div>

            {/* Contadores principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Empleados */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Empleados</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmpleados}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Departamentos */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Departamentos</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.departamentos}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Líderes Activos */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Líderes Activos</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.lideresActivos}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Estado de evaluaciones - Barra combinada */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Estado General de Evaluaciones</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">Completadas: {stats.evaluacionesCompletadas}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></div>
                    <span className="text-gray-600">En Progreso: {stats.evaluacionesEnProgreso}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                    <span className="text-gray-600">Pendientes: {stats.evaluacionesPendientes}</span>
                  </div>
                </div>
              </div>
              
              {/* Barra de progreso combinada */}
              {(() => {
                if (stats.totalEmpleados === 0) {
                  return (
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div className="flex h-full">
                        <div className="bg-gray-400 h-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  );
                }

                // 🔥 LÓGICA CORREGIDA: Usar evaluaciones esperadas como base para porcentajes
                if (stats.evaluacionesEsperadas === 0) {
                  return (
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div className="flex h-full">
                        <div className="bg-gray-400 h-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  );
                }

                // Calcular porcentajes basados en evaluaciones esperadas
                const porcentajeCompletadas = (stats.evaluacionesCompletadas / stats.evaluacionesEsperadas) * 100;
                const porcentajeEnProgreso = (stats.evaluacionesEnProgreso / stats.evaluacionesEsperadas) * 100;
                const porcentajePendientes = (stats.evaluacionesPendientes / stats.evaluacionesEsperadas) * 100;

                return (
                  <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden relative">
                    <div className="flex h-full">
                      <div 
                        className="bg-green-500 transition-all duration-500 flex items-center justify-center text-white font-semibold text-sm"
                        style={{ 
                          width: `${porcentajeCompletadas}%` 
                        }}
                        title={`Completadas: ${stats.evaluacionesCompletadas}/${stats.evaluacionesEsperadas}`}
                      >
                        {porcentajeCompletadas > 5 && `${Math.round(porcentajeCompletadas)}%`}
                      </div>
                      <div 
                        className="bg-yellow-600 transition-all duration-500 flex items-center justify-center text-white font-semibold text-sm"
                        style={{ 
                          width: `${porcentajeEnProgreso}%` 
                        }}
                        title={`En Progreso: ${stats.evaluacionesEnProgreso}/${stats.evaluacionesEsperadas}`}
                      >
                        {porcentajeEnProgreso > 5 && `${Math.round(porcentajeEnProgreso)}%`}
                      </div>
                      <div 
                        className="bg-red-600 transition-all duration-500 flex items-center justify-center text-white font-semibold text-sm"
                        style={{ 
                          width: `${porcentajePendientes}%` 
                        }}
                        title={`Pendientes: ${stats.evaluacionesPendientes}/${stats.evaluacionesEsperadas}`}
                      >
                        {porcentajePendientes > 5 && `${Math.round(porcentajePendientes)}%`}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Barra de búsqueda */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Búsqueda y Asignación de Evaluaciones</h2>
                <button
                  onClick={() => setBusquedaActiva(!busquedaActiva)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span>{busquedaActiva ? 'Ocultar' : 'Buscar'} Usuarios</span>
                </button>
              </div>
              
              {busquedaActiva && (
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={terminoBusqueda}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setTerminoBusqueda(valor);
                        
                        // Limpiar debounce anterior
                        if (debounceRef.current) {
                          clearTimeout(debounceRef.current);
                        }
                        
                        // Solo buscar si hay al menos 2 caracteres
                        if (valor.trim().length >= 2) {
                          // Configurar nuevo debounce
                          debounceRef.current = setTimeout(() => {
                            buscarUsuarios(valor);
                          }, 300); // Esperar 300ms después de dejar de escribir
                        } else if (valor.trim().length === 0) {
                          setResultadosBusqueda([]);
                        }
                      }}
                      placeholder="Buscar por nombre, apellido o email..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {buscando && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {resultadosBusqueda.length > 0 && (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
                      {resultadosBusqueda.map((usuario, index) => {
                        const tipoEval = determinarTipoEvaluacion(usuario);
                        const mostrarAsignar = debeMostrarBotonAsignar(usuario);
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {usuario.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {usuario.nombre} {usuario.apellido || ''}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {usuario.email}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {usuario.departamento?.nombre || 'Sin departamento'} • {usuario.cargo?.nombre || 'Sin cargo'}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              {mostrarAsignar && (
                                <button
                                  onClick={() => handleClicUsuario(usuario)}
                                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                                >
                                  <UserPlus className="h-4 w-4" />
                                  <span>Asignar</span>
                                </button>
                              )}
                              {mostrarAsignar && (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  tipoEval.periodicidad === 'anual' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {tipoEval.label}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {resultadosBusqueda.length === 0 && terminoBusqueda.length >= 2 && !buscando && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>No se encontraron usuarios</p>
                    </div>
                  )}
                </div>
              )}
              
              {!busquedaActiva && (
                <div className="text-center text-gray-500 text-sm">
                  <p>Aquí podrás buscar usuarios en específico o asignar evaluaciones</p>
                </div>
              )}
            </div>

            {/* Enlaces rápidos */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  to="/gestion/seguimiento"
                  className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Ver Seguimiento</span>
                </Link>
                <Link
                  to="/gestion/reportes"
                  className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <FileText className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Generar Reportes</span>
                </Link>
                <Link
                  to="/gestion/estadisticas"
                  className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Estadísticas Avanzadas</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Nuevo Modal de asignación de evaluación */}
      {modalAsignacionVisible && usuarioSeleccionado && (
        <ModalAsignacionEvaluacion
          usuario={usuarioSeleccionado}
          ultimaEvaluacion={ultimaEvaluacion}
          onClose={() => {
            setModalAsignacionVisible(false);
            setUsuarioSeleccionado(null);
            setUltimaEvaluacion(null);
          }}
          onAsignacionCompletada={handleAsignacionCompletada}
        />
      )}
    </div>
  );
};

export default Dashboard;
