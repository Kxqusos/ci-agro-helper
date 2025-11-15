import { useWeatherData } from '../hooks/useWeatherData';
import { 
  Cloud, 
  Thermometer, 
  Droplets, 
  Wind, 
  MapPin,
  Satellite,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Leaf,
  Sprout
} from 'lucide-react';

interface WeatherTabProps {
  fieldId: number;
  coordinates?: { lat: number; lng: number };
}

export default function WeatherTab({ fieldId, coordinates }: WeatherTabProps) {
  const { weatherData, loading, error } = useWeatherData({ 
    fieldId, 
    coordinates 
  });

  if (!coordinates) {
    return (
      <div className="text-[#E8F4FF] h-full flex flex-col">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold mb-3 sm:mb-4">
          Погодные условия
        </h3>
<div className="flex-1 flex flex-col items-center justify-center">
  <div className="text-[#8BA4B8] text-center mb-4">
    <div className="flex justify-center mb-2">
      <Cloud className="w-12 h-12" />
    </div>
    <div className="text-xs sm:text-sm">
              Нарисуйте поле на карте<br />для получения погодных данных
            </div>
          </div>
          <div className="bg-[#1A2E42] rounded-lg p-3 max-w-xs">
            <div className="text-[#8BA4B8] text-xs mb-2">Доступные данные:</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                <span>Температура воздуха и почвы</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2"></span>
                <span>Осадки и влажность</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                <span>Скорость и направление ветра</span>
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
          Погодные условия
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4 flex items-center justify-center">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div className="text-[#8BA4B8] text-center">
            <div className="font-medium mb-1">Загрузка погодных данных</div>
            <div className="text-xs">Координаты: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}</div>
            <div className="text-xs mt-2 text-blue-400 flex items-center justify-center">
              <Satellite className="w-4 h-4 mr-1" />
              Получаем данные с метеостанций...
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
          Погодные условия
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-red-400 text-center mb-4">
            <div className="flex justify-center mb-2">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <div className="font-medium mb-2">Ошибка загрузки</div>
            <div className="text-xs sm:text-sm text-red-300">
              {error}
            </div>
          </div>
          <div className="bg-[#1A2E42] rounded-lg p-3 max-w-xs">
            <div className="text-[#8BA4B8] text-xs mb-2">Используются симулированные данные:</div>
            <div className="text-blue-400 text-xs flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Доступны базовые погодные параметры
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className="text-[#E8F4FF] h-full flex flex-col">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold mb-3 sm:mb-4">
          Погодные условия
        </h3>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[#8BA4B8] text-center text-xs sm:text-sm">
            Не удалось получить погодные данные<br />для выбранного местоположения
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-[#E8F4FF] h-full flex flex-col">
      <div className="flex justify-between items-start mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold">
          Погодные условия
        </h3>
        <div className="flex items-center space-x-2">
          {weatherData.source?.includes('OpenWeather') && (
            <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
              <Cloud className="w-3 h-3 mr-1" />
              OpenWeather
            </span>
          )}
          {weatherData.source?.includes('NOAA') && (
            <span className="bg-cyan-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
              <Satellite className="w-3 h-3 mr-1" />
              NOAA
            </span>
          )}
          {weatherData.source?.includes('Simulation') && (
            <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center">
              <RefreshCw className="w-3 h-3 mr-1" />
              Симуляция
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="bg-[#1A2E42] p-3 sm:p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-2">
            <Thermometer className="w-5 h-5 mr-2" />
            <div className="text-[#8BA4B8] text-xs">Температура</div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-blue-400">
            {weatherData.temperature}
          </div>
          <div className="text-xs text-[#8BA4B8] mt-1">
            {getTemperatureStatus(parseFloat(weatherData.temperature))}
          </div>
        </div>
        
        <div className="bg-[#1A2E42] p-3 sm:p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-2">
            <Droplets className="w-5 h-5 mr-2" />
            <div className="text-[#8BA4B8] text-xs">Осадки</div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-cyan-400">
            {weatherData.precipitation}
          </div>
          <div className="text-xs text-[#8BA4B8] mt-1">
            {getPrecipitationStatus(parseFloat(weatherData.precipitation))}
          </div>
        </div>
        
        <div className="bg-[#1A2E42] p-3 sm:p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-2">
            <Droplets className="w-5 h-5 mr-2" />
            <div className="text-[#8BA4B8] text-xs">Влажность</div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-green-400">
            {weatherData.humidity}
          </div>
          <div className="text-xs text-[#8BA4B8] mt-1">
            {getHumidityStatus(parseFloat(weatherData.humidity))}
          </div>
        </div>
        
        <div className="bg-[#1A2E42] p-3 sm:p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-2">
            <Wind className="w-5 h-5 mr-2" />
            <div className="text-[#8BA4B8] text-xs">Ветер</div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-gray-300">
            {weatherData.wind}
          </div>
          <div className="text-xs text-[#8BA4B8] mt-1">
            {getWindStatus(parseFloat(weatherData.wind))}
          </div>
        </div>
      </div>

      <div className="bg-[#1A2E42] p-3 sm:p-4 rounded-lg border border-[#2D4A62] flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[#8BA4B8] text-sm font-medium flex items-center">
            <Leaf className="w-4 h-4 mr-2" />
            Агрометеорологические рекомендации
          </div>
          {weatherData.weather_condition && (
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              weatherData.weather_condition === 'favorable' ? 'bg-green-500' :
              weatherData.weather_condition === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'
            } text-white`}>
              {getWeatherConditionLabel(weatherData.weather_condition)}
            </div>
          )}
        </div>
        
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {weatherData.recommendations.map((rec, index) => (
            <div key={index} className="text-xs sm:text-sm leading-relaxed flex items-start p-2 bg-[#2D4A62] rounded">
              <span className="text-blue-400 mr-2 flex-shrink-0">•</span>
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
            <span>Следующее обновление: через 1 час</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTemperatureStatus(temp: number): string {
  if (temp > 30) return 'Жарко';
  if (temp > 20) return 'Тепло';
  if (temp > 10) return 'Прохладно';
  if (temp > 0) return 'Холодно';
  return 'Мороз';
}

function getPrecipitationStatus(precip: number): string {
  if (precip === 0) return 'Без осадков';
  if (precip < 2.5) return 'Небольшие осадки';
  if (precip < 7.6) return 'Умеренные осадки';
  return 'Сильные осадки';
}

function getHumidityStatus(humidity: number): string {
  if (humidity < 30) return 'Сухо';
  if (humidity < 60) return 'Комфортно';
  if (humidity < 80) return 'Влажно';
  return 'Очень влажно';
}

function getWindStatus(wind: number): string {
  if (wind < 0.5) return 'Штиль';
  if (wind < 3.3) return 'Легкий ветер';
  if (wind < 5.5) return 'Умеренный ветер';
  if (wind < 8) return 'Свежий ветер';
  return 'Сильный ветер';
}

function getWeatherConditionLabel(condition: string): string {
  const labels: { [key: string]: string } = {
    'favorable': 'Благоприятно',
    'moderate': 'Умеренно',
    'unfavorable': 'Неблагоприятно'
  };
  return labels[condition] || condition;
}