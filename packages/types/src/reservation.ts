import { Table } from './table.js';

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SEATED = 'SEATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum ReservationSource {
  DASHBOARD = 'DASHBOARD',
  WEBSITE = 'WEBSITE',
  WHATSAPP = 'WHATSAPP',
  AI = 'AI',
  QR = 'QR',
  PHONE = 'PHONE',
  OTHER = 'OTHER',
}

export interface Customer {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  tableId?: string | null;
  customerId?: string | null;
  reservationDate: Date | string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  guestCount: number;
  status: ReservationStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  specialRequest?: string | null;
  source: ReservationSource;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  table?: Table | null;
  customer?: Customer | null;
}
