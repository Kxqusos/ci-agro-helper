// CropSearch.tsx - ПОЛНОСТЬЮ АДАПТИВНАЯ ВЕРСИЯ
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Search, TrendingUp, TrendingDown, Menu, X } from "lucide-react";
import { useCropsSearch } from "../hooks/useCropsSearch";
import "./crop-search.css";

export const CropSearch: React.FC = () => {
  const {
    filteredCrops,
    selectedCrop,
    searchQuery,
    area,
    faoPriceData,
    totalCropsCount,
    mainCropsCount,
    rareCropsCount,
    cropTypeFilter,
    categoryFilter,
    setArea,
    setSearchQuery,
    setCropTypeFilter,
    setCategoryFilter,
    handleSearchChange,
    getCropPrice,
    getPriceInRub,
    calculateProfit,
    setSelectedCrop,
    clearFilters,
  } = useCropsSearch();

  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    handleSearchChange(query);
  };

  const handleBack = () => {
    window.history.back();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Функция локального расчёта подробных затрат
  const calculateCostsBreakdown = (crop: typeof selectedCrop, hectares: number) => {
    if (!crop || !hectares || hectares <= 0) return null;

    const base = crop.costPerHectare;
    const pct = {
      seeds: 0.25,
      fertilizers: 0.30,
      fuel: 0.15,
      water: 0.10,
      machinery: 0.12,
      labor: 0.08,
    };

    const seeds = Math.round(base * pct.seeds * hectares);
    const fertilizers = Math.round(base * pct.fertilizers * hectares);
    const fuel = Math.round(base * pct.fuel * hectares);
    const water = Math.round(base * pct.water * hectares);
    const machinery = Math.round(base * pct.machinery * hectares);
    const labor = Math.round(base * pct.labor * hectares);

    const total = seeds + fertilizers + fuel + water + machinery + labor;

    return {
      perHectare: Math.round(base),
      seeds,
      fertilizers,
      fuel,
      water,
      machinery,
      labor,
      total,
    };
  };

  const costsBreakdown = useMemo(() => calculateCostsBreakdown(selectedCrop, area), [selectedCrop, area]);
  const profitData = selectedCrop ? calculateProfit(selectedCrop, area) : null;
  const selectedCropPrice = selectedCrop ? getCropPrice(selectedCrop.name) : null;

  return (
    <div className="crop-search">
      {/* Кнопка назад для страницы - всегда в левом верхнем углу */}
      <div className="page-back-button-container">
        <button 
          className="page-back-button"
          onClick={handleBack}
          aria-label="Вернуться назад"
        >
          <ArrowLeft size={20} />
          <span className="button-text">Назад</span>
        </button>
      </div>

      {/* Мобильное меню для фильтров */}
      {isMobile && (
        <div className="mobile-header-controls">
          <button 
            className="menu-toggle-btn"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "Закрыть фильтры" : "Открыть фильтры"}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            <span>Фильтры</span>
          </button>
        </div>
      )}

      <div className="main-content">
        {/* Боковая панель */}
        <div className={`sidebar ${isMobile && !isSidebarOpen ? 'sidebar-hidden' : ''}`}>
          {isMobile && (
            <div className="sidebar-mobile-header">
              <h3>Фильтры и поиск</h3>
              <button 
                className="close-sidebar-btn"
                onClick={closeSidebar}
                aria-label="Закрыть фильтры"
              >
                <X size={20} />
              </button>
            </div>
          )}

          <div className="search-box">
            <input
              type="text"
              placeholder="Поиск культур..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">
              <Search size={18} />
            </div>
          </div>

          <div className="filter-section">
            <div className="filter-title">Фильтры</div>
            
            {/* Фильтр по типу культуры */}
            <div className="filter-group">
              <label className="filter-label">Тип культуры</label>
              <select 
                className="filter-select" 
                value={cropTypeFilter}
                onChange={(e) => setCropTypeFilter(e.target.value)}
              >
                <option value="all">Все типы</option>
                <option value="основная">Основные</option>
                <option value="редкая">Редкие</option>
              </select>
            </div>

            {/* Фильтр по категории */}
            <div className="filter-group">
              <label className="filter-label">Категория</label>
              <select 
                className="filter-select" 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Все категории</option>
                <option value="Зерновые">Зерновые</option>
                <option value="Овощи">Овощи</option>
                <option value="Фрукты">Фрукты</option>
                <option value="Бобовые">Бобовые</option>
                <option value="Масличные">Масличные</option>
                <option value="Мясо">Мясо</option>
                <option value="Молочные продукты">Молочные продукты</option>
                <option value="Яйца">Яйца</option>
                <option value="Орехи">Орехи</option>
                <option value="Другие">Другие</option>
              </select>
            </div>

            {/* Кнопка сброса фильтров */}
            {(cropTypeFilter !== 'all' || categoryFilter !== 'all') && (
              <button 
                className="refresh-btn"
                onClick={clearFilters}
                style={{ width: '100%', marginTop: '8px' }}
              >
                Сбросить фильтры
              </button>
            )}
          </div>

          <div className="stats-panel">
            <div className="stat-item">
              <span className="stat-label">Всего культур</span>
              <span className="stat-value">{totalCropsCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Основные</span>
              <span className="stat-value">{mainCropsCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Редкие</span>
              <span className="stat-value">{rareCropsCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Найдено</span>
              <span className="stat-value">{filteredCrops.length}</span>
            </div>
          </div>
        </div>

        {/* Основная область контента */}
        <div className={`content-area ${selectedCrop ? 'compact-height' : 'full-height'}`}>
          <div className="content-header">
            <div className="header-left">
              {/* Кнопка назад для списка - показывается только когда выбрана культура */}
              {selectedCrop && (
                <button 
                  className="back-button"
                  onClick={() => setSelectedCrop(null)}
                >
                  <ArrowLeft size={16} />
                  <span>Назад к списку</span>
                </button>
              )}
              
              <div className={selectedCrop ? "content-header-with-back" : ""}>
                <div className={selectedCrop ? "header-main" : ""}>
                  <h1 className="content-title">Сельскохозяйственные культуры</h1>
                  <p className="content-subtitle">Анализ прибыльности и расчет доходности</p>
                </div>
              </div>
            </div>
            
            <div className="header-right">
              <div className="counter-badge">{filteredCrops.length} из {totalCropsCount} культур</div>
            </div>
          </div>

          {/* Компактный список культур */}
          {!selectedCrop && (
            <div className="compact-crops-container">
              {filteredCrops.length > 0 ? (
                <div className="compact-crops-list">
                  {filteredCrops.map((crop) => (
                    <div
                      key={crop.id}
                      className="compact-crop-item"
                      onClick={() => {
                        setSelectedCrop(crop);
                        if (isMobile) closeSidebar();
                      }}
                    >
                      <div className="compact-crop-main">
                        <span className="compact-crop-name">{crop.name}</span>
                        <span className={`compact-crop-type ${crop.type}`}>{crop.type}</span>
                      </div>
                      <div className="compact-crop-details">
                        <span className="compact-crop-yield">{crop.yieldPerHectare} т/га</span>
                        <span className="compact-crop-price">
                          {getPriceInRub(crop.name).toLocaleString("ru-RU")} RUB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>Культуры не найдены</h3>
                  <p>Попробуйте изменить параметры поиска или фильтры</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Детали выбранной культуры */}
      {selectedCrop && (
        <div className="crop-detail-full">
          <div className="detail-layout">
            {/* Левая часть - характеристики */}
            <div className="detail-left">
              <div className="detail-header">
                <div className="crop-title-section">
                  <h2>{selectedCrop.name}</h2>
                  {selectedCrop.latinName && <p className="latin-name">{selectedCrop.latinName}</p>}
                </div>
                <div className="crop-meta">
                  <span className={`type-badge ${selectedCrop.type}`}>{selectedCrop.type}</span>
                  <span className="category-tag">{selectedCrop.category}</span>
                </div>
              </div>

              <div className="info-section">
                <h3>Характеристики</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Урожайность</label>
                    <span>{selectedCrop.yieldPerHectare} т/га</span>
                  </div>
                  <div className="info-item">
                    <label>Затраты на га (база)</label>
                    <span>{selectedCrop.costPerHectare.toLocaleString("ru-RU")} RUB</span>
                  </div>
                  <div className="info-item">
                    <label>Цена за тонну (FAO)</label>
                    <span>{getPriceInRub(selectedCrop.name).toLocaleString("ru-RU")} RUB</span>
                  </div>
                  <div className="info-item">
                    <label>Категория</label>
                    <span>{selectedCrop.category}</span>
                  </div>
                  <div className="info-item">
                    <label>Тип</label>
                    <span>{selectedCrop.type}</span>
                  </div>
                  {selectedCrop.description && (
                    <div className="info-item">
                      <label>Описание</label>
                      <span>{selectedCrop.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Правая часть - цены и калькулятор */}
            <div className="detail-right">
              {/* Цены */}
              <div className="price-section">
                <h3>Цены производителей 2024</h3>
                <div className="price-card">
                  {selectedCropPrice ? (
                    <>
                      <div className="price-main">
                        <span className="price-value">
                          {selectedCropPrice.producer_price.toLocaleString("ru-RU")}
                        </span>
                        <span className="price-unit">{faoPriceData?.currency_unit ?? "RUB"}</span>
                      </div>
                      <div className="price-details">
                        <div className="price-meta">
                          <span>За тонну продукции</span>
                          <span>Источник: {faoPriceData?.data_source ?? "FAOSTAT (mock)"}</span>
                          {selectedCropPrice.price_index && <span>Индекс цен: {selectedCropPrice.price_index}</span>}
                        </div>
                        <div
                          className={`price-trend ${
                            selectedCropPrice.price_index && selectedCropPrice.price_index > 150 ? "positive" : "negative"
                          }`}
                        >
                          <div className="trend-content">
                            {selectedCropPrice.price_index && selectedCropPrice.price_index > 150 ? (
                              <>
                                <TrendingUp size={16} />
                                <span>Выше среднего</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown size={16} />
                                <span>Средний</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state">
                      <p>Данные о цене не найдены</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Калькулятор прибыли и затрат */}
              <div className="calculator-section">
                <h3>Калькулятор прибыли и затрат</h3>

                <div className="calculator-input">
                  <label>Площадь посева (га)</label>
                  <input
                    type="number"
                    value={area}
                    onChange={(e) => setArea(Number(e.target.value))}
                    className="area-input-no-arrows"
                    min={0}
                    step={0.1}
                  />
                </div>

                {profitData && area > 0 ? (
                  <>
                    <div className="calculation-results">
                      <div className="result-row">
                        <span>Общий урожай:</span>
                        <span>{profitData.totalYield.toFixed(1)} т</span>
                      </div>
                      <div className="result-row">
                        <span>Выручка от продажи:</span>
                        <span>{profitData.totalRevenue.toLocaleString("ru-RU")} RUB</span>
                      </div>
                      {costsBreakdown ? (
                        <>
                          <h4 style={{ marginTop: 12, color: '#8ba4b8', fontSize: '14px' }}>Детализация затрат (на {area} га)</h4>
                          <div className="cost-breakdown">
                            <div className="result-row"><span>Семена:</span><span>{costsBreakdown.seeds.toLocaleString("ru-RU")} RUB</span></div>
                            <div className="result-row"><span>Удобрения:</span><span>{costsBreakdown.fertilizers.toLocaleString("ru-RU")} RUB</span></div>
                            <div className="result-row"><span>Топливо:</span><span>{costsBreakdown.fuel.toLocaleString("ru-RU")} RUB</span></div>
                            <div className="result-row"><span>Вода / полив:</span><span>{costsBreakdown.water.toLocaleString("ru-RU")} RUB</span></div>
                            <div className="result-row"><span>Техника / амортизация:</span><span>{costsBreakdown.machinery.toLocaleString("ru-RU")} RUB</span></div>
                            <div className="result-row"><span>Рабочая сила:</span><span>{costsBreakdown.labor.toLocaleString("ru-RU")} RUB</span></div>

                            <div className="result-row" style={{ borderTop: '2px solid #2d4257', paddingTop: '16px', marginTop: '8px' }}>
                              <strong>Итого затрат:</strong>
                              <strong>{costsBreakdown.total.toLocaleString("ru-RU")} RUB</strong>
                            </div>

                            <div className="result-row profit" style={{ borderBottom: 'none' }}>
                              <span>Чистая прибыль:</span>
                              <span className={profitData.totalProfit >= 0 ? "positive" : "negative"}>
                                {profitData.totalProfit.toLocaleString("ru-RU")} RUB
                              </span>
                            </div>

                            <div className="result-row">
                              <span>Прибыль с гектара:</span>
                              <span className={profitData.profitPerHectare >= 0 ? "positive" : "negative"}>
                                {profitData.profitPerHectare.toLocaleString("ru-RU")} RUB/га
                              </span>
                            </div>

                            <div className="result-row">
                              <span>Рентабельность:</span>
                              <span className={profitData.profitability >= 0 ? "positive" : "negative"}>
                                {profitData.profitability.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="calculation-note">Введите корректную площадь для расчёта затрат</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="calculation-note">Введите площадь для расчета прибыли</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Оверлей для мобильного меню */}
      {isMobile && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}
    </div>
  );
};