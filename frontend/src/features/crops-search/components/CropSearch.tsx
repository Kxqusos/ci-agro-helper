'use client';

import { useRef, useMemo } from 'react';
import { useCropsSearch } from '../hooks/useCropsSearch';
import { 
  Search, 
  X, 
  Sprout, 
  Wheat, 
  Star, 
  Calculator, 
  BarChart3, 
  Tag, 
  Hash, 
  Database, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Leaf
} from 'lucide-react';
import './crop-search.css';

export const CropSearch = () => {
  const cropsListRef = useRef<HTMLDivElement>(null);
  const {
    crops,
    filteredCrops,
    selectedCrop,
    searchQuery,
    area,
    economics,
    loading,
    error,
    setSelectedCrop,
    setArea,
    setSearchQuery,
    handleSearchChange
  } = useCropsSearch();
  const stats = useMemo(() => ({
    total: crops.length,
    main: crops.filter(c => c.type === 'основная').length,
    rare: crops.filter(c => c.type === 'редкая').length,
  }), [crops]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleSearchChange(value, cropsListRef);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  };

  if (loading) {
    return (
      <div className="crop-search-container">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Загрузка базы культур...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crop-search-container">
        <div className="error-state">
          <AlertTriangle size={48} className="error-icon" />
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <p>Используются демо-данные</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crop-search-container">
      <div className="main-header">
        <div className="header-content">
          <h1>АгроПланнер</h1>
          <div className="header-subtitle">
            <span className="crop-count">{crops.length} культур в базе</span>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="left-column">
          <div className="search-panel">
            <div className="panel-header">
              <h3>Поиск культур</h3>
              <div className="search-stats">
                {filteredCrops.length} из {crops.length}
              </div>
            </div>
            
            <div className="search-box">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Введите название или букву для быстрой прокрутки..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-btn"
                  onClick={handleClearSearch}
                  aria-label="Очистить поиск"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="quick-nav-hint">
              <strong>Быстрая навигация:</strong> введите одну букву для прокрутки к культурам
            </div>
          </div>

          <div className="crops-panel">
            <div className="panel-header">
              <h3>Список культур</h3>
              <div className="alphabet-hint">
                А-Я
              </div>
            </div>
            
            <div className="crops-list" ref={cropsListRef}>
              {filteredCrops.map(crop => (
                <div
                  key={crop.id}
                  className={`crop-card ${selectedCrop?.id === crop.id ? 'selected' : ''}`}
                  onClick={() => setSelectedCrop(crop)}
                >
                  <div className="crop-main">
                    <div className="crop-name">{crop.name}</div>
                    <div className="crop-latin">{crop.latin}</div>
                  </div>
                  <div className="crop-meta">
                    <span className="crop-category">{crop.categories[0]}</span>
                    <span className={`crop-type ${crop.type}`}>
                      {crop.type === 'основная' ? <Wheat size={12} /> : <Star size={12} />}
                      {crop.type}
                    </span>
                  </div>
                </div>
              ))}
              
              {filteredCrops.length === 0 && (
                <div className="empty-state">
                  <Sprout size={48} className="empty-icon" />
                  <p>Культуры не найдены</p>
                  <p className="empty-hint">Попробуйте ввести другую букву или название</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="right-column">
          {selectedCrop ? (
            <div className="details-panel">
              <div className="crop-header">
                <div className="crop-title">
                  <h2>{selectedCrop.name}</h2>
                  <span className={`type-badge ${selectedCrop.type}`}>
                    {selectedCrop.type === 'основная' ? <Wheat size={14} /> : <Star size={14} />}
                    {selectedCrop.type}
                  </span>
                </div>
                <div className="crop-latin-name">{selectedCrop.latin}</div>
              </div>

              <div className="info-section">
                <h4>Информация о культуре</h4>
                <div className="info-cards">
                  <div className="info-card">
                    <BarChart3 size={24} className="info-icon" />
                    <div className="info-content">
                      <div className="info-label">Категории</div>
                      <div className="info-value">{selectedCrop.categories.join(', ')}</div>
                    </div>
                  </div>
                  
                  <div className="info-card">
                    <Tag size={24} className="info-icon" />
                    <div className="info-content">
                      <div className="info-label">Тип</div>
                      <div className="info-value">{selectedCrop.type}</div>
                    </div>
                  </div>
                  
                  <div className="info-card">
                    <Hash size={24} className="info-icon" />
                    <div className="info-content">
                      <div className="info-label">ID в базе</div>
                      <div className="info-value">#{selectedCrop.id}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="calculator-section">
                <h4>
                  <Calculator size={20} style={{ marginRight: '8px' }} />
                  Калькулятор урожайности
                </h4>
                
                <div className="calculator-card">
                  <div className="input-group">
                    <label htmlFor="area-input">Площадь посева (га)</label>
                    <input
                      id="area-input"
                      type="number"
                      value={area}
                      onChange={(e) => setArea(Math.max(1, Number(e.target.value)))}
                      min="1"
                      className="area-input"
                    />
                  </div>

                  {economics && (
                    <div className="results">
                      <div className="result-row">
                        <span className="result-label">Общие расходы:</span>
                        <span className="result-value expense">
                          {formatCurrency(economics.expenses)}
                        </span>
                      </div>
                      <div className="result-row">
                        <span className="result-label">Ожидаемый доход:</span>
                        <span className="result-value income">
                          {formatCurrency(economics.revenue)}
                        </span>
                      </div>
                      <div className="result-row total">
                        <span className="result-label">Прибыль:</span>
                        <span className={`result-value ${economics.profit >= 0 ? 'profit' : 'loss'}`}>
                          {economics.profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          {formatCurrency(economics.profit)}
                        </span>
                      </div>
                      <div className="result-row">
                        <span className="result-label">Рентабельность:</span>
                        <span className={`result-value ${economics.profitability >= 0 ? 'profit' : 'loss'}`}>
                          {economics.profitability >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          {economics.profitability.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="welcome-panel">
              <div className="welcome-content">
                <Leaf size={64} className="welcome-icon" />
                <h3>Добро пожаловать в АгроПланнер</h3>
                <p>Выберите культуру из списка для просмотра детальной информации и расчета экономики</p>
                
                <div className="welcome-stats">
                  <div className="stat-item">
                    <Database size={32} className="stat-icon" />
                    <div className="stat-number">{stats.total}</div>
                    <div className="stat-label">культур в базе</div>
                  </div>
                  <div className="stat-item">
                    <Wheat size={32} className="stat-icon" />
                    <div className="stat-number">{stats.main}</div>
                    <div className="stat-label">основных культур</div>
                  </div>
                  <div className="stat-item">
                    <Star size={32} className="stat-icon" />
                    <div className="stat-number">{stats.rare}</div>
                    <div className="stat-label">редких культур</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};