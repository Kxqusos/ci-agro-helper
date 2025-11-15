import { useState, useEffect, useCallback } from 'react';
import { Crop } from '../types/crop';
import { PriceData } from '../services/combinedPriceService';

interface Economics {
  expenses: number;
  revenue: number;
  profit: number;
  profitability: number;
}

export const useCropsSearch = () => {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [filteredCrops, setFilteredCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [area, setArea] = useState(1);
  const [economics, setEconomics] = useState<Economics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);

  // Загрузка культур
  useEffect(() => {
    const loadCrops = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/crops');
        if (!response.ok) throw new Error('Failed to load crops');
        const cropsData = await response.json();
        setCrops(cropsData);
        setFilteredCrops(cropsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load crops');
        setCrops(getDemoCrops());
        setFilteredCrops(getDemoCrops());
      } finally {
        setLoading(false);
      }
    };

    loadCrops();
  }, []);

  // Загрузка цен
  useEffect(() => {
    const loadPrices = async () => {
      try {
        setPricesLoading(true);
        const response = await fetch('/api/crops/smart-prices');
        
        if (!response.ok) throw new Error('Failed to load prices');
        
        const result = await response.json();
        
        if (result.success) {
          setPrices(result.data);
        } else {
          setPrices(result.data || []);
        }
      } catch (err) {
        console.error('Error loading prices:', err);
        setPrices([]);
      } finally {
        setPricesLoading(false);
      }
    };

    loadPrices();
  }, []);

  // Расчет экономики при изменении культуры или площади
  useEffect(() => {
    if (selectedCrop) {
      calculateEconomics(selectedCrop, area);
    }
  }, [selectedCrop, area, prices]);

  const calculateEconomics = useCallback((crop: Crop, area: number) => {
    if (!crop.yield) return;

    const cropPrice = prices.find(price => price.commodity === crop.id);
    const pricePerTon = cropPrice?.price || 10000;
    
    const expectedYield = area * crop.yield;
    const revenue = expectedYield * pricePerTon;
    const expensesPerHectare = 50000;
    const expenses = area * expensesPerHectare;
    const profit = revenue - expenses;
    const profitability = expenses > 0 ? (profit / expenses) * 100 : 0;

    setEconomics({
      expenses,
      revenue,
      profit,
      profitability: parseFloat(profitability.toFixed(1))
    });
  }, [prices]);

  const handleSearchChange = useCallback((query: string, cropsListRef: React.RefObject<HTMLDivElement>) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredCrops(crops);
      return;
    }

    const filtered = crops.filter(crop =>
      crop.name.toLowerCase().includes(query.toLowerCase()) ||
      crop.latin.toLowerCase().includes(query.toLowerCase()) ||
      crop.categories.some(cat => cat.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredCrops(filtered);

    if (query.length === 1 && cropsListRef.current) {
      const firstCropWithLetter = filtered.find(crop => 
        crop.name.toLowerCase().startsWith(query.toLowerCase())
      );
      if (firstCropWithLetter) {
        const element = cropsListRef.current.querySelector(`[data-crop-id="${firstCropWithLetter.id}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [crops]);

  const refreshPrices = async () => {
    try {
      setPricesLoading(true);
      const response = await fetch('/api/crops/smart-prices?update=true');
      const result = await response.json();
      
      if (result.success) {
        setPrices(result.data);
      }
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setPricesLoading(false);
    }
  };

  const getDemoCrops = (): Crop[] => {
    return [
      {
        id: 'wheat',
        name: 'Пшеница',
        latin: 'Triticum aestivum',
        categories: ['Зерновые'],
        type: 'основная',
        yield: 3.5
      },
      {
        id: 'corn',
        name: 'Кукуруза',
        latin: 'Zea mays',
        categories: ['Зерновые'],
        type: 'основная',
        yield: 6.0
      },
      {
        id: 'sunflower',
        name: 'Подсолнечник',
        latin: 'Helianthus annuus',
        categories: ['Масличные'],
        type: 'основная',
        yield: 2.2
      },
      {
        id: 'soybean',
        name: 'Соя',
        latin: 'Glycine max',
        categories: ['Бобовые'],
        type: 'основная',
        yield: 2.0
      },
      {
        id: 'barley',
        name: 'Ячмень',
        latin: 'Hordeum vulgare',
        categories: ['Зерновые'],
        type: 'основная',
        yield: 3.0
      }
    ];
  };

  return {
    crops,
    filteredCrops,
    selectedCrop,
    searchQuery,
    area,
    economics,
    loading,
    error,
    prices,
    pricesLoading,
    setSelectedCrop,
    setArea,
    setSearchQuery,
    handleSearchChange,
    refreshPrices
  };
};