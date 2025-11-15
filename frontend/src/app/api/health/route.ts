import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Health check endpoint for Docker healthcheck and monitoring
 * Returns status and basic information about the service
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      service: 'frontend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200 }
  );
}
