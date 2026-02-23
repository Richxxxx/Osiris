import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Importar componentes de evaluador
import Dashboard from './Dashboard';
import EvaluacionPage from './EvaluacionPage';
import EvaluacionCompletadaPage from './EvaluacionCompletadaPage';

const EvaluadorRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/evaluacion/:id" element={<EvaluacionPage />} />
      <Route path="/evaluacion-completada/:id" element={<EvaluacionCompletadaPage />} />
      {/* Agrega más rutas del evaluador según sea necesario */}
    </Routes>
  );
};

export default EvaluadorRoutes;
