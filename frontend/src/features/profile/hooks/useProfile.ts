import { useState, useEffect } from "react";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  joinDate: string;
  theme: "dark" | "light";
  fieldsHistory: FieldHistory[];
}

export interface FieldHistory {
  id: string;
  name: string;
  area: number;
  crop: string;
  created: string;
  region: string;
  status: "active" | "archived";
}

export interface ProfileUpdateData {
  username?: string;
  email?: string;
  avatar?: string;
}

export interface SecurityUpdateData {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  newEmail?: string;
  currentEmailPassword?: string;
}

export function useProfile() {
  const [user, setUser] = useState<UserProfile>({
    id: "1",
    username: "agriculture_user",
    email: "user@agroplanner.ru",
    avatar: "",
    joinDate: "2024-01-15",
    theme: "dark",
    fieldsHistory: [
      {
        id: "1",
        name: "Поле №1",
        area: 45.2,
        crop: "Пшеница",
        created: "2024-01-20",
        region: "Московская область",
        status: "active"
      },
      {
        id: "2",
        name: "Северное поле",
        area: 78.5,
        crop: "Ячмень",
        created: "2024-02-10",
        region: "Свердловская область",
        status: "active"
      }
    ]
  });

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "history">("profile");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light";
    if (savedTheme) {
      setUser(prev => ({ ...prev, theme: savedTheme }));
      document.documentElement.classList.toggle("light", savedTheme === "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = user.theme === "dark" ? "light" : "dark";
    setUser(prev => ({ ...prev, theme: newTheme }));
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("light", newTheme === "light");
  };

  const updateProfile = async (data: ProfileUpdateData) => {
    try {
      setUser(prev => ({ ...prev, ...data }));
      return { success: true };
    } catch (error) {
      return { success: false, error: "Ошибка обновления профиля" };
    }
  };

  const updateSecurity = async (data: SecurityUpdateData) => {
    try {
      if (data.newEmail) {
        setUser(prev => ({ ...prev, email: data.newEmail! }));
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: "Ошибка обновления" };
    }
  };

  const deleteField = (fieldId: string) => {
    setUser(prev => ({
      ...prev,
      fieldsHistory: prev.fieldsHistory.filter(field => field.id !== fieldId)
    }));
  };

  return {
    user,
    activeTab,
    setActiveTab,
    toggleTheme,
    updateProfile,
    updateSecurity,
    deleteField
  };
}