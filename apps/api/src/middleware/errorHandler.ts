import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiResponseError } from '@dinepilot/types';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Zod Validation Error
  if (err instanceof ZodError) {
    const formattedError: ApiResponseError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors[0]?.message || 'Validation failed',
        details: err.errors,
      },
    };
    return res.status(400).json(formattedError);
  }

  // Custom App Error
  if (err instanceof AppError) {
    const formattedError: ApiResponseError = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    return res.status(err.statusCode).json(formattedError);
  }

  // Default Express / Server Internal Error
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred. Please try again.' 
    : (err.message || 'Internal Server Error');

  const formattedError: ApiResponseError = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message,
    },
  };

  if (process.env.NODE_ENV !== 'production') {
    console.error('[API Error]:', err);
  }

  return res.status(statusCode).json(formattedError);
};
