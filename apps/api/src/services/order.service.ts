import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { RestaurantService } from './restaurant.service.js';
import { OrderStatusService } from './order-status.service.js';
import { OrderTotalsService } from './order-totals.service.js';
import { OrderNumberService } from './order-number.service.js';
import { OrderStatus, OrderSource, Prisma, Role } from '@prisma/client';
import {
  CreateOrderInput,
  UpdateOrderInput,
  UpdateOrderStatusInput,
  AddOrderItemInput,
  UpdateOrderItemInput,
  CancelOrderInput,
  OrderQueryInput,
} from '@dinepilot/validation';
import { OrderResponse, OrderListItem, OrderDashboardMetrics } from '@dinepilot/types';

export class OrderService {
  /**
   * Helper to format Order record into API response object
   */
  static formatOrderResponse(order: any): OrderResponse {
    return {
      id: order.id,
      restaurantId: order.restaurantId,
      customerId: order.customerId,
      reservationId: order.reservationId,
      tableId: order.tableId,
      orderNumber: order.orderNumber,
      status: order.status as any,
      source: order.source as any,
      notes: order.notes,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      taxAmount: Number(order.taxAmount),
      serviceChargeAmount: Number(order.serviceChargeAmount),
      totalAmount: Number(order.totalAmount),
      completedAt: order.completedAt ? order.completedAt.toISOString() : null,
      confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
      preparingAt: order.preparingAt ? order.preparingAt.toISOString() : null,
      readyAt: order.readyAt ? order.readyAt.toISOString() : null,
      servedAt: order.servedAt ? order.servedAt.toISOString() : null,
      cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      customer: order.customer
        ? {
            id: order.customer.id,
            name: order.customer.name,
            phone: order.customer.phone,
            isVip: order.customer.isVip,
          }
        : null,
      table: order.table
        ? {
            id: order.table.id,
            tableNumber: order.table.tableNumber,
            name: order.table.name,
            capacity: order.table.capacity,
          }
        : null,
      reservation: order.reservation
        ? {
            id: order.reservation.id,
            reservationDate: order.reservation.reservationDate.toISOString(),
            startTime: order.reservation.startTime,
            guestCount: order.reservation.guestCount,
          }
        : null,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        menuItemId: item.menuItemId,
        itemNameSnapshot: item.itemNameSnapshot,
        unitPriceSnapshot: Number(item.unitPriceSnapshot),
        quantity: item.quantity,
        lineTotal: Number(item.lineTotal),
        notes: item.notes,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      bill: order.bill
        ? {
            id: order.bill.id,
            invoiceNumber: order.bill.invoiceNumber,
            amountPaid: Number(order.bill.amountPaid),
            amountDue: Number(order.bill.amountDue),
            status: order.bill.status,
          }
        : null,
      amountPaid: order.bill ? Number(order.bill.amountPaid) : 0,
      amountDue: order.bill ? Number(order.bill.amountDue) : Number(order.totalAmount),
      paymentStatus: order.bill ? order.bill.status : 'UNBILLED',
    };
  }

