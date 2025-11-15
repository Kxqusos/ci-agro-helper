export { RotationNavigation } from './components/RotationNavigation';
export { RotationTabs } from './components/RotationTabs';
export { HistoryTab } from './components/HistoryTab';
export { AnalyticsTab } from './components/AnalyticsTab';
export { RecommendationsTab } from './components/RecommendationsTab';
export { RuleCatalogTab } from './components/RuleCatalogTab';
export { QuickActions } from './components/QuickActions';
export { useRotationData } from './hooks/useRotationData';
export { useRotationNavigation } from './hooks/useRotationNavigation';
export { useRecommendationsQuery } from './hooks/useRecommendationsQuery';
export type {
  RotationTab,
  CropHistoryRecord,
  AnalyticsData,
  FieldRecommendation,
  FieldInfo
} from './types';

// API exports
export { recommendationsApi } from './services/recommendationsApi';
export { historyApi } from './services/historyApi';
export { buildQueryPayload, PayloadValidationError } from './services/payloadBuilder';
export { adaptRecommendationsToUI, hasRecommendations } from './services/recommendationsAdapter';
export { mapRuleCatalog, getCropNameById, filterRulesCatalog } from './services/ruleCatalogAdapter';
export type { RuleCatalogFilters } from './services/ruleCatalogAdapter';
export type {
  Season,
  FieldHistoryEntry,
  SoilProfile,
  ClimateProfile,
  QueryConstraints,
  RecommendationQueryRequest,
  RecommendationItem,
  RecommendationReason,
  SoilMatch,
  RecommendationQueryResponse,
  RulesCatalogResponse,
} from './services/recommendationsApi';
export type { QueryPayloadInput } from './services/payloadBuilder';
