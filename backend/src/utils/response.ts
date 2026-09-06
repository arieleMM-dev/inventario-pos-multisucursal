import { Response } from 'express';

export function sendSuccess(res: Response, data: any, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

export function sendError(res: Response, code: string, message: string, statusCode = 400, details?: any) {
  // Si 'details' es un array (ej. result.error.issues de Zod), lo estructuramos de forma amigable
  let formattedDetails = details;
  if (code === 'VALIDATION_ERROR' && Array.isArray(details)) {
    formattedDetails = details.map((issue: any) => ({
      field: issue.field || (issue.path ? issue.path.join('.') : 'unknown'),
      message: issue.message
    }));
  }

  return res.status(statusCode).json({
    error: {
      code,
      message,
      details: formattedDetails,
    },
  });
}
