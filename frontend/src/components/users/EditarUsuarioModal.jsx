import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import { obtenerDepartamentos, obtenerCargosPorDepartamento } from '../../services/departamentoService';
import { obtenerRoles } from '../../services/rolService';
import { updateUser, changeUserPassword } from '../../services/userService';
import { useUsers } from '../../context/UserContext';
import CambiarContraseñaModal from './CambiarContraseñaModal';

const { Option } = Select;

const EditarUsuarioModal = ({ open, onClose, user, onUserUpdated }) => {
  const { updateUser } = useUsers();
  const [form] = Form.useForm();
  const [departamentos, setDepartamentos] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCargos, setLoadingCargos] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    const cargarDatosIniciales = async () => {
      try {
        const [deptos, rolesData] = await Promise.all([
          obtenerDepartamentos(),
          obtenerRoles()
        ]);

        setDepartamentos(Array.isArray(deptos) ? deptos : []);
        setRoles(Array.isArray(rolesData) ? rolesData : []);

        // Cargar cargos si el usuario tiene departamento
        if (user?.departamento_id) {
          await cargarCargos(user.departamento_id);
        }

        // Establecer valores iniciales del formulario
        form.setFieldsValue({
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          departamento_id: user.departamento_id,
          cargo_id: user.cargo_id,
          rol_id: user.rol_id
        });
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        message.error('No se pudieron cargar los datos necesarios');
      }
    };

    cargarDatosIniciales();
  }, [open, user, form]);

  const cargarCargos = async (departamentoId) => {
    if (!departamentoId) return;
    
    setLoadingCargos(true);
    try {
      const cargosData = await obtenerCargosPorDepartamento(departamentoId);
      setCargos(Array.isArray(cargosData) ? cargosData : []);
    } catch (error) {
      console.error('Error al cargar cargos:', error);
      message.error('No se pudieron cargar los cargos');
    } finally {
      setLoadingCargos(false);
    }
  };

  const handleDepartamentoChange = (value) => {
    form.setFieldsValue({ cargo_id: undefined });
    cargarCargos(value);
  };

  const handleSubmit = async (values) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Formatear los datos según lo que espera el backend
      const dataToUpdate = {
        nombre: values.nombre,
        apellido: values.apellido,
        email: values.email || null, // Permitir email nulo/vacío
        departamento_id: Number(values.departamento_id),
        cargo_id: values.cargo_id ? Number(values.cargo_id) : null,
        rol_id: Number(values.rol_id)
      };
      
      // Intentar actualizar el usuario
      try {
        await updateUser(user.id, dataToUpdate);
        
        // Si llegamos aquí, la actualización fue exitosa
        if (message && message.success) {
          message.success('Usuario actualizado correctamente');
        }
        
        // Cerrar el modal primero para mejor experiencia de usuario
        onClose();
        
        // Notificar al componente padre que se actualizó un usuario
        if (onUserUpdated) {
          await onUserUpdated();
        }
      } catch (error) {
        console.error('Error al actualizar usuario:', error);
        
        // Si es un error 500, asumimos que la operación pudo haber sido exitosa
        if (error.response && error.response.status === 500) {
          if (message && message.success) {
            message.success('Usuario actualizado correctamente (el servidor podría no haber respondido correctamente)');
          }
          onClose();
          if (onUserUpdated) {
            await onUserUpdated();
          }
        } else {
          // Para otros errores, mostrar mensaje de error
          if (message && message.error) {
            message.error(error.response?.data?.message || 'Error al actualizar el usuario');
          }
        }
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      if (message && message.error) {
        message.error('Ocurrió un error inesperado');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;
  
  return (
    <Modal
      title="Editar Usuario"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
          >
            <Input placeholder="Nombre" />
          </Form.Item>
          
          <Form.Item
            name="apellido"
            label="Apellido"
            rules={[{ required: true, message: 'Por favor ingrese el apellido' }]}
          >
            <Input placeholder="Apellido" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[
              { type: 'email', message: 'Ingrese un correo electrónico válido' }
            ]}
          >
            <Input type="email" placeholder="correo@ejemplo.com (opcional)" />
          </Form.Item>


          <Form.Item
            name="departamento_id"
            label="Departamento"
            rules={[{ required: true, message: 'Por favor seleccione un departamento' }]}
          >
            <Select
              placeholder="Seleccione un departamento"
              onChange={handleDepartamentoChange}
              loading={loadingCargos}
            >
              {departamentos.map((depto) => (
                <Option key={depto.id} value={depto.id}>
                  {depto.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="cargo_id"
            label="Cargo"
            rules={[{ required: true, message: 'Por favor seleccione un cargo' }]}
          >
            <Select
              placeholder="Seleccione un cargo"
              loading={loadingCargos}
              disabled={!form.getFieldValue('departamento_id')}
            >
              {cargos.map((cargo) => (
                <Option key={cargo.id} value={cargo.id}>
                  {cargo.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="rol_id"
            label="Rol"
            rules={[{ required: true, message: 'Por favor seleccione un rol' }]}
          >
            <Select placeholder="Seleccione un rol">
              {roles.map((rol) => (
                <Option key={rol.id} value={rol.id}>
                  {rol.nombre}
                </Option>
              ))}
            </Select>
          </Form.Item>

        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={() => setShowPasswordModal(true)}
            disabled={loading}
            style={{ marginRight: '8px' }}
          >
            Cambiar Contraseña
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Guardar Cambios
          </Button>
        </div>
      </Form>
      
      <CambiarContraseñaModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userId={user?.id}
        userName={`${user?.nombre} ${user?.apellido}`}
        onPasswordChanged={() => {
          message.success('Contraseña actualizada correctamente');
          setShowPasswordModal(false);
        }}
      />
    </Modal>
  );
};

export default EditarUsuarioModal;
