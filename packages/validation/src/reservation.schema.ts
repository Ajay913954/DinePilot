import { z } from 'zod';

export const availabilityCheckSchema = z.object({
  date: z.string().min(1, 'Reservation date is required'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'),
  guestCount: z.coerce.number().min(1, 'Guest count must be at least 1').max(50),
  durationMinutes: z.coerce.number().min(15).max(360).optional().default(90),
  tableId: z.string().optional(),
});

export type AvailabilityCheckInput = z.input<typeof availabilityCheckSchema>;

export const createReservationSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters').max(100),
  customerPhone: z.string().min(5, 'Valid phone number is required'),
  customerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'),
  guestCount: z.coerce.number().min(1, 'Guest count must be at least 1').max(50),
  durationMinutes: z.coerce.number().min(15).max(360).optional().default(90),
  tableId: z.string().optional(),
  specialRequest: z.string().max(500).optional(),
  source: z.enum(['DASHBOARD', 'WEBSITE', 'WHATSAPP', 'AI', 'QR', 'PHONE', 'OTHER']).optional().default('DASHBOARD'),
  notes: z.string().max(500).optional(),
});

export type CreateReservationInput = z.input<typeof createReservationSchema>;

export const updateReservationSchema = z.object({
  date: z.string().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format').optional(),
  guestCount: z.coerce.number().min(1).max(50).optional(),
  durationMinutes: z.coerce.number().min(15).max(360).optional(),
  tableId: z.string().optional(),
  specialRequest: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
});

export type UpdateReservationInput = z.input<typeof updateReservationSchema>;
