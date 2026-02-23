import React from 'react';
import HeaderAdmin from './Header';
import SidebarAdmin from './Sidebar';

const LayoutAdmin = ({ children }) => {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header fijo */}
      <div className="flex-shrink-0">
        <HeaderAdmin />
      </div>
      
      {/* Contenedor principal con altura máxima */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar fijo */}
        <div className="flex-shrink-0">
          <SidebarAdmin />
        </div>
        
        {/* Contenido principal con scroll independiente */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LayoutAdmin;
