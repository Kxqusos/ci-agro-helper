import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  CropHistoryRecord,
  AnalyticsData,
  FieldRecommendation,
  FieldInfo
} from '../types';
import { useRecommendationsQuery } from './useRecommendationsQuery';
import { adaptRecommendationsToUI } from '../services/recommendationsAdapter';
import type { Season } from '../services/recommendationsApi';
import { historyApi } from '../services/historyApi';
import { mockHistoryRecords } from '../mocks/history';

const fieldInfo: FieldInfo[] = [
  { name: "Поле 1", area: 45.2, soilType: "Чернозем", lastCrop: "Пшеница" },
  { name: "Поле 2", area: 32.1, soilType: "Супесчаная", lastCrop: "Ячмень" },
  { name: "Поле 3", area: 28.7, soilType: "Суглинистая", lastCrop: "Рапс" },
  { name: "Поле 4", area: 52.3, soilType: "Чернозем", lastCrop: "Кукуруза" }
];

const generateCropsDistribution = (
  records: CropHistoryRecord[],
  fieldName?: string
) => {
  const filteredHistory = fieldName
    ? records.filter(record => record.fieldName === fieldName)
    : records;

  const totalArea = filteredHistory.reduce((sum, record) => sum + record.area, 0) || 1;

  return filteredHistory.map(record => ({
    crop: record.crop,
    area: record.area,
    percentage: Math.round((record.area / totalArea) * 100),
    year: record.year,
    fieldName: record.fieldName
  }));
};

const generateSoilHealth = (fieldName?: string) => {
  const baseSoil = [
    { parameter: "Азот (N)", value: 2.3, status: "good" as const },
    { parameter: "Фосфор (P)", value: 1.8, status: "warning" as const },
    { parameter: "Калий (K)", value: 3.1, status: "good" as const },
    { parameter: "pH", value: 6.2, status: "good" as const }
  ];

  return baseSoil.map(soil => ({
    ...soil,
    fieldName: fieldName || "Все поля"
  }));
};

const calculateRotationEfficiency = (
  records: CropHistoryRecord[],
  fieldName?: string
) => {
  const fieldHistory = fieldName
    ? records.filter(record => record.fieldName === fieldName)
    : records;

  if (fieldHistory.length === 0) return 75;

  const uniqueCrops = new Set(fieldHistory.map(record => record.crop));
  const yearsCount = new Set(fieldHistory.map(record => record.year)).size;
  
  const diversityScore = (uniqueCrops.size / fieldHistory.length) * 100;
  const timeScore = Math.min((yearsCount / fieldHistory.length) * 100, 100);
  
  return Math.round((diversityScore + timeScore) / 2);
};

const recommendations: FieldRecommendation[] = [
  {
    fieldId: "1",
    fieldName: "Поле 1",
    previousCrop: "Пшеница",
    soilCondition: "Среднее содержание азота, низкий фосфор",
    recommendedCrops: [
      {
        crop: "Горох",
        suitability: "high",
        reason: "Бобовые культуры обогащают почву азотом после зерновых",
        benefits: [
          "Повышает содержание азота в почве",
          "Улучшает структуру почвы", 
          "Хороший предшественник для зерновых"
        ]
      },
      {
        crop: "Рапс",
        suitability: "medium",
        reason: "Улучшает фитосанитарное состояние почвы",
        benefits: [
          "Борется с сорняками",
          "Улучшает структуру пахотного слоя"
        ]
      }
    ]
  },
  {
    fieldId: "2",
    fieldName: "Поле 2",
    previousCrop: "Ячмень",
    soilCondition: "Высокое содержание азота, нормальный фосфор",
    recommendedCrops: [
      {
        crop: "Кукуруза",
        suitability: "high",
        reason: "Эффективно использует накопленный азот",
        benefits: [
          "Высокая урожайность после бобовых",
          "Улучшает структуру почвы",
          "Хороший предшественник для озимых"
        ]
      },
      {
        crop: "Подсолнечник",
        suitability: "medium",
        reason: "Глубоко проникающая корневая система",
        benefits: [
          "Разрыхляет глубокие слои почвы",
          "Уменьшает количество сорняков"
        ]
      }
    ]
  }
];

