import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRestaurantRole } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', BillingController.getPayments);
router.get('/order/:orderId', BillingController.getOrderPayments);
router.get('/:id', BillingController.getPaymentById);

router.post(
  '/',
  requireRestaurantRole([Role.OWNER, Role.MANAGER, Role.STAFF]),
  BillingController.createPayment
);

router.patch(
  '/:id/status',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  BillingController.updatePaymentStatus
);

export default router;