  /**
   * Create New Order (Transactional, Snapshot Pricing, Security Validations)
   */
  static async createOrder(userId: string, input: CreateOrderInput): Promise<OrderResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    // 1. Relationship Security Validation
    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, restaurantId: restaurant.id },
      });
      if (!customer) {
        throw new AppError('Customer not found for this restaurant.', 400, 'INVALID_CUSTOMER');
      }
    }

    if (input.tableId) {
      const table = await prisma.table.findFirst({
        where: { id: input.tableId, restaurantId: restaurant.id },
      });
      if (!table) {
        throw new AppError('Table not found for this restaurant.', 400, 'INVALID_TABLE');
      }
    }

    if (input.reservationId) {
      const reservation = await prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: restaurant.id },
      });
      if (!reservation) {
        throw new AppError('Reservation not found for this restaurant.', 400, 'INVALID_RESERVATION');
      }
    }

    // 2. Menu Item Validation & Snapshot Preparation
    const itemSnapshots: Array<{
      menuItemId: string;
      itemNameSnapshot: string;
      unitPriceSnapshot: Prisma.Decimal;
      quantity: number;
      lineTotal: Prisma.Decimal;
      notes: string | null;
    }> = [];
    for (const itemInput of input.items) {
      const menuItem = await prisma.menuItem.findFirst({
        where: { id: itemInput.menuItemId, restaurantId: restaurant.id },
      });

      if (!menuItem) {
        throw new AppError(`Menu item '${itemInput.menuItemId}' not found for this restaurant.`, 400, 'INVALID_MENU_ITEM');
      }

      if (!menuItem.isActive) {
        throw new AppError(`Menu item '${menuItem.name}' is inactive and cannot be ordered.`, 400, 'ITEM_INACTIVE');
      }

      if (!menuItem.isAvailable) {
        throw new AppError(`Menu item '${menuItem.name}' is currently unavailable.`, 400, 'ITEM_UNAVAILABLE');
      }

      const unitPriceSnapshot = menuItem.price;
      const quantity = itemInput.quantity;
      const lineTotal = new Prisma.Decimal(unitPriceSnapshot.toString()).mul(quantity);

      itemSnapshots.push({
        menuItemId: menuItem.id,
        itemNameSnapshot: menuItem.name,
        unitPriceSnapshot,
        quantity,
        lineTotal: new Prisma.Decimal(lineTotal.toFixed(2)),
        notes: itemInput.notes || null,
      });
    }

    // 3. Centralized Financial Calculation
    const totals = OrderTotalsService.calculateOrderTotals(
      itemSnapshots.map((i) => ({ unitPriceSnapshot: i.unitPriceSnapshot, quantity: i.quantity })),
      input.discountAmount || 0,
      {
        taxEnabled: restaurant.taxEnabled,
        taxRate: restaurant.taxRate,
        serviceChargeRate: restaurant.serviceChargeRate,
      }
    );

    // 4. Generate Order Number
    const orderNumber = await OrderNumberService.generateOrderNumber(restaurant.id);

    // 5. Transactional Creation
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          restaurantId: restaurant.id,
          customerId: input.customerId || null,
          reservationId: input.reservationId || null,
          tableId: input.tableId || null,
          orderNumber,
          status: OrderStatus.PLACED,
          source: (input.source as OrderSource) || OrderSource.DASHBOARD,
          notes: input.notes || null,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          serviceChargeAmount: totals.serviceChargeAmount,
          totalAmount: totals.totalAmount,
          items: {
            create: itemSnapshots.map((item) => ({
              menuItemId: item.menuItemId,
              itemNameSnapshot: item.itemNameSnapshot,
              unitPriceSnapshot: item.unitPriceSnapshot,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
              notes: item.notes,
            })),
          },
        },
        include: {
          customer: true,
          table: true,
          reservation: true,
          items: true,
        },
      });

      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'ORDER_CREATED',
          entity: 'Order',
          entityId: order.id,
          details: `Created order #${order.orderNumber} with ${order.items.length} items (Total: ₹${order.totalAmount})`,
        },
      });

      return order;
    });

    return this.formatOrderResponse(createdOrder);
  }

  /**
   * List Orders with Filters & Server-Side Pagination
   */
  static async getOrders(userId: string, query: OrderQueryInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      restaurantId: restaurant.id,
    };

    if (query.status) {
      where.status = query.status as OrderStatus;
    }

    if (query.source) {
      where.source = query.source as OrderSource;
    }

    if (query.tableId) {
      where.tableId = query.tableId;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.date) {
      const startOfDay = new Date(query.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(query.date);
      endOfDay.setHours(23, 59, 59, 999);

      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { name: true, phone: true } },
          table: { select: { tableNumber: true } },
          bill: { select: { id: true, invoiceNumber: true, amountPaid: true, amountDue: true, status: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const formattedItems: OrderListItem[] = orders.map((o: any) => ({
      id: o.id,
      restaurantId: o.restaurantId,
      orderNumber: o.orderNumber,
      status: o.status as any,
      source: o.source as any,
      totalAmount: Number(o.totalAmount),
      itemCount: o._count.items,
      customerName: o.customer ? o.customer.name : null,
      customerPhone: o.customer ? o.customer.phone : null,
      tableNumber: o.table ? o.table.tableNumber : null,
      amountPaid: o.bill ? Number(o.bill.amountPaid) : 0,
      amountDue: o.bill ? Number(o.bill.amountDue) : Number(o.totalAmount),
      paymentStatus: o.bill ? o.bill.status : 'UNBILLED',
      invoiceNumber: o.bill ? o.bill.invoiceNumber : null,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));

    return {
      data: formattedItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get Single Order Detail
   */
  static async getOrderById(userId: string, orderId: string): Promise<OrderResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
      include: {
        customer: true,
        table: true,
        reservation: true,
        bill: true,
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    return this.formatOrderResponse(order);
  }

  /**
   * Update Order Details & Discount (Protected if Finalized)
   */
  static async updateOrder(userId: string, orderId: string, input: UpdateOrderInput): Promise<OrderResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    if (OrderStatusService.isFinalized(order.status)) {
      throw new AppError('Cannot modify a finalized (completed or cancelled) order.', 400, 'ORDER_FINALIZED');
    }

    // Validate relationships if updated
    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, restaurantId: restaurant.id },
      });
      if (!customer) {
        throw new AppError('Customer not found for this restaurant.', 400, 'INVALID_CUSTOMER');
      }
    }

    if (input.tableId) {
      const table = await prisma.table.findFirst({
        where: { id: input.tableId, restaurantId: restaurant.id },
      });
      if (!table) {
        throw new AppError('Table not found for this restaurant.', 400, 'INVALID_TABLE');
      }
    }

    if (input.reservationId) {
      const reservation = await prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: restaurant.id },
      });
      if (!reservation) {
        throw new AppError('Reservation not found for this restaurant.', 400, 'INVALID_RESERVATION');
      }
    }

    // Recalculate totals if discount is specified
    let totals = {
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      serviceChargeAmount: order.serviceChargeAmount,
      totalAmount: order.totalAmount,
    };

    if (input.discountAmount !== undefined) {
      // Role check for discount: STAFF requires approval or OWNER/MANAGER
      if (restaurant.role === Role.STAFF && input.discountAmount > Number(order.discountAmount)) {
        throw new AppError('Forbidden. Manual discount application requires OWNER or MANAGER role.', 403, 'DISCOUNT_RESTRICTED');
      }

      totals = OrderTotalsService.calculateOrderTotals(
        order.items.map((i) => ({ unitPriceSnapshot: i.unitPriceSnapshot, quantity: i.quantity })),
        input.discountAmount,
        {
          taxEnabled: restaurant.taxEnabled,
          taxRate: restaurant.taxRate,
          serviceChargeRate: restaurant.serviceChargeRate,
        }
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        customerId: input.customerId !== undefined ? input.customerId : order.customerId,
        reservationId: input.reservationId !== undefined ? input.reservationId : order.reservationId,
        tableId: input.tableId !== undefined ? input.tableId : order.tableId,
        notes: input.notes !== undefined ? input.notes : order.notes,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        serviceChargeAmount: totals.serviceChargeAmount,
        totalAmount: totals.totalAmount,
      },
      include: {
        customer: true,
        table: true,
        reservation: true,
        items: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId,
        action: input.discountAmount !== undefined ? 'ORDER_DISCOUNT_APPLIED' : 'ORDER_UPDATED',
        entity: 'Order',
        entityId: order.id,
        details: `Updated order #${order.orderNumber} metadata (Total: ₹${updated.totalAmount})`,
      },
    });

    return this.formatOrderResponse(updated);
  }

  /**
   * Update Order Status Lifecycle
   */
  static async updateOrderStatus(userId: string, orderId: string, input: UpdateOrderStatusInput): Promise<OrderResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    const targetStatus = input.status as OrderStatus;

    // Validate transition
    OrderStatusService.validateTransition(order.status, targetStatus, restaurant.role);

    // Timestamps update
    const timestampUpdates: any = {};
    const now = new Date();
    if (targetStatus === OrderStatus.CONFIRMED && !order.confirmedAt) timestampUpdates.confirmedAt = now;
    if (targetStatus === OrderStatus.PREPARING && !order.preparingAt) timestampUpdates.preparingAt = now;
    if (targetStatus === OrderStatus.READY && !order.readyAt) timestampUpdates.readyAt = now;
    if (targetStatus === OrderStatus.SERVED && !order.servedAt) timestampUpdates.servedAt = now;
    if (targetStatus === OrderStatus.COMPLETED && !order.completedAt) timestampUpdates.completedAt = now;
    if (targetStatus === OrderStatus.CANCELLED && !order.cancelledAt) timestampUpdates.cancelledAt = now;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: targetStatus,
        ...timestampUpdates,
      },
      include: {
        customer: true,
        table: true,
        reservation: true,
        items: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId,
        action: targetStatus === OrderStatus.CANCELLED ? 'ORDER_CANCELLED' : 'ORDER_STATUS_CHANGED',
        entity: 'Order',
        entityId: order.id,
        details: `Order #${order.orderNumber} status changed from '${order.status}' to '${targetStatus}'`,
      },
    });

    return this.formatOrderResponse(updated);
  }

  /**
   * Add Item to Order (Snapshot Creation & Totals Recalculation)
   */
  static async addOrderItem(userId: string, orderId: string, input: AddOrderItemInput): Promise<OrderResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    if (OrderStatusService.isFinalized(order.status)) {
      throw new AppError('Cannot add items to a finalized order.', 400, 'ORDER_FINALIZED');
    }

    const menuItem = await prisma.menuItem.findFirst({
      where: { id: input.menuItemId, restaurantId: restaurant.id },
    });

    if (!menuItem) {
      throw new AppError('Menu item not found for this restaurant.', 400, 'INVALID_MENU_ITEM');
    }

    if (!menuItem.isActive) {
      throw new AppError(`Menu item '${menuItem.name}' is inactive and cannot be ordered.`, 400, 'ITEM_INACTIVE');
    }

    if (!menuItem.isAvailable) {
      throw new AppError(`Menu item '${menuItem.name}' is currently unavailable.`, 400, 'ITEM_UNAVAILABLE');
    }

    const unitPriceSnapshot = menuItem.price;
    const lineTotal = new Prisma.Decimal(unitPriceSnapshot.toString()).mul(input.quantity);

    // Transactional Add + Recalculate
    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: menuItem.id,
          itemNameSnapshot: menuItem.name,
          unitPriceSnapshot,
          quantity: input.quantity,
          lineTotal: new Prisma.Decimal(lineTotal.toFixed(2)),
          notes: input.notes || null,
        },
      });

      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
      });

      const totals = OrderTotalsService.calculateOrderTotals(
        updatedItems.map((i) => ({ unitPriceSnapshot: i.unitPriceSnapshot, quantity: i.quantity })),
        Number(order.discountAmount),
        {
          taxEnabled: restaurant.taxEnabled,
          taxRate: restaurant.taxRate,
          serviceChargeRate: restaurant.serviceChargeRate,
        }
      );

      const refreshed = await tx.order.update({
        where: { id: order.id },
        data: {
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          serviceChargeAmount: totals.serviceChargeAmount,
          totalAmount: totals.totalAmount,
        },
        include: {
          customer: true,
          table: true,
          reservation: true,
          items: true,
        },
      });

      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'ORDER_ITEM_ADDED',
          entity: 'Order',
          entityId: order.id,
          details: `Added ${input.quantity}x '${menuItem.name}' to order #${order.orderNumber}`,
        },
      });

      return refreshed;
    });

    return this.formatOrderResponse(updatedOrder);
  }

  /**
   * Update Order Item Quantity / Notes
   */
  static async updateOrderItem(
    userId: string,
    orderId: string,
    itemId: string,
    input: UpdateOrderItemInput
  ): Promise<OrderResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    if (OrderStatusService.isFinalized(order.status)) {
      throw new AppError('Cannot edit items of a finalized order.', 400, 'ORDER_FINALIZED');
    }

    const existingItem = order.items.find((i) => i.id === itemId);
    if (!existingItem) {
      throw new AppError('Order item not found in this order.', 404, 'ORDER_ITEM_NOT_FOUND');
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const newQty = input.quantity !== undefined ? input.quantity : existingItem.quantity;
      const lineTotal = new Prisma.Decimal(existingItem.unitPriceSnapshot.toString()).mul(newQty);

      await tx.orderItem.update({
        where: { id: itemId },
        data: {
          quantity: newQty,
          lineTotal: new Prisma.Decimal(lineTotal.toFixed(2)),
          notes: input.notes !== undefined ? input.notes : existingItem.notes,
        },
      });

      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
      });

      const totals = OrderTotalsService.calculateOrderTotals(
        updatedItems.map((i) => ({ unitPriceSnapshot: i.unitPriceSnapshot, quantity: i.quantity })),
        Number(order.discountAmount),
        {
          taxEnabled: restaurant.taxEnabled,
          taxRate: restaurant.taxRate,
          serviceChargeRate: restaurant.serviceChargeRate,
        }
      );

      const refreshed = await tx.order.update({
        where: { id: order.id },
        data: {
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          serviceChargeAmount: totals.serviceChargeAmount,
          totalAmount: totals.totalAmount,
        },
        include: {
          customer: true,
          table: true,
          reservation: true,
          items: true,
        },
      });

      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'ORDER_ITEM_UPDATED',
          entity: 'Order',
          entityId: order.id,
          details: `Updated item '${existingItem.itemNameSnapshot}' quantity to ${newQty} in order #${order.orderNumber}`,
        },
      });

      return refreshed;
    });

    return this.formatOrderResponse(updatedOrder);
  }

  /**
   * Remove Item from Order
   */
  static async removeOrderItem(userId: string, orderId: string, itemId: string): Promise<OrderResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    if (OrderStatusService.isFinalized(order.status)) {
      throw new AppError('Cannot remove items from a finalized order.', 400, 'ORDER_FINALIZED');
    }

    const existingItem = order.items.find((i) => i.id === itemId);
    if (!existingItem) {
      throw new AppError('Order item not found in this order.', 404, 'ORDER_ITEM_NOT_FOUND');
    }

    if (order.items.length <= 1) {
      throw new AppError('An order must contain at least one item. Cancel the order instead of removing all items.', 400, 'ORDER_CANNOT_BE_EMPTY');
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({
        where: { id: itemId },
      });

      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
      });

      const totals = OrderTotalsService.calculateOrderTotals(
        updatedItems.map((i) => ({ unitPriceSnapshot: i.unitPriceSnapshot, quantity: i.quantity })),
        Number(order.discountAmount),
        {
          taxEnabled: restaurant.taxEnabled,
          taxRate: restaurant.taxRate,
          serviceChargeRate: restaurant.serviceChargeRate,
        }
      );

      const refreshed = await tx.order.update({
        where: { id: order.id },
        data: {
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          serviceChargeAmount: totals.serviceChargeAmount,
          totalAmount: totals.totalAmount,
        },
        include: {
          customer: true,
          table: true,
          reservation: true,
          items: true,
        },
      });

      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'ORDER_ITEM_REMOVED',
          entity: 'Order',
          entityId: order.id,
          details: `Removed '${existingItem.itemNameSnapshot}' from order #${order.orderNumber}`,
        },
      });

      return refreshed;
    });

    return this.formatOrderResponse(updatedOrder);
  }

  /**
   * Cancel Order (Preserves History & Item Snapshots)
   */
  static async cancelOrder(userId: string, orderId: string, input: CancelOrderInput): Promise<OrderResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: restaurant.id },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    OrderStatusService.validateTransition(order.status, OrderStatus.CANCELLED, restaurant.role);

    const notes = input.reason
      ? order.notes
        ? `${order.notes} | Cancellation Reason: ${input.reason}`
        : `Cancellation Reason: ${input.reason}`
      : order.notes;

    const cancelled = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        notes,
      },
      include: {
        customer: true,
        table: true,
        reservation: true,
        items: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        restaurantId: restaurant.id,
        userId,
        action: 'ORDER_CANCELLED',
        entity: 'Order',
        entityId: order.id,
        details: `Cancelled order #${order.orderNumber}${input.reason ? ` Reason: ${input.reason}` : ''}`,
      },
    });

    return this.formatOrderResponse(cancelled);
  }

  /**
   * Order Dashboard Metrics
   */
  static async getOrderDashboardStats(userId: string): Promise<OrderDashboardMetrics> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayOrders, activeOrdersCount, completedOrdersCount, cancelledOrdersCount, sourceGroup] =
      await Promise.all([
        prisma.order.findMany({
          where: {
            restaurantId: restaurant.id,
            createdAt: { gte: todayStart, lte: todayEnd },
          },
          select: { status: true, totalAmount: true, source: true },
        }),
        prisma.order.count({
          where: {
            restaurantId: restaurant.id,
            status: { in: [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SERVED] },
          },
        }),
        prisma.order.count({
          where: {
            restaurantId: restaurant.id,
            status: OrderStatus.COMPLETED,
          },
        }),
        prisma.order.count({
          where: {
            restaurantId: restaurant.id,
            status: OrderStatus.CANCELLED,
          },
        }),
        prisma.order.groupBy({
          by: ['source'],
          where: { restaurantId: restaurant.id },
          _count: { _all: true },
        }),
      ]);

    const todayOrdersCount = todayOrders.length;
    // Today's Gross Order Value (excluding CANCELLED orders)
    const todayOrderValueDecimal = todayOrders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum.add(new Prisma.Decimal(o.totalAmount.toString())), new Prisma.Decimal(0));

    const sourceBreakdown: Record<string, number> = {};
    for (const group of sourceGroup) {
      sourceBreakdown[group.source] = group._count._all;
    }

    return {
      todayOrdersCount,
      todayOrderValue: Number(todayOrderValueDecimal.toFixed(2)),
      activeOrdersCount,
      completedOrdersCount,
      cancelledOrdersCount,
      sourceBreakdown,
    };
  }
}
