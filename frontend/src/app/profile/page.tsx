"use client";
import { useState, useEffect } from "react";
import Background from "@/components/layout/Background";
import ProfileSidebar from "@/features/profile/components/ProfileSidebar";
import ProfileInfoTab from "@/features/profile/components/ProfileInfoTab";
import SecurityTab from "@/features/profile/components/SecurityTab";
import FieldsHistoryTab from "@/features/profile/components/FieldsHistoryTab";
import { useProfile } from "@/features/profile/hooks/useProfile";
import { Sun, Moon, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const {
    user,
    activeTab,
    setActiveTab,
    toggleTheme,
    updateProfile,
    updateSecurity
  } = useProfile();
  
  const router = useRouter();

  const handleBackToHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <Background theme={user.theme} /> 
      <main className="relative z-20 pt-16 sm:pt-20 pb-6 sm:pb-10">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <button
                onClick={handleBackToHome}
                className="flex items-center justify-center sm:justify-start gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-[#172B3E] border border-[#2D4A62] rounded-lg text-[#E8F4FF] hover:bg-[#2D4A62] transition-colors text-sm sm:text-base w-full sm:w-auto"
                title="Вернуться на главную"
              >
                <ArrowLeft size={18} className="sm:size-5" />
                На главную
              </button>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#E8F4FF] text-center sm:text-left">
                Профиль пользователя
              </h1>
            </div>
            
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-[#172B3E] border border-[#2D4A62] rounded-lg text-[#E8F4FF] hover:bg-[#2D4A62] transition-colors text-sm sm:text-base w-full sm:w-auto order-first sm:order-last"
            >
              {user.theme === "dark" ? (
                <>
                  <Sun size={18} className="sm:size-5" />
                  Светлая тема
                </>
              ) : (
                <>
                  <Moon size={18} className="sm:size-5" />
                  Темная тема
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            <ProfileSidebar 
              user={user}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onAvatarChange={updateProfile}
            />

            <div className="lg:col-span-3">
              {activeTab === "profile" && (
                <ProfileInfoTab 
                  user={user}
                  onUpdate={updateProfile}
                />
              )}

              {activeTab === "security" && (
                <SecurityTab 
                  onUpdate={updateSecurity}
                />
              )}

              {activeTab === "history" && (
                <FieldsHistoryTab 
                  fields={user.fieldsHistory}
                  onFieldDelete={(fieldId) => {
                    console.log('Delete field:', fieldId);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}