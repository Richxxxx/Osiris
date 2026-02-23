import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  FileText,
  BarChart3,
  ArrowLeft,
  Calendar,
  ChevronDown,
  Search
} from 'lucide-react';
import { obtenerEstadisticas, obtenerEstadisticasPorDepartamento, invalidateCache } from '../../services/gestionService';
import HeaderGestion from '../../components/gestion/Header';
import SidebarGestion from '../../components/gestion/Sidebar';
import DepartmentChart from '../../components/gestion/DepartmentChart';
import { authService } from '../../services/auth';

// Función para generar lista de periodos disponibles (desde Q4-2025)
const generatePeriodsList = () => {
  const periods = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentPeriod = Math.floor(currentMonth / 3) + 1;
  
  // Generar periodos desde Q4-2025 hasta el año actual
  for (let year = 2025; year <= currentYear; year++) {
    const startPeriod = (year === 2025) ? 4 : 1; // Empezar desde Q4 en 2025
    for (let p = startPeriod; p <= 4; p++) {
      // Si es el año actual, solo mostrar periodos hasta el actual
      if (year === currentYear && p > currentPeriod) break;
      
      periods.push({
        value: `${year}-Q${p}`,
        label: `Q${p} - ${year}`,
        isCurrent: year === currentYear && p === currentPeriod
      });
    }
  }
  
  return periods.reverse(); // Más recientes primero
};

const EstadisticasPage = () => {
  const [user, setUser] = useState(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [periodsList, setPeriodsList] = useState([]);
  const [isPeriodoDropdownOpen, setIsPeriodoDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🔥 SIMPLIFICADO: Solo filtro de valoración
  const [ordenDireccion, setOrdenDireccion] = useState('desc');
  const [isOrdenDireccionDropdownOpen, setIsOrdenDireccionDropdownOpen] = useState(false);
  
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    totalEvaluaciones: 0,
    evaluacionesCompletadas: 0,
    evaluacionesPendientes: 0,
    evaluacionesEnProgreso: 0,
    lideresActivos: 0,
    departamentos: 0
  });
  const [departmentData, setDepartmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔥 SIMPLIFICADO: Solo opciones de dirección para valoración
  const opcionesDireccion = [
    { value: 'desc', label: 'Alta - Baja' },
    { value: 'asc', label: 'Baja - Alta' }
  ];

  // Obtener el periodo actual
  const getCurrentPeriod = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentPeriod = Math.floor(currentMonth / 3) + 1;
    return `${currentYear}-Q${currentPeriod}`;
  };

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);

    // Actualizar la lista de periodos cuando se monta el componente
    setPeriodsList(generatePeriodsList());
    
    // Establecer el periodo actual por defecto
    if (!selectedPeriodo) {
      setSelectedPeriodo(getCurrentPeriod());
    }

    if (currentUser && selectedPeriodo) {
      fetchEstadisticas();
    }
  }, [selectedPeriodo, ordenDireccion]); // 🔥 SIMPLIFICADO: Solo dependencia de dirección

  // 🔥 Invalidar caché cada 2 minutos para mantener datos frescos (menos invasivo)
  useEffect(() => {
    const interval = setInterval(() => {
      invalidateCache('estadisticas');
    }, 2 * 60 * 1000); // 2 minutos

    return () => clearInterval(interval);
  }, []);

  const fetchEstadisticas = async () => {
    try {
      setLoading(true);
      
      // 🔥 SIMPLIFICADO: Solo parámetros de valoración
      const params = {
        trimestre: selectedPeriodo,
        ordenarPor: 'valoracion',
        ordenDireccion: ordenDireccion
      };
      
      const [statsResponse, deptResponse] = await Promise.all([
        obtenerEstadisticas(selectedPeriodo),
        obtenerEstadisticasPorDepartamento(params)
      ]);
      
      setStats(statsResponse.estadisticas);
      setDepartmentData(deptResponse);
      
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      toast.error('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Escuchar eventos de actualización (menos invasivo)
  useEffect(() => {
    const handleEvaluationUpdate = () => {
      invalidateCache('estadisticas');
      fetchEstadisticas(); // Refrescar inmediatamente
    };

    window.addEventListener('evaluation:updated', handleEvaluationUpdate);
    return () => window.removeEventListener('evaluation:updated', handleEvaluationUpdate);
  }, [fetchEstadisticas]);

  // Filtrar departamentos por búsqueda
  const filteredDepartmentData = departmentData.filter(dept =>
    dept.departamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePeriodoSelect = (periodo) => {
    setSelectedPeriodo(periodo);
    setIsPeriodoDropdownOpen(false);
  };

  // 🔥 SIMPLIFICADO: Handler para dirección de valoración
  const handleOrdenDireccionSelect = (direccion) => {
    setOrdenDireccion(direccion);
    setIsOrdenDireccionDropdownOpen(false);
  };

  // Skeleton loader para estadísticas
  const EstadisticasSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
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
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-5 bg-gray-200 rounded w-64 animate-pulse"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
              <EstadisticasSkeleton />
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
            {/* Selector de periodo y filtro de valoración */}
            <div className="mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Estadísticas Generales
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Resumen de evaluaciones por departamento
                  </p>
                </div>
                
                {/* 🔥 SIMPLIFICADO: Filtros y búsqueda - Valoración a la izquierda */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  {/* Filtro de valoración - MOVIDO A LA IZQUIERDA */}
                  <div className="relative">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600">Val:</span>
                      <button
                        onClick={() => setIsOrdenDireccionDropdownOpen(!isOrdenDireccionDropdownOpen)}
                        className="flex items-center px-2 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                      >
                        {opcionesDireccion.find(o => o.value === ordenDireccion)?.label || 'Ordenar'}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                    
                    {isOrdenDireccionDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        <div className="max-h-48 overflow-y-auto">
                          {opcionesDireccion.map((opcion) => (
                            <button
                              key={opcion.value}
                              onClick={() => handleOrdenDireccionSelect(opcion.value)}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm ${
                                opcion.value === ordenDireccion ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                            >
                              {opcion.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Barra de búsqueda */}
                  <div className="relative">
                    <div className="flex items-center">
                      <Search className="absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar depto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm w-full sm:w-40"
                      />
                    </div>
                  </div>

                  {/* Selector de periodo (existente) */}
                  <div className="relative">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <span className="text-xs sm:text-sm text-gray-600">Per:</span>
                      <button
                        onClick={() => setIsPeriodoDropdownOpen(!isPeriodoDropdownOpen)}
                        className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                      >
                        {periodsList.find(p => p.value === selectedPeriodo)?.label || selectedPeriodo}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </button>
                    </div>
                    
                    {isPeriodoDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        <div className="max-h-60 overflow-y-auto">
                          {periodsList.map((period) => (
                            <button
                              key={period.value}
                              onClick={() => handlePeriodoSelect(period.value)}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between ${
                                period.value === selectedPeriodo ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                            >
                              <span>{period.label}</span>
                              {period.isCurrent && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Actual</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Gráficas por departamento - Máximo 2 por fila */}
            <div className="mb-8">
              {filteredDepartmentData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Search className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron departamentos
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm 
                      ? `No hay resultados para "${searchTerm}"`
                      : 'No hay departamentos disponibles para este periodo'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                  {filteredDepartmentData.map((dept, index) => (
                    <DepartmentChart 
                      key={index} 
                      department={dept.departamento} 
                      stats={dept.estadisticas} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EstadisticasPage;
