import { describe, expect, it } from 'vitest';
import type { RulesCatalogResponse } from '../recommendationsApi';
import { mapRuleCatalog } from '../ruleCatalogAdapter';

const mockCatalog: RulesCatalogResponse = {
  version: '2024.09',
  updated: '2024-09-25T10:00:00Z',
  sources: [],
  botanical_families: [],
  crops: [
    {
      crop_id: 7,
      crop_name: 'Лён',
      botanical_family: 'Linaceae',
      good_predecessors: [
        { crop_reference: 'crop:3', rating: 'excellent' },
        { crop_reference: 'family:fabaceae', rating: 'good' },
      ],
      bad_predecessors: [{ crop_reference: 'crop:999', reason: 'нет данных' }],
    },
    {
      crop_id: 999,
      crop_name: 'Неизвестная культура',
      botanical_family: 'Unknown',
    },
  ],
};

describe('mapRuleCatalog', () => {
  it('resolves crop: and family: references using local crops registry', () => {
    const result = mapRuleCatalog(mockCatalog);
    const flax = result.crops[0];

    expect(flax.good_predecessors?.[0].crop_reference).toBe('Рожь');
    expect(flax.good_predecessors?.[1].crop_reference).toBe('Семейство: fabaceae');
    expect(flax.bad_predecessors?.[0].crop_reference).toBe('crop:999');
  });

  it('keeps crops with incomplete rule coverage unchanged', () => {
    const result = mapRuleCatalog(mockCatalog);
    const incomplete = result.crops[1];

    expect(incomplete.crop_name).toBe('Неизвестная культура');
    expect(incomplete.good_predecessors).toBeUndefined();
  });
});
