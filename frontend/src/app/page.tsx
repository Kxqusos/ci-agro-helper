"use client";
import { MapProvider } from "@/features/map/context/MapContext";
import Background from "@/components/layout/Background";
import SearchBar from "@/components/layout/SearchBar";
import CenterDashboard from "@/features/dashboard/components/CenterDashboard";

export default function HomePage() {
  return (
    <MapProvider>
      <main className="min-h-screen w-screen relative overflow-x-hidden" style={{ zIndex: 1 }}>
        <Background />
        <div className="relative z-20">
          <SearchBar />
          <CenterDashboard />
        </div>
      </main>
    </MapProvider>
  );
}