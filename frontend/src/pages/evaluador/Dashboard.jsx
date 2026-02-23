import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { authService } from '../../services/auth';

import Button from '../../components/Button';

import UserMenu from '../../components/UserMenu';

import ButtonConfig from '../../components/ButtonConfig';

import HeaderEvaluador from '../../components/evaluador/Header';

import SidebarEvaluador from '../../components/evaluador/Sidebar';

import EvaluacionModal from '../../components/evaluador/EvaluacionModal';

import VerEvaluacionModal from '../../components/evaluador/VerEvaluacionModal';

import axios from '../../utils/axiosConfig';

import { toast } from 'react-toastify';



// Cache simple para datos del dashboard - LIMPIADO FORZADO

const dashboardCache = {

  botones: null,

  botonesTimestamp: 0,

  empleados: null,

  empleadosTimestamp: 0,

  evaluaciones: null,

  evaluacionesTimestamp: 0,

  CACHE_DURATION: 5 * 60 * 1000 // 5 minutos

};



// Forzar limpieza de caché al cargar este módulo

dashboardCache.botones = null;

dashboardCache.botonesTimestamp = 0;

dashboardCache.empleados = null;

dashboardCache.empleadosTimestamp = 0;

dashboardCache.evaluaciones = null;

dashboardCache.evaluacionesTimestamp = 0;



// Función para obtener el trimestre actual y su rango de fechas

const getCurrentQuarter = () => {

  const now = new Date();

  const currentMonth = now.getMonth();

  const currentYear = now.getFullYear();

  

  // Determinar el trimestre actual (0-3)

  const quarter = Math.floor(currentMonth / 3) + 1;

  

  // Calcular fechas de inicio y fin del trimestre

  const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9

  const endMonth = startMonth + 3;

  

  const startDate = new Date(currentYear, startMonth, 1);

  const endDate = new Date(currentYear, endMonth, 0); // Último día del mes

  

  // Formatear fechas

  const formatDate = (date) => {

    return date.toLocaleDateString('es-ES', {

      day: '2-digit',

      month: 'long',

      year: 'numeric'

    });

  };

  

  return {

    quarter: `Q${quarter}`,

    year: currentYear,

    startDate: formatDate(startDate),

    endDate: formatDate(endDate),

    fullRange: `${formatDate(startDate)} - ${formatDate(endDate)}`

  };

};



// Función para generar lista de años disponibles para el historial

const generateAvailableYears = () => {

  const currentYear = new Date().getFullYear();

  const years = [];

  

  // Generar solo el año actual

  for (let year = currentYear; year <= currentYear; year++) {

    years.push({

      value: year,

      label: year.toString(),

      isCurrent: year === currentYear

    });

  }

  

  return years;

};


// Función para cargar historial con filtros dinámicos
const cargarHistorialConFiltros = async (trimestre = null, anio = null) => {
  try {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.token) {
      return [];
    }
    
    const params = new URLSearchParams();
    if (trimestre) params.append('trimestre', trimestre);
    if (anio) params.append('anio', anio);
    
    const url = `/evaluaciones/historial${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await axios.get(url, {
      headers: { 
        'Authorization': `Bearer ${currentUser.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.status === 'success') {
      const historialData = response.data.data || [];
      return historialData;
    }
    return [];
  } catch (error) {
    return [];
  }
};

