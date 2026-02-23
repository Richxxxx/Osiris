import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from '../utils/axiosConfig';
import { authService } from '../services/auth';

const Notifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Cerrar el menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cargar notificaciones
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const user = authService.getCurrentUser();
        if (!user) return;

        // Simulación de datos de notificaciones
        // En una implementación real, harías una llamada a tu API
        const mockNotifications = [
          { id: 1, message: 'Nuevo registro de usuario', time: 'Hace 5 minutos', read: false },
          { id: 2, message: 'Evaluación pendiente de revisión', time: 'Hace 2 horas', read: false },
          { id: 3, message: 'Actualización del sistema completada', time: 'Ayer', read: true },
        ];
        
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter(n => !n.read).length);
        
      } catch (error) {
        console.error('Error al cargar notificaciones:', error);
      }
    };

    loadNotifications();
    
    // Opcional: Configurar actualización periódica
    const interval = setInterval(loadNotifications, 300000); // Cada 5 minutos
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    try {
      // Aquí iría la llamada a la API para marcar como leída
      // await axios.patch(`/api/notifications/${id}/read`, {}, {
      //   headers: { 'Authorization': `Bearer ${authService.getCurrentUser().token}` }
      // });
      
      // Actualización local
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Aquí iría la llamada a la API para marcar todas como leídas
      // await axios.patch('/api/notifications/mark-all-read', {}, {
      //   headers: { 'Authorization': `Bearer ${authService.getCurrentUser().token}` }
      // });
      
      // Actualización local
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="sr-only">Ver notificaciones</span>
        <svg 
          className="h-8 w-8" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
        )}
      </button>

      {/* Menú desplegable de notificaciones */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <p className="text-sm font-medium text-gray-900">Notificaciones</p>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-500"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <p className="text-sm text-gray-700">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-center">
                  <p className="text-sm text-gray-500">No hay notificaciones</p>
                </div>
              )}
            </div>
            
            <div className="px-4 py-2 border-t border-gray-100 text-center">
              <a 
                href="#" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                  // Aquí iría la navegación a la página de notificaciones
                  // navigate('/notifications');
                }}
              >
                Ver todas las notificaciones
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
