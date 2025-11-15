import { NextResponse } from 'next/server';

// Временные данные (замените на реальное API)
const mockCropPrices = {
  wheat: { price: 15500, unit: 'руб/тонна', lastUpdated: '2024-01-20' },
  corn: { price: 12800, unit: 'руб/тонна', lastUpdated: '2024-01-20' },
  sunflower: { price: 32000, unit: 'руб/тонна', lastUpdated: '2024-01-20' },
  soybean: { price: 28500, unit: 'руб/тонна', lastUpdated: '2024-01-20' },
  barley: { price: 13500, unit: 'руб/тонна', lastUpdated: '2024-01-20' },
  rye: { price: 14200, unit: 'руб/тонна', lastUpdated: '2024-01-20' },
  oats: { price: 11800, unit: 'руб/тонна', lastUpdated: '2024-01-20' },
  buckwheat: { price: 38000, unit: 'руб/тонна', lastUpdated: '2024-01-20' },
  rice: { price: 42000, unit: 'руб/тонна', lastUpdated: '2024-01-20' },
  potatoes: { price: 25000, unit: 'руб/тонна', lastUpdated: '2024-01-20' }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cropId = searchParams.get('cropId');

    // Если передан конкретный cropId, возвращаем только его цену
    if (cropId && mockCropPrices[cropId as keyof typeof mockCropPrices]) {
      return NextResponse.json({
        [cropId]: mockCropPrices[cropId as keyof typeof mockCropPrices]
      });
    }

    // Иначе возвращаем все цены
    return NextResponse.json(mockCropPrices);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch crop prices' },
      { status: 500 }
    );
  }
}