import React from 'react';
import { Link } from 'react-router-dom';
import { Users, TrendingUp } from 'lucide-react';
import ValoracionChart from './ValoracionChart';

const DepartmentChart = ({ department, stats }) => {
  const completionPercentage = stats.totalEmpleados > 0 
    ? Math.round((stats.evaluacionesCompletadas / stats.totalEmpleados) * 100) 
    : 0;

  // Datos para la gráfica de columnas - usar el total de empleados como referencia máxima
  const maxValue = Math.max(stats.totalEmpleados, 1);

  return (
    <div className="bg-white rounded-lg border-2 border-gray-300 shadow-lg hover:shadow-xl transition-shadow duration-300 p-4 sm:p-6">
      {/* Nombre del departamento */}
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{department}</h3>
        <Link
          to={`/gestion/seguimiento?departamento=${encodeURIComponent(department)}`}
          className="p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          title={`Ver seguimiento de ${department}`}
        >
          <Users className="h-5 w-5 text-blue-600" />
        </Link>
      </div>

      {/* Gráfica de estados */}
      <div className="mb-3 sm:mb-6">
        <div className="flex items-end justify-between h-20 px-1">
          {/* Columna Completadas */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs text-gray-600 mb-0.5">{stats.evaluacionesCompletadas}</span>
            <div 
              className="w-6 bg-green-500 rounded-t transition-all duration-500"
              style={{ height: `${Math.max((stats.evaluacionesCompletadas / maxValue) * 100, 6)}px` }}
            ></div>
          </div>
          
          {/* Columna En Progreso */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs text-gray-600 mb-0.5">{stats.evaluacionesEnProgreso}</span>
            <div 
              className="w-6 bg-yellow-500 rounded-t transition-all duration-500"
              style={{ height: `${Math.max((stats.evaluacionesEnProgreso / maxValue) * 100, 6)}px` }}
            ></div>
          </div>
          
          {/* Columna Asignadas */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs text-gray-600 mb-0.5">{stats.evaluacionesAsignadas || 0}</span>
            <div 
              className="w-6 bg-blue-500 rounded-t transition-all duration-500"
              style={{ height: `${Math.max(((stats.evaluacionesAsignadas || 0) / maxValue) * 100, 6)}px` }}
            ></div>
          </div>
          
          {/* Columna Pendientes */}
          <div className="flex flex-col items-center flex-1">
            <span className="text-xs text-gray-600 mb-0.5">{stats.evaluacionesPendientes}</span>
            <div 
              className="w-6 bg-red-500 rounded-t transition-all duration-500"
              style={{ height: `${Math.max((stats.evaluacionesPendientes / maxValue) * 100, 6)}px` }}
            ></div>
          </div>
        </div>
        
        {/* Línea base más delgada */}
        <div className="h-0.5 bg-gray-400 mx-1"></div>
        
        {/* Leyenda */}
        <div className="flex justify-center space-x-2 mt-0.5">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded mr-0.5"></div>
            <span className="text-xs text-gray-600">Comp</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded mr-0.5"></div>
            <span className="text-xs text-gray-600">Prog</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded mr-0.5"></div>
            <span className="text-xs text-gray-600">Asig</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded mr-0.5"></div>
            <span className="text-xs text-gray-600">Pend</span>
          </div>
        </div>
        
        {/* Título debajo de la gráfica */}
        <div className="text-center mt-1 sm:mt-2">
          <div className="text-xs sm:text-sm text-gray-700 font-medium">
            Estado de Evaluaciones
          </div>
        </div>
      </div>

      {/* Gráfica de valoración - Separada por tipo - Layout Responsive */}
      {(stats.valoracion_anual || stats.valoracion_trimestral) && (
        <div className="mb-2 sm:mb-4">
          {stats.valoracion_anual && stats.valoracion_trimestral ? (
            // Dos gráficas: una al lado de la otra
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 lg:gap-4">
              <div>
                <ValoracionChart 
                  valoracion={stats.valoracion_anual} 
                  tipoEvaluacion="anual"
                  stats={stats}
                />
              </div>
              <div>
                <ValoracionChart 
                  valoracion={stats.valoracion_trimestral} 
                  tipoEvaluacion="trimestral"
                  stats={stats}
                />
              </div>
            </div>
          ) : (
            // Solo una gráfica: centrada
            <div className="max-w-md mx-auto">
              {stats.valoracion_anual && (
                <ValoracionChart 
                  valoracion={stats.valoracion_anual} 
                  tipoEvaluacion="anual"
                  stats={stats}
                />
              )}
              {stats.valoracion_trimestral && (
                <ValoracionChart 
                  valoracion={stats.valoracion_trimestral} 
                  tipoEvaluacion="trimestral"
                  stats={stats}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Barra de progreso de completitud */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Completitud de evaluaciones</span>
          <span className="text-sm font-medium text-gray-900">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentChart;
