import { useState, useCallback } from 'react';
import {
  recommendationsApi,
  RecommendationQueryRequest,
  RecommendationQueryResponse,
  DataSources,
} from '../services/recommendationsApi';
import { buildQueryPayload, QueryPayloadInput, PayloadValidationError } from '../services/payloadBuilder';
import { ApiError } from '@/lib/apiClient';

/**
 * State for recommendations query
 */
export interface RecommendationsState {
  /** Loading state */
  loading: boolean;
  /** Error message if query failed */
  error: string | null;
  /** Error status code */
  errorStatus?: number;
  /** Recommendations response from API */
  data: RecommendationQueryResponse | null;
  /** Request ID for debugging */
  requestId: string | null;
  /** Data sources used in the query */
  dataSources: DataSources | null;
}

/**
 * Hook for querying crop rotation recommendations
 *
 * Provides methods to fetch recommendations and track loading/error state
 *
 * @example
 * ```tsx
 * const { state, fetchRecommendations } = useRecommendationsQuery();
 *
 * const handleGetRecommendations = async () => {
 *   await fetchRecommendations({
 *     fieldId: 'fld-123',
 *     targetSeason: 'spring',
 *     targetYear: 2025,
 *     cropHistory: historyRecords,
 *     limit: 5
 *   });
 * };
 *
 * if (state.loading) return <Spinner />;
 * if (state.error) return <Error message={state.error} />;
 * if (state.data) return <RecommendationsList data={state.data} />;
 * ```
 */
export const useRecommendationsQuery = () => {
  const [state, setState] = useState<RecommendationsState>({
    loading: false,
    error: null,
    data: null,
    requestId: null,
    dataSources: null,
  });

  /**
   * Fetch recommendations from API
   */
  const fetchRecommendations = useCallback(async (input: QueryPayloadInput) => {
    setState({
      loading: true,
      error: null,
      data: null,
      requestId: null,
      dataSources: null,
    });

    try {
      // Build and validate payload
      const { payload, dataSources } = buildQueryPayload(input);

      // Call API
      const response = await recommendationsApi.queryRecommendations(payload);

      // Merge data sources from payload builder and response
      const finalDataSources = {
        ...dataSources,
        ...(response.data_sources || {}),
      };

      setState({
        loading: false,
        error: null,
        data: response,
        requestId: response.request_id,
        dataSources: finalDataSources,
      });

      return response;
    } catch (error) {
      let errorMessage = 'Failed to get recommendations';
      let errorStatus: number | undefined;

      if (error instanceof PayloadValidationError) {
        errorMessage = `Validation error: ${error.message}`;
      } else if (error instanceof ApiError) {
        errorStatus = error.status;

        // Format error message based on status
        switch (error.status) {
          case 403:
            errorMessage = 'Поле недоступно';
            break;
          case 404:
            if (typeof error.detail === 'string' && error.detail.includes('история')) {
              errorMessage = 'История поля отсутствует';
            } else if (typeof error.detail === 'string' && error.detail.includes('подобрать культуры')) {
              errorMessage = 'Не удалось подобрать культуры с текущими фильтрами';
            } else {
              errorMessage = 'Ресурс не найден';
            }
            break;
          default:
            errorMessage = typeof error.detail === 'string' ? error.detail : error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({
        loading: false,
        error: errorMessage,
        errorStatus,
        data: null,
        requestId: null,
        dataSources: null,
      });

      throw error;
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null,
      requestId: null,
      dataSources: null,
    });
  }, []);

  return {
    state,
    fetchRecommendations,
    reset,
  };
};
