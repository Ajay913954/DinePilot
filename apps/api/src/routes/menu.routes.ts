import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRestaurantRole } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Unauthenticated Public Menu Endpoint
router.get('/public/:slug', MenuController.getPublicMenu);

// Protected Admin Routes
router.use(requireAuth);

router.get('/stats', MenuController.getDashboardMenuStats);

// Categories
router.get('/categories', MenuController.getCategories);
router.post(
  '/categories',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  MenuController.createCategory
);
router.patch(
  '/categories/:id',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  MenuController.updateCategory
);
router.delete(
  '/categories/:id',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  MenuController.deleteCategory
);
router.post(
  '/categories/reorder',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  MenuController.reorderCategories
);

// Menu Items
router.get('/items', MenuController.getMenuItems);
router.get('/items/:id', MenuController.getMenuItemById);
router.post(
  '/items',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  MenuController.createMenuItem
);
router.patch(
  '/items/:id',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  MenuController.updateMenuItem
);
router.patch(
  '/items/:id/availability',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  MenuController.toggleItemAvailability
);
router.delete(
  '/items/:id',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  MenuController.deleteMenuItem
);
router.post(
  '/items/reorder',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  MenuController.reorderMenuItems
);

export default router;
