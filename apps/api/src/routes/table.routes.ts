import { Router } from 'express';
import { TableController } from '../controllers/table.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRestaurantRole } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', TableController.getTables);
router.post(
  '/',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  TableController.createTable
);
router.get('/:id', TableController.getTableById);
router.patch(
  '/:id',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  TableController.updateTable
);
router.delete(
  '/:id',
  requireRestaurantRole([Role.OWNER]),
  TableController.deleteTable
);

export default router;
