import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { TableStatus, ReservationStatus, PrismaClient, Prisma } from '@prisma/client';

export interface CheckAvailabilityParams {
  restaurantId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  guestCount: number;
  tableId?: string;
  durationMinutes?: number;
  excludeReservationId?: string;
}

export class AvailabilityService {
  /**
   * Helper to add minutes to HH:mm formatted string
   */
  static calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  }

  /**
   * Core Centralized Availability Engine
   */
  static async checkAvailability(
    params: CheckAvailabilityParams,
    db: Prisma.TransactionClient | PrismaClient = prisma
  ) {
    const {
      restaurantId,
      date,
      startTime,
      guestCount,
      tableId,
      durationMinutes = 90,
      excludeReservationId,
    } = params;

    // 1. Fetch Restaurant Settings & Operating Hours
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found.', 404, 'RESTAURANT_NOT_FOUND');
    }

    // 2. Compute Requested End Time
    const endTime = this.calculateEndTime(startTime, durationMinutes);

    // 3. Past Date & Time Validation
    const now = new Date();
    const reservationDate = new Date(`${date}T${startTime}:00`);

    if (isNaN(reservationDate.getTime())) {
      throw new AppError('Invalid date or time format.', 400, 'INVALID_DATE_TIME');
    }

    if (reservationDate < now) {
      throw new AppError('Reservations cannot be booked in the past.', 400, 'RESERVATION_IN_PAST');
    }

    // 4. Operating Hours Validation
    if (restaurant.openingTime && restaurant.closingTime) {
      const openMinutes = Number(restaurant.openingTime.split(':')[0]) * 60 + Number(restaurant.openingTime.split(':')[1]);
      const closeMinutes = Number(restaurant.closingTime.split(':')[0]) * 60 + Number(restaurant.closingTime.split(':')[1]);
      const reqStartMinutes = Number(startTime.split(':')[0]) * 60 + Number(startTime.split(':')[1]);
      const reqEndMinutes = Number(endTime.split(':')[0]) * 60 + Number(endTime.split(':')[1]);

      if (reqStartMinutes < openMinutes || reqEndMinutes > closeMinutes) {
        throw new AppError(
          `Restaurant is closed at requested time. Operating hours: ${restaurant.openingTime} - ${restaurant.closingTime}`,
          400,
          'RESTAURANT_CLOSED'
        );
      }
    }

    // 5. Query Active & Non-Disabled Tables for Restaurant
    const candidateTables = await db.table.findMany({
      where: {
        restaurantId,
        isActive: true,
        status: { not: TableStatus.DISABLED },
        ...(tableId ? { id: tableId } : {}),
      },
    });

    if (candidateTables.length === 0) {
      if (tableId) {
        throw new AppError('Selected table is inactive or disabled.', 400, 'TABLE_INACTIVE');
      }
      throw new AppError('No operational tables found in restaurant.', 404, 'NO_TABLE_AVAILABLE');
    }

    // 6. Query Existing Blocking Reservations for Target Date
    const blockingStatuses = [
      ReservationStatus.PENDING,
      ReservationStatus.CONFIRMED,
      ReservationStatus.SEATED,
    ];

    const targetDateStart = new Date(date);
    targetDateStart.setHours(0, 0, 0, 0);

    const targetDateEnd = new Date(date);
    targetDateEnd.setHours(23, 59, 59, 999);

    const existingReservations = await db.reservation.findMany({
      where: {
        restaurantId,
        reservationDate: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
        status: { in: blockingStatuses },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      },
    });

    // 7. Filter Available Tables without Overlapping Time Conflicts
    const availableTables = candidateTables.filter((table) => {
      // Check Capacity
      if (table.capacity < guestCount) {
        return false;
      }

      // Check Time Overlap Conflicts
      const hasConflict = existingReservations.some((res) => {
        if (res.tableId !== table.id) return false;
        return res.startTime < endTime && res.endTime > startTime;
      });

      return !hasConflict;
    });

    // 8. Sort Suitable Tables by Smallest Capacity First
    availableTables.sort((a, b) => {
      if (a.capacity !== b.capacity) return a.capacity - b.capacity;
      return a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true });
    });

    // 9. Specific Table Selection Validation
    if (tableId) {
      const selectedTable = candidateTables.find((t) => t.id === tableId);
      if (!selectedTable) {
        throw new AppError('Requested table does not exist in this restaurant.', 404, 'TABLE_NOT_FOUND');
      }
      if (selectedTable.capacity < guestCount) {
        throw new AppError(
          `Requested table capacity (${selectedTable.capacity}) is insufficient for ${guestCount} guests.`,
          400,
          'TABLE_CAPACITY_TOO_SMALL'
        );
      }

      const isTableFree = availableTables.some((t) => t.id === tableId);
      if (!isTableFree) {
        throw new AppError('Requested table is already reserved for the selected time slot.', 409, 'RESERVATION_CONFLICT');
      }
    }

    return {
      available: availableTables.length > 0,
      requestedTime: { startTime, endTime, date, durationMinutes },
      assignedTable: availableTables[0] || null,
      availableTables,
    };
  }
}
