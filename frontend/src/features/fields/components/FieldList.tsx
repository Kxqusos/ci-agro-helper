"use client";
import { MapPin } from "lucide-react";

interface FieldData {
  id: string;
  name: string;
  area: number;
  crop: string;
  isActive: boolean;
}

interface FieldListProps {
  fields: FieldData[];
  selectedField: string | null;
  onFieldSelect: (id: string) => void;
  onNewField: () => void;
}

export default function FieldList({ fields, selectedField, onFieldSelect, onNewField }: FieldListProps) {
  return (
    <div className="mb-4 sm:mb-5 md:mb-6">
      <h3 className="text-[#E8F4FF] text-sm sm:text-base md:text-lg lg:text-xl xl:text-xl 3xl:text-2xl font-semibold mb-2 sm:mb-3">Мои поля</h3>
      
      <div className="flex space-x-2 sm:space-x-3 overflow-x-auto pb-2 sm:pb-3 scrollbar-thin scrollbar-thumb-[#2D4A62] scrollbar-track-[#0F1F2F]">
        {fields.map((field) => (
          <div
            key={field.id}
            onClick={() => onFieldSelect(field.id)}
            className={`flex-shrink-0 w-28 sm:w-32 md:w-36 lg:w-40 xl:w-44 2xl:w-48 3xl:w-52 p-2 sm:p-3 rounded-lg cursor-pointer transition-all border-2 ${
              selectedField === field.id
                ? "bg-[#2D4A62] border-[#E8F4FF]"
                : "bg-[#0F1F2F] border-[#2D4A62] hover:border-[#8BA4B8]"
            }`}
          >
            <div className="text-[#E8F4FF] font-medium text-xs sm:text-sm md:text-base lg:text-lg xl:text-lg 3xl:text-xl truncate">
              {field.name}
            </div>
            <div className="text-[#8BA4B8] text-xs sm:text-sm md:text-base lg:text-base xl:text-lg 3xl:text-lg mt-1">
              {field.area.toFixed(2)} га
            </div>
            <div className="text-[#8BA4B8] text-xs sm:text-sm md:text-base lg:text-base xl:text-lg 3xl:text-lg truncate">
              {field.crop || 'Не указана'}
            </div>
            <div className={`text-xs sm:text-sm md:text-base lg:text-base xl:text-lg 3xl:text-lg mt-1 ${
              field.isActive ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {field.isActive ? 'Активно' : 'Не активно'}
            </div>
          </div>
        ))}
        
        <div
          className="flex-shrink-0 w-28 sm:w-32 md:w-36 lg:w-40 xl:w-44 2xl:w-48 3xl:w-52 p-2 sm:p-3 rounded-lg transition-all border-2 border-dashed border-[#2D4A62] flex flex-col items-center justify-center cursor-pointer hover:border-[#8BA4B8] hover:bg-[#1A2E42] group"
          onClick={onNewField}
        >
          <MapPin className="text-[#8BA4B8] group-hover:text-[#4ECDC4] w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-10 lg:h-10 xl:w-12 xl:h-12 3xl:w-14 3xl:h-14 mb-1 transition-colors" />
          <div className="text-[#8BA4B8] group-hover:text-[#E8F4FF] text-xs sm:text-sm md:text-base lg:text-base xl:text-lg 3xl:text-xl text-center transition-colors">
            Создайте поля
          </div>
        </div>
      </div>
    </div>
  );
}