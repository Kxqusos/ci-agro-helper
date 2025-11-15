import cropsData from '@/data/crops.json';
import type { RulesCatalogResponse, CropRuleSummary } from './recommendationsApi';

/**
 * Crop lookup from local crops.json
 */
const cropsLookup = new Map(
  cropsData.searchIndex.map((crop) => [crop.id, crop])
);

/**
 * Resolve crop_reference to crop name
 * Handles formats: crop:1, family:poaceae, "Пшеница", etc.
 */
function resolveCropReference(ref: string): string {
  // If it starts with "crop:", extract ID and look up
  if (ref.startsWith('crop:')) {
    const cropId = parseInt(ref.split(':')[1], 10);
    const crop = cropsLookup.get(cropId);
    return crop ? crop.name : ref;
  }

  // If it starts with "family:", return the family key
  if (ref.startsWith('family:')) {
    const familyKey = ref.split(':')[1];
    return `Семейство: ${familyKey}`;
  }

  // Otherwise, return as-is (already a name)
  return ref;
}

/**
 * Enrich crop rule summary with resolved crop names
 */
function enrichCropRuleSummary(crop: CropRuleSummary): CropRuleSummary {
  return {
    ...crop,
    good_predecessors: crop.good_predecessors?.map((pred) => ({
      ...pred,
      crop_reference: resolveCropReference(pred.crop_reference),
    })),
    acceptable_predecessors: crop.acceptable_predecessors?.map((pred) => ({
      ...pred,
      crop_reference: resolveCropReference(pred.crop_reference),
    })),
    bad_predecessors: crop.bad_predecessors?.map((pred) => ({
      ...pred,
      crop_reference: resolveCropReference(pred.crop_reference),
    })),
  };
}

/**
 * Adapter: Enrich rules catalog with resolved crop names
 *
 * Transforms crop_reference values like "crop:1" to actual crop names
 * by looking them up in frontend/src/data/crops.json
 *
 * @param catalog - Raw rules catalog from API
 * @returns Enriched catalog with human-readable crop names
 */
export function mapRuleCatalog(catalog: RulesCatalogResponse): RulesCatalogResponse {
  return {
    ...catalog,
    crops: catalog.crops.map(enrichCropRuleSummary),
  };
}

/**
 * Get crop name by ID from local crops.json
 */
export function getCropNameById(cropId: number): string | null {
  const crop = cropsLookup.get(cropId);
  return crop ? crop.name : null;
}

/**
 * Filter rules catalog by various criteria
 */
export interface RuleCatalogFilters {
  cropName?: string;
  botanicalFamily?: string;
  dataConfidence?: 'высокая' | 'средняя' | 'низкая';
  hasRotationInterval?: boolean;
  hasPredecessors?: boolean;
}

/**
 * Apply filters to rules catalog
 */
export function filterRulesCatalog(
  catalog: RulesCatalogResponse,
  filters: RuleCatalogFilters
): CropRuleSummary[] {
  let results = [...catalog.crops];

  if (filters.cropName) {
    const searchTerm = filters.cropName.toLowerCase();
    results = results.filter((crop) =>
      crop.crop_name.toLowerCase().includes(searchTerm)
    );
  }

  if (filters.botanicalFamily) {
    results = results.filter(
      (crop) =>
        crop.botanical_family.toLowerCase() === filters.botanicalFamily!.toLowerCase()
    );
  }

  if (filters.hasRotationInterval) {
    results = results.filter((crop) => crop.rotation_interval_years !== undefined);
  }

  if (filters.hasPredecessors) {
    results = results.filter(
      (crop) =>
        (crop.good_predecessors && crop.good_predecessors.length > 0) ||
        (crop.acceptable_predecessors && crop.acceptable_predecessors.length > 0) ||
        (crop.bad_predecessors && crop.bad_predecessors.length > 0)
    );
  }

  return results;
}
