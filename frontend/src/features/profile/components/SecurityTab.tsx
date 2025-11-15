import { useState } from "react";
import { Save } from "lucide-react";
import { SecurityUpdateData } from "../hooks/useProfile";

interface SecurityTabProps {
  onUpdate: (data: SecurityUpdateData) => Promise<{ success: boolean; error?: string }>;
}

export default function SecurityTab({ onUpdate }: SecurityTabProps) {
  const [activeSection, setActiveSection] = useState<"password" | "email">("password");
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    newEmail: "",
    currentEmailPassword: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (activeSection === "password") {
      if (formData.newPassword !== formData.confirmPassword) {
        alert("Новые пароли не совпадают");
        return;
      }

      if (formData.newPassword.length < 6) {
        alert("Пароль должен содержать минимум 6 символов");
        return;
      }
    } else {
      if (!formData.newEmail.includes('@')) {
        alert("Введите корректный email адрес");
        return;
      }
    }

    setLoading(true);
    const result = await onUpdate(formData);
    setLoading(false);
    
    if (result.success) {
      alert(activeSection === "password" ? "Пароль успешно обновлен" : "Email успешно обновлен");
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        newEmail: "",
        currentEmailPassword: ""
      });
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="bg-[#172B3E] rounded-2xl p-4 sm:p-6 border border-[#2D4A62]">
      <h3 className="text-lg sm:text-xl font-semibold text-[#E8F4FF] mb-4 sm:mb-6">Безопасность</h3>
      <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => setActiveSection("password")}
          className={`px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-2 rounded-lg transition-colors font-medium ${
            activeSection === "password" 
              ? "bg-[#3388ff] text-white" 
              : "bg-[#2D4A62] text-[#ffffff] hover:bg-[#3A5A7A] dark:hover:bg-[#3A5A7A]"
          }`}
        >
          Смена пароля
        </button>
        <button
          onClick={() => setActiveSection("email")}
          className={`px-3 py-2 text-sm sm:text-base sm:px-4 sm:py-2 rounded-lg transition-colors font-medium ${
            activeSection === "email" 
              ? "bg-[#3388ff] text-white" 
              : "bg-[#2D4A62] text-[#ffffff] hover:bg-[#3A5A7A] dark:hover:bg-[#3A5A7A]"
          }`}
        >
          Смена email
        </button>
      </div>

      {activeSection === "password" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
              Текущий пароль
            </label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] transition-colors"
              placeholder="Введите текущий пароль"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
              Новый пароль
            </label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] transition-colors"
              placeholder="Введите новый пароль"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
              Подтвердите новый пароль
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] transition-colors"
              placeholder="Повторите новый пароль"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
              Новый email адрес
            </label>
            <input
              type="email"
              value={formData.newEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, newEmail: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] transition-colors"
              placeholder="Введите новый email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8BA4B8] mb-2">
              Текущий пароль для подтверждения
            </label>
            <input
              type="password"
              value={formData.currentEmailPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, currentEmailPassword: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] focus:outline-none focus:border-[#3388ff] transition-colors"
              placeholder="Введите текущий пароль"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSubmit}
          disabled={loading || 
            (activeSection === "password" 
              ? !formData.currentPassword || !formData.newPassword || formData.newPassword !== formData.confirmPassword
              : !formData.newEmail || !formData.currentEmailPassword
            )
          }
          className="px-4 py-2 sm:px-6 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm sm:text-base"
        >
          <Save size={16} className="text-white" />
          {loading 
            ? activeSection === "password" ? "Обновление..." : "Смена email..." 
            : activeSection === "password" ? "Обновить пароль" : "Сменить email"
          }
        </button>
      </div>
    </div>
  );
}