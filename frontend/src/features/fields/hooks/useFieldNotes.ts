import { useState, useEffect } from 'react';
import { FieldNotes } from '../types';

export const useFieldNotes = (initialNotes = '') => {
  const [userNotes, setUserNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleNotesChange = (newValue: string) => {
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

  return {
    userNotes,
    savedNotes,
    hasUnsavedChanges,
    handleNotesChange,
    handleSaveNotes,
  };
};
