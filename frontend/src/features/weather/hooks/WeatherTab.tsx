// WeatherTab.tsx
import { useWeatherData } from '../hooks/useWeatherData';

interface WeatherTabProps {
  fieldId: number;
  coordinates?: { lat: number; lng: number };
}

export default function WeatherTab({ fieldId, coordinates }: WeatherTabProps) {
  const { weatherData, loading, error, lastUpdate, refetch } = useWeatherData({ 
    fieldId, 
    coordinates 
  });

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="text-[#E8F4FF] h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold">
          Погодные условия
        </h3>
        {coordinates && (
          <button
            onClick={refetch}
            disabled={loading}
            className="text-xs bg-[#2D4A67] hover:bg-[#3A5A7A] px-2 py-1 rounded disabled:opacity-50"
          >
            {loading ? '...' : '↻'}
          </button>
        )}
      </div>

      {error && (
        <div className="text-yellow-500 text-xs mb-2 p-2 bg-yellow-500/10 rounded">
          ⚠ {error}
        </div>
      )}

      {lastUpdate && (
        <div className="text-[#8BA4B8] text-xs mb-2">
          Обновлено: {formatTime(lastUpdate)}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-[#8BA4B8]">Загрузка погодных данных...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
            <div className="bg-[#1A2E42] p-2 sm:p-3 rounded-lg">
              <div className="text-[#8BA4B8] text-xs sm:text-sm md:text-base">Температура</div>
              <div className="text-sm sm:text-base md:text-lg lg:text-base xl:text-xl 3xl:text-2xl">
                {weatherData.temperature}
              </div>
            </div>
            <div className="bg-[#1A2E42] p-2 sm:p-3 rounded-lg">
              <div className="text-[#8BA4B8] text-xs sm:text-sm md:text-base">Осадки</div>
              <div className="text-sm sm:text-base md:text-lg lg:text-base xl:text-xl 3xl:text-2xl">
                {weatherData.precipitation}
              </div>
            </div>
            <div className="bg-[#1A2E42] p-2 sm:p-3 rounded-lg">
              <div className="text-[#8BA4B8] text-xs sm:text-sm md:text-base">Влажность</div>
              <div className="text-sm sm:text-base md:text-lg lg:text-base xl:text-xl 3xl:text-2xl">
                {weatherData.humidity}
              </div>
            </div>
            <div className="bg-[#1A2E42] p-2 sm:p-3 rounded-lg">
              <div className="text-[#8BA4B8] text-xs sm:text-sm md:text-base">Ветер</div>
              <div className="text-sm sm:text-base md:text-lg lg:text-base xl:text-xl 3xl:text-2xl">
                {weatherData.wind}
              </div>
            </div>
          </div>
          
          <div className="bg-[#1A2E42] p-2 sm:p-3 rounded-lg flex-1 min-h-0">
            <div className="text-[#8BA4B8] text-xs sm:text-sm md:text-base mb-1 sm:mb-2">
              Агрономические рекомендации
            </div>
            <div className="text-green-400 text-xs sm:text-sm md:text-base h-[90%] overflow-y-auto">
              <div className="space-y-2">
                {weatherData.recommendations.map((rec, index) => (
                  <div key={index} className="leading-tight flex items-start">
                    <span className="mr-2">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}