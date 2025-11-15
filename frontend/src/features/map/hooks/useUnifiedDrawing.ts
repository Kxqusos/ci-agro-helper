import { useCallback, useRef, useState, useEffect } from 'react';
import type { LLPoint } from '../types';

interface UseUnifiedDrawingProps {
  mapRef: React.MutableRefObject<any | null>;
  drawingMode: boolean;
  currentPoints: LLPoint[];
  setCurrentPoints: (points: LLPoint[]) => void;
  shapes: LLPoint[][];
  setShapes: (shapes: LLPoint[][]) => void;
  mouseCanvasPos: { x: number; y: number } | null;
  setMouseCanvasPos: (pos: { x: number; y: number } | null) => void;
  onShapeComplete?: (points: LLPoint[]) => void;
}

export const useUnifiedDrawing = ({
  mapRef,
  drawingMode,
  currentPoints,
  setCurrentPoints,
  shapes,
  setShapes,
  mouseCanvasPos,
  setMouseCanvasPos,
  onShapeComplete
}: UseUnifiedDrawingProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentZoom, setCurrentZoom] = useState(4);
  const markersRef = useRef<any[]>([]);

  const getPointName = useCallback((index: number): string => {
    const letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ";
    return letters[index % letters.length];
  }, []);

  const llToCanvas = useCallback((lat: number, lng: number) => {
    if (!mapRef.current?.mapRef?.current) return { x: 0, y: 0 };
    return mapRef.current.mapRef.current.latLngToContainerPoint([lat, lng]);
  }, [mapRef]);

  const canvasToLatLng = useCallback((x: number, y: number) => {
    if (!mapRef.current?.mapRef?.current) return { lat: 0, lng: 0 };
    return mapRef.current.mapRef.current.containerPointToLatLng([x, y]);
  }, [mapRef]);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    draw();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (shapes.length === 0 && currentPoints.length === 0) return;

    const pointRadius = 5;
    const lineColor = "#8B4513";
    const fillColor = "rgba(160, 82, 45, 0.3)";
    const pointColor = "#654321";

    ctx.lineWidth = 3;
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    shapes.forEach((shape) => {
      if (shape.length < 2) return;
      
      const canvasPoints = shape.map(p => llToCanvas(p.lat, p.lng));
      const visiblePoints = canvasPoints.filter(point => 
        point.x >= 0 && point.x <= canvas.width && 
        point.y >= 0 && point.y <= canvas.height
      );

      if (visiblePoints.length < 2) return;

      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      for (let i = 1; i < visiblePoints.length; i++) {
        ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      for (let i = 1; i < visiblePoints.length; i++) {
        ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      shape.forEach((point, index) => {
        const pt = canvasPoints[index];
        if (pt.x < 0 || pt.x > canvas.width || pt.y < 0 || pt.y > canvas.height) return;
        
        const name = point.name || getPointName(index);

        ctx.fillStyle = pointColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "white";
        ctx.fillText(name, pt.x, pt.y);
      });
    });

    if (currentPoints.length > 0) {
      const canvasCurrentPoints = currentPoints.map(p => llToCanvas(p.lat, p.lng));
      
      ctx.strokeStyle = lineColor;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(canvasCurrentPoints[0].x, canvasCurrentPoints[0].y);
      
      for (let i = 1; i < canvasCurrentPoints.length; i++) {
        ctx.lineTo(canvasCurrentPoints[i].x, canvasCurrentPoints[i].y);
      }
      
      if (mouseCanvasPos && currentPoints.length >= 1) {
        ctx.lineTo(mouseCanvasPos.x, mouseCanvasPos.y);
        ctx.setLineDash([5, 5]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      currentPoints.forEach((point, index) => {
        const pt = canvasCurrentPoints[index];
        if (pt.x < 0 || pt.x > canvas.width || pt.y < 0 || pt.y > canvas.height) return;
        
        const name = point.name || getPointName(index);
        
        ctx.fillStyle = pointColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "white";
        ctx.fillText(name, pt.x, pt.y);
      });
    }
  }, [currentPoints, shapes, mouseCanvasPos, llToCanvas, getPointName]);

  const getNearestPoint = useCallback((x: number, y: number): LLPoint | null => {
    const allPoints = [...currentPoints, ...shapes.flat()];
    const hitRadius = 10;
    
    for (const p of allPoints) {
      const pt = llToCanvas(p.lat, p.lng);
      const dx = pt.x - x;
      const dy = pt.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < hitRadius) {
        return p;
      }
    }
    
    return null;
  }, [currentPoints, shapes, llToCanvas]);

  const checkShapeCompletion = useCallback((points: LLPoint[], clickX: number, clickY: number): boolean => {
    if (points.length < 3) return false;
    
    const firstPoint = points[0];
    const firstPointCanvas = llToCanvas(firstPoint.lat, firstPoint.lng);
    const hitRadius = 10;
    
    const distanceToFirst = Math.sqrt(
      Math.pow(firstPointCanvas.x - clickX, 2) + 
      Math.pow(firstPointCanvas.y - clickY, 2)
    );
    
    return distanceToFirst < hitRadius;
  }, [llToCanvas]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
  if (!drawingMode || !mapRef.current?.mapRef?.current) return;
  
  e.stopPropagation();
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const hit = getNearestPoint(x, y);
  
  if (currentPoints.length === 0) {
    if (hit) {
      setCurrentPoints([{ lat: hit.lat, lng: hit.lng, name: hit.name }]);
    } else {
      const ll = canvasToLatLng(x, y);
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
  
  const ll = canvasToLatLng(x, y);
  if (mapRef.current.isPointInRussia && !mapRef.current.isPointInRussia(ll.lat, ll.lng)) {
    alert("Поля можно размещать только на территории России");
    return;
  }
  setCurrentPoints([...currentPoints, { lat: ll.lat, lng: ll.lng }]);
}, [drawingMode, mapRef, currentPoints, shapes, getNearestPoint, checkShapeCompletion, setCurrentPoints, setShapes, setMouseCanvasPos, onShapeComplete, canvasToLatLng]);
  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [updateCanvasSize]);

  useEffect(() => {
    if (!mapRef.current?.mapRef?.current) return;
    
    const map = mapRef.current.mapRef.current;
    
    const handleMapEvents = () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      requestAnimationFrame(draw);
    };
    
    map.on("zoom move moveend zoomend", handleMapEvents);
    
    requestAnimationFrame(draw);
    
    return () => {
      map.off("zoom move moveend zoomend", handleMapEvents);
    };
  }, [mapRef, draw]);
  useEffect(() => {
    requestAnimationFrame(draw);
  }, [currentPoints, shapes, mouseCanvasPos, draw]);

  return {
    canvasRef,
    containerRef,
    currentZoom,
    markersRef,
    draw,
    handleCanvasClick,
    handleCanvasMove,
    handleCanvasLeave: () => setMouseCanvasPos(null),
    getPointName,
    updateCanvasSize
  };
};