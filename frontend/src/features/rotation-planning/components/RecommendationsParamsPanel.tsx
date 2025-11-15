'use client';

import { Settings, Info } from 'lucide-react';
import type { ExtendedQueryConstraints } from '../services/fieldSelectorTypes';

interface RecommendationsParamsPanelProps {
  constraints: ExtendedQueryConstraints;
  onChange: (constraints: ExtendedQueryConstraints) => void;
  disabled?: boolean;
}

/**
 * Panel for controlling recommendation query parameters
 *
 * Allows users to configure:
 * - Result limit (3/5/10/20)
 * - Climate filter bypass
 * - Botanical family exclusions
 * - Organic matter requirements
 * - Cover crops preference
 */
export const RecommendationsParamsPanel = ({
  constraints,
  onChange,
  disabled = false,
}: RecommendationsParamsPanelProps) => {
  const handleLimitChange = (limit: 3 | 5 | 10 | 20) => {
    onChange({ ...constraints, limit });
  };

  const handleIgnoreClimateChange = (ignore: boolean) => {
    onChange({ ...constraints, ignore_climate_filter: ignore });
  };

  const handleOrganicMatterChange = (value: string) => {
    const organicMatter = value === 'none' ? undefined : (value as 'низкая' | 'средняя' | 'высокая');
    onChange({ ...constraints, require_organic_matter: organicMatter });
  };

  const handleCoverCropsChange = (prefer: boolean) => {
    onChange({ ...constraints, prefer_cover_crops: prefer });
  };

  return (
    <div className="bg-[#1A2E42] rounded-lg p-4 border border-[#2D4A62] space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={18} className="text-[#3388ff]" />
        <h3 className="text-base font-semibold text-[#E8F4FF]">Параметры рекомендаций</h3>
      </div>

      {/* Limit selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#E8F4FF]">
          Количество рекомендаций
        </label>
        <div className="flex gap-2">
          {[3, 5, 10, 20].map((limit) => (
            <button
              key={limit}
              onClick={() => handleLimitChange(limit as 3 | 5 | 10 | 20)}
              disabled={disabled}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                constraints.limit === limit
                  ? 'bg-[#3388ff] text-white'
                  : 'bg-[#0F1F2F] text-[#8BA4B8] hover:bg-[#2D4A62]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {limit}
            </button>
          ))}
        </div>
      </div>

      {/* Climate filter toggle */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="ignore-climate"
          checked={constraints.ignore_climate_filter || false}
          onChange={(e) => handleIgnoreClimateChange(e.target.checked)}
          disabled={disabled}
          className="mt-1"
        />
        <label htmlFor="ignore-climate" className="flex-1 cursor-pointer">
          <div className="text-sm font-medium text-[#E8F4FF]">
            Игнорировать климатический фильтр
          </div>
          <div className="text-xs text-[#8BA4B8] mt-1">
            Отключает фильтрацию по климатическим условиям и агроклиматической зоне
          </div>
        </label>
      </div>

      {/* Organic matter requirement */}
      <div className="space-y-2">
        <label htmlFor="organic-matter" className="block text-sm font-medium text-[#E8F4FF]">
          Требование к органике почвы
        </label>
        <select
          id="organic-matter"
          value={constraints.require_organic_matter || 'none'}
          onChange={(e) => handleOrganicMatterChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] text-sm"
        >
          <option value="none">Без требований</option>
          <option value="низкая">Низкая</option>
          <option value="средняя">Средняя</option>
          <option value="высокая">Высокая</option>
        </select>
      </div>

      {/* Cover crops preference */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="prefer-cover-crops"
          checked={constraints.prefer_cover_crops || false}
          onChange={(e) => handleCoverCropsChange(e.target.checked)}
          disabled={disabled}
          className="mt-1"
        />
        <label htmlFor="prefer-cover-crops" className="flex-1 cursor-pointer">
          <div className="text-sm font-medium text-[#E8F4FF]">
            Предпочитать культуры-сидераты
          </div>
          <div className="text-xs text-[#8BA4B8] mt-1">
            Повышает приоритет бобовых и других культур-улучшителей почвы
          </div>
        </label>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-400">
          Изменение параметров потребует повторного запроса рекомендаций
        </p>
      </div>
    </div>
  );
};
