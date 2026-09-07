import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRestaurantRole } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/stats', OrderController.getOrderDashboardStats);
router.get('/', OrderController.getOrders);
router.get('/:id', OrderController.getOrderById);

router.post(
  '/',
  requireRestaurantRole([Role.OWNER, Role.MANAGER, Role.STAFF]),
  OrderController.createOrder
);

router.patch(
  '/:id',
  requireRestaurantRole([Role.OWNER, Role.MANAGER, Role.STAFF]),
  OrderController.updateOrder
);

router.patch(
  '/:id/status',
  requireRestaurantRole([Role.OWNER, Role.MANAGER, Role.STAFF]),
  OrderController.updateOrderStatus
);

router.post(
  '/:id/items',
  requireRestaurantRole([Role.OWNER, Role.MANAGER, Role.STAFF]),
  OrderController.addOrderItem
);

router.patch(
  '/:id/items/:itemId',
  requireRestaurantRole([Role.OWNER, Role.MANAGER, Role.STAFF]),
  OrderController.updateOrderItem
);

router.delete(
  '/:id/items/:itemId',
  requireRestaurantRole([Role.OWNER, Role.MANAGER, Role.STAFF]),
  OrderController.removeOrderItem
);

router.post(
  '/:id/cancel',
  requireRestaurantRole([Role.OWNER, Role.MANAGER, Role.STAFF]),
  OrderController.cancelOrder
);

export default router;
