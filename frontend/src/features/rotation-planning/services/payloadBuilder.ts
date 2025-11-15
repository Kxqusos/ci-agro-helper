import {
  RecommendationQueryRequest,
  FieldHistoryEntry,
  SoilProfile,
  ClimateProfile,
  QueryConstraints,
  Season,
  DataSources,
} from './recommendationsApi';
import { CropHistoryRecord } from '../types';
import type { FieldSelectorContext, ExtendedQueryConstraints } from './fieldSelectorTypes';

/**
 * Input data for building recommendation query payload
 */
export interface QueryPayloadInput {
  /** Selected field ID */
  fieldId: string;
  /** Target season for recommendations */
  targetSeason: Season;
  /** Target year for recommendations */
  targetYear: number;
  /** Field crop history from UI (will be converted to API format) */
  cropHistory?: CropHistoryRecord[];
  /** Optional server-side field context (from field selector API) */
  serverContext?: FieldSelectorContext;
  /** Optional soil profile data */
  soilProfile?: SoilProfile;
  /** Optional climate profile data */
  climateProfile?: ClimateProfile;
  /** Optional preferred crop IDs */
  preferredCrops?: number[];
  /** Optional query constraints */
  constraints?: QueryConstraints;
  /** Extended constraints with UI controls */
  extendedConstraints?: ExtendedQueryConstraints;
  /** Maximum number of recommendations to return (1-20) */
  limit?: number;
}

/**
 * Result of payload building including data source tracking
 */
export interface PayloadBuildResult {
  payload: RecommendationQueryRequest;
  dataSources: DataSources;
}

/**
 * Validation error for payload building
 */
export class PayloadValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'PayloadValidationError';
  }
}

/**
 * Convert UI CropHistoryRecord to API FieldHistoryEntry format
 */
function convertHistoryRecord(record: CropHistoryRecord): FieldHistoryEntry {
  return {
    year: record.year,
    season: record.season,
    crop_id: parseInt(record.id, 10) || 1, // TODO: Use real crop_id when available
    crop_name: record.crop,
    notes: record.notes,
  };
}

/**
 * Validate that history entries don't have duplicates by year+season
 */
function validateNoDuplicates(history: FieldHistoryEntry[]): void {
  const seen = new Set<string>();

  for (const entry of history) {
    const key = `${entry.year}-${entry.season}`;
    if (seen.has(key)) {
      throw new PayloadValidationError(
        `Duplicate history entry for ${entry.season} ${entry.year}`,
        'history'
      );
    }
    seen.add(key);
  }
}

/**
 * Validate soil profile data
 */
function validateSoilProfile(soilProfile?: SoilProfile): void {
  if (!soilProfile) return;

  // Check that soil_type array is not empty if provided
  if (soilProfile.soil_type !== undefined && soilProfile.soil_type.length === 0) {
    throw new PayloadValidationError(
      'soil_type array cannot be empty',
      'soil_profile.soil_type'
    );
  }

  // Validate pH range
  if (soilProfile.ph !== undefined) {
    if (soilProfile.ph < 0 || soilProfile.ph > 14) {
      throw new PayloadValidationError(
        'pH must be between 0 and 14',
        'soil_profile.ph'
      );
    }
  }
}

/**
 * Validate constraints
 */
function validateConstraints(constraints?: QueryConstraints): void {
  if (!constraints) return;

  // Ensure arrays are not provided as empty (better to omit them)
  if (
    constraints.avoid_botanical_families !== undefined &&
    constraints.avoid_botanical_families.length === 0
  ) {
    throw new PayloadValidationError(
      'avoid_botanical_families should be omitted if empty',
      'constraints.avoid_botanical_families'
    );
  }

  if (
    constraints.exclude_crop_ids !== undefined &&
    constraints.exclude_crop_ids.length === 0
  ) {
    throw new PayloadValidationError(
      'exclude_crop_ids should be omitted if empty',
      'constraints.exclude_crop_ids'
    );
  }
}

