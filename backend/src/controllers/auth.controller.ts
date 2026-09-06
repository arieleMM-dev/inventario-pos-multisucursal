import { Request, Response } from 'express';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { loginSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema } from '../schemas/auth.schema';
import { sendSuccess, sendError } from '../utils/response';
import { sendOtpEmail } from '../services/email.service';

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
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    if (!user) {
      return sendError(res, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos', 401);
    }

    // 3. Verificar contraseña usando Argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    
    if (!isPasswordValid) {
      return sendError(res, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos', 401);
    }

    // 4. Registrar sesión en UserSessionLog y actualizar lastLogin
    await prisma.$transaction([
      prisma.userSessionLog.create({
        data: {
          userId: user.id,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      })
    ]);

    // 5. Generar el token JWT
    if (!user.role) {
      return sendError(res, 'FORBIDDEN', 'El usuario no tiene un rol asignado', 403);
    }

    const permissions = user.role.permissions.map(rp => rp.permission.code);
    const payload = {
      userId: user.id,
      role: user.role.name,
      isSuperAdmin: user.role.name === 'ADMIN',
      permissions,
      branchId: user.branchId,
    };

    // Usamos una clave secreta del entorno (.env) o un fallback
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecret', {
      expiresIn: '8h', // Expiración del token
    });

    // 6. Enviar respuesta exitosa con formato estandarizado
    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role.name,
        isSuperAdmin: user.role.name === 'ADMIN',
        permissions,
        branchId: user.branchId,
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Ocurrió un error inesperado en el servidor', 500);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos de entrada inválidos', 400, result.error.issues);
    }

    const { email } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Por seguridad no decimos si el usuario no existe
      return sendSuccess(res, { message: 'Si el correo existe, se enviará un código' });
    }

    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await prisma.otpToken.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      }
    });

    await sendOtpEmail(user.email, code);

    return sendSuccess(res, { message: 'Si el correo existe, se enviará un código' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Ocurrió un error inesperado', 500);
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const result = verifyOtpSchema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos de entrada inválidos', 400, result.error.issues);
    }

    const { email, code } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return sendError(res, 'INVALID_OTP', 'Código incorrecto o expirado', 400);
    }

    const otpToken = await prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        code,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpToken) {
      return sendError(res, 'INVALID_OTP', 'Código incorrecto o expirado', 400);
    }

    return sendSuccess(res, { message: 'Código verificado correctamente' });
  } catch (error) {
    console.error('Error en verifyOtp:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Ocurrió un error inesperado', 500);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 'VALIDATION_ERROR', 'Datos de entrada inválidos', 400, result.error.issues);
    }

    const { email, code, newPassword } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return sendError(res, 'INVALID_OTP', 'Código incorrecto o expirado', 400);
    }

    const otpToken = await prisma.otpToken.findFirst({
      where: {
        userId: user.id,
        code,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpToken) {
      return sendError(res, 'INVALID_OTP', 'Código incorrecto o expirado', 400);
    }

    const passwordHash = await argon2.hash(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.otpToken.delete({
        where: { id: otpToken.id }
      })
    ]);

    return sendSuccess(res, { message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    return sendError(res, 'INTERNAL_SERVER_ERROR', 'Ocurrió un error inesperado', 500);
  }
};
