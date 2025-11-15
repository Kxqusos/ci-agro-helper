import {
  FieldHistoryEntry,
  SoilProfile,
  ClimateProfile,
} from './recommendationsApi';

/**
 * Field selector context - complete field data for recommendations
 *
 * This interface represents the contract with the field selector service
 * (future BFF integration point)
 */
export interface FieldSelectorContext {
  field_id: string;
  field_name: string;
  /**
   * Field crop history from field selector service
   */
  history: FieldHistoryEntry[];
  /**
   * Soil profile data (can come from field service or user input)
   */
  soil_profile?: SoilProfile;
  /**
   * Climate profile data (can come from weather/climate service)
   */
  climate_profile?: ClimateProfile;
  /**
   * Additional metadata
   */
  metadata?: {
    last_updated?: string;
    data_completeness?: number;
  };
}

/**
 * Field selector API error response
 */
export interface FieldSelectorError {
  status: 'not_found' | 'forbidden' | 'error';
  message: string;
  field_id?: string;
  details?: string;
}

/**
 * Extended query constraints with UI controls
 */
export interface ExtendedQueryConstraints {
  avoid_botanical_families?: string[];
  exclude_crop_ids?: number[];
  require_organic_matter?: 'низкая' | 'средняя' | 'высокая';
  prefer_cover_crops?: boolean;
  ignore_climate_filter?: boolean;
  limit?: 3 | 5 | 10 | 20;
}
