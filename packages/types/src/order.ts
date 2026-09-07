export type OrderStatus =
  | 'DRAFT'
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderSource =
  | 'DASHBOARD'
  | 'WEBSITE'
  | 'QR'
  | 'WHATSAPP'
  | 'AI'
  | 'PHONE'
  | 'OTHER';

export interface OrderItemResponse {
  id: string;
  orderId: string;
  menuItemId: string;
  itemNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderResponse {
  id: string;
  restaurantId: string;
  customerId: string | null;
  reservationId: string | null;
  tableId: string | null;
  orderNumber: string;
  status: OrderStatus;
  source: OrderSource;
  notes: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  completedAt: string | null;
  confirmedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
    isVip: boolean;
  } | null;
  table?: {
    id: string;
    tableNumber: string;
    name: string | null;
    capacity: number;
  } | null;
  reservation?: {
    id: string;
    reservationDate: string;
    startTime: string;
    guestCount: number;
  } | null;
  items: OrderItemResponse[];
}

export interface OrderListItem {
  id: string;
  restaurantId: string;
  orderNumber: string;
  status: OrderStatus;
  source: OrderSource;
  totalAmount: number;
  itemCount: number;
  customerName: string | null;
  customerPhone: string | null;
  tableNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDashboardMetrics {
  todayOrdersCount: number;
  todayOrderValue: number;
  activeOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  sourceBreakdown: Record<string, number>;
}
