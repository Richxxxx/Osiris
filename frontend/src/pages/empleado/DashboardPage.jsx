import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  TrophyOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  PlayCircleOutlined,
  FileTextOutlined,
  EyeOutlined,
  CalendarOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  PieChartOutlined,
  StarOutlined
} from "@ant-design/icons";
import { authService } from "../../services/auth";
import axios from "../../utils/axiosConfig";
import { toast } from "react-toastify";

const getCurrentQuarterAndYear = (date = new Date()) => {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return { periodo: `Q${quarter}`, anio: date.getFullYear() };
};

const EmpleadoDashboard = () => {
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState(null);
  const [progresoDetallado, setProgresoDetallado] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadEvaluationData = useCallback(async () => {
    const user = authService.getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { periodo, anio } = getCurrentQuarterAndYear();

    try {
      // Cargar evaluaciones generales y progreso detallado en paralelo
      const [evaluacionesResponse, progresoResponse] = await Promise.all([
        axios.get("/empleado/mis-evaluaciones", {
          headers: {
            "Authorization": `Bearer ${user.token}`,
            "Content-Type": "application/json"
          }
        }),
        axios.get(`/empleado/progreso-evaluacion-actual?periodo=${encodeURIComponent(periodo)}&anio=${encodeURIComponent(anio)}`, {
          headers: {
            "Authorization": `Bearer ${user.token}`,
            "Content-Type": "application/json"
          }
        })
      ]);

      // Procesar evaluaciones generales
      if (evaluacionesResponse.data && evaluacionesResponse.data.status === "success") {
        const evaluaciones = evaluacionesResponse.data.data.evaluaciones || [];
        
        if (evaluaciones.length > 0) {
          const evalActual = evaluaciones.find(e => e.periodo === periodo && e.anio === anio) ||
            evaluaciones.find(e => e.estado === "en_progreso") ||
            evaluaciones[0];
          const progress = evalActual.progreso || 0;

          setEvaluation({
            id: evalActual.id,
            title: `Evaluacion de Desempeno ${evalActual.periodo || ""}`,
            status: evalActual.estado === "completada" ? "completed" : 
                   evalActual.estado === "en_progreso" ? "in_progress" : "not_started",
            progress: progress,
            dueDate: evalActual.fechaFin || evalActual.fechaLimite || new Date().toISOString().split('T')[0],
            evaluator: evalActual.evaluador?.nombre || "Evaluador asignado",
            totalQuestions: evalActual.totalPreguntas || 0,
            answeredQuestions: evalActual.contestadas || 0,
            puntuacionTotal: evalActual.puntuacionTotal,
            valoracion: evalActual.valoracion
          });
        }
      }

      // Procesar progreso detallado
      if (progresoResponse.data && progresoResponse.data.status === "success") {
        setProgresoDetallado(progresoResponse.data.data.evaluacion);
      }
    } catch (error) {
      console.error("Error al cargar evaluacion:", error);
      toast.error("Error al cargar la evaluacion");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvaluationData();
  }, [loadEvaluationData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tu informacion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      {/* Header principal */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <DashboardOutlined className="mr-3 text-blue-600" />
          Mi Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Aquí puedes ver el progreso de tu evaluación de desempeño.</p>
      </div>

      {/* Progreso Detallado de Evaluación Actual */}
      {progresoDetallado ? (
        <>
          {/* Tarjeta principal de evaluación */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl px-6 py-6 mb-8 shadow-xl overflow-hidden">
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
              <svg className="h-32 w-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
            </div>
            
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center mb-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mr-4">
                    <DashboardOutlined className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {progresoDetallado.titulo}
                    </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Estado</div>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        progresoDetallado.estado === 'completada' ? 'bg-green-100 text-green-800' :
                        progresoDetallado.estado === 'en_progreso' ? 'bg-blue-100 text-blue-800' :
                        progresoDetallado.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {progresoDetallado.estado === 'completada' ? '✅ Completada' :
                        progresoDetallado.estado === 'en_progreso' ? '⚡ En progreso' :
                        progresoDetallado.estado ? progresoDetallado.estado.charAt(0).toUpperCase() + progresoDetallado.estado.slice(1).toLowerCase() : '⏳ Pendiente'}
                      </span>
                    </div>
                    
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Periodicidad</div>
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          progresoDetallado.tipo === 'trimestral' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {progresoDetallado.tipo === 'trimestral' ? '📊 Trimestral' : '🎯 Anual'}
                        </span>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Evaluador</div>
                        <div className="text-sm font-medium text-gray-900">
                          {progresoDetallado.evaluador?.nombre || 'No asignado'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          {/* Barra de progreso con información */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progreso General</span>
                <span className="text-2xl font-bold text-gray-900">{progresoDetallado.progresoGeneral}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${progresoDetallado.progresoGeneral}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-600">
                  {progresoDetallado.totalContestadas ?? 0} de {progresoDetallado.totalPreguntas ?? 0} preguntas contestadas
              </span>
            </div>
          </div>

          {/* Puntuación y Valoración */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Puntuación */}
              <div className={`border rounded-lg px-6 py-4 leading-tight ${
                parseFloat(progresoDetallado.puntuacionTotal || 0) >= 4.5 ? 'border-green-300 bg-green-50' :
                parseFloat(progresoDetallado.puntuacionTotal || 0) >= 3.5 ? 'border-blue-300 bg-blue-50' :
                parseFloat(progresoDetallado.puntuacionTotal || 0) >= 2.5 ? 'border-yellow-300 bg-yellow-50' :
                'border-red-300 bg-red-50'
              }`}>
                <div className="flex items-center mb-3">
                  <TrophyOutlined className={`text-2xl mr-3 ${
                    parseFloat(progresoDetallado.puntuacionTotal || 0) >= 4.5 ? 'text-green-600' :
                    parseFloat(progresoDetallado.puntuacionTotal || 0) >= 3.5 ? 'text-blue-600' :
                    parseFloat(progresoDetallado.puntuacionTotal || 0) >= 2.5 ? 'text-yellow-600' :
                    'text-red-600'
                  }`} />
                  <span className="text-lg font-medium text-gray-700">Puntuación</span>
                </div>
                <div className={`text-3xl font-bold text-center ${
                  parseFloat(progresoDetallado.puntuacionTotal || 0) >= 4.5 ? 'text-green-700' :
                  parseFloat(progresoDetallado.puntuacionTotal || 0) >= 3.5 ? 'text-blue-700' :
                  parseFloat(progresoDetallado.puntuacionTotal || 0) >= 2.5 ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  {progresoDetallado.puntuacionTotal ? parseFloat(progresoDetallado.puntuacionTotal).toFixed(1) : '0.0'}
                  {progresoDetallado.tipo === 'anual' && <span className="text-gray-500 text-lg">/5.0</span>}
                </div>
              </div>

              {/* Valoración */}
              <div className={`border rounded-lg px-6 py-4 leading-tight ${
                (progresoDetallado.valoracionAnual || progresoDetallado.valoracionTrimestral || progresoDetallado.valoracion) === 'EXCELENTE' ? 'border-purple-300 bg-purple-50' :
                (progresoDetallado.valoracionAnual || progresoDetallado.valoracionTrimestral || progresoDetallado.valoracion) === 'SOBRESALIENTE' ? 'border-blue-300 bg-blue-50' :
                (progresoDetallado.valoracionAnual || progresoDetallado.valoracionTrimestral || progresoDetallado.valoracion) === 'BUENO' ? 'border-green-300 bg-green-50' :
                (progresoDetallado.valoracionAnual || progresoDetallado.valoracionTrimestral || progresoDetallado.valoracion) === 'ACEPTABLE' ? 'border-yellow-300 bg-yellow-50' :
                'border-gray-300 bg-gray-50'
              }`}>
                <div className="flex items-center mb-3">
                  <StarOutlined className={`text-2xl mr-3 ${
                    (progresoDetallado.valoracionAnual || progresoDetallado.valoracionTrimestral || progresoDetallado.valoracion) === 'EXCELENTE' ? 'text-purple-600' :
                    (progresoDetallado.valoracionAnual || progresoDetallado.valoracionTrimestral || progresoDetallado.valoracion) === 'SOBRESALIENTE' ? 'text-blue-600' :
                    (progresoDetallado.valoracionAnual || progresoDetallado.valoracionTrimestral || progresoDetallado.valoracion) === 'BUENO' ? 'text-green-600' :
                    (progresoDetallado.valoracionAnual || progresoDetallado.valoracionTrimestral || progresoDetallado.valoracion) === 'ACEPTABLE' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`} />
                  <span className="text-lg font-medium text-gray-700">Valoración</span>
                </div>
                <div className="text-center">
                  {(() => {
                    const esTrimestral = progresoDetallado.tipo === 'trimestral';
                    const valoracionMostrada = esTrimestral
                      ? (progresoDetallado.valoracionTrimestral || progresoDetallado.valoracion)
                      : (progresoDetallado.valoracionAnual || progresoDetallado.valoracion);
                    
                    return valoracionMostrada ? (
                      <span className={`inline-flex px-4 py-2 text-lg font-bold rounded-full ${
                        valoracionMostrada === 'EXCELENTE' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                        valoracionMostrada === 'SOBRESALIENTE' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                        valoracionMostrada === 'BUENO' ? 'bg-green-100 text-green-900 border border-green-200' :
                        valoracionMostrada === 'ACEPTABLE' ? 'bg-yellow-100 text-yellow-900 border border-yellow-200' :
                        'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}>
                        {valoracionMostrada}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-lg">-</span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

              </>
            ) : evaluation ? (
              /* Fallback a evaluación simple si no hay progreso detallado */
              <>
                <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                      <div className="bg-blue-100 rounded-lg p-3 mr-4">
                        <FileTextOutlined className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{evaluation.title}</h2>
                        <p className="text-gray-600">Evaluador: {evaluation.evaluator}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Progreso General</span>
                          <span className="text-sm font-bold text-gray-900">{evaluation.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${evaluation.progress}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center">
                          <span className="text-sm font-medium text-gray-600 mr-2">Estado:</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            evaluation.status === 'completed' ? 'bg-green-100 text-green-800' :
                            evaluation.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {evaluation.status === 'completed' ? '✅ Completada' :
                             evaluation.status === 'in_progress' ? '⚡ En progreso' :
                             '⏳ Pendiente'}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{evaluation.answeredQuestions}</div>
                        <div className="text-sm text-gray-500">de {evaluation.totalQuestions} preguntas</div>
                      </div>
                    </div>

                    {evaluation.status === "completed" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`border rounded-md px-4 py-3 leading-tight ${
                          parseFloat(evaluation.puntuacionTotal || 0) >= 4.5 ? 'border-green-300 bg-green-100' :
                          parseFloat(evaluation.puntuacionTotal || 0) >= 3.5 ? 'border-blue-300 bg-blue-100' :
                          parseFloat(evaluation.puntuacionTotal || 0) >= 2.5 ? 'border-yellow-300 bg-yellow-100' :
                          'border-red-300 bg-red-100'
                        }`}>
                          <div className="flex items-center mb-2">
                            <TrophyOutlined className={`text-xl mr-2 ${
                              parseFloat(evaluation.puntuacionTotal || 0) >= 4.5 ? 'text-green-600' :
                              parseFloat(evaluation.puntuacionTotal || 0) >= 3.5 ? 'text-blue-600' :
                              parseFloat(evaluation.puntuacionTotal || 0) >= 2.5 ? 'text-yellow-600' :
                              'text-red-600'
                            }`} />
                            <span className="text-sm font-medium text-gray-700">Puntuación Total</span>
                          </div>
                          <div className={`text-lg font-semibold text-center ${
                            parseFloat(evaluation.puntuacionTotal || 0) >= 4.5 ? 'text-green-700' :
                            parseFloat(evaluation.puntuacionTotal || 0) >= 3.5 ? 'text-blue-700' :
                            parseFloat(evaluation.puntuacionTotal || 0) >= 2.5 ? 'text-yellow-700' :
                            'text-red-700'
                          }`}>
                            {evaluation.puntuacionTotal || 0}
                            {evaluation.periodicidad === 'anual' && <span className="text-gray-500">/5.00</span>}
                          </div>
                        </div>
                        <div className={`border rounded-md px-4 py-3 leading-tight ${
                          evaluation.valoracion === 'EXCELENTE' ? 'border-purple-300 bg-purple-100' :
                          evaluation.valoracion === 'SOBRESALIENTE' ? 'border-blue-300 bg-blue-100' :
                          evaluation.valoracion === 'BUENO' ? 'border-green-300 bg-green-100' :
                          evaluation.valoracion === 'ACEPTABLE' ? 'border-yellow-300 bg-yellow-100' :
                          'border-gray-300 bg-gray-100'
                        }`}>
                          <div className="flex items-center mb-2">
                            <StarOutlined className={`text-xl mr-2 ${
                              evaluation.valoracion === 'EXCELENTE' ? 'text-purple-600' :
                              evaluation.valoracion === 'SOBRESALIENTE' ? 'text-blue-600' :
                              evaluation.valoracion === 'BUENO' ? 'text-green-600' :
                              evaluation.valoracion === 'ACEPTABLE' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`} />
                            <span className="text-sm font-medium text-gray-700">Valoración</span>
                          </div>
                          <div className="text-center">
                            {evaluation.valoracion ? (
                              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                                evaluation.valoracion === 'EXCELENTE' ? 'bg-purple-200 text-purple-900 border border-purple-300' :
                                evaluation.valoracion === 'SOBRESALIENTE' ? 'bg-blue-200 text-blue-900 border border-blue-300' :
                                evaluation.valoracion === 'BUENO' ? 'bg-green-200 text-green-900 border border-green-300' :
                                evaluation.valoracion === 'ACEPTABLE' ? 'bg-yellow-200 text-yellow-900 border border-yellow-300' :
                                'bg-gray-200 text-gray-900 border border-gray-300'
                              }`}>
                                {evaluation.valoracion}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones Rápidas para fallback */}
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex justify-center">
                      {evaluation.status === 'in_progress' && (
                        <button
                          onClick={() => navigate(`/empleado/evaluacion/${evaluation.id}`)}
                          className="inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                          <FileTextOutlined className="mr-2" />
                          Continuar Evaluación
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Estado vacío cuando no hay evaluaciones */
              <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FileTextOutlined className="text-gray-400 text-2xl" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes evaluaciones asignadas</h3>
                    <p className="text-gray-500">Tu evaluador te notificará cuando haya una nueva evaluación disponible.</p>
                  </div>
                </div>
              </div>
      )}
    </div>
  );
};

export default EmpleadoDashboard;
