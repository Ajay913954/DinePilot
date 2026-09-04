import { Request, Response, NextFunction } from 'express';
import { MenuService } from '../services/menu.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import {
  createMenuCategorySchema,
  updateMenuCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  toggleItemAvailabilitySchema,
  reorderCategoriesSchema,
  reorderMenuItemsSchema,
  menuItemQuerySchema,
} from '@dinepilot/validation';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

export class MenuController {
  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const categories = await MenuService.getCategories(req.user.id);
      return sendSuccess(res, { categories });
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = createMenuCategorySchema.parse(req.body);
      const category = await MenuService.createCategory(req.user.id, validatedData);

      return sendSuccess(res, { category }, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const validatedData = updateMenuCategorySchema.parse(req.body);
      const category = await MenuService.updateCategory(req.user.id, id, validatedData);

      return sendSuccess(res, { category }, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const force = req.query.force === 'true';

      if (force && req.userRole !== 'OWNER') {
        throw new AppError(
          'Forbidden. Force-deleting a menu category containing dishes is restricted to Restaurant OWNER only.',
          403,
          'FORCE_DELETE_RESTRICTED'
        );
      }

      const category = await MenuService.deleteCategory(req.user.id, id, force);

      return sendSuccess(res, { category }, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async reorderCategories(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = reorderCategoriesSchema.parse(req.body);
      const result = await MenuService.reorderCategories(req.user.id, validatedData.categoryIds);

      return sendSuccess(res, { success: true }, 'Categories reordered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMenuItems(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedQuery = menuItemQuerySchema.parse(req.query);
      const items = await MenuService.getMenuItems(req.user.id, validatedQuery);

      return sendSuccess(res, { items });
    } catch (error) {
      next(error);
    }
  }

  static async getMenuItemById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const item = await MenuService.getMenuItemById(req.user.id, id);

      return sendSuccess(res, { item });
    } catch (error) {
      next(error);
    }
  }

  static async createMenuItem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = createMenuItemSchema.parse(req.body);
      const item = await MenuService.createMenuItem(req.user.id, validatedData);

      return sendSuccess(res, { item }, 'Menu item created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateMenuItem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const validatedData = updateMenuItemSchema.parse(req.body);
      const item = await MenuService.updateMenuItem(req.user.id, id, validatedData);

      return sendSuccess(res, { item }, 'Menu item updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async toggleItemAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const validatedData = toggleItemAvailabilitySchema.parse(req.body);
      const item = await MenuService.toggleItemAvailability(req.user.id, id, validatedData.isAvailable);

      return sendSuccess(res, { item }, 'Item availability updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteMenuItem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const item = await MenuService.deleteMenuItem(req.user.id, id);

      return sendSuccess(res, { item }, 'Menu item deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async reorderMenuItems(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = reorderMenuItemsSchema.parse(req.body);
      const result = await MenuService.reorderMenuItems(
        req.user.id,
        validatedData.categoryId,
        validatedData.itemIds
      );

      return sendSuccess(res, { success: true }, 'Menu items reordered successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPublicMenu(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params as { slug: string };
      const publicMenu = await MenuService.getPublicMenuBySlug(slug);

      return sendSuccess(res, publicMenu);
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardMenuStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const restaurant = await RestaurantService.getUserRestaurant(req.user.id);
      if (!restaurant) {
        throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
      }

      const stats = await MenuService.getDashboardMenuMetrics(restaurant.id);
      return sendSuccess(res, { stats });
    } catch (error) {
      next(error);
    }
  }
}
