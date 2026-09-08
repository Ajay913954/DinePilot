import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRestaurantRole } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/metrics', BillingController.getBillingMetrics);
router.get('/', BillingController.getBills);
router.get('/order/:orderId', BillingController.getBillByOrder);
router.get('/:id', BillingController.getBillById);

router.post(
  '/',
  requireRestaurantRole([Role.OWNER, Role.MANAGER, Role.STAFF]),
  BillingController.createBill
);

export default router;
