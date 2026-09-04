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
