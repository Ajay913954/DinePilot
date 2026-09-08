import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { RestaurantService } from './restaurant.service.js';
import { InvoiceNumberService } from './invoice-number.service.js';
import { BillStatus, PaymentMethod, PaymentStatus, Prisma, Role, OrderStatus } from '@prisma/client';
import {
  CreateBillInput,
  CreatePaymentInput,
  UpdatePaymentStatusInput,
  BillQueryInput,
  PaymentQueryInput,
} from '@dinepilot/validation';
import { BillResponse, PaymentResponse, BillingMetrics } from '@dinepilot/types';

export class BillingService {
  /**
   * Helper to format Bill record into API response
   */
  static formatBillResponse(bill: any): BillResponse {
    return {
      id: bill.id,
      restaurantId: bill.restaurantId,
      orderId: bill.orderId,
      invoiceNumber: bill.invoiceNumber,
      subtotal: Number(bill.subtotal),
      discountAmount: Number(bill.discountAmount),
      taxAmount: Number(bill.taxAmount),
      serviceChargeAmount: Number(bill.serviceChargeAmount),
      totalAmount: Number(bill.totalAmount),
      amountPaid: Number(bill.amountPaid),
      amountDue: Number(bill.amountDue),
      status: bill.status as any,
      issuedAt: bill.issuedAt.toISOString(),
      createdAt: bill.createdAt.toISOString(),
      updatedAt: bill.updatedAt.toISOString(),
      order: bill.order
        ? {
            id: bill.order.id,
            orderNumber: bill.order.orderNumber,
            status: bill.order.status,
            customerName: bill.order.customer ? bill.order.customer.name : null,
            customerPhone: bill.order.customer ? bill.order.customer.phone : null,
          }
        : null,
      payments: bill.payments ? bill.payments.map((p: any) => this.formatPaymentResponse(p)) : undefined,
    };
  }

  /**
   * Helper to format Payment record into API response
   */
  static formatPaymentResponse(payment: any): PaymentResponse {
    return {
      id: payment.id,
      restaurantId: payment.restaurantId,
      orderId: payment.orderId,
      billId: payment.billId || null,
      customerId: payment.customerId || null,
      amount: Number(payment.amount),
      method: payment.method as any,
      status: payment.status as any,
      idempotencyKey: payment.idempotencyKey || null,
      transactionReference: payment.transactionReference || null,
      gatewayReference: payment.gatewayReference || null,
      notes: payment.notes || null,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      customer: payment.customer
        ? {
            id: payment.customer.id,
            name: payment.customer.name,
            phone: payment.customer.phone,
          }
        : null,
      order: payment.order
        ? {
            id: payment.order.id,
            orderNumber: payment.order.orderNumber,
          }
        : null,
    };
  }

  /**
   * Create or Get Bill for an Order
   */
  static async createBill(userId: string, input: CreateBillInput): Promise<BillResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const order = await prisma.order.findFirst({
      where: { id: input.orderId, restaurantId: restaurant.id },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new AppError('Cannot generate a bill for a cancelled order.', 400, 'ORDER_CANCELLED');
    }

    // Check if bill already exists for this order
    const existingBill = await prisma.bill.findUnique({
      where: { orderId: order.id },
      include: {
        order: { include: { customer: true } },
        payments: { include: { customer: true, order: true } },
      },
    });

    if (existingBill) {
      if (existingBill.restaurantId !== restaurant.id) {
        throw new AppError('Cross-tenant bill access prohibited.', 403, 'CROSS_TENANT_ACCESS');
      }
      return this.formatBillResponse(existingBill);
    }

    // Generate Invoice Number and create Bill transactionally
    const createdBill = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await InvoiceNumberService.generateInvoiceNumber(restaurant.id, tx);

      const bill = await tx.bill.create({
        data: {
          restaurantId: restaurant.id,
          orderId: order.id,
          invoiceNumber,
          subtotal: order.subtotal,
          discountAmount: order.discountAmount,
          taxAmount: order.taxAmount,
          serviceChargeAmount: order.serviceChargeAmount,
          totalAmount: order.totalAmount,
          amountPaid: new Prisma.Decimal(0),
          amountDue: order.totalAmount,
          status: BillStatus.OPEN,
        },
        include: {
          order: { include: { customer: true } },
          payments: { include: { customer: true, order: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'BILL_CREATED',
          entity: 'Bill',
          entityId: bill.id,
          details: `Generated invoice ${bill.invoiceNumber} for order #${order.orderNumber} (Total: ₹${bill.totalAmount})`,
        },
      });

      return bill;
    });

    return this.formatBillResponse(createdBill);
  }

