import { apiClient } from '@/lib/apiClient';
import type { ClimateProfile } from '@/features/rotation-planning/services/recommendationsApi';
import { WeatherApiResponse, WeatherData } from '../types';

export class WeatherApiService {
  /**
   * Retrieve weather data from the BFF route
   */
  async getWeatherByCoords(lat: number, lng: number): Promise<WeatherApiResponse> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
    });

    return apiClient.get<WeatherApiResponse>(`/weather?${params.toString()}`, {
      skipAuth: true,
    });
  }

  transformWeatherData(apiData: WeatherApiResponse): WeatherData {
    const recommendations = this.generateRecommendations(apiData);

    return {
      temperature: `${Math.round(apiData.current.temp_c)}°C`,
      precipitation: `${apiData.current.precip_mm} мм`,
      humidity: `${apiData.current.humidity}%`,
      wind: `${(apiData.current.wind_kph / 3.6).toFixed(1)} м/с`,
      recommendations
    };
  }

  /**
   * Convert weather API response to ClimateProfile used by recommendations
   */
  toClimateProfile(apiData: WeatherApiResponse): ClimateProfile {
    const avgTemperature = apiData.forecast?.forecastday?.reduce(
      (sum, day) => sum + day.day.avgtemp_c,
      0
    );
    const forecastDays = apiData.forecast?.forecastday?.length ?? 0;
    const dailyPrecip = apiData.forecast?.forecastday?.reduce(
      (sum, day) => sum + day.day.totalprecip_mm,
      0
    );
    const annualPrecip = dailyPrecip && forecastDays > 0
      ? Math.round((dailyPrecip / forecastDays) * 365)
      : undefined;

    return {
      agro_zone: this.deriveAgroZone(apiData),
      frost_risk: this.estimateFrostRisk(apiData),
      drought_risk: this.estimateDroughtRisk(apiData),
      avg_temperature_c: avgTemperature && forecastDays > 0
        ? Number((avgTemperature / forecastDays).toFixed(1))
        : apiData.current?.temp_c,
      annual_precipitation_mm: annualPrecip,
    };
  }

  /**
   * Provide mock weather payload when backend is unavailable
   */
  getMockWeatherData(): WeatherApiResponse {
    return {
      location: {
        name: 'Москва',
        region: 'Московская область',
        country: 'Россия',
        lat: 55.7558,
        lon: 37.6173,
        localtime: new Date().toISOString(),
      },
      current: {
        temp_c: 14.2,
        temp_f: 57.6,
        condition: {
          text: 'Пасмурно',
          icon: '//cdn.weatherapi.com/weather/64x64/day/296.png',
          code: 1006,
        },
        wind_kph: 15,
        wind_degree: 180,
        wind_dir: 'S',
        pressure_mb: 1008,
        precip_mm: 0.2,
        humidity: 82,
        cloud: 75,
        feelslike_c: 13.5,
        vis_km: 8,
        uv: 4,
        gust_kph: 20,
      },
      forecast: {
        forecastday: [
          {
            date: new Date().toISOString().split('T')[0],
            day: {
              maxtemp_c: 17,
              mintemp_c: 9,
              avgtemp_c: 13,
              maxwind_kph: 18,
              totalprecip_mm: 1.5,
              avgvis_km: 9,
              avghumidity: 75,
              daily_will_it_rain: 60,
              daily_chance_of_rain: 60,
              daily_will_it_snow: 0,
              daily_chance_of_snow: 0,
              condition: {
                text: 'Переменная облачность',
                icon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
                code: 1003,
              },
              uv: 4,
            },
          },
        ],
      },
    };
  }

  private generateRecommendations(apiData: WeatherApiResponse): string[] {
    const rec: string[] = [];
    const t = apiData.current.temp_c;
    const h = apiData.current.humidity;
    const p = apiData.current.precip_mm;
    const w = apiData.current.wind_kph / 3.6;
    const condition = apiData.current.condition.text.toLowerCase();

    // 1. Общая оценка условий
    rec.push(`Текущие условия: ${condition}, ${t}°C`);

    // 2. Температура
    if (t < 0) rec.push("Заморозки! Защитите всходы укрывным материалом");
    else if (t < 5) rec.push("Холодно для посева. Дождитесь прогрева почвы до +5°C");
    else if (t < 10) rec.push("Можно сеять холодостойкие культуры: пшеница, ячмень, овес");
    else if (t < 15) rec.push("Оптимально для посева зерновых и ранних овощей");
    else if (t < 25) rec.push("Идеальные условия для роста большинства культур");
    else if (t < 30) rec.push("Жарко. Увеличьте полив, особенно для овощных культур");
    else rec.push("Экстремальная жара! Защитите растения от солнечных ожогов");

    // 3. Влажность
    if (h < 30) rec.push("Очень сухо! Срочный полив необходим, высок риск засухи");
    else if (h < 50) rec.push("Пониженная влажность. Увеличьте частоту полива");
    else if (h < 70) rec.push("Влажность оптимальна для фотосинтеза и роста");
    else if (h < 85) rec.push("Повышенная влажность. Контролируйте развитие грибковых заболеваний");
    else rec.push("Высокая влажность! Риск гнилей - обеспечьте вентиляцию");

    // 4. Осадки
    if (p === 0) {
      if (t > 20) rec.push("Без осадков + жара. Организуйте регулярный полив");
      else rec.push("Отсутствие дождей. Планируйте полив в ближайшие дни");
    } else if (p <= 2) rec.push("Легкие осадки. Дополнительный полив может не потребоваться");
    else if (p <= 5) rec.push("Умеренные осадки. Хорошо для укоренения и роста");
    else if (p <= 15) rec.push("Сильные осадки. Проверьте дренаж, возможен застой воды");
    else rec.push("Обильные осадки! Контролируйте эрозию почвы и подтопления");

    // 5. Ветер
    if (w < 3) rec.push("Штиль. Благоприятно для опрыскивания и внекорневых подкормок");
    else if (w < 6) rec.push("Легкий ветер. Условия хороши для опыления растений");
    else if (w < 10) rec.push("Умеренный ветер. Будьте осторожны с обработками - возможен снос");
    else if (w < 15) rec.push("Сильный ветер. Риск полегания посевов, отложите обработки");
    else rec.push("Опасный ветер! Защитите молодые растения, отложите полевые работы");

    // 6. Прогнозные рекомендации на завтра
    if (apiData.forecast?.forecastday?.length) {
      const tomorrow = apiData.forecast.forecastday[0];
      if (tomorrow) {
        const rainChance = tomorrow.day.daily_chance_of_rain;
        const maxT = tomorrow.day.maxtemp_c;
        const minT = tomorrow.day.mintemp_c;

        if (rainChance > 70) rec.push(`Завтра сильные осадки (${rainChance}%). Отложите обработки`);
        else if (rainChance > 40) rec.push(`Завтра возможен дождь (${rainChance}%). Планируйте работы с учетом этого`);

        if (minT < 2) rec.push("Завтра ожидаются заморозки! Защитите теплолюбивые культуры");
        if (maxT > 30) rec.push("Завтра жара! Увеличьте полив, особенно для овощей");
      }
    }

    // 7. Специфические агрономические рекомендации
    if (t >= 8 && t <= 25 && h >= 40 && h <= 70 && p <= 5) rec.push("Идеальное окно для посевных работ и подкормок");
    if (w < 5 && p === 0) rec.push("Благоприятные условия для внесения СЗР и удобрений");

    // Ограничим до 5 самых важных рекомендаций
    return this.prioritizeRecommendations(rec).slice(0, 5);
  }

  private prioritizeRecommendations(recommendations: string[]): string[] {
    const priorityMap: { [key: string]: number } = {
      'заморозки': 1,
      'опасный ветер': 1,
      'обильные осадки': 1,
      'экстремальная жара': 1,
      'очень сухо': 2,
      'сильные осадки': 2,
      'высокая влажность': 2,
      'идеальное окно': 3,
      'благоприятные условия': 3,
      'оптимально': 4,
      'можно сеять': 4
    };

    return recommendations.sort((a, b) => {
      const aPriority = this.getPriority(a, priorityMap);
      const bPriority = this.getPriority(b, priorityMap);
      return aPriority - bPriority;
    });
  }

  private getPriority(recommendation: string, priorityMap: { [key: string]: number }): number {
    const lowerRecommendation = recommendation.toLowerCase();
    for (const [key, priority] of Object.entries(priorityMap)) {
      if (lowerRecommendation.includes(key)) return priority;
    }
    return 5;
  }

  private deriveAgroZone(apiData: WeatherApiResponse): string | undefined {
    if (!apiData.location?.country) return undefined;
    return [apiData.location.country, apiData.location.region]
      .filter(Boolean)
      .join(' / ');
  }

  private estimateFrostRisk(apiData: WeatherApiResponse): ClimateProfile['frost_risk'] {
    const minTemp = apiData.forecast?.forecastday?.reduce(
      (min, day) => Math.min(min, day.day.mintemp_c),
      apiData.current?.temp_c ?? 0
    );

    if (minTemp === undefined) return undefined;
    if (minTemp <= -10) return 'high';
    if (minTemp <= 0) return 'medium';
    return 'low';
  }

  private estimateDroughtRisk(apiData: WeatherApiResponse): ClimateProfile['drought_risk'] {
    const avgHumidity = apiData.current?.humidity ?? 0;
    const todayPrecip = apiData.current?.precip_mm ?? 0;
    const forecastPrecip = apiData.forecast?.forecastday?.reduce(
      (sum, day) => sum + day.day.totalprecip_mm,
      0
    ) ?? 0;

    const totalPrecip = todayPrecip + forecastPrecip;

    if (totalPrecip < 2 && avgHumidity < 40) return 'high';
    if (totalPrecip < 5 && avgHumidity < 60) return 'medium';
    return 'low';
  }
}

export const weatherApiService = new WeatherApiService();
