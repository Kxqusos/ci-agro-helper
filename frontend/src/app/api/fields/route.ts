import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { mockFields } from '@/features/fields/mocks';
import type { FieldApiModel, FieldData } from '@/features/fields/types';

const toApiModel = (field: FieldData): FieldApiModel => ({
  id: field.id ?? `mock-${field.name}`,
  name: field.name,
  area_ha: field.area,
  crop: field.crop,
  status: field.status ?? (field.isActive ? 'active' : 'planned'),
  region: field.region,
  soil_type: field.soilType,
  centroid: field.coordinates,
  polygon: field.polygon,
  notes: field.notes,
  metadata: {
    irrigation: field.irrigationSystem,
    plannedOperationsCount: field.plannedOperations?.length ?? 0,
  },
});

const parseNumber = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || uuidv4();

  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const isActiveFilter = url.searchParams.get('is_active');
    const regionFilter = url.searchParams.get('region');
    const limitParam = parseNumber(url.searchParams.get('limit'), mockFields.length);
    const offsetParam = parseNumber(url.searchParams.get('offset'), 0);

    const limit = Math.max(limitParam, 1);
    const offset = Math.max(offsetParam, 0);

    let filtered = mockFields.slice();

    if (statusFilter) {
      filtered = filtered.filter((field) => field.status === statusFilter);
    }

    if (isActiveFilter !== null) {
      const target = isActiveFilter === 'true';
      filtered = filtered.filter((field) => field.isActive === target);
    }

    if (regionFilter) {
      const normalizedQuery = regionFilter.toLowerCase();
      filtered = filtered.filter((field) =>
        field.region?.toLowerCase().includes(normalizedQuery)
      );
    }

    const paginated = filtered.slice(offset, offset + limit);

    const payload = {
      fields: paginated.map(toApiModel),
      total: filtered.length,
      limit,
      offset,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: { 'X-Request-ID': requestId },
    });
  } catch (error) {
    console.error('Failed to respond with mock fields', error);
    return NextResponse.json(
      {
        request_id: requestId,
        error: {
          code: 'fields_unavailable',
          detail: error instanceof Error ? error.message : 'Failed to load fields',
        },
      },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}
