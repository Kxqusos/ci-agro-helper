"use client";
import { useState, useEffect } from "react";

export default function FieldNotesTab() {
  const [userNotes, setUserNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setUserNotes(newValue);
    setHasUnsavedChanges(newValue !== savedNotes);
  };

  const handleSaveNotes = () => {
    if (hasUnsavedChanges) {
      setSavedNotes(userNotes);
      setHasUnsavedChanges(false);
      console.log("Заметки сохранены:", userNotes);
      alert("Заметки сохранены!");
    }
  };

  useEffect(() => {
    setHasUnsavedChanges(userNotes !== savedNotes);
  }, [userNotes, savedNotes]);

  return (
    <div className="text-[#E8F4FF] h-full flex flex-col">
      <h3 className="text-base sm:text-lg md:text-xl lg:text-lg xl:text-2xl 3xl:text-3xl font-semibold mb-3 sm:mb-4 text-center">
        Мои заметки
      </h3>
      <div className="bg-[#1A2E42] rounded-lg flex-1 min-h-0 p-3 sm:p-4 light:bg-white light:border light:border-gray-200">
        <textarea
          value={userNotes}
          onChange={handleNotesChange}
          placeholder="Введите ваши заметки о состоянии культуры, наблюдения, планы работ..."
          className="w-full h-full bg-transparent border-none outline-none text-[#E8F4FF] text-sm sm:text-base md:text-base placeholder-[#8BA4B8] resize-none
                     light:bg-white light:text-gray-800 light:placeholder-gray-400"
          rows={8}
        />
      </div>
      <div className="flex justify-end mt-3 sm:mt-4">
        <button
          onClick={handleSaveNotes}
          className={`px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ${
            hasUnsavedChanges
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-[#2D4A62] hover:bg-[#3A5A7A] text-[#E8F4FF] light:bg-gray-200 light:hover:bg-gray-300 light:text-gray-800"
          }`}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}