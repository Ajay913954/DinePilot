import { Request, Response, NextFunction } from 'express';
import { ReservationService } from '../services/reservation.service.js';
import { AvailabilityService } from '../services/availability.service.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { createReservationSchema, updateReservationSchema, availabilityCheckSchema } from '@dinepilot/validation';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';
import { ReservationStatus } from '@prisma/client';

export class ReservationController {
  static async checkAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const restaurant = await RestaurantService.getUserRestaurant(req.user.id);
      if (!restaurant) {
        throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
      }

      const validatedData = availabilityCheckSchema.parse({
        date: req.query.date,
        startTime: req.query.startTime,
        guestCount: req.query.guestCount,
        durationMinutes: req.query.durationMinutes,
        tableId: req.query.tableId,
      });

      const availability = await AvailabilityService.checkAvailability({
        restaurantId: restaurant.id,
        ...validatedData,
      });

      return sendSuccess(res, availability);
    } catch (error) {
      next(error);
    }
  }

  static async getReservations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const filters = {
        date: req.query.date as string | undefined,
        status: req.query.status as ReservationStatus | undefined,
        tableId: req.query.tableId as string | undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };

      const data = await ReservationService.getReservations(req.user.id, filters);

      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async createReservation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const validatedData = createReservationSchema.parse(req.body);
      const reservation = await ReservationService.createReservation(req.user.id, validatedData);

      return sendSuccess(res, { reservation }, 'Reservation created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getReservationById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const reservation = await ReservationService.getReservationById(req.user.id, id);

      return sendSuccess(res, { reservation });
    } catch (error) {
      next(error);
    }
  }

  static async updateReservation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params as { id: string };
      const validatedData = updateReservationSchema.parse(req.body);
      const reservation = await ReservationService.updateReservation(req.user.id, id, validatedData);

      return sendSuccess(res, { reservation }, 'Reservation updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async confirmReservation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      const { id } = req.params as { id: string };
      const reservation = await ReservationService.updateStatus(req.user.id, id, ReservationStatus.CONFIRMED);
      return sendSuccess(res, { reservation }, 'Reservation confirmed');
    } catch (error) {
      next(error);
    }
  }

  static async cancelReservation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      const { id } = req.params as { id: string };
      const reservation = await ReservationService.updateStatus(req.user.id, id, ReservationStatus.CANCELLED);
      return sendSuccess(res, { reservation }, 'Reservation cancelled');
    } catch (error) {
      next(error);
    }
  }

  static async seatReservation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      const { id } = req.params as { id: string };
      const reservation = await ReservationService.updateStatus(req.user.id, id, ReservationStatus.SEATED);
      return sendSuccess(res, { reservation }, 'Party marked as seated');
    } catch (error) {
      next(error);
    }
  }

  static async completeReservation(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      const { id } = req.params as { id: string };
      const reservation = await ReservationService.updateStatus(req.user.id, id, ReservationStatus.COMPLETED);
      return sendSuccess(res, { reservation }, 'Reservation completed');
    } catch (error) {
      next(error);
    }
  }

  static async markNoShow(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Unauthorized access.', 401, 'UNAUTHORIZED');
      const { id } = req.params as { id: string };
      const reservation = await ReservationService.updateStatus(req.user.id, id, ReservationStatus.NO_SHOW);
      return sendSuccess(res, { reservation }, 'Reservation marked as no-show');
    } catch (error) {
      next(error);
    }
  }
}
