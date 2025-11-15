import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * BFF endpoint for creating recommendation jobs
 * POST /api/recommendations/jobs
 *
 * In production, this will proxy to the API Gateway/recommendations service
 * For development, returns mock eventId and requestId
 */

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Validate required fields
    if (!payload.field_id || !payload.target_season || !payload.target_year) {
      return NextResponse.json(
        { error: 'Missing required fields: field_id, target_season, target_year' },
        { status: 400 }
      );
    }

    // TODO: In production, proxy to real API Gateway
    // const response = await fetch(`${API_GATEWAY_URL}/recommendations/jobs`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': request.headers.get('Authorization') || '',
    //   },
    //   body: JSON.stringify(payload),
    // });
    //
    // return NextResponse.json(await response.json(), { status: response.status });

    // Development mock response
    const eventId = uuidv4();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('[Jobs API] Created job:', { eventId, requestId, payload });

    return NextResponse.json(
      {
        event_id: eventId,
        request_id: requestId,
        status: 'queued',
        message: 'Recommendation job created successfully',
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[Jobs API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
