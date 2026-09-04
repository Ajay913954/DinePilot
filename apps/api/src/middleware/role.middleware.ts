import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';
import { Role } from '@prisma/client';

export const requireRestaurantRole = (allowedRoles: Role[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized access. Please log in.', 401, 'UNAUTHORIZED');
      }

      const membership = await prisma.restaurantUser.findFirst({
        where: { userId: req.user.id },
      });

      if (!membership) {
        throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
      }

      if (!allowedRoles.includes(membership.role)) {
        throw new AppError('Forbidden. You do not have sufficient permissions for this action.', 403, 'FORBIDDEN');
      }

      req.userRole = membership.role;
      req.restaurantId = membership.restaurantId;

      next();
    } catch (error) {
      next(error);
    }
  };
};
