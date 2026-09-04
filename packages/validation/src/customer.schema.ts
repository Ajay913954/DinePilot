import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters').max(100),
  phone: z.string().min(5, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
  isVip: z.boolean().optional().default(false),
  preferredSeating: z.string().max(100).optional(),
  dietaryPreference: z.string().max(100).optional(),
  specialOccasion: z.string().max(100).optional(),
});

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().email().optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
  isVip: z.boolean().optional(),
  preferredSeating: z.string().max(100).optional(),
  dietaryPreference: z.string().max(100).optional(),
  specialOccasion: z.string().max(100).optional(),
});

export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;

export const customerTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(30),
});

export type CustomerTagInput = z.input<typeof customerTagSchema>;

export const mergeCustomerSchema = z.object({
  primaryCustomerId: z.string().uuid('Invalid primary customer ID'),
  secondaryCustomerId: z.string().uuid('Invalid secondary customer ID'),
});

export type MergeCustomerInput = z.input<typeof mergeCustomerSchema>;

export const customerQuerySchema = z.object({
  search: z.string().optional(),
  classification: z.enum(['NEW', 'RETURNING', 'VIP', 'INACTIVE']).optional(),
  tagId: z.string().optional(),
  isVip: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type CustomerQueryInput = z.input<typeof customerQuerySchema>;
