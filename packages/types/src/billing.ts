export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum BillStatus {
  OPEN = 'OPEN',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  VOID = 'VOID',
}

export interface BillResponse {
  id: string;
  restaurantId: string;
  orderId: string;
  invoiceNumber: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  status: BillStatus;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    customerName?: string | null;
    customerPhone?: string | null;
  } | null;
  payments?: PaymentResponse[];
}

export interface PaymentResponse {
  id: string;
  restaurantId: string;
  orderId: string;
  billId?: string | null;
  customerId?: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  idempotencyKey?: string | null;
  transactionReference?: string | null;
  gatewayReference?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  order?: {
    id: string;
    orderNumber: string;
  } | null;
}

export interface BillingMetrics {
  todaySales: number;
  todayPaidAmount: number;
  outstandingAmount: number;
  paidOrdersCount: number;
  partiallyPaidOrdersCount: number;
  unbilledOrdersCount: number;
}

export interface PaymentGatewayAdapter {
  providerName: string;
  createPayment(params: {
    amount: number;
    currency: string;
    orderId: string;
    metadata?: Record<string, any>;
  }): Promise<{ gatewayReference: string; clientSecret?: string }>;

  verifyPayment(params: {
    transactionReference: string;
    gatewayReference: string;
  }): Promise<{ success: boolean; status: PaymentStatus }>;

  refundPayment(params: {
    paymentId: string;
    amount: number;
    reason?: string;
  }): Promise<{ refundReference: string; status: string }>;
}
