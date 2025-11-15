import { http, HttpResponse } from 'msw';
import type {
  RecommendationQueryRequest,
  RecommendationQueryResponse,
} from '@/features/rotation-planning/services/recommendationsApi';
import type { FieldSelectorContext } from '@/features/rotation-planning/services/fieldSelectorTypes';
import type { RecommendationResultMessage } from '@/features/rotation-planning/schemas/eventSchemas';

const fieldSelectorContext: Record<string, FieldSelectorContext> = {
  'field-1': {
    field_id: 'field-1',
    field_name: 'Поле Север-1',
    history: [
      { year: 2024, season: 'summer', crop_id: 1, crop_name: 'Пшеница' },
      { year: 2023, season: 'summer', crop_id: 4, crop_name: 'Ячмень' },
    ],
    soil_profile: {
      ph: 6.4,
      soil_type: ['Чернозем'],
      organic_matter: 'средняя',
    },
    climate_profile: {
      agro_zone: 'Лесостепь',
      frost_risk: 'medium',
      drought_risk: 'low',
      avg_temperature_c: 7.5,
      annual_precipitation_mm: 520,
    },
    metadata: {
      last_updated: new Date().toISOString(),
      data_completeness: 0.9,
    },
  },
};

const recommendationResponse: RecommendationQueryResponse = {
  field_id: 'field-1',
  target_season: 'spring',
  target_year: 2025,
  generated_at: new Date().toISOString(),
  request_id: 'mock-rec-1',
  data_version: '2024.10',
  recommendations: [
    {
      crop_id: 3,
      crop_name: 'Рожь',
      botanical_family: 'Poaceae',
      score: 0.84,
      priority: 'high',
      reasons: [
        {
          rule_id: 'rotation-interval',
          title: 'Выдержан интервал 2 года',
          impact: 'positive',
          detail: 'Рожь хорошо переносит текущий pH и насыщает почву',
        },
      ],
      soil_match: {
        score: 0.78,
        notes: ['pH в оптимальном диапазоне'],
      },
      warnings: ['Следите за снежной плесенью'],
      required_actions: ['Провести предпосевную культивацию'],
    },
    {
      crop_id: 5,
      crop_name: 'Овёс',
      botanical_family: 'Poaceae',
      score: 0.69,
      priority: 'medium',
      reasons: [
        {
          rule_id: 'cover-crop',
          title: 'Поддерживает органику',
          impact: 'positive',
          detail: 'Увеличивает гумус в верхнем слое почвы',
        },
      ],
      warnings: [],
      required_actions: ['Контроль кислотности в фазе кущения'],
    },
  ],
  filters_applied: ['agro_zone=лесостепь', 'soil_profile=true'],
  data_sources: {
    history_source: 'server',
    soil_profile_source: 'server',
    climate_profile_source: 'server',
  },
};

const rulesCatalog = {
  version: '2024.10',
  updated: '2024-10-14T12:00:00Z',
  sources: [
    {
      id: 'planter-2024',
      title: 'Agro Digital Knowledge Base',
      year: 2024,
      url: 'https://example.com/rules',
    },
  ],
  botanical_families: [
    {
      key: 'poaceae',
      name_ru: 'Злаки',
      name_latin: 'Poaceae',
    },
  ],
  crops: [
    {
      crop_id: 3,
      crop_name: 'Рожь',
      botanical_family: 'Poaceae',
      good_predecessors: [
        { crop_reference: 'crop:1', rating: 'excellent' },
        { crop_reference: 'family:fabaceae', rating: 'good' },
      ],
      acceptable_predecessors: [
        { crop_reference: 'crop:5', conditions: 'При достаточном увлажнении' },
      ],
    },
  ],
};

const createSseResponse = (fieldId: string | null): RecommendationResultMessage => ({
  event_id: 'evt-msw-1',
  request_id: `req-${Date.now()}`,
  trace_id: null,
  processed_at: new Date().toISOString(),
  status: 'success',
  field_id: fieldId || 'field-1',
  target_season: 'spring',
  target_year: 2025,
  duration_ms: 1320,
  response: recommendationResponse,
});

const createNoRecommendationsError = () =>
  HttpResponse.json(
    {
      request_id: 'mock-no-rec',
      error: {
        code: 'no_recommendations',
        detail: 'Не удалось подобрать культуры с текущими фильтрами',
      },
      meta: {
        filters_applied: ['agro_zone=лесостепь', 'frost_risk=medium'],
      },
    },
    { status: 404 }
  );

const recommendationQueryHandler = http.post('/api/recommendations/query', async ({ request }) => {
  const body = (await request.json()) as RecommendationQueryRequest;

  // Симулируем климатический отказ, когда климатический профиль не отключён
  if (body.climate_profile) {
    return createNoRecommendationsError();
  }

  return HttpResponse.json(recommendationResponse);
});

const rulesCatalogHandler = http.get('/api/recommendations/rules', () =>
  HttpResponse.json(rulesCatalog)
);

const fieldSelectorHandler = http.get('/api/field-selector/:fieldId/context', ({ params }) => {
  const fieldId = params.fieldId as string;
  const context = fieldSelectorContext[fieldId] || fieldSelectorContext['field-1'];
  return HttpResponse.json(context);
});

const sseHandler = http.get(/\/(api\/)?events\/recommendations/, async ({ request }) => {
  const url = new URL(request.url);
  const fieldId = url.searchParams.get('field_id');
  const chunks = [
    `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`,
    `data: ${JSON.stringify(createSseResponse(fieldId))}\n\n`,
  ];

  return new HttpResponse(chunks.join(''), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});

export const handlers = [
  recommendationQueryHandler,
  rulesCatalogHandler,
  fieldSelectorHandler,
  sseHandler,
];
