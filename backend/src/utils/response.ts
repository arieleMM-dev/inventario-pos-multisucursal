import { Response } from 'express';

export function sendSuccess(res: Response, data: any, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

export function sendError(res: Response, code: string, message: string, statusCode = 400, details?: any) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
      details,
    },
  });
}
