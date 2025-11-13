"use client";
import { useState, useEffect } from "react";
import { useFieldArea } from "../hooks/useFieldArea";
import { useMap } from "@/features/map/context/MapContext";
import cropsData from '@/data/crops.json';
import soilsData from '@/../public/soils.json';
import mineralsData from '@/../public/minerals.json';
import type { FieldData, LLPoint, SoilData, PlannedOperation, Fertilizer, IrrigationSystem } from "../types";

type FieldModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fieldData: FieldData) => void;
  points: LLPoint[];
  polygon: LLPoint[];
  region?: string;
  initialData?: FieldData;
};

type Crop = {
  id: number;
  name: string;
  latin: string;
  categories: string[];
  type: string;
};

const ALL_SOIL_TYPES = Object.keys(mineralsData.агрохимия || {});

const createCropCategories = (crops: Crop[]) => {
  const categories: { [key: string]: string[] } = {};
  
  crops.forEach(crop => {
    crop.categories.forEach(category => {
      if (!categories[category]) {
        categories[category] = [];
      }
      if (!categories[category].includes(crop.name)) {
        categories[category].push(crop.name);
      }
    });
  });
  
  const sortedCategories: { [key: string]: string[] } = {};
  Object.keys(categories).sort().forEach(key => {
    sortedCategories[key] = categories[key].sort();
  });
  
  return sortedCategories;
};

const CROP_CATEGORIES = createCropCategories(cropsData.searchIndex);
const ALL_CROPS = cropsData.searchIndex.map(crop => ({
  id: crop.id,
  name: crop.name,
  latin: crop.latin,
  categories: crop.categories,
  type: crop.type
}));

const OPERATION_TYPES = [
  "Вспашка", "Культивация", "Боронование", "Посев", "Внесение удобрений",
  "Обработка СЗР", "Полив", "Уборка урожая", "Лущение стерни", "Известкование"
];

const FERTILIZER_TYPES = [
  "Азотные", "Фосфорные", "Калийные", "Органические", "Комплексные",
  "Микроудобрения", "Известковые"
];

const IRRIGATION_TYPES = [
  "Дождевание", "Капельное", "Арычное", "Подпочвенное", "Поверхностное"
];

const getRandomFromRange = (range: string): number => {
  if (range.includes('–')) {
    const [minStr, maxStr] = range.split('–');
    const min = parseFloat(minStr.replace(',', '.'));
    const max = parseFloat(maxStr.replace(',', '.'));
    return min + Math.random() * (max - min);
  }

  const specialValues: {[key: string]: number} = {
    'variable_low': 0.5 + Math.random() * 1.5,
    'variable_med': 1.5 + Math.random() * 2,
    'variable_high': 3 + Math.random() * 3,
    'low': 0.1 + Math.random() * 0.3,
    'very_low': 0.01 + Math.random() * 0.05
  };
  
  return specialValues[range] || 0;
};

const getSoilDataByType = (soilType: string): SoilData | null => {
  if (!soilType) return null;
  
  const minerals = mineralsData.агрохимия[soilType];
  if (!minerals) return null;

  const soilData: SoilData = {
    ph: parseFloat(getRandomFromRange(minerals.pH).toFixed(1)),
    organicCarbon: parseFloat(getRandomFromRange(minerals.humus_pct).toFixed(1)),
    clay: Math.floor(20 + Math.random() * 30),
    sand: Math.floor(30 + Math.random() * 40), 
    silt: Math.floor(10 + Math.random() * 30),
    nitrogen: parseFloat(getRandomFromRange(minerals.N_total_pct).toFixed(3)),
    phosphorus: parseFloat(getRandomFromRange(minerals.P_mgkg).toFixed(1)),
    potassium: parseFloat(getRandomFromRange(minerals.K_mgkg).toFixed(1))
  };

  const total = soilData.clay + soilData.sand + soilData.silt;
  soilData.clay = Math.round((soilData.clay / total) * 100);
  soilData.sand = Math.round((soilData.sand / total) * 100);
  soilData.silt = 100 - soilData.clay - soilData.sand;
  
  return soilData;
};

