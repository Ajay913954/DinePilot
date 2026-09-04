import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/availability', ReservationController.checkAvailability);
router.get('/', ReservationController.getReservations);
router.post('/', ReservationController.createReservation);
router.get('/:id', ReservationController.getReservationById);
router.patch('/:id', ReservationController.updateReservation);

router.post('/:id/confirm', ReservationController.confirmReservation);
router.post('/:id/cancel', ReservationController.cancelReservation);
router.post('/:id/seat', ReservationController.seatReservation);
router.post('/:id/complete', ReservationController.completeReservation);
router.post('/:id/no-show', ReservationController.markNoShow);

export default router;
