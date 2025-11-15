export type LLPoint = {
  lat: number;
  lng: number;
  name?: string;
  id?: string;
};

export type FieldStatus = 'active' | 'planned' | 'archived';

export interface FieldCoordinates {
  lat: number;
  lng: number;
}

export interface FieldSegmentLength {
  segment: string;
  length: number;
}

/**
 * Raw field model received from backend services (snake_case keys)
 */
export interface FieldApiModel {
  id: string;
  name: string;
  area_ha: number;
  crop?: string;
  status?: FieldStatus;
  region?: string;
  soil_type?: string;
  centroid?: FieldCoordinates;
  polygon?: LLPoint[];
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Normalized field data used throughout the UI
 */
export interface FieldData {
  id: string;
  name: string;
  area: number;
  crop?: string;
  isActive?: boolean;
  status?: FieldStatus;
  soilType?: string;
  soilData?: SoilData;
  segmentLengths?: FieldSegmentLength[];
  notes?: string;
  cropRotationHistory?: string;
  plannedOperations?: PlannedOperation[];
  fertilizers?: Fertilizer[];
  irrigationSystem?: IrrigationSystem;
  coordinates?: FieldCoordinates;
  polygon?: LLPoint[];
  region?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SoilData = {
  ph: number;
  organicCarbon: number;
  clay: number;
  sand: number;
  silt: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
};

export type PlannedOperation = {
  type: string;
  date: string;
  status: 'planned' | 'in-progress' | 'completed';
};

export type Fertilizer = {
  type: string;
  name: string;
  applicationDate: string;
  amount: number;
  unit: string;
};

export type IrrigationSystem = {
  hasSystem: boolean;
  type: string;
  description: string;
};
