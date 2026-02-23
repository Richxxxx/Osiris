import { z } from 'zod';

export const UserRole = {
  ADMIN: 'administrador',
  EVALUADOR: 'evaluador',
  EMPLEADO: 'empleado',
};

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Ingrese un correo válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(50, 'La contraseña no puede tener más de 50 caracteres'),
});
