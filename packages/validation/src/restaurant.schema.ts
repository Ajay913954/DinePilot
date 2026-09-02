import { z } from 'zod';

export const restaurantStep1Schema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters').max(100),
  cuisineType: z.string().min(1, 'Please select or enter a cuisine type'),
  phone: z.string().min(5, 'Valid phone number is required'),
  email: z.string().email('Invalid email address'),
});

export type RestaurantStep1Input = z.infer<typeof restaurantStep1Schema>;

export const restaurantStep2Schema = z.object({
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State/Province is required'),
  country: z.string().min(2, 'Country is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

export type RestaurantStep2Input = z.infer<typeof restaurantStep2Schema>;

export const restaurantStep3Schema = z.object({
  openingTime: z.string().optional().default('09:00'),
  closingTime: z.string().optional().default('22:00'),
  tableCount: z.coerce.number().min(1, 'At least 1 table required').optional().default(10),
  avgSeatingCapacity: z.coerce.number().min(1, 'Capacity must be at least 1').optional().default(40),
});

export type RestaurantStep3Input = z.infer<typeof restaurantStep3Schema>;

export const restaurantOnboardingSchema = restaurantStep1Schema
  .merge(restaurantStep2Schema)
  .merge(restaurantStep3Schema);

export type RestaurantOnboardingInputSchema = z.infer<typeof restaurantOnboardingSchema>;

export const restaurantUpdateSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters').max(100),
  cuisineType: z.string().min(1, 'Cuisine type is required'),
  phone: z.string().min(5, 'Valid phone number is required'),
  email: z.string().email('Invalid email address'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().min(2, 'Country is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

export type RestaurantUpdateInput = z.infer<typeof restaurantUpdateSchema>;
