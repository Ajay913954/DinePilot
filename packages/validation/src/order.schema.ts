import { z } from 'zod';

export const orderItemInputSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
  notes: z.string().trim().max(250, 'Item notes cannot exceed 250 characters').optional().nullable(),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional().nullable(),
  reservationId: z.string().uuid('Invalid reservation ID').optional().nullable(),
  tableId: z.string().uuid('Invalid table ID').optional().nullable(),
  source: z
    .enum(['DASHBOARD', 'WEBSITE', 'QR', 'WHATSAPP', 'AI', 'PHONE', 'OTHER'])
    .optional()
    .default('DASHBOARD'),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
  discountAmount: z.number().min(0, 'Discount cannot be negative').optional().default(0),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one item'),
});

export const updateOrderSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID').optional().nullable(),
  reservationId: z.string().uuid('Invalid reservation ID').optional().nullable(),
  tableId: z.string().uuid('Invalid table ID').optional().nullable(),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
  discountAmount: z.number().min(0, 'Discount cannot be negative').optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'PLACED',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'SERVED',
    'COMPLETED',
    'CANCELLED',
  ], {
    required_error: 'Order status is required',
    invalid_type_error: 'Invalid order status',
  }),
});

export const addOrderItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
  notes: z.string().trim().max(250, 'Item notes cannot exceed 250 characters').optional().nullable(),
});

export const updateOrderItemSchema = z.object({
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1').optional(),
  notes: z.string().trim().max(250, 'Item notes cannot exceed 250 characters').optional().nullable(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
});

export const orderQuerySchema = z.object({
  page: z.union([z.string(), z.number()]).transform((val) => Number(val)).optional(),
  limit: z.union([z.string(), z.number()]).transform((val) => Number(val)).optional(),
  search: z.string().optional(),
  status: z
    .enum(['DRAFT', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'])
    .optional(),
  tableId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  source: z
    .enum(['DASHBOARD', 'WEBSITE', 'QR', 'WHATSAPP', 'AI', 'PHONE', 'OTHER'])
    .optional(),
  date: z.string().optional(),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type OrderQueryInput = z.input<typeof orderQuerySchema>;
