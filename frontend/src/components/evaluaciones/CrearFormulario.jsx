import React, { useState, useEffect } from 'react';
import { 
  Tabs, 
  Button, 
  Form, 
  Input, 
  Switch, 
  Select, 
  List, 
  message, 
  Space, 
  Card, 
  Modal,
  Divider,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined,
  EyeOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { crearFormulario, obtenerPreguntasExistentes } from '../../services/formularioService';
import { obtenerDepartamentos, obtenerCargosPorDepartamento } from '../../services/departamentoService';
import { obtenerCargos } from '../../services/cargoService';
import { obtenerEmpresas } from '../../services/empresaService';

const { TextArea } = Input;
const { Option } = Select;

const CrearFormulario = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('competencias');
  const [departamentos, setDepartamentos] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [cargoSeleccionado, setCargoSeleccionado] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [periodicidad, setPeriodicidad] = useState('trimestral');
  
  // Estados diferentes según periodicidad
  const [preguntas, setPreguntas] = useState({
    competencias: [],
    experiencia: [],
    convivencia: [],
    desempeno: []
  });
  
  // Estados para formularios trimestrales
  const [seccionesTrimestral, setSeccionesTrimestral] = useState([]);
  const [preguntasTrimestral, setPreguntasTrimestral] = useState([]);
  
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  
  // Nuevos estados para preguntas existentes
  const [preguntasExistentes, setPreguntasExistentes] = useState({
    competencias: [],
    experiencia: [],
    convivencia: [],
    desempeno: []
  });
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);
  const [preguntasSeleccionadas, setPreguntasSeleccionadas] = useState(new Set());
  
  // Estado para controlar si el formulario tiene campos de comentarios
  const [tieneComentarios, setTieneComentarios] = useState(true);

  useEffect(() => {
    if (open) {
      cargarEmpresas();
      cargarDepartamentos();
      form.resetFields();
      setCargoSeleccionado(null);
      setPreguntas({
        competencias: [],
        experiencia: [],
        convivencia: [],
        desempeno: []
      });
      setSeccionesTrimestral([]);
      setTieneComentarios(true); // Mantener activado por defecto al resetear
    }
  }, [open, form]);

  const cargarEmpresas = async () => {
    try {
      const data = await obtenerEmpresas();
      setEmpresas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      message.error('Error al cargar la lista de empresas');
      setEmpresas([]);
    }
  };

  const handleEmpresaChange = async (empresaId) => {
    form.setFieldsValue({ departamento_id: undefined });
    setCargos([]);
    setCargoSeleccionado(null);
    await cargarDepartamentos(empresaId);
  };

  const cargarDepartamentos = async (empresaId = null) => {
    try {
      const data = await obtenerDepartamentos(empresaId);
      setDepartamentos(Array.isArray(data) ? data : []);
      setCargos([]); // No cargar cargos hasta que se seleccione un departamento
    } catch (error) {
      console.error('Error al cargar departamentos:', error);
      message.error('Error al cargar la lista de departamentos');
      setDepartamentos([]);
    }
  };

  const handleDepartamentoChange = async (departamentoId) => {
    if (!departamentoId) {
      // Si no hay departamento seleccionado, no mostrar cargos
      setCargos([]);
      setCargoSeleccionado(null);
      return;
    }
    
    try {
      const cargosData = await obtenerCargosPorDepartamento(departamentoId);
      setCargos(Array.isArray(cargosData) ? cargosData : []);
      setCargoSeleccionado(null); // Limpiar selección al cambiar de departamento
    } catch (error) {
      console.error('Error al cargar cargos del departamento:', error);
      message.error('Error al cargar los cargos del departamento');
      setCargos([]);
    }
  };

  const handleCargoChange = async (cargoId) => {
    const cargo = cargos.find(c => c.id === cargoId);
    setCargoSeleccionado(cargo);
    
    // Actualizar automáticamente el nombre y descripción del formulario
    if (cargo) {
      // Obtener la periodicidad seleccionada
      const periodicidad = form.getFieldValue('periodicidad') || 'trimestral';
      const periodicidadText = periodicidad === 'anual' ? 'ANUAL' : 'TRIMESTRAL';
      
      const nombreFormulario = `Evaluación de Desempeño ${periodicidadText} - ${cargo.nombre}`;
      
      // Obtener el departamento seleccionado
      const departamentoId = form.getFieldValue('departamento_id');
      const departamento = departamentos.find(d => d.id === departamentoId);
      const nombreDepartamento = departamento ? departamento.nombre : 'departamento seleccionado';
      
      const descripcionFormulario = periodicidad === 'anual' 
        ? `Evaluación anual de desempeño para el cargo ${cargo.nombre}.`
        : `Evaluación trimestral de desempeño para el cargo ${cargo.nombre}.`;
      
      form.setFieldsValue({
        nombre: nombreFormulario,
        descripcion: descripcionFormulario
      });
      
      // Cargar preguntas existentes del departamento
      await cargarPreguntasExistentes(departamentoId);
    } else {
      // Limpiar preguntas existentes si no hay cargo seleccionado
      setPreguntasExistentes({
        competencias: [],
        experiencia: [],
        convivencia: [],
        desempeno: []
      });
      setPreguntasSeleccionadas(new Set());
    }
  };
  
  // Nueva función para cargar preguntas existentes
  const cargarPreguntasExistentes = async (departamentoId) => {
    if (!departamentoId) return;
    
    setLoadingPreguntas(true);
    try {
      // Cargar preguntas para todos los apartados
      const apartados = ['competencias', 'experiencia', 'convivencia', 'desempeno'];
      const preguntasPorApartado = {};
      
      for (const apartado of apartados) {
        const response = await obtenerPreguntasExistentes(departamentoId, apartado);
        preguntasPorApartado[apartado] = response.data?.preguntas || [];
      }
      
      setPreguntasExistentes(preguntasPorApartado);
    } catch (error) {
      console.error('Error al cargar preguntas existentes:', error);
      message.error('Error al cargar preguntas existentes');
    } finally {
      setLoadingPreguntas(false);
    }
  };

  // Función para manejar la selección de preguntas existentes
  const handlePreguntaExistenteChange = (preguntaId, checked) => {
    const nuevasSeleccionadas = new Set(preguntasSeleccionadas);
    if (checked) {
      nuevasSeleccionadas.add(preguntaId);
    } else {
      nuevasSeleccionadas.delete(preguntaId);
    }
    setPreguntasSeleccionadas(nuevasSeleccionadas);
  };
  
  // Función para reutilizar preguntas seleccionadas
  const reutilizarPreguntasSeleccionadas = () => {
    const preguntasActuales = preguntasExistentes[activeTab];
    const preguntasReutilizadas = preguntasActuales.filter(p => preguntasSeleccionadas.has(p.id));
    
    // Agregar preguntas reutilizadas al estado local
    setPreguntas(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], ...preguntasReutilizadas.map(p => ({
        ...p,
        reutilizar: true,
        id: p.id // Mantener el ID original para referencia
      }))]
    }));
    
    // Limpiar selección
    setPreguntasSeleccionadas(new Set());
    message.success(`${preguntasReutilizadas.length} pregunta(s) reutilizadas`);
  };

  // Funciones para formularios trimestrales
  const agregarSeccionTrimestral = () => {
    const nombreSeccion = form.getFieldValue('nombreSeccion');
    if (!nombreSeccion || nombreSeccion.trim() === '') {
      message.error('El nombre de la sección es requerido');
      return;
    }

    const nuevaSeccion = {
      id: Date.now(),
      nombre: nombreSeccion.trim()
    };

    setSeccionesTrimestral([...seccionesTrimestral, nuevaSeccion]);
    form.resetFields(['nombreSeccion']);
    message.success('Sección agregada correctamente');
  };

  const eliminarSeccionTrimestral = (id) => {
    setSeccionesTrimestral(seccionesTrimestral.filter(s => s.id !== id));
    // También eliminar preguntas asociadas a esta sección
    setPreguntasTrimestral(preguntasTrimestral.filter(p => p.seccionId !== id));
  };

  const agregarPreguntaTrimestral = () => {
    const seccionId = form.getFieldValue('seccionSeleccionada');
    const enunciado = form.getFieldValue('enunciadoTrimestral');
    
    if (!seccionId) {
      message.error('Debe seleccionar una sección');
      return;
    }
    
    if (!enunciado || enunciado.trim() === '') {
      message.error('El enunciado de la pregunta es requerido');
      return;
    }

    const nuevaPregunta = {
      id: Date.now(),
      seccionId: parseInt(seccionId),
      enunciado: enunciado.trim()
    };

    setPreguntasTrimestral([...preguntasTrimestral, nuevaPregunta]);
    form.resetFields(['enunciadoTrimestral']);
    message.success('Pregunta agregada correctamente');
  };

  const eliminarPreguntaTrimestral = (id) => {
    setPreguntasTrimestral(preguntasTrimestral.filter(p => p.id !== id));
  };

  const onFinish = async (values) => {
    // Validaciones según periodicidad
    if (periodicidad === 'anual') {
      // Validar que se haya seleccionado un cargo para formularios anuales
      if (!cargoSeleccionado) {
        message.error('Debe seleccionar un cargo para la evaluación anual');
        return;
      }

      // Validar que haya al menos una pregunta
      const totalPreguntas = preguntas.competencias.length + preguntas.experiencia.length + 
                            preguntas.convivencia.length + preguntas.desempeno.length;
      
      if (totalPreguntas === 0) {
        message.error('Debe agregar al menos una pregunta para crear el formulario anual');
        return;
      }
    } else {
      // Validaciones para formularios trimestrales
      if (seccionesTrimestral.length === 0) {
        message.error('Debe agregar al menos una sección para el formulario trimestral');
        return;
      }
      
      const totalPreguntas = preguntasTrimestral.length;
      if (totalPreguntas === 0) {
        message.error('Debe agregar al menos una pregunta para el formulario trimestral');
        return;
      }
    }

    setLoading(true);
    try {
      let formulario = {
        nombre: values.nombre,
        descripcion: values.descripcion,
        estado: 'activo',
        periodicidad: periodicidad,
        preguntas: []
      };

      if (periodicidad === 'anual') {
        // Lógica para formulario anual
        // Enviar cargo_id y empresa_id
        formulario.cargo_id = cargoSeleccionado.id;
        formulario.empresa_id = values.empresa_id; // Enviar empresa_id seleccionada
        
        // Combinar todas las preguntas de los diferentes apartados
        formulario.preguntas = [
          ...preguntas.competencias.map(p => ({ 
            ...p, 
            apartado: 'competencias',
            tipo: 'opcion_multiple',
            cargos: [cargoSeleccionado.id]
          })),
          ...preguntas.experiencia.map(p => ({ 
            ...p, 
            apartado: 'experiencia',
            tipo: 'opcion_multiple',
            cargos: [cargoSeleccionado.id]
          })),
          ...preguntas.convivencia.map(p => ({ 
            ...p, 
            apartado: 'convivencia',
            tipo: 'opcion_multiple',
            cargos: [cargoSeleccionado.id]
          })),
          ...preguntas.desempeno.map(p => ({ 
            ...p, 
            apartado: 'desempeno',
            tipo: 'opcion_multiple',
            cargos: [cargoSeleccionado.id]
          }))
        ];

        // Transformar opciones al formato esperado
        formulario.preguntas = formulario.preguntas.map(pregunta => ({
          enunciado: pregunta.enunciado,
          apartado: pregunta.apartado,
          tipo: 'opcion_multiple',
          opciones: pregunta.opciones.map(opcion => ({
            valor: opcion.texto || opcion.valor,
            puntuacion: parseInt(opcion.puntaje || opcion.puntuacion, 10)
          })),
          obligatoria: pregunta.obligatoria,
          peso: pregunta.peso,
          ...(pregunta.reutilizar && { id: pregunta.id, reutilizar: true })
        }));

        // Si el switch de comentarios está activado, agregar las dos preguntas abiertas
        if (tieneComentarios) {
          formulario.preguntas.push(
            {
              enunciado: 'ÁREAS DE MEJORAMIENTO',
              apartado: 'comentarios',
              tipo: 'abierta',
              opciones: null,
              obligatoria: false,
              peso: 0
            },
            {
              enunciado: 'FORTALEZAS',
              apartado: 'comentarios',
              tipo: 'abierta',
              opciones: null,
              obligatoria: false,
              peso: 0
            }
          );
        }
      } else {
        // Lógica para formulario trimestral
        // No se envía cargo_id, pero sí empresa_id
        
        // Agregar empresa_id del formulario
        formulario.empresa_id = values.empresa_id;
        
        // Construir preguntas en el orden correcto: título -> preguntas -> título -> preguntas
        seccionesTrimestral.forEach(seccion => {
          // Agregar título de sección
          formulario.preguntas.push({
            enunciado: seccion.nombre,
            tipo: 'titulo_seccion',
            apartado: null,
            opciones: null,
            obligatoria: false,
            peso: 0
          });
          
          // Agregar preguntas de esta sección inmediatamente después
          const preguntasDeSeccion = preguntasTrimestral.filter(p => p.seccionId === seccion.id);
          preguntasDeSeccion.forEach(pregunta => {
            formulario.preguntas.push({
              enunciado: pregunta.enunciado,
              tipo: 'escala',
              apartado: null,
              opciones: [
                { valor: "1", puntuacion: 1 },
                { valor: "2", puntuacion: 2 },
                { valor: "3", puntuacion: 3 },
                { valor: "4", puntuacion: 4 }
              ],
              obligatoria: true,
              peso: 1.0
            });
          });
        });
        
        // Agregar título para comentarios y preguntas de comentarios
        formulario.preguntas.push({
          enunciado: 'COMENTARIOS FINALES',
          tipo: 'titulo_seccion',
          apartado: null,
          opciones: null,
          obligatoria: false,
          peso: 0
        });
        
        // Agregar preguntas de comentarios para formularios trimestrales (mismos que anuales + 1 adicional)
        formulario.preguntas.push(
          {
            enunciado: 'ÁREAS DE MEJORAMIENTO',
            tipo: 'abierta',
            apartado: null, // Para trimestrales no usar apartado
            opciones: null,
            obligatoria: false,
            peso: 0
          },
          {
            enunciado: 'COMENTARIOS ADICIONALES',
            tipo: 'abierta',
            apartado: null, // Para trimestrales no usar apartado
            opciones: null,
            obligatoria: false,
            peso: 0
          },
          {
            enunciado: "ACCIONES RECOMENDADAS PARA EL MEJORAMIENTO",
            tipo: 'abierta',
            apartado: null, // Para trimestrales no usar apartado
            opciones: null,
            obligatoria: false,
            peso: 0
          }
        );
      }

      await crearFormulario(formulario);
      message.success('Formulario creado exitosamente');
      form.resetFields();
      setCargoSeleccionado(null);
      setPeriodicidad('trimestral');
      setPreguntas({
        competencias: [],
        experiencia: [],
        convivencia: [],
        desempeno: []
      });
      setSeccionesTrimestral([]);
      setPreguntasTrimestral([]);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      message.error('Error al crear el formulario');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const agregarPregunta = () => {
    // Validar solo el enunciado antes de agregar
    const enunciadoValue = form.getFieldValue(`${activeTab}_enunciado`);
    if (!enunciadoValue || enunciadoValue.trim() === '') {
      message.error('El enunciado de la pregunta es requerido');
      return;
    }

    // Validar que haya opciones
    const opcionesValue = form.getFieldValue(`${activeTab}_opciones`);
    if (!opcionesValue || opcionesValue.length === 0) {
      message.error('Debe agregar al menos una opción de respuesta');
      return;
    }

    // Validar que cada opción tenga valor y puntuación
    for (let i = 0; i < opcionesValue.length; i++) {
      const opcion = opcionesValue[i];
      if (!opcion.texto || opcion.texto.trim() === '') {
        message.error(`La opción #${i + 1} debe tener un texto`);
        return;
      }
      if (!opcion.puntaje || opcion.puntaje.toString().trim() === '') {
        message.error(`La opción #${i + 1} debe tener una puntuación`);
        return;
      }
      if (isNaN(parseInt(opcion.puntaje, 10))) {
        message.error(`La opción #${i + 1} debe tener una puntuación numérica válida`);
        return;
      }
    }

    const nuevaPregunta = {
      enunciado: enunciadoValue.trim(),
      tipo: 'opcion_multiple', // Siempre opción múltiple
      opciones: opcionesValue,
      obligatoria: form.getFieldValue(`${activeTab}_obligatoria`) !== false,
      peso: 1.0,
    };

    setPreguntas(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], nuevaPregunta]
    }));

    // Limpiar campos después de agregar
    form.resetFields([`${activeTab}_enunciado`, `${activeTab}_opciones`, `${activeTab}_obligatoria`]);
  };

  const eliminarPregunta = (index) => {
    setPreguntas(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter((_, i) => i !== index)
    }));
  };

  const getTituloApartado = (key) => {
    const titulos = {
      competencias: 'Competencias',
      experiencia: 'Experiencia',
      convivencia: 'Convivencia',
      desempeno: 'Desempeño'
    };
    return titulos[key] || key;
  };

  const getTipoPreguntaLabel = (tipo) => {
    // Todas las preguntas son de opción múltiple
    return 'Opción múltiple';
  };

  const handlePreview = () => {
    const todasLasPreguntas = [
      ...preguntas.competencias.map(p => ({ ...p, apartado: 'competencias' })),
      ...preguntas.experiencia.map(p => ({ ...p, apartado: 'experiencia' })),
      ...preguntas.convivencia.map(p => ({ ...p, apartado: 'convivencia' })),
      ...preguntas.desempeno.map(p => ({ ...p, apartado: 'desempeno' }))
    ];

    if (todasLasPreguntas.length === 0) {
      message.warning('No hay preguntas para previsualizar');
      return;
    }

    setPreviewData({
      ...form.getFieldsValue(),
      preguntas: todasLasPreguntas
    });
    setPreviewVisible(true);
  };

  const renderEditorPregunta = () => (
    <Card 
      title={`Crear pregunta/criterio de ${getTituloApartado(activeTab)}`} 
      style={{ marginBottom: 16 }}
      size="small"
    >
      <Form.Item
        name={`${activeTab}_enunciado`}
        label="Enunciado"
      >
        <TextArea rows={2} placeholder="Escriba aquí la pregunta" />
      </Form.Item>

      <Form.List name={`${activeTab}_opciones`}>
        {(fields, { add, remove }) => (
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold', margin: 0, marginRight: '8px' }}>
                Opciones de respuesta
              </label>
              <Button 
                type="primary" 
                ghost
                onClick={() => add()} 
                icon={<PlusOutlined />} 
                size="small"
                style={{ 
                  height: '28px',
                  fontWeight: '500',
                  borderStyle: 'dashed',
                  borderWidth: '2px'
                }}
              />
            </div>
            {fields.map(({ key, name, ...restField }) => (
              <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                <Form.Item
                  {...restField}
                  name={[name, 'texto']}
                  rules={[{ required: true, message: 'La opción no puede estar vacía' }]}
                  style={{ flex: 2 }}
                >
                  <Input placeholder="Texto de la opción" />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'puntaje']}
                  initialValue={0}
                  rules={[{ required: true, message: 'El puntaje es requerido' }]}
                  style={{ flex: 1 }}
                >
                  <Input 
                    type="number" 
                    placeholder="Puntaje" 
                    min={0}
                    max={100}
                  />
                </Form.Item>
                <DeleteOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
              </Space>
            ))}
          </>
        )}
      </Form.List>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
        <Form.Item
          name={`${activeTab}_obligatoria`}
          valuePropName="checked"
          initialValue={true}
          style={{ margin: 0 }}
        >
          <Switch 
            checkedChildren="Obligatoria" 
            unCheckedChildren="Opcional" 
            defaultChecked 
          />
        </Form.Item>

        <Button 
          type="primary" 
          onClick={agregarPregunta}
          icon={<PlusOutlined />}
          disabled={!cargoSeleccionado}
        >
          Agregar Pregunta
        </Button>
      </div>
      
      {!cargoSeleccionado && (
        <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '8px' }}>
          Debe seleccionar un cargo antes de agregar
        </div>
      )}
    </Card>
  );

  const renderPreviewModal = () => (
    <Modal
      title={
        <div>
          <span>Vista previa del formulario</span>
          {previewData?.periodicidad && (
            <Tag 
              color={previewData.periodicidad === 'anual' ? 'blue' : 'green'} 
              style={{ marginLeft: 12 }}
            >
              {previewData.periodicidad === 'anual' ? '📆 Anual' : '📅 Trimestral'}
            </Tag>
          )}
        </div>
      }
      open={previewVisible}
      onCancel={() => setPreviewVisible(false)}
      footer={[
        <Button key="close" onClick={() => setPreviewVisible(false)}>
          Cerrar
        </Button>
      ]}
      width={900}
    >
      {previewData && (
        <div>
          {/* Información general del formulario */}
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f8f9fa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: '#1890ff' }}>{previewData.nombre}</h3>
                <p style={{ margin: '8px 0 0 0', color: '#666' }}>{previewData.descripcion}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Tag color={previewData.periodicidad === 'anual' ? 'blue' : 'green'}>
                  {previewData.periodicidad === 'anual' ? '📆 Evaluación Anual' : '📅 Evaluación Trimestral'}
                </Tag>
                <br />
                <Tag color="default" style={{ marginTop: 4 }}>
                  👤 {cargoSeleccionado?.nombre || 'Cargo seleccionado'}
                </Tag>
              </div>
            </div>
          </Card>

          <Divider />

          {/* Preguntas por apartado */}
          {['competencias', 'experiencia', 'convivencia', 'desempeno'].map(apartado => {
            const preguntasApartado = previewData.preguntas.filter(p => p.apartado === apartado);
            if (preguntasApartado.length === 0) return null;
            
            return (
              <Card 
                key={apartado} 
                size="small" 
                title={
                  <span>
                    {getTituloApartado(apartado)}
                    <Tag style={{ marginLeft: 8 }} count={preguntasApartado.length} />
                  </span>
                }
                style={{ marginBottom: 16 }}
              >
                <List
                  itemLayout="vertical"
                  dataSource={preguntasApartado}
                  renderItem={(pregunta, index) => (
                    <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 500, color: '#262626' }}>
                            {index + 1}. {pregunta.enunciado}
                          </span>
                          {pregunta.obligatoria && (
                            <Tag color="red" size="small" style={{ marginLeft: 8 }}>
                              Obligatoria
                            </Tag>
                          )}
                        </div>
                        
                        <div style={{ marginLeft: 16, color: '#666' }}>
                          <div style={{ marginBottom: 4 }}>
                            <strong>Tipo:</strong> 
                            <Tag size="small" style={{ marginLeft: 4 }}>
                              {pregunta.tipo === 'abierta' ? '📝 Abierta' : '🔘 Opción múltiple'}
                            </Tag>
                          </div>
                          
                          {pregunta.tipo === 'opcion_multiple' && pregunta.opciones && pregunta.opciones.length > 0 && (
                            <div style={{ marginBottom: 4 }}>
                              <strong>Opciones:</strong>
                              <div style={{ marginTop: 4, marginLeft: 8 }}>
                                {pregunta.opciones.map((opcion, idx) => (
                                  <div key={idx} style={{ padding: '2px 0' }}>
                                    • {opcion.texto || opcion.valor} 
                                    <Tag color="blue" size="small" style={{ marginLeft: 4 }}>
                                      {opcion.puntaje || opcion.puntuacion} pts
                                    </Tag>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <strong>Aplica a:</strong> 
                            <Tag color="default" size="small" style={{ marginLeft: 4 }}>
                              {cargoSeleccionado?.nombre || 'Cargo seleccionado'}
                            </Tag>
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            );
          })}

          {/* Preguntas de comentarios si están habilitadas */}
          {previewData.preguntas.some(p => p.apartado === 'comentarios') && (
            <Card 
              size="small" 
              title="📝 Comentarios Finales" 
              style={{ marginBottom: 16, backgroundColor: '#f6ffed' }}
            >
              <List
                itemLayout="horizontal"
                dataSource={previewData.preguntas.filter(p => p.apartado === 'comentarios')}
                renderItem={(pregunta) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          {pregunta.enunciado}
                          <Tag color="default" size="small" style={{ marginLeft: 8 }}>
                            Opcional
                          </Tag>
                        </span>
                      }
                      description="Respuesta abierta para comentarios del evaluador"
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* Resumen */}
          <Card size="small" style={{ backgroundColor: '#e6f7ff', marginTop: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <strong>Resumen del formulario:</strong>
              <div style={{ marginTop: 8 }}>
                <Tag color="blue">
                  📋 {previewData.preguntas.filter(p => p.tipo === 'opcion_multiple').length} Preguntas de opción múltiple
                </Tag>
                {previewData.preguntas.some(p => p.apartado === 'comentarios') && (
                  <Tag color="green">
                    📝 2 Campos de comentarios
                  </Tag>
                )}
                <Tag color="orange">
                  ⭐ {previewData.preguntas.filter(p => p.obligatoria).length} Obligatorias
                </Tag>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          estado: 'activo',
          periodicidad: 'trimestral',
          nombre: 'EVALUACIÓN DESEMPEÑO LABORAL PERÍODO DE PRUEBA',
          descripcion: 'Formulario trimestral de evaluación de desempeño.'
        }}
      >
        {/* Información básica del formulario */}
        <Card 
          title="Información del Formulario" 
          style={{ marginBottom: 24 }}
          size="small"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="nombre"
              label="Nombre de la evaluación"
              rules={[{ required: true, message: 'El nombre es requerido' }]}
            >
              <Input 
                placeholder="EVALUACIÓN DE DESEMPEÑO" 
              />
            </Form.Item>

            <Form.Item
              name="periodicidad"
              label="Periodicidad del Formulario"
              rules={[{ required: true, message: 'Seleccione la periodicidad' }]}
            >
              <Select 
                placeholder="Seleccione periodicidad"
                onChange={(value) => {
                  setPeriodicidad(value);
                  const periodicidadText = value === 'anual' ? 'ANUAL' : 'TRIMESTRAL';
                  form.setFieldsValue({
                    nombre: value === 'anual' 
                      ? 'EVALUACIÓN ANUAL DE DESEMPEÑO LABORAL'
                      : 'EVALUACIÓN DESEMPEÑO LABORAL PERÍODO DE PRUEBA',
                    descripcion: value === 'anual' 
                      ? 'Formulario anual con cálculo por apartados.'
                      : 'Formulario trimestral de evaluación de desempeño.'
                  });
                }}
              >
                <Option value="trimestral">
                  <div>
                    <div className="font-medium">📅 Trimestral</div>
                    <div className="text-xs text-gray-500">Para todos los empleados </div>
                  </div>
                </Option>
                <Option value="anual">
                  <div>
                    <div className="font-medium">📆 Anual</div>
                    <div className="text-xs text-gray-500">Por cargo específico con cálculo por apartados</div>
                  </div>
                </Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="descripcion"
            label="Descripción"
            rules={[{ required: true, message: 'La descripción es requerida' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="Descripción del formulario"
            />
          </Form.Item>
        </Card>

        {/* Sección dinámica según periodicidad */}
        {periodicidad === 'anual' ? (
          /* Formulario Anual */
          <Card 
            title="Configuración de Evaluación Anual" 
            style={{ marginBottom: 24 }}
            size="small"
          >
            {/* Sección de selección de departamento y cargo */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
              {/* Campo de empresa solo para formularios anuales - al lado izquierdo */}
              {periodicidad === 'anual' && (
                <div style={{ flex: 1 }}>
                  <Form.Item
                    name="empresa_id"
                    label="Empresa"
                    rules={[{ required: true, message: 'Seleccione una empresa' }]}
                  >
                    <Select
                      placeholder="Seleccione una empresa"
                      onChange={handleEmpresaChange}
                      allowClear
                    >
                      {empresas.map(empresa => (
                        <Option key={empresa.id} value={empresa.id}>
                          {empresa.nombre}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
              )}
              
              <div style={{ flex: periodicidad === 'anual' ? 1 : 2 }}>
                <Form.Item
                  name="departamento_id"
                  label="Departamento/Proceso"
                  rules={[{ required: true, message: 'Seleccione un departamento' }]}
                >
                  <Select
                    placeholder="Seleccione un departamento"
                    onChange={handleDepartamentoChange}
                    allowClear
                    disabled={periodicidad === 'anual' && !form.getFieldValue('empresa_id')}
                  >
                    {departamentos.map(depto => (
                      <Option key={depto.id} value={depto.id}>
                        {depto.nombre}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
              
              <div style={{ flex: 1 }}>
                <Form.Item
                  name="cargo_id"
                  label="Cargo"
                  rules={[{ required: true, message: 'Seleccione un cargo' }]}
                >
                  <Select
                    placeholder="Seleccione un cargo"
                    onChange={handleCargoChange}
                    allowClear
                    disabled={cargos.length === 0}
                  >
                    {cargos.map(cargo => (
                      <Option key={cargo.id} value={cargo.id}>
                        {cargo.nombre}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </div>

            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={['competencias', 'experiencia', 'convivencia', 'desempeno'].map(apartado => ({
                key: apartado,
                label: getTituloApartado(apartado),
                children: (
                  <>
                    {renderEditorPregunta()}
                    
                    {/* Sección de preguntas existentes para reutilizar */}
                    {cargoSeleccionado && (
                      <Card 
                        title={`Preguntas existentes de ${getTituloApartado(apartado)}`} 
                        style={{ marginBottom: 16 }}
                        size="small"
                      >
                        {loadingPreguntas ? (
                          <div style={{ textAlign: 'center', padding: '20px' }}>
                            <div>Cargando preguntas existentes...</div>
                          </div>
                        ) : (
                          <List
                            dataSource={preguntasExistentes[apartado]}
                            renderItem={(pregunta) => (
                              <List.Item
                                actions={[
                                  <input
                                    type="checkbox"
                                    checked={preguntasSeleccionadas.has(pregunta.id)}
                                    onChange={(e) => handlePreguntaExistenteChange(pregunta.id, e.target.checked)}
                                  />
                                ]}
                              >
                                <List.Item.Meta
                                  title={pregunta.enunciado}
                                  description={`Tipo: ${pregunta.tipo || 'texto'} | Obligatoria: ${pregunta.obligatoria ? 'Sí' : 'No'}`}
                                />
                              </List.Item>
                            )}
                          />
                        )}
                        
                        {preguntasSeleccionadas.size > 0 && (
                          <div style={{ marginTop: 16, textAlign: 'right' }}>
                            <Space>
                              <span>{preguntasSeleccionadas.size} pregunta(s) seleccionada(s)</span>
                              <Button 
                                type="primary" 
                                size="small"
                                onClick={reutilizarPreguntasSeleccionadas}
                              >
                                Reutilizar Seleccionadas
                              </Button>
                            </Space>
                          </div>
                        )}
                      </Card>
                    )}
                    
                    <h3>Preguntas de {getTituloApartado(apartado)}</h3>
                    
                    <List
                      itemLayout="horizontal"
                      dataSource={preguntas[apartado]}
                      renderItem={(pregunta, index) => (
                        <List.Item
                          actions={[
                            <Button 
                              type="text" 
                              icon={<DeleteOutlined />} 
                              onClick={() => eliminarPregunta(index)}
                              danger
                            />
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <span>
                                {pregunta.enunciado} 
                                {pregunta.obligatoria && <Tag color="red" style={{ marginLeft: 8 }}>Obligatoria</Tag>}
                              </span>
                            }
                            description={
                              <div>
                                <p><strong>Tipo:</strong> Opción múltiple</p>
                                {pregunta.opciones && pregunta.opciones.length > 0 && (
                                  <p><strong>Opciones:</strong> {pregunta.opciones.map(o => `${o.texto} (${o.puntaje} pts)`).join(', ')}</p>
                                )}
                                <p><strong>Aplica a:</strong> {cargoSeleccionado?.nombre || 'Cargo seleccionado'}</p>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </>
                )
              }))}
            />
          </Card>
        ) : (
          /* Formulario Trimestral */
          <Card 
            title="Configuración de Evaluación Trimestral" 
            style={{ marginBottom: 24 }}
            size="small"
          >
            {/* Selector de empresa para formularios trimestrales */}
            <div style={{ marginBottom: 16 }}>
              <Form.Item
                name="empresa_id"
                label="Empresa"
                rules={[{ required: true, message: 'Seleccione una empresa' }]}
              >
                <Select
                  placeholder="Seleccione una empresa"
                  allowClear
                >
                  {empresas.map(empresa => (
                    <Option key={empresa.id} value={empresa.id}>
                      {empresa.nombre}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            {/* Sección para crear secciones */}
            <Card 
              title="Secciones de Evaluación" 
              size="small" 
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <Form.Item
                  name="nombreSeccion"
                  style={{ flex: 1, marginBottom: 0 }}
                >
                  <Input placeholder="Ej: ORIENTACIÓN A RESULTADOS" />
                </Form.Item>
                <Button 
                  type="primary" 
                  onClick={agregarSeccionTrimestral}
                  icon={<PlusOutlined />}
                >
                  Agregar Sección
                </Button>
              </div>

              {/* Lista de secciones */}
              {seccionesTrimestral.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>Secciones creadas:</h4>
                  {seccionesTrimestral.map(seccion => (
                    <div key={seccion.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontWeight: 500 }}>{seccion.nombre}</span>
                      <Button 
                        type="text" 
                        danger 
                        size="small"
                        onClick={() => eliminarSeccionTrimestral(seccion.id)}
                        icon={<DeleteOutlined />}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Sección para crear preguntas */}
            {seccionesTrimestral.length > 0 && (
              <Card 
                title="Preguntas de Evaluación (Escala 1-4)" 
                size="small"
              >
                <div style={{ marginBottom: 16 }}>
                  <Form.Item
                    name="seccionSeleccionada"
                    label="Seleccionar Sección"
                    style={{ marginBottom: '8px' }}
                  >
                    <Select placeholder="Seleccione una sección">
                      {seccionesTrimestral.map(seccion => (
                        <Option key={seccion.id} value={seccion.id}>
                          {seccion.nombre}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="enunciadoTrimestral"
                    label="Enunciado de la Pregunta"
                    style={{ marginBottom: '8px' }}
                  >
                    <TextArea 
                      rows={2} 
                      placeholder="Ej: Cumple con oportunidad en función de estándares, objetivos y metas establecidas por la entidad..."
                    />
                  </Form.Item>

                  <Button 
                    type="primary" 
                    onClick={agregarPreguntaTrimestral}
                    icon={<PlusOutlined />}
                    style={{ width: '100%' }}
                  >
                    Agregar Pregunta
                  </Button>
                </div>

                {/* Lista de preguntas por sección */}
            {seccionesTrimestral.length > 0 && preguntasTrimestral.length > 0 && (
              <Card 
                title="Preguntas Organizadas por Sección" 
                size="small"
                style={{ marginTop: 16 }}
              >
                {seccionesTrimestral.map(seccion => {
                  const preguntasDeSeccion = preguntasTrimestral.filter(p => p.seccionId === seccion.id);
                  if (preguntasDeSeccion.length === 0) return null;
                  
                  return (
                    <div key={seccion.id} style={{ marginBottom: 24 }}>
                      <h4 style={{ 
                        color: '#1890ff', 
                        fontSize: '16px', 
                        fontWeight: 'bold',
                        marginBottom: '12px',
                        padding: '8px 12px',
                        backgroundColor: '#f0f8ff',
                        borderRadius: '4px',
                        borderLeft: '4px solid #1890ff'
                      }}>
                        {seccion.nombre}
                      </h4>
                      
                      {preguntasDeSeccion.map((pregunta, index) => (
                        <div key={pregunta.id} style={{ 
                          marginLeft: '20px',
                          marginBottom: '12px',
                          padding: '12px',
                          backgroundColor: '#fafafa',
                          borderRadius: '4px',
                          border: '1px solid #e8e8e8'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                                {index + 1}. {pregunta.enunciado}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                Escala: 1 (Totalmente en Desacuerdo) - 4 (Totalmente de Acuerdo)
                              </div>
                            </div>
                            <Button 
                              type="text" 
                              danger 
                              size="small"
                              onClick={() => eliminarPreguntaTrimestral(pregunta.id)}
                              icon={<DeleteOutlined />}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </Card>
            )}
              </Card>
            )}
          </Card>
        )}

        {/* Botones de acción */}
        <div style={{ textAlign: 'right', marginTop: '24px' }}>
          <Button onClick={onClose} style={{ marginRight: '8px' }}>
            Cancelar
          </Button>
          <Button onClick={handlePreview} style={{ marginRight: '8px' }}>
            Vista Previa
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Crear Formulario
          </Button>
        </div>
      </Form>

      {renderPreviewModal()}
    </Modal>
  );
};

export default CrearFormulario;
