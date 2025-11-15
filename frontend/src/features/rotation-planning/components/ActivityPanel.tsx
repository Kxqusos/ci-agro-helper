'use client';

import { useState } from 'react';
import { Clock, CheckCircle, XCircle, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { useRecommendationsJobs } from '../store/recommendationsJobs';
import type { RecommendationJob } from '../store/recommendationsJobs';

/**
 * Activity panel component
 * Displays history of recommendation events/jobs
 */

interface ActivityPanelProps {
  maxItems?: number;
  onOpenResult?: (job: RecommendationJob) => void;
}

export const ActivityPanel = ({ maxItems = 20, onOpenResult }: ActivityPanelProps) => {
  const getLatestJobs = useRecommendationsJobs((state) => state.getLatestJobs);
  const kafkaAvailable = useRecommendationsJobs((state) => state.kafkaAvailable);
  const kafkaErrorMessage = useRecommendationsJobs((state) => state.kafkaErrorMessage);

  const jobs = getLatestJobs(maxItems);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyRequestId = (requestId: string) => {
    navigator.clipboard.writeText(requestId);
    setCopiedId(requestId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusIcon = (status: RecommendationJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-400 animate-spin" size={16} />;
      case 'success':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'error':
        return <XCircle className="text-red-400" size={16} />;
    }
  };

  const getStatusColor = (status: RecommendationJob['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400';
      case 'success':
        return 'bg-green-900/20 border-green-500/30 text-green-400';
      case 'error':
        return 'bg-red-900/20 border-red-500/30 text-red-400';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 minute
    if (diff < 60000) {
      return 'только что';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} мин назад`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} ч назад`;
    }

    // More than 24 hours
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Kafka error banner */}
      {!kafkaAvailable && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-400 mb-1">
                Сервис сообщений недоступен
              </h3>
              <p className="text-xs text-[#E8F4FF]">
                {kafkaErrorMessage || 'Не удается подключиться к потоку событий. Попробуйте позже.'}
              </p>
              <p className="text-xs text-[#8BA4B8] mt-2">
                Создание новых задач временно заблокировано
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity list */}
      <div className="bg-[#1A2E42] rounded-lg border border-[#2D4A62]">
        <div className="p-4 border-b border-[#2D4A62]">
          <h3 className="text-base font-semibold text-[#E8F4FF]">История событий</h3>
          <p className="text-xs text-[#8BA4B8] mt-1">
            Последние {jobs.length} событий рекомендаций
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="mx-auto mb-3 text-[#8BA4B8]" size={32} />
            <p className="text-[#8BA4B8] text-sm">Нет событий для отображения</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2D4A62]">
            {jobs.map((job) => (
              <div key={job.requestId} className="p-4 hover:bg-[#2D4A62]/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Left side: Status and info */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">{getStatusIcon(job.status)}</div>

                    <div className="flex-1 min-w-0">
                      {/* Field and season */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[#E8F4FF] truncate">
                          {job.fieldId}
                        </span>
                        <span className="text-xs text-[#8BA4B8]">
                          {job.targetSeason} {job.targetYear}
                        </span>
                      </div>

                      {/* Status and metadata */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded border ${getStatusColor(job.status)}`}>
                          {job.status === 'pending' && 'Обработка'}
                          {job.status === 'success' && 'Готово'}
                          {job.status === 'error' && 'Ошибка'}
                        </span>

                        {job.source && (
                          <span className="text-[#8BA4B8]">• {job.source}</span>
                        )}

                        {job.durationMs !== undefined && (
                          <span className="text-[#8BA4B8]">
                            • {formatDuration(job.durationMs)}
                          </span>
                        )}

                        <span className="text-[#8BA4B8]">
                          • {formatTimestamp(job.updatedAt)}
                        </span>
                      </div>

                      {/* Error message */}
                      {job.error && (
                        <div className="mt-2 text-xs text-red-400 bg-red-900/10 rounded px-2 py-1">
                          {job.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Open result button */}
                    {job.status === 'success' && job.response && onOpenResult && (
                      <button
                        onClick={() => onOpenResult(job)}
                        className="p-1.5 text-[#3388ff] hover:text-[#4499ff] hover:bg-[#3388ff]/10 rounded transition-colors"
                        title="Открыть результат"
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}

                    {/* Copy request ID button */}
                    <button
                      onClick={() => handleCopyRequestId(job.requestId)}
                      className="p-1.5 text-[#8BA4B8] hover:text-[#E8F4FF] hover:bg-[#2D4A62] rounded transition-colors"
                      title={copiedId === job.requestId ? 'Скопировано!' : 'Скопировать request_id'}
                    >
                      {copiedId === job.requestId ? (
                        <CheckCircle size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
