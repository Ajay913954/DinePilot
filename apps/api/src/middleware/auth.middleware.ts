import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashToken, SESSION_COOKIE_NAME } from '../utils/auth.js';
import { AppError } from './errorHandler.js';
import { UserRole } from '@dinepilot/types';

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token = req.cookies?.[SESSION_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Unauthorized access. Please log in to continue.', 401, 'UNAUTHORIZED');
    }

    const tokenHash = hashToken(token);

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            restaurants: {
              include: {
                restaurant: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new AppError('Invalid or expired session. Please log in again.', 401, 'UNAUTHORIZED');
    }

    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      throw new AppError('Session expired. Please log in again.', 401, 'SESSION_EXPIRED');
    }

    const primaryRestaurantUser = session.user.restaurants[0];

    req.user = {
      id: session.user.id,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt.toISOString(),
      updatedAt: session.user.updatedAt.toISOString(),
      role: primaryRestaurantUser ? (primaryRestaurantUser.role as UserRole) : UserRole.OWNER,
      restaurantId: primaryRestaurantUser ? primaryRestaurantUser.restaurantId : undefined,
    };

    req.sessionId = session.id;

    next();
  } catch (error) {
    next(error);
  }
};
