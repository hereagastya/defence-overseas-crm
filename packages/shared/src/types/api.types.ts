/** Standard success envelope — all API responses use this shape */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Standard error envelope */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/** Server-side pagination metadata */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: Pagination;
  };
}

/** Common query params for list endpoints */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
