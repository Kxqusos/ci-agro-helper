'use client';

import { Database, Cloud, CheckCircle2 } from 'lucide-react';
import type { DataSources } from '../services/recommendationsApi';

interface DataSourceBadgeProps {
  dataSources: DataSources;
  filtersApplied?: string[];
}

/**
 * Badge component showing data source status
 *
 * Displays information about where data came from:
 * - Local UI state
 * - Server-side field selector API
 * - Synchronized status
 */
export const DataSourceBadge = ({ dataSources, filtersApplied = [] }: DataSourceBadgeProps) => {
  // Check if data is synchronized (server-side with climate/soil profiles)
  const hasServerClimate = dataSources.climate_profile_source === 'server';
  const hasServerSoil = dataSources.soil_profile_source === 'server';
  const hasAgroZoneFilter = filtersApplied.some((f) => f.includes('agro_zone='));
  const hasSoilProfileFilter = filtersApplied.some((f) => f.includes('soil_profile=true'));

  const isSynchronized =
    dataSources.history_source === 'server' &&
    (hasServerClimate || hasAgroZoneFilter) &&
    (hasServerSoil || hasSoilProfileFilter);

  return (
    <div className="flex flex-wrap gap-2">
      {/* Synchronized badge */}
      {isSynchronized && (
        <div className="px-3 py-1 bg-green-900/20 text-green-400 border border-green-500/30 rounded-full text-xs font-medium flex items-center">
          <CheckCircle2 size={12} className="mr-1" />
          Данные синхронизированы
        </div>
      )}

      {/* History source */}
      <div
        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
          dataSources.history_source === 'server'
            ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
            : 'bg-[#2D4A62] text-[#8BA4B8]'
        }`}
      >
        {dataSources.history_source === 'server' ? (
          <Cloud size={12} className="mr-1" />
        ) : (
          <Database size={12} className="mr-1" />
        )}
        История:{' '}
        {dataSources.history_source === 'server' ? 'сервер' : 'локально'}
      </div>

      {/* Soil profile source */}
      {dataSources.soil_profile_source && (
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
            dataSources.soil_profile_source === 'server'
              ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
              : 'bg-[#2D4A62] text-[#8BA4B8]'
          }`}
        >
          {dataSources.soil_profile_source === 'server' ? (
            <Cloud size={12} className="mr-1" />
          ) : (
            <Database size={12} className="mr-1" />
          )}
          Почва:{' '}
          {dataSources.soil_profile_source === 'server' ? 'сервер' : 'локально'}
        </div>
      )}

      {/* Climate profile source */}
      {dataSources.climate_profile_source && (
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
            dataSources.climate_profile_source === 'server'
              ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30'
              : 'bg-[#2D4A62] text-[#8BA4B8]'
          }`}
        >
          {dataSources.climate_profile_source === 'server' ? (
            <Cloud size={12} className="mr-1" />
          ) : (
            <Database size={12} className="mr-1" />
          )}
          Климат:{' '}
          {dataSources.climate_profile_source === 'server' ? 'сервер' : 'локально'}
        </div>
      )}
    </div>
  );
};
