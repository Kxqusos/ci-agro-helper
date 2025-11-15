import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://api.weatherapi.com/v1';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || uuidv4();

  try {
    const url = new URL(request.url);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        {
          request_id: requestId,
          error: {
            code: 'invalid_coordinates',
            detail: 'lat и lng обязательны',
          },
        },
        {
          status: 400,
          headers: { 'X-Request-ID': requestId },
        }
      );
    }

    if (!WEATHER_API_KEY) {
      return NextResponse.json(
        {
          request_id: requestId,
          error: {
            code: 'weather_api_key_missing',
            detail: 'Переменная окружения WEATHER_API_KEY не задана',
          },
        },
        {
          status: 500,
          headers: { 'X-Request-ID': requestId },
        }
      );
    }

    const upstreamResponse = await fetch(
      `${WEATHER_API_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lng}&days=3&lang=ru`,
      {
        next: { revalidate: 0 },
      }
    );

    if (!upstreamResponse.ok) {
      const errorPayload = await upstreamResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          request_id: requestId,
          error: {
            code: 'weather_upstream_error',
            detail:
              errorPayload?.error?.message ||
              `Weather provider responded with ${upstreamResponse.status}`,
          },
        },
        {
          status: upstreamResponse.status,
          headers: { 'X-Request-ID': requestId },
        }
      );
    }

    const data = await upstreamResponse.json();

    return NextResponse.json(data, {
      status: 200,
      headers: { 'X-Request-ID': requestId },
    });
  } catch (error) {
    console.error('Weather proxy failed', error);
    return NextResponse.json(
      {
        request_id: requestId,
        error: {
          code: 'weather_proxy_error',
          detail: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}
