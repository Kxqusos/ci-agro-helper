import { useEffect } from 'react';

interface UseMapEventsProps {
  mapRef: React.MutableRefObject<any | null>;
  setCurrentZoom: (zoom: number) => void;
  draw: () => void;
}

export const useMapEvents = ({
  mapRef,
  setCurrentZoom,
  draw
}: UseMapEventsProps) => {
  useEffect(() => {
    if (!mapRef.current?.mapRef?.current) return;
    
    const map = mapRef.current.mapRef.current;
    
    const redraw = () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      
      requestAnimationFrame(() => {
        draw();
      });
    };
    
    map.on("zoom move", () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      requestAnimationFrame(() => {
        draw();
      });
    });
    
    map.on("moveend zoomend", redraw);
    
    setCurrentZoom(map.getZoom());
    
    return () => {
      map.off("zoom move moveend zoomend", redraw);
    };
  }, [mapRef, setCurrentZoom, draw]);
};