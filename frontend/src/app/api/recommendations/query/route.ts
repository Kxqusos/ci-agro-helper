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
 * POST /api/recommendations/query
 *
 * Proxies recommendation query request to recommendations service
 * Validates request, forwards to backend with auth headers, and handles errors
 */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || uuidv4();

  try {
    // Parse request body
    const body = await request.json();

    // Get recommendations service URL from environment
    const recommendationsServiceUrl =
      process.env.RECOMMENDATIONS_SERVICE_URL || 'http://localhost:8002';

    // Get authorization header from frontend request
    const authorization = request.headers.get('Authorization');

    // Proxy request to recommendations service
    const backendResponse = await fetch(
      `${recommendationsServiceUrl}/recommendations/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...(authorization && { Authorization: authorization }),
        },
        body: JSON.stringify(body),
      }
    );

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
          code: errorData.code || 'recommendations_error',
          detail: errorData.detail || 'Failed to get recommendations',
        },
        errors: errorData.errors,
        meta: errorData.meta,
      };

      return NextResponse.json(errorResponse, {
        status: backendResponse.status,
        headers: { 'X-Request-ID': requestId },
      });
    }

    // Parse successful response
    const data = await backendResponse.json();

    return NextResponse.json(data, {
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
