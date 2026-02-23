import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  FileText, 
  TrendingUp,
  Users,
  Settings,
  Menu,
  X,
  Plus
} from 'lucide-react';

const SidebarAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: 'Dashboard',
      path: '/admin/dashboard'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: 'Formularios',
      path: '/admin/dashboard?tab=formularios'
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: 'Reportes',
      path: '/admin/dashboard?tab=reportes'
    }
  ];

  // Acciones rápidas
  const quickActions = [
    {
      icon: <Plus className="h-4 w-4" />,
      label: 'Crear Formulario',
      action: () => {
        // Emitir evento para abrir modal de crear formulario
        window.dispatchEvent(new CustomEvent('openCrearFormulario'));
        setIsMenuOpen(false);
      }
    },
    {
      icon: <Plus className="h-4 w-4" />,
      label: 'Crear Evaluación',
      action: () => {
        // Emitir evento para abrir modal de crear evaluación
        window.dispatchEvent(new CustomEvent('openCrearEvaluacion'));
        setIsMenuOpen(false);
      }
    }
  ];

  return (
    <>
      {/* Botón de menú para móviles */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
      >
        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay para móviles */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative lg:inset-0 left-0 z-40 w-64 bg-gray-50 border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex flex-col h-screen lg:h-full">
          <nav className="space-y-2 flex-1 overflow-y-auto mb-4">
            {menuItems.map((item, index) => {
              const isActive = (item.path === '/admin/dashboard' && !location.search) ||
                             (item.path.includes('tab=formularios') && location.search.includes('tab=formularios')) ||
                             (item.path.includes('tab=reportes') && location.search.includes('tab=reportes'));
              
              return (
                <button
                  key={index}
                  onClick={() => {
                    navigate(item.path);
                    setIsMenuOpen(false); // Cerrar menú en móviles al hacer clic
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}

            {/* Separador para acciones rápidas */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">
                Acciones Rápidas
              </p>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  {action.icon}
                  <span className="font-medium text-sm">{action.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Texto descriptivo completamente separado al final */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center hidden lg:block">
              Gestión administrativa del sistema de evaluaciones
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SidebarAdmin;
