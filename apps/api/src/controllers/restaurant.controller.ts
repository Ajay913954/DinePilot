import { Request, Response, NextFunction } from 'express';
import { RestaurantService } from '../services/restaurant.service.js';
import { restaurantOnboardingSchema, restaurantUpdateSchema } from '@dinepilot/validation';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

export class RestaurantController {
  static async createOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = restaurantOnboardingSchema.parse(req.body);
      const restaurant = await RestaurantService.createRestaurantOnboarding(req.user.id, validatedData);

      return sendSuccess(res, { restaurant }, 'Restaurant created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const restaurant = await RestaurantService.getUserRestaurant(req.user.id);
      return sendSuccess(res, { restaurant });
    } catch (error) {
      next(error);
    }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = restaurantUpdateSchema.parse(req.body);
      const restaurant = await RestaurantService.updateRestaurant(req.user.id, validatedData);

      return sendSuccess(res, { restaurant }, 'Restaurant profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
