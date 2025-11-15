import { apiClient } from '@/lib/apiClient';
import type {
  FieldSelectorContext,
  FieldSelectorError,
} from './fieldSelectorTypes';

/**
 * API client for field selector service
 *
 * Provides methods to fetch complete field context including history,
 * soil profile, and climate data for use in recommendations.
 */
export const fieldSelectorApi = {
  /**
   * Fetch field context by field ID
   *
   * @param fieldId - Field identifier
   * @returns Complete field context with history and profiles
   * @throws ApiError if field not found (404) or forbidden (403)
   *
   * @example
   * ```ts
   * const context = await fieldSelectorApi.getFieldContext('fld-123');
   * console.log(`Field: ${context.field_name}`);
   * console.log(`History entries: ${context.history.length}`);
   * ```
   */
  getFieldContext: async (fieldId: string): Promise<FieldSelectorContext> => {
    return apiClient.get<FieldSelectorContext>(
      `/field-selector/${fieldId}/context`
    );
  },
};
