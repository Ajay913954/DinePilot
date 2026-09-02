import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/me', RestaurantController.getMe);
router.patch('/me', RestaurantController.updateMe);

export default router;
