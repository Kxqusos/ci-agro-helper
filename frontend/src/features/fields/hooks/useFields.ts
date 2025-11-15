import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FieldData } from '../types';
import { fieldsApi } from '../services/fieldsApi';
import { mockFields } from '../mocks';

const getDefaultFieldId = (fields: FieldData[]): string | null =>
  fields.length > 0 ? fields[0].id ?? null : null;

export const useFields = () => {
  const [fields, setFields] = useState<FieldData[]>(mockFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    getDefaultFieldId(mockFields)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(true);

  const ensureSelectedField = useCallback((nextFields: FieldData[]) => {
    setSelectedFieldId((prev) => {
      if (prev && nextFields.some((field) => field.id === prev)) {
        return prev;
      }
      return getDefaultFieldId(nextFields);
    });
  }, []);

  const loadFields = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedFields = await fieldsApi.getFields();

      if (fetchedFields.length > 0) {
        setFields(fetchedFields);
        ensureSelectedField(fetchedFields);
        setIsUsingMockData(false);
      } else {
        setFields(mockFields);
        ensureSelectedField(mockFields);
        setIsUsingMockData(true);
      }

      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load fields', err);
      setFields(mockFields);
      ensureSelectedField(mockFields);
      setIsUsingMockData(true);
      setError('Не удалось получить список полей, показаны локальные данные');
    } finally {
      setLoading(false);
    }
  }, [ensureSelectedField]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  const selectedFieldData = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId]
  );

  return {
    fields,
    selectedField: selectedFieldId,
    selectedFieldData,
    setSelectedField: setSelectedFieldId,
    refresh: loadFields,
    loading,
    error,
    isUsingMockData,
    lastUpdated,
  };
};
