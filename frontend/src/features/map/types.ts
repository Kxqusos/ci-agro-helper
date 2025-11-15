export interface MapRegion {
  id: string;
  name: string;
  bounds?: any;
  layer?: any;
  properties?: Record<string, any>;
}

export interface CitySearchResult {
  lat: number;
  lng: number;
  name: string;
  displayName: string;
  importance?: number;
}

export type DrawingMode = 'polygon' | 'rectangle' | 'circle' | 'marker' | 'none';

export interface MapBounds {
  northEast: { lat: number; lng: number };
  southWest: { lat: number; lng: number };
}

export interface FieldGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface AgriculturalField {
  id: string;
  name: string;
  area: number; // в гектарах
  cropType: string;
  geometry: FieldGeometry;
  regionIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
