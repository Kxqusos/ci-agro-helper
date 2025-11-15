import { BarChart3, PieChart, Mountain, TrendingUp } from 'lucide-react';
import { AnalyticsData, FieldInfo } from '../types';

interface AnalyticsTabProps {
  analyticsData: AnalyticsData;
  selectedField: string;
  onFieldChange: (field: string) => void;
  fieldNames: string[];
  fieldInfo: FieldInfo[];
}

export const AnalyticsTab = ({ 
  analyticsData, 
  selectedField, 
  onFieldChange,
  fieldNames,
  fieldInfo 
}: AnalyticsTabProps) => {
  const cropColors = [
    '#3388ff', '#4ECDC4', '#FFD166', '#FF6B6B', '#A78BFA',
    '#34D399', '#FBBF24', '#60A5FA', '#F472B6', '#10B981'
  ];

  const currentFieldInfo = fieldInfo.find(field => field.name === selectedField);

  return (
    <div className="space-y-4 md:space-y-6 w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <h2 className="text-lg md:text-xl font-semibold text-[#E8F4FF] flex items-center">
          <BarChart3 className="mr-2 text-green-400" size={20} />
          Аналитика севооборота
          {selectedField && (
            <span className="ml-2 text-[#8BA4B8] text-sm font-normal">
              на поле {selectedField}
            </span>
          )}
        </h2>
        
        <div className="flex items-center gap-2">
          <label className="text-[#8BA4B8] text-sm whitespace-nowrap">Поле:</label>
          <select 
            value={selectedField}
            onChange={(e) => onFieldChange(e.target.value)}
            className="px-3 py-2 bg-[#0F1F2F] border border-[#2D4A62] rounded-lg text-[#E8F4FF] text-sm min-w-[120px]"
          >
            <option value="">Все поля</option>
            {fieldNames.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>
      </div>

      {currentFieldInfo && (
        <div className="bg-[#1A2E42] rounded-lg p-4 border border-[#2D4A62]">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-[#8BA4B8]">Название поля</div>
              <div className="text-[#E8F4FF] font-medium">{currentFieldInfo.name}</div>
            </div>
            <div>
              <div className="text-[#8BA4B8]">Площадь</div>
              <div className="text-[#E8F4FF] font-medium">{currentFieldInfo.area} га</div>
            </div>
            <div>
              <div className="text-[#8BA4B8]">Тип почвы</div>
              <div className="text-[#E8F4FF] font-medium">{currentFieldInfo.soilType}</div>
            </div>
            <div>
              <div className="text-[#8BA4B8]">Последняя культура</div>
              <div className="text-[#E8F4FF] font-medium">{currentFieldInfo.lastCrop}</div>
            </div>
          </div>
        </div>
      )}

      {analyticsData.cropsDistribution.length === 0 ? (
        <div className="bg-[#1A2E42] rounded-lg p-6 border border-[#2D4A62] text-center">
          <div className="text-[#8BA4B8]">
            {selectedField 
              ? `Нет данных по севообороту для поля "${selectedField}"`
              : 'Выберите поле для просмотра аналитики севооборота'
            }
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full">
            <div className="bg-[#1A2E42] rounded-lg p-3 md:p-4 border border-[#2D4A62] w-full">
              <h3 className="text-base md:text-lg font-semibold text-[#E8F4FF] mb-3 md:mb-4 flex items-center">
                <PieChart className="mr-2 text-blue-400" size={18} />
                История культур {selectedField && 'на поле'}
              </h3>
              
              <div className="space-y-2 md:space-y-3 max-h-80 overflow-y-auto">
                {analyticsData.cropsDistribution
                  .sort((a, b) => b.year - a.year)
                  .map((crop, index) => (
                  <div key={`${crop.crop}-${crop.year}-${crop.fieldName}`} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2 md:mr-3 flex-shrink-0"
                        style={{ backgroundColor: cropColors[index % cropColors.length] }}
                      ></div>
                      <span className="text-[#E8F4FF] text-sm">{crop.crop}</span>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4">
                      <span className="text-[#8BA4B8] text-xs">{crop.year} год</span>
                      <span className="text-[#E8F4FF] font-medium text-sm">{crop.area} га</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1A2E42] rounded-lg p-3 md:p-4 border border-[#2D4A62] w-full">
              <h3 className="text-base md:text-lg font-semibold text-[#E8F4FF] mb-3 md:mb-4 flex items-center">
                <Mountain className="mr-2 text-green-400" size={18} />
                Состояние почвы {selectedField && 'поля'}
              </h3>
              
              <div className="space-y-3 md:space-y-4">
                {analyticsData.soilHealth.map((soil) => (
                  <div key={soil.parameter}>
                    <div className="flex justify-between items-center mb-1 md:mb-2">
                      <span className="text-[#E8F4FF] text-sm">{soil.parameter}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        soil.status === 'good' ? 'bg-green-500' :
                        soil.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      } text-white`}>
                        {soil.status === 'good' ? 'Норма' : 
                         soil.status === 'warning' ? 'Внимание' : 'Критично'}
                      </span>
                    </div>
                    <div className="w-full bg-[#2D4A62] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          soil.status === 'good' ? 'bg-green-500' :
                          soil.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${(soil.value / (soil.parameter === 'pH' ? 14 : 5)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#1A2E42] rounded-lg p-3 md:p-4 border border-[#2D4A62] w-full">
            <h3 className="text-base md:text-lg font-semibold text-[#E8F4FF] mb-3 md:mb-4 flex items-center">
              <TrendingUp className="mr-2 text-purple-400" size={18} />
              Эффективность севооборота {selectedField && `на поле "${selectedField}"`}
            </h3>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 text-center sm:text-left">
                <div className="text-2xl md:text-3xl font-bold text-[#E8F4FF] mb-2">
                  {analyticsData.rotationEfficiency}%
                </div>
                <div className="text-[#8BA4B8] text-sm">
                  {selectedField 
                    ? 'Оптимальное чередование культур на поле'
                    : 'Общая эффективность севооборота'
                  }
                </div>
                <div className="text-[#8BA4B8] text-xs mt-1">
                  {analyticsData.rotationEfficiency >= 80 ? 'Отличная последовательность культур' :
                   analyticsData.rotationEfficiency >= 60 ? 'Хорошая последовательность' :
                   'Требует оптимизации севооборота'}
                </div>
              </div>
              <div className="w-24 h-24 md:w-32 md:h-32 relative">
                <div className="w-full h-full rounded-full border-8 border-[#2D4A62] relative">
                  <div 
                    className="absolute top-0 left-0 w-full h-full rounded-full border-8 border-green-500 clip-half"
                    style={{
                      clipPath: `inset(0 0 0 50%)`,
                      transform: `rotate(${(analyticsData.rotationEfficiency / 100) * 180}deg)`
                    }}
                  ></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-[#E8F4FF] font-bold text-base md:text-lg">{analyticsData.rotationEfficiency}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};