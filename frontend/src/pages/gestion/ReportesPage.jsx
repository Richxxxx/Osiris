import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { obtenerValoracionTrimestralPorDepartamento } from '../../services/gestionService';
import HeaderGestion from '../../components/gestion/Header';
import SidebarGestion from '../../components/gestion/Sidebar';
import { BarChartOutlined } from '@ant-design/icons';

// Colores para las valoraciones trimestrales
const VALORACION_COLORS = {
  'DESTACADO': '#10B981',  // verde
  'BUENO': '#3B82F6',      // azul
  'BAJO': '#F59E0B',        // amarillo
  'SIN DATOS': '#9CA3AF'    // gris 
};

// Función para obtener el trimestre actual
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

const ReportesPage = () => {
  const [valoracionData, setValoracionData] = useState({
    periodo: '',
    anio: '',
    departamentos: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    trimestre: getCurrentPeriod().quarter,
    anio: getCurrentPeriod().year
  });

  // Generar opciones de años (actual y 2 años anteriores)
  const getCurrentYear = () => new Date().getFullYear();
  const availableYears = [
    { value: getCurrentYear(), label: getCurrentYear() },
    { value: getCurrentYear() - 1, label: getCurrentYear() - 1 },
    { value: getCurrentYear() - 2, label: getCurrentYear() - 2 }
  ];

  const availableQuarters = [
    { value: 'Q1', label: 'Q1 - Primer Trimestre' },
    { value: 'Q2', label: 'Q2 - Segundo Trimestre' },
    { value: 'Q3', label: 'Q3 - Tercer Trimestre' },
    { value: 'Q4', label: 'Q4 - Cuarto Trimestre' }
  ];

  useEffect(() => {
    cargarValoracionTrimestral();
  }, [filtros]);

  const cargarValoracionTrimestral = async () => {
    try {
      setLoading(true);
      const data = await obtenerValoracionTrimestralPorDepartamento(filtros);
      
      // 🔍 DEPURACIÓN: Ver qué está llegando del backend
      console.log('📊 Datos recibidos del backend:', data);
      console.log('📊 Estructura de data:', JSON.stringify(data, null, 2));
      
      setValoracionData(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los datos de valoración trimestral');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (key, value) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Preparar datos para la gráfica - USAR DATOS REALES DEL BACKEND
  const datosGrafica = valoracionData.departamentos ? 
    valoracionData.departamentos
      .map(depto => {
        // Asegurar que el promedio sea un número válido
        let promedio = depto.promedioPuntuacion;
        
        // Si el backend envía null pero hay evaluaciones, debería mostrar 0 temporalmente
        // hasta que el backend calcule correctamente
        if (promedio === null || promedio === undefined) {
          promedio = depto.totalEvaluaciones > 0 ? 0 : 0;
        }
        
        return {
          departamento: depto.departamento,
          promedioPuntuacion: parseFloat(promedio) || 0, // Asegurar número
          valoracionTrimestral: depto.valoracionTrimestral,
          totalEvaluaciones: depto.totalEvaluaciones,
          // Color según valoración
          color: VALORACION_COLORS[depto.valoracionTrimestral] || '#9CA3AF'
        };
      }) : [];

  // 🔍 DEPURACIÓN: Ver datos del backend y gráfica
  console.log('📊 Datos del backend:', valoracionData.departamentos);
  console.log('📊 Datos para gráfica (solo backend):', datosGrafica);
  console.log('📊 Verificación de datos reales:', datosGrafica.map(d => ({
    depto: d.departamento,
    promedioBackend: d.promedioPuntuacion,
    nivel: d.valoracionTrimestral,
    evaluaciones: d.totalEvaluaciones,
    esDatoReal: d.promedioPuntuacion !== null && d.promedioPuntuacion !== undefined
  })));

  const ReportesSkeleton = () => (
    <div className="flex flex-col">
      {/* Skeleton del encabezado */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-5 bg-gray-200 rounded w-96 mb-4 animate-pulse"></div>
      </div>

      {/* Skeleton de filtros */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Skeleton de la gráfica */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );

  if (loading) {
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
              <div className="max-w-7xl mx-auto">
                <ReportesSkeleton />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
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
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-red-600 text-center">
                  <BarChartOutlined className="text-4xl mb-4" style={{ fontSize: '4rem' }} />
                  <p className="text-lg font-medium">{error}</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Custom tooltip para la gráfica
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-bold text-gray-900 mb-2 text-lg">{data.departamento}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Promedio: <span className="font-bold text-blue-600">{data.promedioPuntuacion.toFixed(2)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Valoración: <span className="font-bold px-2 py-1 rounded" style={{ 
                backgroundColor: data.color + '20', 
                color: data.color 
              }}>{data.valoracionTrimestral}</span>
            </p>
            <p className="text-sm text-gray-500">
              Evaluaciones: <span className="font-medium">{data.totalEvaluaciones}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

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
            {/* Encabezado profesional */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 mr-4 shadow-lg">
                  <BarChartOutlined className="text-2xl text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Reportes de Evaluaciones</h1>
                  <p className="mt-2 text-gray-600 text-lg">
                    Análisis comparativo de la valoración trimestral por departamento
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Visualiza cómo van las evaluaciones de cada departamento en el período seleccionado
                  </p>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01.293.707l6.414 6.414a1 1 0 01.707.293l6.414-6.414a1 1 0 01.293-.707V5a1 1 0 01-1-1z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1l4 4" />
                </svg>
                Filtros de Período
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trimestre (Q)
                  </label>
                  <select
                    value={filtros.trimestre}
                    onChange={(e) => handleFiltroChange('trimestre', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableQuarters.map(quarter => (
                      <option key={quarter.value} value={quarter.value}>
                        {quarter.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año
                  </label>
                  <select
                    value={filtros.anio}
                    onChange={(e) => handleFiltroChange('anio', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {availableYears.map(year => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Gráfica principal */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Valoración Trimestral por Departamento
                </h3>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-4">Período: <strong>{valoracionData.periodo} - {valoracionData.anio}</strong></span>
                  <span>Total departamentos: <strong>{datosGrafica.length}</strong></span>
                </div>
              </div>
              
              {datosGrafica.length > 0 ? (
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart 
                    data={datosGrafica}
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="departamento" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 11, fontWeight: 500 }}
                      interval={0}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      label={{ 
                        value: 'Promedio de Puntuación', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fontSize: 14, fontWeight: 600 }
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="promedioPuntuacion" 
                      fill="#3B82F6"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                    >  
                      {datosGrafica.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002 2v10m-6 0a2 2 0 002 2h2a2 2 0 002 2V3a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
                  <p className="text-sm text-gray-500">
                    No se encontraron datos de departamentos para el período {valoracionData.periodo} - {valoracionData.anio}.
                  </p>
                  <p className="text-xs text-gray-400">
                    Por favor, verifica que existan departamentos configurados y evaluaciones registradas.
                  </p>
                </div>
              )}
            </div>

            {/* Leyenda de valoraciones */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leyenda de Valoraciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(VALORACION_COLORS).map(([valoracion, color]) => (
                  <div key={valoracion} className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-3" 
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="text-sm text-gray-700">{valoracion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportesPage;
