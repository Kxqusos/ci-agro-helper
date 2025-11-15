import { useState } from "react";
import { Save, Calendar, MapPin } from "lucide-react";
import { UserProfile, ProfileUpdateData } from "../hooks/useProfile";

interface ProfileInfoTabProps {
  user: UserProfile;
  onUpdate: (data: ProfileUpdateData) => Promise<{ success: boolean; error?: string }>;
}

export default function ProfileInfoTab({ user, onUpdate }: ProfileInfoTabProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: user.username,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const result = await onUpdate(formData);
    setLoading(false);
    
    if (result.success) {
      setEditMode(false);
    } else {
      alert(result.error);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setFormData({
      username: user.username,
    });
  };

  return (
    <div className="bg-[#172B3E] rounded-2xl p-4 sm:p-6 border border-[#2D4A62]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-[#E8F4FF]">Основная информация</h3>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-[#3388ff] text-white rounded-lg hover:bg-[#2970cc] dark:hover:bg-[#2970cc] transition-colors text-sm sm:text-base"
          >
            Редактировать
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-[#2D4A62] text-[#E8F4FF] rounded-lg hover:bg-[#3A5A7A] dark:hover:bg-[#3A5A7A] transition-colors text-sm sm:text-base"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm sm:text-base"
            >
              <Save size={16} className="text-white" />
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
            Имя пользователя
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            disabled={!editMode}
            className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-[#3388ff] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
            Электронная почта
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#8BA4B8] opacity-50 cursor-not-allowed"
          />
          <p className="text-xs text-[#8BA4B8] mt-1">
            Для изменения email перейдите в раздел "Безопасность"
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 pt-4 border-t border-[#2D4A62]">
          <div className="bg-[#1A2E42] p-3 sm:p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-[#8BA4B8] sm:size-5" />
              <span className="text-[#8BA4B8] text-sm sm:text-base">Дата регистрации</span>
            </div>
            <p className="text-[#E8F4FF] font-semibold text-sm sm:text-base">
              {new Date(user.joinDate).toLocaleDateString('ru-RU')}
            </p>
          </div>

          <div className="bg-[#1A2E42] p-3 sm:p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-[#8BA4B8] sm:size-5" />
              <span className="text-[#8BA4B8] text-sm sm:text-base">Активных полей</span>
            </div>
            <p className="text-[#E8F4FF] font-semibold text-sm sm:text-base">
              {user.fieldsHistory.filter(f => f.status === "active").length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
