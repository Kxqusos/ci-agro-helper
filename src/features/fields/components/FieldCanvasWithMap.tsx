"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import MapContainer from "@/features/map/components/MapContainer";
import { useMap } from "@/features/map/context/MapContext";
import type { FieldData, LLPoint } from "../types";
import { 
  Pencil, 
  Check,
  Search
} from "lucide-react";

const getNextPointName = (index: number): string => {
  const letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ";
  return letters[index % letters.length];
};

interface FieldCanvasWithMapProps {
  onFieldCreated: (fieldData: FieldData) => void;
  onShapeComplete?: (points: LLPoint[]) => void;
  onSave?: () => void;
  selectedField?: FieldData | null;
}

export default function FieldCanvasWithMap({ 
  onFieldCreated, 
  onShapeComplete, 
  onSave, 
  selectedField 
}: FieldCanvasWithMapProps) {
  const mapRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const { mapRef: contextMapRef } = useMap();
  
  const [drawingMode, setDrawingMode] = useState(false);
  const [shapes, setShapes] = useState<LLPoint[][]>([]);
  const [currentPoints, setCurrentPoints] = useState<LLPoint[]>([]);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(4);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (selectedField?.polygon) {
      setShapes([selectedField.polygon]);
    } else {
      setShapes([]);
    }
  }, [selectedField]);

  useEffect(() => {
    contextMapRef.current = mapRef.current;
  }, [contextMapRef]);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    draw();
  }, []);

  const llToCanvas = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    return mapRef.current.latLngToContainerPoint(lat, lng);
  }, []);

  const canvasToLatLng = useCallback((x: number, y: number) => {
    if (!mapRef.current) return { lat: 0, lng: 0 };
    return mapRef.current.containerPointToLatLng(x, y);
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
        point.x >= -50 && point.x <= canvas.width + 50 && 
        point.y >= -50 && point.y <= canvas.height + 50
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
        if (pt.x < -50 || pt.x > canvas.width + 50 || pt.y < -50 || pt.y > canvas.height + 50) return;
        
        const name = point.name || getNextPointName(index);

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
        if (pt.x < -50 || pt.x > canvas.width + 50 || pt.y < -50 || pt.y > canvas.height + 50) return;
        
        const name = point.name || getNextPointName(index);
        
        ctx.fillStyle = pointColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "white";
        ctx.fillText(name, pt.x, pt.y);
      });
    }
  }, [currentPoints, shapes, mouseCanvasPos, llToCanvas]);

  const getShapeCenter = useCallback((shape: LLPoint[]) => {
    if (shape.length === 0) return null;
    
    const centerLat = shape.reduce((sum, p) => sum + p.lat, 0) / shape.length;
    const centerLng = shape.reduce((sum, p) => sum + p.lng, 0) / shape.length;
    
    return { lat: centerLat, lng: centerLng };
  }, []);

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

  const createTempFieldData = useCallback((polygon: LLPoint[]): FieldData => {
    return {
      id: `temp-field-${Date.now()}`,
      name: "Новое поле",
      area: 0,
      crop: "",
      isActive: false,
      soilType: "",
      segmentLengths: polygon.map((point, index) => ({
        segment: `${point.name || getNextPointName(index)}-${polygon[(index + 1) % polygon.length].name || getNextPointName((index + 1) % polygon.length)}`,
        length: 100
      })),
      notes: "",
      cropRotationHistory: "",
      plannedOperations: [],
      fertilizers: [],
      irrigationSystem: {
        hasSystem: false,
        type: "",
        description: ""
      },
      coordinates: { 
        lat: polygon[0].lat, 
        lng: polygon[0].lng 
      },
      polygon: polygon,
      region: ""
    };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingMode || !mapRef.current) return;
    
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
      const tempFieldData = createTempFieldData(completedShape);

      onShapeComplete?.(completedShape);
      onFieldCreated?.(tempFieldData);
      
      setCurrentPoints([]);
      setMouseCanvasPos(null);
      setDrawingMode(false);
      return;
    }

    if (hit) {
      const newShape: LLPoint[] = [...currentPoints, { lat: hit.lat, lng: hit.lng, name: hit.name }];
      const tempFieldData = createTempFieldData(newShape);

      onShapeComplete?.(newShape);
      onFieldCreated?.(tempFieldData);
      
      setCurrentPoints([]);
      setMouseCanvasPos(null);
      setDrawingMode(false);
      return;
    }

    const ll = canvasToLatLng(x, y);
    if (mapRef.current.isPointInRussia && !mapRef.current.isPointInRussia(ll.lat, ll.lng)) {
      alert("Поля можно размещать только на территории России");
      return;
    }
    setCurrentPoints([...currentPoints, { lat: ll.lat, lng: ll.lng }]);
  }, [drawingMode, mapRef, currentPoints, getNearestPoint, checkShapeCompletion, canvasToLatLng, onShapeComplete, onFieldCreated, createTempFieldData]);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingMode) {
      setMouseCanvasPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseCanvasPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [drawingMode]);

  const handleMouseLeave = useCallback(() => {
    setMouseCanvasPos(null);
  }, []);

  const updateMarkers = useCallback(() => {
    if (!mapRef.current?.mapRef?.current) return;
    
    const map = mapRef.current.mapRef.current;

    markersRef.current.forEach(marker => {
      try {
        map.removeLayer(marker);
      } catch (e) {
      }
    });
    markersRef.current = [];

    if (currentZoom < 6 && shapes.length > 0) {
      import("leaflet").then((L) => {
        shapes.forEach((shape, shapeIndex) => {
          if (!mapRef.current?.mapRef?.current) return;

          const center = getShapeCenter(shape);
          if (!center) return;
          
          const blueIcon = L.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });
          
          const marker = L.marker([center.lat, center.lng], { icon: blueIcon })
            .addTo(map)
            .bindPopup(`Поле ${shapeIndex + 1}<br>Точек: ${shape.length}`);
          
          markersRef.current.push(marker);
        });
      }).catch(err => {
        console.error("Error loading Leaflet for markers:", err);
      });
    }
  }, [currentZoom, shapes, getShapeCenter]);

  const findFieldRegion = useCallback((shape: LLPoint[]): { name: string; id: string } | null => {
    if (!mapRef.current || shape.length === 0) return null;
    
    const center = getShapeCenter(shape);
    if (!center) return null;
    
    return mapRef.current.findRegionForPoint(center.lat, center.lng);
  }, [getShapeCenter]);

  const handleToggleDrawing = useCallback(() => {
    const newDrawingMode = !drawingMode;
    setDrawingMode(newDrawingMode);
    
    if (newDrawingMode && currentPoints.length > 0) {
      setCurrentPoints([]);
      setMouseCanvasPos(null);
    }
    
    console.log("[FieldCanvasWithMap] Drawing mode:", newDrawingMode);
  }, [drawingMode, currentPoints]);

  // Функции для поиска
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (!mapRef.current) {
      alert("Карта еще загружается. Подождите немного и попробуйте снова.");
      return;
    }

    setIsSearching(true);

    try {
      const result = await mapRef.current.searchCity(searchQuery.trim());
      if (result) {
        mapRef.current.flyToCity(result.lat, result.lng, 12);
        setSearchQuery("");
      } else {
        alert("Город не найден. Попробуйте другой запрос.");
      }
    } catch (error) {
      console.error("[FieldCanvasWithMap] Search error:", error);
      alert("Ошибка при поиске города");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch(e);
  };

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [updateCanvasSize]);

  useEffect(() => {
    if (!mapRef.current) return;
    
    const handleMapEvents = () => {
      const zoom = mapRef.current?.mapRef?.current?.getZoom() || 4;
      setCurrentZoom(zoom);
      requestAnimationFrame(draw);
    };
    
    const mapElement = mapRef.current?.mapRef?.current;
    if (mapElement) {
      mapElement.on("zoom move moveend zoomend", handleMapEvents);
      
      return () => {
        mapElement.off("zoom move moveend zoomend", handleMapEvents);
      };
    }
  }, [draw]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [currentPoints, shapes, mouseCanvasPos, draw]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  useEffect(() => {
    if (!mapRef.current || shapes.length === 0) {
      mapRef.current?.clearRegionHighlight();
      return;
    }
    
    const regionIds = new Set<string>();
    shapes.forEach(shape => {
      const region = findFieldRegion(shape);
      if (region) {
        regionIds.add(region.id);
      }
    });
    
    if (regionIds.size > 0) {
      mapRef.current.highlightRegions(Array.from(regionIds));
    }
  }, [shapes, findFieldRegion]);

  useEffect(() => {
    return () => {
      if (mapRef.current?.mapRef?.current) {
        markersRef.current.forEach(marker => {
          try {
            mapRef.current.mapRef.current.removeLayer(marker);
          } catch (e) {
          }
        });
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px] bg-gray-100">
      <MapContainer 
        ref={mapRef} 
        className="absolute inset-0" 
        onMapReady={updateCanvasSize}
      />

      <canvas
        ref={canvasRef}
        style={{ 
          position: "absolute", 
          inset: 0, 
          pointerEvents: "none", 
          zIndex: 1 
        }}
      />

      {drawingMode && (
        <div
          style={{ 
            position: "absolute", 
            inset: 0, 
            cursor: "crosshair",
            zIndex: 2,
            pointerEvents: "auto"
          }}
          onClick={handleClick}
          onMouseMove={handleMove}
          onMouseLeave={handleMouseLeave}
        />
      )}

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-auto">
        <div className="bg-white rounded-xl shadow-lg w-80 md:w-96 lg:w-[500px] xl:w-[600px]">
          <form
            onSubmit={handleSearch}
            className="flex items-center"
          >
            <div className="relative flex items-center w-full">

              <div className="flex items-center justify-center w-5 h-12 text-gray-600">
              </div>

              <input
                type="text"
                placeholder="Поиск города..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSearching}
                className="w-full py-3 pr-4 border-0 outline-none bg-transparent text-gray-900 placeholder-gray-500 text-sm md:text-base disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="flex items-center justify-center w-10 h-10 mr-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-default flex-shrink-0"
                title="Найти город"
              >
                <Search size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 pointer-events-auto">
        <button
          onClick={handleToggleDrawing}
          className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl shadow-lg transition-colors flex items-center justify-center ${
            drawingMode 
              ? "bg-green-600 hover:bg-green-700 text-white" 
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          title={drawingMode ? "Завершить рисование" : "Начать рисование"}
        >
          {drawingMode ? (
            <Check size={24} className="md:w-6 md:h-6 lg:w-7 lg:h-7" />
          ) : (
            <Pencil size={24} className="md:w-6 md:h-6 lg:w-7 lg:h-7" />
          )}
        </button>
      </div>

      {shapes.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg z-10 pointer-events-none">
          <div className="text-sm font-medium">Сохраненные поля: {shapes.length}</div>
          <div className="text-xs opacity-80">
            {currentZoom < 6 ? "Маркеры отображены" : "Маркеры скрыты"}
          </div>
        </div>
      )}

      {drawingMode && (
        <div className="absolute top-20 left-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-10 pointer-events-none">
          <div className="text-sm font-medium">Режим рисования</div>
          <div className="text-xs opacity-80">
            Кликайте по карте для создания точек поля
          </div>
        </div>
      )}
      {isSearching && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-10 pointer-events-none">
          <div className="text-sm font-medium">Поиск...</div>
        </div>
      )}
    </div>
  );
}