'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Download, RefreshCw, Search, Filter, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { recommendationsApi, type RulesCatalogResponse, type CropRuleSummary, type BotanicalFamily } from '../services/recommendationsApi';
import { mapRuleCatalog, filterRulesCatalog, type RuleCatalogFilters } from '../services/ruleCatalogAdapter';

export const RuleCatalogTab = () => {
  const [catalog, setCatalog] = useState<RulesCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<RuleCatalogFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('');

  // Load rules catalog on mount
  useEffect(() => {
    loadRulesCatalog();
  }, []);

  const loadRulesCatalog = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await recommendationsApi.getRulesCatalog();
      const enriched = mapRuleCatalog(response);
      setCatalog(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки каталога правил');
      console.error('Failed to load rules catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!catalog) return;
    const dataStr = JSON.stringify(catalog, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crop-rotation-rules-${catalog.version}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter crops based on search and filters
  const filteredCrops = catalog
    ? filterRulesCatalog(catalog, {
        ...filters,
        cropName: searchQuery,
        botanicalFamily: selectedFamily || undefined,
      })
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-[#3388ff]" size={40} />
          <p className="text-[#8BA4B8]">Загрузка каталога правил...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1A2E42] rounded-lg p-6 border border-red-500">
        <div className="flex items-center text-red-400 mb-4">
          <AlertCircle className="mr-2" size={24} />
          <h3 className="text-lg font-semibold">Ошибка загрузки</h3>
        </div>
        <p className="text-[#E8F4FF] mb-4">{error}</p>
        <button
          onClick={loadRulesCatalog}
          className="flex items-center px-4 py-2 bg-[#3388ff] text-white rounded-lg hover:bg-[#2970cc] transition-colors"
        >
          <RefreshCw size={16} className="mr-2" />
          Повторить попытку
        </button>
      </div>
    );
  }

  if (!catalog) return null;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#E8F4FF] flex items-center">
            <BookOpen className="mr-2 text-blue-400" size={24} />
            Каталог правил севооборота
          </h2>
          <p className="text-sm text-[#8BA4B8] mt-1">
            Версия {catalog.version} • Обновлено {catalog.updated}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadRulesCatalog}
            className="flex items-center px-3 py-2 bg-[#2D4A62] text-[#E8F4FF] rounded-lg hover:bg-[#3A5A76] transition-colors text-sm"
          >
            <RefreshCw size={16} className="mr-2" />
            Обновить
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center px-3 py-2 bg-[#3388ff] text-white rounded-lg hover:bg-[#2970cc] transition-colors text-sm"
          >
            <Download size={16} className="mr-2" />
            Скачать JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1A2E42] rounded-lg p-4 border border-[#2D4A62]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search by crop name */}
          <div>
            <label className="block text-sm text-[#8BA4B8] mb-2">Поиск по культуре</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8BA4B8]" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Название культуры..."
                className="w-full pl-10 pr-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] placeholder-[#8BA4B8] focus:outline-none focus:border-[#3388ff]"
              />
            </div>
          </div>

          {/* Filter by botanical family */}
          <div>
            <label className="block text-sm text-[#8BA4B8] mb-2">Ботаническое семейство</label>
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff]"
            >
              <option value="">Все семейства</option>
              {Object.entries(catalog.botanical_families).map(([key, family]) => (
                <option key={key} value={key}>
                  {family.name_ru}
                </option>
              ))}
            </select>
          </div>

          {/* Quick filters */}
          <div>
            <label className="block text-sm text-[#8BA4B8] mb-2">Фильтры</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, hasRotationInterval: !filters.hasRotationInterval })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  filters.hasRotationInterval
                    ? 'bg-[#3388ff] text-white'
                    : 'bg-[#0F1F2F] text-[#8BA4B8] border border-[#2D4A62]'
                }`}
              >
                <Calendar size={14} className="inline mr-1" />
                Интервал
              </button>
              <button
                onClick={() => setFilters({ ...filters, hasPredecessors: !filters.hasPredecessors })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  filters.hasPredecessors
                    ? 'bg-[#3388ff] text-white'
                    : 'bg-[#0F1F2F] text-[#8BA4B8] border border-[#2D4A62]'
                }`}
              >
                <Filter size={14} className="inline mr-1" />
                Предшеств.
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-[#8BA4B8]">
        Найдено культур: <span className="text-[#E8F4FF] font-medium">{filteredCrops.length}</span> из {catalog.crops.length}
      </div>

      {/* Crop cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCrops.map((crop) => (
          <CropCard key={crop.crop_id} crop={crop} />
        ))}
      </div>

      {filteredCrops.length === 0 && (
        <div className="text-center py-12 text-[#8BA4B8]">
          <BookOpen className="mx-auto mb-4" size={48} />
          <p>Культуры не найдены. Попробуйте изменить фильтры.</p>
        </div>
      )}
    </div>
  );
};

// Crop card component
const CropCard = ({ crop }: { crop: CropRuleSummary }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#1A2E42] rounded-lg p-4 border border-[#2D4A62] hover:border-[#3388ff] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-[#E8F4FF]">{crop.crop_name}</h3>
          <p className="text-sm text-[#8BA4B8]">{crop.botanical_family}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[#3388ff] hover:text-[#4499ff] text-sm"
        >
          {expanded ? 'Свернуть' : 'Подробнее'}
        </button>
      </div>

      {/* Rotation interval */}
      {crop.rotation_interval_years && (
        <div className="mb-3 p-3 bg-[#2D4A62] rounded-lg">
          <div className="text-xs text-[#8BA4B8] mb-1">Интервал возврата</div>
          <div className="text-sm text-[#E8F4FF]">
            {crop.rotation_interval_years.min && (
              <span>Минимум: {crop.rotation_interval_years.min} года</span>
            )}
            {crop.rotation_interval_years.recommended && (
              <>
                {crop.rotation_interval_years.min && ' • '}
                Рекомендуется: {crop.rotation_interval_years.recommended} года
              </>
            )}
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-3 border-t border-[#2D4A62] pt-3">
          {/* Good predecessors */}
          {crop.good_predecessors && crop.good_predecessors.length > 0 && (
            <div>
              <div className="flex items-center text-sm text-green-400 mb-2">
                <CheckCircle size={16} className="mr-2" />
                <span className="font-medium">Хорошие предшественники</span>
              </div>
              <ul className="space-y-1 ml-6">
                {crop.good_predecessors.map((pred, idx) => (
                  <li key={idx} className="text-sm text-[#E8F4FF]">
                    {pred.crop_reference}
                    {pred.rating === 'excellent' && (
                      <span className="ml-2 text-xs text-green-400">(отлично)</span>
                    )}
                    {pred.reason && (
                      <span className="text-xs text-[#8BA4B8] ml-2">— {pred.reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Acceptable predecessors */}
          {crop.acceptable_predecessors && crop.acceptable_predecessors.length > 0 && (
            <div>
              <div className="flex items-center text-sm text-yellow-400 mb-2">
                <AlertCircle size={16} className="mr-2" />
                <span className="font-medium">Допустимые предшественники</span>
              </div>
              <ul className="space-y-1 ml-6">
                {crop.acceptable_predecessors.map((pred, idx) => (
                  <li key={idx} className="text-sm text-[#E8F4FF]">
                    {pred.crop_reference}
                    {pred.conditions && (
                      <span className="text-xs text-[#8BA4B8] ml-2">— {pred.conditions}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bad predecessors */}
          {crop.bad_predecessors && crop.bad_predecessors.length > 0 && (
            <div>
              <div className="flex items-center text-sm text-red-400 mb-2">
                <XCircle size={16} className="mr-2" />
                <span className="font-medium">Нежелательные предшественники</span>
              </div>
              <ul className="space-y-1 ml-6">
                {crop.bad_predecessors.map((pred, idx) => (
                  <li key={idx} className="text-sm text-[#E8F4FF]">
                    {pred.crop_reference}
                    {pred.reason && (
                      <span className="text-xs text-[#8BA4B8] ml-2">— {pred.reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Incompatible families */}
          {crop.incompatible_families && crop.incompatible_families.length > 0 && (
            <div>
              <div className="text-sm text-[#8BA4B8] mb-2">Несовместимые семейства:</div>
              <div className="flex flex-wrap gap-2">
                {crop.incompatible_families.map((family, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-red-900/20 text-red-400 rounded text-xs border border-red-500/30"
                  >
                    {family}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Soil requirements */}
          {crop.soil_requirements && (
            <div className="p-3 bg-[#0F1F2F] rounded-lg">
              <div className="text-sm text-[#8BA4B8] mb-2">Требования к почве:</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#E8F4FF]">
                {crop.soil_requirements.ph && (
                  <div>pH: {crop.soil_requirements.ph}</div>
                )}
                {crop.soil_requirements.organic_matter && (
                  <div>Органика: {crop.soil_requirements.organic_matter}</div>
                )}
                {crop.soil_requirements.drainage && (
                  <div>Дренаж: {crop.soil_requirements.drainage}</div>
                )}
                {crop.soil_requirements.soil_type && crop.soil_requirements.soil_type.length > 0 && (
                  <div className="col-span-2">
                    Тип почвы: {crop.soil_requirements.soil_type.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
