import { apiClient } from '@/lib/apiClient';

/**
 * Season type from OpenAPI spec
 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Field history entry
 */
export interface FieldHistoryEntry {
  year: number;
  season: Season;
  crop_id: number;
  crop_name?: string;
  notes?: string;
}

/**
 * Soil profile data
 */
export interface SoilProfile {
  ph?: number;
  soil_type?: string[];
  organic_matter?: 'низкая' | 'средняя' | 'высокая';
  drainage?: 'плохой' | 'средний' | 'хороший';
}

/**
 * Climate profile data
 */
export interface ClimateProfile {
  agro_zone?: string;
  frost_risk?: 'low' | 'medium' | 'high';
  drought_risk?: 'low' | 'medium' | 'high';
  avg_temperature_c?: number;
  annual_precipitation_mm?: number;
}

/**
 * Query constraints for filtering recommendations
 */
export interface QueryConstraints {
  avoid_botanical_families?: string[];
  exclude_crop_ids?: number[];
  require_organic_matter?: 'низкая' | 'средняя' | 'высокая';
  prefer_cover_crops?: boolean;
}

/**
 * Recommendation query request
 */
export interface RecommendationQueryRequest {
  field_id: string;
  target_season: Season;
  target_year: number;
  history: FieldHistoryEntry[];
  soil_profile?: SoilProfile;
  climate_profile?: ClimateProfile;
  preferred_crops?: number[];
  constraints?: QueryConstraints;
  limit?: number;
}

/**
 * Recommendation reason
 */
export interface RecommendationReason {
  rule_id: string;
  title: string;
  impact: 'positive' | 'negative' | 'warning';
  detail: string;
}

/**
 * Soil match score
 */
export interface SoilMatch {
  score: number;
  notes: string[];
}

/**
 * Individual recommendation item
 */
export interface RecommendationItem {
  crop_id: number;
  crop_name: string;
  botanical_family: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  reasons: RecommendationReason[];
  soil_match?: SoilMatch;
  warnings: string[];
  required_actions: string[];
}

/**
 * Recommendation query response
 */
export interface RecommendationQueryResponse {
  field_id: string;
  target_season: Season;
  target_year: number;
  generated_at: string;
  request_id: string;
  data_version: string;
  recommendations: RecommendationItem[];
  filters_applied: string[];
  data_sources?: DataSources;
}

/**
 * Information about data sources used in recommendations
 */
export interface DataSources {
  history_source: 'local' | 'server';
  soil_profile_source?: 'local' | 'server';
  climate_profile_source?: 'local' | 'server';
}

/**
 * Rule source information
 */
export interface RuleSource {
  id: string;
  title: string;
  authors?: string;
  year?: number;
  url?: string;
  isbn?: string;
  doi?: string;
}

/**
 * Botanical family information
 */
export interface BotanicalFamily {
  key: string;
  name_ru: string;
  name_latin: string;
  common_pests?: string[];
  common_diseases?: string[];
}

/**
 * Crop rule summary
 */
export interface CropRuleSummary {
  crop_id: number;
  crop_name: string;
  botanical_family: string;
  rotation_interval_years?: {
    min?: number;
    recommended?: number;
  };
  good_predecessors?: Array<{
    crop_reference: string;
    rating: 'excellent' | 'good';
    reason?: string;
  }>;
  acceptable_predecessors?: Array<{
    crop_reference: string;
    conditions?: string;
  }>;
  bad_predecessors?: Array<{
    crop_reference: string;
    reason?: string;
  }>;
  incompatible_families?: string[];
  soil_requirements?: SoilProfile;
}

/**
 * Rules catalog response
 */
export interface RulesCatalogResponse {
  version: string;
  updated?: string;
  sources: RuleSource[];
  botanical_families: BotanicalFamily[];
  crops: CropRuleSummary[];
}

/**
 * API client for crop rotation recommendations service
 *
 * This service provides agronomic recommendations based on field history,
 * soil conditions, climate data, and crop rotation rules.
 */
export const recommendationsApi = {
  /**
   * Query crop recommendations for a field
   *
   * @param request - Recommendation query parameters
   * @returns Ranked list of recommended crops with reasons
   *
   * @example
   * ```ts
   * const recommendations = await recommendationsApi.queryRecommendations({
   *   field_id: 'fld-123',
   *   target_season: 'spring',
   *   target_year: 2025,
   *   history: [
   *     { year: 2024, season: 'summer', crop_id: 1, crop_name: 'Wheat' }
   *   ],
   *   limit: 5
   * });
   * ```
   */
  queryRecommendations: async (
    request: RecommendationQueryRequest
  ): Promise<RecommendationQueryResponse> => {
    return apiClient.post<RecommendationQueryRequest, RecommendationQueryResponse>(
      '/recommendations/query',
      request
    );
  },

  /**
   * Get published crop rotation rules catalog
   *
   * Returns the current version of agronomic rules including botanical families,
   * rotation intervals, and predecessor compatibility.
   *
   * @returns Rules catalog with metadata
   *
   * @example
   * ```ts
   * const rules = await recommendationsApi.getRulesCatalog();
   * console.log(`Rules version: ${rules.version}`);
   * ```
   */
  getRulesCatalog: async (): Promise<RulesCatalogResponse> => {
    return apiClient.get<RulesCatalogResponse>('/recommendations/rules');
  }
};
