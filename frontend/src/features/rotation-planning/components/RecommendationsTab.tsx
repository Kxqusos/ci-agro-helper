'use client';

import { useState } from 'react';
import { Lightbulb, CheckCircle, AlertTriangle, XCircle, ArrowRight, Filter, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import type { RecommendationQueryResponse, RecommendationItem, RecommendationReason, DataSources } from '../services/recommendationsApi';
import type { ExtendedQueryConstraints } from '../services/fieldSelectorTypes';
import { RecommendationsParamsPanel } from './RecommendationsParamsPanel';
import { RecommendationsErrorState } from './RecommendationsErrorState';
import { DataSourceBadge } from './DataSourceBadge';
import { useRecommendationsJobs } from '../store/recommendationsJobs';

interface RecommendationsTabProps {
  response: RecommendationQueryResponse | null;
  error?: string | null;
  errorStatus?: number;
  dataSources?: DataSources | null;
  constraints?: ExtendedQueryConstraints;
  onConstraintsChange?: (constraints: ExtendedQueryConstraints) => void;
  onRelaxFilters?: () => void;
  onSyncHistory?: () => void;
  onViewRule?: (cropId: number, ruleId: string) => void;
  showParamsPanel?: boolean;
}

export const RecommendationsTab = ({
  response,
  error,
  errorStatus,
  dataSources,
  constraints,
  onConstraintsChange,
  onRelaxFilters,
  onSyncHistory,
  onViewRule,
  showParamsPanel = false,
}: RecommendationsTabProps) => {
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high'>('all');
  const pendingCount = useRecommendationsJobs((state) => state.getPendingCount());
  const kafkaAvailable = useRecommendationsJobs((state) => state.kafkaAvailable);

  // Show error state if error exists
  if (error) {
    return (
      <div className="space-y-6 w-full">
        {/* Show params panel if enabled */}
        {showParamsPanel && constraints && onConstraintsChange && (
          <RecommendationsParamsPanel
            constraints={constraints}
            onChange={onConstraintsChange}
            disabled={false}
          />
        )}

        <RecommendationsErrorState
          error={error}
          errorStatus={errorStatus}
          filtersApplied={response?.filters_applied}
          onRelaxFilters={onRelaxFilters}
          onSyncHistory={onSyncHistory}
        />
      </div>
    );
  }

  // Show empty state if no response
  if (!response) {
    return (
      <div className="space-y-6 w-full">
        {/* Show params panel if enabled */}
        {showParamsPanel && constraints && onConstraintsChange && (
          <RecommendationsParamsPanel
            constraints={constraints}
            onChange={onConstraintsChange}
            disabled={false}
          />
        )}

        <div className="bg-[#1A2E42] rounded-lg p-8 border border-[#2D4A62] text-center">
          <Lightbulb className="mx-auto mb-4 text-[#8BA4B8]" size={48} />
          <p className="text-[#8BA4B8] text-lg">Нет доступных рекомендаций</p>
          <p className="text-[#8BA4B8] text-sm mt-2">
            Выберите поле и запросите рекомендации для получения агрономических советов
          </p>
        </div>
      </div>
    );
  }

  // Filter recommendations by priority
  const filteredRecommendations = response.recommendations.filter((rec) =>
    priorityFilter === 'all' ? true : rec.priority === 'high'
  );

  // Get priority color
  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'low':
        return 'text-red-400 bg-red-900/20 border-red-500/30';
    }
  };

  // Get impact icon
  const getImpactIcon = (impact: 'positive' | 'negative' | 'warning') => {
    switch (impact) {
      case 'positive':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'negative':
        return <XCircle className="text-red-400" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-400" size={16} />;
    }
  };

  // Get impact color
  const getImpactColor = (impact: 'positive' | 'negative' | 'warning') => {
    switch (impact) {
      case 'positive':
        return 'bg-green-900/20 border-green-500/30';
      case 'negative':
        return 'bg-red-900/20 border-red-500/30';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-500/30';
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Params panel */}
      {showParamsPanel && constraints && onConstraintsChange && (
        <RecommendationsParamsPanel
          constraints={constraints}
          onChange={onConstraintsChange}
          disabled={false}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#E8F4FF] flex items-center">
            <Lightbulb className="mr-2 text-yellow-400" size={24} />
            Рекомендации по севообороту
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2 py-1 bg-[#3388ff]/20 text-[#3388ff] rounded text-xs border border-[#3388ff]/30 flex items-center">
              <Sparkles size={12} className="mr-1" />
              Rule Engine
            </span>
            {response && (
              <>
                <span className="px-2 py-1 bg-[#2D4A62] text-[#8BA4B8] rounded text-xs">
                  v{response.data_version}
                </span>
                <span className="text-xs text-[#8BA4B8]">
                  {new Date(response.generated_at).toLocaleString('ru-RU')}
                </span>
              </>
            )}
            {/* Active jobs indicator */}
            {pendingCount > 0 && (
              <span className="px-2 py-1 bg-yellow-900/20 text-yellow-400 rounded text-xs border border-yellow-500/30 flex items-center animate-pulse">
                <Loader2 size={12} className="mr-1 animate-spin" />
                {pendingCount} {pendingCount === 1 ? 'задача' : 'задачи'}
              </span>
            )}
            {/* Kafka status indicator */}
            {!kafkaAvailable && (
              <span className="px-2 py-1 bg-red-900/20 text-red-400 rounded text-xs border border-red-500/30 flex items-center">
                <AlertTriangle size={12} className="mr-1" />
                Очередь недоступна
              </span>
            )}
          </div>
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[#8BA4B8]" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'high')}
            className="px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] text-sm"
          >
            <option value="all">Все приоритеты</option>
            <option value="high">Только высокий приоритет</option>
          </select>
        </div>
      </div>

      {/* Data sources badges */}
      {dataSources && (
        <div className="bg-[#1A2E42] rounded-lg p-4 border border-[#2D4A62]">
          <h3 className="text-sm font-medium text-[#E8F4FF] mb-3">Источники данных</h3>
          <DataSourceBadge dataSources={dataSources} filtersApplied={response.filters_applied} />
        </div>
      )}

      {/* Active filters */}
      {response.filters_applied && response.filters_applied.length > 0 && (
        <div className="bg-[#1A2E42] rounded-lg p-4 border border-[#2D4A62]">
          <h3 className="text-sm font-medium text-[#E8F4FF] mb-3">Примененные фильтры</h3>
          <div className="flex flex-wrap gap-2">
            {response.filters_applied.map((filter, idx) => {
              // Check if it's a climate filter
              const isClimateFilter = filter.includes('agro_zone') || filter.includes('frost_risk') || filter.includes('drought_risk');

              return (
                <span
                  key={idx}
                  className={`px-3 py-1 rounded-full text-xs ${
                    isClimateFilter
                      ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
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

      {/* Recommendations grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredRecommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.crop_id}
            recommendation={recommendation}
            onViewRule={onViewRule}
          />
        ))}
      </div>

      {filteredRecommendations.length === 0 && (
        <div className="bg-[#1A2E42] rounded-lg p-8 border border-[#2D4A62] text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-400" size={48} />
          <p className="text-[#E8F4FF] text-lg">Нет рекомендаций с выбранным фильтром</p>
          <p className="text-[#8BA4B8] text-sm mt-2">
            Попробуйте выбрать &quot;Все приоритеты&quot; для просмотра всех результатов
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="bg-[#1A2E42] rounded-lg p-4 border border-[#2D4A62]">
        <h3 className="text-base font-semibold text-[#E8F4FF] mb-3">Принципы рекомендаций</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start">
            <CheckCircle className="text-green-400 mr-2 mt-0.5 flex-shrink-0" size={14} />
            <span className="text-[#E8F4FF]">Бобовые после зерновых для обогащения азотом</span>
          </div>
          <div className="flex items-start">
            <CheckCircle className="text-green-400 mr-2 mt-0.5 flex-shrink-0" size={14} />
            <span className="text-[#E8F4FF]">Культуры с разной корневой системой</span>
          </div>
          <div className="flex items-start">
            <CheckCircle className="text-green-400 mr-2 mt-0.5 flex-shrink-0" size={14} />
            <span className="text-[#E8F4FF]">Учет фитосанитарного состояния</span>
          </div>
          <div className="flex items-start">
            <CheckCircle className="text-green-400 mr-2 mt-0.5 flex-shrink-0" size={14} />
            <span className="text-[#E8F4FF]">Баланс питательных веществ</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual recommendation card
const RecommendationCard = ({
  recommendation,
  onViewRule,
}: {
  recommendation: RecommendationItem;
  onViewRule?: (cropId: number, ruleId: string) => void;
}) => {
  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'low':
        return 'text-red-400 bg-red-900/20 border-red-500/30';
    }
  };

  const getImpactIcon = (impact: 'positive' | 'negative' | 'warning') => {
    switch (impact) {
      case 'positive':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'negative':
        return <XCircle className="text-red-400" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-400" size={16} />;
    }
  };

  const getImpactColor = (impact: 'positive' | 'negative' | 'warning') => {
    switch (impact) {
      case 'positive':
        return 'bg-green-900/20 border-green-500/30';
      case 'negative':
        return 'bg-red-900/20 border-red-500/30';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-500/30';
    }
  };

  return (
    <div className="bg-[#1A2E42] rounded-lg p-4 border border-[#2D4A62]">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[#E8F4FF]">{recommendation.crop_name}</h3>
          <p className="text-sm text-[#8BA4B8]">{recommendation.botanical_family}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(recommendation.priority)}`}>
            {recommendation.priority === 'high' && 'Высокий'}
            {recommendation.priority === 'medium' && 'Средний'}
            {recommendation.priority === 'low' && 'Низкий'}
          </span>
          <span className="text-sm text-[#8BA4B8]">
            Оценка: {(recommendation.score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Soil match */}
      {recommendation.soil_match && (
        <div
          className={`mb-3 p-3 rounded-lg ${
            recommendation.soil_match.score < 0.5
              ? 'bg-yellow-900/20 border border-yellow-500/30'
              : 'bg-[#2D4A62]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8BA4B8]">Соответствие почве</span>
            <span
              className={`text-sm font-medium ${
                recommendation.soil_match.score < 0.5 ? 'text-yellow-400' : 'text-green-400'
              }`}
            >
              {(recommendation.soil_match.score * 100).toFixed(0)}%
            </span>
          </div>
          {recommendation.soil_match.notes.length > 0 && (
            <ul className="space-y-1">
              {recommendation.soil_match.notes.map((note, idx) => (
                <li key={idx} className="text-xs text-[#E8F4FF]">
                  • {note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Reasons */}
      {recommendation.reasons && recommendation.reasons.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="text-sm font-medium text-[#E8F4FF]">Обоснование</div>
          {recommendation.reasons.map((reason, idx) => (
            <div key={idx} className={`p-2 rounded border ${getImpactColor(reason.impact)}`}>
              <div className="flex items-start gap-2">
                {getImpactIcon(reason.impact)}
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#E8F4FF]">{reason.title}</div>
                  <div className="text-xs text-[#8BA4B8] mt-1">{reason.detail}</div>
                  {onViewRule && (
                    <button
                      onClick={() => onViewRule(recommendation.crop_id, reason.rule_id)}
                      className="text-xs text-[#3388ff] hover:text-[#4499ff] mt-1 flex items-center"
                    >
                      <BookOpen size={12} className="mr-1" />
                      Посмотреть правило
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {recommendation.warnings && recommendation.warnings.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium text-yellow-400 mb-2">Ограничения</div>
          <ul className="space-y-1">
            {recommendation.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start text-xs text-[#E8F4FF]">
                <AlertTriangle className="text-yellow-400 mr-2 mt-0.5 flex-shrink-0" size={12} />
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Required actions */}
      {recommendation.required_actions && recommendation.required_actions.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium text-[#E8F4FF] mb-2">Необходимые действия</div>
          <ul className="space-y-1">
            {recommendation.required_actions.map((action, idx) => (
              <li key={idx} className="flex items-start text-xs text-[#E8F4FF]">
                <input
                  type="checkbox"
                  className="mt-1 mr-2 flex-shrink-0"
                  id={`action-${recommendation.crop_id}-${idx}`}
                />
                <label htmlFor={`action-${recommendation.crop_id}-${idx}`} className="cursor-pointer">
                  {action}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action button */}
      <button className="w-full flex items-center justify-center px-4 py-2 bg-[#3388ff] text-white rounded-lg hover:bg-[#2970cc] transition-colors text-sm">
        Выбрать эту культуру
        <ArrowRight size={14} className="ml-2" />
      </button>
    </div>
  );
};
