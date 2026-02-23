import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import UserMenu from '../UserMenu';

const HeaderEmpleado = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="w-full pl-0 pr-0 sm:px-6 lg:px-8">
        <div className="flex items-center h-20">
          {/* Icono y título */}
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <h1 className="ml-1 text-xl font-bold text-gray-900">Panel Empleado</h1>
          </div>

          {/* Menú de usuario */}
          <div className="flex items-center space-x-4 ml-auto">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderEmpleado;
