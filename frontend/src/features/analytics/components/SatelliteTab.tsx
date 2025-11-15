import { useSatelliteData } from '../hooks/useSatelliteData';
import SatelliteImagery from './SatelliteImagery';
import { 
  Satellite as SatelliteIcon, 
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sprout
} from 'lucide-react';

interface SatelliteTabProps {
  coords?: { lat: number; lng: number };
}

function getNDVIColor(value: number): string {
  if (value > 0.7) return 'bg-green-500';
  if (value > 0.5) return 'bg-green-400';
  if (value > 0.3) return 'bg-yellow-400';
  if (value > 0.1) return 'bg-orange-400';
  return 'bg-red-500';
}

function getNDWIColor(value: number): string {
  if (value > 0.5) return 'bg-blue-500';
  if (value > 0.3) return 'bg-blue-400';
  if (value > 0.1) return 'bg-cyan-400';
  return 'bg-gray-400';
}

function getMSIColor(value: number): string {
  if (value < 0.2) return 'bg-green-500';
  if (value < 0.4) return 'bg-yellow-400';
  if (value < 0.6) return 'bg-orange-400';
  return 'bg-red-500';
}

function getIndexStatus(name: string, value: number): string {
  if (name.includes('NDVI')) {
    if (value > 0.7) return 'Отличная вегетация';
    if (value > 0.5) return 'Хорошее состояние';
    if (value > 0.3) return 'Средняя активность';
    if (value > 0.1) return 'Слабая растительность';
    return 'Нет растительности';
  }
  
  if (name.includes('NDWI')) {
    if (value > 0.5) return 'Высокая влажность';
    if (value > 0.3) return 'Нормальная влажность';
    if (value > 0.1) return 'Пониженная влажность';
    return 'Дефицит влаги';
  }
  
  if (name.includes('MSI')) {
    if (value < 0.2) return 'Низкий стресс';
    if (value < 0.4) return 'Умеренный стресс';
    if (value < 0.6) return 'Средний стресс';
    return 'Высокий стресс';
  }
  
  return 'Норма';
}

function getCombinedRecommendations(indices: any[]): string[] {
  const recommendations: string[] = [];

  const ndvi = indices.find(i => i.name.includes('NDVI'))?.value || 0;
  const ndwi = indices.find(i => i.name.includes('NDWI'))?.value || 0;
  const msi = indices.find(i => i.name.includes('MSI'))?.value || 0;

  if (ndvi > 0.7 && msi < 0.3) {
    recommendations.push('Отличное состояние посевов. Продолжайте текущую агротехнику.');
  } else if (ndvi > 0.5 && msi < 0.4) {
    recommendations.push('Хорошее состояние растений. Плановый мониторинг 1 раз в 3-5 дней.');
  } else if (ndvi < 0.3 || msi > 0.6) {
    recommendations.push('Критическое состояние! Требуется срочный осмотр поля.');
  }

  if (ndwi < 0.2 && msi > 0.5) {
    recommendations.push('Сильный водный стресс! Срочно обеспечьте полив.');
  } else if (ndwi < 0.3 && ndvi > 0.4) {
    recommendations.push('Недостаток влаги. Рассмотрите капельный полив.');
  } else if (ndwi > 0.6) {
    recommendations.push('Избыточная влажность. Проверьте дренаж.');
  }

  if (ndvi > 0.6 && msi > 0.4) {
    recommendations.push('Признаки стресса. Проверьте питание растений.');
  }

  if (ndvi > 0.5 && ndvi < 0.7 && msi < 0.4 && ndwi > 0.3 && ndwi < 0.5) {
    recommendations.push('Идеальные условия для внесения удобрений.');
  }

  if (msi > 0.4 && ndvi < 0.5) {
    recommendations.push('Средний уровень стресса. Проверьте микрозоны.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Состояние в пределах нормы. Регулярный мониторинг.');
  }

  if (msi > 0.5 || ndvi < 0.4) {
    recommendations.push('Увеличьте частоту обходов до 1 раза в 2-3 дня.');
  }

  return recommendations.slice(0, 4);
}

