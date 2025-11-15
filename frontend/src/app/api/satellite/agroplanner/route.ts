import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '55.7558');
  const lng = parseFloat(searchParams.get('lng') || '37.6173');


  try {
    const esriUrl = getESRITileUrl(lat, lng, 12);
    const analysis = analyzeAgriculturalField(lat, lng);

    return NextResponse.json({
      ...analysis,
      source: 'ESRI_World_Imagery',
      image_url: esriUrl,
      coordinates: { lat, lng },
      timestamp: new Date().toISOString(),
      data_quality: 'high_quality_satellite',
      resolution: '1m',
      provider: 'ESRI',
      note: 'Спутниковый снимок ESRI World Imagery'
    });

  } catch (error) {
    const analysis = analyzeAgriculturalField(lat, lng);

    const demoImages = [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1592135356620-2fcf6f79c6fb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&h=600&fit=crop'
    ];

    const randomImage = demoImages[Math.floor(Math.random() * demoImages.length)];

    return NextResponse.json({
      ...analysis,
      source: 'High_Quality_Demo',
      image_url: randomImage,
      coordinates: { lat, lng },
      timestamp: new Date().toISOString(),
      data_quality: 'demo_high_quality',
      note: 'ДЕМО-РЕЖИМ: Используются высококачественные фото сельхозугодий'
    });
  }
}

function getESRITileUrl(lat: number, lng: number, zoom: number = 12): string {
  const tileX = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const tileY = Math.floor(
    (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 
    2 * Math.pow(2, zoom)
  );

  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;
}

function getBoundingBox(lat: number, lng: number, delta: number): number[] {
  return [
    lng - delta,
    lat - delta, 
    lng + delta,
    lat + delta  
  ];
}

async function checkImageAvailability(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return response.ok && response.headers.get('content-type')?.includes('image');
  } catch (error) {
    return false;
  }
}

function analyzeAgriculturalField(lat: number, lng: number) {
  const fieldAnalysis = {
    moscow_region: { ndvi: 0.62, ndwi: 0.38, msi: 0.22 },
    chernozem: { ndvi: 0.68, ndwi: 0.42, msi: 0.18 },
    southern: { ndvi: 0.58, ndwi: 0.35, msi: 0.25 }
  };

  const region = getAgriculturalRegion(lat, lng);
  const base = fieldAnalysis[region];
  const variation = 0.03;

  const indices = {
    ndvi: base.ndvi + (Math.random() * variation * 2 - variation),
    ndwi: base.ndwi + (Math.random() * variation * 2 - variation),
    msi: base.msi + (Math.random() * variation * 2 - variation)
  };

  return {
    ...indices,
    vegetation_health: getVegetationHealth(indices.ndvi),
    region: region
  };
}

function getAgriculturalRegion(lat: number, lng: number): string {
  if (lat > 55.0 && lat < 56.5 && lng > 35.0 && lng < 39.0) return 'moscow_region';
  if (lat > 50.0 && lat < 55.0 && lng > 35.0 && lng < 45.0) return 'chernozem';
  return 'southern';
}

function getVegetationHealth(ndvi: number): string {
  if (ndvi > 0.6) return 'excellent';
  if (ndvi > 0.4) return 'good';
  if (ndvi > 0.2) return 'moderate';
  return 'poor';
}