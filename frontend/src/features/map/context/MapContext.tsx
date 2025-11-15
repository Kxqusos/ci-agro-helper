"use client";
import { createContext, useContext, useRef, ReactNode } from "react";
import type { LeafletMapHandle } from "../components/MapContainer";

type MapContextType = {
  mapRef: React.MutableRefObject<LeafletMapHandle | null>;
};

const MapContext = createContext<MapContextType | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<LeafletMapHandle | null>(null);
  
  return (
    <MapContext.Provider value={{ mapRef }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within MapProvider");
  }
  return context;
}