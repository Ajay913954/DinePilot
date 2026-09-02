import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '@dinepilot/validation';
import { sendSuccess } from '../utils/response.js';
import { SESSION_COOKIE_NAME } from '../utils/auth.js';
import { ENV } from '../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: ENV.IS_PROD,
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const { user, token } = await AuthService.register(validatedData);

      res.cookie(SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);

      return sendSuccess(res, { user }, 'Account created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { user, token } = await AuthService.login(validatedData);

      res.cookie(SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);

      return sendSuccess(res, { user }, 'Signed in successfully');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME];
      if (token) {
        await AuthService.logout(token);
      }

      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: ENV.IS_PROD,
        sameSite: 'lax',
      });

      return sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, { user: req.user });
    } catch (error) {
      next(error);
    }
  }
}
