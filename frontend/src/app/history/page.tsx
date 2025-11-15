"use client";
import { useState } from "react";
import { Background } from "@/components/layout";
import {
  RotationNavigation,
  RotationTabs,
  HistoryTab,
  AnalyticsTab,
  RecommendationsTab,
  RuleCatalogTab,
  QuickActions,
  useRotationData
} from "@/features/rotation-planning";
import type { RotationTab } from "@/features/rotation-planning";

export default function RotationPlanningPage() {
  const [activeTab, setActiveTab] = useState<RotationTab>('history');
  
  const {
    selectedYear,
    setSelectedYear,
    selectedField,
    setSelectedField,
    years,
    fieldNames,
    fieldInfo,
    filteredHistory,
    analyticsData,
    recommendations,
    historyLoading,
    historyError,
    refreshHistory,
    isUsingMockHistory,
  } = useRotationData();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'history':
        return (
          <HistoryTab
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            years={years}
            fieldNames={fieldNames}
            fieldInfo={fieldInfo}
            filteredHistory={filteredHistory}
            isLoading={historyLoading}
            error={historyError}
            isUsingMockData={isUsingMockHistory}
            onRefresh={refreshHistory}
          />
        );
      case 'analytics':
        return (
          <AnalyticsTab
            analyticsData={analyticsData}
            selectedField={selectedField}
            onFieldChange={setSelectedField}
            fieldNames={fieldNames}
            fieldInfo={fieldInfo}
          />
        );
      case 'recommendations':
        return (
          <RecommendationsTab
            recommendations={recommendations}
            selectedField={selectedField}
            onFieldChange={setSelectedField}
            fieldNames={fieldNames}
          />
        );
      case 'rules':
        return <RuleCatalogTab />;
      default:
        return null;
    }
  };

  return (
    <>
      <Background />
      <RotationNavigation />
      
      <div className="flex flex-col items-center justify-start pt-20 md:pt-24 lg:pt-28 xl:pt-32 pb-8 md:pb-12 lg:pb-16 relative z-10">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="w-full max-w-7xl mx-auto">
            
            <RotationTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
              selectedField={selectedField}
              onFieldChange={setSelectedField}
              fieldNames={fieldNames}
            >
              {renderActiveTab()}
            </RotationTabs>

            <QuickActions />
          </div>
        </div>
      </div>
    </>
  );
}
