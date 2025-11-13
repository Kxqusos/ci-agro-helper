"use client";
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import type { MutableRefObject } from "react";

export type LeafletMapHandle = {
  latLngToContainerPoint: (lat: number, lng: number) => { x: number; y: number };
  containerPointToLatLng: (x: number, y: number) => { lat: number; lng: number };
  invalidateSize: () => void;
  mapRef: MutableRefObject<any>;
  isPointInRussia: (lat: number, lng: number) => boolean;
  findRegionForPoint: (lat: number, lng: number) => { name: string; id: string } | null;
  highlightRegion: (regionId: string) => void;
  clearRegionHighlight: () => void;
  highlightRegions: (regionIds: string[]) => void;
  searchCity: (cityName: string) => Promise<{ lat: number; lng: number; name: string } | null>;
  flyToCity: (lat: number, lng: number, zoom?: number) => void;
};

interface LeafletMapProps {
  className?: string;
  onMapReady?: () => void;
}

const MapContainer = forwardRef<LeafletMapHandle, LeafletMapProps>(({ className, onMapReady }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const russiaBoundsRef = useRef<any>(null);
  const russiaGeoJsonRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const regionLayersRef = useRef<Map<string, any>>(new Map());
  const geoJsonDataRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    latLngToContainerPoint: (lat: number, lng: number) => {
      if (!mapRef.current) return { x: 0, y: 0 };
      const pt = mapRef.current.latLngToContainerPoint([lat, lng]);
      return { x: pt.x, y: pt.y };
    },
    containerPointToLatLng: (x: number, y: number) => {
      if (!mapRef.current) return { lat: 0, lng: 0 };
      const ll = mapRef.current.containerPointToLatLng([x, y]);
      return { lat: ll.lat, lng: ll.lng };
    },
    invalidateSize: () => {
      mapRef.current?.invalidateSize();
    },
    isPointInRussia: (lat: number, lng: number) => {
      if (!russiaGeoJsonRef.current || !LRef.current) {
        if (russiaBoundsRef.current) {
          return russiaBoundsRef.current.contains([lat, lng]);
        }
        return false;
      }
      
      const point = LRef.current.latLng(lat, lng);
      let found = false;
      
      const pointInPolygon = (point: any, coordinates: number[][][]): boolean => {
        const [lng, lat] = [point.lng, point.lat];
        let inside = false;
        
        const outerRing = coordinates[0];
        if (!outerRing || outerRing.length < 3) return false;
        
        for (let i = 0, j = outerRing.length - 1; i < outerRing.length; j = i++) {
          const [xi, yi] = [outerRing[i][0], outerRing[i][1]];
          const [xj, yj] = [outerRing[j][0], outerRing[j][1]];
          
          const intersect = ((yi > lat) !== (yj > lat)) && 
                           (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        
        if (inside && coordinates.length > 1) {
          for (let holeIdx = 1; holeIdx < coordinates.length; holeIdx++) {
            const hole = coordinates[holeIdx];
            let inHole = false;
            
            for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
              const [xi, yi] = [hole[i][0], hole[i][1]];
              const [xj, yj] = [hole[j][0], hole[j][1]];
              
              const intersect = ((yi > lat) !== (yj > lat)) && 
                               (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
              if (intersect) inHole = !inHole;
            }
            if (inHole) {
              inside = false;
              break;
            }
          }
        }
        
        return inside;
      };
      
      russiaGeoJsonRef.current.eachLayer((layer: any) => {
        if (found) return;
        
        if (layer.getBounds && layer.getBounds().contains(point)) {
          if (layer.feature && layer.feature.geometry) {
            const geometry = layer.feature.geometry;
            
            if (geometry.type === 'Polygon') {
              found = pointInPolygon(point, geometry.coordinates);
            } else if (geometry.type === 'MultiPolygon') {
              for (const polygon of geometry.coordinates) {
                if (pointInPolygon(point, polygon)) {
                  found = true;
                  break;
                }
              }
            }
          }
        }
      });
      
      return found;
    },
   findRegionForPoint: (lat: number, lng: number) => {
  if (!russiaGeoJsonRef.current || !LRef.current) return null;
  
  const point = LRef.current.latLng(lat, lng);
  let foundRegion: any = null;
  
  console.log("🔍 Поиск региона для точки:", lat, lng);
  
  const pointInPolygon = (point: any, coordinates: number[][][]): boolean => {
    const [lng, lat] = [point.lng, point.lat];
    let inside = false;
    
    const outerRing = coordinates[0];
    if (!outerRing || outerRing.length < 3) return false;
    
    for (let i = 0, j = outerRing.length - 1; i < outerRing.length; j = i++) {
      const [xi, yi] = [outerRing[i][0], outerRing[i][1]];
      const [xj, yj] = [outerRing[j][0], outerRing[j][1]];
      
      const intersect = ((yi > lat) !== (yj > lat)) && 
                       (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    if (inside && coordinates.length > 1) {
      for (let holeIdx = 1; holeIdx < coordinates.length; holeIdx++) {
        const hole = coordinates[holeIdx];
        let inHole = false;
        
        for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
          const [xi, yi] = [hole[i][0], hole[i][1]];
          const [xj, yj] = [hole[j][0], hole[j][1]];
          
          const intersect = ((yi > lat) !== (yj > lat)) && 
                           (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
          if (intersect) inHole = !inHole;
        }
        
        if (inHole) {
          inside = false;
          break;
        }
      }
    }
    
    return inside;
  };
      

  
      russiaGeoJsonRef.current.eachLayer((layer: any) => {
        if (foundRegion) return;
        
        if (layer.getBounds && layer.getBounds().contains(point)) {
          if (layer.feature && layer.feature.geometry) {
            const geometry = layer.feature.geometry;
            let isInside = false;
            
            if (geometry.type === 'Polygon') {
              isInside = pointInPolygon(point, geometry.coordinates);
            } else if (geometry.type === 'MultiPolygon') {
              for (const polygon of geometry.coordinates) {
                if (pointInPolygon(point, polygon)) {
                  isInside = true;
                  break;
                }
              }
            }
            
            if (isInside && layer.feature.properties) {
              const props = layer.feature.properties;
              const regionName = props.region || props.name || props.NAME || props.NAME_1 || 'Неизвестный регион';
              const regionId = props.region || props.id || props.ID || props.NAME || props.NAME_1 || `region-${Date.now()}`;
              
              foundRegion = {
                name: regionName,
                id: String(regionId),
                layer: layer
              };
            }
          }
        }
      });
      
      return foundRegion;
    },
    highlightRegion: (regionId: string) => {
      if (!russiaGeoJsonRef.current || !LRef.current) return;
      
      russiaGeoJsonRef.current.eachLayer((layer: any) => {
        if (layer.feature && layer.feature.properties) {
          const props = layer.feature.properties;
          const id = props.region || props.id || props.ID || props.NAME || props.NAME_1;
          if (id === regionId) {
            layer.setStyle({
              color: "#3388ff",
              weight: 3,
              fill: true,
              fillColor: "#3388ff",
              fillOpacity: 0.3,
            });
            regionLayersRef.current.set(regionId, layer);
          }
        }
      });
    },
    clearRegionHighlight: () => {
      regionLayersRef.current.forEach((layer) => {
        layer.setStyle({
          color: "#666666",
          weight: 1,
          fill: false,
          fillOpacity: 0,
        });
      });
      regionLayersRef.current.clear();
    },
    highlightRegions: (regionIds: string[]) => {
      if (!russiaGeoJsonRef.current || !LRef.current) return;
      
      russiaGeoJsonRef.current.eachLayer((layer: any) => {
        layer.setStyle({
          color: "#666666",
          weight: 1,
          fill: false,
          fillOpacity: 0,
        });
      });
      regionLayersRef.current.clear();
      
      russiaGeoJsonRef.current.eachLayer((layer: any) => {
        if (layer.feature && layer.feature.properties) {
          const props = layer.feature.properties;
          const id = props.region || props.id || props.ID || props.NAME || props.NAME_1;
          if (regionIds.includes(id)) {
            layer.setStyle({
              color: "#3388ff",
              weight: 3,
              fill: true,
              fillColor: "#3388ff",
              fillOpacity: 0.3,
            });
            regionLayersRef.current.set(id, layer);
          }
        }
      });
    },
    searchCity: async (cityName: string) => {
      if (!cityName || cityName.trim().length === 0) return null;
      
      try {
        const query = encodeURIComponent(`${cityName}, Россия`);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=ru&accept-language=ru`
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = data[0];
          return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            name: result.display_name
          };
        }
        
        return null;
      } catch (error) {
        console.error("[MapContainer] Error searching city:", error);
        return null;
      }
    },
    flyToCity: (lat: number, lng: number, zoom: number = 12) => {
      if (!mapRef.current || !LRef.current) return;
      
      const map = mapRef.current;
      const targetLatLng = LRef.current.latLng(lat, lng);
      
      if (russiaBoundsRef.current && !russiaBoundsRef.current.contains(targetLatLng)) {
        console.warn("[MapContainer] City is outside Russia bounds");
        return;
      }
      
      map.setView(targetLatLng, zoom, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.25
      });
    },
    mapRef,
  }));

  useEffect(() => {
    console.log("[MapContainer] Initializing Leaflet map...");
    let resizeObserver: ResizeObserver | null = null;
    
    const initMap = async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");
        LRef.current = L;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        if (!containerRef.current) return;

        const russiaBounds = L.latLngBounds(
          [41.2, 19.6],
          [81.2, 180.0]
        );

        const map = L.map(containerRef.current, {
          center: [61.524, 105.3188],
          zoom: 4,
          zoomControl: true,
          dragging: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          maxBounds: russiaBounds,
          maxBoundsViscosity: 1.0,
          minZoom: 3,
          maxZoom: 18,
          worldCopyJump: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        // УДАЛЕНО: создание синего прямоугольника (границы России)
        // const russiaBorder = L.rectangle(russiaBounds, {
        //   color: "#3388ff",
        //   weight: 3,
        //   fill: false,
        //   opacity: 0.8
        // }).addTo(map);

        fetch("/russia_regions.geojson")
          .then((response) => response.json())
          .then((data) => {
            geoJsonDataRef.current = data;
            
            const geoJsonLayer = L.geoJSON(data, {
              style: (feature) => {
                return {
                  color: "#666666",
                  weight: 1,  
                  fill: false,
                  fillOpacity: 0,
                  opacity: 0.6
                };
              },
            }).addTo(map);
            russiaGeoJsonRef.current = geoJsonLayer;
            russiaBoundsRef.current = geoJsonLayer.getBounds();

            if (russiaBoundsRef.current && typeof map.setMaxBoundsViscosity === 'function') {
              map.setMaxBounds(russiaBoundsRef.current);
              map.setMaxBoundsViscosity(1.0);
            }
          })
          .catch((err) => {
            console.error("[MapContainer] Error loading GeoJSON:", err);
          });
        
        mapRef.current = map;
        
        const enforceBounds = () => {
          if (russiaBoundsRef.current) {
            const center = map.getCenter();
            if (!russiaBoundsRef.current.contains(center)) {
              const boundedCenter = russiaBoundsRef.current.getCenter();
              map.setView(boundedCenter, map.getZoom(), { animate: false });
            }
          }
        };
        
        map.on("drag", enforceBounds);
        map.on("dragend", enforceBounds);
        map.on("moveend", enforceBounds);
        map.on("zoomend", enforceBounds);
        
        map.on("zoom", () => {
          if (russiaBoundsRef.current) {
            const bounds = map.getBounds();
            if (!russiaBoundsRef.current.contains(bounds.getNorthEast()) || 
                !russiaBoundsRef.current.contains(bounds.getSouthWest())) {
              map.fitBounds(russiaBoundsRef.current, { padding: [10, 10] });
            }
          }
        });

        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        });

        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }

        setTimeout(() => {
          map.invalidateSize();
          console.log("[MapContainer] Map ready");
          onMapReady?.();
        }, 100);
      } catch (err) {
        console.error("[MapContainer] Leaflet init error:", err);
      }
    };

    initMap();

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onMapReady]);

  return <div ref={containerRef} className={className} />;
});

MapContainer.displayName = 'MapContainer';

export default MapContainer;