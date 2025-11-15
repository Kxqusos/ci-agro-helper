import { apiClient } from '@/lib/apiClient';
import { Crop, CropsData, CropEconomics } from '../types';

export const cropsApi = {
  getCrops: async (): Promise<Crop[]> => {
    try {
      const data = await apiClient.get<CropsData>('/crops', { skipAuth: true });
      return data.searchIndex.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } catch (error) {
      console.error('Error loading crops:', error);
      throw error;
    }
  },

  calculateEconomics: async (cropId: number, area: number): Promise<CropEconomics> => {
    const seedsPerHectare = 150000;
    const fertilizersPerHectare = 300000;
    const yieldPerHectare = 3500;
    const pricePerKg = 12;

    const expenses = (seedsPerHectare + fertilizersPerHectare) * area;
    const revenue = yieldPerHectare * area * pricePerKg;
    const profit = revenue - expenses;
    const profitability = expenses > 0 ? (profit / expenses) * 100 : 0;

    return { expenses, revenue, profit, profitability };
  }
};