import { UserWithRole } from '@dinepilot/types';

declare global {
  namespace Express {
    interface Request {
      user?: UserWithRole;
      sessionId?: string;
      userRole?: string;
      restaurantId?: string;
    }
  }
}
