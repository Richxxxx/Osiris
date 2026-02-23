import React, { useState } from 'react';
import { Modal, Button, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { updateUser, deleteUser } from '../../services/userService';

const EliminarUsuarioModal = ({ open, onClose, user, onUserUpdated }) => {
  const [loading, setLoading] = useState(false);

  const handleInactivate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await updateUser(user.id, { estado: 'inactivo' });
      
      if (message && message.success) {
        message.success('Usuario inactivado correctamente');
      }
      
      if (onUserUpdated) {
        await onUserUpdated();
      }
      
      onClose();
    } catch (error) {
      console.error('Error al inactivar usuario:', error);
      message.error('Error al inactivar el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await deleteUser(user.id);
      
      if (message && message.success) {
        message.success('Usuario eliminado permanentemente');
      }
      
      if (onUserUpdated) {
        await onUserUpdated();
      }
      
      onClose();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      message.error('Error al eliminar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          <span>Confirmar Acción</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      destroyOnHidden
    >
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '16px', marginBottom: '16px' }}>
          ¿Qué acción desea realizar con el usuario <strong>{user?.nombre} {user?.apellido}</strong>?
        </p>
        
        <div style={{ 
          backgroundColor: '#fff2f0', 
          border: '1px solid #ffccc7', 
          borderRadius: '6px', 
          padding: '12px',
          marginBottom: '16px'
        }}>
          <p style={{ margin: 0, color: '#cf1322', fontSize: '14px' }}>
            <strong>Importante:</strong> Los cambios que realice no son revertibles.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '8px', color: '#262626' }}>Opciones disponibles:</h4>
          
          <div style={{ 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '6px', 
            padding: '12px',
            marginBottom: '12px'
          }}>
            <strong style={{ color: '#52c41a' }}>INACTIVAR (Recomendado)</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#595959' }}>
              El usuario dejará de estar activo para todo el sistema pero el registro permanecerá en la base de datos.
            </p>
          </div>
          
          <div style={{ 
            backgroundColor: '#fff2f0', 
            border: '1px solid #ffccc7', 
            borderRadius: '6px', 
            padding: '12px'
          }}>
            <strong style={{ color: '#ff4d4f' }}>ELIMINAR</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#595959' }}>
              El usuario será borrado permanentemente de la base de datos. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleInactivate}
          loading={loading}
          style={{ 
            backgroundColor: '#52c41a', 
            borderColor: '#52c41a',
            color: 'white',
            marginRight: '8px'
          }}
        >
          Inactivar
        </Button>
        <Button 
          onClick={handleDelete}
          loading={loading}
          danger
          style={{ 
            backgroundColor: '#ff4d4f', 
            borderColor: '#ff4d4f',
            color: 'white'
          }}
        >
          Eliminar
        </Button>
      </div>
    </Modal>
  );
};

export default EliminarUsuarioModal;
