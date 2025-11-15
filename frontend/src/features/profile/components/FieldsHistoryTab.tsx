import { MapPin, Calendar, Crop, Trash2 } from "lucide-react";
import { FieldHistory } from "../hooks/useProfile";

interface FieldsHistoryTabProps {
  fields: FieldHistory[];
  onFieldDelete: (fieldId: string) => void;
}

export default function FieldsHistoryTab({ fields, onFieldDelete }: FieldsHistoryTabProps) {
  const deleteField = (fieldId: string) => {
    if (confirm("Вы уверены, что хотите удалить это поле из истории?")) {
      onFieldDelete(fieldId);
    }
  };

  return (
    <div className="bg-[#172B3E] rounded-2xl p-4 sm:p-6 border border-[#2D4A62]">
      <h3 className="text-lg sm:text-xl font-semibold text-[#E8F4FF] mb-4 sm:mb-6">История полей</h3>

      <div className="space-y-4">
        {fields.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-[#8BA4B8] mx-auto mb-3 sm:mb-4" />
            <p className="text-[#8BA4B8] text-sm sm:text-base">У вас пока нет созданных полей</p>
          </div>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="bg-[#0F1F2F] border border-[#2D4A62] rounded-lg p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                <div className="flex-1">
                  <h4 className="text-base sm:text-lg font-semibold text-[#E8F4FF]">{field.name}</h4>
                  <p className="text-[#8BA4B8] text-xs sm:text-sm">
                    Создано: {new Date(field.created).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    field.status === "active" ? "bg-green-500" : "bg-gray-500"
                  } text-white`}>
                    {field.status === "active" ? "Активно" : "Архив"}
                  </span>
                  <button
                    onClick={() => deleteField(field.id)}
                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    title="Удалить поле"
                  >
                    <Trash2 size={14} className="sm:size-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Crop size={14} className="text-[#8BA4B8] sm:size-4" />
                  <span className="text-[#8BA4B8]">Культура:</span>
                  <span className="text-[#E8F4FF]">{field.crop}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <MapPin size={14} className="text-[#8BA4B8] sm:size-4" />
                  <span className="text-[#8BA4B8]">Площадь:</span>
                  <span className="text-[#E8F4FF]">{field.area} га</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[#8BA4B8]">Регион:</span>
                  <span className="text-[#E8F4FF] text-xs sm:text-sm">
                    {field.region || "Не указан"}
                  </span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar size={14} className="text-[#8BA4B8] sm:size-4" />
                  <span className="text-[#8BA4B8]">В работе:</span>
                  <span className="text-[#E8F4FF]">
                    {Math.floor((new Date().getTime() - new Date(field.created).getTime()) / (1000 * 60 * 60 * 24))} дн.
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
