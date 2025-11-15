export interface Crop {
  id: number;
  name: string;
  latin: string;
  categories: string[];
  type: 'основная' | 'редкая';
}

export interface CropsData {
  searchIndex: Crop[];
}

export interface CropEconomics {
  expenses: number;
  revenue: number;
  profit: number;
  profitability: number;
}
