import { NextResponse } from 'next/server'

interface SuccessResponse<T> {
  data: T
  meta: { timestamp: string; version: 'v1' }
}

interface ErrorResponse {
  error: { code: string; message: string; details?: unknown }
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    { data, meta: { timestamp: new Date().toISOString(), version: 'v1' } },
    { status }
  )
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ErrorResponse> {
  return NextResponse.json({ error: { code, message, details } }, { status })
}

export const HTTP = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const
