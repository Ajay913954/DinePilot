import { z } from 'zod';

export const createBillSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

export const createPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  amount: z.number({ required_error: 'Amount is required' }).gt(0, 'Payment amount must be greater than 0'),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER'], {
    required_error: 'Payment method is required',
    invalid_type_error: 'Invalid payment method',
  }),
  status: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED']).optional().default('SUCCESS'),
  idempotencyKey: z.string().trim().max(100, 'Idempotency key cannot exceed 100 characters').optional().nullable(),
  transactionReference: z.string().trim().max(100, 'Transaction reference cannot exceed 100 characters').optional().nullable(),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PROCESSING',
    'SUCCESS',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
  ], {
    required_error: 'Payment status is required',
    invalid_type_error: 'Invalid payment status',
  }),
});

export const paymentQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
  billId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().or(z.number()).optional(),
  limit: z.string().or(z.number()).optional(),
});

export const billQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
  status: z.enum(['OPEN', 'PARTIALLY_PAID', 'PAID', 'VOID']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().or(z.number()).optional(),
  limit: z.string().or(z.number()).optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type CreatePaymentInput = z.input<typeof createPaymentSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
export type BillQueryInput = z.infer<typeof billQuerySchema>;
