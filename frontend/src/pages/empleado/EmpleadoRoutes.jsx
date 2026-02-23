import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { authService } from "../../services/auth";

// Importar componentes del empleado
import DashboardPage from "./DashboardPage";
import HistorialPage from "./HistorialPage";
import SidebarEmpleado from "../../components/empleado/Sidebar";
import HeaderEmpleado from "../../components/empleado/Header";

const EmpleadoRoutes = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-shrink-0">
        <HeaderEmpleado />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-shrink-0">
          <SidebarEmpleado />
        </div>
        
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/historial" element={<HistorialPage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default EmpleadoRoutes;
