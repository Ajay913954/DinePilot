export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserWithRole extends User {
  role: UserRole;
  restaurantId?: string;
  restaurant?: any;
}
