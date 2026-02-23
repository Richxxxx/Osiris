import React from 'react';

const ValoracionChart = ({ valoracion, tipoEvaluacion = 'combinada', stats }) => {
  // Configuración de colores para cada nivel de valoración - ANUALES
  const valoracionAnualConfig = {
    EXCELENTE: { color: '#8b5cf6', label: 'Excelente' },
    SOBRESALIENTE: { color: '#3b82f6', label: 'Sobresaliente' },
    BUENO: { color: '#10b981', label: 'Bueno' },
    ACEPTABLE: { color: '#f59e0b', label: 'Aceptable' },
    DEFICIENTE: { color: '#ef4444', label: 'Deficiente' }
  };

  // Configuración de colores para cada nivel de valoración - TRIMESTRALES
  const valoracionTrimestralConfig = {
    DESTACADO: { color: '#8b5cf6', label: 'Destacado' },
    BUENO: { color: '#10b981', label: 'Bueno' },
    BAJO: { color: '#ef4444', label: 'Bajo' }
  };

  // Seleccionar la configuración correcta según el tipo
  const valoracionConfig = tipoEvaluacion === 'trimestral' ? valoracionTrimestralConfig : valoracionAnualConfig;

  const totalValoraciones = Object.values(valoracion).reduce((sum, count) => sum + count, 0);

  // Calcular porcentajes
  const calcularPorcentajes = () => {
    if (totalValoraciones === 0) return {};
    
    return Object.entries(valoracion).reduce((acc, [nivel, count]) => {
      if (count > 0) {
        acc[nivel] = ((count / totalValoraciones) * 100).toFixed(1);
      }
      return acc;
    }, {});
  };

  const porcentajes = calcularPorcentajes();

  // Datos para la gráfica de torta - MOSTRAR TODAS LAS OPCIONES
  const datosTorta = Object.entries(valoracionConfig) // 🔥 CAMBIADO: Usar config en lugar de datos
    .map(([nivel, config]) => ({
      nivel,
      count: valoracion[nivel] || 0, // 🔥 CAMBIADO: Usar datos reales, 0 si no existe
      porcentaje: totalValoraciones > 0 ? ((valoracion[nivel] || 0) / totalValoraciones * 100).toFixed(1) : '0.0',
      color: config.color,
      label: config.label
    }))
    .filter(item => item.count > 0); // 🔥 MANTENER: Solo mostrar en gráfica los que tienen datos

  // Crear estilos CSS para la gráfica de torta
  const crearEstiloTorta = (index, total) => {
    if (!datosTorta[index]) return null;
    
    // Caso especial: si solo hay un segmento, crear un círculo completo
    if (datosTorta.length === 1) {
      return {
        d: `M 50 50 m -40 0 a 40 40 0 1 1 80 0 a 40 40 0 1 1 -80 0`,
        transform: `rotate(0 50 50)`
      };
    }
    
    const porcentaje = (parseFloat(datosTorta[index].porcentaje) / 100) * 360;
    const inicio = index === 0 ? 0 : datosTorta.slice(0, index).reduce((sum, item) => sum + (parseFloat(item.porcentaje) / 100) * 360, 0);
    const fin = inicio + porcentaje;
    
    const startAngle = inicio - 90; // Ajustar para que empiece desde arriba
    const endAngle = fin - 90;
    
    const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
    const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
    const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
    const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
    
    const largeArcFlag = porcentaje > 180 ? 1 : 0;
    
    return {
      d: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      transform: `rotate(0 50 50)`
    };
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-300 shadow-md hover:shadow-lg transition-shadow duration-300 p-3 sm:p-6">
      {/* Título con tipo de evaluación - Cortos y centrados */}
      <div className="mb-2 sm:mb-4 text-center">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          {tipoEvaluacion === 'anual' ? 'Anuales' : 
           tipoEvaluacion === 'trimestral' ? 'Trimestrales' : 
           'Distribución de Valoración'}
        </h3>
        {tipoEvaluacion === 'combinada' && (
          <p className="text-sm text-gray-600 mt-1">
            Incluye evaluaciones anuales y trimestrales
          </p>
        )}
      </div>

      {/* Gráfica de torta - Responsive mejorado */}
      <div className="mb-2 sm:mb-4">
        {/* Mobile: Gráfica arriba, leyenda abajo */}
        <div className="lg:hidden">
          {/* Gráfica centrada */}
          <div className="flex justify-center mb-0.5 sm:mb-1">
            <div className="relative">
              <svg width="80" height="80" viewBox="0 0 100 100" className="drop-shadow-lg">
                {datosTorta.map((dato, index) => {
                  const estilo = crearEstiloTorta(index, datosTorta.length);
                  if (!estilo) return null;
                  
                  return (
                    <path
                      key={dato.nivel}
                      d={estilo.d}
                      fill={dato.color}
                      stroke="white"
                      strokeWidth="2"
                      className="transition-all duration-300 hover:opacity-80 hover:scale-105 cursor-pointer"
                      title={`${dato.label}: ${dato.porcentaje}%`}
                    />
                  );
                })}
                {totalValoraciones === 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="#f3f4f6"
                    stroke="#d1d5db"
                    strokeWidth="2"
                  />
                )}
              </svg>
            </div>
          </div>
          
          {/* Leyenda responsive - Mobile */}
          <div className="mt-1 space-y-0.5 max-w-full mx-auto">
            {Object.entries(valoracionConfig).map(([nivel, config]) => {
              const count = valoracion[nivel] || 0;
              const porcentaje = totalValoraciones > 0 ? ((count / totalValoraciones) * 100).toFixed(1) : '0.0';
              return (
                <div key={nivel} className="flex items-center space-x-0.5">
                  <div 
                    className="w-2 h-2 rounded-sm border border-gray-300 flex-shrink-0" 
                    style={{ backgroundColor: config.color }}
                  ></div>
                  <span className="text-xs text-gray-700 font-medium leading-tight">
                    {config.label.length > 10 ? 
                      <span className="text-[10px]">{config.label} ({porcentaje}%)</span> : 
                      <span>{config.label} ({porcentaje}%)</span>
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop: Gráfica al lado, leyenda al lado */}
        <div className="hidden lg:flex items-center justify-center gap-1 sm:gap-3">
          {/* Gráfica */}
          <div className="relative">
            <svg width="90" height="90" viewBox="0 0 100 100" className="drop-shadow-lg">
              {datosTorta.map((dato, index) => {
                const estilo = crearEstiloTorta(index, datosTorta.length);
                if (!estilo) return null;
                
                return (
                  <path
                    key={dato.nivel}
                    d={estilo.d}
                    fill={dato.color}
                    stroke="white"
                    strokeWidth="2"
                    className="transition-all duration-300 hover:opacity-80 hover:scale-105 cursor-pointer"
                    title={`${dato.label}: ${dato.porcentaje}%`}
                  />
                );
              })}
              {totalValoraciones === 0 && (
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="#f3f4f6"
                  stroke="#d1d5db"
                  strokeWidth="2"
                />
              )}
            </svg>
          </div>
          
          {/* Leyenda - Desktop */}
          <div className="flex-shrink-0 grid grid-cols-1 gap-0.25">
            {Object.entries(valoracionConfig).map(([nivel, config]) => {
              const count = valoracion[nivel] || 0;
              const porcentaje = totalValoraciones > 0 ? ((count / totalValoraciones) * 100).toFixed(1) : '0.0';
              return (
                <div key={nivel} className="flex items-center space-x-0.5">
                  <div 
                    className="w-2 h-2 rounded-sm border border-gray-300 flex-shrink-0" 
                    style={{ backgroundColor: config.color }}
                  ></div>
                  <span className="text-xs text-gray-700 font-medium leading-tight">
                    {config.label.length > 10 ? 
                      <span className="text-[10px]">{config.label} ({porcentaje}%)</span> : 
                      <span>{config.label} ({porcentaje}%)</span>
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Número de completadas con tipo - Mejorado */}
      <div className="text-center mt-1 sm:mt-2">
        <div className="text-sm text-gray-600 font-medium">
          {totalValoraciones > 0 ? (
            <>
              {totalValoraciones} {totalValoraciones === 1 ? 'evaluación' : 'evaluaciones'} 
              {tipoEvaluacion === 'anual' ? ' anuales' : 
               tipoEvaluacion === 'trimestral' ? ' trimestrales' : 
               ' completadas'}
            </>
          ) : (
            <span className="text-gray-400 italic">
              {tipoEvaluacion === 'anual' ? 'Sin evaluaciones anuales' : 
               tipoEvaluacion === 'trimestral' ? 'Sin evaluaciones trimestrales' : 
               'Sin evaluaciones completadas'}
            </span>
          )}
        </div>
      </div>

      {/* Estadísticas adicionales */}
      {totalValoraciones > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="text-sm flex items-center justify-between">
            <div className="text-gray-600">
              Promedio<br />de calidad:
            </div>
            <div className="font-medium text-gray-900">
              {(() => {
                // 🔥 NUEVO: Usar promedios reales del backend
                if (tipoEvaluacion === 'anual' && stats.promedioAnual !== undefined) {
                  return stats.promedioAnual.toFixed(1);
                } else if (tipoEvaluacion === 'trimestral' && stats.promedioTrimestral !== undefined) {
                  return stats.promedioTrimestral.toFixed(1);
                } else {
                  // Mantener lógica de ponderación como fallback
                  const ponderacionAnual = {
                    EXCELENTE: 5,
                    SOBRESALIENTE: 4,
                    BUENO: 3,
                    ACEPTABLE: 2,
                    DEFICIENTE: 1
                  };

                  const ponderacionTrimestral = {
                    DESTACADO: 5,
                    BUENO: 3,
                    BAJO: 1
                  };

                  const ponderacion = tipoEvaluacion === 'trimestral' ? ponderacionTrimestral : ponderacionAnual;

                  const totalPonderado = Object.entries(valoracion).reduce(
                    (sum, [nivel, count]) => sum + (ponderacion[nivel] * count), 0
                  );
                  const promedio = (totalPonderado / totalValoraciones).toFixed(1);

                  const nivelPromedio = Object.entries(ponderacion).find(
                    ([, valor]) => valor === Math.round(promedio)
                  )?.[0] || (tipoEvaluacion === 'trimestral' ? 'BUENO' : 'ACEPTABLE');

                  return `${promedio} (${valoracionConfig[nivelPromedio].label})`;
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValoracionChart;
