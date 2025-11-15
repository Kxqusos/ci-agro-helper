import { User, Camera, Mail, Lock, MapPin } from "lucide-react";
import { UserProfile } from "../hooks/useProfile";

interface ProfileSidebarProps {
  user: UserProfile;
  activeTab: string;
  onTabChange: (tab: "profile" | "security" | "history") => void;
  onAvatarChange: (data: { avatar: string }) => void;
}

export default function ProfileSidebar({ user, activeTab, onTabChange, onAvatarChange }: ProfileSidebarProps) {
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onAvatarChange({ avatar: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="lg:col-span-1">
      <div className="bg-[#172B3E] light:bg-white rounded-2xl p-4 sm:p-6 border border-[#2D4A62] light:border-gray-200">
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#2D4A62] light:bg-gray-100 flex items-center justify-center mb-3">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt="Avatar" 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                />
              ) : (
                <User size={32} className="text-[#8BA4B8] light:text-gray-400 sm:size-10" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-[#3388ff] light:bg-blue-500 p-1.5 sm:p-2 rounded-full cursor-pointer hover:bg-[#2970cc] light:hover:bg-blue-600 transition-colors">
              <Camera size={14} className="text-white sm:size-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F4FF] light:text-gray-800 text-center">{user.username}</h2>
          <p className="text-[#8BA4B8] light:text-gray-600 text-xs sm:text-sm text-center">{user.email}</p>
          <p className="text-[#8BA4B8] light:text-gray-500 text-xs mt-1 text-center">
            Участник с {new Date(user.joinDate).toLocaleDateString('ru-RU')}
          </p>
        </div>

        <nav className="space-y-1 sm:space-y-2">
          <button
            onClick={() => onTabChange("profile")}
            className={`w-full text-left px-3 py-2 sm:px-4 sm:py-3 rounded-lg transition-colors flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${
              activeTab === "profile" 
                ? "bg-[#3388ff] light:bg-blue-500 text-white" 
                : "text-[#8BA4B8] light:text-gray-600 hover:bg-[#2D4A62] light:hover:bg-gray-100 hover:text-[#E8F4FF] light:hover:text-gray-800"
            }`}
          >
            <User size={18} className="sm:size-5 text-current" />
            Основная информация
          </button>
          <button
            onClick={() => onTabChange("security")}
            className={`w-full text-left px-3 py-2 sm:px-4 sm:py-3 rounded-lg transition-colors flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${
              activeTab === "security" 
                ? "bg-[#3388ff] light:bg-blue-500 text-white" 
                : "text-[#8BA4B8] light:text-gray-600 hover:bg-[#2D4A62] light:hover:bg-gray-100 hover:text-[#E8F4FF] light:hover:text-gray-800"
            }`}
          >
            <Lock size={18} className="sm:size-5 text-current" />
            Безопасность
          </button>
          <button
            onClick={() => onTabChange("history")}
            className={`w-full text-left px-3 py-2 sm:px-4 sm:py-3 rounded-lg transition-colors flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${
              activeTab === "history" 
                ? "bg-[#3388ff] light:bg-blue-500 text-white" 
                : "text-[#8BA4B8] light:text-gray-600 hover:bg-[#2D4A62] light:hover:bg-gray-100 hover:text-[#E8F4FF] light:hover:text-gray-800"
            }`}
          >
            <MapPin size={18} className="sm:size-5 text-current" />
            История полей
          </button>
        </nav>
      </div>
    </div>
  );
}