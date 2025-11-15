import { RecommendationQueryResponse, RecommendationItem } from './recommendationsApi';
import { FieldRecommendation, CropRecommendation } from '../types';

/**
 * Convert API priority to UI suitability level
 */
function priorityToSuitability(priority: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
  return priority;
}

/**
 * Extract benefits from recommendation reasons
 */
function extractBenefits(item: RecommendationItem): string[] {
  const benefits: string[] = [];

  // Add positive reasons as benefits
  item.reasons
    .filter((r) => r.impact === 'positive')
    .forEach((r) => {
      benefits.push(r.detail);
    });

  // Add soil match notes if available
  if (item.soil_match && item.soil_match.score > 0.7) {
    item.soil_match.notes.forEach((note) => {
      benefits.push(note);
    });
  }

  // Fallback if no benefits found
  if (benefits.length === 0) {
    benefits.push(`Рекомендуемая культура (оценка: ${(item.score * 100).toFixed(0)}%)`);
  }

  return benefits;
}

/**
 * Build reason text from recommendation reasons
 */
function buildReasonText(item: RecommendationItem): string {
  // Find the most important positive reason
  const mainReason = item.reasons.find((r) => r.impact === 'positive');

  if (mainReason) {
    return mainReason.title;
  }

  // Fallback to generic reason
  return `Подходит для посадки в ${getSeason(item)} (общая оценка: ${(item.score * 100).toFixed(0)}%)`;
}

/**
 * Get season name from field data (fallback)
 */
function getSeason(item: RecommendationItem): string {
  // This should come from context, but we'll use a placeholder
  return 'следующий сезон';
}

/**
 * Build soil condition text from current field state
 */
function buildSoilConditionText(
  response: RecommendationQueryResponse,
  previousCrop: string
): string {
  // Build description based on what we know
  const parts: string[] = [];

  // Add info about previous crop
  if (previousCrop) {
    parts.push(`После ${previousCrop.toLowerCase()}`);
  }

  // Add generic info if no specific data
  if (parts.length === 0) {
    parts.push('Анализ севооборота учитывает историю поля');
  }

  return parts.join(', ');
}

/**
 * Convert API RecommendationItem to UI CropRecommendation
 */
function convertRecommendationItem(
  item: RecommendationItem,
  response: RecommendationQueryResponse
): CropRecommendation {
  return {
    crop: item.crop_name,
    suitability: priorityToSuitability(item.priority),
    reason: buildReasonText(item),
    benefits: extractBenefits(item),
  };
}

/**
 * Adapter: Convert API response to UI format
 *
 * Transforms RecommendationQueryResponse into FieldRecommendation[]
 * for compatibility with existing UI components
 *
 * @param response - API response from POST /recommendations/query
 * @param fieldName - Name of the field (from UI state)
 * @returns Array of field recommendations in UI format
 *
 * @example
 * ```ts
 * const apiResponse = await recommendationsApi.queryRecommendations(payload);
 * const uiRecommendations = adaptRecommendationsToUI(apiResponse, 'Поле 1');
 * ```
 */
export function adaptRecommendationsToUI(
  response: RecommendationQueryResponse,
  fieldName: string
): FieldRecommendation[] {
  // Get previous crop from history (last entry)
  const previousCrop = response.recommendations[0]?.crop_name || 'Неизвестная культура';

  // Build soil condition text
  const soilCondition = buildSoilConditionText(response, previousCrop);

  // Convert recommendations
  const recommendedCrops = response.recommendations.map((item) =>
    convertRecommendationItem(item, response)
  );

  // Return single field recommendation
  return [
    {
      fieldId: response.field_id,
      fieldName,
      previousCrop,
      soilCondition,
      recommendedCrops,
    },
  ];
}

/**
 * Check if recommendations data is available
 */
export function hasRecommendations(response: RecommendationQueryResponse | null): boolean {
  return response !== null && response.recommendations.length > 0;
}