export default function SatelliteTab({ coords }: SatelliteTabProps) {
  const { satelliteData, loading, error } = useSatelliteData(coords || null);

  if (!coords) {
    return (
      <div className="text-[#E8F4FF] h-full flex flex-col">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold mb-3 sm:mb-4">
          Спутниковые индексы
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-[#8BA4B8] text-center mb-4">
            <div className="flex justify-center mb-2">
              <SatelliteIcon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="text-xs sm:text-sm px-2">
              Нарисуйте поле на карте<br />для получения спутниковых данных
            </div>
          </div>
          <div className="bg-[#1A2E42] rounded-lg p-3 max-w-xs mx-2">
            <div className="text-[#8BA4B8] text-xs mb-2">Доступные источники:</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>
                <span className="break-words">Sentinel-2 - мультиспектральные данные</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                <span className="break-words">Planet Labs - высокодетальные снимки</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 flex-shrink-0"></span>
                <span className="break-words">Landsat 8-9 - температурный анализ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-[#E8F4FF] h-full flex flex-col">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold mb-3 sm:mb-4">
          Спутниковые индексы
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500 mx-auto mb-4 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="text-[#8BA4B8] text-center px-2">
            <div className="font-medium mb-1 text-sm sm:text-base">Загрузка спутниковых данных</div>
            <div className="text-xs">Координаты: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</div>
            <div className="text-xs mt-2 text-green-400 flex items-center justify-center">
              <SatelliteIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Подключаемся к спутниковым системам...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-[#E8F4FF] h-full flex flex-col">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold mb-3 sm:mb-4">
          Спутниковые индексы
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-red-400 text-center mb-4 px-2">
            <div className="flex justify-center mb-2">
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="font-medium mb-2 text-sm sm:text-base">Ошибка загрузки</div>
            <div className="text-xs sm:text-sm text-red-300">
              {error}
            </div>
          </div>
          <div className="bg-[#1A2E42] rounded-lg p-3 max-w-xs mx-2">
            <div className="text-[#8BA4B8] text-xs mb-2">Используются симулированные данные:</div>
            <div className="text-green-400 text-xs flex items-center">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
              Доступны базовые индексы NDVI, NDWI, MSI
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!satelliteData) {
    return (
      <div className="text-[#E8F4FF] h-full flex flex-col">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold mb-3 sm:mb-4">
          Спутниковые индексы
        </h3>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[#8BA4B8] text-center text-xs sm:text-sm px-2">
            Не удалось получить спутниковые данные<br />для выбранного местоположения
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-[#E8F4FF] h-full flex flex-col min-h-0">
      <div className="flex justify-between items-start mb-3 sm:mb-4 flex-col sm:flex-row gap-2 sm:gap-0">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold">
          Спутниковые индексы
        </h3>
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {satelliteData.source?.includes('Sentinel') && (
            <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
              <SatelliteIcon className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="hidden xs:inline">ESA Sentinel-2</span>
              <span className="xs:hidden">Sentinel-2</span>
            </span>
          )}
          {satelliteData.source?.includes('Planet') && (
            <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
              <SatelliteIcon className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="hidden xs:inline">Planet Labs</span>
              <span className="xs:hidden">Planet</span>
            </span>
          )}
          {satelliteData.source?.includes('Simulation') && (
            <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
              <RefreshCw className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="hidden xs:inline">Симуляция</span>
              <span className="xs:hidden">Симул.</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 sm:space-y-4">
        {satelliteData.image_url && (
          <div>
            <SatelliteImagery 
              imageUrl={satelliteData.image_url}
              coordinates={coords!}
              source={satelliteData.source}
            />
          </div>
        )}

        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
          {satelliteData.indices.map((index, i) => (
            <div key={i} className="bg-[#1A2E42] p-3 sm:p-4 rounded-lg border border-[#2D4A62]">
              <div className="flex items-center mb-2">
                <div className={`w-3 h-3 rounded-full mr-2 flex-shrink-0 ${index.color}`}></div>
                <div className="text-[#8BA4B8] text-xs truncate">{index.name}</div>
              </div>
              <div className={`text-lg sm:text-xl font-bold ${
                index.name.includes('NDVI') ? 'text-green-400' :
                index.name.includes('NDWI') ? 'text-blue-400' : 'text-yellow-400'
              }`}>
                {index.value.toFixed(3)}
              </div>
              <div className="text-xs text-[#8BA4B8] mt-1 line-clamp-1">
                {getIndexStatus(index.name, index.value)}
              </div>
              
              <div className="w-full bg-[#2D4A62] rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    index.name.includes('NDVI') ? getNDVIColor(index.value) :
                    index.name.includes('NDWI') ? getNDWIColor(index.value) :
                    getMSIColor(index.value)
                  }`}
                  style={{ width: `${Math.min(index.value * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#1A2E42] p-3 sm:p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-3">
            <div className="text-[#8BA4B8] text-sm font-medium flex items-center">
              <Sprout className="w-4 h-4 mr-2" />
              Агрономические рекомендации
            </div>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto"> {/* ← Увеличена максимальная высота */}
            {getCombinedRecommendations(satelliteData.indices).map((rec, index) => (
              <div key={index} className="text-xs sm:text-sm leading-relaxed flex items-start p-2 bg-[#2D4A62] rounded">
                <span className="text-green-400 mr-2 flex-shrink-0">•</span>
                <span className="flex-1">{rec}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-[#2D4A62] text-xs text-[#8BA4B8]">
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Обновлено: {new Date().toLocaleTimeString()}
              </span>
              <span>Следующее обновление: через 5 дней</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}