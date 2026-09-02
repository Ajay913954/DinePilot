export interface ApiResponseSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponseError {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T = any> = ApiResponseSuccess<T> | ApiResponseError;
