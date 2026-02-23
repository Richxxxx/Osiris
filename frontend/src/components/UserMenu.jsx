import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { toast } from 'react-toastify';
import { FileText } from 'lucide-react';

const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      // Limpiar datos de autenticación
      authService.logout();
      
      // Mostrar notificación
      toast.success('Has cerrado sesión correctamente', {
        position: 'top-center',
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        onClose: () => {
          // Redirigir a login después de cerrar la notificación
          window.location.href = '/login';
        }
      });
      
      // Forzar recarga completa de la aplicación
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
      
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Ocurrió un error al cerrar sesión');
    }
  };

  if (!user) return null;

  // Función para obtener las iniciales del usuario
  const getInitials = () => {
    return `${user.nombre?.charAt(0) || ''}${user.apellido?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  // Color más suave para el avatar
  const getAvatarColor = () => {
    // Genera un tono pastel basado en el nombre del usuario
    const colors = [
      'bg-indigo-100 text-indigo-600',
      'bg-teal-100 text-teal-600',
      'bg-purple-100 text-purple-600',
      'bg-pink-100 text-pink-600',
      'bg-blue-100 text-blue-600',
      'bg-cyan-100 text-cyan-600',
      'bg-amber-100 text-amber-600',
      'bg-emerald-100 text-emerald-600'
    ];
    
    // Generar un índice basado en las iniciales del usuario para mantener consistencia
    const charSum = user.nombre?.charCodeAt(0) + (user.apellido?.charCodeAt(0) || 0);
    return colors[charSum % colors.length];
  };

  return (
    <div className="relative ml-4" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center max-w-xs rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="sr-only">Abrir menú de usuario</span>
        <div className={`h-11 w-11 rounded-full flex items-center justify-center font-medium ${getAvatarColor()} border border-gray-700`}>
          {getInitials()}
        </div>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
          {/* Sección de información del perfil */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center">
              <div className={`h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-medium ${getAvatarColor()}`}>
                {getInitials()}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.nombre || ''} {user.apellido || ''}
                  </p>
                </div>
                {user.email && (
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                )}
                {/* Debug info */}
                <div style={{ display: 'none' }}>
                  Nombre: "{user.nombre}", Apellido: "{user.apellido}"
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-900 mb-3">Información del Perfil</p>
              
              <div className="space-y-2">
              {user.cargo && (
                <div className="flex items-start">
                  <svg className="h-4 w-4 text-gray-400 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M12 16h.01" />
                  </svg>
                  <span className="text-xs text-gray-600">{user.cargo}</span>
                </div>
              )}
              
              <div className="flex items-start">
                <svg className="h-4 w-4 text-gray-400 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-xs text-gray-600">
                  {user.departamento?.nombre || 'Sin departamento asignado'}
                </span>
              </div>
              
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.rol?.nombre === 'Administrador' 
                    ? 'bg-purple-100 text-purple-800' 
                    : user.rol?.nombre === 'Evaluador' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                }`}>
                  {user.rol?.nombre || 'Usuario'}
                </span>
              </div>
            </div>
          </div>
        </div>
          
          {/* Opciones del menú */}
          <div className="py-1">
            {/* Acciones rápidas solo para administradores */}
            {user && (user.rol?.nombre === 'Administrador' || user.role === 'admin') && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acciones Rápidas
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/admin/dashboard?tab=formularios');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors duration-150"
                >
                  <FileText className="mr-3 h-4 w-4 text-gray-400" />
                  Crear Formulario
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/admin/dashboard');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors duration-150"
                >
                  <FileText className="mr-3 h-4 w-4 text-gray-400" />
                  Crear Evaluación
                </button>
                <div className="border-t border-gray-100 my-1"></div>
              </>
            )}
            
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors duration-150 font-medium"
            >
              <svg className="mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
