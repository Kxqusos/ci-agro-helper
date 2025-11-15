'use client';

import { AlertTriangle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface RecommendationsErrorStateProps {
  error: string;
  errorStatus?: number;
  filtersApplied?: string[];
  onRelaxFilters?: () => void;
  onSyncHistory?: () => void;
}

/**
 * Error state component for recommendations
 *
 * Handles different error scenarios:
 * - 403: Field forbidden/unavailable
 * - 404: History not found
 * - 404 with no results: Filters too restrictive
 * - Other errors: Generic error display
 */
export const RecommendationsErrorState = ({
  error,
  errorStatus,
  filtersApplied = [],
  onRelaxFilters,
  onSyncHistory,
}: RecommendationsErrorStateProps) => {
  // 403: Field unavailable
  if (errorStatus === 403) {
    return (
      <div className="bg-[#1A2E42] rounded-lg p-8 border border-red-500/30 text-center">
        <XCircle className="mx-auto mb-4 text-red-400" size={48} />
        <h3 className="text-xl font-semibold text-[#E8F4FF] mb-2">Поле недоступно</h3>
        <p className="text-[#8BA4B8] mb-4">
          У вас нет доступа к этому полю или оно было удалено
        </p>
        <p className="text-sm text-[#8BA4B8]">
          Пожалуйста, выберите другое поле для получения рекомендаций
        </p>
      </div>
    );
  }

  // 404: History not found
  if (errorStatus === 404 && error.includes('История')) {
    return (
      <div className="bg-[#1A2E42] rounded-lg p-8 border border-yellow-500/30 text-center">
        <AlertTriangle className="mx-auto mb-4 text-yellow-400" size={48} />
        <h3 className="text-xl font-semibold text-[#E8F4FF] mb-2">История поля отсутствует</h3>
        <p className="text-[#8BA4B8] mb-6">
          Для расчета рекомендаций необходима информация о предшествующих культурах
        </p>
        {onSyncHistory && (
          <button
            onClick={onSyncHistory}
            className="inline-flex items-center px-6 py-3 bg-[#3388ff] text-white rounded-lg hover:bg-[#2970cc] transition-colors"
          >
            <ExternalLink size={18} className="mr-2" />
            Синхронизировать историю
          </button>
        )}
      </div>
    );
  }

  // 404: No crops found with current filters
  if (errorStatus === 404 && error.includes('подобрать культуры')) {
    const climateFilters = filtersApplied.filter(
      (f) => f.includes('agro_zone') || f.includes('frost_risk') || f.includes('drought_risk')
    );

    return (
      <div className="bg-[#1A2E42] rounded-lg p-8 border border-yellow-500/30">
        <div className="text-center mb-6">
          <AlertTriangle className="mx-auto mb-4 text-yellow-400" size={48} />
          <h3 className="text-xl font-semibold text-[#E8F4FF] mb-2">
            Не удалось подобрать культуры
          </h3>
          <p className="text-[#8BA4B8]">
            С текущими фильтрами не найдено подходящих культур для посадки
          </p>
        </div>

        {/* Applied filters */}
        {filtersApplied.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[#E8F4FF] mb-3">Применённые фильтры</h4>
            <div className="flex flex-wrap gap-2">
              {filtersApplied.map((filter, idx) => {
                const isClimate = climateFilters.includes(filter);
                return (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-xs ${
                      isClimate
                        ? 'bg-blue-900/30 text-blue-400 border border-blue-500/50'
                        : 'bg-[#2D4A62] text-[#8BA4B8]'
                    }`}
                  >
                    {filter}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRelaxFilters && (
            <button
              onClick={onRelaxFilters}
              className="inline-flex items-center justify-center px-6 py-3 bg-[#3388ff] text-white rounded-lg hover:bg-[#2970cc] transition-colors"
            >
              <RefreshCw size={18} className="mr-2" />
              Ослабить фильтры
            </button>
          )}
        </div>

        {climateFilters.length > 0 && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400">
              💡 Попробуйте отключить климатические фильтры в параметрах рекомендаций
            </p>
          </div>
        )}
      </div>
    );
  }

  // Generic error
  return (
    <div className="bg-[#1A2E42] rounded-lg p-8 border border-red-500/30 text-center">
      <XCircle className="mx-auto mb-4 text-red-400" size={48} />
      <h3 className="text-xl font-semibold text-[#E8F4FF] mb-2">Ошибка при получении рекомендаций</h3>
      <p className="text-[#8BA4B8] mb-4">{error}</p>
      <p className="text-sm text-[#8BA4B8]">
        {errorStatus && `Код ошибки: ${errorStatus}`}
      </p>
    </div>
  );
};
