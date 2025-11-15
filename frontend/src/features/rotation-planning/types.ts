export type RotationTab = 'history' | 'analytics' | 'recommendations' | 'rules';

export interface CropHistoryRecord {
  id: string;
  fieldName: string;
  crop: string;
  year: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  area: number;
  yield?: number;
  notes?: string;
}

export interface CropDistribution {
  crop: string;
  area: number;
  percentage: number;
  year: number;
  fieldName: string;
}

export interface SoilHealthParameter {
  parameter: string;
  value: number;
  status: 'good' | 'warning' | 'critical';
  fieldName: string;
}

export interface AnalyticsData {
  cropsDistribution: CropDistribution[];
  soilHealth: SoilHealthParameter[];
  rotationEfficiency: number;
  fieldName?: string;
}

export interface CropRecommendation {
  crop: string;
  suitability: 'high' | 'medium' | 'low';
  reason: string;
  benefits: string[];
}

export interface FieldRecommendation {
  fieldId: string;
  fieldName: string;
  previousCrop: string;
  soilCondition: string;
  recommendedCrops: CropRecommendation[];
}

export type SoilHealth = SoilHealthParameter;

export interface FieldInfo {
  name: string;
  area: number;
  soilType: string;
  lastCrop: string;
}