import { z } from 'zod';

export const createMenuCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  description: z.string().max(500).optional(),
  displayOrder: z.coerce.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export type CreateMenuCategoryInput = z.input<typeof createMenuCategorySchema>;

export const updateMenuCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  displayOrder: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateMenuCategoryInput = z.input<typeof updateMenuCategorySchema>;

export const createMenuItemSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Dish name is required').max(100),
  description: z.string().max(1000).optional(),
  price: z.coerce.number().positive('Price must be a positive number'),
  imageUrl: z.string().url('Invalid image URL format').optional().or(z.literal('')),
  isAvailable: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  isVegetarian: z.boolean().optional().default(false),
  isVegan: z.boolean().optional().default(false),
  isSpicy: z.boolean().optional().default(false),
  preparationTimeMinutes: z.coerce.number().min(0).max(360).optional(),
  displayOrder: z.coerce.number().min(0).optional().default(0),
});

export type CreateMenuItemInput = z.input<typeof createMenuItemSchema>;

export const updateMenuItemSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  price: z.coerce.number().positive().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isSpicy: z.boolean().optional(),
  preparationTimeMinutes: z.coerce.number().min(0).max(360).optional(),
  displayOrder: z.coerce.number().min(0).optional(),
});

export type UpdateMenuItemInput = z.input<typeof updateMenuItemSchema>;

export const toggleItemAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export type ToggleItemAvailabilityInput = z.input<typeof toggleItemAvailabilitySchema>;

export const reorderCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()).min(1, 'At least one category ID is required'),
});

export type ReorderCategoriesInput = z.input<typeof reorderCategoriesSchema>;

export const reorderMenuItemsSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  itemIds: z.array(z.string().uuid()).min(1, 'At least one item ID is required'),
});

export type ReorderMenuItemsInput = z.input<typeof reorderMenuItemsSchema>;

export const menuItemQuerySchema = z.object({
  categoryId: z.string().optional(),
  search: z.string().optional(),
  isAvailable: z.coerce.boolean().optional(),
  isVegetarian: z.coerce.boolean().optional(),
  isVegan: z.coerce.boolean().optional(),
  isSpicy: z.coerce.boolean().optional(),
});

export type MenuItemQueryInput = z.input<typeof menuItemQuerySchema>;
