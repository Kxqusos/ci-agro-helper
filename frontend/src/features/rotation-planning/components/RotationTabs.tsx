import { Calendar, BarChart3, Lightbulb, BookOpen } from 'lucide-react';
import { RotationTab } from '../types';

interface RotationTabsProps {
  activeTab: RotationTab;
  onTabChange: (tab: RotationTab) => void;
  children: React.ReactNode;
}

export const RotationTabs = ({ activeTab, onTabChange, children }: RotationTabsProps) => {
  return (
    <div className="w-full mx-auto bg-[#172B3E] rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#2D4A62] min-h-[500px] md:min-h-[600px]">
      <div className="w-full bg-[#172B3E] rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-[#2D4A62]">
        <div className="flex justify-center">
          <div className="flex flex-wrap gap-1 bg-[#0F1F2F] rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => onTabChange('history')}
              className={`flex items-center px-3 py-2 rounded-md transition-colors text-xs md:text-sm font-medium flex-1 sm:flex-none justify-center ${
                activeTab === 'history' 
                  ? 'bg-[#3388ff] text-white' 
                  : 'text-[#8BA4B8] hover:text-[#E8F4FF]'
              }`}
            >
              <Calendar size={16} className="mr-1 md:mr-2" />
              История
            </button>
            <button
              onClick={() => onTabChange('analytics')}
              className={`flex items-center px-3 py-2 rounded-md transition-colors text-xs md:text-sm font-medium flex-1 sm:flex-none justify-center ${
                activeTab === 'analytics' 
                  ? 'bg-[#3388ff] text-white' 
                  : 'text-[#8BA4B8] hover:text-[#E8F4FF]'
              }`}
            >
              <BarChart3 size={16} className="mr-1 md:mr-2" />
              Аналитика
            </button>
            <button
              onClick={() => onTabChange('recommendations')}
              className={`flex items-center px-3 py-2 rounded-md transition-colors text-xs md:text-sm font-medium flex-1 sm:flex-none justify-center ${
                activeTab === 'recommendations'
                  ? 'bg-[#3388ff] text-white'
                  : 'text-[#8BA4B8] hover:text-[#E8F4FF]'
              }`}
            >
              <Lightbulb size={16} className="mr-1 md:mr-2" />
              Рекомендации
            </button>
            <button
              onClick={() => onTabChange('rules')}
              className={`flex items-center px-3 py-2 rounded-md transition-colors text-xs md:text-sm font-medium flex-1 sm:flex-none justify-center ${
                activeTab === 'rules'
                  ? 'bg-[#3388ff] text-white'
                  : 'text-[#8BA4B8] hover:text-[#E8F4FF]'
              }`}
            >
              <BookOpen size={16} className="mr-1 md:mr-2" />
              Правила
            </button>
          </div>
        </div>
      </div>

      <div className="w-full">
        {children}
      </div>
    </div>
  );
};
