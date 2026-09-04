import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRestaurantRole } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', CustomerController.getCustomers);
router.post('/', CustomerController.createCustomer);

router.post(
  '/merge',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  CustomerController.mergeCustomers
);

router.get('/stats', CustomerController.getCustomerOverviewStats);
router.get('/:id', CustomerController.getCustomerById);
router.get('/:id/reservations', CustomerController.getCustomerReservations);

router.patch('/:id', CustomerController.updateCustomer);

router.delete(
  '/:id',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  CustomerController.deleteCustomer
);

router.post(
  '/:id/tags',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  CustomerController.addTag
);

router.delete(
  '/:id/tags/:tagId',
  requireRestaurantRole([Role.OWNER, Role.MANAGER]),
  CustomerController.removeTag
);

export default router;
