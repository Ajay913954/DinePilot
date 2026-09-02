import { Response } from 'express';
import { ApiResponseSuccess } from '@dinepilot/types';

export const sendSuccess = <T>(res: Response, data: T, message?: string, statusCode: number = 200) => {
  const response: ApiResponseSuccess<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  return res.status(statusCode).json(response);
};
