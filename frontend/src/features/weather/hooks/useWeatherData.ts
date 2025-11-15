// hooks/useWeatherData.ts
import { useState, useEffect } from 'react';
import { WeatherData } from '../types';
import { weatherApiService } from '../services/weatherApi';

interface UseWeatherDataProps {
  fieldId: number;
  coordinates?: { lat: number; lng: number };
}

export const useWeatherData = ({ fieldId, coordinates }: UseWeatherDataProps) => {
  const [weatherData, setWeatherData] = useState<WeatherData>({
    temperature: "—",
    precipitation: "—",
    humidity: "—",
    wind: "—",
    recommendations: ["Выберите поле для получения данных о погоде"]
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!coordinates) {
        setWeatherData({
          temperature: "—",
          precipitation: "—",
          humidity: "—",
          wind: "—",
          recommendations: ["Выберите поле для получения данных о погоде"]
        });
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const data = await weatherApiService.getWeatherByCoords(
          coordinates.lat, 
          coordinates.lng
        );
        
        setWeatherData(weatherApiService.transformWeatherData(data));
        setLastUpdate(new Date());
        
      } catch (err) {
        console.error('Failed to fetch weather data:', err);
        setError('Не удалось загрузить актуальные данные погоды');
        const fallbackData = weatherApiService.getMockWeatherData();
        setWeatherData(weatherApiService.transformWeatherData(fallbackData));
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [fieldId, coordinates]);

  const refetch = async () => {
    if (coordinates) {
      const data = await weatherApiService.getWeatherByCoords(coordinates.lat, coordinates.lng);
      setWeatherData(weatherApiService.transformWeatherData(data));
      setLastUpdate(new Date());
    }
  };

  return { 
    weatherData, 
    loading, 
    error,
    lastUpdate,
    refetch
  };
};