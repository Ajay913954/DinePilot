import { OrderStatus, Role } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

export class OrderStatusService {
  /**
   * Centralized Order Status Transition Validator
   */
  static validateTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    userRole?: Role
  ): void {
    if (currentStatus === targetStatus) {
      return; // Idempotent same-status update allowed
    }

    // Terminal state protection
    if (currentStatus === OrderStatus.COMPLETED) {
      throw new AppError(
        'Completed orders are finalized and cannot undergo status transitions.',
        400,
        'ORDER_FINALIZED'
      );
    }

    if (currentStatus === OrderStatus.CANCELLED) {
      throw new AppError(
        'Cancelled orders cannot undergo further status transitions.',
        400,
        'ORDER_CANCELLED'
      );
    }

    // Allowed transition map
    const allowedMap: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.DRAFT]: [OrderStatus.PLACED, OrderStatus.CANCELLED],
      [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.SERVED],
      [OrderStatus.SERVED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowed = allowedMap[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Stricter cancellation rules for advanced states (PREPARING / READY / SERVED)
    if (
      targetStatus === OrderStatus.CANCELLED &&
      currentStatus === OrderStatus.PREPARING &&
      userRole &&
      userRole !== Role.OWNER &&
      userRole !== Role.MANAGER
    ) {
      throw new AppError(
        'Forbidden. Cancelling an order already in preparation requires OWNER or MANAGER privileges.',
        403,
        'CANCELLATION_RESTRICTED'
      );
    }
  }

  /**
   * Helper to check if an order is finalized (immutable)
   */
  static isFinalized(status: OrderStatus): boolean {
    return status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED;
  }
}
