export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  cuisineType: string;
  openingTime?: string | null;
  closingTime?: string | null;
  tableCount?: number | null;
  avgSeatingCapacity?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RestaurantOnboardingInput {
  name: string;
  cuisineType: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  openingTime?: string;
  closingTime?: string;
  tableCount?: number;
  avgSeatingCapacity?: number;
}
