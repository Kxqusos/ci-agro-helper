export interface SatelliteIndex {
  name: string;
  value: number;
  color: string;
  recommendations: string[];
  source?: string
}

export interface SatelliteData {
  indices: SatelliteIndex[];
  image_url?: string;
  source?: string;
  vegetation_health?: string;
  coordinates?: { lat: number; lng: number };
}

export interface SatelliteIndices {
  ndvi: number;
  ndwi: number; 
  msi: number;
  source?: string;
  vegetation_health?: string;
  image_url?: string;
}

export interface LLPoint {
  lat: number;
  lng: number;
  name?: string;
  id?: string;
  satelliteData?: SatelliteIndices;
}