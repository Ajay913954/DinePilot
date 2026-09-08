import { ApiResponse } from '@dinepilot/types';
import { 
  RegisterInput, 
  LoginInput, 
  RestaurantOnboardingInputSchema, 
  RestaurantUpdateInput,
  CreateTableInput,
  UpdateTableInput,
  CreateReservationInput,
  UpdateReservationInput
} from '@dinepilot/validation';

const API_BASE_URL = '/api';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'An unexpected error occurred.');
  }

  return data.data;
}

export const authApi = {
  register: (input: RegisterInput) => fetchApi<{ user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  }),

  login: (input: LoginInput) => fetchApi<{ user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  }),

  logout: () => fetchApi<{ message: string }>('/auth/logout', {
    method: 'POST',
  }),

  getMe: () => fetchApi<{ user: any }>('/auth/me', {
    method: 'GET',
  }),
};

export const restaurantApi = {
  createOnboarding: (input: RestaurantOnboardingInputSchema) =>
    fetchApi<{ restaurant: any }>('/onboarding', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getMe: () =>
    fetchApi<{ restaurant: any }>('/restaurants/me', {
      method: 'GET',
    }),

  updateMe: (input: RestaurantUpdateInput) =>
    fetchApi<{ restaurant: any }>('/restaurants/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  getBySlug: (slug: string) =>
    fetchApi<{ restaurant: any }>(`/restaurants/public/${slug}`, {
      method: 'GET',
    }),
};

export const tableApi = {
  getTables: (includeInactive: boolean = false) =>
    fetchApi<{ tables: any[] }>(`/tables${includeInactive ? '?includeInactive=true' : ''}`, {
      method: 'GET',
    }),

  createTable: (input: CreateTableInput) =>
    fetchApi<{ table: any }>('/tables', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getTableById: (id: string) =>
    fetchApi<{ table: any }>(`/tables/${id}`, {
      method: 'GET',
    }),

  updateTable: (id: string, input: UpdateTableInput) =>
    fetchApi<{ table: any }>(`/tables/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deleteTable: (id: string) =>
    fetchApi<{ table: any }>(`/tables/${id}`, {
      method: 'DELETE',
    }),
};

export const reservationApi = {
  checkAvailability: (params: { date: string; startTime: string; guestCount: number; durationMinutes?: number; tableId?: string }) => {
    const query = new URLSearchParams({
      date: params.date,
      startTime: params.startTime,
      guestCount: String(params.guestCount),
      ...(params.durationMinutes && { durationMinutes: String(params.durationMinutes) }),
      ...(params.tableId && { tableId: params.tableId }),
    }).toString();
    return fetchApi<any>(`/reservations/availability?${query}`, { method: 'GET' });
  },

  getReservations: (filters: { date?: string; status?: string; tableId?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (filters.date) query.append('date', filters.date);
    if (filters.status) query.append('status', filters.status);
    if (filters.tableId) query.append('tableId', filters.tableId);
    if (filters.search) query.append('search', filters.search);
    if (filters.page) query.append('page', String(filters.page));
    if (filters.limit) query.append('limit', String(filters.limit));

    return fetchApi<{ reservations: any[]; pagination: any }>(`/reservations?${query.toString()}`, {
      method: 'GET',
    });
  },

  createReservation: (input: CreateReservationInput) =>
    fetchApi<{ reservation: any }>('/reservations', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getReservationById: (id: string) =>
    fetchApi<{ reservation: any }>(`/reservations/${id}`, {
      method: 'GET',
    }),

  updateReservation: (id: string, input: UpdateReservationInput) =>
    fetchApi<{ reservation: any }>(`/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  confirmReservation: (id: string) =>
    fetchApi<{ reservation: any }>(`/reservations/${id}/confirm`, {
      method: 'POST',
    }),

  cancelReservation: (id: string) =>
    fetchApi<{ reservation: any }>(`/reservations/${id}/cancel`, {
      method: 'POST',
    }),

  seatReservation: (id: string) =>
    fetchApi<{ reservation: any }>(`/reservations/${id}/seat`, {
      method: 'POST',
    }),

  completeReservation: (id: string) =>
    fetchApi<{ reservation: any }>(`/reservations/${id}/complete`, {
      method: 'POST',
    }),

  markNoShow: (id: string) =>
    fetchApi<{ reservation: any }>(`/reservations/${id}/no-show`, {
      method: 'POST',
    }),
};

export const customerApi = {
  getCustomers: (filters: {
    search?: string;
    classification?: string;
    tagId?: string;
    isVip?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.classification) query.append('classification', filters.classification);
    if (filters.tagId) query.append('tagId', filters.tagId);
    if (filters.isVip !== undefined) query.append('isVip', String(filters.isVip));
    if (filters.page) query.append('page', String(filters.page));
    if (filters.limit) query.append('limit', String(filters.limit));

    return fetchApi<{ customers: any[]; pagination: any }>(`/customers?${query.toString()}`, {
      method: 'GET',
    });
  },

  getCustomerById: (id: string) =>
    fetchApi<{ customer: any }>(`/customers/${id}`, {
      method: 'GET',
    }),

  getCustomerReservations: (id: string) =>
    fetchApi<{ reservations: any[] }>(`/customers/${id}/reservations`, {
      method: 'GET',
    }),

  getCustomerStats: () =>
    fetchApi<{ stats: any }>('/customers/stats', {
      method: 'GET',
    }),

  createCustomer: (input: any) =>
    fetchApi<{ customer: any }>('/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateCustomer: (id: string, input: any) =>
    fetchApi<{ customer: any }>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deleteCustomer: (id: string) =>
    fetchApi<{ customer: any }>(`/customers/${id}`, {
      method: 'DELETE',
    }),

  mergeCustomers: (payload: { primaryCustomerId: string; secondaryCustomerId: string }) =>
    fetchApi<{ customer: any }>('/customers/merge', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  addTag: (customerId: string, tagName: string) =>
    fetchApi<{ tag: any }>(`/customers/${customerId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ name: tagName }),
    }),

  removeTag: (customerId: string, tagId: string) =>
    fetchApi<{ success: boolean }>(`/customers/${customerId}/tags/${tagId}`, {
      method: 'DELETE',
    }),
};

export const menuApi = {
  getCategories: () =>
    fetchApi<{ categories: any[] }>('/menu/categories', {
      method: 'GET',
    }),

  createCategory: (input: { name: string; description?: string; isActive?: boolean }) =>
    fetchApi<{ category: any }>('/menu/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateCategory: (id: string, input: { name?: string; description?: string; isActive?: boolean }) =>
    fetchApi<{ category: any }>(`/menu/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deleteCategory: (id: string, force: boolean = false) =>
    fetchApi<{ category: any }>(`/menu/categories/${id}${force ? '?force=true' : ''}`, {
      method: 'DELETE',
    }),

  reorderCategories: (categoryIds: string[]) =>
    fetchApi<{ success: boolean }>('/menu/categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ categoryIds }),
    }),

  getMenuItems: (filters: {
    categoryId?: string;
    search?: string;
    isAvailable?: boolean;
    isVegetarian?: boolean;
    isVegan?: boolean;
    isSpicy?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (filters.categoryId) query.append('categoryId', filters.categoryId);
    if (filters.search) query.append('search', filters.search);
    if (filters.isAvailable !== undefined) query.append('isAvailable', String(filters.isAvailable));
    if (filters.isVegetarian !== undefined) query.append('isVegetarian', String(filters.isVegetarian));
    if (filters.isVegan !== undefined) query.append('isVegan', String(filters.isVegan));
    if (filters.isSpicy !== undefined) query.append('isSpicy', String(filters.isSpicy));

    return fetchApi<{ items: any[] }>(`/menu/items?${query.toString()}`, {
      method: 'GET',
    });
  },

  createMenuItem: (input: any) =>
    fetchApi<{ item: any }>('/menu/items', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateMenuItem: (id: string, input: any) =>
    fetchApi<{ item: any }>(`/menu/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  toggleItemAvailability: (id: string, isAvailable: boolean) =>
    fetchApi<{ item: any }>(`/menu/items/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ isAvailable }),
    }),

  deleteMenuItem: (id: string) =>
    fetchApi<{ item: any }>(`/menu/items/${id}`, {
      method: 'DELETE',
    }),

  reorderMenuItems: (categoryId: string, itemIds: string[]) =>
    fetchApi<{ success: boolean }>('/menu/items/reorder', {
      method: 'POST',
      body: JSON.stringify({ categoryId, itemIds }),
    }),

  getMenuStats: () =>
    fetchApi<{ stats: any }>('/menu/stats', {
      method: 'GET',
    }),

  getPublicMenu: (slug: string) =>
    fetchApi<any>(`/menu/public/${slug}`, {
      method: 'GET',
    }),
};

export const orderApi = {
  getOrders: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tableId?: string;
    customerId?: string;
    source?: string;
    date?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.tableId) query.append('tableId', params.tableId);
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.source) query.append('source', params.source);
    if (params.date) query.append('date', params.date);

    return fetchApi<{ data: any[]; pagination: any }>(`/orders?${query.toString()}`, {
      method: 'GET',
    });
  },

  getOrderById: (id: string) =>
    fetchApi<any>(`/orders/${id}`, {
      method: 'GET',
    }),

  getOrderStats: () =>
    fetchApi<any>('/orders/stats', {
      method: 'GET',
    }),

  createOrder: (input: any) =>
    fetchApi<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateOrder: (id: string, input: any) =>
    fetchApi<any>(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  updateOrderStatus: (id: string, status: string) =>
    fetchApi<any>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  addOrderItem: (id: string, input: any) =>
    fetchApi<any>(`/orders/${id}/items`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateOrderItem: (id: string, itemId: string, input: any) =>
    fetchApi<any>(`/orders/${id}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  removeOrderItem: (id: string, itemId: string) =>
    fetchApi<any>(`/orders/${id}/items/${itemId}`, {
      method: 'DELETE',
    }),

  cancelOrder: (id: string, reason?: string) =>
    fetchApi<any>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

export const billingApi = {
  getBills: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    orderId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.orderId) query.append('orderId', params.orderId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    return fetchApi<{ data: any[]; pagination: any }>(`/bills?${query.toString()}`, {
      method: 'GET',
    });
  },

  getBillById: (id: string) =>
    fetchApi<any>(`/bills/${id}`, {
      method: 'GET',
    }),

  getBillByOrder: (orderId: string) =>
    fetchApi<any>(`/bills/order/${orderId}`, {
      method: 'GET',
    }),

  createBill: (orderId: string) =>
    fetchApi<any>('/bills', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),

  getBillingMetrics: () =>
    fetchApi<any>('/bills/metrics', {
      method: 'GET',
    }),

  getPayments: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    method?: string;
    orderId?: string;
    billId?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.method) query.append('method', params.method);
    if (params.orderId) query.append('orderId', params.orderId);
    if (params.billId) query.append('billId', params.billId);
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    return fetchApi<{ data: any[]; pagination: any }>(`/payments?${query.toString()}`, {
      method: 'GET',
    });
  },

  getPaymentById: (id: string) =>
    fetchApi<any>(`/payments/${id}`, {
      method: 'GET',
    }),

  getOrderPayments: (orderId: string) =>
    fetchApi<any[]>(`/payments/order/${orderId}`, {
      method: 'GET',
    }),

  createPayment: (input: {
    orderId: string;
    amount: number;
    method: string;
    status?: string;
    idempotencyKey?: string;
    transactionReference?: string;
    notes?: string;
  }) =>
    fetchApi<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updatePaymentStatus: (id: string, status: string) =>
    fetchApi<any>(`/payments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};


