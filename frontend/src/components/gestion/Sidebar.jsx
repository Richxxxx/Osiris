import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Settings,
  Home,
  TrendingUp,
  Menu,
  X
} from 'lucide-react';

const SidebarGestion = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    {
      icon: <Home className="h-5 w-5" />,
      label: 'Dashboard',
      path: '/gestion/dashboard'
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: 'Seguimiento',
      path: '/gestion/seguimiento'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: 'Reportes',
      path: '/gestion/reportes'
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: 'Estadísticas',
      path: '/gestion/estadisticas'
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
        fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-gray-50 border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex flex-col h-screen lg:h-full">
          <nav className="space-y-2 flex-1 overflow-y-auto">
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              
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
          </nav>

          {/* Texto descriptivo al final */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center hidden lg:block">
              Administra el sistema y gestiona usuarios
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SidebarGestion;
