import { beforeEach, describe, expect, it } from 'vitest';
import { useRecommendationsJobs } from '../recommendationsJobs';

const enqueuePayload = {
  eventId: 'evt-1',
  requestId: 'req-1',
  fieldId: 'field-7',
  targetSeason: 'spring',
  targetYear: 2025,
};

const mockResponse = {
  field_id: 'field-7',
  target_season: 'spring' as const,
  target_year: 2025,
  generated_at: new Date().toISOString(),
  request_id: 'req-1',
  data_version: '2024.09',
  recommendations: [],
  filters_applied: ['agro_zone=лесостепь'],
};

beforeEach(() => {
  useRecommendationsJobs.getState().clearJobs();
  useRecommendationsJobs.setState({
    activeFieldId: null,
    kafkaAvailable: true,
    kafkaErrorMessage: null,
  });
});

describe('useRecommendationsJobs store', () => {
  it('updates job status when recommendation result arrives', () => {
    const store = useRecommendationsJobs.getState();
    store.enqueueJob(enqueuePayload);

    store.applyResult({
      event_id: 'evt-1',
      request_id: 'req-1',
      field_id: 'field-7',
      target_season: 'spring',
      target_year: 2025,
      processed_at: new Date().toISOString(),
      status: 'success',
      duration_ms: 1400,
      response: mockResponse,
    });

    const updated = useRecommendationsJobs.getState().jobs.get('req-1');
    expect(updated?.status).toBe('success');
    expect(updated?.response).toEqual(mockResponse);
    expect(updated?.durationMs).toBe(1400);
  });

  it('exposes response in active jobs list', () => {
    const store = useRecommendationsJobs.getState();
    store.enqueueJob(enqueuePayload);
    store.setActiveField('field-7');

    store.applyResult({
      event_id: 'evt-1',
      request_id: 'req-1',
      field_id: 'field-7',
      target_season: 'spring',
      target_year: 2025,
      processed_at: new Date().toISOString(),
      status: 'success',
      response: mockResponse,
    });

    const active = useRecommendationsJobs.getState().getActiveJobs();
    expect(active).toHaveLength(1);
    expect(active[0].response?.field_id).toBe('field-7');
  });
});
