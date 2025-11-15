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
 * Backend Token response
 */
interface BackendTokenResponse {
  token_type: 'Bearer';
  access_token: string;
  expire_in: number;
  refresh_token?: string;
}

/**
 * Frontend RefreshResponse
 */
interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
  expireIn: number;
}

/**
 * POST /api/auth/refresh
 *
 * Proxies refresh token request to auth service and returns new tokens
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || uuidv4();

  try {
    // Parse request body
    const body = await request.json();
    const { refreshToken } = body;

    // Validate refresh token
    if (!refreshToken) {
      const errorResponse: ErrorResponse = {
        request_id: requestId,
        error: {
          code: 'validation_error',
          detail: 'Refresh token is required',
        },
      };
      return NextResponse.json(errorResponse, {
        status: 400,
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
    // Note: The backend expects a query parameter 'token', not a body
    const backendResponse = await fetch(
      `${authServiceUrl}/refresh?token=${encodeURIComponent(refreshToken)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
      }
    );

    // Extract tokens from response headers
    const authorization = backendResponse.headers.get('Authorization');
    const newRefreshToken = backendResponse.headers.get('X-Refresh-Token');

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
          code: errorData.code || 'auth.invalid_refresh_token',
          detail: errorData.detail || 'Invalid or expired refresh token',
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
    const tokenData: BackendTokenResponse = await backendResponse.json();

    // Extract access token from Authorization header or response body
    const accessToken = authorization?.replace('Bearer ', '') || tokenData.access_token;

    // Build frontend response
    const response: RefreshResponse = {
      accessToken,
      refreshToken: newRefreshToken || tokenData.refresh_token,
      expireIn: tokenData.expire_in,
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
