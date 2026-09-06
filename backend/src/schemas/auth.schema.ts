import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  code: z.string().length(6, "El código debe tener 6 dígitos"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  code: z.string().length(6, "El código debe tener 6 dígitos"),
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});
