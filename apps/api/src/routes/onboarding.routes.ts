import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.post('/', RestaurantController.createOnboarding);

export default router;
