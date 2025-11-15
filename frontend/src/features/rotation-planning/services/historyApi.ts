import { apiClient } from '@/lib/apiClient';
import type { CropHistoryRecord } from '../types';
import type { Season } from './recommendationsApi';

export interface HistoryQueryParams {
  fieldId?: string;
  year?: number;
  limit?: number;
  offset?: number;
}

export interface HistoryRecordDto {
  id: string;
  field_id: string;
  field_name: string;
  crop: string;
  crop_id?: number;
  year: number;
  season: Season;
  area_ha: number;
  yield_t_per_ha?: number;
  notes?: string;
}

interface HistoryListApiResponse {
  records: HistoryRecordDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface HistoryListResponse {
  records: CropHistoryRecord[];
  total: number;
  limit: number;
  offset: number;
}

const adaptHistoryRecord = (record: HistoryRecordDto): CropHistoryRecord => ({
  id: record.id,
  fieldName: record.field_name,
  crop: record.crop,
  year: record.year,
  season: record.season,
  area: record.area_ha,
  yield: record.yield_t_per_ha,
  notes: record.notes,
});

const buildHistoryQuery = (params?: HistoryQueryParams): string => {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  if (params.fieldId) {
    searchParams.set('field_id', params.fieldId);
  }

  if (params.year) {
    searchParams.set('year', String(params.year));
  }

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.offset !== undefined) {
    searchParams.set('offset', String(params.offset));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const historyApi = {
  listHistory: async (params?: HistoryQueryParams): Promise<HistoryListResponse> => {
    const query = buildHistoryQuery(params);
    const response = await apiClient.get<HistoryListApiResponse>(`/history${query}`);

    return {
      records: response.records.map(adaptHistoryRecord),
      total: response.total,
      limit: response.limit,
      offset: response.offset,
    };
  },
};
