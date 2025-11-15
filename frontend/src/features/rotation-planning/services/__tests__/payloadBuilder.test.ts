import { describe, expect, it } from 'vitest';
import {
  buildQueryPayload,
  PayloadValidationError,
  type QueryPayloadInput,
} from '../payloadBuilder';

const baseHistory = [
  {
    id: '1',
    fieldName: 'Поле Север',
    crop: 'Пшеница',
    year: 2024,
    season: 'summer' as const,
    area: 12,
  },
];

describe('buildQueryPayload', () => {
  it('builds RecommendationQueryRequest and tracks data sources', () => {
    const input: QueryPayloadInput = {
      fieldId: 'field-1',
      targetSeason: 'spring',
      targetYear: 2026,
      cropHistory: baseHistory,
      serverContext: {
        field_id: 'field-1',
        field_name: 'Поле 1',
        history: [
          {
            year: 2025,
            season: 'autumn',
            crop_id: 3,
            crop_name: 'Рожь',
          },
        ],
        soil_profile: {
          ph: 6.2,
          soil_type: ['Чернозем'],
        },
        climate_profile: {
          agro_zone: 'Лесостепь',
          frost_risk: 'medium',
          drought_risk: 'low',
        },
      },
      constraints: {
        avoid_botanical_families: ['solanaceae'],
      },
      extendedConstraints: {
        limit: 5,
        prefer_cover_crops: true,
      },
      preferredCrops: [1, 3],
    };

    const { payload, dataSources } = buildQueryPayload(input);

    expect(payload).toMatchObject({
      field_id: 'field-1',
      target_season: 'spring',
      target_year: 2026,
      history: [
        {
          year: 2025,
          season: 'autumn',
          crop_id: 3,
          crop_name: 'Рожь',
        },
      ],
      soil_profile: {
        ph: 6.2,
        soil_type: ['Чернозем'],
      },
      climate_profile: {
        agro_zone: 'Лесостепь',
        frost_risk: 'medium',
        drought_risk: 'low',
      },
      constraints: {
        avoid_botanical_families: ['solanaceae'],
        prefer_cover_crops: true,
      },
      preferred_crops: [1, 3],
      limit: 5,
    });
    expect(dataSources).toEqual({
      history_source: 'server',
      soil_profile_source: 'server',
      climate_profile_source: 'server',
    });
  });

  it('throws when history has duplicate year and season', () => {
    const input: QueryPayloadInput = {
      fieldId: 'field-1',
      targetSeason: 'spring',
      targetYear: 2025,
      cropHistory: [
        ...baseHistory,
        { ...baseHistory[0], id: 'copy' },
      ],
    };

    expect(() => buildQueryPayload(input)).toThrowError(PayloadValidationError);
  });

  it('validates soil profile and constraint arrays', () => {
    const input: QueryPayloadInput = {
      fieldId: 'field-1',
      targetSeason: 'summer',
      targetYear: 2025,
      cropHistory: baseHistory,
      soilProfile: {
        soil_type: [],
      },
      constraints: {
        avoid_botanical_families: [],
      },
    };

    expect(() => buildQueryPayload(input)).toThrowError(
      /soil_type array cannot be empty/
    );

    input.soilProfile = { ph: -1 };
    expect(() => buildQueryPayload(input)).toThrowError(/pH must be between 0 and 14/);

    input.soilProfile = { ph: 6.3, soil_type: ['Супесь'] };
    expect(() => buildQueryPayload(input)).toThrowError(
      /avoid_botanical_families should be omitted/
    );
  });
});
