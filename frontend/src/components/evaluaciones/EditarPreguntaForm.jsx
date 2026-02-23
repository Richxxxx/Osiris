import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Select, Switch, Card, Space, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const EditarPreguntaForm = ({ question, onSave, onCancel, periodicidad, setEditingQuestion }) => {
  const [form] = Form.useForm();
  const [opciones, setOpciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tipoPregunta, setTipoPregunta] = useState(question?.tipo || '');

  
  useEffect(() => {
    if (question) {
            setTipoPregunta(question.tipo); // Actualizar tipo
      form.setFieldsValue({
        enunciado: question.enunciado,
        tipo: question.tipo,
        apartado: question.apartado,
        obligatoria: question.obligatoria,
        peso: question.peso
      });
      
      // Asegurar que las opciones se carguen correctamente
      const opcionesData = question.opciones || [];
            setOpciones(opcionesData);
    } else {
      // Limpiar formulario para nueva pregunta
      form.resetFields();
      setOpciones([]);
      // Para nuevas preguntas anuales, establecer tipo por defecto
      if (periodicidad === 'anual') {
        setTipoPregunta('escala');
        form.setFieldsValue({ tipo: 'escala' });
      } else {
        setTipoPregunta('');
      }
    }
  }, [question, form]);

  const handleAddOpcion = () => {
    const nuevaOpcion = {
      valor: '', // El backend espera 'valor', no 'texto'
      puntuacion: 1, // El backend espera 'puntuacion', no 'puntaje'
    };
        setOpciones([...opciones, nuevaOpcion]);
  };

  const handleRemoveOpcion = (index) => {
    setOpciones(opciones.filter((_, i) => i !== index));
  };

  const handleOpcionChange = (index, field, value) => {
    const newOpciones = [...opciones];
    
    // Mapear campos del frontend al backend
    if (field === 'texto') {
      newOpciones[index].valor = value; // Frontend 'texto' -> Backend 'valor'
    } else if (field === 'puntaje') {
      newOpciones[index].puntuacion = value; // Frontend 'puntaje' -> Backend 'puntuacion'
    } else {
      newOpciones[index][field] = value;
    }
    
        setOpciones(newOpciones);
  };

  const handleClear = () => {
    form.resetFields();
    setOpciones([]);
    setEditingQuestion(null);
    setTipoPregunta('');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // Para formularios anuales, mantener el tipo y peso originales
      let preguntaData = {
        ...values,
        opciones: (tipoPregunta === 'escala' || tipoPregunta === 'opcion_multiple') ? 
          opciones.filter(opcion => opcion.valor && opcion.valor.trim() !== '') : [] // Usar campo 'valor' del backend
      };
      
            
      // Si es anual y estamos editando, mantener tipo y peso originales
      if (periodicidad === 'anual' && question) {
        preguntaData.tipo = question.tipo;
        preguntaData.peso = question.peso;
      }
      
      // Si es anual y es nueva pregunta, asignar valores por defecto
      if (periodicidad === 'anual' && !question) {
        preguntaData.tipo = 'escala'; // Por defecto para anuales
        preguntaData.peso = 1; // Peso por defecto
      }
      
      onSave(preguntaData);
    } catch (error) {
      console.error('Error al guardar pregunta:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical">
      {/* 1. Apartado - Primero arriba */}
      <Form.Item
        label="Apartado"
        name="apartado"
        rules={[{ required: true, message: 'Seleccione el apartado' }]}
      >
        <Select placeholder="Seleccione apartado">
          {periodicidad === 'anual' ? (
            <>
              <Select.Option value="competencias">Competencias</Select.Option>
              <Select.Option value="experiencia">Experiencia</Select.Option>
              <Select.Option value="convivencia">Convivencia</Select.Option>
              <Select.Option value="desempeno">Desempeño</Select.Option>
            </>
          ) : (
            <Select.Option value="general">General</Select.Option>
          )}
        </Select>
      </Form.Item>

      {/* 2. Enunciado - Segundo */}
      <Form.Item
        label="Enunciado de la Pregunta"
        name="enunciado"
        rules={[{ required: true, message: 'Ingrese el enunciado' }]}
      >
        <TextArea rows={2} placeholder="Escriba la pregunta..." />
      </Form.Item>

      {/* 3. Tipo y Peso - Solo para trimestrales */}
      {periodicidad === 'trimestral' && (
        <>
          <Form.Item
            label="Tipo de Pregunta"
            name="tipo"
            rules={[{ required: true, message: 'Seleccione el tipo' }]}
          >
            <Select 
              placeholder="Seleccione tipo"
              onChange={(value) => setTipoPregunta(value)}
            >
              <Select.Option value="escala">Escala</Select.Option>
              <Select.Option value="abierta">Abierta</Select.Option>
              <Select.Option value="opcion_multiple">Opción Múltiple</Select.Option>
              <Select.Option value="titulo_seccion">Título de Sección</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Peso"
            name="peso"
            rules={[{ required: true, message: 'Ingrese el peso' }]}
          >
            <Input type="number" placeholder="Peso de la pregunta" />
          </Form.Item>
        </>
      )}

      {/* 4. Obligatoria */}
      <Form.Item
        label="Obligatoria"
        name="obligatoria"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      {/* 5. Opciones de Respuesta - Mostrar para preguntas de tipo escala o opción múltiple */}
      {(tipoPregunta === 'escala' || tipoPregunta === 'opcion_multiple') && (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Opciones de Respuesta</span>
              <Button 
                type="primary" 
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddOpcion}
              >
                Agregar Opción
              </Button>
            </div>
          } 
          size="small"
        >
          {opciones.map((opcion, index) => (
            <div key={index} style={{ marginBottom: 8 }}>
              <Space style={{ width: '100%' }}>
                <Input
                  placeholder="Texto de la opción"
                  value={opcion.valor || opcion.texto} // Compatible con ambos formatos
                  onChange={(e) => handleOpcionChange(index, 'texto', e.target.value)}
                  style={{ flex: 2 }}
                />
                <Input
                  type="number"
                  placeholder="Puntaje"
                  value={opcion.puntuacion || opcion.puntaje} // Compatible con ambos formatos
                  onChange={(e) => handleOpcionChange(index, 'puntaje', parseInt(e.target.value) || 0)}
                  style={{ flex: 1 }}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveOpcion(index)}
                />
              </Space>
            </div>
          ))}
          
          {opciones.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              No hay opciones agregadas. Click en "Agregar Opción" para añadir.
            </div>
          )}
        </Card>
      )}

      {/* Botones de acción */}
      <div style={{ textAlign: 'right', marginTop: 16 }}>
        <Button 
          onClick={handleClear} 
          style={{ marginRight: 8 }}
          danger
        >
          Limpiar
        </Button>
        <Button onClick={onCancel} style={{ marginRight: 8 }}>
          Cancelar
        </Button>
        <Button type="primary" onClick={handleSave} loading={loading}>
          {question ? 'Actualizar Pregunta' : 'Guardar Pregunta'}
        </Button>
      </div>
    </Form>
  );
};

export default EditarPreguntaForm;
