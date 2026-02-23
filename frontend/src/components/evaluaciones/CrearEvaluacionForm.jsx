import React, { useState, useEffect } from 'react';
import { Button, Select, DatePicker, Form, Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { obtenerDepartamentos, obtenerCargosPorDepartamento } from '../../services/departamentoService';

const { Option } = Select;
const { RangePicker } = DatePicker;
const PERIODOS_POR_DEFECTO = ['Q1', 'Q2', 'Q3', 'Q4'];

const CrearEvaluacionForm = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  
  // Inicializar el formulario con valores por defecto
  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ periodos: PERIODOS_POR_DEFECTO });
    }
  }, [visible, form]);
  const [departamentos, setDepartamentos] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar departamentos al montar el componente
  useEffect(() => {
    const cargarDepartamentos = async () => {
      try {
        const data = await obtenerDepartamentos();
        setDepartamentos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error al cargar departamentos:', error);
        message.error('Error al cargar la lista de departamentos');
        setDepartamentos([]);
      }
    };

    if (visible) {
      cargarDepartamentos();
    }
  }, [visible]);

  // Cargar cargos cuando cambia el departamento
  const handleDepartamentoChange = async (departamentoId) => {
    if (!departamentoId) {
      setCargos([]);
      form.setFieldsValue({ cargos: undefined });
      return;
    }
    try {
      const cargosData = await obtenerCargosPorDepartamento(departamentoId);
      setCargos(Array.isArray(cargosData) ? cargosData : []);
    } catch (error) {
      console.error('Error al cargar cargos:', error);
      message.error('Error al cargar la lista de cargos');
      setCargos([]);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const { departamento, cargos: selectedCargos, periodos, fechas } = values;

      const periodosSeleccionados = (Array.isArray(periodos) && periodos.length > 0)
        ? periodos
        : PERIODOS_POR_DEFECTO;

      const evaluacionData = {
        departamentoId: departamento,
        cargoIds: selectedCargos || [],
        periodo: periodosSeleccionados,
        fechaLimite: fechas?.[1]?.format('YYYY-MM-DD') || null
      };

      await axios.post('/evaluaciones/crear', evaluacionData);
      message.success('Evaluación creada exitosamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al crear evaluación:', error);
      message.error(error.response?.data?.message || 'Error al crear la evaluación');
    } finally {
      setLoading(false);
    }
  };

  // Verificar que departamentos sea un array antes de renderizar
  if (!Array.isArray(departamentos)) {
    console.error('departamentos no es un array:', departamentos);
    return null;
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ periodos: PERIODOS_POR_DEFECTO }}
        className="mt-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="departamento"
            label="Departamento"
            rules={[{ required: true, message: 'Por favor seleccione un departamento' }]}
          >
            <Select
              placeholder="Seleccione un departamento"
              onChange={handleDepartamentoChange}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children || '')
                  .toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {departamentos.map(depto => (
                <Option key={depto.id} value={depto.id}>
                  {depto.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="cargos"
            label="Cargos"
            rules={[{ required: true, message: 'Por favor seleccione al menos un cargo' }]}
          >
            <Select
              mode="multiple"
              placeholder="Seleccione uno o más cargos"
              disabled={!form.getFieldValue('departamento')}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children || '')
                  .toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {cargos.map((cargo) => (
                <Option key={cargo.id} value={cargo.id}>
                  {cargo.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="periodos"
            label="Períodos"
            help="Por defecto se crean en los cuatro trimestres; ajusta aquí si quieres limitar"
          >
            <Select 
              mode="multiple" 
              placeholder="Seleccione períodos"
              maxTagCount="responsive"
            >
              <Option value="Q1">Q1 - Primer Trimestre</Option>
              <Option value="Q2">Q2 - Segundo Trimestre</Option>
              <Option value="Q3">Q3 - Tercer Trimestre</Option>
              <Option value="Q4">Q4 - Cuarto Trimestre</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="fechas"
            label="Rango de fechas (opcional)"
          >
            <RangePicker 
              style={{ width: '100%' }} 
              format="DD/MM/YYYY"
              placeholder={['Fecha inicio', 'Fecha fin']}
            />
          </Form.Item>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<PlusOutlined />}
          >
            Crear Evaluación
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CrearEvaluacionForm;
