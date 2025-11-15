import { NextResponse } from 'next/server';
import type { FieldSelectorContext } from '@/features/rotation-planning/services/fieldSelectorTypes';

/**
 * BFF route for field selector context
 *
 * This is a temporary mock implementation that returns field context
 * from local/mock data. In the future, this will proxy requests to
 * the field selector service.
 *
 * @route GET /api/field-selector/[fieldId]/context
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  const { fieldId } = await params;

  try {
    // TODO: Replace with actual field selector service call
    // For now, return mock data based on fieldId
    const mockContext: FieldSelectorContext = {
      field_id: fieldId,
      field_name: `Поле ${fieldId}`,
      history: [
        {
          year: 2024,
          season: 'summer',
          crop_id: 1,
          crop_name: 'Пшеница',
          notes: 'Хороший урожай'
        },
        {
          year: 2023,
          season: 'summer',
          crop_id: 3,
          crop_name: 'Ячмень',
          notes: 'Средний урожай'
        },
        {
          year: 2022,
          season: 'summer',
          crop_id: 2,
          crop_name: 'Горох',
          notes: 'Сидерат'
        }
      ],
      soil_profile: {
        ph: 6.5,
        soil_type: ['Чернозем'],
        organic_matter: 'средняя',
        drainage: 'хороший'
      },
      climate_profile: {
        agro_zone: 'Степь',
        frost_risk: 'medium',
        drought_risk: 'medium',
        avg_temperature_c: 8.5,
        annual_precipitation_mm: 450
      },
      metadata: {
        last_updated: new Date().toISOString(),
        data_completeness: 0.85
      }
    };

    return NextResponse.json(mockContext, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Data-Source': 'mock',
      }
    });
  } catch (error) {
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch field context',
        field_id: fieldId,
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
