import { useCallback } from 'react';
import { LLPoint, FieldData } from '../types';
import { fieldService } from '../../../lib/api/fields';

export const useFieldOperations = () => {
  const saveFieldToBackend = useCallback(async (points: LLPoint[], fieldData: FieldData, region: any) => {
    try {
      const fieldShape = {
        points: points.map((point, index) => ({
          ...point,
          name: point.name || getNextPointName(index),
          id: point.id || `point-${Date.now()}-${index}`
        })),
        region,
        fieldData,
        createdAt: new Date().toISOString()
      };
      
      await fieldService.saveField(fieldShape);
      return fieldShape;
    } catch (error) {
      console.error('Error saving field:', error);
      throw error;
    }
  }, []);

  const loadFieldsFromBackend = useCallback(async () => {
    try {
      return await fieldService.loadFields();
    } catch (error) {
      console.error('Error loading fields:', error);
      throw error;
    }
  }, []);

  return {
    saveFieldToBackend,
    loadFieldsFromBackend,
  };
};

const getNextPointName = (index: number): string => {
  const letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ";
  return letters[index % letters.length];
};
