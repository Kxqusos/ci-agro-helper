import { useState, useEffect } from 'react';
import { SatelliteData } from '../types';
import { useSatelliteApi } from '../services/useSatelliteApi';

interface Coordinates {
  lat: number;
  lng: number;
}

export const useSatelliteData = (coords: Coordinates | null) => {
  const [satelliteData, setSatelliteData] = useState<SatelliteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchSatelliteData } = useSatelliteApi();

   useEffect(() => {
    if (!coords) {
      setSatelliteData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchSatelliteData(coords.lat, coords.lng)
      .then(apiData => {
        console.log('Satellite data received:', apiData);
        
        setSatelliteData({
          indices: [
            {
              name: "NDVI — жизнеспособность растительности",
              value: apiData.ndvi ?? 0,
              color: "bg-green-500",
              recommendations: getNDVIRecommendations(apiData.ndvi ?? 0),
              source: apiData.source
            },
            {
              name: "NDWI — активность влаги", 
              value: apiData.ndwi ?? 0,
              color: "bg-blue-500",
              recommendations: getNDWIRecommendations(apiData.ndwi ?? 0),
              source: apiData.source
            },
            {
              name: "MSI — стрессовые факторы",
              value: apiData.msi ?? 0,
              color: "bg-yellow-500",
              recommendations: getMSIRecommendations(apiData.msi ?? 0),
              source: apiData.source
            }
          ],
          image_url: apiData.image_url,
          source: apiData.source,
          vegetation_health: apiData.vegetation_health,
          coordinates: coords
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching satellite data:', err);
        setError('Ошибка загрузки спутниковых данных');
        setLoading(false);
      });
  }, [coords, fetchSatelliteData]);

  return { satelliteData, loading, error };
};
const getNDVIRecommendations = (ndvi: number): string[] => {
  if (ndvi > 0.75) return [
    "Растительный покров в пике продуктивности",
    "Поддерживайте текущую агротехнику. Вмешательство не требуется"
  ];
  if (ndvi > 0.55) return [
    "Общее состояние хорошее",
    "Контролируйте появление очагов снижения — точечные обходы 1 раз в 3–5 дней"
  ];
  if (ndvi > 0.35) return [
    "Есть зоны с недостаточной активностью",
    "Проверьте питание: азот/фосфор — возможен локальный дефицит"
  ];
  return [
    "Низкое поглощение — биомасса угнетена",
    "Провести детальный обход участка — стресс вероятен уже на уровне поверхности"
  ];
};

const getNDWIRecommendations = (ndwi: number): string[] => {
  if (ndwi > 0.5) return [
    "Почва насыщена влагой",
    "Полив не требуется. Следите чтобы не появлялись зоны переувлажнения"
  ];
  if (ndwi > 0.3) return [
    "Влагосодержание оптимально",
    "Ориентируйтесь только на погодные осадки для корректировок"
  ];
  return [
    "Дефицит влаги по поверхности",
    "Наиболее эффективно — капельный полив в зоне корнеобитаемости"
  ];
};

const getMSIRecommendations = (msi: number): string[] => {
  if (msi < 0.2) return [
    "Стрессовые факторы отсутствуют",
    "Используйте это окно для плановой профилактики и диагностик"
  ];
  if (msi < 0.4) return [
    "Стресс низкий, но фиксируемый",
    "Проверить микрозоны — возможно точечный дефицит калия или pH-сдвиг"
  ];
  if (msi < 0.6) return [
    "Средний уровень стресса",
    "Наблюдайте и подготовьте корректирующие действия в случае ухудшения"
  ];
  return [
    "Высокий стресс",
    "Провести прицельное обследование: пестициды, засоление, корневой стресс"
  ];
};