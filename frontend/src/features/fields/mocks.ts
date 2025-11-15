import type { FieldData, LLPoint } from './types';

const defaultPolygon = (lat: number, lng: number): LLPoint[] => ([
  { lat, lng },
  { lat: lat + 0.01, lng },
  { lat: lat + 0.01, lng: lng + 0.01 },
  { lat, lng: lng + 0.01 },
]);

export const mockFields: FieldData[] = [
  {
    id: 'field-1',
    name: 'Поле Северное',
    area: 50,
    crop: 'Картофель',
    status: 'active',
    isActive: true,
    region: 'Московская область',
    soilType: 'Чернозем',
    coordinates: { lat: 56.1, lng: 37.65 },
    polygon: defaultPolygon(56.1, 37.65),
    plannedOperations: [
      {
        type: 'Посев',
        date: '2024-04-10',
        status: 'completed',
      },
      {
        type: 'Внесение удобрений',
        date: '2024-05-02',
        status: 'planned',
      },
    ],
    irrigationSystem: {
      hasSystem: true,
      type: 'Капельное',
      description: 'Организована система капельного полива для овощных культур',
    },
  },
  {
    id: 'field-2',
    name: 'Поле Южное',
    area: 32,
    crop: 'Пшеница',
    status: 'planned',
    isActive: false,
    region: 'Краснодарский край',
    soilType: 'Суглинистая',
    coordinates: { lat: 45.1, lng: 39.0 },
    polygon: defaultPolygon(45.1, 39.0),
    plannedOperations: [
      {
        type: 'Подготовка почвы',
        date: '2024-03-25',
        status: 'completed',
      },
    ],
    irrigationSystem: {
      hasSystem: false,
      type: '',
      description: '',
    },
  },
  {
    id: 'field-3',
    name: 'Поле Восточное',
    area: 26.5,
    crop: 'Ячмень',
    status: 'active',
    isActive: true,
    region: 'Новосибирская область',
    soilType: 'Супесчаная',
    coordinates: { lat: 54.94, lng: 82.92 },
    polygon: defaultPolygon(54.94, 82.92),
    irrigationSystem: {
      hasSystem: false,
      type: '',
      description: '',
    },
  },
];