const getSoilDataForRegion = (regionName: string): { soilType: string; soilData: SoilData } | null => {
  if (!regionName) return null;

  const regionInfo = soilsData.find(item => item.region === regionName);
  if (!regionInfo || !regionInfo.soil || regionInfo.soil.length === 0) return null;

  const soilTypes = regionInfo.soil;
  const randomSoilType = soilTypes[Math.floor(Math.random() * soilTypes.length)];
  
  const soilData = getSoilDataByType(randomSoilType);
  if (!soilData) return null;
  
  return {
    soilType: randomSoilType,
    soilData
  };
};

const searchCrops = (query: string, crops: Crop[]): Crop[] => {
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase().trim();
  
  return crops.filter(crop => 
    crop.name.toLowerCase().includes(lowerQuery) ||
    crop.latin.toLowerCase().includes(lowerQuery) ||
    crop.categories.some(category => category.toLowerCase().includes(lowerQuery))
  );
};

export default function FieldModal({ isOpen, onClose, onSave, points, polygon, region, initialData }: FieldModalProps) {
  const { mapRef } = useMap();
  const [formData, setFormData] = useState<FieldData>(() => {
    if (initialData) {
      return {
        ...initialData,
        segmentLengths: initialData.segmentLengths || [],
        plannedOperations: initialData.plannedOperations || [],
        fertilizers: initialData.fertilizers || [],
        irrigationSystem: initialData.irrigationSystem || {
          hasSystem: false,
          type: "",
          description: ""
        }
      };
    }
    
    return {
      name: "",
      area: 0,
      crop: "",
      isActive: false,
      soilType: "",
      segmentLengths: [],
      notes: "",
      cropRotationHistory: "",
      plannedOperations: [],
      fertilizers: [],
      irrigationSystem: {
        hasSystem: false,
        type: "",
        description: ""
      }
    };
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newOperation, setNewOperation] = useState<Omit<PlannedOperation, 'status'>>({
    type: "",
    date: ""
  });
  const [newFertilizer, setNewFertilizer] = useState<Omit<Fertilizer, 'id'>>({
    type: "",
    name: "",
    applicationDate: "",
    amount: 0,
    unit: "кг/га"
  });
  const [isLoadingSoil, setIsLoadingSoil] = useState(false);
  const [soilData, setSoilData] = useState<SoilData | null>(initialData?.soilData || null);
  const [manualSegmentLengths, setManualSegmentLengths] = useState<{ segment: string; length: number }[]>(() => {
    if (initialData?.segmentLengths && initialData.segmentLengths.length > 0) {
      return initialData.segmentLengths;
    }

    return points.map((point, index) => {
      const nextIndex = (index + 1) % points.length;
      return {
        segment: `${point.name || `Т${index+1}`}-${points[nextIndex].name || `Т${nextIndex+1}`}`,
        length: 100
      };
    });
  });
  const [availableSoilTypes, setAvailableSoilTypes] = useState<string[]>([]);
  const [isEditingSoil, setIsEditingSoil] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Crop[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCropDetails, setSelectedCropDetails] = useState<Crop | null>(() => {
    if (initialData?.crop) {
      return ALL_CROPS.find(crop => crop.name === initialData.crop) || null;
    }
    return null;
  });
  const [detectedRegion, setDetectedRegion] = useState<string>(region || "");

  const sideLengths = manualSegmentLengths.map(segment => segment.length);
  const { area: calculatedArea } = useFieldArea({ 
    points, 
    sides: sideLengths 
  });

  useEffect(() => {
    if (isOpen && points.length > 0 && !detectedRegion && mapRef.current) {
      const detectRegionFromMap = () => {
        const firstPoint = points[0];
        const regionInfo = mapRef.current?.findRegionForPoint(firstPoint.lat, firstPoint.lng);
        
        if (regionInfo?.name) {
          setDetectedRegion(regionInfo.name);

          const soilInfo = getSoilDataForRegion(regionInfo.name);
          if (soilInfo) {
            setSoilData(soilInfo.soilData);
            setFormData(prev => ({
              ...prev,
              soilType: soilInfo.soilType,
              soilData: soilInfo.soilData,
              region: regionInfo.name
            }));

            const regionSoilInfo = soilsData.find(item => item.region === regionInfo.name);
            if (regionSoilInfo) {
              setAvailableSoilTypes(regionSoilInfo.soil);
            }
          }
        }
      };

      detectRegionFromMap();
    }
  }, [isOpen, points, detectedRegion, mapRef]);

  useEffect(() => {
    if (isOpen && points.length >= 3 && !initialData) {
      const initialSegments = points.map((point, index) => {
        const nextIndex = (index + 1) % points.length;
        return {
          segment: `${point.name || `Т${index+1}`}-${points[nextIndex].name || `Т${nextIndex+1}`}`,
          length: 100
        };
      });
      
      setManualSegmentLengths(initialSegments);
      
      setFormData(prev => ({
        ...prev,
        segmentLengths: initialSegments,
        area: calculatedArea
      }));
    }
  }, [isOpen, points, initialData]);

  useEffect(() => {
    if (manualSegmentLengths.length > 0) {
      setFormData(prev => ({
        ...prev,
        area: calculatedArea
      }));
    }
  }, [calculatedArea, manualSegmentLengths.length]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchCrops(searchQuery, ALL_CROPS);
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen && initialData) {
      if (initialData.crop) {
        const cropDetails = ALL_CROPS.find(crop => crop.name === initialData.crop);
        setSelectedCropDetails(cropDetails || null);
      }

      if (initialData.soilData) {
        setSoilData(initialData.soilData);
      }

      if (region) {
        const regionInfo = soilsData.find(item => item.region === region);
        if (regionInfo) {
          setAvailableSoilTypes(regionInfo.soil);
        }
      }
    }
  }, [isOpen, initialData, region]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const loadSoilDataForRegion = (regionName: string) => {
    setIsLoadingSoil(true);
    
    setTimeout(() => {
      const soilInfo = getSoilDataForRegion(regionName);
      
      if (soilInfo) {
        setSoilData(soilInfo.soilData);
        setFormData(prev => ({
          ...prev,
          soilType: soilInfo.soilType,
          soilData: soilInfo.soilData
        }));

        const regionInfo = soilsData.find(item => item.region === regionName);
        if (regionInfo) {
          setAvailableSoilTypes(regionInfo.soil);
        }
      }
      
      setIsLoadingSoil(false);
    }, 500);
  };

  const handleSoilTypeChange = (soilType: string) => {
    if (!soilType) {
      setFormData(prev => ({ ...prev, soilType: "" }));
      setSoilData(null);
      return;
    }

    const newSoilData = getSoilDataByType(soilType);
    setSoilData(newSoilData);
    setFormData(prev => ({
      ...prev,
      soilType,
      soilData: newSoilData
    }));
    setIsEditingSoil(false);
  };

  const handleSoilDataChange = (field: keyof SoilData, value: number) => {
    if (!soilData) return;

    const updatedSoilData = {
      ...soilData,
      [field]: value
    };

    if (['clay', 'sand', 'silt'].includes(field)) {
      const total = updatedSoilData.clay + updatedSoilData.sand + updatedSoilData.silt;
      updatedSoilData.clay = Math.round((updatedSoilData.clay / total) * 100);
      updatedSoilData.sand = Math.round((updatedSoilData.sand / total) * 100);
      updatedSoilData.silt = 100 - updatedSoilData.clay - updatedSoilData.sand;
    }

    setSoilData(updatedSoilData);
    setFormData(prev => ({
      ...prev,
      soilData: updatedSoilData
    }));
  };

  const handleSegmentLengthChange = (index: number, value: number) => {
    const updatedSegments = [...manualSegmentLengths];
    updatedSegments[index] = {
      ...updatedSegments[index],
      length: value
    };
    
    setManualSegmentLengths(updatedSegments);
    
    setFormData(prev => ({
      ...prev,
      segmentLengths: updatedSegments
    }));
  };

  const handleCropSelect = (crop: Crop) => {
    setFormData(prev => ({ ...prev, crop: crop.name }));
    setSelectedCropDetails(crop);
    setSearchQuery("");
    setShowSearchResults(false);
    setSelectedCategory("");
  };

  const handleCropSelectFromCategory = (cropName: string) => {
    setFormData(prev => ({ ...prev, crop: cropName }));
    const cropDetails = ALL_CROPS.find(crop => crop.name === cropName);
    setSelectedCropDetails(cropDetails || null);
  };

  const handleCropReset = () => {
    setFormData(prev => ({ ...prev, crop: "" }));
    setSelectedCropDetails(null);
    setSearchQuery("");
  };

  const addOperation = () => {
    if (!newOperation.type || !newOperation.date) return;
    
    const operation: PlannedOperation = {
      ...newOperation,
      status: 'planned'
    };
    
    setFormData(prev => ({
      ...prev,
      plannedOperations: [...prev.plannedOperations, operation]
    }));
    
    setNewOperation({ type: "", date: "" });
  };

  const removeOperation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      plannedOperations: prev.plannedOperations.filter((_, i) => i !== index)
    }));
  };

  const addFertilizer = () => {
    if (!newFertilizer.type || !newFertilizer.name || !newFertilizer.applicationDate) return;
    
    setFormData(prev => ({
      ...prev,
      fertilizers: [...prev.fertilizers, { ...newFertilizer }]
    }));
    
    setNewFertilizer({
      type: "",
      name: "",
      applicationDate: "",
      amount: 0,
      unit: "кг/га"
    });
  };

  const removeFertilizer = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fertilizers: prev.fertilizers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("Пожалуйста, введите название поля");
      return;
    }
    
    if (points.length === 0) {
      alert("Поле должно иметь хотя бы одну точку");
      return;
    }

    const firstPoint = points[0];

    const fieldDataWithCoords: FieldData = {
      ...formData,
      id: initialData?.id || `field-${Date.now()}`,
      coordinates: { lat: firstPoint.lat, lng: firstPoint.lng },
      polygon: polygon,
      region: detectedRegion || region || formData.region || 'Регион не указан'
    };
    
    onSave(fieldDataWithCoords);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10000] p-4 overflow-y-auto modal-overlay"
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-[#172B3E] rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#2D4A62] shadow-2xl my-8 modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#E8F4FF]">
            {initialData ? "Редактировать поле" : "Добавить новое поле"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#8BA4B8] hover:text-[#E8F4FF] text-2xl font-bold transition-colors w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
                Название поля *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] placeholder-[#8BA4B8] focus:outline-none focus:border-[#3388ff] transition-colors"
                placeholder="Введите название поля"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
                Площадь поля (га) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.area}
                  readOnly
                  className="flex-1 px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="text-[#8BA4B8] text-sm whitespace-nowrap">
                  ≈ {(formData.area * 10000).toLocaleString('ru-RU')} м²
                </div>
              </div>
              <div className="text-[#8BA4B8] text-xs mt-1">
                Площадь рассчитывается автоматически на основе длин сторон
              </div>
            </div>
          </div>

          {(detectedRegion || region) && (
            <div>
              <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
                Регион
              </label>
              <input
                type="text"
                value={detectedRegion || region}
                readOnly
                className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#8BA4B8] cursor-default select-none"
              />
              {availableSoilTypes.length > 0 && (
                <div className="text-[#8BA4B8] text-xs mt-1">
                  Доступные типы почв в регионе: {availableSoilTypes.join(', ')}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
              Длины сторон поля (метры) *
            </label>
            <div className="bg-[#0F1F2F] rounded-lg p-4 border border-[#2D4A62] space-y-3">
              {manualSegmentLengths.map((segment, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1">
                  <span className="text-[#8BA4B8] text-sm min-w-[120px]">Сторона {segment.segment}:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={segment.length}
                      onChange={(e) => handleSegmentLengthChange(index, parseInt(e.target.value) || 0)}
                      min="1"
                      required
                      className="w-24 px-2 py-1 bg-[#2D4A62] border border-[#3A5A7A] rounded text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-[#E8F4FF] text-sm whitespace-nowrap">метров</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-[#8BA4B8]">
                Тип почвы *
                {isLoadingSoil && (
                  <span className="ml-2 text-yellow-400 text-sm">(определение...)</span>
                )}
                {soilData && !isLoadingSoil && (
                  <span className="ml-2 text-green-400 text-sm">(определено автоматически)</span>
                )}
              </label>
              {soilData && (
                <button
                  type="button"
                  onClick={() => setIsEditingSoil(!isEditingSoil)}
                  className="text-sm text-[#3388ff] hover:text-[#2970cc] transition-colors"
                >
                  {isEditingSoil ? 'Завершить редактирование' : 'Редактировать характеристики'}
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <select
                  value={formData.soilType}
                  onChange={(e) => handleSoilTypeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] transition-colors appearance-none pr-8"
                >
                  <option value="">Выберите тип почвы</option>
                  {ALL_SOIL_TYPES.map(soilType => (
                    <option key={soilType} value={soilType}>{soilType}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none -translate-x-0.5">
                  <svg className="w-4 h-4 text-[#8BA4B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {soilData && (
                <div className="bg-[#0F1F2F] rounded-lg p-4 border border-[#2D4A62]">
                  <h4 className="text-[#E8F4FF] font-medium mb-3">Характеристики почвы:</h4>
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[#8BA4B8] whitespace-nowrap">pH:</span>
                      {isEditingSoil ? (
                        <input
                          type="number"
                          step="0.1"
                          min="3"
                          max="10"
                          value={soilData.ph}
                          onChange={(e) => handleSoilDataChange('ph', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-[#2D4A62] border border-[#3A5A7A] rounded text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                        />
                      ) : (
                        <span className="text-[#E8F4FF]">{soilData.ph.toFixed(1)}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[#8BA4B8] whitespace-nowrap">Орг. углерод:</span>
                      {isEditingSoil ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="20"
                            value={soilData.organicCarbon}
                            onChange={(e) => handleSoilDataChange('organicCarbon', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-[#2D4A62] border border-[#3A5A7A] rounded text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                          />
                          <span className="text-[#8BA4B8]">%</span>
                        </div>
                      ) : (
                        <span className="text-[#E8F4FF]">{soilData.organicCarbon.toFixed(1)}%</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[#8BA4B8] whitespace-nowrap">Глина:</span>
                      {isEditingSoil ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={soilData.clay}
                            onChange={(e) => handleSoilDataChange('clay', parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-[#2D4A62] border border-[#3A5A7A] rounded text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                          />
                          <span className="text-[#8BA4B8]">%</span>
                        </div>
                      ) : (
                        <span className="text-[#E8F4FF]">{soilData.clay}%</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[#8BA4B8] whitespace-nowrap">Песок:</span>
                      {isEditingSoil ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={soilData.sand}
                            onChange={(e) => handleSoilDataChange('sand', parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-[#2D4A62] border border-[#3A5A7A] rounded text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                          />
                          <span className="text-[#8BA4B8]">%</span>
                        </div>
                      ) : (
                        <span className="text-[#E8F4FF]">{soilData.sand}%</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[#8BA4B8] whitespace-nowrap">Ил:</span>
                      {isEditingSoil ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={soilData.silt}
                            onChange={(e) => handleSoilDataChange('silt', parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-[#2D4A62] border border-[#3A5A7A] rounded text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                          />
                          <span className="text-[#8BA4B8]">%</span>
                        </div>
                      ) : (
                        <span className="text-[#E8F4FF]">{soilData.silt}%</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[#8BA4B8] whitespace-nowrap">Азот:</span>
                      {isEditingSoil ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            max="1"
                            value={soilData.nitrogen}
                            onChange={(e) => handleSoilDataChange('nitrogen', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-[#2D4A62] border border-[#3A5A7A] rounded text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                          />
                          <span className="text-[#8BA4B8]">%</span>
                        </div>
                      ) : (
                        <span className="text-[#E8F4FF]">{soilData.nitrogen.toFixed(3)}%</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[#8BA4B8] whitespace-nowrap">Фосфор:</span>
                      {isEditingSoil ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1000"
                            value={soilData.phosphorus}
                            onChange={(e) => handleSoilDataChange('phosphorus', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-[#2D4A62] border border-[#3A5A7A] rounded text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                          />
                          <span className="text-[#8BA4B8]">мг/кг</span>
                        </div>
                      ) : (
                        <span className="text-[#E8F4FF]">{soilData.phosphorus.toFixed(1)} мг/кг</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[#8BA4B8] whitespace-nowrap">Калий:</span>
                      {isEditingSoil ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1000"
                            value={soilData.potassium}
                            onChange={(e) => handleSoilDataChange('potassium', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-[#2D4A62] border border-[#3A5A7A] rounded text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                          />
                          <span className="text-[#8BA4B8]">мг/кг</span>
                        </div>
                      ) : (
                        <span className="text-[#E8F4FF]">{soilData.potassium.toFixed(1)} мг/кг</span>
                      )}
                    </div>
                  </div>
                  
                  {isEditingSoil && (
                    <div className="mt-3 p-3 bg-blue-900 bg-opacity-20 rounded-lg border border-blue-700">
                      <div className="text-blue-300 text-xs">
                        <strong>Внимание:</strong> При изменении глины, песка или ила автоматически пересчитывается гранулометрический состав.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-[#3388ff] bg-[#0F1F2F] border-[#2D4A62] rounded focus:ring-[#3388ff]"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-[#8BA4B8]">
              Поле активно (посажена культура)
            </label>
          </div>

          {formData.isActive && (
            <div>
              <label className="block text-sm font-medium text-[#8BA4B8] mb-3">
                Выберите культуру *
              </label>
              
              <div className="bg-[#0F1F2F] rounded-lg p-4 border border-[#2D4A62]">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#8BA4B8] mb-2">Поиск культур</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Введите название культуры на русском или латыни..."
                      className="w-full px-3 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] placeholder-[#8BA4B8] focus:outline-none focus:border-[#3388ff] transition-colors"
                    />
                    
                    {showSearchResults && (
                      <div className="absolute z-10 w-full mt-1 bg-[#1E3A5C] border border-[#3388ff] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.length > 0 ? (
                          searchResults.map(crop => (
                            <button
                              key={crop.id}
                              type="button"
                              onClick={() => handleCropSelect(crop)}
                              className="w-full px-3 py-2 text-left hover:bg-[#2D4A62] transition-colors border-b border-[#2D4A62] last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                            >
                              <div className="text-[#E8F4FF] font-medium">{crop.name}</div>
                              <div className="text-[#8BA4B8] text-sm italic">{crop.latin}</div>
                              <div className="text-[#8BA4B8] text-xs mt-1">
                                {crop.categories.join(", ")} • {crop.type}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-[#8BA4B8] text-sm rounded-lg">
                            Культуры не найдены
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#8BA4B8] mb-2">Или выберите из категорий</label>
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setFormData(prev => ({ ...prev, crop: "" }));
                        setSelectedCropDetails(null);
                      }}
                      className="w-full px-3 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] transition-colors appearance-none pr-8"
                    >
                      <option value="">Выберите категорию</option>
                      {Object.keys(CROP_CATEGORIES).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none -translate-x-0.5">
                      <svg className="w-4 h-4 text-[#8BA4B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {selectedCategory && (
                  <div>
                    <label className="block text-sm font-medium text-[#8BA4B8] mb-2">Конкретная культура</label>
                    <div className="max-h-60 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {CROP_CATEGORIES[selectedCategory].map(cropName => {
                          const crop = ALL_CROPS.find(c => c.name === cropName);
                          return (
                            <button
                              key={cropName}
                              type="button"
                              onClick={() => handleCropSelectFromCategory(cropName)}
                              className={`p-3 rounded-lg text-left transition-colors ${
                                formData.crop === cropName 
                                  ? 'bg-[#3388ff] text-white' 
                                  : 'bg-[#2D4A62] text-[#8BA4B8] hover:bg-[#3A5A7A] hover:text-[#E8F4FF]'
                              }`}
                            >
                              <div className="font-medium">{cropName}</div>
                              {crop && (
                                <div className="text-sm italic text-opacity-80 mt-1">
                                  {crop.latin}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {formData.crop && selectedCropDetails && (
                  <div className="mt-3 p-3 bg-green-900 bg-opacity-20 rounded-lg border border-green-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-green-400 text-sm font-medium">
                          Выбрана культура: <strong>{selectedCropDetails.name}</strong>
                        </div>
                        <div className="text-green-300 text-xs italic mt-1">
                          {selectedCropDetails.latin}
                        </div>
                        <div className="text-green-200 text-xs mt-2">
                          <strong>Категории:</strong> {selectedCropDetails.categories.join(", ")}
                        </div>
                        <div className="text-green-200 text-xs">
                          <strong>Тип:</strong> {selectedCropDetails.type}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCropReset}
                        className="text-red-400 hover:text-red-300 text-sm transition-colors ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
                
                {formData.crop && !selectedCropDetails && (
                  <div className="mt-3 p-3 bg-green-900 bg-opacity-20 rounded-lg border border-green-700">
                    <div className="text-green-400 text-sm">
                      Выбрана культура: <strong>{formData.crop}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          

          <div className="bg-[#0F1F2F] rounded-lg p-4 border border-[#2D4A62]">
            <div className="flex items-center space-x-3 mb-3">
              <input
                type="checkbox"
                id="hasIrrigation"
                checked={formData.irrigationSystem.hasSystem}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  irrigationSystem: {
                    ...prev.irrigationSystem,
                    hasSystem: e.target.checked
                  }
                }))}
                className="w-4 h-4 text-[#3388ff] bg-[#0F1F2F] border-[#2D4A62] rounded focus:ring-[#3388ff]"
              />
              <label htmlFor="hasIrrigation" className="text-sm font-medium text-[#8BA4B8]">
                На поле есть система орошения
              </label>
            </div>

            {formData.irrigationSystem.hasSystem && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
                    Тип системы орошения
                  </label>
                  <div className="relative">
                    <select
                      value={formData.irrigationSystem.type}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        irrigationSystem: {
                          ...prev.irrigationSystem,
                          type: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] transition-colors appearance-none pr-8"
                    >
                      <option value="">Выберите тип орошения</option>
                      {IRRIGATION_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none -translate-x-0.5">
                      <svg className="w-4 h-4 text-[#8BA4B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
                    Описание системы орошения
                  </label>
                  <textarea
                    value={formData.irrigationSystem.description}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      irrigationSystem: {
                        ...prev.irrigationSystem,
                        description: e.target.value
                      }
                    }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] placeholder-[#8BA4B8] focus:outline-none focus:border-[#3388ff] transition-colors"
                    placeholder="Описание состояния и характеристик системы орошения..."
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8BA4B8] mb-3">
              Планируемые работы
            </label>
            
            <div className="bg-[#0F1F2F] rounded-lg p-4 space-y-3 border border-[#2D4A62]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="relative">
                  <select
                    value={newOperation.type}
                    onChange={(e) => setNewOperation(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors appearance-none pr-8"
                  >
                    <option value="">Тип работы</option>
                    {OPERATION_TYPES.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none -translate-x-0.5">
                    <svg className="w-4 h-4 text-[#8BA4B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                <input
                  type="date"
                  value={newOperation.date}
                  onChange={(e) => setNewOperation(prev => ({ ...prev, date: e.target.value }))}
                  className="px-3 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                />
                
                <button
                  type="button"
                  onClick={addOperation}
                  disabled={!newOperation.type || !newOperation.date}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  Добавить
                </button>
              </div>

              {formData.plannedOperations.length > 0 && (
                <div className="space-y-2">
                  {formData.plannedOperations.map((operation, index) => (
                    <div key={index} className="flex justify-between items-center bg-[#2D4A62] p-3 rounded-lg">
                      <div>
                        <span className="text-[#E8F4FF] text-sm">{operation.type}</span>
                        <span className="text-[#8BA4B8] text-sm ml-2">({new Date(operation.date).toLocaleDateString('ru-RU')})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOperation(index)}
                        className="text-red-400 hover:text-red-300 text-sm transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8BA4B8] mb-3">
              Удобрения (использованные/планируемые)
            </label>
            
            <div className="bg-[#0F1F2F] rounded-lg p-4 space-y-3 border border-[#2D4A62]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                <div className="relative">
                  <select
                    value={newFertilizer.type}
                    onChange={(e) => setNewFertilizer(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors appearance-none pr-8"
                  >
                    <option value="">Тип удобрения</option>
                    {FERTILIZER_TYPES.map(fert => (
                      <option key={fert} value={fert}>{fert}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none -translate-x-0.5">
                    <svg className="w-4 h-4 text-[#8BA4B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                <input
                  type="text"
                  value={newFertilizer.name}
                  onChange={(e) => setNewFertilizer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Название"
                  className="px-3 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] text-sm placeholder-[#8BA4B8] focus:outline-none focus:border-[#3388ff] transition-colors"
                />
                
                <input
                  type="date"
                  value={newFertilizer.applicationDate}
                  onChange={(e) => setNewFertilizer(prev => ({ ...prev, applicationDate: e.target.value }))}
                  className="px-3 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors"
                />
                
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newFertilizer.amount}
                    onChange={(e) => setNewFertilizer(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                    placeholder="Кол-во"
                    className="w-20 px-2 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="relative">
                    <select
                      value={newFertilizer.unit}
                      onChange={(e) => setNewFertilizer(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-17 px-2 py-2 bg-[#2D4A62] border border-[#3A5A7A] rounded-lg text-[#E8F4FF] text-sm focus:outline-none focus:border-[#3388ff] transition-colors appearance-none pr-6"
                    >
                      <option value="кг/га">кг/га</option>
                      <option value="т/га">т/га</option>
                      <option value="л/га">л/га</option>
                      <option value="ц/га">ц/га</option>
                    </select>
                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2 pointer-events-none -translate-x-0.5">
                      <svg className="w-3 h-3 text-[#8BA4B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addFertilizer}
                  disabled={!newFertilizer.type || !newFertilizer.name || !newFertilizer.applicationDate}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  Добавить
                </button>
              </div>

              {formData.fertilizers.length > 0 && (
                <div className="space-y-2">
                  {formData.fertilizers.map((fertilizer, index) => (
                    <div key={index} className="flex justify-between items-center bg-[#2D4A62] p-3 rounded-lg">
                      <div className="flex-1">
                        <div className="text-[#E8F4FF] text-sm font-medium">{fertilizer.name}</div>
                        <div className="text-[#8BA4B8] text-xs">
                          {fertilizer.type} • {fertilizer.amount} {fertilizer.unit} • {new Date(fertilizer.applicationDate).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFertilizer(index)}
                        className="text-red-400 hover:text-red-300 text-sm ml-2 transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
            Заметки
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] placeholder-[#8BA4B8] focus:outline-none focus:border-[#3388ff] transition-colors"
              placeholder="Дополнительная информация о поле..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#2D4A62]">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-[#2D4A62] text-[#E8F4FF] rounded-lg hover:bg-[#3A5A7A] transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#3388ff] text-white rounded-lg hover:bg-[#2970cc] transition-colors"
            >
              {initialData ? "Обновить поле" : "Сохранить поле"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}