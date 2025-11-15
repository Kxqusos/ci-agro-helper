import { Calendar, Plus, RefreshCcw } from 'lucide-react';
import type { CropHistoryRecord, FieldInfo } from '../types';

interface HistoryTabProps {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedField: string;
  setSelectedField: (field: string) => void;
  years: number[];
  fieldNames: string[];
  fieldInfo: FieldInfo[];
  filteredHistory: CropHistoryRecord[];
  isLoading?: boolean;
  error?: string | null;
  isUsingMockData?: boolean;
  onRefresh?: () => void;
}

export const HistoryTab = ({ 
  selectedYear, 
  setSelectedYear, 
  selectedField,
  setSelectedField,
  years, 
  fieldNames,
  fieldInfo,
  filteredHistory,
  isLoading = false,
  error,
  isUsingMockData = false,
  onRefresh
}: HistoryTabProps) => {
  const getSeasonName = (season: string) => {
    switch (season) {
      case 'spring': return 'Весна';
      case 'summer': return 'Лето';
      case 'autumn': return 'Осень';
      case 'winter': return 'Зима';
      default: return season;
    }
  };

  const selectedFieldInfo = fieldInfo.find(info => info.name === selectedField);

  return (
    <div className="space-y-4 md:space-y-6 w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 md:gap-4">
        <div className="flex flex-col gap-2 w-full">
          <h2 className="text-lg md:text-xl font-semibold text-[#E8F4FF] flex items-center">
            <Calendar className="mr-2 text-blue-400" size={20} />
          История посадок
          </h2>
          {isUsingMockData && (
            <div className="text-xs text-yellow-300">
              Показаны офлайн-данные — подключите сервис crop_history для получения истории с бэкенда
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full lg:w-auto">
          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] text-sm"
          >
            {fieldNames.length === 0 ? (
              <option value="">Нет доступных полей</option>
            ) : (
              fieldNames.map((field) => (
                <option key={field} value={field}>{field}</option>
              ))
            )}
          </select>
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="flex-1 px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] text-sm"
          >
            {years.map(year => (
              <option key={year} value={year}>{year} год</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center px-3 py-2 bg-[#3388ff] text-white rounded-lg hover:bg-[#2970cc] transition-colors text-sm whitespace-nowrap"
            >
              <Plus size={16} className="mr-1" />
              Добавить
            </button>
            {onRefresh && (
              <button
                onClick={() => onRefresh()}
                disabled={isLoading}
                className="px-3 py-2 border border-[#2D4A62] rounded-lg text-[#E8F4FF] hover:bg-[#1A2E42] text-sm flex items-center gap-2 disabled:opacity-60"
                title="Обновить данные"
              >
                <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedFieldInfo && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#1A2E42] p-3 rounded-lg border border-[#2D4A62]">
            <div className="text-[#8BA4B8] text-xs mb-1">Поле</div>
            <div className="text-[#E8F4FF] text-sm font-semibold">{selectedFieldInfo.name}</div>
          </div>
          <div className="bg-[#1A2E42] p-3 rounded-lg border border-[#2D4A62]">
            <div className="text-[#8BA4B8] text-xs mb-1">Площадь</div>
            <div className="text-[#E8F4FF] text-sm font-semibold">{selectedFieldInfo.area} га</div>
          </div>
          <div className="bg-[#1A2E42] p-3 rounded-lg border border-[#2D4A62]">
            <div className="text-[#8BA4B8] text-xs mb-1">Последняя культура</div>
            <div className="text-[#E8F4FF] text-sm font-semibold">{selectedFieldInfo.lastCrop}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-yellow-300 bg-yellow-500/10 border border-yellow-300/40 rounded-lg px-3 py-2 text-xs sm:text-sm">
          ⚠ {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-[#1A2E42] p-3 md:p-4 rounded-lg border border-[#2D4A62]">
          <div className="text-[#8BA4B8] text-xs md:text-sm mb-1">Записей в {selectedYear}</div>
          <div className="text-xl md:text-2xl font-bold text-[#E8F4FF]">{filteredHistory.length}</div>
        </div>
        <div className="bg-[#1A2E42] p-3 md:p-4 rounded-lg border border-[#2D4A62]">
          <div className="text-[#8BA4B8] text-xs md:text-sm mb-1">Общая площадь</div>
          <div className="text-xl md:text-2xl font-bold text-[#E8F4FF]">
            {filteredHistory.reduce((sum, record) => sum + record.area, 0).toFixed(1)} га
          </div>
        </div>
        <div className="bg-[#1A2E42] p-3 md:p-4 rounded-lg border border-[#2D4A62]">
          <div className="text-[#8BA4B8] text-xs md:text-sm mb-1">Уникальных культур</div>
          <div className="text-xl md:text-2xl font-bold text-[#E8F4FF]">
            {new Set(filteredHistory.map(record => record.crop)).size}
          </div>
        </div>
      </div>

      <div className="bg-[#1A2E42] rounded-lg border border-[#2D4A62] overflow-hidden w-full">
        {isLoading && (
          <div className="text-center py-6 text-[#8BA4B8] text-sm border-b border-[#2D4A62]">
            Загрузка истории посевов...
          </div>
        )}
        {filteredHistory.length === 0 && !isLoading ? (
          <div className="text-center py-6 text-[#8BA4B8] text-sm">
            Нет записей для отображения
          </div>
        ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#2D4A62]">
                <th className="text-center py-3 px-3 md:px-4 text-[#8BA4B8] font-medium text-xs md:text-sm">Поле</th>
                <th className="text-center py-3 px-3 md:px-4 text-[#8BA4B8] font-medium text-xs md:text-sm">Культура</th>
                <th className="text-center py-3 px-3 md:px-4 text-[#8BA4B8] font-medium text-xs md:text-sm">Сезон</th>
                <th className="text-center py-3 px-3 md:px-4 text-[#8BA4B8] font-medium text-xs md:text-sm">Площадь</th>
                <th className="text-center py-3 px-3 md:px-4 text-[#8BA4B8] font-medium text-xs md:text-sm">Урожайность</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((record) => (
                <tr key={record.id} className="border-b border-[#2D4A62] hover:bg-[#172B3E]">
                  <td className="text-center py-3 px-3 md:px-4 text-[#E8F4FF] text-xs md:text-sm">{record.fieldName}</td>
                  <td className="text-center py-3 px-3 md:px-4 text-[#E8F4FF] text-xs md:text-sm">{record.crop}</td>
                  <td className="text-center py-3 px-3 md:px-4 text-[#E8F4FF] text-xs md:text-sm capitalize">
                    {getSeasonName(record.season)}
                  </td>
                  <td className="text-center py-3 px-3 md:px-4 text-[#E8F4FF] text-xs md:text-sm">{record.area} га</td>
                  <td className="text-center py-3 px-3 md:px-4 text-[#E8F4FF] text-xs md:text-sm">
                    {record.yield ? `${record.yield} т/га` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};
