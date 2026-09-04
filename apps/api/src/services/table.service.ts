import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { CreateTableInput, UpdateTableInput } from '@dinepilot/validation';
import { RestaurantService } from './restaurant.service.js';
import { TableLocation, TableStatus } from '@prisma/client';

export class TableService {
  /**
   * Fetch all tables for the authenticated user's active restaurant
   */
  static async getTables(userId: string, includeInactive: boolean = false) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const tables = await prisma.table.findMany({
      where: {
        restaurantId: restaurant.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: {
        tableNumber: 'asc',
      },
    });

    return tables;
  }

  /**
   * Create a new table within the user's active restaurant
   */
  static async createTable(userId: string, input: CreateTableInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const existingTable = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId: restaurant.id,
          tableNumber: input.tableNumber.trim(),
        },
      },
    });

    if (existingTable) {
      throw new AppError(`Table number "${input.tableNumber}" already exists in your restaurant.`, 409, 'TABLE_NUMBER_EXISTS');
    }

    const table = await prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        tableNumber: input.tableNumber.trim(),
        name: input.name?.trim() || null,
        capacity: input.capacity,
        location: (input.location as TableLocation) || TableLocation.INDOOR,
        status: (input.status as TableStatus) || TableStatus.AVAILABLE,
        isActive: input.isActive ?? true,
      },
    });

    return table;
  }

  /**
   * Fetch a single table by ID with tenant security check
   */
  static async getTableById(userId: string, tableId: string) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        restaurantId: restaurant.id,
      },
    });

    if (!table) {
      throw new AppError('Table not found or access forbidden.', 404, 'TABLE_NOT_FOUND');
    }

    return table;
  }

  /**
   * Update table details
   */
  static async updateTable(userId: string, tableId: string, input: UpdateTableInput) {
    const table = await this.getTableById(userId, tableId);

    if (input.tableNumber && input.tableNumber.trim() !== table.tableNumber) {
      const existing = await prisma.table.findUnique({
        where: {
          restaurantId_tableNumber: {
            restaurantId: table.restaurantId,
            tableNumber: input.tableNumber.trim(),
          },
        },
      });

      if (existing && existing.id !== tableId) {
        throw new AppError(`Table number "${input.tableNumber}" already exists.`, 409, 'TABLE_NUMBER_EXISTS');
      }
    }

    const updated = await prisma.table.update({
      where: { id: tableId },
      data: {
        ...(input.tableNumber && { tableNumber: input.tableNumber.trim() }),
        ...(input.name !== undefined && { name: input.name?.trim() || null }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.location && { location: input.location as TableLocation }),
        ...(input.status && { status: input.status as TableStatus }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    return updated;
  }

  /**
   * Soft delete a table (isActive = false) to preserve historical reservation data
   */
  static async deleteTable(userId: string, tableId: string) {
    const table = await this.getTableById(userId, tableId);

    const deactivated = await prisma.table.update({
      where: { id: table.id },
      data: { isActive: false, status: TableStatus.DISABLED },
    });

    return deactivated;
  }
}
