import { NextRequest } from 'next/server';

/**
 * BFF endpoint for SSE recommendations event stream
 * GET /api/events/recommendations?field_id=...&trace_id=...
 *
 * In production, this will proxy to the API Gateway SSE endpoint
 * For development, simulates SSE stream with mock events
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fieldId = searchParams.get('field_id');
  const traceId = searchParams.get('trace_id');

  console.log('[SSE API] Client connected:', { fieldId, traceId });

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(connectMessage));

      // TODO: In production, proxy to real API Gateway SSE endpoint
      // const response = await fetch(`${API_GATEWAY_URL}/events/recommendations?field_id=${fieldId}`, {
      //   headers: {
      //     'Accept': 'text/event-stream',
      //     'Authorization': request.headers.get('Authorization') || '',
      //   },
      // });
      //
      // if (!response.body) {
      //   controller.close();
      //   return;
      // }
      //
      // const reader = response.body.getReader();
      // while (true) {
      //   const { done, value } = await reader.read();
      //   if (done) break;
      //   controller.enqueue(value);
      // }
      // controller.close();

      // Development mock: Send a test event after 3 seconds
      const mockEventTimer = setTimeout(() => {
        const mockEvent = {
          event_id: '123e4567-e89b-12d3-a456-426614174000',
          trace_id: traceId || null,
          processed_at: new Date().toISOString(),
          status: 'success',
          field_id: fieldId || 'field-1',
          target_season: 'spring',
          target_year: 2025,
          request_id: `req_${Date.now()}`,
          duration_ms: 1250,
          source: 'rule-engine-v1',
          response: {
            field_id: fieldId || 'field-1',
            target_season: 'spring',
            target_year: 2025,
            generated_at: new Date().toISOString(),
            request_id: `req_${Date.now()}`,
            data_version: '1.0.0',
            recommendations: [],
            filters_applied: [],
          },
          error: null,
          error_code: null,
        };

        const message = `data: ${JSON.stringify(mockEvent)}\n\n`;
        controller.enqueue(encoder.encode(message));

        console.log('[SSE API] Sent mock event:', mockEvent);
      }, 3000);

      // Keep connection alive with heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `:heartbeat ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          console.log('[SSE API] Heartbeat failed, closing connection');
          clearInterval(heartbeatInterval);
          clearTimeout(mockEventTimer);
          controller.close();
        }
      }, 15000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        console.log('[SSE API] Client disconnected');
        clearInterval(heartbeatInterval);
        clearTimeout(mockEventTimer);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
