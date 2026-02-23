import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { authService } from '../../services/auth';

// Schema de validación para el formulario
const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'El correo electrónico es requerido')
    .email('Debe ser un correo electrónico válido')
});

const OlvideContrasena = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Obtener email del estado de navegación si viene del login
  const emailFromState = location.state?.email || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: emailFromState,
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setError('');
      
      // Llamar al endpoint de recuperación de contraseña
      await authService.forgotPassword(data.email);
      
      setSuccess(true);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         'Error al enviar el correo de recuperación. Por favor, inténtalo de nuevo.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Correo enviado
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Hemos enviado un correo con las instrucciones para restablecer tu contraseña.
              </p>
            </div>
            
            <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Revisa tu bandeja de entrada y sigue las instrucciones del correo.
                </p>
                <p className="text-sm text-gray-600">
                  Si no recibes el correo, revisa tu carpeta de spam.
                </p>
                <Link 
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              ¿Olvidaste tu contraseña?
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
            </p>
          </div>
          
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
                      Enviando...
                    </>
                  ) : 'Enviar instrucciones'}
                </Button>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <Link 
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 text-sm"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OlvideContrasena;
