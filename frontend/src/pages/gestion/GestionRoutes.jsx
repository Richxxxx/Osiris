import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import SeguimientoPage from './SeguimientoPage';
import ReportesPage from './ReportesPage';
import EstadisticasPage from './EstadisticasPage';

const GestionRoutes = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="seguimiento" element={<SeguimientoPage />} />
      <Route path="reportes" element={<ReportesPage />} />
      <Route path="estadisticas" element={<EstadisticasPage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default GestionRoutes;
