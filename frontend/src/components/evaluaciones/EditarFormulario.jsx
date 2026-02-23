import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, Button, Switch, message, Tabs, Card, Select } from 'antd';
import { SaveOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { authService } from '../../services/auth';
import EditarPreguntaForm from './EditarPreguntaForm';

const { TextArea } = Input;

const EditarFormulario = ({ visible, onClose, onSuccess, formularioId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [formulario, setFormulario] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [tieneComentarios, setTieneComentarios] = useState(false);
  const [periodicidad, setPeriodicidad] = useState('anual');
  const hasLoaded = useRef(false);

  // Cargar datos del formulario
  useEffect(() => {
    if (visible && formularioId && !hasLoaded.current) {
      hasLoaded.current = true;
      cargarFormulario();
    }
  }, [visible, formularioId]);

  // Resetear estados cuando el modal se cierra
  useEffect(() => {
    if (!visible) {
      setFormulario(null);
      setPreguntas([]);
      setTieneComentarios(false);
      setPeriodicidad('anual');
      hasLoaded.current = false;
      form.resetFields();
      setEditingQuestion(null);
    }
  }, [visible, form]);

  const cargarFormulario = async () => {
    try {
      setLoading(true);
      const user = authService.getCurrentUser();
      if (!user) {
        message.error('Usuario no autenticado');
        return;
      }

      const response = await fetch(`/api/formularios/${formularioId}/ver`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const formData = data.data.formulario;
        setFormulario(formData);
        setPreguntas(formData.preguntas || []);
        setPeriodicidad(formData.periodicidad || 'anual');
        
        // Cargar datos en el formulario
        form.setFieldsValue({
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          estado: formData.estado === 'activo',
          periodicidad: formData.periodicidad || 'anual'
        });
        
        // Cargar estado de comentarios basado en las preguntas existentes
        const preguntasComentarios = formData.preguntas?.filter(p => p.apartado === 'comentarios') || [];
        setTieneComentarios(preguntasComentarios.length > 0);
        
        message.success('Formulario cargado correctamente');
      } else {
        const errorData = await response.json();
        message.error(`Error al cargar el formulario: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error al cargar formulario:', error);
      message.error('Error al cargar el formulario');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const user = authService.getCurrentUser();
      if (!user) {
        message.error('Usuario no autenticado');
        return;
      }

      const response = await fetch(`/api/formularios/${formularioId}/actualizar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...values,
          tieneComentarios
        })
      });

      if (response.ok) {
        message.success('Formulario actualizado exitosamente');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        message.error(`Error al actualizar formulario: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error al actualizar formulario:', error);
      message.error('Error al actualizar formulario');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestion = async (questionData) => {
    try {
      setLoading(true);
      const user = authService.getCurrentUser();
      if (!user) return;

      if (editingQuestion) {
        // Editar pregunta existente - actualizar solo esa pregunta
        const preguntasActualizadas = preguntas.map(p => 
          p.id === editingQuestion.id ? { ...questionData, id: editingQuestion.id } : p
        );
        
        const response = await fetch(`/api/formularios/${formularioId}/actualizar`, {
          method: 'PATCH', // Cambiar de PUT a PATCH para que coincida con la ruta
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            preguntas: preguntasActualizadas
          })
        });

        if (response.ok) {
          message.success('Pregunta actualizada correctamente');
          setEditingQuestion(null);
          setActiveTab('questions');
          cargarFormulario();
        } else {
          const errorData = await response.json();
          message.error(`Error al actualizar pregunta: ${errorData.message || 'Error desconocido'}`);
        }
      } else {
        // Crear nueva pregunta - usar endpoint de actualizar formulario agregando la nueva pregunta
        const response = await fetch(`/api/formularios/${formularioId}/actualizar`, {
          method: 'PATCH', // Usar PATCH como la ruta
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            preguntas: [questionData]
          })
        });

        if (response.ok) {
          message.success('Pregunta agregada correctamente');
          setEditingQuestion(null);
          setActiveTab('questions');
          cargarFormulario();
        } else {
          const errorData = await response.json();
          message.error(`Error al agregar pregunta: ${errorData.message || 'Error desconocido'}`);
        }
      }
    } catch (error) {
      console.error('Error al guardar pregunta:', error);
      message.error('Error al guardar pregunta');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    try {
      setLoading(true);
      const user = authService.getCurrentUser();
      if (!user) return;

      // Eliminar pregunta - filtrar las preguntas existentes y actualizar el formulario
      const preguntasActuales = preguntas.filter(p => p.id !== questionId);
      
      const response = await fetch(`/api/formularios/${formularioId}/actualizar`, {
        method: 'PATCH', // Usar PATCH como la ruta
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preguntas: preguntasActuales
        })
      });

      if (response.ok) {
        message.success('Pregunta eliminada correctamente');
        cargarFormulario(); // Recargar preguntas
      } else {
        const errorData = await response.json();
        message.error(`Error al eliminar pregunta: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error al eliminar pregunta:', error);
      message.error('Error al eliminar pregunta');
    } finally {
      setLoading(false);
    }
  };

  // Componente para mostrar una pregunta
  const QuestionCard = ({ question, index }) => (
    <div className="mb-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-gray-900 mb-1">
            {index + 1}. {question.enunciado}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {question.tipo === 'titulo_seccion' ? 'Título de Sección' :
               question.tipo === 'escala' ? 'Escala' :
               question.tipo === 'abierta' ? 'Abierta' :
               question.tipo === 'opcion_multiple' ? 'Opción Múltiple' :
               question.tipo}
            </span>
            {question.apartado && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded capitalize">
                {question.apartado}
              </span>
            )}
            {question.obligatoria && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                Obligatoria
              </span>
            )}
          </div>
          {question.opciones && question.opciones.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              <strong>Opciones:</strong>
              <ul className="ml-4 mt-1">
                {question.opciones.map((opcion, idx) => (
                  <li key={idx}>
                    {opcion.texto || opcion.valor} ({opcion.puntaje || opcion.puntuacion} pts)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="ml-4 flex gap-2">
          <Button 
            type="text" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingQuestion(question);
              setActiveTab('edit'); // Cambiar al tab de nueva pregunta
            }}
          />
          <Button 
            type="text" 
            danger 
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteQuestion(question.id)}
          />
        </div>
      </div>
    </div>
  );

  const tabItems = [
    {
      key: 'info',
      label: 'Información General',
      children: (
        <div>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              estado: true
            }}
          >
            <Form.Item
              label="Nombre del Formulario"
              name="nombre"
              rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
            >
              <Input placeholder="Ej: Evaluación de Desempeño Q1-2024" />
            </Form.Item>

            <Form.Item
              label="Periodicidad"
              name="periodicidad"
              rules={[{ required: true, message: 'Seleccione la periodicidad' }]}
            >
              <Select 
                placeholder="Seleccione periodicidad"
                onChange={(value) => setPeriodicidad(value)}
                disabled={!!formulario} // No permitir cambiar si ya existe
              >
                <Select.Option value="anual">Anual</Select.Option>
                <Select.Option value="trimestral">Trimestral</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Descripción"
              name="descripcion"
              rules={[{ required: true, message: 'Por favor ingrese la descripción' }]}
            >
              <TextArea 
                rows={3} 
                placeholder="Describa el propósito y alcance de este formulario..."
              />
            </Form.Item>

            <Form.Item
              label="Estado"
              name="estado"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="Activo" 
                unCheckedChildren="Inactivo"
              />
            </Form.Item>

            {/* Opción de comentarios - dentro del Form */}
            <Form.Item
              name="tieneComentarios"
              valuePropName="checked"
              className="mb-0 mt-4"
            >
              <div className="flex items-center">
                <Switch 
                  checkedChildren="Sí" 
                  unCheckedChildren="No"
                  checked={tieneComentarios}
                  onChange={setTieneComentarios}
                />
                <span className="ml-3 font-medium">Incluir campos de comentarios finales</span>
              </div>
            </Form.Item>
            
            {tieneComentarios && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Este formulario incluye {periodicidad === 'trimestral' ? 'tres' : 'dos'} campos de comentarios al final:</strong>
                </p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700">• <strong>ÁREAS DE MEJORAMIENTO</strong> - Para registrar oportunidades de mejora</p>
                  <p className="text-sm text-gray-700">• <strong>COMENTARIOS ADICIONALES</strong> - Para comentarios generales</p>
                  {periodicidad === 'trimestral' && (
                    <p className="text-sm text-gray-700">• <strong>ACCIONES RECOMENDADAS PARA EL MEJORAMIENTO</strong> - Para plan de acción</p>
                  )}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Estos campos aparecerán después de todas las preguntas y antes de finalizar la evaluación.
                </p>
              </div>
            )}
          </Form>

          {/* Información adicional del formulario */}
          {formulario && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Información Adicional</h4>
              
              {/* Cargos asociados */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargos Asociados:
                </label>
                {formulario.cargos && formulario.cargos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formulario.cargos.map((cargo, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded">
                        {cargo.nombre}
                        {cargo.departamento && ` - ${cargo.departamento.nombre}`}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No hay cargos asociados</p>
                )}
              </div>

              {/* Estadísticas de preguntas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total de Preguntas:
                  </label>
                  <p className="text-lg font-semibold text-blue-600">
                    {preguntas.length}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preguntas por Apartado:
                  </label>
                  <div className="space-y-1">
                    {['competencias', 'experiencia', 'convivencia', 'desempeno'].map(apartado => {
                      const count = preguntas.filter(p => p.apartado === apartado).length;
                      return count > 0 ? (
                        <div key={apartado} className="flex justify-between text-sm">
                          <span className="capitalize">{apartado}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'questions',
      label: 'Preguntas',
      children: (
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">
              Preguntas del Formulario ({preguntas.length})
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Aquí puedes ver, editar y agregar preguntas al formulario
            </p>
          </div>

          {preguntas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay preguntas en este formulario</p>
              <p className="text-sm mt-2">Agrega preguntas usando el formulario de abajo</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {periodicidad === 'trimestral' ? (
                // Lógica para formularios trimestrales: agrupar por secciones
                (() => {
                  const secciones = [];
                  let seccionActual = null;
                  let preguntasEnSeccion = [];
                  
                  // Agrupar preguntas por secciones
                  preguntas
                    .filter(p => p.apartado !== 'comentarios')
                    .forEach(pregunta => {
                      if (pregunta.tipo === 'titulo_seccion') {
                        // Guardar sección anterior si existe
                        if (seccionActual) {
                          secciones.push({
                            titulo: seccionActual,
                            preguntas: preguntasEnSeccion
                          });
                        }
                        // Iniciar nueva sección
                        seccionActual = pregunta.enunciado;
                        preguntasEnSeccion = [];
                      } else {
                        // Agregar pregunta a la sección actual
                        preguntasEnSeccion.push(pregunta);
                      }
                    });
                  
                  // Agregar última sección
                  if (seccionActual) {
                    secciones.push({
                      titulo: seccionActual,
                      preguntas: preguntasEnSeccion
                    });
                  }
                  
                  return secciones.map((seccion, seccionIndex) => (
                    <div key={seccionIndex} className="mb-6">
                      {/* Título de la sección */}
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <h4 className="font-semibold text-blue-900">
                          {seccion.titulo}
                        </h4>
                      </div>
                      
                      {/* Preguntas de la sección */}
                      <div className="space-y-2 ml-4">
                        {seccion.preguntas.map((question, index) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            index={index}
                          />
                        ))}
                      </div>
                    </div>
                  ));
                })()
              ) : (
                // Lógica para formularios anuales: mostrar por apartados
                ['competencias', 'experiencia', 'convivencia', 'desempeno'].map(apartado => {
                  const preguntasApartado = preguntas.filter(p => p.apartado === apartado);
                  return preguntasApartado.length > 0 ? (
                    <div key={apartado} className="mb-6">
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-900 capitalize">
                          {apartado === 'competencias' ? 'Competencias' :
                           apartado === 'experiencia' ? 'Experiencia' :
                           apartado === 'convivencia' ? 'Convivencia Laboral' :
                           'Desempeño'}
                        </h4>
                      </div>
                      <div className="space-y-2 ml-4">
                        {preguntasApartado.map((question, index) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            index={index}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null;
                })
              )}
              
              {/* Mostrar comentarios al final */}
              {preguntas.filter(p => p.apartado === 'comentarios').length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="mb-3 p-3 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900">
                      Campos de Comentarios
                    </h4>
                  </div>
                  <div className="space-y-2 ml-4">
                    {preguntas.filter(p => p.apartado === 'comentarios').map((question, index) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'edit',
      label: "Nueva Pregunta",
      children: (
        <EditarPreguntaForm
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onCancel={() => {
            setEditingQuestion(null);
            setActiveTab('questions'); // Volver al tab de preguntas
          }}
          periodicidad={periodicidad}
          setEditingQuestion={setEditingQuestion}
        />
      )
    }
  ];

  return (
    <Modal
      title="Editar Formulario"
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancelar
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={loading}
        >
          Guardar Cambios
        </Button>
      ]}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
      />
    </Modal>
  );
};

export default EditarFormulario;
