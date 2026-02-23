import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { loginSchema, UserRole } from '../../utils/validations';
import { authService } from '../../services/auth';
import Input from '../../components/Input';
import PasswordInput from '../../components/PasswordInput';
import Button from '../../components/Button';
import { useUsers } from '../../context/UserContext';

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { refreshUsers } = useUsers();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const emailValue = watch('email');

  const handleForgotPassword = () => {
    if (emailValue) {
      navigate('/olvide-contrasena', { state: { email: emailValue } });
    } else {
      navigate('/olvide-contrasena');
    }
  };

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setError('');
      
      const userData = await authService.login(data.email, data.password);
      
      if (!userData) {
        throw new Error('No se recibieron datos del usuario');
      }
      
      // Verificar si el usuario tiene un rol asignado
      if (!userData.rol) {
        throw new Error('Tu cuenta no tiene un rol asignado. Por favor, contacta al administrador.');
      }
      
      // Extraer el nombre del rol del objeto de rol
      const nombreRol = userData.rol.nombre;
      
      if (!nombreRol) {
        throw new Error('Error en la configuración del rol. Por favor, contacta al administrador.');
      }
      
      // Mapear los roles del backend a las rutas con /dashboard
      const roleToPath = {
        'administrador': '/admin/dashboard',
        'evaluador': '/evaluador/dashboard',
        'empleado': '/empleado/dashboard',
        'gestion': '/gestion/dashboard'
      };
      
      // Obtener la ruta de redirección basada en el rol
      const redirectPath = roleToPath[nombreRol];
      
      if (redirectPath) {
        // Refrescar datos dependientes del contexto antes de navegar
        await refreshUsers();
        // Usar replace: true para evitar que el usuario pueda volver al login con el botón de atrás
        navigate(redirectPath, { replace: true });
      } else {
        throw new Error(`Rol '${nombreRol}' no tiene una ruta de redirección configurada. Por favor, contacta al administrador.`);
      }
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         'Error al iniciar sesión. Por favor, verifica tus credenciales e inténtalo de nuevo.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="/LOGO.png" 
                alt="Logo Soluciones Corporativas Integrales" 
                className="h-16 w-auto"
              />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Por favor, ingresa tus credenciales para continuar
            </p>
          </div>
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="rounded-md shadow-sm space-y-4">
                <div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    label="Correo electrónico"
                    placeholder="correo@ejemplo.com"
                    register={register}
                    error={errors.email}
                    autoFocus
                  />
                </div>
                
                <div>
                  <PasswordInput
                    id="password"
                    name="password"
                    label="Contraseña"
                    placeholder="••••••••"
                    register={register}
                    error={errors.password}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

              <div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="h-8 text-sm w-full flex justify-center py-1 px-4 border border-transparent rounded-md shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Iniciando sesión...
                    </>
                  ) : 'Iniciar sesión'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
