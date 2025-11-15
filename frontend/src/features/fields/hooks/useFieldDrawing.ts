import { useState, useCallback } from 'react';
import { LLPoint, FieldDrawingState } from '../types';

export const useFieldDrawing = () => {
  const [drawingState, setDrawingState] = useState<FieldDrawingState>({
    drawingMode: false,
    currentPoints: [],
    mouseCanvasPos: null
  });

  const setDrawingMode = useCallback((mode: boolean) => {
    setDrawingState(prev => ({ ...prev, drawingMode: mode }));
  }, []);

  const setCurrentPoints = useCallback((points: LLPoint[]) => {
    setDrawingState(prev => ({ ...prev, currentPoints: points }));
  }, []);

  const setMouseCanvasPos = useCallback((pos: { x: number; y: number } | null) => {
    setDrawingState(prev => ({ ...prev, mouseCanvasPos: pos }));
  }, []);

  const resetDrawing = useCallback(() => {
    setDrawingState({
      drawingMode: false,
      currentPoints: [],
      mouseCanvasPos: null
    });
  }, []);

  const addPoint = useCallback((point: LLPoint) => {
    setDrawingState(prev => ({
      ...prev,
      currentPoints: [...prev.currentPoints, point]
    }));
  }, []);

  return {
    drawingState,
    setDrawingMode,
    setCurrentPoints,
    setMouseCanvasPos,
    resetDrawing,
    addPoint,
  };
};
