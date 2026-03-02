import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter,
  BarChart,
  Star,
  Calendar,
  Clock,
  Eye,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import { obtenerSeguimientoPorDepartamento, obtenerDetalleEvaluacionesLider, obtenerEvaluacionesPorLider } from '../../services/gestionService';
import { obtenerEmpresas } from '../../services/empresaService';

import HeaderGestion from '../../components/gestion/Header';

import SidebarGestion from '../../components/gestion/Sidebar';

import VerEvaluacionModal from '../../components/gestion/VerEvaluacionModal';

import api from '../../utils/axiosConfig';

import { authService } from '../../services/auth';

import { useSearchParams } from 'react-router-dom';



// Función para obtener el periodo actual y generar lista de periodos

const getCurrentPeriod = () => {

  const now = new Date();

  const currentMonth = now.getMonth();

  const currentYear = now.getFullYear();

  

  // Determinar el periodo actual (0-3)

  const period = Math.floor(currentMonth / 3) + 1;

  

  return {

    period: `Q${period}`,

    year: currentYear,

    current: `${currentYear}-Q${period}`

  };

};



// Función para generar lista de periodos disponibles

const generatePeriodsList = () => {

  const periods = [];

  const currentYear = new Date().getFullYear();

  const currentMonth = new Date().getMonth();

  const currentPeriod = Math.floor(currentMonth / 3) + 1;

  

  // Generar periodos desde 2025 hasta el año actual

  for (let year = 2025; year <= currentYear; year++) {

    for (let p = 1; p <= 4; p++) {

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



const SeguimientoPage = () => {

  const [seguimiento, setSeguimiento] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [selectedLider, setSelectedLider] = useState(null);

  const [showDetalleModal, setShowDetalleModal] = useState(false);

  const [detalleEvaluaciones, setDetalleEvaluaciones] = useState(null);

  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [selectedPeriodo, setSelectedPeriodo] = useState(getCurrentPeriod().current);

  const [periodsList, setPeriodsList] = useState(() => generatePeriodsList());

  const [showEvaluacionesModal, setShowEvaluacionesModal] = useState(false);

  const [evaluacionesLider, setEvaluacionesLider] = useState(null);

  const [loadingEvaluaciones, setLoadingEvaluaciones] = useState(false);

  const [isPeriodoDropdownOpen, setIsPeriodoDropdownOpen] = useState(false);

  const [customPeriodo, setCustomPeriodo] = useState('');

  const [showCustomInput, setShowCustomInput] = useState(false);

  const [expandedLiders, setExpandedLiders] = useState(new Set());

  const [showEvaluacionModal, setShowEvaluacionModal] = useState(false);

  const [evaluacionSeleccionadaId, setEvaluacionSeleccionadaId] = useState(null);

  // Company filter states
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('todos');
  const [isEmpresaDropdownOpen, setIsEmpresaDropdownOpen] = useState(false);


  // Para el resaltado temporal del departamento

  const [searchParams] = useSearchParams();

  const [highlightedDepartment, setHighlightedDepartment] = useState(null);



  const formatCompletionDate = (dateString) => {

    if (!dateString) return '-';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return '-';

    

    // Extraer los componentes directamente en UTC para evitar conversión de zona horaria

    const year = date.getUTCFullYear().toString().slice(-2);

    const month = String(date.getUTCMonth() + 1).padStart(2, '0');

    const day = String(date.getUTCDate()).padStart(2, '0');

    

    return `${day}/${month}/${year}`;

  };



  useEffect(() => {

    // Actualizar la lista de periodos cuando se monta el componente
    setPeriodsList(generatePeriodsList());
    fetchEmpresas();
    fetchSeguimiento();

    

    // Verificar si hay un departamento para resaltar

    const deptoParam = searchParams.get('departamento');

    if (deptoParam) {

      setHighlightedDepartment(deptoParam);

      

      // Quitar el resaltado después de 3 segundos

      const timer = setTimeout(() => {

        setHighlightedDepartment(null);

      }, 3000);

      

      // Hacer scroll al departamento después de que cargue

      const scrollTimer = setTimeout(() => {

        const element = document.getElementById(`depto-${encodeURIComponent(deptoParam)}`);

        if (element) {

          // Buscar el contenedor principal con scroll

          const scrollContainer = document.querySelector('main.overflow-y-auto');

          if (scrollContainer) {

            // Calcular la posición del elemento relativa al contenedor

            const containerRect = scrollContainer.getBoundingClientRect();

            const elementRect = element.getBoundingClientRect();

            const scrollTop = scrollContainer.scrollTop;

            

            // Calcular la posición para centrar el elemento en el contenedor

            const elementTop = elementRect.top - containerRect.top + scrollTop;

            const containerHeight = scrollContainer.clientHeight;

            const elementHeight = elementRect.height;

            const scrollToPosition = elementTop - (containerHeight / 2) + (elementHeight / 2);

            

            // Hacer scroll suave dentro del contenedor

            scrollContainer.scrollTo({

              top: scrollToPosition,

              behavior: 'smooth'

            });

          } else {

            // Fallback al método original si no se encuentra el contenedor

            element.scrollIntoView({ 

              behavior: 'smooth', 

              block: 'center' 

            });

          }

        }

      }, 100);

      

      return () => {

        clearTimeout(timer);

        clearTimeout(scrollTimer);

      };

    }

  }, [selectedPeriodo, selectedEmpresa, searchParams]);



  const fetchSeguimiento = async () => {

    try {

      setLoading(true);

      const data = await obtenerSeguimientoPorDepartamento(selectedPeriodo, selectedEmpresa);
      
      // CORRECCIÓN: Usar datos directamente si vienen como array

      const datosSeguimiento = data?.seguimiento || data || [];

      setSeguimiento(datosSeguimiento);

    } catch (err) {

      setError('Error al cargar el seguimiento de evaluaciones');

      console.error('❌ FRONTEND - Error:', err);

    } finally {

      setLoading(false);

    }

  };

  const fetchEmpresas = async () => {

    try {

      const empresasData = await obtenerEmpresas();

      setEmpresas(empresasData);

    } catch (err) {

      console.error('Error al cargar empresas:', err);

    }

  };


  // Skeleton loader para la tabla de seguimiento

  const SeguimientoSkeleton = () => (

    <div className="space-y-4">

      {[1, 2, 3].map((i) => (

        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">

          <div className="flex items-center justify-between mb-4">

            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>

            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>

            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>

            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>

          </div>

        </div>

      ))}

    </div>

  );



  const handleVerDetalleLider = async (lider) => {

    try {

      setLoadingDetalle(true);

      setSelectedLider(lider);

      setShowDetalleModal(true);

      

      const data = await obtenerDetalleEvaluacionesLider(lider.usuario.id, selectedPeriodo);

      setDetalleEvaluaciones(data);

    } catch (err) {

      console.error('Error al obtener detalle del líder:', err);

      setError('Error al cargar el detalle del líder');

    } finally {

      setLoadingDetalle(false);

    }

  };



  // Optimización: caché simple para evaluaciones de líderes

  const evaluacionesCache = useMemo(() => new Map(), []);

  

  const toggleEvaluacionesLider = useCallback(async (lider) => {

    const liderId = lider.usuario.id;

    

    if (expandedLiders.has(liderId)) {

      // Colapsar

      setExpandedLiders(prev => {

        const newSet = new Set(prev);

        newSet.delete(liderId);

        return newSet;

      });

    } else {

      // Expandir - los datos ya vienen del backend, no necesitamos llamada adicional

      setExpandedLiders(prev => {

        const newSet = new Set(prev);

        newSet.add(liderId);

        return newSet;

      });

    }

  }, [expandedLiders]);



  const handleEmpresaSelect = (empresaId) => {

    setSelectedEmpresa(empresaId);

    setIsEmpresaDropdownOpen(false);

  };

  const handlePeriodoSelect = (periodo) => {

    setSelectedPeriodo(periodo);

    setIsPeriodoDropdownOpen(false);

  };


  const handleCustomPeriodoSubmit = () => {

    if (customPeriodo.trim()) {

      setSelectedPeriodo(customPeriodo.trim());

      setCustomPeriodo('');

      setShowCustomInput(false);

      setIsPeriodoDropdownOpen(false);

    }

  };



  const handleVerEvaluacion = (evaluacionId) => {

    console.log('🔄 BOTÓN VER PRESIONADO - ID:', evaluacionId);

    console.log('🔄 ABRIENDO MODAL CON ID:', evaluacionId);

    setEvaluacionSeleccionadaId(evaluacionId);

    setShowEvaluacionModal(true);

  };



  const closeEvaluacionModal = () => {

    setShowEvaluacionModal(false);

    setEvaluacionSeleccionadaId(null);

  };



  const closeModal = () => {

    setShowDetalleModal(false);

    setSelectedLider(null);

    setDetalleEvaluaciones(null);

  };



  const closeEvaluacionesModal = () => {

    setShowEvaluacionesModal(false);

    setSelectedLider(null);

    setEvaluacionesLider(null);

  };



  

  if (loading) {

    return (

      <div className="min-h-screen bg-gray-50">

        <HeaderGestion />

        <div className="flex">

          <SidebarGestion />

          <main className="flex-1 p-6">

            <div className="max-w-7xl mx-auto">

              <div className="mb-8">

                <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>

                <div className="h-5 bg-gray-200 rounded w-64 animate-pulse"></div>

              </div>

              <SeguimientoSkeleton />

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

            {/* Header con filtros */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Seguimiento de Evaluaciones</h1>
                  <p className="mt-2 text-gray-600">
                    Monitoreo del progreso de evaluaciones por departamento y líder
                  </p>
                </div>

                {/* Filtros */}
                <div className="flex items-center space-x-3">
                  {/* Selector de empresa */}
                  <div className="relative">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Empresa:</span>
                      <button
                        onClick={() => setIsEmpresaDropdownOpen(!isEmpresaDropdownOpen)}
                        className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-40"
                      >
                        <span className="truncate">
                          {selectedEmpresa === 'todos' 
                            ? 'Todas' 
                            : empresas.find(e => e.id === selectedEmpresa)?.nombre || 'Seleccionar'
                          }
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
                      </button>
                    </div>
                    
                    {isEmpresaDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                        <div className="max-h-60 overflow-y-auto">
                          <button
                            onClick={() => handleEmpresaSelect('todos')}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                              selectedEmpresa === 'todos' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                          >
                            Todas las empresas
                          </button>
                          {empresas.map((empresa) => (
                            <button
                              key={empresa.id}
                              onClick={() => handleEmpresaSelect(empresa.id)}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                                selectedEmpresa === empresa.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                              title={empresa.nombre}
                            >
                              <span className="truncate block">{empresa.nombre}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selector de periodo */}
                  <div className="relative">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Periodo:</span>
                      <button
                        onClick={() => setIsPeriodoDropdownOpen(!isPeriodoDropdownOpen)}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          
                          <div className="border-t border-gray-200 p-2">
                            <button
                              onClick={() => setShowCustomInput(!showCustomInput)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                            >
                              Personalizado...
                            </button>
                            
                            {showCustomInput && (
                              <div className="mt-2 flex space-x-2">
                                <input
                                  type="text"
                                  value={customPeriodo}
                                  onChange={(e) => setCustomPeriodo(e.target.value)}
                                  placeholder="Ej: 2024-Q3"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  onKeyPress={(e) => e.key === 'Enter' && handleCustomPeriodoSubmit()}
                                />
                                <button
                                  onClick={handleCustomPeriodoSubmit}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                                >
                                  OK
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>



            {/* Lista de Departamentos */}

            <div className="space-y-6">

              {(seguimiento || []).map((depto) => (

                <div 

                  key={depto.departamento?.id || depto.id} 

                  id={`depto-${encodeURIComponent(depto.departamento?.nombre || depto.nombre || '')}`}

                  className={`bg-white rounded-lg shadow-lg border-2 transition-all duration-500 ${

                    highlightedDepartment === (depto.departamento?.nombre || depto.nombre) 

                      ? 'border-blue-500 ring-4 ring-blue-200 shadow-blue-200' 

                      : 'border-gray-300'

                  }`}

                >

                  {/* Header del Departamento */}

                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">

                    <div className="flex items-center justify-between">

                      <div>

                        <h2 className="text-lg font-semibold text-gray-900">

                          {depto.departamento?.nombre || depto.nombre}

                        </h2>

                        <p className="text-sm text-gray-600">

                          {depto.departamento?.descripcion || depto.descripcion}

                        </p>

                      </div>

                    </div>

                  </div>



                  {/* Lista de Líderes */}

                  <div className="px-6 py-4">

                    <h3 className="text-sm font-medium text-gray-900 mb-3">Líder del Departamento</h3>

                    <div className="space-y-3">

                      {(depto.usuarios || []).filter(u => u.usuario?.rol === 'evaluador' || u.rol === 'evaluador').map((lider) => (

                        <div key={lider.usuario?.id || lider.id} className="border border-gray-200 rounded-lg">

                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg">

                            <div className="flex items-center">

                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">

                                <Users className="h-5 w-5 text-blue-600" />

                              </div>

                              <div>

                                <p className="text-sm font-medium text-gray-900">

                                  {lider.usuario?.nombre || lider.nombre} {lider.usuario?.apellido || lider.apellido}

                                </p>

                                <p className="text-xs text-gray-600">{lider.usuario?.email || lider.email}</p>

                              </div>

                            </div>

                            <div className="flex items-center space-x-3">

                              <div className="text-center">

                                <p className="text-lg font-semibold text-gray-900">{lider.totalEvaluaciones}</p>

                                <p className="text-xs text-gray-600">Total</p>

                              </div>

                              <div className="text-center">

                                <p className="text-lg font-semibold text-green-600">{lider.evaluacionesCompletadas}</p>

                                <p className="text-xs text-gray-600">Completadas</p>

                              </div>

                              <button

                                onClick={() => toggleEvaluacionesLider(lider)}

                                className="flex items-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"

                              >

                                <span>Evaluaciones</span>

                                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${

                                  expandedLiders.has(lider.usuario?.id || lider.id) ? 'rotate-180' : ''

                                }`} />

                              </button>

                            </div>

                          </div>

                          

                          {/* Evaluaciones desplegables */}

                          {expandedLiders.has(lider.usuario?.id || lider.id) && (

                            <div className="border-t border-gray-200 bg-white rounded-b-lg">

                              {loadingEvaluaciones && !lider.evaluacionesDetalle ? (

                                <div className="flex items-center justify-center py-4">

                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>

                                </div>

                              ) : lider.evaluacionesDetalle && lider.evaluacionesDetalle.length > 0 ? (

                                <div className="p-2">

                                  {/* Encabezado mejorado y uniforme */}
                                  <div className="grid grid-cols-6 gap-2 mb-2 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                                    <div className="col-span-1">
                                      <span className="text-xs font-semibold text-gray-700 flex items-center">
                                        <Users className="h-3 w-3 mr-1" />
                                        Empleado
                                      </span>
                                    </div>
                                    <div className="col-span-1 text-center">
                                      <span className="text-xs font-semibold text-gray-700 flex items-center justify-center">
                                        <BarChart className="h-3 w-3 mr-1" />
                                        Puntuación
                                      </span>
                                    </div>
                                    <div className="col-span-1 text-center">
                                      <span className="text-xs font-semibold text-gray-700 flex items-center justify-center">
                                        <Star className="h-3 w-3 mr-1" />
                                        Valoración
                                      </span>
                                    </div>
                                    <div className="col-span-1 text-center">
                                      <span className="text-xs font-semibold text-gray-700 flex items-center justify-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Periodicidad
                                      </span>
                                    </div>
                                    <div className="col-span-1 text-center">
                                      <span className="text-xs font-semibold text-gray-700 flex items-center justify-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Finalización
                                      </span>
                                    </div>
                                    <div className="col-span-1 text-center">
                                      <span className="text-xs font-semibold text-gray-700 flex items-center justify-center">
                                        <Eye className="h-3 w-3 mr-1" />
                                        Acciones
                                      </span>
                                    </div>
                                  </div>

                                  

                                  <div className="space-y-0.5">

                                    {lider.evaluacionesDetalle.map((evaluacion, index) => {

                                      return (

                                      <div key={evaluacion.id || `temp-${evaluacion.evaluado?.id}-${index}`} className="grid grid-cols-6 gap-2 py-3 px-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200">
                                        {/* Columna 1: Empleado - Limpio */}
                                        <div className="col-span-1">
                                          <div className="text-sm font-medium text-gray-900 truncate">
                                            {evaluacion.evaluado?.nombre} {evaluacion.evaluado?.apellido || ''}
                                          </div>
                                          <div className="text-xs text-gray-500 truncate">
                                            {evaluacion.evaluado?.cargo?.nombre || 'Sin cargo'}
                                          </div>
                                        </div>

                                        
                                        {/* Columna 2: Puntuación - Sin iconos */}
                                        <div className="col-span-1 text-center flex items-center justify-center">
                                          {evaluacion.estado === 'completada' && evaluacion.puntuacion ? (
                                            <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                                              {evaluacion.puntuacion}
                                            </span>
                                          ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                          )}
                                        </div>

                                        

                                        {/* Columna 3: Valoración - Sin iconos */}
                                        <div className="col-span-1 text-center flex items-center justify-center">
                                          {evaluacion.estado === 'completada' && evaluacion.valoracion ? (
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full border ${
                                              evaluacion.valoracion === 'DESTACADO' || evaluacion.valoracion === 'EXCELENTE' ? 'bg-green-100 text-green-800 border-green-200' :
                                              evaluacion.valoracion === 'BUENO' || evaluacion.valoracion === 'SOBRESALIENTE' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                              evaluacion.valoracion === 'ACEPTABLE' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                              evaluacion.valoracion === 'BAJO' || evaluacion.valoracion === 'DEFICIENTE' ? 'bg-red-100 text-red-800 border-red-200' :
                                              'bg-gray-100 text-gray-800 border-gray-200'
                                            }`}>
                                              {evaluacion.valoracion}
                                            </span>
                                          ) : evaluacion.id ? (
                                            <span className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                                              Pendiente
                                            </span>
                                          ) : (
                                            <span className="px-2 py-1 text-xs bg-gray-50 text-gray-500 rounded-full border border-gray-200">
                                              Sin evaluación
                                            </span>
                                          )}
                                        </div>

                                        

                                        {/* Columna 4: Periodicidad - Sin iconos */}
                                        <div className="col-span-1 text-center flex items-center justify-center">
                                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
                                            evaluacion.periodicidad === 'trimestral' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                          }`}>
                                            {evaluacion.periodicidad}
                                          </span>
                                        </div>

                                        

                                        {/* Columna 5: Finalización - Sin iconos */}
                                        <div className="col-span-1 text-center flex items-center justify-center">
                                          {evaluacion.estado === 'completada' ? (
                                            <div className="text-xs text-gray-600">
                                              {formatCompletionDate(evaluacion.fechaFin || evaluacion.fecha_fin)}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                          )}
                                        </div>

                                        

                                        {/* Columna 6: Acciones - Texto seleccionable estético */}
                                        <div className="col-span-1 text-center flex items-center justify-center">
                                          {evaluacion.estado === 'completada' ? (
                                            <span
                                              onClick={() => {
                                                console.log('🔄 TEXTO VER CLIC - ID EVALUACIÓN:', evaluacion.id);
                                                handleVerEvaluacion(evaluacion.id);
                                              }}
                                              className="text-blue-600 hover:text-blue-800 text-xs font-medium cursor-pointer transition-colors underline decoration-dotted decoration-blue-300 hover:decoration-blue-500"
                                              title="Ver detalles de la evaluación"
                                            >
                                              Ver evaluación
                                            </span>
                                          ) : evaluacion.estado === 'en_progreso' ? (
                                            <div className="flex flex-col items-center">
                                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded border border-orange-200 mb-1">
                                                En progreso
                                              </span>
                                              <span
                                                onClick={() => {
                                                  console.log('🔄 TEXTO VER PROGRESO - ID EVALUACIÓN:', evaluacion.id);
                                                  handleVerEvaluacion(evaluacion.id);
                                                }}
                                                className="text-orange-600 hover:text-orange-800 text-xs font-medium cursor-pointer transition-colors underline decoration-dotted decoration-orange-300 hover:decoration-orange-500"
                                                title="Ver progreso de la evaluación"
                                              >
                                                Ver progreso
                                              </span>
                                            </div>
                                          ) : evaluacion.id ? (
                                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded border border-yellow-200">
                                              Iniciada
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded border border-gray-200">
                                              No iniciada
                                            </span>
                                          )}
                                        </div>

                                      </div>

                                    );

                                    })}

                                  </div>

                                </div>

                              ) : (

                                <div className="p-4">

                                  <div className="text-center text-gray-500">

                                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />

                                    <p className="text-sm">

                                      {lider.totalEvaluaciones === 0 

                                        ? "No hay empleados asignados a este líder"

                                        : "No hay evaluaciones programadas para este periodo"

                                      }

                                    </p>

                                  </div>

                                </div>

                              )}

                            </div>

                          )}

                        </div>

                      ))}

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </main>

      </div>



      {/* Modal de Evaluación Unificado */}

      <VerEvaluacionModal

        visible={showEvaluacionModal}

        onClose={closeEvaluacionModal}

        evaluacionId={evaluacionSeleccionadaId}

      />-

    </div>

  );

};



export default SeguimientoPage;

