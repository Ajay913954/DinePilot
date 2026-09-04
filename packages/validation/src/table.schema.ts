import { z } from 'zod';

export const createTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required').max(20),
  name: z.string().max(50).optional(),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1').max(50),
  location: z.enum(['INDOOR', 'OUTDOOR', 'PRIVATE', 'BAR', 'OTHER']).optional().default('INDOOR'),
  status: z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'DISABLED']).optional().default('AVAILABLE'),
  isActive: z.boolean().optional().default(true),
});

export type CreateTableInput = z.input<typeof createTableSchema>;

export const updateTableSchema = createTableSchema.partial();

export type UpdateTableInput = z.input<typeof updateTableSchema>;