/**
 * Build a valid RecommendationQueryRequest payload from UI input
 *
 * Performs validation of required fields and data consistency.
 * Supports both local UI data and server-side field context.
 *
 * @param input - Input data from UI form and/or field selector API
 * @returns Payload and data source tracking information
 * @throws PayloadValidationError if validation fails
 *
 * @example
 * ```ts
 * // Using local data
 * const result = buildQueryPayload({
 *   fieldId: 'fld-123',
 *   targetSeason: 'spring',
 *   targetYear: 2025,
 *   cropHistory: [
 *     { id: '1', fieldName: 'Field 1', crop: 'Wheat', year: 2024, season: 'summer', area: 10 }
 *   ],
 *   soilProfile: { ph: 6.5, soil_type: ['Чернозем'] },
 *   limit: 5
 * });
 *
 * // Using server context
 * const serverContext = await fieldSelectorApi.getFieldContext('fld-123');
 * const result = buildQueryPayload({
 *   fieldId: 'fld-123',
 *   targetSeason: 'spring',
 *   targetYear: 2025,
 *   serverContext,
 *   limit: 5
 * });
 * ```
 */
export function buildQueryPayload(input: QueryPayloadInput): PayloadBuildResult {
  // Validate required fields
  if (!input.fieldId || input.fieldId.trim() === '') {
    throw new PayloadValidationError('field_id is required', 'field_id');
  }

  if (!input.targetSeason) {
    throw new PayloadValidationError('target_season is required', 'target_season');
  }

  if (!input.targetYear || input.targetYear < 2024 || input.targetYear > 2100) {
    throw new PayloadValidationError(
      'target_year must be between 2024 and 2100',
      'target_year'
    );
  }

  // Initialize data sources tracking
  const dataSources: DataSources = {
    history_source: 'local',
  };

  // Determine history source (server or local)
  let history: FieldHistoryEntry[];
  if (input.serverContext?.history && input.serverContext.history.length > 0) {
    history = input.serverContext.history;
    dataSources.history_source = 'server';
  } else if (input.cropHistory && input.cropHistory.length > 0) {
    history = input.cropHistory.map(convertHistoryRecord);
    dataSources.history_source = 'local';
  } else {
    throw new PayloadValidationError(
      'history must contain at least one entry (from cropHistory or serverContext)',
      'history'
    );
  }

  // Validate no duplicates in history
  validateNoDuplicates(history);

  // Determine soil profile source
  let soilProfile: SoilProfile | undefined;
  if (input.serverContext?.soil_profile) {
    soilProfile = input.serverContext.soil_profile;
    dataSources.soil_profile_source = 'server';
  } else if (input.soilProfile) {
    soilProfile = input.soilProfile;
    dataSources.soil_profile_source = 'local';
  }

  // Validate soil profile
  validateSoilProfile(soilProfile);

  // Determine climate profile source (with ignore option)
  let climateProfile: ClimateProfile | undefined;
  const ignoreClimateFilter = input.extendedConstraints?.ignore_climate_filter || false;

  if (!ignoreClimateFilter) {
    if (input.serverContext?.climate_profile) {
      climateProfile = input.serverContext.climate_profile;
      dataSources.climate_profile_source = 'server';
    } else if (input.climateProfile) {
      climateProfile = input.climateProfile;
      dataSources.climate_profile_source = 'local';
    }
  }

  // Merge constraints with extended constraints
  const constraints: QueryConstraints = {
    ...input.constraints,
    ...input.extendedConstraints,
  };

  // Remove ignore_climate_filter from constraints (it's not part of API)
  if ('ignore_climate_filter' in constraints) {
    delete (constraints as any).ignore_climate_filter;
  }

  // Validate constraints
  validateConstraints(constraints);

  // Validate limit (prefer extended constraints)
  const limit = input.extendedConstraints?.limit || input.limit;
  if (limit !== undefined && ![3, 5, 10, 20].includes(limit) && (limit < 1 || limit > 20)) {
    throw new PayloadValidationError('limit must be 3, 5, 10, 20, or between 1 and 20', 'limit');
  }

  // Build payload
  const payload: RecommendationQueryRequest = {
    field_id: input.fieldId,
    target_season: input.targetSeason,
    target_year: input.targetYear,
    history,
  };

  // Add optional fields only if they have meaningful values
  if (soilProfile) {
    payload.soil_profile = soilProfile;
  }

  if (climateProfile) {
    payload.climate_profile = climateProfile;
  }

  if (input.preferredCrops && input.preferredCrops.length > 0) {
    payload.preferred_crops = input.preferredCrops;
  }

  // Only add constraints if they have meaningful values
  if (Object.keys(constraints).length > 0) {
    payload.constraints = constraints;
  }

  if (limit !== undefined) {
    payload.limit = limit;
  }

  return { payload, dataSources };
}
