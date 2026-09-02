import { ApiResponse } from '@dinepilot/types';
import { RegisterInput, LoginInput, RestaurantOnboardingInputSchema, RestaurantUpdateInput } from '@dinepilot/validation';

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
};
