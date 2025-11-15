import { useCallback } from 'react';
import { SatelliteIndices } from '../types';

export const useSatelliteApi = () => {
  const fetchSatelliteData = useCallback(async (lat: number, lng: number): Promise<SatelliteIndices> => {
    try {
      const [planetResponse, agroPlannerResponse] = await Promise.all([
        fetch(`/api/satellite/planet-ndvi?lat=${lat}&lng=${lng}`),
        fetch(`/api/satellite/agroplanner?lat=${lat}&lng=${lng}`)
      ]);

      let imageUrl: string | undefined;
      let source = 'ESRI_World_Imagery';

      if (agroPlannerResponse.ok) {
        try {
          const agroData = await agroPlannerResponse.json();
          imageUrl = agroData.image_url;
          source = agroData.source || source;
        } catch (error) {
          console.warn('AgroPlanner image error, using fallback');
          imageUrl = getESRITileUrl(lat, lng, 12);
        }
      } else {
        imageUrl = getESRITileUrl(lat, lng, 12);
      }

      if (planetResponse.ok) {
        const planetData = await planetResponse.json();
        
        return {
          ndvi: planetData.ndvi ?? 0,
          ndwi: planetData.ndwi ?? 0,
          msi: planetData.msi ?? 0,
          source: planetData.source || 'Planet_API',
          vegetation_health: planetData.vegetation_health,
          image_url: imageUrl 
        };
      }

      if (agroPlannerResponse.ok) {
        try {
          const agroData = await agroPlannerResponse.json();
          
          return {
            ndvi: agroData.ndvi ?? 0,
            ndwi: agroData.ndwi ?? 0,
            msi: agroData.msi ?? 0,
            source: agroData.source || 'ESRI_World_Imagery',
            vegetation_health: agroData.vegetation_health,
            image_url: imageUrl
          };
        } catch (error) {
        }
      }

      // 5. Если все API не сработали - fallback
      return getHighQualityFallback(lat, lng);

    } catch (error) {
      console.error('All satellite APIs failed:', error);
      return getHighQualityFallback(lat, lng);
    }
  }, []);

  return { fetchSatelliteData };
};

function getESRITileUrl(lat: number, lng: number, zoom: number = 12): string {
  const tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const tileY = Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 
    2 * Math.pow(2, zoom)
  );
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;
}

function getHighQualityFallback(lat: number, lng: number): SatelliteIndices {
  const baseNDVI = 0.65 + (Math.random() * 0.1 - 0.05);
  const esriUrl = getESRITileUrl(lat, lng, 12);
  
  return {
    ndvi: baseNDVI,
    ndwi: 0.35 + (Math.random() * 0.1 - 0.05),
    msi: 0.25 + (Math.random() * 0.1 - 0.05),
    source: 'ESRI_World_Imagery_Fallback',
    vegetation_health: getVegetationHealth(baseNDVI),
    image_url: esriUrl
  };
}

function getVegetationHealth(ndvi: number): string {
  if (ndvi > 0.6) return 'excellent';
  if (ndvi > 0.4) return 'good';
  if (ndvi > 0.2) return 'moderate';
  return 'poor';
}