"use client";
import { useState, useCallback } from "react";
import FieldCanvasWithMap from "@/features/fields/components/FieldCanvasWithMap";
import FieldInfoTab from "@/features/fields/components/FieldInfoTab";
import WeatherTab from "@/features/weather/components/WeatherTab";
import SatelliteTab from "@/features/analytics/components/SatelliteTab";
import FieldList from "@/features/fields/components/FieldList";
import FieldModal from "@/features/fields/components/FieldModal";
import type { FieldData, LLPoint } from "@/features/fields/types";

import { 
  Info,
  Cloud,
  Satellite,
  Edit,
  Trash2
} from "lucide-react";

export default function CenterDashboard() {
  const [activeTab, setActiveTab] = useState("info");
  const [showHelp, setShowHelp] = useState(false);
  const [fields, setFields] = useState<FieldData[]>([]);
  const [selectedField, setSelectedField] = useState<FieldData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<LLPoint[]>([]);
  const [tempFieldData, setTempFieldData] = useState<FieldData | null>(null);
  
  const handleShapeComplete = useCallback((points: LLPoint[]) => {
  }, []);

  const handleFieldCreated = useCallback((fieldData: FieldData) => {
    setTempFieldData(fieldData);
    setCurrentPolygon(fieldData.polygon);
    setIsCreateModalOpen(true);
  }, []);

  const handleFieldSave = useCallback((fieldData: FieldData) => {
    const newField: FieldData = {
      ...fieldData,
      id: fieldData.id.startsWith('temp-field-') ? `field-${Date.now()}` : fieldData.id,
      polygon: fieldData.polygon || currentPolygon
    };

    setFields(prev => [...prev, newField]);
    setSelectedField(newField);
    setIsCreateModalOpen(false);
    setCurrentPolygon([]);
    setTempFieldData(null);
  }, [currentPolygon]);

  const handleFieldSelect = useCallback((fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      setSelectedField(field);
    }
  }, [fields]);

  const handleFieldUpdate = useCallback((updatedField: FieldData) => {
    setFields(prev => prev.map(field => 
      field.id === updatedField.id ? updatedField : field
    ));
    if (selectedField?.id === updatedField.id) {
      setSelectedField(updatedField);
    }
    setIsEditModalOpen(false);
  }, [selectedField]);

  const handleFieldDelete = useCallback((fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(fields.find(f => f.id !== fieldId) || null);
    }
  }, [fields, selectedField]);

  const handleEditField = useCallback(() => {
    if (!selectedField) return;
    setIsEditModalOpen(true);
  }, [selectedField]);

  const handleNewField = useCallback(() => {
    setSelectedField(null);
  }, []);

  const handleDeleteField = useCallback(() => {
    if (!selectedField) return;
    
    if (confirm(`Вы уверены, что хотите удалить поле "${selectedField.name}"?`)) {
      handleFieldDelete(selectedField.id);
    }
  }, [selectedField, handleFieldDelete]);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setCurrentPolygon([]);
    setTempFieldData(null);
  }, []);

  return (
    <div className="flex flex-col items-center justify-start pt-20 md:pt-24 lg:pt-28 xl:pt-32 2xl:pt-36 3xl:pt-44 pb-10 md:pb-16">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <div className="flex flex-col w-full max-w-7xl 2xl:max-w-[1800px] 3xl:max-w-[2000px] gap-6 md:gap-8 lg:gap-6 xl:gap-8 2xl:gap-10 3xl:gap-12 mx-auto transition-all duration-300">
          <div className="bg-[#172B3E] rounded-2xl p-4 sm:p-5 md:p-6 lg:p-5 xl:p-6 2xl:p-7 3xl:p-8 w-full min-h-[600px] md:min-h-[700px] lg:min-h-[750px] xl:min-h-[800px] 2xl:min-h-[850px] 3xl:min-h-[900px] pointer-events-auto shadow-2xl border border-[#2D4A62] transition-all duration-300 relative z-10">

            <div className="flex justify-between items-center mb-4 sm:mb-5 lg:mb-4 xl:mb-5 3xl:mb-7 relative">
              <h2 className="text-[#E8F4FF] text-lg sm:text-xl md:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl 3xl:text-4xl font-semibold">
                Обзор поля
              </h2>

              <div className="relative flex items-center">
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  onMouseEnter={() => setShowHelp(true)}
                  onMouseLeave={() => setShowHelp(false)}
                  className="w-8 h-8 bg-[#2D4A62] rounded-full flex items-center justify-center text-[#E8F4FF] hover:bg-[#3A5A7A] transition-colors ml-2"
                  title="Помощь по работе с картой"
                >
                  <span className="text-sm font-bold">?</span>
                </button>

                {showHelp && (
                  <div className="absolute w-[280px] p-3 bg-[#1E3A5C] border border-[#3388ff] text-white rounded-lg shadow-lg pointer-events-none z-[9999] top-full right-0 mt-2">
                    <div className="text-sm font-medium mb-2 text-[#E8F4FF]">Работа с картой полей:</div>
                    <ul className="text-xs space-y-1 text-[#8BA4B8]">
                      <li>• Кликайте по карте, чтобы поставить точки границы поля</li>
                      <li>• Каждая точка соединяется линией с предыдущей</li>
                      <li>• Для завершения кликните на первую точку</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 md:gap-6 lg:gap-4 xl:gap-5 2xl:gap-6 h-full">

              <div className="lg:w-2/3 h-[400px] sm:h-[450px] md:h-[500px] lg:h-[550px] xl:h-[600px] 2xl:h-[650px] 3xl:h-[700px] relative">
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#0F1F2F] rounded-xl border border-[#2D4A62]">
                  <FieldCanvasWithMap 
                    onFieldCreated={handleFieldCreated}
                    onShapeComplete={handleShapeComplete}
                    selectedField={selectedField}
                  />
                </div>
              </div>
              <div className="lg:w-1/3 flex flex-col h-[400px] sm:h-[450px] md:h-[500px] lg:h-[550px] xl:h-[600px] 2xl:h-[650px] 3xl:h-[700px]">

                <div className="flex justify-center mb-4 sm:mb-5 lg:mb-4 xl:mb-5 3xl:mb-6 border-b border-[#2D4A62]">
                  <div className="flex space-x-2 sm:space-x-3 lg:space-x-2 xl:space-x-3 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab("info")}
                      className={`flex items-center flex-shrink-0 pb-2 px-3 sm:px-4 lg:px-3 xl:px-4 text-sm sm:text-base md:text-lg lg:text-sm xl:text-base 2xl:text-lg 3xl:text-2xl font-medium transition-colors ${
                        activeTab === "info" ? "text-[#4ECDC4] border-b-2 border-[#4ECDC4]" : "text-[#8BA4B8] hover:text-[#4ECDC4]"
                      }`}
                    >
                      <Info size={18} className="mr-2 lg:mr-1 xl:mr-2" />
                      Информация
                    </button>
                    <button
                      onClick={() => setActiveTab("weather")}
                      className={`flex items-center flex-shrink-0 pb-2 px-3 sm:px-4 lg:px-3 xl:px-4 text-sm sm:text-base md:text-lg lg:text-sm xl:text-base 2xl:text-lg 3xl:text-2xl font-medium transition-colors ${
                        activeTab === "weather" ? "text-[#6BC5FF] border-b-2 border-[#6BC5FF]" : "text-[#8BA4B8] hover:text-[#6BC5FF]"
                      }`}
                    >
                      <Cloud size={18} className="mr-2 lg:mr-1 xl:mr-2" />
                      Погода
                    </button>
                    <button
                      onClick={() => setActiveTab("satellite")}
                      className={`flex items-center flex-shrink-0 pb-2 px-3 sm:px-4 lg:px-3 xl:px-4 text-sm sm:text-base md:text-lg lg:text-sm xl:text-base 2xl:text-lg 3xl:text-2xl font-medium transition-colors ${
                        activeTab === "satellite" ? "text-[#FFD166] border-b-2 border-[#FFD166]" : "text-[#8BA4B8] hover:text-[#FFD166]"
                      }`}
                    >
                      <Satellite size={18} className="mr-2 lg:mr-1 xl:mr-2" />
                      Спутник
                    </button>
                  </div>
                </div>
                <div className="bg-[#0F1F2F] rounded-xl flex-1 border border-[#2D4A62] p-4 sm:p-5 lg:p-4 xl:p-5 overflow-auto">
                  {activeTab === "info" && <FieldInfoTab fieldData={selectedField || undefined} />}
                  {activeTab === "weather" && <WeatherTab fieldId={selectedField?.id} coordinates={selectedField?.coordinates} />}
                  {activeTab === "satellite" && <SatelliteTab coords={selectedField?.coordinates} />}
                </div>
                {selectedField && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between items-stretch sm:items-center mt-4 sm:mt-5 lg:mt-4 xl:mt-5 pt-3 border-t border-[#2D4A62]">
                    <button
                      onClick={handleDeleteField}
                      className="flex items-center justify-center px-4 py-3 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors text-sm sm:text-base order-2 sm:order-1"
                    >
                      <Trash2 size={18} className="mr-2" />
                      Удалить поле
                    </button>
                    <button
                      onClick={handleEditField}
                      className="flex items-center justify-center px-4 py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors text-sm sm:text-base order-1 sm:order-2"
                    >
                      <Edit size={18} className="mr-2" />
                      Редактировать поле
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 sm:mt-7 md:mt-8 lg:mt-6 xl:mt-7 2xl:mt-8 pt-4 border-t border-[#2D4A62]">
              <div className="text-[#E8F4FF] text-base sm:text-lg md:text-xl lg:text-base xl:text-lg 2xl:text-xl font-medium mb-3">
              </div>
              
              <FieldList 
                fields={fields}
                selectedField={selectedField?.id || null}
                onFieldSelect={handleFieldSelect}
                onNewField={handleNewField}
              />
            </div>
          </div>

        </div>
      </div>

      {isCreateModalOpen && tempFieldData && (
        <FieldModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          onSave={handleFieldSave}
          points={tempFieldData.polygon}
          polygon={tempFieldData.polygon}
          region=""
          initialData={tempFieldData}
        />
      )}

      {isEditModalOpen && selectedField && (
        <FieldModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleFieldUpdate}
          points={selectedField.polygon || []}
          polygon={selectedField.polygon || []}
          region={selectedField.region}
          initialData={selectedField}
        />
      )}
    </div>
  );
}