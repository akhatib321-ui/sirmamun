// src/shared/response.envelope.ts
// Standard API response shape used by every endpoint in the platform.
// Consistent envelope means the frontend always knows what to expect.

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
    timestamp: new Date().toISOString(),
  };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    success: true,
    data: {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  };
}
