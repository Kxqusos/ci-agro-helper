import { useCallback, useRef, useState, useEffect } from 'react';
import type { LLPoint, DrawingState, DrawingHandlers } from '../types';

export const useMapDrawing = (
  mapRef: React.MutableRefObject<any | null>,
  drawingState: DrawingState,
  drawingHandlers: DrawingHandlers
) => {
  const { currentPoints, shapes, mouseCanvasPos } = drawingState;
  const { setCurrentPoints, setShapes, setMouseCanvasPos, onShapeComplete } = drawingHandlers;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentZoom, setCurrentZoom] = useState(4);
  const markersRef = useRef<any[]>([]);

  const llToCanvas = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    return mapRef.current.latLngToContainerPoint(lat, lng);
  }, [mapRef]);

  const getPointName = useCallback((index: number): string => {
    const letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ";
    return letters[index % letters.length];
  }, []);

  const getNearestPoint = useCallback((x: number, y: number): LLPoint | null => {
    const allPoints = [...currentPoints, ...shapes.flat()];
    
    for (const p of allPoints) {
      const pt = llToCanvas(p.lat, p.lng);
      const dx = pt.x - x;
      const dy = pt.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 10) {
        return p;
      }
    }
    
    return null;
  }, [currentPoints, shapes, llToCanvas]);

  const checkShapeCompletion = useCallback((points: LLPoint[], clickX: number, clickY: number): boolean => {
    if (points.length < 3) return false;
    
    const firstPoint = points[0];
    const firstPointCanvas = llToCanvas(firstPoint.lat, firstPoint.lng);
    
    const distanceToFirst = Math.sqrt(
      Math.pow(firstPointCanvas.x - clickX, 2) + 
      Math.pow(firstPointCanvas.y - clickY, 2)
    );
    
    return distanceToFirst < 10; // hitRadius
  }, [llToCanvas]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
  if (!drawingState.drawingMode || !mapRef.current) return;
  
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const hit = getNearestPoint(x, y);
  
  if (currentPoints.length === 0) {
    if (hit) {
      setCurrentPoints([{ lat: hit.lat, lng: hit.lng, name: hit.name }]);
    } else {
      const ll = mapRef.current.containerPointToLatLng(x, y);
      if (mapRef.current.isPointInRussia && !mapRef.current.isPointInRussia(ll.lat, ll.lng)) {
        alert("Поля можно размещать только на территории России");
        return;
      }
      setCurrentPoints([{ lat: ll.lat, lng: ll.lng }]);
    }
    return;
  }

  if (currentPoints.length >= 3 && checkShapeCompletion(currentPoints, x, y)) {
    const completedShape = [...currentPoints];
    setShapes([...shapes, completedShape]);
    setCurrentPoints([]);
    setMouseCanvasPos(null);
    
    onShapeComplete?.(completedShape);
    return;
  }

  if (hit) {
    const newShape: LLPoint[] = [...currentPoints, { lat: hit.lat, lng: hit.lng, name: hit.name }];
    setShapes([...shapes, newShape]);
    setCurrentPoints([]);
    setMouseCanvasPos(null);
    
    onShapeComplete?.(newShape);
    return;
  }
  
  const ll = mapRef.current.containerPointToLatLng(x, y);
  if (mapRef.current.isPointInRussia && !mapRef.current.isPointInRussia(ll.lat, ll.lng)) {
    alert("Поля можно размещать только на территории России");
    return;
  }
  setCurrentPoints([...currentPoints, { lat: ll.lat, lng: ll.lng }]);
}, [drawingState.drawingMode, mapRef, currentPoints, shapes, getNearestPoint, checkShapeCompletion, setCurrentPoints, setShapes, setMouseCanvasPos, onShapeComplete]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingState.drawingMode) {
      setMouseCanvasPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseCanvasPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [drawingState.drawingMode, setMouseCanvasPos]);

  const handleCanvasLeave = useCallback(() => {
    setMouseCanvasPos(null);
  }, [setMouseCanvasPos]);

  return {
    canvasRef,
    currentZoom,
    markersRef,
    llToCanvas,
    getPointName,
    handleCanvasClick,
    handleCanvasMove,
    handleCanvasLeave,
    setCurrentZoom
  };
};