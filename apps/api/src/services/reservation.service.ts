import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { CreateReservationInput, UpdateReservationInput } from '@dinepilot/validation';
import { AvailabilityService } from './availability.service.js';
import { RestaurantService } from './restaurant.service.js';
import { ReservationStatus, ReservationSource, TableStatus } from '@prisma/client';
import { normalizePhone } from '../utils/phone.utils.js';

export class ReservationService {
  /**
   * Validate status state transitions
   */
  static validateStatusTransition(currentStatus: ReservationStatus, newStatus: ReservationStatus) {
    if (currentStatus === newStatus) return;

    const validTransitions: Record<ReservationStatus, ReservationStatus[]> = {
      [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
      [ReservationStatus.CONFIRMED]: [ReservationStatus.SEATED, ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW],
      [ReservationStatus.SEATED]: [ReservationStatus.COMPLETED],
      [ReservationStatus.COMPLETED]: [],
      [ReservationStatus.CANCELLED]: [],
      [ReservationStatus.NO_SHOW]: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  /**
   * Create a new reservation with customer resolution & availability engine validation
   */
  static async createReservation(userId: string, input: CreateReservationInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const durationMinutes = input.durationMinutes || 90;

    // Execute within Prisma transaction for strict concurrency & double-booking prevention
    const reservation = await prisma.$transaction(async (tx) => {
      // 0. Acquire row-level lock FOR UPDATE on Restaurant to serialize concurrent reservation attempts
      await tx.$executeRaw`SELECT id FROM "Restaurant" WHERE id = ${restaurant.id} FOR UPDATE`;

      // 1. Run Availability Check inside transaction using tx client
      const availability = await AvailabilityService.checkAvailability(
        {
          restaurantId: restaurant.id,
          date: input.date,
          startTime: input.startTime,
          guestCount: input.guestCount,
          tableId: input.tableId,
          durationMinutes,
        },
        tx
      );

      if (!availability.available || !availability.assignedTable) {
        throw new AppError('No suitable tables are available for the selected time slot.', 409, 'RESERVATION_CONFLICT');
      }

      const assignedTable = availability.assignedTable;
      const endTime = availability.requestedTime.endTime;
      const reservationDate = new Date(`${input.date}T00:00:00.000Z`);

      // 2. Customer Lookup & Auto-Creation (unique per restaurant + phone)
      const cleanPhone = normalizePhone(input.customerPhone);
      let customer = await tx.customer.findUnique({
        where: {
          restaurantId_phone: {
            restaurantId: restaurant.id,
            phone: cleanPhone,
          },
        },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            restaurantId: restaurant.id,
            name: input.customerName.trim(),
            phone: cleanPhone,
            email: input.customerEmail?.trim() || null,
          },
        });
      } else if (input.customerEmail && !customer.email) {
        // Update customer email if missing
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { email: input.customerEmail.trim() },
        });
      }

      // 3. Create Reservation
      const newReservation = await tx.reservation.create({
        data: {
          restaurantId: restaurant.id,
          tableId: assignedTable.id,
          customerId: customer.id,
          reservationDate,
          startTime: input.startTime,
          endTime,
          durationMinutes,
          guestCount: input.guestCount,
          status: ReservationStatus.PENDING,
          customerName: input.customerName.trim(),
          customerPhone: cleanPhone,
          customerEmail: input.customerEmail?.trim() || null,
          specialRequest: input.specialRequest?.trim() || null,
          source: (input.source as ReservationSource) || ReservationSource.DASHBOARD,
          notes: input.notes?.trim() || null,
        },
        include: {
          table: true,
          customer: true,
        },
      });

      // 4. Record Audit Log
      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'RESERVATION_CREATED',
          entity: 'Reservation',
          entityId: newReservation.id,
          details: `Created reservation for ${input.customerName} on Table ${assignedTable.tableNumber}`,
        },
      });

      return newReservation;
    });

    return reservation;
  }

  /**
   * List reservations with date/status/table filters & pagination
   */
  static async getReservations(
    userId: string,
    filters: {
      date?: string;
      status?: ReservationStatus;
      tableId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      restaurantId: restaurant.id,
    };

    if (filters.date) {
      const targetDate = new Date(filters.date);
      targetDate.setHours(0, 0, 0, 0);
      const targetEnd = new Date(filters.date);
      targetEnd.setHours(23, 59, 59, 999);

      where.reservationDate = {
        gte: targetDate,
        lte: targetEnd,
      };
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tableId) {
      where.tableId = filters.tableId;
    }

    if (filters.search) {
      const search = filters.search.trim();
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, reservations] = await Promise.all([
      prisma.reservation.count({ where }),
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ reservationDate: 'asc' }, { startTime: 'asc' }],
        include: {
          table: true,
          customer: true,
        },
      }),
    ]);

    return {
      reservations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single reservation by ID
   */
  static async getReservationById(userId: string, reservationId: string) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        restaurantId: restaurant.id,
      },
      include: {
        table: true,
        customer: true,
      },
    });

    if (!reservation) {
      throw new AppError('Reservation not found.', 404, 'RESERVATION_NOT_FOUND');
    }

    return reservation;
  }

  /**
   * Update / Reschedule reservation
   */
  static async updateReservation(userId: string, reservationId: string, input: UpdateReservationInput) {
    const existing = await this.getReservationById(userId, reservationId);

    const isRescheduling =
      (input.date && input.date !== existing.reservationDate.toISOString().split('T')[0]) ||
      (input.startTime && input.startTime !== existing.startTime) ||
      (input.guestCount && input.guestCount !== existing.guestCount) ||
      (input.tableId && input.tableId !== existing.tableId);

    let assignedTableId = input.tableId || existing.tableId || undefined;
    let newEndTime = existing.endTime;

    if (isRescheduling) {
      const targetDate = input.date || existing.reservationDate.toISOString().split('T')[0];
      const targetStartTime = input.startTime || existing.startTime;
      const targetGuestCount = input.guestCount || existing.guestCount;
      const durationMinutes = input.durationMinutes || existing.durationMinutes;

      const availability = await AvailabilityService.checkAvailability({
        restaurantId: existing.restaurantId,
        date: targetDate,
        startTime: targetStartTime,
        guestCount: targetGuestCount,
        tableId: assignedTableId,
        durationMinutes,
        excludeReservationId: existing.id,
      });

      if (!availability.available || !availability.assignedTable) {
        throw new AppError('Reschedule failed. No suitable table available for requested time slot.', 409, 'RESERVATION_CONFLICT');
      }

      assignedTableId = availability.assignedTable.id;
      newEndTime = availability.requestedTime.endTime;
    }

    if (input.status) {
      this.validateStatusTransition(existing.status as ReservationStatus, input.status as ReservationStatus);
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        ...(input.date && { reservationDate: new Date(`${input.date}T00:00:00.000Z`) }),
        ...(input.startTime && { startTime: input.startTime }),
        ...(newEndTime !== existing.endTime && { endTime: newEndTime }),
        ...(input.durationMinutes && { durationMinutes: input.durationMinutes }),
        ...(input.guestCount && { guestCount: input.guestCount }),
        ...(assignedTableId && { tableId: assignedTableId }),
        ...(input.status && { status: input.status as ReservationStatus }),
        ...(input.specialRequest !== undefined && { specialRequest: input.specialRequest }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      include: {
        table: true,
        customer: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: existing.restaurantId,
        userId,
        action: 'RESERVATION_UPDATED',
        entity: 'Reservation',
        entityId: reservationId,
        details: `Updated reservation status: ${input.status || 'Details updated'}`,
      },
    });

    return updated;
  }

  /**
   * Helper to transition reservation status cleanly
   */
  static async updateStatus(userId: string, reservationId: string, newStatus: ReservationStatus) {
    const existing = await this.getReservationById(userId, reservationId);
    this.validateStatusTransition(existing.status as ReservationStatus, newStatus);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: newStatus },
        include: { table: true, customer: true },
      });

      // Update table operational status on seat/complete
      if (newStatus === ReservationStatus.SEATED && updated.tableId) {
        await tx.table.update({
          where: { id: updated.tableId },
          data: { status: TableStatus.OCCUPIED },
        });
      } else if (newStatus === ReservationStatus.COMPLETED && updated.tableId) {
        await tx.table.update({
          where: { id: updated.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }

      await tx.auditLog.create({
        data: {
          restaurantId: existing.restaurantId,
          userId,
          action: `RESERVATION_${newStatus}`,
          entity: 'Reservation',
          entityId: reservationId,
          details: `Reservation marked as ${newStatus}`,
        },
      });

      return updated;
    });
  }
}
