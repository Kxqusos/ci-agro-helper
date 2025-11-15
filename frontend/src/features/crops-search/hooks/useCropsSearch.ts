import { useState, useEffect, useCallback } from 'react';
import { Crop, CropEconomics } from '../types';
import { cropsApi } from '../services/cropsApi';

export const useCropsSearch = () => {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [filteredCrops, setFilteredCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [area, setArea] = useState(100);
  const [economics, setEconomics] = useState<CropEconomics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCrops = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await cropsApi.getCrops();
        setCrops(data);
        setFilteredCrops(data);
      } catch (err) {
        setError('Не удалось загрузить данные культур');
        console.error('Error loading crops:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCrops();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = crops.filter(crop =>
        crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crop.latin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crop.categories.some(category => 
          category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setFilteredCrops(filtered);
    } else {
      setFilteredCrops(crops);
    }
  }, [searchQuery, crops]);

  useEffect(() => {
    const calculateEconomics = async () => {
      if (selectedCrop && area > 0) {
        try {
          const result = await cropsApi.calculateEconomics(selectedCrop.id, area);
          setEconomics(result);
        } catch (err) {
          console.error('Error calculating economics:', err);
        }
      }
    };

    calculateEconomics();
  }, [selectedCrop, area]);

  const scrollToLetter = useCallback((letter: string, cropsListRef: React.RefObject<HTMLDivElement>) => {
    if (!cropsListRef.current) return;
    
    const normalizedLetter = letter.toLowerCase();
    const cropElements = cropsListRef.current.querySelectorAll('.crop-card');
    
    for (let i = 0; i < cropElements.length; i++) {
      const cropName = filteredCrops[i].name.toLowerCase();
      if (cropName.startsWith(normalizedLetter)) {
        cropElements[i].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        const firstMatchingCrop = filteredCrops.find(crop => 
          crop.name.toLowerCase().startsWith(normalizedLetter)
        );
        if (firstMatchingCrop) {
          setSelectedCrop(firstMatchingCrop);
        }
        break;
      }
    }
  }, [filteredCrops]);

  const handleSearchChange = useCallback((value: string, cropsListRef: React.RefObject<HTMLDivElement>) => {
    setSearchQuery(value);
    
    if (value.length === 1 && /[а-яА-Яa-zA-Z]/.test(value)) {
      scrollToLetter(value, cropsListRef);
    }
  }, [scrollToLetter]);

  return {
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
    handleSearchChange,
    scrollToLetter
  };
};
