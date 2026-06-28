import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse, Pagination } from '@doc/shared';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  const body: ApiResponse<T> = { success: true, data };
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

export function sendPaginated<T>(res: Response, items: T[], pagination: Pagination): Response {
  const body: PaginatedResponse<T> = { success: true, data: { items, pagination } };
  return res.status(200).json(body);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/** Build a Pagination object from raw count + query params. */
export function buildPagination(total: number, page: number, limit: number): Pagination {
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  };
}
