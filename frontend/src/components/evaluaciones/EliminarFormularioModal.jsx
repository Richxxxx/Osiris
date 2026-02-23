import React from 'react';
import { Modal, Button, message } from 'antd';

const EliminarFormularioModal = ({ open, onClose, formulario, onFormularioDeleted }) => {
  const [loading, setLoading] = React.useState(false);

  const handleEliminar = async () => {
    if (!formulario) return;
    
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        message.error('Usuario no autenticado');
        return;
      }

      const response = await fetch(`/api/formularios/${formulario.id}/eliminar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('Formulario eliminado exitosamente');
        onFormularioDeleted();
        onClose();
      } else {
        const errorData = await response.json();
        message.error(`Error al eliminar formulario: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error al eliminar formulario:', error);
      message.error('Ocurrió un error al eliminar el formulario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Confirmar Eliminación"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancelar
        </Button>,
        <Button
          key="delete"
          type="primary"
          danger
          loading={loading}
          onClick={handleEliminar}
        >
          Eliminar
        </Button>
      ]}
    >
      <p>
        ¿Está seguro que desea eliminar el formulario <strong>"{formulario?.nombre}"</strong>?
      </p>
      <p style={{ color: '#ff4d4f', fontSize: '14px' }}>
        Esta acción eliminará permanentemente el formulario y todas sus preguntas asociadas.
      </p>
    </Modal>
  );
};

export default EliminarFormularioModal;
