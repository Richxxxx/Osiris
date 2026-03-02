import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { obtenerDepartamentos, obtenerCargosPorDepartamento } from '../../services/departamentoService';
import { obtenerRoles } from '../../services/rolService';
import { obtenerEmpresas } from '../../services/empresaService';
import { useUsers } from '../../context/UserContext';

const { Option } = Select;

const CrearUsuarioModal = ({ open, onClose, onUserCreated }) => {
  const [form] = Form.useForm();
  const { addUser } = useUsers();
  const [departamentos, setDepartamentos] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [roles, setRoles] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCargos, setLoadingCargos] = useState(false);

  // Reset form and load metadata when modal opens
  useEffect(() => {
    if (!open) return;

    const cargarMetadata = async () => {
      let isMounted = true;
      
      try {
        form.resetFields();
        const [deptos, rolesData, empresasData] = await Promise.all([
          obtenerDepartamentos(),
          obtenerRoles(),
          obtenerEmpresas()
        ]);

        if (!isMounted) return;

        setDepartamentos(Array.isArray(deptos) ? deptos : []);
        setRoles(Array.isArray(rolesData) ? rolesData : []);
        setEmpresas(Array.isArray(empresasData) ? empresasData : []);
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        if (isMounted) {
          message.error('No se pudieron cargar departamentos, roles o empresas');
          setDepartamentos([]);
          setRoles([]);
          setEmpresas([]);
        }
      } finally {
        if (isMounted) {
          setCargos([]);
        }
      }
      
      return () => {
        isMounted = false;
      };
    };

    cargarMetadata();
  }, [open]);

  const handleEmpresaChange = async (empresaId) => {
    form.setFieldsValue({ departamento: undefined, cargo: undefined });
    
    if (!empresaId) {
      setDepartamentos([]);
      setCargos([]);
      return;
    }

    try {
      const deptos = await obtenerDepartamentos(empresaId);
      setDepartamentos(Array.isArray(deptos) ? deptos : []);
      setCargos([]);
    } catch (error) {
      console.error('Error al cargar departamentos:', error);
      message.error('No se pudieron cargar los departamentos de la empresa');
      setDepartamentos([]);
    }
  };

  const handleDepartamentoChange = async (departamentoId) => {
    form.setFieldsValue({ cargo: undefined });
    if (!departamentoId) {
      setCargos([]);
      return;
    }

    setLoadingCargos(true);
    try {
      const cargosData = await obtenerCargosPorDepartamento(departamentoId);
      setCargos(Array.isArray(cargosData) ? cargosData : []);
    } catch (error) {
      console.error('Error al cargar cargos:', error);
      message.error('No se pudieron cargar los cargos del departamento');
      setCargos([]);
    } finally {
      setLoadingCargos(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        departamento_id: values.departamento,
        cargo_id: values.cargo,
        rol_id: values.rol,
        empresa_id: values.empresa
      };
      
      await addUser(payload);
      
      // Reset form first
      form.resetFields();
      
      // Close modal
      onClose();
      
      // Notify parent component
      if (typeof onUserCreated === 'function') {
        await onUserCreated();
      }
    } catch (error) {
      console.error('Error al crear usuario:', error);
      console.error(error.response?.data?.message || 'Error al crear el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Registrar nuevo usuario"
      open={open}
      onCancel={() => (loading ? null : onClose())}
      footer={null}
      width={720}
      destroyOnHidden
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ rol: undefined, departamento: undefined }}
        className="mt-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'Ingrese el nombre' }]}
          >
            <Input placeholder="Nombre" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="apellido"
            label="Apellido"
            rules={[{ required: true, message: 'Ingrese el apellido' }]}
          >
            <Input placeholder="Apellido" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="cedula"
            label="Cédula"
            rules={[{ required: true, message: 'Ingrese la cédula' }]}
          >
            <Input placeholder="12345678" autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[
              { type: 'email', message: 'Ingrese un correo válido' }
            ]}
          >
            <Input placeholder="usuario@empresa.com (opcional)" autoComplete="off" />
          </Form.Item>
        </div>

        {/* Título de asignación de procesos */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Asignación de Procesos</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item
              name="rol"
              label="Rol"
              rules={[{ required: true, message: 'Seleccione un rol' }]}
            >
              <Select placeholder="Seleccione un rol">
                {roles.map((rol) => (
                  <Option key={rol.id} value={rol.id}>
                    {rol.nombre.charAt(0).toUpperCase() + rol.nombre.slice(1)}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="empresa"
              label="Empresa"
              rules={[{ required: true, message: 'Seleccione una empresa' }]}
            >
              <Select
                placeholder="Seleccione una empresa"
                showSearch
                optionFilterProp="children"
                onChange={handleEmpresaChange}
                filterOption={(input, option) =>
                  (option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {empresas.map((empresa) => (
                  <Option key={empresa.id} value={empresa.id}>
                    {empresa.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="departamento"
              label="Departamento"
              rules={[{ required: true, message: 'Seleccione un departamento' }]}
            >
              <Select
                placeholder="Seleccione un departamento"
                showSearch
                optionFilterProp="children"
                onChange={handleDepartamentoChange}
                disabled={!form.getFieldValue('empresa')}
                filterOption={(input, option) =>
                  (option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {departamentos.map((depto) => (
                  <Option key={depto.id} value={depto.id}>
                    {depto.nombre}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="cargo"
              label="Cargo"
              rules={[{ required: true, message: 'Seleccione un cargo' }]}
            >
              <Select
                placeholder={loadingCargos ? 'Cargando cargos...' : 'Seleccione un cargo'}
                disabled={!form.getFieldValue('departamento') || loadingCargos}
                loading={loadingCargos}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children || '').toLowerCase().includes(input.toLowerCase())
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
              name="fecha_ingreso_empresa"
              label="Fecha de ingreso a la empresa"
              rules={[{ required: true, message: 'Seleccione la fecha de ingreso a la empresa' }]}
            >
              <Input type="date" placeholder="Seleccione la fecha" />
            </Form.Item>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: 'Ingrese una contraseña' },
              { min: 6, message: 'Debe tener al menos 6 caracteres' }
            ]}
          >
            <Input.Password placeholder="Contraseña temporaria" autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirmar contraseña"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirme la contraseña' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Las contraseñas no coinciden'));
                }
              })
            ]}
          >
            <Input.Password placeholder="Repite la contraseña" autoComplete="new-password" />
          </Form.Item>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button onClick={() => (loading ? null : onClose())} disabled={loading}>
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
            Crear usuario
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CrearUsuarioModal;
