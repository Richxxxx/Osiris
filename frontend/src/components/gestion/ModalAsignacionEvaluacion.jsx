import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Calendar, 
  Info, 
  FileCheck,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { determinarTipoEvaluacion } from '../../utils/evaluacionUtils';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';

const ModalAsignacionEvaluacion = ({ 
  usuario, 
  ultimaEvaluacion, 
  onClose, 
  onAsignacionCompletada 
}) => {
  const [tipoEvaluacionCalculado, setTipoEvaluacionCalculado] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuario) {
      const tipoCalculado = determinarTipoEvaluacion(usuario);
      setTipoEvaluacionCalculado(tipoCalculado);
    }
  }, [usuario]);

  const handleAsignarExistente = async () => {
    if (!ultimaEvaluacion) return;
    
    setLoading(true);
    try {
      const response = await axios.post('/usuarios/gestion/asignar-evaluacion', {
        evaluadorId: ultimaEvaluacion.evaluadorId,
        empleadoId: usuario.id,
        tipo: ultimaEvaluacion.periodicidad,
        periodo: ultimaEvaluacion.periodo,
        anio: ultimaEvaluacion.anio,
        fechaLimite: ultimaEvaluacion.fechaLimite,
        esExistente: true
      });
      
      if (response.data.status === 'success') {
        toast.success('Evaluación asignada correctamente');
        onAsignacionCompletada();
        onClose();
      }
    } catch (error) {
      toast.error('Error al asignar evaluación existente');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearNueva = async () => {
    if (!usuario || !tipoEvaluacionCalculado) return;
    
    setLoading(true);
    try {
      // Crear la evaluación usando el endpoint existente que ya tiene la lógica para asignar el formulario
      const response = await axios.post('/usuarios/gestion/asignar-evaluacion', {
        empleadoId: usuario.id,
        tipo: tipoEvaluacionCalculado.periodicidad,
        periodo: tipoEvaluacionCalculado.periodo,
        anio: tipoEvaluacionCalculado.anio,
        fechaLimite: (() => {
          const ahora = new Date();
          const fechaLocal = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
          return fechaLocal.toISOString().split('T')[0];
        })(),
        esExistente: false
      });
      
      if (response.data.status === 'success') {
        toast.success('Nueva evaluación creada y asignada correctamente');
        onAsignacionCompletada();
        onClose();
      }
    } catch (error) {
      console.error('Error al crear nueva evaluación:', error);
      toast.error(error.response?.data?.message || 'Error al crear nueva evaluación');
    } finally {
      setLoading(false);
    }
  };

  const puedeCrearNueva = () => {
    if (!ultimaEvaluacion) return true;
    
    // Si está completada y no es del Q actual, puede crear nueva
    if (ultimaEvaluacion.estado === 'completada') {
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
      
      return !(ultimaEvaluacion.anio === currentYear && ultimaEvaluacion.periodo === `Q${currentQuarter}`);
    }
    
    return false;
  };

  const puedeAsignarExistente = () => {
    return ultimaEvaluacion && 
           (ultimaEvaluacion.estado === 'pendiente' || ultimaEvaluacion.estado === 'en_progreso');
  };

  if (!usuario) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Asignar Evaluación - {usuario.nombre} {usuario.apellido || ''}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Información del usuario */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xl">
                {usuario.nombre.charAt(0)}{usuario.apellido?.charAt(0) || ''}
              </span>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">
                {usuario.nombre} {usuario.apellido || ''}
              </h4>
              <p className="text-gray-500">{usuario.email}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-400">
                  {usuario.departamento?.nombre || 'Sin departamento'}
                </span>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-400">
                  {usuario.cargo?.nombre || 'Sin cargo'}
                </span>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-400">
                  {usuario.rol?.nombre || 'Sin rol'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Tipo de evaluación calculado - Simplificado */}
          {tipoEvaluacionCalculado && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Tipo de Evaluación Correspondiente: {tipoEvaluacionCalculado.label}
                </span>
              </div>
            </div>
          )}
          
          {/* Última evaluación */}
          {ultimaEvaluacion ? (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Última Evaluación Registrada</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Período</p>
                  <p className="font-medium">{ultimaEvaluacion.periodo} - {ultimaEvaluacion.anio}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      ultimaEvaluacion.estado === 'completada' ? 'bg-green-100 text-green-800' :
                      ultimaEvaluacion.estado === 'en_progreso' ? 'bg-yellow-100 text-yellow-800' :
                      ultimaEvaluacion.estado === 'pendiente' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ultimaEvaluacion.estado === 'pendiente' && 'Pendiente'}
                      {ultimaEvaluacion.estado === 'en_progreso' && 'En Progreso'}
                      {ultimaEvaluacion.estado === 'completada' && 'Completada'}
                      {ultimaEvaluacion.estado === 'asignada' && 'Asignada'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Evaluador</p>
                  <p className="font-medium">
                    {ultimaEvaluacion.evaluador?.nombre} {ultimaEvaluacion.evaluador?.apellido || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {ultimaEvaluacion.estado === 'completada' ? 'Fecha de Finalización' : 'Fecha de Creación'}
                  </p>
                  <p className="font-medium">
                    {ultimaEvaluacion.estado === 'completada' && ultimaEvaluacion.fechaFin ? (
                      new Date(ultimaEvaluacion.fechaFin + 'T00:00:00').toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })
                    ) : (
                      new Date(ultimaEvaluacion.fechaInicio + 'T00:00:00').toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <h4 className="text-lg font-medium text-yellow-800">Sin Evaluaciones Anteriores</h4>
              </div>
              <p className="text-yellow-700">Este usuario no tiene evaluaciones registradas. Se creará una nueva evaluación.</p>
            </div>
          )}
          
          {/* Botones de acción */}
          <div className="space-y-3">
            {puedeAsignarExistente() && (
              <button
                onClick={handleAsignarExistente}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center justify-center space-x-2"
              >
                <UserPlus className="h-5 w-5" />
                <span>{loading ? 'Procesando...' : 'Asignar Evaluación Existente'}</span>
              </button>
            )}
            
            {puedeCrearNueva() && (
              <button
                onClick={handleCrearNueva}
                disabled={loading}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 transition-colors flex items-center justify-center space-x-2"
              >
                <FileCheck className="h-5 w-5" />
                <span>{loading ? 'Creando...' : `Crear Nueva Evaluación ${tipoEvaluacionCalculado?.periodicidad === 'anual' ? 'Anual' : 'Trimestral'}`}</span>
              </button>
            )}
            
            {!puedeAsignarExistente() && !puedeCrearNueva() && ultimaEvaluacion?.estado === 'completada' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <p className="text-orange-800">
                    Este usuario ya tiene una evaluación completada en el período actual. 
                    No se puede crear otra evaluación hasta el próximo período.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalAsignacionEvaluacion;
