import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { changeUserPassword } from '../../services/userService';

const CambiarContraseñaModal = ({ open, onClose, userId, userName, onPasswordChanged }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      await changeUserPassword(userId, {
        password: values.password,
        passwordConfirm: values.passwordConfirm
      });
      
      if (onPasswordChanged) {
        onPasswordChanged();
      }
      
      form.resetFields();
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      message.error(error.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={`Cambiar Contraseña - ${userName}`}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={480}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-6"
      >
        <Form.Item
          name="password"
          label="Nueva Contraseña"
          rules={[
            { required: true, message: 'Por favor ingrese la nueva contraseña' },
            { min: 6, message: 'La contraseña debe tener al menos 6 caracteres' }
          ]}
        >
          <Input.Password placeholder="Ingrese la nueva contraseña" />
        </Form.Item>

        <Form.Item
          name="passwordConfirm"
          label="Confirmar Contraseña"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Por favor confirme la contraseña' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Las contraseñas no coinciden'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Confirme la nueva contraseña" />
        </Form.Item>

        <div className="flex justify-end space-x-3 mt-6">
          <Button onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            Cambiar Contraseña
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CambiarContraseñaModal;
