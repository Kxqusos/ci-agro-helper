import { 
  MapPin,
  Crop,
  Ruler,
  Mountain,
  Sprout,
  Calendar,
  Droplets,
  Wrench,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';


interface FieldInfoTabProps {
  fieldData?: {
    name: string;
    area: number;
    crop: string;
    soilType: string;
    region: string;
    location: string;
    isActive: boolean;
    coordinates?: { lat: number; lng: number };
    notes?: string;
    plannedOperations?: Array<{
      type: string;
      date: string;
      status: string;
    }>;
    fertilizers?: Array<{
      type: string;
      name: string;
      applicationDate: string;
      amount: number;
      unit: string;
    }>;
    irrigationSystem?: {
      hasSystem: boolean;
      type: string;
      description: string;
    };
    soilData?: {
      ph: number;
      organicCarbon: number;
      clay: number;
      sand: number;
      silt: number;
      nitrogen: number;
      phosphorus: number;
      potassium: number;
    };
  };
  onNotesChange?: (notes: string) => void;
}

export default function FieldInfoTab({ fieldData, onNotesChange }: FieldInfoTabProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'soil' | 'operations' | 'notes'>('overview');
  const [notes, setNotes] = useState(fieldData?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!fieldData) {
    return (
      <div className="text-[#E8F4FF] h-full flex flex-col">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold mb-3 sm:mb-4">
          Информация о поле
        </h3>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-[#8BA4B8] text-center mb-4">
            <div className="flex justify-center mb-2">
              <MapPin className="w-12 h-12" />
            </div>
            <div className="text-xs sm:text-sm">
              Создайте поле на карте<br />для просмотра информации
            </div>
          </div>
          <div className="bg-[#1A2E42] rounded-lg p-3 max-w-xs">
            <div className="text-[#8BA4B8] text-xs mb-2">Доступная информация:</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                <span>Название и площадь поля</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                <span>Текущая культура и фаза роста</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                <span>Тип почвы и характеристики</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                <span>История обработок и урожаев</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleSaveNotes = async () => {
    if (onNotesChange) {
      setIsSaving(true);
      try {
        await onNotesChange(notes);
      } catch (error) {
        console.error('Ошибка при сохранении заметок:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const OverviewTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-2">
            <Ruler className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-yellow-400 flex-shrink-0" />
            <div className="text-[#8BA4B8] text-xs truncate">Площадь</div>
          </div>
          <div className="text-base sm:text-lg font-bold text-yellow-400 break-words">
            {fieldData.area} га
          </div>
        </div>
        
        <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-2">
            <Sprout className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-orange-400 flex-shrink-0" />
            <div className="text-[#8BA4B8] text-xs truncate">Культура</div>
          </div>
          <div className="text-base sm:text-lg font-bold text-orange-400 break-words">
            {fieldData.crop || "Не указана"}
            {!fieldData.isActive && fieldData.crop && (
              <span className="text-xs text-red-400 ml-1 lg:ml-2 whitespace-nowrap">(не активна)</span>
            )}
          </div>
        </div>
        
        <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-2">
            <Mountain className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-400 flex-shrink-0" />
            <div className="text-[#8BA4B8] text-xs truncate">Тип почвы</div>
          </div>
          <div className="text-base sm:text-lg font-bold text-blue-400 break-words">
            {fieldData.soilType || "Не указан"}
          </div>
        </div>
        
        <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-2">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-cyan-400 flex-shrink-0" />
            <div className="text-[#8BA4B8] text-xs truncate">Регион</div>
          </div>
          <div className="text-sm font-bold text-cyan-400 break-words">
            {fieldData.region || "Регион не указан"}
          </div>
        </div>
      </div>

      {fieldData.irrigationSystem?.hasSystem && (
        <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-3">
            <Droplets className="w-4 h-4 mr-2 text-[#8BA4B8] flex-shrink-0" />
            <div className="text-[#8BA4B8] text-sm font-medium truncate">
              Система орошения
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-[#E8F4FF]">
            <div className="flex items-start p-2 bg-[#2D4A62] rounded">
              <span className="text-blue-400 mr-2 flex-shrink-0 mt-0.5">•</span>
              <span className="break-words"><strong>Тип:</strong> {fieldData.irrigationSystem.type}</span>
            </div>
            {fieldData.irrigationSystem.description && (
              <div className="flex items-start p-2 bg-[#2D4A62] rounded">
                <span className="text-blue-400 mr-2 flex-shrink-0 mt-0.5">•</span>
                <span className="break-words"><strong>Описание:</strong> {fieldData.irrigationSystem.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const SoilTab = () => (
    <div className="space-y-4">
      {fieldData.soilData ? (
        <>
          <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62]">
            <div className="flex items-center mb-3">
              <Mountain className="w-4 h-4 mr-2 text-[#8BA4B8] flex-shrink-0" />
              <div className="text-[#8BA4B8] text-sm font-medium truncate">
                Характеристики почвы
              </div>
            </div>
            
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 text-sm">
              <div className="text-center p-3 bg-[#2D4A62] rounded">
                <div className="text-[#8BA4B8] truncate">pH</div>
                <div className="text-[#E8F4FF] font-bold truncate">{fieldData.soilData.ph.toFixed(1)}</div>
              </div>
              <div className="text-center p-3 bg-[#2D4A62] rounded">
                <div className="text-[#8BA4B8] truncate">Орг. углерод</div>
                <div className="text-[#E8F4FF] font-bold truncate">{fieldData.soilData.organicCarbon.toFixed(1)}%</div>
              </div>
              <div className="text-center p-3 bg-[#2D4A62] rounded">
                <div className="text-[#8BA4B8] truncate">Азот</div>
                <div className="text-[#E8F4FF] font-bold truncate">{fieldData.soilData.nitrogen.toFixed(3)}%</div>
              </div>
              <div className="text-center p-3 bg-[#2D4A62] rounded">
                <div className="text-[#8BA4B8] truncate">Фосфор</div>
                <div className="text-[#E8F4FF] font-bold truncate">{fieldData.soilData.phosphorus.toFixed(1)} мг/кг</div>
              </div>
              <div className="text-center p-3 bg-[#2D4A62] rounded">
                <div className="text-[#8BA4B8] truncate">Калий</div>
                <div className="text-[#E8F4FF] font-bold truncate">{fieldData.soilData.potassium.toFixed(1)} мг/кг</div>
              </div>
              <div className="text-center p-3 bg-[#2D4A62] rounded">
                <div className="text-[#8BA4B8] truncate">Глина</div>
                <div className="text-[#E8F4FF] font-bold truncate">{fieldData.soilData.clay}%</div>
              </div>
              <div className="text-center p-3 bg-[#2D4A62] rounded">
                <div className="text-[#8BA4B8] truncate">Песок</div>
                <div className="text-[#E8F4FF] font-bold truncate">{fieldData.soilData.sand}%</div>
              </div>
              <div className="text-center p-3 bg-[#2D4A62] rounded">
                <div className="text-[#8BA4B8] truncate">Ил</div>
                <div className="text-[#E8F4FF] font-bold truncate">{fieldData.soilData.silt}%</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-[#1A2E42] p-6 rounded-lg border border-[#2D4A62] text-center">
          <div className="text-[#8BA4B8] text-sm">
            Данные о почве не указаны
          </div>
        </div>
      )}
    </div>
  );

  const OperationsTab = () => (
    <div className="space-y-4">

      {fieldData.plannedOperations && fieldData.plannedOperations.length > 0 ? (
        <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-3">
            <Calendar className="w-4 h-4 mr-2 text-[#8BA4B8] flex-shrink-0" />
            <div className="text-[#8BA4B8] text-sm font-medium truncate">
              Планируемые работы ({fieldData.plannedOperations.length})
            </div>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {fieldData.plannedOperations.map((operation, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-[#2D4A62] rounded text-sm">
                <span className="text-[#E8F4FF] truncate flex-1 mr-2">{operation.type}</span>
                <span className="text-[#8BA4B8] whitespace-nowrap flex-shrink-0">{formatDate(operation.date)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62] text-center">
          <div className="text-[#8BA4B8] text-sm">
            Планируемые работы не указаны
          </div>
        </div>
      )}

      {fieldData.fertilizers && fieldData.fertilizers.length > 0 ? (
        <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62]">
          <div className="flex items-center mb-3">
            <Wrench className="w-4 h-4 mr-2 text-[#8BA4B8] flex-shrink-0" />
            <div className="text-[#8BA4B8] text-sm font-medium truncate">
              Удобрения ({fieldData.fertilizers.length})
            </div>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {fieldData.fertilizers.map((fertilizer, index) => (
              <div key={index} className="p-3 bg-[#2D4A62] rounded text-sm">
                <div className="text-[#E8F4FF] font-medium break-words">{fertilizer.name}</div>
                <div className="text-[#8BA4B8] break-words">
                  {fertilizer.type} • {fertilizer.amount} {fertilizer.unit} • {formatDate(fertilizer.applicationDate)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62] text-center">
          <div className="text-[#8BA4B8] text-sm">
            Удобрения не указаны
          </div>
        </div>
      )}
    </div>
  );

const NotesTab = () => {
  const [localNotes, setLocalNotes] = useState(fieldData?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Инициализация при смене поля
  useEffect(() => {
    setLocalNotes(fieldData?.notes || '');
  }, [fieldData?.name]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotes(e.target.value);
  };

  const handleSave = async () => {
    if (onNotesChange) {
      setIsSaving(true);
      try {
        await onNotesChange(localNotes);
      } catch (err) {
        console.error('Ошибка при сохранении заметок:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#1A2E42] p-4 rounded-lg border border-[#2D4A62]">
        <div className="flex items-center mb-3">
          <FileText className="w-4 h-4 mr-2 text-[#8BA4B8] flex-shrink-0" />
          <div className="text-[#8BA4B8] text-sm font-medium truncate">
            Заметки
          </div>
        </div>

        <textarea
          value={localNotes}
          onChange={handleChange}
          placeholder="Введите ваши заметки о поле..."
          className="w-full h-80 p-3 bg-[#2D4A62] rounded border border-[#3A5A7A] text-[#E8F4FF] text-sm placeholder-[#8BA4B8] resize-y focus:outline-none focus:border-[#4ECDC4] transition-colors"
        />

<div className="flex justify-end items-center mt-3">
  <button
    onClick={handleSave}
    disabled={isSaving}
    className="px-4 py-2 bg-[#2ac334] text-[#1A2E42] text-sm font-medium rounded hover:bg-[#6BD472] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {isSaving ? 'Сохранение...' : 'Сохранить'}
  </button>
</div>
      </div>
    </div>
  );
};


  return (
    <div className="text-[#E8F4FF] h-full flex flex-col pb-4">
      <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold mb-3 sm:mb-5">
        {fieldData.name}
      </h3>
    
      <div className="flex justify-center mb-4 border-b border-[#2D4A62]">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center flex-shrink-0 pb-2 px-3 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'overview' ? "text-[#4ECDC4] border-b-2 border-[#4ECDC4]" : "text-[#8BA4B8] hover:text-[#4ECDC4]"
            }`}
          >
            <Ruler size={16} className="mr-1 sm:mr-2" />
            Обзор
          </button>
          <button
            onClick={() => setActiveTab('soil')}
            className={`flex items-center flex-shrink-0 pb-2 px-3 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'soil' ? "text-[#6BC5FF] border-b-2 border-[#6BC5FF]" : "text-[#8BA4B8] hover:text-[#6BC5FF]"
            }`}
          >
            <Mountain size={16} className="mr-1 sm:mr-2" />
            Почва
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex items-center flex-shrink-0 pb-2 px-3 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'operations' ? "text-[#FFD166] border-b-2 border-[#FFD166]" : "text-[#8BA4B8] hover:text-[#FFD166]"
            }`}
          >
            <Wrench size={16} className="mr-1 sm:mr-2" />
            Работы
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center flex-shrink-0 pb-2 px-3 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === 'notes' ? "text-[#7AE582] border-b-2 border-[#7AE582]" : "text-[#8BA4B8] hover:text-[#7AE582]"
            }`}
          >
            <FileText size={16} className="mr-1 sm:mr-2" />
            Заметки
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'soil' && <SoilTab />}
        {activeTab === 'operations' && <OperationsTab />}
        {activeTab === 'notes' && <NotesTab />}
      </div>
    </div>
  );
}