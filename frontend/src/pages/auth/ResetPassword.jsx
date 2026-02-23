import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PasswordInput from '../../components/PasswordInput';
import Button from '../../components/Button';
import { authService } from '../../services/auth';

// Schema de validación para el formulario
const resetPasswordSchema = z.object({
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  passwordConfirm: z.string()
    .min(1, 'Por favor confirma tu contraseña'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Las contraseñas no coinciden',
  path: ['passwordConfirm'],
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      passwordConfirm: '',
    },
  });

  const passwordValue = watch('password');

  // Verificar si el token es válido al cargar la página
  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Simplemente verificamos que el token tenga el formato esperado
        if (!token || token.length !== 32) {
          setError('Token inválido');
          setTokenValid(false);
          return;
        }
        setTokenValid(true);
      } catch (err) {
        setError('Token inválido o expirado');
        setTokenValid(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      setError('');
      
      // Llamar al endpoint de restablecimiento de contraseña
      await authService.resetPassword(token, data.password);
      
      setSuccess(true);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         'Error al restablecer la contraseña. El token puede haber expirado.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Token inválido
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                El enlace de restablecimiento ha expirado o es inválido.
              </p>
            </div>
            
            <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Por favor, solicita un nuevo enlace de restablecimiento de contraseña.
                </p>
                <Link 
                  to="/olvide-contrasena"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Solicitar nuevo enlace
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                Contraseña restablecida
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Tu contraseña ha sido restablecida exitosamente.
              </p>
            </div>
            
            <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
                <Link 
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Iniciar sesión
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
              Restablecer contraseña
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Ingresa tu nueva contraseña.
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
                <PasswordInput
                  id="password"
                  name="password"
                  label="Nueva contraseña"
                  placeholder="••••••••"
                  register={register}
                  error={errors.password}
                  autoComplete="new-password"
                  showRequirements={true}
                  value={passwordValue}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <PasswordInput
                  id="passwordConfirm"
                  name="passwordConfirm"
                  label="Confirmar contraseña"
                  placeholder="••••••••"
                  register={register}
                  error={errors.passwordConfirm}
                  autoComplete="new-password"
                  value={watch('passwordConfirm')}
                />
                {errors.passwordConfirm && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.passwordConfirm.message}
                  </p>
                )}
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
                      Restableciendo...
                    </>
                  ) : 'Restablecer contraseña'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
