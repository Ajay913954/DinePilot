export type CustomerClassification = 'NEW' | 'RETURNING' | 'VIP' | 'INACTIVE';

export interface CustomerTag {
  id: string;
  name: string;
  createdAt: string;
}

export interface CustomerStats {
  totalReservations: number;
  completedVisits: number;
  upcomingReservations: number;
  cancelledReservations: number;
  noShows: number;
  lastVisit: string | null;
  nextVisit: string | null;
  avgPartySize: number;
  totalOrders?: number;
  completedOrders?: number;
  totalOrderValue?: number;
  totalPaid?: number;
  outstandingAmount?: number;
  avgOrderValue?: number;
}

export interface CustomerProfile {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  isVip: boolean;
  preferredSeating: string | null;
  dietaryPreference: string | null;
  specialOccasion: string | null;
  classification: CustomerClassification;
  tags: CustomerTag[];
  stats: CustomerStats;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListItem {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email: string | null;
  isVip: boolean;
  classification: CustomerClassification;
  visitsCount: number;
  lastVisit: string | null;
  upcomingCount: number;
  tags: CustomerTag[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerMergePayload {
  primaryCustomerId: string;
  secondaryCustomerId: string;
}