  /**
   * Get Bill by Order ID
   */
  static async getBillByOrder(userId: string, orderId: string): Promise<BillResponse> {
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

    let bill = await prisma.bill.findUnique({
      where: { orderId },
      include: {
        order: { include: { customer: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { customer: true, order: true },
        },
      },
    });

    if (!bill) {
      // Auto-generate bill if order exists and is not cancelled
      return this.createBill(userId, { orderId });
    }

    if (bill.restaurantId !== restaurant.id) {
      throw new AppError('Cross-tenant bill access prohibited.', 403, 'CROSS_TENANT_ACCESS');
    }

    return this.formatBillResponse(bill);
  }

  /**
   * Get Bill by ID
   */
  static async getBillById(userId: string, billId: string): Promise<BillResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const bill = await prisma.bill.findFirst({
      where: { id: billId, restaurantId: restaurant.id },
      include: {
        order: { include: { customer: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { customer: true, order: true },
        },
      },
    });

    if (!bill) {
      throw new AppError('Bill not found.', 404, 'BILL_NOT_FOUND');
    }

    return this.formatBillResponse(bill);
  }

  /**
   * List Bills with Pagination & Search
   */
  static async getBills(userId: string, query: BillQueryInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BillWhereInput = {
      restaurantId: restaurant.id,
    };

    if (query.orderId) {
      where.orderId = query.orderId;
    }

    if (query.status) {
      where.status = query.status as BillStatus;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { customer: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [bills, totalCount] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          order: { include: { customer: true } },
          payments: { select: { id: true, amount: true, status: true, method: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where }),
    ]);

    return {
      data: bills.map((b) => this.formatBillResponse(b)),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Create Payment (Transactional, Idempotent, Overpayment Protection)
   */
  static async createPayment(userId: string, input: CreatePaymentInput): Promise<PaymentResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existingPayment = await prisma.payment.findUnique({
        where: {
          restaurantId_idempotencyKey: {
            restaurantId: restaurant.id,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: { customer: true, order: true },
      });

      if (existingPayment) {
        return this.formatPaymentResponse(existingPayment);
      }
    }

    // 2. Validate Order & Ownership
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, restaurantId: restaurant.id },
    });

    if (!order) {
      throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new AppError('Cannot record payment for a cancelled order.', 400, 'ORDER_CANCELLED');
    }

    // 3. Amount Validation
    const paymentAmount = new Prisma.Decimal(input.amount.toString());
    if (paymentAmount.lessThanOrEqualTo(0)) {
      throw new AppError('Payment amount must be greater than 0.', 400, 'INVALID_PAYMENT_AMOUNT');
    }

    // 4. Transactional Processing
    const paymentResult = await prisma.$transaction(async (tx) => {
      // Find or create bill inside transaction
      let bill = await tx.bill.findUnique({
        where: { orderId: order.id },
      });

      if (!bill) {
        const invoiceNumber = await InvoiceNumberService.generateInvoiceNumber(restaurant.id, tx);
        bill = await tx.bill.create({
          data: {
            restaurantId: restaurant.id,
            orderId: order.id,
            invoiceNumber,
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            taxAmount: order.taxAmount,
            serviceChargeAmount: order.serviceChargeAmount,
            totalAmount: order.totalAmount,
            amountPaid: new Prisma.Decimal(0),
            amountDue: order.totalAmount,
            status: BillStatus.OPEN,
          },
        });
      }

      // Check current success payments
      const successfulPayments = await tx.payment.findMany({
        where: {
          orderId: order.id,
          status: PaymentStatus.SUCCESS,
        },
      });

      const currentPaid = successfulPayments.reduce(
        (sum, p) => sum.add(new Prisma.Decimal(p.amount.toString())),
        new Prisma.Decimal(0)
      );

      const billTotal = new Prisma.Decimal(bill.totalAmount.toString());
      const currentDue = billTotal.sub(currentPaid);

      // Verify no overpayment (only if status is SUCCESS)
      const targetStatus = (input.status as PaymentStatus) || PaymentStatus.SUCCESS;
      if (targetStatus === PaymentStatus.SUCCESS) {
        if (paymentAmount.greaterThan(currentDue)) {
          throw new AppError(
            `Payment amount (₹${paymentAmount.toFixed(2)}) exceeds amount due (₹${currentDue.toFixed(2)}).`,
            400,
            'PAYMENT_EXCEEDS_DUE'
          );
        }
      }

      // Create Payment Record
      const payment = await tx.payment.create({
        data: {
          restaurantId: restaurant.id,
          orderId: order.id,
          billId: bill.id,
          customerId: order.customerId,
          amount: paymentAmount,
          method: input.method as PaymentMethod,
          status: targetStatus,
          idempotencyKey: input.idempotencyKey || null,
          transactionReference: input.transactionReference || null,
          notes: input.notes || null,
          paidAt: targetStatus === PaymentStatus.SUCCESS ? new Date() : null,
        },
        include: {
          customer: true,
          order: true,
        },
      });

      // Recalculate Bill totals if status is SUCCESS
      if (targetStatus === PaymentStatus.SUCCESS) {
        const newPaid = currentPaid.add(paymentAmount);
        const newDue = Prisma.Decimal.max(new Prisma.Decimal(0), billTotal.sub(newPaid));

        let newBillStatus: BillStatus = BillStatus.OPEN;
        if (newPaid.greaterThanOrEqualTo(billTotal)) {
          newBillStatus = BillStatus.PAID;
        } else if (newPaid.greaterThan(0)) {
          newBillStatus = BillStatus.PARTIALLY_PAID;
        }

        await tx.bill.update({
          where: { id: bill.id },
          data: {
            amountPaid: newPaid,
            amountDue: newDue,
            status: newBillStatus,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'PAYMENT_CREATED',
          entity: 'Payment',
          entityId: payment.id,
          details: `Recorded ₹${payment.amount} (${payment.method}) payment for order #${order.orderNumber} [Status: ${targetStatus}]`,
        },
      });

      return payment;
    });

    return this.formatPaymentResponse(paymentResult);
  }

  /**
   * Update Payment Status with State Machine Constraints
   */
  static async updatePaymentStatus(
    userId: string,
    paymentId: string,
    input: UpdatePaymentStatusInput
  ): Promise<PaymentResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, restaurantId: restaurant.id },
      include: { bill: true, order: true },
    });

    if (!payment) {
      throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
    }

    const currentStatus = payment.status as PaymentStatus;
    const targetStatus = input.status as PaymentStatus;

    if (currentStatus === targetStatus) {
      return this.formatPaymentResponse(payment);
    }

    // State Machine Validation rules
    const allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
      [PaymentStatus.PROCESSING]: [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
      [PaymentStatus.SUCCESS]: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
      [PaymentStatus.FAILED]: [],
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.REFUNDED]: [],
      [PaymentStatus.PARTIALLY_REFUNDED]: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        `Invalid payment status transition from ${currentStatus} to ${targetStatus}.`,
        400,
        'INVALID_PAYMENT_STATUS_TRANSITION'
      );
    }

    // Process transition inside transaction
    const updatedPayment = await prisma.$transaction(async (tx) => {
      const paymentAmount = new Prisma.Decimal(payment.amount.toString());

      if (payment.billId) {
        const bill = await tx.bill.findUnique({ where: { id: payment.billId } });
        if (bill) {
          const billTotal = new Prisma.Decimal(bill.totalAmount.toString());

          // Fetch other successful payments
          const otherSuccessful = await tx.payment.findMany({
            where: {
              billId: bill.id,
              status: PaymentStatus.SUCCESS,
              id: { not: payment.id },
            },
          });

          const otherPaid = otherSuccessful.reduce(
            (sum, p) => sum.add(new Prisma.Decimal(p.amount.toString())),
            new Prisma.Decimal(0)
          );

          if (targetStatus === PaymentStatus.SUCCESS) {
            const potentialTotal = otherPaid.add(paymentAmount);
            if (potentialTotal.greaterThan(billTotal)) {
              throw new AppError(
                `Updating payment status to SUCCESS would exceed bill total (₹${billTotal.toFixed(2)}).`,
                400,
                'PAYMENT_EXCEEDS_DUE'
              );
            }
          }

          let newPaid = otherPaid;
          if (targetStatus === PaymentStatus.SUCCESS) {
            newPaid = otherPaid.add(paymentAmount);
          }

          const newDue = Prisma.Decimal.max(new Prisma.Decimal(0), billTotal.sub(newPaid));

          let newBillStatus: BillStatus = BillStatus.OPEN;
          if (newPaid.greaterThanOrEqualTo(billTotal)) {
            newBillStatus = BillStatus.PAID;
          } else if (newPaid.greaterThan(0)) {
            newBillStatus = BillStatus.PARTIALLY_PAID;
          }

          await tx.bill.update({
            where: { id: bill.id },
            data: {
              amountPaid: newPaid,
              amountDue: newDue,
              status: newBillStatus,
            },
          });
        }
      }

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: targetStatus,
          paidAt: targetStatus === PaymentStatus.SUCCESS ? new Date() : payment.paidAt,
        },
        include: { customer: true, order: true },
      });

      await tx.auditLog.create({
        data: {
          restaurantId: restaurant.id,
          userId,
          action: 'PAYMENT_STATUS_CHANGED',
          entity: 'Payment',
          entityId: payment.id,
          details: `Updated payment #${payment.id} status from '${currentStatus}' to '${targetStatus}'`,
        },
      });

      return updated;
    });

    return this.formatPaymentResponse(updatedPayment);
  }

  /**
   * List Payments with Filters & Pagination
   */
  static async getPayments(userId: string, query: PaymentQueryInput) {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      restaurantId: restaurant.id,
    };

    if (query.orderId) where.orderId = query.orderId;
    if (query.billId) where.billId = query.billId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.method) where.method = query.method as PaymentMethod;
    if (query.status) where.status = query.status as PaymentStatus;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { transactionReference: { contains: search, mode: 'insensitive' } },
        { gatewayReference: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          customer: true,
          order: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((p) => this.formatPaymentResponse(p)),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Get Single Payment by ID
   */
  static async getPaymentById(userId: string, paymentId: string): Promise<PaymentResponse> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, restaurantId: restaurant.id },
      include: { customer: true, order: true },
    });

    if (!payment) {
      throw new AppError('Payment record not found.', 404, 'PAYMENT_NOT_FOUND');
    }

    return this.formatPaymentResponse(payment);
  }

  /**
   * Get Payments for an Order
   */
  static async getOrderPayments(userId: string, orderId: string): Promise<PaymentResponse[]> {
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

    const payments = await prisma.payment.findMany({
      where: { orderId: order.id, restaurantId: restaurant.id },
      include: { customer: true, order: true },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => this.formatPaymentResponse(p));
  }

  /**
   * Get Billing Metrics for Dashboard
   */
  static async getBillingMetrics(userId: string): Promise<BillingMetrics> {
    const restaurant = await RestaurantService.getUserRestaurant(userId);
    if (!restaurant) {
      throw new AppError('No restaurant associated with this user account.', 404, 'RESTAURANT_NOT_FOUND');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayBills, successfulPayments, openBills, paidBillsCount, partialBillsCount] = await Promise.all([
      prisma.bill.findMany({
        where: {
          restaurantId: restaurant.id,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        select: { totalAmount: true },
      }),
      prisma.payment.findMany({
        where: {
          restaurantId: restaurant.id,
          status: PaymentStatus.SUCCESS,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        select: { amount: true },
      }),
      prisma.bill.findMany({
        where: {
          restaurantId: restaurant.id,
          status: { in: [BillStatus.OPEN, BillStatus.PARTIALLY_PAID] },
        },
        select: { amountDue: true },
      }),
      prisma.bill.count({
        where: {
          restaurantId: restaurant.id,
          status: BillStatus.PAID,
        },
      }),
      prisma.bill.count({
        where: {
          restaurantId: restaurant.id,
          status: BillStatus.PARTIALLY_PAID,
        },
      }),
    ]);

    const todaySalesDecimal = todayBills.reduce(
      (sum, b) => sum.add(new Prisma.Decimal(b.totalAmount.toString())),
      new Prisma.Decimal(0)
    );

    const todayPaidDecimal = successfulPayments.reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.amount.toString())),
      new Prisma.Decimal(0)
    );

    const outstandingDecimal = openBills.reduce(
      (sum, b) => sum.add(new Prisma.Decimal(b.amountDue.toString())),
      new Prisma.Decimal(0)
    );

    const ordersWithBills = await prisma.bill.findMany({
      where: { restaurantId: restaurant.id },
      select: { orderId: true },
    });
    const billedOrderIds = ordersWithBills.map((b) => b.orderId);

    const unbilledOrdersCount = await prisma.order.count({
      where: {
        restaurantId: restaurant.id,
        id: { notIn: billedOrderIds },
        status: { not: OrderStatus.CANCELLED },
      },
    });

    return {
      todaySales: Number(todaySalesDecimal.toFixed(2)),
      todayPaidAmount: Number(todayPaidDecimal.toFixed(2)),
      outstandingAmount: Number(outstandingDecimal.toFixed(2)),
      paidOrdersCount: paidBillsCount,
      partiallyPaidOrdersCount: partialBillsCount,
      unbilledOrdersCount,
    };
  }
}