export const useRotationData = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedField, setSelectedField] = useState<string>('');
  const [history, setHistory] = useState<CropHistoryRecord[]>(mockHistoryRecords);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isUsingMockHistory, setIsUsingMockHistory] = useState(true);

  // API recommendations state
  const recommendationsQuery = useRecommendationsQuery();
  const [useApiRecommendations, setUseApiRecommendations] = useState(false);

  const fieldNames = useMemo(
    () => Array.from(new Set(history.map(record => record.fieldName))),
    [history]
  );

  useEffect(() => {
    if (!selectedField && fieldNames.length > 0) {
      setSelectedField(fieldNames[0]);
    }
  }, [selectedField, fieldNames]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await historyApi.listHistory();
      if (response.records.length > 0) {
        setHistory(response.records);
        setIsUsingMockHistory(false);
      } else {
        setHistory(mockHistoryRecords);
        setIsUsingMockHistory(true);
      }
      setHistoryError(null);
    } catch (error) {
      console.error('Failed to fetch rotation history', error);
      setHistory(mockHistoryRecords);
      setIsUsingMockHistory(true);
      setHistoryError('Не удалось загрузить историю культур');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = useMemo(() =>
    history.filter(record =>
      record.year === selectedYear &&
      (!selectedField || record.fieldName === selectedField)
    ),
    [selectedYear, selectedField, history]
  );

  const analyticsData = useMemo((): AnalyticsData => ({
    cropsDistribution: generateCropsDistribution(history, selectedField),
    soilHealth: generateSoilHealth(selectedField),
    rotationEfficiency: calculateRotationEfficiency(history, selectedField),
    fieldName: selectedField
  }), [history, selectedField]);

  // Fallback to mock recommendations
  const mockRecommendations = useMemo(() =>
    selectedField
      ? recommendations.filter(rec => rec.fieldName === selectedField)
      : recommendations,
    [selectedField]
  );

  // Use API recommendations if available, otherwise use mocks
  const currentRecommendations = useMemo(() => {
    if (useApiRecommendations && recommendationsQuery.state.data) {
      return adaptRecommendationsToUI(
        recommendationsQuery.state.data,
        selectedField || 'Неизвестное поле'
      );
    }
    return mockRecommendations;
  }, [useApiRecommendations, recommendationsQuery.state.data, selectedField, mockRecommendations]);

  /**
   * Fetch recommendations from API for current field
   *
   * @param targetSeason - Season for recommendations
   * @param targetYear - Year for recommendations
   * @param fieldId - Optional field ID (defaults to selectedField)
   */
  const fetchRecommendations = async (
    targetSeason: Season,
    targetYear: number,
    fieldId?: string
  ) => {
    const currentFieldId = fieldId || selectedField || 'field-1';
    const fieldHistory = history.filter(
      (record) => record.fieldName === selectedField
    );

    try {
      await recommendationsQuery.fetchRecommendations({
        fieldId: currentFieldId,
        targetSeason,
        targetYear,
        cropHistory: fieldHistory,
        limit: 5,
      });

      // Switch to API recommendations after successful fetch
      setUseApiRecommendations(true);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      // Keep using mock recommendations on error
      setUseApiRecommendations(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return {
    selectedYear,
    setSelectedYear,
    selectedField,
    setSelectedField,
    years,
    fieldNames,
    fieldInfo,
    filteredHistory,
    analyticsData,
    recommendations: currentRecommendations,
    cropHistory: history,
    // API recommendations functionality
    fetchRecommendations,
    recommendationsQuery,
    useApiRecommendations,
    setUseApiRecommendations,
    historyLoading,
    historyError,
    refreshHistory: loadHistory,
    isUsingMockHistory,
  };
};
