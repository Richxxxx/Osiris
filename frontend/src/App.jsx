import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authService } from './services/auth';
import { UserProvider } from './context/UserContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/auth/Login';
import OlvideContrasena from './pages/auth/OlvideContrasena';
import ResetPassword from './pages/auth/ResetPassword';
import Footer from './components/Footer';

// Importar los componentes de rutas
import AdminRoutes from './pages/admin/AdminRoutes';
import EvaluadorRoutes from './pages/evaluador/EvaluadorRoutes';
import EmpleadoRoutes from './pages/empleado/EmpleadoRoutes';
import GestionRoutes from './pages/gestion/GestionRoutes';

// Componente de ruta protegida con verificación de rol
const PrivateRoute = ({ children, requiredRole }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    isLoading: true
  });

  useEffect(() => {
    const checkAuth = () => {
      const user = authService.getCurrentUser();
      
      setAuthState({
        isAuthenticated: !!user,
        user: user,
        isLoading: false
      });
    };

    checkAuth();
  }, []);

  if (authState.isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (!authState.isAuthenticated || !authState.user) {
    return <Navigate to="/login" replace />;
  }

  // Obtener el nombre del rol (puede estar en user.rol.nombre o user.role)
  const userRole = authState.user.rol?.nombre || authState.user.role;

  // Verificar si el usuario tiene el rol requerido
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Componente para redirigir según el rol del usuario
const RoleBasedRedirect = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const userData = authService.getCurrentUser();
    setUser(userData);
    setIsLoading(false);
  }, []);
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Obtener el rol del usuario (puede estar en user.rol.nombre o user.role)
  const userRole = user.rol?.nombre || user.role;
  
  // Mapeo de roles a rutas con /dashboard
  const rolePath = {
    'administrador': '/admin/dashboard',
    'evaluador': '/evaluador/dashboard',
    'empleado': '/empleado/dashboard',
    'gestion': '/gestion/dashboard'
  };
  
  const redirectPath = rolePath[userRole];
  
  if (!redirectPath) {
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to={redirectPath} replace />;
};

function App() {
  return (
    <UserProvider>
      <Router future={{ v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <main className="flex-grow">
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* Redirección basada en el rol */}
            <Route path="/" element={<RoleBasedRedirect />} />
            
            {/* Rutas de administrador */}
            <Route
              path="/admin/*"
              element={
                <PrivateRoute requiredRole="administrador">
                  <AdminRoutes />
                </PrivateRoute>
              }
            />
            
            {/* Rutas de evaluador */}
            <Route
              path="/evaluador/*"
              element={
                <PrivateRoute requiredRole="evaluador">
                  <EvaluadorRoutes />
                </PrivateRoute>
              }
            />
            
            {/* Rutas de empleado */}
            <Route
              path="/empleado/*"
              element={
                <PrivateRoute requiredRole="empleado">
                  <EmpleadoRoutes />
                </PrivateRoute>
              }
            />
            
            {/* Rutas de gestión */}
            <Route
              path="/gestion/*"
              element={
                <PrivateRoute requiredRole="gestion">
                  <GestionRoutes />
                </PrivateRoute>
              }
            />
            
            {/* Ruta por defecto para rutas no encontradas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </main>
          
          {/* Footer */}
          <Footer />
        </div>
        
        {/* Toast Container para notificaciones */}
        <ToastContainer 
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          limit={3}
          style={{ zIndex: 9999 }}
        />
      </Router>
    </UserProvider>
  );
}

export default App;
