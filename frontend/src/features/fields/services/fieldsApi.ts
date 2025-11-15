import { apiClient } from '@/lib/apiClient';
import { FieldData, FieldApiModel } from '../types';

/**
 * Create field request payload
 */
export interface CreateFieldRequest {
  name: string;
  area: number;
  crop: string;
  soilType: string;
  coordinates: { lat: number; lng: number };
  polygon: Array<{ lat: number; lng: number; name?: string; id?: string }>;
  region?: string;
  notes?: string;
}

/**
 * Update field request payload
 */
export interface UpdateFieldRequest extends Partial<CreateFieldRequest> {
  id: string;
}

/**
 * List fields query parameters
 */
export interface ListFieldsParams {
  isActive?: boolean;
  status?: 'active' | 'planned' | 'archived';
  region?: string;
  limit?: number;
  offset?: number;
}

/**
 * List fields response
 */
export interface ListFieldsResponse {
  fields: FieldData[];
  total: number;
  limit: number;
  offset: number;
}

interface FieldsApiListResponse {
  fields: FieldApiModel[];
  total: number;
  limit: number;
  offset: number;
}

const adaptFieldFromApi = (field: FieldApiModel): FieldData => ({
  id: field.id,
  name: field.name,
  area: field.area_ha ?? 0,
  crop: field.crop,
  status: field.status,
  isActive: field.status === 'active',
  soilType: field.soil_type,
  region: field.region,
  coordinates: field.centroid,
  polygon: field.polygon,
  notes: field.notes,
});

const buildQueryString = (params?: ListFieldsParams): string => {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  if (params.isActive !== undefined) {
    searchParams.set('is_active', String(params.isActive));
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.region) {
    searchParams.set('region', params.region);
  }

  if (params.limit !== undefined) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.offset !== undefined) {
    searchParams.set('offset', String(params.offset));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * API client for field management service
 *
 * This service handles CRUD operations for fields, including geometry,
 * soil data, crop information, and operational planning.
 *
 * Note: This is a stub implementation. Actual backend integration
 * will be implemented in future tickets.
 */
export const fieldsApi = {
  /**
   * Get all fields for the current user
   *
   * @param params - Query parameters for filtering and pagination
   * @returns List of fields with metadata
   *
   * @example
   * ```ts
   * const { fields, total } = await fieldsApi.listFields({
   *   isActive: true,
   *   limit: 10
   * });
   * ```
   */
  listFields: async (params?: ListFieldsParams): Promise<ListFieldsResponse> => {
    const query = buildQueryString(params);
    const response = await apiClient.get<FieldsApiListResponse>(`/fields${query}`);

    return {
      fields: response.fields.map(adaptFieldFromApi),
      total: response.total,
      limit: response.limit,
      offset: response.offset,
    };
  },

  /**
   * Helper to get only the array of fields
   */
  getFields: async (params?: ListFieldsParams): Promise<FieldData[]> => {
    const response = await fieldsApi.listFields(params);
    return response.fields;
  },

  /**
   * Get a single field by ID
   *
   * @param fieldId - Field identifier
   * @returns Field data
   *
   * @example
   * ```ts
   * const field = await fieldsApi.getField('fld-123');
   * ```
   */
  getField: async (fieldId: string): Promise<FieldData> => {
    // TODO: Implement backend call
    const field = await apiClient.get<FieldApiModel>(`/fields/${fieldId}`);
    return adaptFieldFromApi(field);
  },

  /**
   * Create a new field
   *
   * @param field - Field data to create
   * @returns Created field with generated ID
   *
   * @example
   * ```ts
   * const newField = await fieldsApi.createField({
   *   name: 'North Field',
   *   area: 5.2,
   *   crop: 'wheat',
   *   soilType: 'loam',
   *   coordinates: { lat: 55.7558, lng: 37.6173 },
   *   polygon: [...]
   * });
   * ```
   */
  createField: async (field: CreateFieldRequest): Promise<FieldData> => {
    // TODO: Implement backend call
    // For now, use the existing lib/api/fields.ts saveFieldData()
    const result = await import('@/lib/api/fields').then(m =>
      m.saveFieldData(field)
    );
    return {
      ...field,
      id: String(result.id),
      isActive: true,
      segmentLengths: [],
      cropRotationHistory: '',
      plannedOperations: [],
      fertilizers: [],
      irrigationSystem: { hasSystem: false, type: '', description: '' }
    } as FieldData;
  },

  /**
   * Update an existing field
   *
   * @param fieldId - Field identifier
   * @param updates - Partial field data to update
   * @returns Updated field
   *
   * @example
   * ```ts
   * const updated = await fieldsApi.updateField('fld-123', {
   *   crop: 'corn',
   *   notes: 'Switched to corn for rotation'
   * });
   * ```
   */
  updateField: async (
    fieldId: string,
    updates: Partial<FieldData>
  ): Promise<FieldData> => {
    // TODO: Implement backend call
    return apiClient.post<Partial<FieldData>, FieldData>(
      `/fields/${fieldId}`,
      updates
    );
  },

  /**
   * Delete a field
   *
   * @param fieldId - Field identifier
   * @returns Success status
   *
   * @example
   * ```ts
   * await fieldsApi.deleteField('fld-123');
   * ```
   */
  deleteField: async (fieldId: string): Promise<{ success: boolean }> => {
    // TODO: Implement backend call
    // For now, use the existing lib/api/fields.ts deleteField()
    return import('@/lib/api/fields').then(m => m.deleteField(fieldId));
  },

  /**
   * Get field statistics and analytics
   *
   * @param fieldId - Field identifier
   * @returns Field statistics
   *
   * @example
   * ```ts
   * const stats = await fieldsApi.getFieldStats('fld-123');
   * ```
   */
  getFieldStats: async (fieldId: string): Promise<{
    totalArea: number;
    avgYield: number;
    soilHealth: number;
    lastUpdated: string;
  }> => {
    // TODO: Implement backend call
    return apiClient.get(`/fields/${fieldId}/stats`);
  }
};
