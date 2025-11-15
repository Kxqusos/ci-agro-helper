import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { mockHistoryRecords } from '@/features/rotation-planning/mocks/history';
import type { HistoryRecordDto } from '@/features/rotation-planning/services/historyApi';

const normalizeFieldId = (fieldName: string): string =>
  fieldName.trim().toLowerCase().replace(/\s+/g, '-');

const toApiRecord = (record: typeof mockHistoryRecords[number]): HistoryRecordDto => ({
  id: record.id,
  field_id: normalizeFieldId(record.fieldName),
  field_name: record.fieldName,
  crop: record.crop,
  year: record.year,
  season: record.season,
  area_ha: record.area,
  yield_t_per_ha: record.yield,
  notes: record.notes,
});

const parseNumeric = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('X-Request-ID') || uuidv4();

  try {
    const url = new URL(request.url);
    const fieldFilter = url.searchParams.get('field_id');
    const yearFilter = url.searchParams.get('year');
    const limitParam = parseNumeric(url.searchParams.get('limit'), mockHistoryRecords.length);
    const offsetParam = parseNumeric(url.searchParams.get('offset'), 0);

    const limit = Math.max(limitParam, 1);
    const offset = Math.max(offsetParam, 0);

    let filtered = mockHistoryRecords.slice();

    if (fieldFilter) {
      filtered = filtered.filter((record) => {
        const fieldId = normalizeFieldId(record.fieldName);
        return fieldId === fieldFilter || record.fieldName === fieldFilter;
      });
    }

    if (yearFilter) {
      const targetYear = Number(yearFilter);
      if (Number.isFinite(targetYear)) {
        filtered = filtered.filter((record) => record.year === targetYear);
      }
    }

    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json(
      {
        records: paginated.map(toApiRecord),
        total: filtered.length,
        limit,
        offset,
      },
      {
        status: 200,
        headers: { 'X-Request-ID': requestId },
      }
    );
  } catch (error) {
    console.error('Failed to serve mock history', error);
    return NextResponse.json(
      {
        request_id: requestId,
        error: {
          code: 'history_unavailable',
          detail: error instanceof Error ? error.message : 'Failed to load crop history',
        },
      },
      {
        status: 500,
        headers: { 'X-Request-ID': requestId },
      }
    );
  }
}
