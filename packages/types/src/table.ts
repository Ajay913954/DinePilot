export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
  CLEANING = 'CLEANING',
  DISABLED = 'DISABLED',
}

export enum TableLocation {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR',
  PRIVATE = 'PRIVATE',
  BAR = 'BAR',
  OTHER = 'OTHER',
}

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: string;
  name?: string | null;
  capacity: number;
  location: TableLocation;
  status: TableStatus;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}
