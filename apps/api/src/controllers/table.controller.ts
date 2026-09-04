import { Request, Response, NextFunction } from 'express';
import { TableService } from '../services/table.service.js';
import { createTableSchema, updateTableSchema } from '@dinepilot/validation';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

export class TableController {
  static async getTables(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const includeInactive = req.query.includeInactive === 'true';
      const tables = await TableService.getTables(req.user.id, includeInactive);

      return sendSuccess(res, { tables });
    } catch (error) {
      next(error);
    }
  }

  static async createTable(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = createTableSchema.parse(req.body);
      const table = await TableService.createTable(req.user.id, validatedData);

      return sendSuccess(res, { table }, 'Table created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getTableById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const table = await TableService.getTableById(req.user.id, id);

      return sendSuccess(res, { table });
    } catch (error) {
      next(error);
    }
  }

  static async updateTable(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const validatedData = updateTableSchema.parse(req.body);
      const table = await TableService.updateTable(req.user.id, id, validatedData);

      return sendSuccess(res, { table }, 'Table updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteTable(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const table = await TableService.deleteTable(req.user.id, id);

      return sendSuccess(res, { table }, 'Table deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
}
