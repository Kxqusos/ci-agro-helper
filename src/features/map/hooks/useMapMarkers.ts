import { useEffect } from 'react';
import type { LLPoint } from '../types';

interface UseMapMarkersProps {
  mapRef: React.MutableRefObject<any | null>;
  shapes: LLPoint[][];
  currentZoom: number;
  markersRef: React.MutableRefObject<any[]>;
  getPointName: (index: number) => string;
}

export const useMapMarkers = ({
  mapRef,
  shapes,
  currentZoom,
  markersRef,
  getPointName
}: UseMapMarkersProps) => {
  useEffect(() => {
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
          shape.forEach((point, pointIndex) => {
            if (!mapRef.current?.mapRef?.current) return;
            
            const blueIcon = L.icon({
              iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
              shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            });
            
            const marker = L.marker([point.lat, point.lng], { icon: blueIcon })
              .addTo(map)
              .bindPopup(`Точка ${point.name || getPointName(pointIndex)}<br>Фигура ${shapeIndex + 1}`);
            
            markersRef.current.push(marker);
          });
        });
      }).catch(err => {
        console.error("Error loading Leaflet for markers:", err);
      });
    }
    
    return () => {
      markersRef.current.forEach(marker => {
        try {
          if (mapRef.current?.mapRef?.current) {
            mapRef.current.mapRef.current.removeLayer(marker);
          }
        } catch (e) {
        }
      });
      markersRef.current = [];
    };
  }, [currentZoom, shapes, mapRef, markersRef, getPointName]);
};