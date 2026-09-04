import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRestaurantRole } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Public route (unauthenticated)
router.get('/public/:slug', RestaurantController.getBySlug);

// Authenticated routes
router.get('/me', requireAuth, RestaurantController.getMe);
router.patch(
  '/me',
  requireAuth,
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  RestaurantController.updateMe
);

export default router;