// Función para cargar contadores por año
const cargarContadoresPorAnio = async (anio) => {
  try {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !currentUser.token) {
      return { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    }
    
    const url = `/evaluaciones/historial?anio=${anio}`;
    
    const response = await axios.get(url, {
      headers: { 
        'Authorization': `Bearer ${currentUser.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.status === 'success') {
      const historialData = response.data.data || [];
      
      const contadores = {
        Q1: historialData.filter(e => e.periodo === 'Q1').length,
        Q2: historialData.filter(e => e.periodo === 'Q2').length,
        Q3: historialData.filter(e => e.periodo === 'Q3').length,
        Q4: historialData.filter(e => e.periodo === 'Q4').length
      };
      
      return contadores;
    }
    return { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  } catch (error) {
    return { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  }
};


// Componente para mostrar una tarjeta de evaluación

const EvaluationCard = ({ evaluacion }) => {

  const navigate = useNavigate();

  

  const handleVerDetalles = () => {

    if (evaluacion.id) {

      navigate(`/evaluador/evaluacion/${evaluacion.id}`);

    } else {

      // Si no tiene ID, es una evaluación calculada que no existe aún

      // No hacer nada o mostrar mensaje

      toast.info('Esta evaluación aún no está disponible. Debe ser creada primero.');

    }

  };



  return (

    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-4">

      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">

        <div>

          <h3 className="text-lg leading-6 font-medium text-gray-900">

            {evaluacion.empleado?.nombre} {evaluacion.empleado?.apellido || ''}

          </h3>

          <p className="mt-1 max-w-2xl text-sm text-gray-500">

            {evaluacion.empleado?.cargo?.nombre || evaluacion.empleado?.cargo || 'Sin cargo especificado'}

          </p>

        </div>

        <div className="flex items-center">

          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${

            evaluacion.estado === 'pendiente' 

              ? 'bg-yellow-100 text-yellow-800' 

              : 'bg-green-100 text-green-800'

          }`}>

            {evaluacion.estado === 'pendiente' ? 'Pendiente' : 'Completada'}

          </span>

          <Button 
            onClick={handleVerDetalles}
            className="ml-4"
            size="sm"
            disabled={!evaluacion.id}
          >
            {evaluacion.id ? (evaluacion.estado === 'pendiente' ? 'Iniciar Evaluación' : 'Ver Detalles') : 'No Disponible'}
          </Button>

        </div>

      </div>

      <div className="border-t border-gray-200">

        <dl>

          <div className="bg-gray-50 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">

            <dt className="text-sm font-medium text-gray-500">Fecha esperada</dt>

            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">

              {evaluacion.fechaEsperada ? (() => {

                const fechaUTC = new Date(evaluacion.fechaEsperada + 'T00:00:00Z');

                return fechaUTC.toLocaleDateString('es-ES', { 

                  timeZone: 'UTC',

                  year: 'numeric', 

                  month: '2-digit', 

                  day: '2-digit' 

                });

              })() : '-'}

            </dd>

          </div>

          <div className="bg-white px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">

            <dt className="text-sm font-medium text-gray-500">Fecha límite</dt>

            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">

              {evaluacion.fechaLimite ? (() => {

                const fechaUTC = new Date(evaluacion.fechaLimite + 'T00:00:00Z');

                return fechaUTC.toLocaleDateString('es-ES', { 

                  timeZone: 'UTC',

                  year: 'numeric', 

                  month: '2-digit', 

                  day: '2-digit' 

                });

              })() : '-'}

            </dd>

          </div>

          {evaluacion.progreso > 0 && (

            <div className="bg-white px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">

              <dt className="text-sm font-medium text-gray-500">Progreso</dt>

              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">

                <div className="w-full bg-gray-200 rounded-full h-2.5">

                  <div 

                    className="bg-blue-600 h-2.5 rounded-full" 

                    style={{ width: `${evaluacion.progreso}%` }}

                  ></div>

                </div>

                <p className="text-right text-xs text-gray-500 mt-1">{evaluacion.progreso}% completado</p>

              </dd>

            </div>

          )}

        </dl>

      </div>

    </div>

  );

};



const EvaluadorDashboard = () => {

  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const [user, setUser] = useState(null);

  const [empleados, setEmpleados] = useState([]);

  const [todosLosEmpleados, setTodosLosEmpleados] = useState([]); // Guardar todos los empleados sin filtrar

  const [evaluacionesAsignadas, setEvaluacionesAsignadas] = useState([]); // Para sección de asignadas

  const [evaluaciones, setEvaluaciones] = useState([]);

  const [datosBotones, setDatosBotones] = useState({});  // ← {empleadoId: {id, estado}}

  const [historialEvaluaciones, setHistorialEvaluaciones] = useState([]);

  const [currentQuarter, setCurrentQuarter] = useState(getCurrentQuarter());

  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);

  const [evaluacionesFiltradas, setEvaluacionesFiltradas] = useState([]);

  // 🔥 CORRECCIÓN: Estado para contadores por año
  const [contadoresPorAnio, setContadoresPorAnio] = useState({ Q1: 0, Q2: 0, Q3: 0, Q4: 0 });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [modalEvaluacionVisible, setModalEvaluacionVisible] = useState(false);

  const [modalVerEvaluacionVisible, setModalVerEvaluacionVisible] = useState(false);

  const [evaluacionIdActual, setEvaluacionIdActual] = useState(null);

  const [yearSeleccionado, setYearSeleccionado] = useState(new Date().getFullYear());

  const [availableYears] = useState(() => generateAvailableYears());



  // Obtener la pestaña activa desde los parámetros de URL

  const activeTab = searchParams.get('tab') || 'empleados';



  // Función para obtener el estado de evaluación de un empleado específico

  const getEstadoEvaluacionEmpleado = useCallback((empleadoId) => {

    const datos = datosBotones[empleadoId];

    const estado = datos ? datos.estado : null;

    return estado;

  }, [datosBotones]);



  const cargarEmpleados = useCallback(async () => {

    try {

      const user = authService.getCurrentUser();

      

      if (!user) {

        authService.logout();

        navigate('/login');

        return;

      }



      if (!user.departamento_id) {

        toast.error('No tienes un departamento asignado');

        return;

      }



      // Verificar caché primero

      const now = Date.now();

      if (dashboardCache.empleados && 

          dashboardCache.empleadosTimestamp && 

          (now - dashboardCache.empleadosTimestamp) < dashboardCache.CACHE_DURATION) {

        setTodosLosEmpleados(dashboardCache.empleados);

        return;

      }



      const response = await axios.get(`/usuarios/departamento/${user.departamento_id}`, {

        headers: { 

          'Authorization': `Bearer ${user.token}`,

          'Content-Type': 'application/json'

        }

      });

      

      if (response.data && response.data.status === 'success') {

        const todosLosEmpleados = response.data.data.usuarios || [];

        

        // Actualizar caché

        dashboardCache.empleados = todosLosEmpleados;

        dashboardCache.empleadosTimestamp = Date.now();

        

        // NO filtrar aquí, solo establecer todos los empleados

        // El filtrado se hará en un useEffect separado

        setTodosLosEmpleados(todosLosEmpleados);

      }

      

    } catch (error) {

      if (error.response?.status === 401) {

        authService.logout();

        navigate('/login');

        return;

      }

      toast.error('Error al cargar los empleados');

    }

  }, [navigate, getEstadoEvaluacionEmpleado]);

  

  // Función para cargar datos de botones con caché

  const cargarDatosBotones = useCallback(async () => {

    try {

      const user = authService.getCurrentUser();

      

      if (!user) {

        return;

      }



      // Verificar caché primero

      const now = Date.now();

      if (dashboardCache.botones && 

          dashboardCache.botonesTimestamp && 

          (now - dashboardCache.botonesTimestamp) < dashboardCache.CACHE_DURATION) {

        setDatosBotones(dashboardCache.botones);

        return;

      }



      const response = await axios.get('/evaluaciones/botones', {

        headers: { 

          'Authorization': `Bearer ${user.token}`,

          'Content-Type': 'application/json'

        }

      });



      if (response.data && response.data.status === 'success') {

        const datos = response.data.data.datos || {};

        setDatosBotones(datos);

        // Actualizar caché

        dashboardCache.botones = datos;

        dashboardCache.botonesTimestamp = Date.now();

      }

    } catch (error) {

      console.error('Error al cargar datos de botones:', error);

      setDatosBotones({});

    }

  }, []);

  

  const cargarEvaluaciones = useCallback(async () => {

    try {

      const user = authService.getCurrentUser();

      

      if (!user) {

        authService.logout();

        navigate('/login');

        return;

      }



      // Verificar caché primero

      const now = Date.now();

      if (dashboardCache.evaluaciones && 

          dashboardCache.evaluacionesTimestamp && 

          (now - dashboardCache.evaluacionesTimestamp) < dashboardCache.CACHE_DURATION) {

        setEvaluaciones(dashboardCache.evaluaciones.evaluaciones);

        setHistorialEvaluaciones(dashboardCache.evaluaciones.historial);

        return;

      }



      // Siempre cargar datos frescos para evitar problemas con caché
      let evaluacionesData = [];
      let historialData = [];

      // Cargar evaluaciones asignadas (endpoint correcto que crea evaluaciones automáticamente)
      const [evaluacionesResponse, historialResponse, asignadasResponse] = await Promise.allSettled([
        axios.get('/evaluaciones/asignadas', {
          headers: { 
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }),
        axios.get('/evaluaciones/historial', {
          headers: { 
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }),
        axios.get('/evaluaciones/asignadas-activas', {
          headers: { 
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (evaluacionesResponse.status === 'fulfilled' && 
          evaluacionesResponse.value.data && 
          evaluacionesResponse.value.data.status === 'success') {
        evaluacionesData = evaluacionesResponse.value.data.data.evaluaciones || [];
      }

      if (asignadasResponse.status === 'fulfilled' && 
          asignadasResponse.value.data && 
          asignadasResponse.value.data.status === 'success') {
        const asignadasData = asignadasResponse.value.data.data || [];
        setEvaluacionesAsignadas(asignadasData);
      }

      if (historialResponse.status === 'fulfilled' && 
          historialResponse.value.data && 
          historialResponse.value.data.status === 'success') {
        historialData = historialResponse.value.data.data || [];
      }



      // Actualizar caché

      dashboardCache.evaluaciones = {

        evaluaciones: evaluacionesData,

        historial: historialData

      };

      dashboardCache.evaluacionesTimestamp = Date.now();



      setEvaluaciones(evaluacionesData);

      setHistorialEvaluaciones(historialData);

      

    } catch (error) {

      if (error.response?.status === 401) {

        authService.logout();

        navigate('/login');

        return;

      }

      toast.error('Error al cargar las evaluaciones');

    }

  }, [navigate]);



  // Función para obtener el texto y acción del botón según estado

  const getConfiguracionBoton = useCallback((empleadoId) => {

    const estado = getEstadoEvaluacionEmpleado(empleadoId);

    const user = authService.getCurrentUser();



    let config = {

      texto: 'Iniciar Evaluación',

      accion: () => handleIniciarEvaluacion(empleadoId),

      clase: 'text-green-600 hover:text-green-900 border-green-600 hover:bg-green-50'

    };



    switch (estado) {

      case null:

        config = {

          texto: 'Iniciar Evaluación',

          accion: () => handleIniciarEvaluacion(empleadoId),

          clase: 'text-green-600 hover:text-green-900 border-green-600 hover:bg-green-50'

        };

        break;

      case 'pendiente':

        config = {

          texto: 'Iniciar Evaluación',

          accion: () => handleIniciarEvaluacion(empleadoId),

          clase: 'text-green-600 hover:text-green-900 border-green-600 hover:bg-green-50'

        };

        break;

      case 'en_progreso':

        config = {

          texto: 'Continuar',

          accion: () => {

            const datos = datosBotones[empleadoId];

            if (datos && datos.id) {

              setEvaluacionIdActual(datos.id);

              setModalEvaluacionVisible(true);

            } else {

              handleIniciarEvaluacion(empleadoId);

            }

          },

          clase: 'text-yellow-600 hover:text-yellow-900 border-yellow-600 hover:bg-yellow-50'

        };

        break;

      case 'completada':

        config = {

          texto: 'Ver Evaluación',

          accion: () => {

            const datos = datosBotones[empleadoId];

            if (datos && datos.id) {

              setEvaluacionIdActual(datos.id);

              setModalVerEvaluacionVisible(true);

            } else {

              // No hacer nada si no hay datos

            }

          },

          clase: 'text-blue-600 hover:text-blue-900 border-blue-600 hover:bg-blue-50'

        };

        break;

    }



    return config;

  }, [datosBotones, navigate]);

  

  const handleAsignarEvaluacion = async (empleadoId) => {

    try {

      const user = authService.getCurrentUser();

      await axios.post('/api/evaluaciones', {

        empleadoId,

        evaluadorId: user.id,

        fechaLimite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días a partir de ahora

        estado: 'pendiente',

        progreso: 0

      }, {

        headers: { 'Authorization': `Bearer ${user.token}` }

      });

      

      toast.success('Evaluación asignada correctamente');

      await cargarEvaluaciones();

    } catch (error) {

      toast.error(error.response?.data?.message || 'Error al asignar la evaluación');

    }

  };



  const handleIniciarEvaluacion = async (empleadoId) => {

    if (!empleadoId) {

      toast.error('ID de empleado no válido');

      return;

    }  

    try {

      const user = authService.getCurrentUser();

      

      // Verificar si ya existe una evaluación para este empleado en el trimestre actual

      const evaluacionExistente = evaluaciones.find(

        evaluacion => evaluacion.evaluadoId === empleadoId && 

                      evaluacion.evaluadorId === user.id && 

                      ['pendiente', 'en_progreso'].includes(evaluacion.estado)

      );



      if (evaluacionExistente) {

        // Si ya existe una evaluación, abrir el modal

        setEvaluacionIdActual(evaluacionExistente.id);

        setModalEvaluacionVisible(true);

        return;

      }



      // Si no existe, crear una nueva evaluación usando el endpoint correcto

      const response = await axios.post('/evaluaciones/iniciar', {

        evaluadoId: empleadoId

      }, {

        headers: { 'Authorization': `Bearer ${user.token}` }

      });

      

      // Abrir el modal con la evaluación recién creada

      setEvaluacionIdActual(response.data.data.evaluacion.id);

      setModalEvaluacionVisible(true);

      

    } catch (error) {

      console.error('Error al iniciar evaluación:', error);

      

      // Manejar específicamente el caso de que no hay formulario disponible

      if (error.response?.status === 404) {

        toast.error('No hay un formulario de evaluación configurado para este cargo. Contacte al administrador del sistema.');

      } else if (error.response?.status === 403) {

        toast.error('No tiene permisos para evaluar a este empleado.');

      } else if (error.response?.status === 401) {

        toast.error('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');

        setTimeout(() => {

          navigate('/login');

        }, 2000);

      } else {

        toast.error(error.response?.data?.message || 'Error al iniciar la evaluación');

      }

    }

  };



  // Función para manejar evaluaciones desde la sección de asignadas
  const handleIniciarEvaluacionDesdeAsignada = async (evaluacion) => {
    if (!evaluacion || !evaluacion.id) {
      toast.error('Evaluación no válida');
      return;
    }

    try {
      // Establecer el ID de la evaluación actual y mostrar el modal
      setEvaluacionIdActual(evaluacion.id);
      setModalEvaluacionVisible(true);
    } catch (error) {
      console.error('Error al abrir evaluación asignada:', error);
      toast.error('Error al abrir la evaluación');
    }
  };



  // Efecto para filtrar empleados según evaluaciones del backend

  useEffect(() => {

    if (evaluaciones.length > 0) {

      // Filtrar evaluaciones para excluir las que ya están completadas o vencidas
      const evaluacionesValidas = evaluaciones.filter(evaluacion => {
        // Excluir evaluaciones completadas
        if (evaluacion.estado === 'completada') {
          return false;
        }

        // Excluir evaluaciones vencidas (fecha límite pasada)
        if (evaluacion.fechaLimite) {
          const fechaLimite = new Date(evaluacion.fechaLimite);
          const hoy = new Date();
          if (fechaLimite < hoy) {
            return false;
          }
        }

        // Excluir evaluaciones fuera de la ventana de 20 días hábiles
        if (evaluacion.diasRestantes !== undefined && evaluacion.diasRestantes < 0) {
          return false;
        }

        return true;
      });

      // Extraer empleados únicos de las evaluaciones filtradas
      const empleadosConEvaluaciones = evaluacionesValidas.map(evaluacion => ({

        id: evaluacion.evaluado.id,

        nombre: evaluacion.evaluado.nombre,

        apellido: evaluacion.evaluado.apellido,

        email: evaluacion.evaluado.email,

        cargo: evaluacion.evaluado?.cargo?.nombre || evaluacion.evaluado?.cargo || 'No especificado',

        periodo: evaluacion.periodicidad === 'anual' ? 'Anual' : 'Trimestral', // 🔥 Usa campo calculado del backend

        evaluacionAsociada: evaluacion

      }));

      

      // Eliminar duplicados por ID

      const empleadosUnicos = empleadosConEvaluaciones.filter((empleado, index, self) => 

        index === self.findIndex(e => e.id === empleado.id)

      );

      

      setEmpleados(empleadosUnicos);

      

      // Mostrar detalles de períodos para depuración

      empleadosUnicos.forEach(emp => {

      });

    } else {
      // Si no hay evaluaciones del backend, mostrar lista vacía
      setEmpleados([]);
    }

  }, [evaluaciones]);

  // Cargar contadores del año actual al iniciar
  useEffect(() => {
    const cargarContadoresIniciales = async () => {
      const contadores = await cargarContadoresPorAnio(yearSeleccionado);
      setContadoresPorAnio(contadores);
    };
    
    if (yearSeleccionado) {
      cargarContadoresIniciales();
    }
  }, []); // Solo se ejecuta al inicio

  useEffect(() => {

    const cargarDatos = async () => {

      setLoading(true);

      try {

        // Cargar todas las peticiones en paralelo para máxima velocidad

        await Promise.all([

          cargarDatosBotones(),

          cargarEmpleados(),

          cargarEvaluaciones()

        ]);

      } finally {

        setLoading(false);

      }

    };

    

    cargarDatos();

  }, []);



  // Recargar datos cuando se recibe el evento de evaluación cerrada

  useEffect(() => {

    const handleEvaluacionCerrada = () => {

      // Recargar datos en paralelo para máxima velocidad

      Promise.all([

        cargarDatosBotones(),

        cargarEmpleados(),

        cargarEvaluaciones()

      ]).catch(error => {

        console.error('Error al recargar datos:', error);

      });

    };



    // Escuchar evento personalizado

    window.addEventListener('evaluacionCerrada', handleEvaluacionCerrada);

    

    return () => {

      window.removeEventListener('evaluacionCerrada', handleEvaluacionCerrada);

    };

  }, []);





  // Obtener trimestre actual y configurar el trimestre seleccionado por defecto

  useEffect(() => {

    const { quarter, year, startDate, endDate, fullRange } = getCurrentQuarter();

    setCurrentQuarter({ 

      quarter, 

      year, 

      startDate, 

      endDate, 

      fullRange 

    });

    

    // Establecer el periodo actual como seleccionado por defecto

    setPeriodoSeleccionado(quarter);

  }, []);



// Actualizar evaluaciones filtradas cuando cambie el trimestre o el historial

  // Actualizar evaluaciones filtradas cuando cambie el periodo o el historial

  useEffect(() => {

    if (periodoSeleccionado && historialEvaluaciones.length > 0) {

      const filtradas = historialEvaluaciones.filter(e => e.periodo === periodoSeleccionado);

      setEvaluacionesFiltradas(filtradas);

    }

  }, [periodoSeleccionado, historialEvaluaciones]);

  if (loading) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-gray-50">

        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>

      </div>

    );

  }



  // Función para manejar el cierre de sesión

  const handleLogout = () => {

    authService.logout();

    toast.success('Has cerrado sesión correctamente', {

      position: 'top-center',

      autoClose: 3000,

      hideProgressBar: false,

      closeOnClick: true,

      pauseOnHover: true,

      draggable: true

    });

    navigate('/login');

  };



  // Funciones para manejar el modal

  const handleModalClose = () => {

    setModalEvaluacionVisible(false);

    setEvaluacionIdActual(null);

  };



  const handleVerModalClose = () => {

    setModalVerEvaluacionVisible(false);

    setEvaluacionIdActual(null);

  };



  const handleModalSuccess = () => {

    // Limpiar caché para forzar recarga fresca

    dashboardCache.botones = null;

    dashboardCache.botonesTimestamp = null;

    dashboardCache.empleados = null;

    dashboardCache.empleadosTimestamp = null;

    dashboardCache.evaluaciones = null;

    dashboardCache.evaluacionesTimestamp = null;

    

    // Recargar datos en paralelo para máxima velocidad

    Promise.all([

      cargarDatosBotones(),

      cargarEmpleados(),

      cargarEvaluaciones()

    ]).catch(error => {

      console.error('Error al recargar datos:', error);

    });

  };



  // Funciones para el modal

  const handleVerEvaluacion = (evaluacionId) => {

    setEvaluacionIdActual(evaluacionId);

    setModalVerEvaluacionVisible(true);

  };



  const handleContinuarEvaluacion = (evaluacionId) => {

    setEvaluacionIdActual(evaluacionId);

    setModalEvaluacionVisible(true);

  };



  return (

    <div className="h-screen flex flex-col bg-gray-50">

      <div className="flex-shrink-0">

        <HeaderEvaluador />

      </div>

      

      <div className="flex flex-1 overflow-hidden">

        <div className="flex-shrink-0">

          <SidebarEvaluador />

        </div>

        

        <main className="flex-1 overflow-y-auto">

          <div className="p-4 lg:p-6">

            {/* Contenido principal según la pestaña activa */}

            <div className="bg-white shadow rounded-lg p-4 lg:p-6">

              {activeTab === 'empleados' && (
                <>
                  {/* Tarjeta de trimestre actual - Diseño Moderno */}
                  <div className="relative bg-blue-50 rounded-2xl px-6 py-3 mb-8 shadow-xl overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
                      <svg className="h-32 w-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                      </svg>
                    </div>
                    
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="mb-3 sm:mb-0">
                        <div className="flex items-center mb-2">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 mr-3">
                            <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Evaluaciones del {currentQuarter.quarter} {currentQuarter.year}
                          </h2>
                        </div>
                        <div className="flex items-center text-gray-700 mb-2">
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm font-medium text-gray-700">
                            {currentQuarter.fullRange}
                          </p>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          Estos son los empleados que debes evaluar en este trimestre.
                        </p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="bg-white/30 border border-gray-600 rounded-lg p-3 text-center min-w-[80px]">
                          <span className="block text-4xl font-bold text-gray-900 mb-2">{empleados.length}</span>
                          <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Evaluados</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-medium text-gray-900">Evaluados de tu Departamento</h2>
                    </div>
                    
                    {empleados.length === 0 ? (
                      <div className="text-center py-12">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay empleados en tu departamento</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Actualmente no hay empleados asignados a tu departamento.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Vista de tarjetas para móviles */}
                        <div className="block lg:hidden">
                          <div className="space-y-4">
                            {empleados.map((empleado) => (
                              <div key={empleado.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-blue-600 font-medium text-sm">
                                          {empleado.nombre.charAt(0)}{empleado.apellido?.charAt(0) || ''}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-3">
                                      <div className="text-sm font-medium text-gray-900">
                                        {empleado.nombre} {empleado.apellido || ''}
                                      </div>
                                      <div className="text-xs text-gray-500">{empleado.cargo?.nombre || empleado.cargo || 'No especificado'}</div>
                                      <div className="mt-1">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                          empleado.periodo === 'Anual' 
                                            ? 'bg-purple-100 text-purple-800' 
                                            : 'bg-blue-100 text-blue-800'
                                        }`}>
                                          {empleado.periodo}
                                        </span>
                                      </div>
                                      <div className="mt-1">
                                        {empleado.evaluacionAsociada?.fechaLimite ? (
                                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                                            new Date(empleado.evaluacionAsociada.fechaLimite) < new Date() 
                                              ? 'bg-red-100 text-red-800' 
                                              : 'bg-green-100 text-green-800'
                                          }`}>
                                            📅 {new Date(empleado.evaluacionAsociada.fechaLimite).toLocaleDateString('es-ES', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric'
                                            })}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400 text-xs">Sin fecha límite</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center text-xs text-gray-500">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2v-1a6 6 0 00-12 0v1a2 2 0 00-2 2H5a2 2 0 00-2 2v-1a6 6 0 012 0v1a2 2 0 002 2z" />
                                    </svg>
                                    {empleado.email}
                                  </div>
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                  <ButtonConfig 
                                    empleadoId={empleado.id} 
                                    evaluacionAsociada={empleado.evaluacionAsociada}
                                    onIniciarEvaluacion={handleIniciarEvaluacion}
                                    onVerEvaluacion={handleVerEvaluacion}
                                    onContinuarEvaluacion={handleContinuarEvaluacion}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Vista de tabla para desktop */}
                        <div className="hidden lg:block overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Nombre
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Cargo
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Período
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Fecha Límite
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Email
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                  <span className="sr-only">Acciones</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {empleados.map((empleado) => (
                                <tr key={empleado.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-10 w-10">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                          <span className="text-blue-600 font-medium">
                                            {empleado.nombre.charAt(0)}{empleado.apellido?.charAt(0) || ''}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                          {empleado.nombre} {empleado.apellido || ''}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{empleado.cargo?.nombre || empleado.cargo || 'No especificado'}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      empleado.periodo === 'Anual' 
                                        ? 'bg-purple-100 text-purple-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {empleado.periodo}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                      {empleado.evaluacionAsociada?.fechaLimite ? (
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                                          new Date(empleado.evaluacionAsociada.fechaLimite) < new Date() 
                                            ? 'bg-red-100 text-red-800' 
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                          {new Date(empleado.evaluacionAsociada.fechaLimite).toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                          })}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {empleado.email}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <ButtonConfig 
                                      empleadoId={empleado.id} 
                                      evaluacionAsociada={empleado.evaluacionAsociada}
                                      onIniciarEvaluacion={handleIniciarEvaluacion}
                                      onVerEvaluacion={handleVerEvaluacion}
                                      onContinuarEvaluacion={handleContinuarEvaluacion}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'evaluaciones' && (
                <div className="mt-8">
                  {/* Título + Contador - Estilo similar al principal */}
                  <div className="relative bg-blue-50 rounded-2xl px-6 py-4 mb-8 shadow-xl overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
                      <svg className="h-32 w-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                      </svg>
                    </div>
                    
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div className="mb-3 sm:mb-0">
                        <div className="flex items-center mb-2">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 mr-3">
                            <svg className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            Evaluaciones Asignadas Activas
                          </h2>
                        </div>
                        <div className="flex items-center text-gray-700 mb-2">
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm font-medium text-gray-700">
                            Evaluaciones con estado "asignada" en ventana de 5 días hábiles
                          </p>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          Estas evaluaciones están activas y requieren tu atención inmediata.
                        </p>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="bg-white/30 border border-blue-200 rounded-lg p-3 text-center min-w-[80px]">
                          <span className="block text-4xl font-bold text-blue-600 mb-2">{evaluacionesAsignadas.length}</span>
                          <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Asignadas</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contenedor de información importante - Colores fríos */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Información Importante</h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>• Las evaluaciones asignadas tienen una ventana de <strong>5 días hábiles</strong> para ser completadas.</p>
                          <p>• Si olvidaste realizar una evaluación, contacta con <strong>Gestión Humana</strong> para que te la asignen nuevamente.</p>
                          <p>• Estas evaluaciones están en estado <strong>"ASIGNADA"</strong> y requieren tu atención inmediata.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Listado de evaluaciones asignadas - Distribución horizontal */}
                  {evaluacionesAsignadas.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes evaluaciones asignadas</h3>
                      <p className="mt-1 text-sm text-gray-500">Actualmente no tienes evaluaciones asignadas en el período de 5 días hábiles.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {evaluacionesAsignadas.map((evaluacion) => (
                        <div key={evaluacion.id || `asign-${evaluacion.evaluado?.id}-${evaluacion.periodo}-${evaluacion.anio}`} className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            {/* Avatar */}
                            <div className="flex-shrink-0 h-12 w-12">
                              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-base">
                                  {evaluacion.evaluado?.nombre?.charAt(0)}{evaluacion.evaluado?.apellido?.charAt(0) || ''}
                                </span>
                              </div>
                            </div>
                            
                            {/* Información del evaluado */}
                            <div className="flex-1 px-4">
                              <div className="flex items-center space-x-3 mb-1">
                                <h3 className="text-base font-semibold text-gray-900">
                                  {evaluacion.evaluado?.nombre} {evaluacion.evaluado?.apellido || ''}
                                </h3>
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  ASIGNADA
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {evaluacion.evaluado?.cargo?.nombre || evaluacion.evaluado?.cargo || 'No especificado'}
                              </p>
                            </div>

                            {/* Información de la evaluación - Distribución horizontal */}
                            <div className="flex items-center space-x-6 text-sm">
                              <div className="text-center">
                                <div className="text-gray-500 text-xs">Período</div>
                                <div className="font-medium text-gray-900">{evaluacion.periodo} {evaluacion.anio}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500 text-xs">Fecha límite</div>
                                <div className="font-medium text-gray-900">{evaluacion.fechaVencimiento}</div>
                              </div>

                            </div>

                            {/* Botón de acción funcional */}
                            <div className="ml-4">
                              <Button 
                                onClick={() => handleIniciarEvaluacionDesdeAsignada(evaluacion)}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                              >
                                Iniciar Evaluación
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

          {activeTab === 'historial' && (

            <div>

              <div className="flex justify-between items-center mb-6">

                <h2 className="text-lg font-medium text-gray-900">Historial de Evaluaciones</h2>

                

                {/* Selector de año */}

                <div className="flex items-center space-x-2">

                  <span className="text-sm text-gray-600">Año:</span>

                  <select

                    value={yearSeleccionado}

                    onChange={async (e) => {
                      const nuevoAnio = parseInt(e.target.value);
                      
                      setYearSeleccionado(nuevoAnio);
                      setPeriodoSeleccionado(null);
                      setEvaluacionesFiltradas([]);
                      setHistorialEvaluaciones([]);
                      
                      const contadores = await cargarContadoresPorAnio(nuevoAnio);
                      setContadoresPorAnio(contadores);
                    }}

                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

                  >

                    {availableYears.map((year) => (

                      <option key={year.value} value={year.value}>

                        {year.label} {year.isCurrent && '(Actual)'}

                      </option>

                    ))}

                  </select>

                </div>

              </div>

              

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Tarjeta Q1 */}

                <div className="bg-white overflow-hidden shadow rounded-lg">

                  <div className="px-4 py-5 sm:p-6">

                    <div className="flex items-center">

                      <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">

                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />

                        </svg>

                      </div>

                      <div className="ml-5 w-0 flex-1">

                        <dl>

                          <dt className="text-sm font-medium text-gray-500 truncate">

                            Q1 - Primer Trimestre

                          </dt>

                          <dd className="flex items-baseline">

                            <div className="text-2xl font-semibold text-gray-900">

                              {contadoresPorAnio.Q1}

                            </div>

                            <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">

                              evaluaciones

                            </div>

                          </dd>

                        </dl>

                      </div>

                    </div>

                    <div className="mt-4">

                      <button

                        onClick={async () => {
                          setPeriodoSeleccionado('Q1');
                          // 🔥 CORRECCIÓN: Cargar historial con filtros dinámicos
                          const historialFiltrado = await cargarHistorialConFiltros('Q1', yearSeleccionado);
                          setHistorialEvaluaciones(historialFiltrado);
                          setEvaluacionesFiltradas(historialFiltrado);
                        }}

                        className="text-sm font-medium text-blue-600 hover:text-blue-500"

                      >

                        Ver detalles<span className="sr-only"> de Q1</span>

                      </button>

                    </div>

                  </div>

                </div>



                {/* Tarjeta Q2 */}

                <div className="bg-white overflow-hidden shadow rounded-lg">

                  <div className="px-4 py-5 sm:p-6">

                    <div className="flex items-center">

                      <div className="flex-shrink-0 bg-green-500 rounded-md p-3">

                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />

                        </svg>

                      </div>

                      <div className="ml-5 w-0 flex-1">

                        <dl>

                          <dt className="text-sm font-medium text-gray-500 truncate">

                            Q2 - Segundo Trimestre

                          </dt>

                          <dd className="flex items-baseline">

                            <div className="text-2xl font-semibold text-gray-900">

                              {contadoresPorAnio.Q2}

                            </div>

                            <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">

                              evaluaciones

                            </div>

                          </dd>

                        </dl>

                      </div>

                    </div>

                    <div className="mt-4">

                      <button

                        onClick={async () => {
                          setPeriodoSeleccionado('Q2');
                          // 🔥 CORRECCIÓN: Cargar historial con filtros dinámicos
                          const historialFiltrado = await cargarHistorialConFiltros('Q2', yearSeleccionado);
                          setHistorialEvaluaciones(historialFiltrado);
                          setEvaluacionesFiltradas(historialFiltrado);
                        }}

                        className="text-sm font-medium text-blue-600 hover:text-blue-500"

                      >

                        Ver detalles<span className="sr-only"> de Q2</span>

                      </button>

                    </div>

                  </div>

                </div>



                {/* Tarjeta Q3 */}

                <div className="bg-white overflow-hidden shadow rounded-lg">

                  <div className="px-4 py-5 sm:p-6">

                    <div className="flex items-center">

                      <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">

                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />

                        </svg>

                      </div>

                      <div className="ml-5 w-0 flex-1">

                        <dl>

                          <dt className="text-sm font-medium text-gray-500 truncate">

                            Q3 - Tercer Trimestre

                          </dt>

                          <dd className="flex items-baseline">

                            <div className="text-2xl font-semibold text-gray-900">

                              {contadoresPorAnio.Q3}

                            </div>

                            <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">

                              evaluaciones

                            </div>

                          </dd>

                        </dl>

                      </div>

                    </div>

                    <div className="mt-4">

                      <button

                        onClick={async () => {
                          setPeriodoSeleccionado('Q3');
                          // 🔥 CORRECCIÓN: Cargar historial con filtros dinámicos
                          const historialFiltrado = await cargarHistorialConFiltros('Q3', yearSeleccionado);
                          setHistorialEvaluaciones(historialFiltrado);
                          setEvaluacionesFiltradas(historialFiltrado);
                        }}

                        className="text-sm font-medium text-blue-600 hover:text-blue-500"

                      >

                        Ver detalles<span className="sr-only"> de Q3</span>

                      </button>

                    </div>

                  </div>

                </div>



                {/* Tarjeta Q4 */}

                <div className="bg-white overflow-hidden shadow rounded-lg">

                  <div className="px-4 py-5 sm:p-6">

                    <div className="flex items-center">

                      <div className="flex-shrink-0 bg-red-500 rounded-md p-3">

                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />

                        </svg>

                      </div>

                      <div className="ml-5 w-0 flex-1">

                        <dl>

                          <dt className="text-sm font-medium text-gray-500 truncate">

                            Q4 - Cuarto Trimestre

                          </dt>

                          <dd className="flex items-baseline">

                            <div className="text-2xl font-semibold text-gray-900">

                              {contadoresPorAnio.Q4}

                            </div>

                            <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">

                              evaluaciones

                            </div>

                          </dd>

                        </dl>

                      </div>

                    </div>

                    <div className="mt-4">

                      <button

                        onClick={async () => {
                          setPeriodoSeleccionado('Q4');
                          // 🔥 CORRECCIÓN: Cargar historial con filtros dinámicos
                          const historialFiltrado = await cargarHistorialConFiltros('Q4', yearSeleccionado);
                          setHistorialEvaluaciones(historialFiltrado);
                          setEvaluacionesFiltradas(historialFiltrado);
                        }}

                        className="text-sm font-medium text-blue-600 hover:text-blue-500"

                      >

                        Ver detalles<span className="sr-only"> de Q4</span>

                      </button>

                    </div>

                  </div>

                </div>

              </div>



              {/* Sección para mostrar las evaluaciones del trimestre seleccionado */}

              <div className="mt-8">

                <h3 className="text-lg font-medium text-gray-900 mb-4">

                  {periodoSeleccionado 

                    ? `Evaluaciones del ${periodoSeleccionado} ${yearSeleccionado}` 

                    : 'Selecciona un trimestre para ver las evaluaciones'}

                </h3>

                {!periodoSeleccionado ? (

                  <div className="text-center py-8 bg-gray-50 rounded-lg">

                    <svg

                      className="mx-auto h-12 w-12 text-gray-400"

                      fill="none"

                      viewBox="0 0 24 24"

                      stroke="currentColor"

                    >

                      <path

                        strokeLinecap="round"

                        strokeLinejoin="round"

                        strokeWidth={1}

                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"

                      />

                    </svg>

                    <h3 className="mt-2 text-sm font-medium text-gray-900">No has seleccionado un trimestre</h3>

                    <p className="mt-1 text-sm text-gray-500">

                      Haz clic en alguna de las tarjetas de arriba para ver las evaluaciones del trimestre.

                    </p>

                  </div>

                ) : evaluacionesFiltradas.length === 0 ? (

                  <div className="text-center py-8 bg-gray-50 rounded-lg">

                    <svg

                      className="mx-auto h-12 w-12 text-gray-400"

                      fill="none"

                      viewBox="0 0 24 24"

                      stroke="currentColor"

                    >

                      <path

                        strokeLinecap="round"

                        strokeLinejoin="round"

                        strokeWidth={1}

                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"

                      />

                    </svg>

                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay evaluaciones para este trimestre</h3>

                    <p className="mt-1 text-sm text-gray-500">

                      No se encontraron evaluaciones para el {periodoSeleccionado}.

                    </p>

                  </div>

                ) : (

                  <div className="overflow-x-auto">

                    <table className="min-w-full divide-y divide-gray-200">

                      <thead className="bg-gray-50">

                        <tr>

                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                            Empleado

                          </th>

                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                            Periodicidad

                          </th>

                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                            Fecha de Finalización

                          </th>

                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                            Calificación

                          </th>

                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                            Valoración

                          </th>

                          <th scope="col" className="relative px-6 py-3">

                            <span className="sr-only">Acciones</span>

                          </th>

                        </tr>

                      </thead>

                      <tbody className="bg-white divide-y divide-gray-200">

                        {evaluacionesFiltradas.map((evaluacion) => (

                          <tr key={`${evaluacion.id}-${evaluacion.periodo}-${evaluacion.anio}`}>

                            <td className="px-6 py-4 whitespace-nowrap">

                              <div className="flex items-center">

                                <div className="ml-4">

                                  <div className="text-sm font-medium text-gray-900">

                                    {evaluacion.evaluado?.nombre} {evaluacion.evaluado?.apellido || ''}

                                  </div>

                                  <div className="text-sm text-gray-500">{evaluacion.evaluado?.cargo?.nombre || evaluacion.evaluado?.cargo || 'Sin cargo'}</div>

                                </div>

                              </div>

                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">

                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${

                                evaluacion.periodicidad === 'anual' 

                                  ? 'bg-purple-100 text-purple-800' 

                                  : 'bg-blue-100 text-blue-800'

                              }`}>
                                {evaluacion.periodicidad === 'anual' ? 'Anual' : 'Trimestral'}

                              </span>

                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">

                              <div className="text-sm text-gray-900">

                                {evaluacion.fecha_fin ? (() => {

                                  const date = new Date(evaluacion.fecha_fin);

                                  if (Number.isNaN(date.getTime())) return 'Fecha inválida';

                                  

                                  // Usar UTC como en SeguimientoPage

                                  const year = date.getUTCFullYear().toString().slice(-2);

                                  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

                                  const day = String(date.getUTCDate()).padStart(2, '0');

                                  

                                  return `${day}/${month}/${year}`;

                                })() : 'No finalizada'}

                              </div>

                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">

                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${

                                evaluacion.puntuacion_total >= 4 ? 'bg-green-100 text-green-800' : 

                                evaluacion.puntuacion_total >= 3 ? 'bg-yellow-100 text-yellow-800' : 

                                'bg-red-100 text-red-800'

                              }`}>

                                {evaluacion.puntuacion_total ? parseFloat(evaluacion.puntuacion_total).toFixed(1) : 'N/A'}

                              </span>

                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              {(() => {
                                // Mostrar valoración según periodicidad
                                const valoracionMostrada = evaluacion.periodicidad === 'anual' 
                                  ? evaluacion.valoracion_anual 
                                  : evaluacion.valoracion_trimestral;

                                return valoracionMostrada ? (
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  valoracionMostrada === 'EXCELENTE' ? 'bg-purple-100 text-purple-700' :
                                  valoracionMostrada === 'SOBRESALIENTE' ? 'bg-blue-100 text-blue-700' :
                                  valoracionMostrada === 'BUENO' ? 'bg-green-100 text-green-700' :
                                  valoracionMostrada === 'ACEPTABLE' ? 'bg-yellow-100 text-yellow-700' :
                                  valoracionMostrada === 'DESTACADO' ? 'bg-indigo-100 text-indigo-700' :
                                  valoracionMostrada === 'BAJO' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}> 
                                  {valoracionMostrada}
                                </span>
                                ) : (
                                <span className="text-sm text-gray-400">-</span>
                                );
                              })()}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">

                              <button

                                onClick={() => {

                                  setEvaluacionIdActual(evaluacion.id);

                                  setModalVerEvaluacionVisible(true);

                                }}

                                className="text-blue-600 hover:text-blue-900"

                              >

                                Ver Evaluación

                              </button>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </div>

          )}

        </div>

        </div>

        </main>

      </div>

      {/* Modal de Evaluación */}
      <EvaluacionModal

        visible={modalEvaluacionVisible}

        onClose={handleModalClose}

        evaluacionId={evaluacionIdActual}

        onSuccess={handleModalSuccess}

      />



      {/* Modal para Ver Evaluación */}

      <VerEvaluacionModal

        visible={modalVerEvaluacionVisible}

        onClose={handleVerModalClose}

        evaluacionId={evaluacionIdActual}

      />

    </div>

  );

};



export default EvaluadorDashboard;

