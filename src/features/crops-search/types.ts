export interface Crop {
  id: string;
  name: string;
  latin: string;
  categories: string[];
  type: 'основная' | 'редкая';
  yield?: number; // урожайность в т/га
  description?: string;
}