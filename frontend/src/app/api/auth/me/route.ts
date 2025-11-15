import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Error response structure (OpenAPI spec)
 */
interface ErrorResponse {
  request_id: string;
  error: {
    code: string;
    detail: string | object | unknown[];
  };
  errors?: unknown[];
  meta?: Record<string, unknown>;
}

/**
 * Backend User response
 */
interface BackendUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_verified: boolean;
  created_at: string;
}

/**
 * Frontend User response
 */
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

/**
 * GET /api/auth/me
 *
 * Proxies request to auth service to get current user profile
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || uuidv4();

  try {
    // Get authorization token from request header
    const authorization = request.headers.get('Authorization');

    if (!authorization) {
      const errorResponse: ErrorResponse = {
        request_id: requestId,
        error: {
          code: 'auth.missing_token',
          detail: 'Authorization token is required',
        },
      };
      return NextResponse.json(errorResponse, {
        status: 401,
        headers: { 'X-Request-ID': requestId },
      });
    }

    // Get auth service URL from environment
    const authServiceUrl = process.env.AUTH_SERVICE_URL;
    if (!authServiceUrl) {
      const errorResponse: ErrorResponse = {
        request_id: requestId,
        error: {
          code: 'configuration_error',
          detail: 'AUTH_SERVICE_URL is not configured',
        },
      };
      return NextResponse.json(errorResponse, {
        status: 503,
        headers: { 'X-Request-ID': requestId },
      });
    }

    // Proxy request to auth service
    const backendResponse = await fetch(`${authServiceUrl}/me`, {
      method: 'GET',
      headers: {
        Authorization: authorization,
        'X-Request-ID': requestId,
      },
    });

    // Handle error responses
    if (!backendResponse.ok) {
      let errorData: any;
      try {
        errorData = await backendResponse.json();
      } catch {
        errorData = {
          detail: `HTTP ${backendResponse.status}: ${backendResponse.statusText}`,
        };
      }

      const errorResponse: ErrorResponse = {
        request_id: requestId,
        error: {
          code: errorData.code || 'auth.invalid_token',
          detail: errorData.detail || 'Invalid or expired token',
        },
        errors: errorData.errors,
        meta: errorData.meta,
      };

      return NextResponse.json(errorResponse, {
        status: backendResponse.status,
        headers: { 'X-Request-ID': requestId },
      });
    }

    // Parse backend response
    const userData: BackendUser = await backendResponse.json();

    // Build frontend response
    const response: User = {
      id: userData.id.toString(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      createdAt: userData.created_at,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: { 'X-Request-ID': requestId },
    });
  } catch (error) {
    // Handle network or parsing errors
    const errorResponse: ErrorResponse = {
      request_id: requestId,
      error: {
        code: 'internal_error',
        detail: error instanceof Error ? error.message : 'Internal server error',
      },
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: { 'X-Request-ID': requestId },
    });
  }
}
