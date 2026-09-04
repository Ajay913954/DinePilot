import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  mergeCustomerSchema,
  customerTagSchema,
  customerQuerySchema,
} from '@dinepilot/validation';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

export class CustomerController {
  static async getCustomerOverviewStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const restaurant = await RestaurantService.getUserRestaurant(req.user.id);
      if (!restaurant) {
        throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
      }

      const stats = await CustomerService.getDashboardCustomerMetrics(restaurant.id);
      return sendSuccess(res, { stats });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedQuery = customerQuerySchema.parse(req.query);
      const result = await CustomerService.getCustomers(req.user.id, validatedQuery);

      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = createCustomerSchema.parse(req.body);
      const customer = await CustomerService.createCustomer(req.user.id, validatedData);

      return sendSuccess(res, { customer }, 'Customer created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const profile = await CustomerService.getCustomerById(req.user.id, id);

      return sendSuccess(res, { customer: profile });
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const validatedData = updateCustomerSchema.parse(req.body);
      const customer = await CustomerService.updateCustomer(req.user.id, id, validatedData);

      return sendSuccess(res, { customer }, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const customer = await CustomerService.deleteCustomer(req.user.id, id);

      return sendSuccess(res, { customer }, 'Customer deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerReservations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const reservations = await CustomerService.getCustomerReservations(req.user.id, id);

      return sendSuccess(res, { reservations });
    } catch (error) {
      next(error);
    }
  }

  static async mergeCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = mergeCustomerSchema.parse(req.body);
      const customer = await CustomerService.mergeCustomers(req.user.id, validatedData);

      return sendSuccess(res, { customer }, 'Customers merged successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addTag(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const validatedData = customerTagSchema.parse(req.body);
      const tag = await CustomerService.addTagToCustomer(req.user.id, id, validatedData.name);

      return sendSuccess(res, { tag }, 'Tag added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async removeTag(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id, tagId } = req.params as { id: string; tagId: string };
      const result = await CustomerService.removeTagFromCustomer(req.user.id, id, tagId);

      return sendSuccess(res, result, 'Tag removed successfully');
    } catch (error) {
      next(error);
    }
  }
}
