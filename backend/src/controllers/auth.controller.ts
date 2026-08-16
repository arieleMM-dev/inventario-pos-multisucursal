import { Request, Response } from 'express';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { loginSchema } from '../schemas/auth.schema';
import { sendSuccess, sendError } from '../utils/response';

export const login = async (req: Request, res: Response) => {
  try {
    // 1. Validar carga útil (payload) de entrada con Zod
    const result = loginSchema.safeParse(req.body);
    
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos de entrada inválidos', 400, result.error.issues);
    }
    
    const { email, password } = result.data;

    // 2. Buscar al usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return sendError(res, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos', 401);
    }

    // 3. Verificar contraseña usando Argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    
    if (!isPasswordValid) {
      return sendError(res, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos', 401);
    }

    // 4. Generar el token JWT
    const payload = {
      userId: user.id,
      role: user.role,
      branchId: user.branchId,
    };

    // Usamos una clave secreta del entorno (.env) o un fallback
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecret', {
      expiresIn: '8h', // Expiración del token
    });

    // 5. Enviar respuesta exitosa con formato estandarizado
    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Ocurrió un error inesperado en el servidor', 500);
  }
};
