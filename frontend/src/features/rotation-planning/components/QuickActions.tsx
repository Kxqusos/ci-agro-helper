import { Plus, BarChart3, Lightbulb } from 'lucide-react';

export const QuickActions = () => {
  return (
    <div className="w-full mx-auto bg-[#172B3E] rounded-xl md:rounded-2xl p-4 md:p-6 mt-4 md:mt-6 border border-[#2D4A62]">
      <h3 className="text-base md:text-lg font-semibold text-[#E8F4FF] mb-3 md:mb-4 text-center">Быстрые действия</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <button className="flex flex-col items-center p-3 md:p-4 bg-[#1A2E42] rounded-lg border border-[#2D4A62] hover:border-[#3388ff] transition-colors">
          <Plus size={20} className="text-blue-400 mb-1 md:mb-2" />
          <span className="text-[#E8F4FF] font-medium text-sm md:text-base">Добавить запись</span>
          <span className="text-[#8BA4B8] text-xs md:text-sm mt-1 text-center">Новая культура</span>
        </button>
        <button className="flex flex-col items-center p-3 md:p-4 bg-[#1A2E42] rounded-lg border border-[#2D4A62] hover:border-[#3388ff] transition-colors">
          <BarChart3 size={20} className="text-green-400 mb-1 md:mb-2" />
          <span className="text-[#E8F4FF] font-medium text-sm md:text-base">Сформировать отчет</span>
          <span className="text-[#8BA4B8] text-xs md:text-sm mt-1 text-center">Аналитика за год</span>
        </button>
        <button className="flex flex-col items-center p-3 md:p-4 bg-[#1A2E42] rounded-lg border border-[#2D4A62] hover:border-[#3388ff] transition-colors">
          <Lightbulb size={20} className="text-yellow-400 mb-1 md:mb-2" />
          <span className="text-[#E8F4FF] font-medium text-sm md:text-base">Новые рекомендации</span>
          <span className="text-[#8BA4B8] text-xs md:text-sm mt-1 text-center">Обновить расчеты</span>
        </button>
      </div>
    </div>
  );
};
