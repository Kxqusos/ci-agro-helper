import { NextResponse } from 'next/server';
import { CombinedPriceService } from '@/features/crops-search/services/combinedPriceService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cropId = searchParams.get('cropId');
    const update = searchParams.get('update') === 'true';

    let prices;

    if (update) {
      prices = await CombinedPriceService.getUpdatedPrices();
    } else {
      prices = await CombinedPriceService.getBestPrices();
    }

    // Если запрашивается конкретная культура
    if (cropId) {
      const cropPrice = prices.find(price => price.commodity === cropId);
      return NextResponse.json({
        success: true,
        data: cropPrice || null,
        source: cropPrice?.source || 'not_found'
      });
    }

    // Возвращаем все цены
    return NextResponse.json({
      success: true,
      data: prices,
      count: prices.length,
      timestamp: new Date().toISOString(),
      source: prices[0]?.source || 'local'
    });

  } catch (error) {
    console.error('Error in smart-prices API:', error);
    
    // Всегда возвращаем данные, даже при ошибке
    const fallbackData = CombinedPriceService.getLocalBackupData();
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch external prices, using local data',
      data: fallbackData,
      count: fallbackData.length,
      timestamp: new Date().toISOString(),
      source: 'local_fallback'
    });
  }
}