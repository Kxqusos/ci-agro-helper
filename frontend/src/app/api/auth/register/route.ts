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
 * Frontend AuthResponse
 */
interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  expireIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    createdAt: string;
  };
}

/**
 * POST /api/auth/register
 *
 * Proxies registration request to auth service and automatically logs in the user
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || uuidv4();

  try {
    // Parse request body
    const body = await request.json();
    const { name, email, password } = body;

    // Validate required fields
    if (!name || !email || !password) {
      const errorResponse: ErrorResponse = {
        request_id: requestId,
        error: {
          code: 'validation_error',
          detail: 'Name, email, and password are required',
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

    // Proxy registration request to auth service
    const registerResponse = await fetch(`${authServiceUrl}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({ name, email, password }),
    });

    // Handle error responses
    if (!registerResponse.ok) {
      let errorData: any;
      try {
        errorData = await registerResponse.json();
      } catch {
        errorData = {
          detail: `HTTP ${registerResponse.status}: ${registerResponse.statusText}`,
        };
      }

      const errorResponse: ErrorResponse = {
        request_id: requestId,
        error: {
          code: errorData.code || 'registration_error',
          detail: errorData.detail || 'Registration failed',
        },
        errors: errorData.errors,
        meta: errorData.meta,
      };

      return NextResponse.json(errorResponse, {
        status: registerResponse.status,
        headers: { 'X-Request-ID': requestId },
      });
    }

    // Registration successful, now login the user
    const loginResponse = await fetch(`${authServiceUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({ email, password }),
    });

    // Extract tokens from login response headers
    const authorization = loginResponse.headers.get('Authorization');
    const refreshToken = loginResponse.headers.get('X-Refresh-Token');

    // Handle login error
    if (!loginResponse.ok) {
      const errorResponse: ErrorResponse = {
        request_id: requestId,
        error: {
          code: 'auto_login_error',
          detail: 'Registration successful but auto-login failed',
        },
      };
      return NextResponse.json(errorResponse, {
        status: loginResponse.status,
        headers: { 'X-Request-ID': requestId },
      });
    }

    // Parse login response
    const tokenData: BackendTokenResponse = await loginResponse.json();

    // Extract access token from Authorization header or response body
    const accessToken = authorization?.replace('Bearer ', '') || tokenData.access_token;

    // Fetch user profile using the access token
    const userResponse = await fetch(`${authServiceUrl}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Request-ID': requestId,
      },
    });

    if (!userResponse.ok) {
      const errorResponse: ErrorResponse = {
        request_id: requestId,
        error: {
          code: 'user_fetch_error',
          detail: 'Failed to fetch user profile',
        },
      };
      return NextResponse.json(errorResponse, {
        status: userResponse.status,
        headers: { 'X-Request-ID': requestId },
      });
    }

    const userData: BackendUser = await userResponse.json();

    // Build frontend response
    const response: AuthResponse = {
      accessToken,
      refreshToken: refreshToken || tokenData.refresh_token,
      expireIn: tokenData.expire_in,
      user: {
        id: userData.id.toString(),
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        createdAt: userData.created_at,
      },
    };

    return NextResponse.json(response, {
      status: 201,
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
