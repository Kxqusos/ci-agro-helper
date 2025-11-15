interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onTabChange, className = '' }: TabsProps) {
  return (
    <div className={`flex justify-center mb-3 sm:mb-4 3xl:mb-6 border-b border-[#2D4A62] ${className}`}>
      <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-shrink-0 pb-2 px-2 sm:px-3 text-xs sm:text-sm md:text-base lg:text-base xl:text-lg 3xl:text-2xl font-medium transition-colors ${
              activeTab === tab.id 
                ? "text-[#E8F4FF]" 
                : "text-[#8BA4B8] hover:text-[#E8F4FF]"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
