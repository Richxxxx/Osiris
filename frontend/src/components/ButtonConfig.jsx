import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import axios from '../utils/axiosConfig';
import { toast } from 'react-toastify';

const ButtonConfig = ({ empleadoId, evaluacionAsociada, onIniciarEvaluacion, onVerEvaluacion, onContinuarEvaluacion }) => {
  const navigate = useNavigate();

  const config = useMemo(() => {
    // Usar la evaluación asociada del backend en lugar de datosBotones
    const estado = evaluacionAsociada ? evaluacionAsociada.estado : null;
    const evaluacionId = evaluacionAsociada ? evaluacionAsociada.id : null;

    let config = {
      texto: 'Iniciar Evaluación',
      accion: () => onIniciarEvaluacion(empleadoId),
      clase: 'text-green-600 hover:text-green-900 border-green-600 hover:bg-green-50'
    };

    switch (estado) {
      case null:
        config = {
          texto: 'Iniciar Evaluación',
          accion: () => onIniciarEvaluacion(empleadoId),
          clase: 'text-green-600 hover:text-green-900 border-green-600 hover:bg-green-50'
        };
        break;
      case 'pendiente':
        config = {
          texto: 'Iniciar Evaluación',
          accion: () => onIniciarEvaluacion(empleadoId),
          clase: 'text-green-600 hover:text-green-900 border-green-600 hover:bg-green-50'
        };
        break;
      case 'en_progreso':
        config = {
          texto: 'Continuar',
          accion: () => {
            if (evaluacionId) {
              onContinuarEvaluacion(evaluacionId);
            } else {
              onIniciarEvaluacion(empleadoId);
            }
          },
          clase: 'text-yellow-600 hover:text-yellow-900 border-yellow-600 hover:bg-yellow-50'
        };
        break;
      case 'completada':
        config = {
          texto: 'Ver Evaluación',
          accion: () => {
            if (evaluacionId) {
              onVerEvaluacion(evaluacionId);
            } else {
              console.error('❌ No se encontró la evaluación completada para empleado', empleadoId);
            }
          },
          clase: 'text-blue-600 hover:text-blue-900 border-blue-600 hover:bg-blue-50'
        };
        break;
    }

    return config;
  }, [empleadoId, evaluacionAsociada, onIniciarEvaluacion, onVerEvaluacion, onContinuarEvaluacion]);

  return (
    <button
      onClick={config.accion}
      className={`${config.clase} px-4 py-2 border rounded-lg transition-colors font-medium`}
    >
      {config.texto}
    </button>
  );
};

export default ButtonConfig;
