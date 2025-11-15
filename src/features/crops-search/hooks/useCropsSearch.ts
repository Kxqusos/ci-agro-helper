// hooks/useCropsSearch.ts
"use client";

import { useState, useEffect } from 'react';

// Типы для FAO данных
interface FAOProductPrice {
  item_code: string;
  item_name: string;
  producer_price: number;
  price_index: number | null;
  unit: string;
}

interface FAOPriceData {
  data_source: string;
  domain: string;
  country: string;
  year: number;
  currency_unit: string;
  base_index_period: string;
  products: FAOProductPrice[];
  search_indices: {
    by_item_code: Record<string, any>;
    by_item_name: Record<string, any>;
    by_category: Record<string, string[]>;
  };
}

// Тип для культуры с дополнительными данными
interface Crop {
  id: string;
  name: string;
  latinName?: string;
  type: 'основная' | 'редкая';
  category: string;
  yieldPerHectare: number;
  costPerHectare: number;
  description?: string;
}

// Функция для конвертации SLC в RUB
const convertSlcToRub = (slcPrice: number): number => {
  const exchangeRate = 90; // Примерный курс
  return Math.round(slcPrice * exchangeRate);
};

// Функция для расчета детальных затрат на гектар
const calculateDetailedCosts = (crop: Crop) => {
  const baseCost = crop.costPerHectare;
  
  // Распределяем затраты по категориям (примерные пропорции)
  return {
    seeds: Math.round(baseCost * 0.25),        // Семена - 25%
    fertilizers: Math.round(baseCost * 0.20),  // Удобрения - 20%
    pesticides: Math.round(baseCost * 0.15),   // СЗР - 15%
    fuel: Math.round(baseCost * 0.12),         // ГСМ - 12%
    machinery: Math.round(baseCost * 0.10),    // Техника - 10%
    labor: Math.round(baseCost * 0.08),        // Рабочая сила - 8%
    irrigation: Math.round(baseCost * 0.05),   // Орошение - 5%
    other: Math.round(baseCost * 0.05),        // Прочие - 5%
  };
};

// Mock данные на основе вашего JSON
const mockFAOData: FAOPriceData = {
  data_source: "FAOSTAT",
  domain: "Producer Prices",
  country: "Russian Federation",
  year: 2024,
  currency_unit: "RUB",
  base_index_period: "2014-2016 = 100",
  products: [
    // Зерновые
    {
      "item_code": "0111",
      "item_name": "Пшеница",
      "producer_price": convertSlcToRub(13254.4),
      "price_index": 162.61,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "0112",
      "item_name": "Кукуруза",
      "producer_price": convertSlcToRub(13571.9),
      "price_index": 185.07,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "0113",
      "item_name": "Рис",
      "producer_price": convertSlcToRub(24076.0),
      "price_index": 148.73,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "0114",
      "item_name": "Сорго",
      "producer_price": convertSlcToRub(23232.5),
      "price_index": 130.11,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "0115",
      "item_name": "Ячмень",
      "producer_price": convertSlcToRub(13274.8),
      "price_index": 193.31,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "0116",
      "item_name": "Рожь",
      "producer_price": convertSlcToRub(10939.5),
      "price_index": 204.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "0117",
      "item_name": "Овес",
      "producer_price": convertSlcToRub(10708.8),
      "price_index": 190.56,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "0118",
      "item_name": "Просо",
      "producer_price": convertSlcToRub(13874.2),
      "price_index": 214.41,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01191",
      "item_name": "Тритикале",
      "producer_price": convertSlcToRub(12500),
      "price_index": 180.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01192",
      "item_name": "Гречиха",
      "producer_price": convertSlcToRub(36499.4),
      "price_index": 201.37,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01199.90",
      "item_name": "Другие зерновые",
      "producer_price": convertSlcToRub(14000),
      "price_index": 190.0,
      "unit": "RUB/тонна"
    },

    // Овощи
    {
      "item_code": "01212",
      "item_name": "Капуста",
      "producer_price": convertSlcToRub(21059.6),
      "price_index": 168.39,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01213",
      "item_name": "Цветная капуста и брокколи",
      "producer_price": convertSlcToRub(28765.5),
      "price_index": 140.53,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01221",
      "item_name": "Арбузы",
      "producer_price": convertSlcToRub(37324.5),
      "price_index": 571.72,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01229",
      "item_name": "Дыни",
      "producer_price": convertSlcToRub(5167.9),
      "price_index": 136.57,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01232",
      "item_name": "Огурцы",
      "producer_price": convertSlcToRub(91988.9),
      "price_index": 134.48,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01234",
      "item_name": "Томаты",
      "producer_price": convertSlcToRub(112010.0),
      "price_index": 183.19,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01235",
      "item_name": "Тыквы и кабачки",
      "producer_price": convertSlcToRub(5317.1),
      "price_index": 139.44,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01242",
      "item_name": "Зеленый горошек",
      "producer_price": convertSlcToRub(29750.4),
      "price_index": 140.07,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01243",
      "item_name": "Зеленые бобы и конские бобы",
      "producer_price": convertSlcToRub(21225.0),
      "price_index": 138.61,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01251",
      "item_name": "Морковь и репа",
      "producer_price": convertSlcToRub(17443.3),
      "price_index": 136.65,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01252",
      "item_name": "Зеленый чеснок",
      "producer_price": convertSlcToRub(77548.1),
      "price_index": 123.25,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01253.02",
      "item_name": "Лук репчатый",
      "producer_price": convertSlcToRub(17956.5),
      "price_index": 157.13,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01270",
      "item_name": "Грибы и трюфели",
      "producer_price": convertSlcToRub(119989.6),
      "price_index": 136.63,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01290.90",
      "item_name": "Другие овощи",
      "producer_price": convertSlcToRub(28000),
      "price_index": 135.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01510",
      "item_name": "Картофель",
      "producer_price": convertSlcToRub(17346.1),
      "price_index": 143.19,
      "unit": "RUB/тонна"
    },

    // Фрукты и ягоды
    {
      "item_code": "01330",
      "item_name": "Виноград",
      "producer_price": convertSlcToRub(53771.8),
      "price_index": 253.9,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01341",
      "item_name": "Яблоки",
      "producer_price": convertSlcToRub(26609.5),
      "price_index": 140.29,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01342.01",
      "item_name": "Груши",
      "producer_price": convertSlcToRub(26593.1),
      "price_index": 140.06,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01342.02",
      "item_name": "Айва",
      "producer_price": convertSlcToRub(27306.9),
      "price_index": 142.09,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01343",
      "item_name": "Абрикосы",
      "producer_price": convertSlcToRub(50787.5),
      "price_index": 144.95,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01344.01",
      "item_name": "Вишня",
      "producer_price": convertSlcToRub(52321.8),
      "price_index": 147.57,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01344.02",
      "item_name": "Черешня",
      "producer_price": convertSlcToRub(50074.2),
      "price_index": 144.7,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01345",
      "item_name": "Персики и нектарины",
      "producer_price": convertSlcToRub(49990.5),
      "price_index": 144.74,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01346",
      "item_name": "Сливы",
      "producer_price": convertSlcToRub(51428.7),
      "price_index": 145.2,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01349.10",
      "item_name": "Другие семечковые",
      "producer_price": convertSlcToRub(45000),
      "price_index": 160.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01349.20",
      "item_name": "Другие косточковые",
      "producer_price": convertSlcToRub(55000),
      "price_index": 155.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01351.01",
      "item_name": "Смородина",
      "producer_price": convertSlcToRub(111989.8),
      "price_index": 150.92,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01351.02",
      "item_name": "Крыжовник",
      "producer_price": convertSlcToRub(107931.5),
      "price_index": 148.84,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01353.01",
      "item_name": "Малина",
      "producer_price": convertSlcToRub(108424.8),
      "price_index": 148.59,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01354",
      "item_name": "Клубника",
      "producer_price": convertSlcToRub(108907.7),
      "price_index": 148.14,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01355.90",
      "item_name": "Другие ягоды",
      "producer_price": convertSlcToRub(120000),
      "price_index": 165.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01359.90",
      "item_name": "Другие фрукты",
      "producer_price": convertSlcToRub(35000),
      "price_index": 145.0,
      "unit": "RUB/тонна"
    },

    // Орехи
    {
      "item_code": "01373",
      "item_name": "Каштаны",
      "producer_price": convertSlcToRub(404528.1),
      "price_index": 148.41,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01374",
      "item_name": "Фундук",
      "producer_price": convertSlcToRub(404305.5),
      "price_index": 148.33,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01376",
      "item_name": "Грецкие орехи",
      "producer_price": convertSlcToRub(404419.4),
      "price_index": 148.38,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01379.90",
      "item_name": "Другие орехи",
      "producer_price": convertSlcToRub(250000),
      "price_index": 150.0,
      "unit": "RUB/тонна"
    },

    // Бобовые
    {
      "item_code": "01701",
      "item_name": "Фасоль сухая",
      "producer_price": convertSlcToRub(9164.8),
      "price_index": 71.92,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01702",
      "item_name": "Бобы кормовые сухие",
      "producer_price": convertSlcToRub(10532.6),
      "price_index": 82.65,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01703",
      "item_name": "Нут",
      "producer_price": convertSlcToRub(9772.0),
      "price_index": 76.68,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01704",
      "item_name": "Чечевица",
      "producer_price": convertSlcToRub(10016.7),
      "price_index": 84.34,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01705",
      "item_name": "Горох сухой",
      "producer_price": convertSlcToRub(17787.7),
      "price_index": 153.37,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01709.01",
      "item_name": "Вика",
      "producer_price": convertSlcToRub(9093.3),
      "price_index": 71.36,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01709.02",
      "item_name": "Люпин",
      "producer_price": convertSlcToRub(9318.2),
      "price_index": 73.12,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01709.90",
      "item_name": "Другие бобовые",
      "producer_price": convertSlcToRub(22000),
      "price_index": 140.0,
      "unit": "RUB/тонна"
    },

    // Масличные
    {
      "item_code": "0141",
      "item_name": "Соя",
      "producer_price": convertSlcToRub(39336.2),
      "price_index": 198.45,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01441",
      "item_name": "Лен масличный",
      "producer_price": convertSlcToRub(17508.3),
      "price_index": 121.53,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01442",
      "item_name": "Горчица",
      "producer_price": convertSlcToRub(13548.0),
      "price_index": 123.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01443",
      "item_name": "Рапс",
      "producer_price": convertSlcToRub(38201.2),
      "price_index": 217.72,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01445",
      "item_name": "Подсолнечник",
      "producer_price": convertSlcToRub(31812.1),
      "price_index": 177.71,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01446",
      "item_name": "Сафлор",
      "producer_price": convertSlcToRub(27758.4),
      "price_index": 116.96,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01447",
      "item_name": "Клещевина",
      "producer_price": convertSlcToRub(12321.0),
      "price_index": 115.85,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01449.02",
      "item_name": "Конопля",
      "producer_price": convertSlcToRub(187306.3),
      "price_index": 123.56,
      "unit": "RUB/тонна"
    },

    // Мясо
    {
      "item_code": "21111.01",
      "item_name": "Говядина",
      "producer_price": convertSlcToRub(325051.7),
      "price_index": 146.27,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21111.01b",
      "item_name": "Говядина (био)",
      "producer_price": convertSlcToRub(137209.7),
      "price_index": 155.75,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21113.01",
      "item_name": "Свинина",
      "producer_price": convertSlcToRub(168641.2),
      "price_index": 107.91,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21113.01b",
      "item_name": "Свинина (био)",
      "producer_price": convertSlcToRub(112937.4),
      "price_index": 116.4,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21114",
      "item_name": "Мясо кроликов",
      "producer_price": convertSlcToRub(100348.8),
      "price_index": 104.75,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21114b",
      "item_name": "Мясо кроликов (био)",
      "producer_price": convertSlcToRub(80531.3),
      "price_index": 109.83,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21115",
      "item_name": "Баранина",
      "producer_price": convertSlcToRub(346576.6),
      "price_index": 174.01,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21115b",
      "item_name": "Баранина (био)",
      "producer_price": convertSlcToRub(124780.6),
      "price_index": 158.3,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21116",
      "item_name": "Козлятина",
      "producer_price": convertSlcToRub(226710.8),
      "price_index": 132.3,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21116b",
      "item_name": "Козлятина (био)",
      "producer_price": convertSlcToRub(124762.5),
      "price_index": 158.27,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21117.01",
      "item_name": "Мясо верблюдов",
      "producer_price": convertSlcToRub(123792.4),
      "price_index": 115.74,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21118.01",
      "item_name": "Конина",
      "producer_price": convertSlcToRub(103000.3),
      "price_index": 127.16,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21118.01b",
      "item_name": "Конина (био)",
      "producer_price": convertSlcToRub(130134.6),
      "price_index": 125.31,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21119.90",
      "item_name": "Другое мясо млекопитающих",
      "producer_price": convertSlcToRub(180000),
      "price_index": 125.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21121",
      "item_name": "Курятина",
      "producer_price": convertSlcToRub(128679.4),
      "price_index": 142.19,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "21121b",
      "item_name": "Курятина (био)",
      "producer_price": convertSlcToRub(97362.1),
      "price_index": 140.92,
      "unit": "RUB/тонна"
    },

    // Молочные продукты и яйца
    {
      "item_code": "02211",
      "item_name": "Молоко коровье",
      "producer_price": convertSlcToRub(32435.9),
      "price_index": 156.75,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "02291",
      "item_name": "Молоко овечье",
      "producer_price": convertSlcToRub(45173.6),
      "price_index": 156.92,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "02292",
      "item_name": "Молоко козье",
      "producer_price": convertSlcToRub(28439.9),
      "price_index": 156.89,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "02293",
      "item_name": "Молоко верблюжье",
      "producer_price": convertSlcToRub(28460.2),
      "price_index": 157.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "0231",
      "item_name": "Куриные яйца",
      "producer_price": convertSlcToRub(99172.8),
      "price_index": 141.65,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "0232",
      "item_name": "Яйца птиц",
      "producer_price": convertSlcToRub(95826.6),
      "price_index": 136.92,
      "unit": "RUB/тонна"
    },

    // Другие
    {
      "item_code": "01620",
      "item_name": "Чайный лист",
      "producer_price": convertSlcToRub(800000),
      "price_index": 200.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01654",
      "item_name": "Пряности",
      "producer_price": convertSlcToRub(135075.2),
      "price_index": 149.12,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01659",
      "item_name": "Хмель",
      "producer_price": convertSlcToRub(2265238.1),
      "price_index": 129.82,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01691",
      "item_name": "Цикорий",
      "producer_price": convertSlcToRub(10150.2),
      "price_index": 84.73,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01801",
      "item_name": "Сахарная свекла",
      "producer_price": convertSlcToRub(3750.0),
      "price_index": 142.99,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01929.02",
      "item_name": "Конопля техническая",
      "producer_price": convertSlcToRub(40000),
      "price_index": 160.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "01970",
      "item_name": "Табак",
      "producer_price": convertSlcToRub(549902.5),
      "price_index": 138.63,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "02910",
      "item_name": "Мед натуральный",
      "producer_price": convertSlcToRub(287474.7),
      "price_index": 122.61,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "02941",
      "item_name": "Шерсть",
      "producer_price": convertSlcToRub(150000),
      "price_index": 175.0,
      "unit": "RUB/тонна"
    },
    {
      "item_code": "26190.01",
      "item_name": "Лен обработанный",
      "producer_price": convertSlcToRub(80000),
      "price_index": 180.0,
      "unit": "RUB/тонна"
    }
  ],
  search_indices: {
    by_item_code: {},
    by_item_name: {},
    by_category: {
      "cereals": ["0111", "0112", "0113", "0114", "0115", "0116", "0117", "0118", "01191", "01192", "01199.90"],
      "vegetables": ["01212", "01213", "01221", "01229", "01232", "01234", "01235", "01242", "01243", "01251", "01252", "01253.02", "01270", "01290.90", "01510"],
      "fruits": ["01330", "01341", "01342.01", "01342.02", "01343", "01344.01", "01344.02", "01345", "01346", "01349.10", "01349.20", "01351.01", "01351.02", "01353.01", "01354", "01355.90", "01359.90"],
      "nuts": ["01373", "01374", "01376", "01379.90"],
      "pulses": ["01701", "01702", "01703", "01704", "01705", "01709.01", "01709.02", "01709.90"],
      "oilseeds": ["0141", "01441", "01442", "01443", "01445", "01446", "01447", "01449.02"],
      "meat": ["21111.01", "21111.01b", "21113.01", "21113.01b", "21114", "21114b", "21115", "21115b", "21116", "21116b", "21117.01", "21118.01", "21118.01b", "21119.90", "21121", "21121b"],
      "dairy_eggs": ["02211", "02291", "02292", "02293", "0231", "0232"],
      "other": ["01620", "01654", "01659", "01691", "01801", "01929.02", "01970", "02910", "02941", "26190.01"]
    }
  }
};

// Создаем полный список культур из JSON
const createCropsFromJson = (): Crop[] => {
  const cropsData: Crop[] = [
    // Зерновые (11)
    { id: '0111', name: 'Пшеница', latinName: 'Triticum aestivum', type: 'основная', category: 'Зерновые', yieldPerHectare: 3.5, costPerHectare: 25000, description: 'Основная зерновая культура России' },
    { id: '0112', name: 'Кукуруза', latinName: 'Zea mays', type: 'основная', category: 'Зерновые', yieldPerHectare: 6.0, costPerHectare: 35000, description: 'Высокоурожайная кормовая культура' },
    { id: '0113', name: 'Рис', latinName: 'Oryza sativa', type: 'редкая', category: 'Зерновые', yieldPerHectare: 4.5, costPerHectare: 45000, description: 'Водолюбивая культура' },
    { id: '0114', name: 'Сорго', latinName: 'Sorghum bicolor', type: 'редкая', category: 'Зерновые', yieldPerHectare: 3.5, costPerHectare: 28000, description: 'Засухоустойчивая культура' },
    { id: '0115', name: 'Ячмень', latinName: 'Hordeum vulgare', type: 'основная', category: 'Зерновые', yieldPerHectare: 3.0, costPerHectare: 22000, description: 'Яровая и озимая культура' },
    { id: '0116', name: 'Рожь', latinName: 'Secale cereale', type: 'основная', category: 'Зерновые', yieldPerHectare: 2.8, costPerHectare: 21000, description: 'Морозоустойчивая культура' },
    { id: '0117', name: 'Овес', latinName: 'Avena sativa', type: 'основная', category: 'Зерновые', yieldPerHectare: 2.5, costPerHectare: 20000, description: 'Кормовая культура' },
    { id: '0118', name: 'Просо', latinName: 'Panicum miliaceum', type: 'редкая', category: 'Зерновые', yieldPerHectare: 2.0, costPerHectare: 18000, description: 'Крупяная культура' },
    { id: '01191', name: 'Тритикале', latinName: 'Triticosecale', type: 'редкая', category: 'Зерновые', yieldPerHectare: 3.2, costPerHectare: 23000, description: 'Гибрид ржи и пшеницы' },
    { id: '01192', name: 'Гречиха', latinName: 'Fagopyrum esculentum', type: 'редкая', category: 'Зерновые', yieldPerHectare: 1.2, costPerHectare: 18000, description: 'Медоносная культура' },
    { id: '01199.90', name: 'Другие зерновые', type: 'редкая', category: 'Зерновые', yieldPerHectare: 2.5, costPerHectare: 20000, description: 'Прочие зерновые культуры' },

    // Овощи (15)
    { id: '01212', name: 'Капуста', latinName: 'Brassica oleracea', type: 'основная', category: 'Овощи', yieldPerHectare: 45.0, costPerHectare: 80000, description: 'Распространенная овощная культура' },
    { id: '01213', name: 'Цветная капуста и брокколи', latinName: 'Brassica oleracea', type: 'основная', category: 'Овощи', yieldPerHectare: 20.0, costPerHectare: 120000, description: 'Диетические овощи' },
    { id: '01221', name: 'Арбузы', latinName: 'Citrullus lanatus', type: 'основная', category: 'Овощи', yieldPerHectare: 30.0, costPerHectare: 90000, description: 'Бахчевая культура' },
    { id: '01229', name: 'Дыни', latinName: 'Cucumis melo', type: 'основная', category: 'Овощи', yieldPerHectare: 25.0, costPerHectare: 85000, description: 'Бахчевая культура' },
    { id: '01232', name: 'Огурцы', latinName: 'Cucumis sativus', type: 'основная', category: 'Овощи', yieldPerHectare: 30.0, costPerHectare: 150000, description: 'Тепличный овощ' },
    { id: '01234', name: 'Томаты', latinName: 'Solanum lycopersicum', type: 'основная', category: 'Овощи', yieldPerHectare: 40.0, costPerHectare: 200000, description: 'Тепличная культура' },
    { id: '01235', name: 'Тыквы и кабачки', latinName: 'Cucurbita pepo', type: 'основная', category: 'Овощи', yieldPerHectare: 35.0, costPerHectare: 60000, description: 'Скороспелая культура' },
    { id: '01242', name: 'Зеленый горошек', type: 'основная', category: 'Овощи', yieldPerHectare: 8.0, costPerHectare: 70000, description: 'Овощная культура' },
    { id: '01243', name: 'Зеленые бобы и конские бобы', type: 'основная', category: 'Овощи', yieldPerHectare: 10.0, costPerHectare: 75000, description: 'Бобовые овощи' },
    { id: '01251', name: 'Морковь и репа', latinName: 'Daucus carota', type: 'основная', category: 'Овощи', yieldPerHectare: 35.0, costPerHectare: 90000, description: 'Корнеплодная культура' },
    { id: '01252', name: 'Зеленый чеснок', latinName: 'Allium sativum', type: 'основная', category: 'Овощи', yieldPerHectare: 15.0, costPerHectare: 120000, description: 'Пряная культура' },
    { id: '01253.02', name: 'Лук репчатый', latinName: 'Allium cepa', type: 'основная', category: 'Овощи', yieldPerHectare: 25.0, costPerHectare: 70000, description: 'Популярный овощ' },
    { id: '01270', name: 'Грибы и трюфели', type: 'редкая', category: 'Овощи', yieldPerHectare: 8.0, costPerHectare: 300000, description: 'Грибная культура' },
    { id: '01290.90', name: 'Другие овощи', type: 'основная', category: 'Овощи', yieldPerHectare: 20.0, costPerHectare: 80000, description: 'Прочие овощные культуры' },
    { id: '01510', name: 'Картофель', latinName: 'Solanum tuberosum', type: 'основная', category: 'Овощи', yieldPerHectare: 25.0, costPerHectare: 150000, description: 'Вторая хлебная культура' },

    // Фрукты (17)
    { id: '01330', name: 'Виноград', latinName: 'Vitis vinifera', type: 'редкая', category: 'Фрукты', yieldPerHectare: 8.0, costPerHectare: 180000, description: 'Винодельческая культура' },
    { id: '01341', name: 'Яблоки', latinName: 'Malus domestica', type: 'основная', category: 'Фрукты', yieldPerHectare: 15.0, costPerHectare: 120000, description: 'Популярный фрукт' },
    { id: '01342.01', name: 'Груши', latinName: 'Pyrus communis', type: 'основная', category: 'Фрукты', yieldPerHectare: 10.0, costPerHectare: 90000, description: 'Семечковая культура' },
    { id: '01342.02', name: 'Айва', latinName: 'Cydonia oblonga', type: 'редкая', category: 'Фрукты', yieldPerHectare: 8.0, costPerHectare: 80000, description: 'Плодовая культура' },
    { id: '01343', name: 'Абрикосы', latinName: 'Prunus armeniaca', type: 'редкая', category: 'Фрукты', yieldPerHectare: 7.0, costPerHectare: 85000, description: 'Южная культура' },
    { id: '01344.01', name: 'Вишня', latinName: 'Prunus cerasus', type: 'основная', category: 'Фрукты', yieldPerHectare: 6.0, costPerHectare: 70000, description: 'Плодовая культура' },
    { id: '01344.02', name: 'Черешня', latinName: 'Prunus avium', type: 'основная', category: 'Фрукты', yieldPerHectare: 5.0, costPerHectare: 95000, description: 'Сладкая вишня' },
    { id: '01345', name: 'Персики и нектарины', latinName: 'Prunus persica', type: 'редкая', category: 'Фрукты', yieldPerHectare: 8.0, costPerHectare: 100000, description: 'Теплолюбивая культура' },
    { id: '01346', name: 'Сливы', latinName: 'Prunus domestica', type: 'основная', category: 'Фрукты', yieldPerHectare: 12.0, costPerHectare: 80000, description: 'Косточковая культура' },
    { id: '01349.10', name: 'Другие семечковые', type: 'редкая', category: 'Фрукты', yieldPerHectare: 8.0, costPerHectare: 75000, description: 'Прочие семечковые культуры' },
    { id: '01349.20', name: 'Другие косточковые', type: 'редкая', category: 'Фрукты', yieldPerHectare: 7.0, costPerHectare: 80000, description: 'Прочие косточковые культуры' },
    { id: '01351.01', name: 'Смородина', latinName: 'Ribes rubrum', type: 'основная', category: 'Фрукты', yieldPerHectare: 6.0, costPerHectare: 90000, description: 'Ягодная культура' },
    { id: '01351.02', name: 'Крыжовник', latinName: 'Ribes uva-crispa', type: 'основная', category: 'Фрукты', yieldPerHectare: 5.0, costPerHectare: 85000, description: 'Ягодный кустарник' },
    { id: '01353.01', name: 'Малина', latinName: 'Rubus idaeus', type: 'основная', category: 'Фрукты', yieldPerHectare: 4.0, costPerHectare: 120000, description: 'Ягодная культура' },
    { id: '01354', name: 'Клубника', latinName: 'Fragaria × ananassa', type: 'основная', category: 'Фрукты', yieldPerHectare: 8.0, costPerHectare: 150000, description: 'Популярная ягода' },
    { id: '01355.90', name: 'Другие ягоды', type: 'редкая', category: 'Фрукты', yieldPerHectare: 5.0, costPerHectare: 100000, description: 'Прочие ягодные культуры' },
    { id: '01359.90', name: 'Другие фрукты', type: 'редкая', category: 'Фрукты', yieldPerHectare: 6.0, costPerHectare: 80000, description: 'Прочие фруктовые культуры' },

    // Орехи (4)
    { id: '01373', name: 'Каштаны', latinName: 'Castanea sativa', type: 'редкая', category: 'Орехи', yieldPerHectare: 2.0, costPerHectare: 150000, description: 'Орехоплодная культура' },
    { id: '01374', name: 'Фундук', latinName: 'Corylus avellana', type: 'редкая', category: 'Орехи', yieldPerHectare: 1.5, costPerHectare: 120000, description: 'Орехоплодный кустарник' },
    { id: '01376', name: 'Грецкие орехи', latinName: 'Juglans regia', type: 'редкая', category: 'Орехи', yieldPerHectare: 2.5, costPerHectare: 180000, description: 'Дерево с ценными орехами' },
    { id: '01379.90', name: 'Другие орехи', type: 'редкая', category: 'Орехи', yieldPerHectare: 1.8, costPerHectare: 130000, description: 'Прочие орехоплодные культуры' },

    // Бобовые (8)
    { id: '01701', name: 'Фасоль сухая', latinName: 'Phaseolus vulgaris', type: 'основная', category: 'Бобовые', yieldPerHectare: 1.8, costPerHectare: 25000, description: 'Пищевая культура' },
    { id: '01702', name: 'Бобы кормовые сухие', type: 'основная', category: 'Бобовые', yieldPerHectare: 2.0, costPerHectare: 22000, description: 'Кормовая культура' },
    { id: '01703', name: 'Нут', latinName: 'Cicer arietinum', type: 'редкая', category: 'Бобовые', yieldPerHectare: 1.6, costPerHectare: 23000, description: 'Турецкий горох' },
    { id: '01704', name: 'Чечевица', latinName: 'Lens culinaris', type: 'редкая', category: 'Бобовые', yieldPerHectare: 1.5, costPerHectare: 20000, description: 'Древняя культура' },
    { id: '01705', name: 'Горох сухой', latinName: 'Pisum sativum', type: 'основная', category: 'Бобовые', yieldPerHectare: 2.5, costPerHectare: 22000, description: 'Бобовая культура' },
    { id: '01709.01', name: 'Вика', latinName: 'Vicia sativa', type: 'редкая', category: 'Бобовые', yieldPerHectare: 2.2, costPerHectare: 18000, description: 'Кормовая культура' },
    { id: '01709.02', name: 'Люпин', latinName: 'Lupinus', type: 'редкая', category: 'Бобовые', yieldPerHectare: 2.0, costPerHectare: 20000, description: 'Сидеральная культура' },
    { id: '01709.90', name: 'Другие бобовые', type: 'редкая', category: 'Бобовые', yieldPerHectare: 1.8, costPerHectare: 21000, description: 'Прочие бобовые культуры' },

    // Масличные (8)
    { id: '0141', name: 'Соя', latinName: 'Glycine max', type: 'основная', category: 'Масличные', yieldPerHectare: 2.2, costPerHectare: 30000, description: 'Ценный источник белка' },
    { id: '01441', name: 'Лен масличный', latinName: 'Linum usitatissimum', type: 'редкая', category: 'Масличные', yieldPerHectare: 1.0, costPerHectare: 15000, description: 'Волокнистая культура' },
    { id: '01442', name: 'Горчица', latinName: 'Sinapis alba', type: 'основная', category: 'Масличные', yieldPerHectare: 1.5, costPerHectare: 25000, description: 'Масличная культура' },
    { id: '01443', name: 'Рапс', latinName: 'Brassica napus', type: 'основная', category: 'Масличные', yieldPerHectare: 2.3, costPerHectare: 27000, description: 'Биотопливная культура' },
    { id: '01445', name: 'Подсолнечник', latinName: 'Helianthus annuus', type: 'основная', category: 'Масличные', yieldPerHectare: 2.5, costPerHectare: 28000, description: 'Основная масличная культура' },
    { id: '01446', name: 'Сафлор', latinName: 'Carthamus tinctorius', type: 'редкая', category: 'Масличные', yieldPerHectare: 1.2, costPerHectare: 22000, description: 'Масличная культура' },
    { id: '01447', name: 'Клещевина', latinName: 'Ricinus communis', type: 'редкая', category: 'Масличные', yieldPerHectare: 1.8, costPerHectare: 30000, description: 'Техническая культура' },
    { id: '01449.02', name: 'Конопля', latinName: 'Cannabis sativa', type: 'редкая', category: 'Масличные', yieldPerHectare: 2.0, costPerHectare: 35000, description: 'Техническая культура' },

    // Мясо (16)
    { id: '21111.01', name: 'Говядина', type: 'основная', category: 'Мясо', yieldPerHectare: 0.8, costPerHectare: 500000, description: 'Основной вид мяса' },
    { id: '21111.01b', name: 'Говядина (био)', type: 'редкая', category: 'Мясо', yieldPerHectare: 0.6, costPerHectare: 600000, description: 'Органическая говядина' },
    { id: '21113.01', name: 'Свинина', type: 'основная', category: 'Мясо', yieldPerHectare: 1.2, costPerHectare: 400000, description: 'Популярный вид мяса' },
    { id: '21113.01b', name: 'Свинина (био)', type: 'редкая', category: 'Мясо', yieldPerHectare: 1.0, costPerHectare: 500000, description: 'Органическая свинина' },
    { id: '21114', name: 'Мясо кроликов', type: 'редкая', category: 'Мясо', yieldPerHectare: 2.0, costPerHectare: 300000, description: 'Диетическое мясо' },
    { id: '21114b', name: 'Мясо кроликов (био)', type: 'редкая', category: 'Мясо', yieldPerHectare: 1.8, costPerHectare: 350000, description: 'Органическое мясо кроликов' },
    { id: '21115', name: 'Баранина', type: 'основная', category: 'Мясо', yieldPerHectare: 0.7, costPerHectare: 450000, description: 'Мясо овец' },
    { id: '21115b', name: 'Баранина (био)', type: 'редкая', category: 'Мясо', yieldPerHectare: 0.5, costPerHectare: 550000, description: 'Органическая баранина' },
    { id: '21116', name: 'Козлятина', type: 'редкая', category: 'Мясо', yieldPerHectare: 0.6, costPerHectare: 400000, description: 'Мясо коз' },
    { id: '21116b', name: 'Козлятина (био)', type: 'редкая', category: 'Мясо', yieldPerHectare: 0.4, costPerHectare: 500000, description: 'Органическая козлятина' },
    { id: '21117.01', name: 'Мясо верблюдов', type: 'редкая', category: 'Мясо', yieldPerHectare: 0.5, costPerHectare: 600000, description: 'Экзотическое мясо' },
    { id: '21118.01', name: 'Конина', type: 'редкая', category: 'Мясо', yieldPerHectare: 0.6, costPerHectare: 550000, description: 'Мясо лошадей' },
    { id: '21118.01b', name: 'Конина (био)', type: 'редкая', category: 'Мясо', yieldPerHectare: 0.4, costPerHectare: 650000, description: 'Органическая конина' },
    { id: '21119.90', name: 'Другое мясо млекопитающих', type: 'редкая', category: 'Мясо', yieldPerHectare: 0.5, costPerHectare: 500000, description: 'Прочие виды мяса' },
    { id: '21121', name: 'Курятина', type: 'основная', category: 'Мясо', yieldPerHectare: 3.0, costPerHectare: 350000, description: 'Мясо кур' },
    { id: '21121b', name: 'Курятина (био)', type: 'редкая', category: 'Мясо', yieldPerHectare: 2.5, costPerHectare: 450000, description: 'Органическая курятина' },

    // Молочные продукты и яйца (6)
    { id: '02211', name: 'Молоко коровье', type: 'основная', category: 'Молочные продукты', yieldPerHectare: 8.0, costPerHectare: 200000, description: 'Основной молочный продукт' },
    { id: '02291', name: 'Молоко овечье', type: 'редкая', category: 'Молочные продукты', yieldPerHectare: 4.0, costPerHectare: 250000, description: 'Специализированный продукт' },
    { id: '02292', name: 'Молоко козье', type: 'редкая', category: 'Молочные продукты', yieldPerHectare: 5.0, costPerHectare: 220000, description: 'Диетическое молоко' },
    { id: '02293', name: 'Молоко верблюжье', type: 'редкая', category: 'Молочные продукты', yieldPerHectare: 3.0, costPerHectare: 300000, description: 'Экзотический продукт' },
    { id: '0231', name: 'Куриные яйца', type: 'основная', category: 'Яйца', yieldPerHectare: 2.5, costPerHectare: 180000, description: 'Основной вид яиц' },
    { id: '0232', name: 'Яйца птиц', type: 'редкая', category: 'Яйца', yieldPerHectare: 1.5, costPerHectare: 200000, description: 'Яйца прочих птиц' },

    // Другие (10)
    { id: '01620', name: 'Чайный лист', latinName: 'Camellia sinensis', type: 'редкая', category: 'Другие', yieldPerHectare: 1.5, costPerHectare: 200000, description: 'Чайная культура' },
    { id: '01654', name: 'Пряности', type: 'редкая', category: 'Другие', yieldPerHectare: 0.8, costPerHectare: 150000, description: 'Пряные культуры' },
    { id: '01659', name: 'Хмель', latinName: 'Humulus lupulus', type: 'редкая', category: 'Другие', yieldPerHectare: 1.2, costPerHectare: 250000, description: 'Пивоваренная культура' },
    { id: '01691', name: 'Цикорий', latinName: 'Cichorium intybus', type: 'редкая', category: 'Другие', yieldPerHectare: 15.0, costPerHectare: 80000, description: 'Корнеплодная культура' },
    { id: '01801', name: 'Сахарная свекла', latinName: 'Beta vulgaris', type: 'основная', category: 'Другие', yieldPerHectare: 45.0, costPerHectare: 60000, description: 'Сырье для сахара' },
    { id: '01929.02', name: 'Конопля техническая', latinName: 'Cannabis sativa', type: 'редкая', category: 'Другие', yieldPerHectare: 3.0, costPerHectare: 40000, description: 'Волокнистая культура' },
    { id: '01970', name: 'Табак', latinName: 'Nicotiana tabacum', type: 'редкая', category: 'Другие', yieldPerHectare: 2.0, costPerHectare: 120000, description: 'Техническая культура' },
    { id: '02910', name: 'Мед натуральный', type: 'редкая', category: 'Другие', yieldPerHectare: 0.5, costPerHectare: 300000, description: 'Пчеловодство' },
    { id: '02941', name: 'Шерсть', type: 'редкая', category: 'Другие', yieldPerHectare: 0.3, costPerHectare: 150000, description: 'Животноводство' },
    { id: '26190.01', name: 'Лен обработанный', latinName: 'Linum usitatissimum', type: 'редкая', category: 'Другие', yieldPerHectare: 1.2, costPerHectare: 80000, description: 'Текстильная культура' }
  ];

  return cropsData;
};

export const useCropsSearch = () => {
  const [faoPriceData, setFaoPriceData] = useState<FAOPriceData | null>(null);
  const [faoPrices, setFaoPrices] = useState<FAOProductPrice[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  
  // Состояния для культур
  const [crops, setCrops] = useState<Crop[]>([]);
  const [filteredCrops, setFilteredCrops] = useState<Crop[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [area, setArea] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при монтировании
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Используем mock данные
        setFaoPriceData(mockFAOData);
        setFaoPrices(mockFAOData.products);
        
        // Создаем культуры
        const cropsList = createCropsFromJson();
        setCrops(cropsList);
        setFilteredCrops(cropsList);
        setSelectedCrop(cropsList[0] || null);
        
      } catch (err) {
        setError('Ошибка загрузки данных');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Обновление отфильтрованных культур при изменении поискового запроса
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = crops.filter(crop =>
        crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crop.latinName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crop.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCrops(filtered);
    } else {
      setFilteredCrops(crops);
    }
  }, [searchQuery, crops]);

  // Функция для поиска цены по названию культуры
  const getCropPrice = (cropName: string): FAOProductPrice | undefined => {
    if (!cropName.trim() || !faoPrices.length) return undefined;
    
    const searchName = cropName.toLowerCase();
    
    // Сначала ищем точное совпадение по имени
    let price = faoPrices.find(p => 
      p.item_name.toLowerCase() === searchName
    );
    
    // Если точного совпадения нет, ищем частичное
    if (!price) {
      price = faoPrices.find(p => 
        p.item_name.toLowerCase().includes(searchName) ||
        searchName.includes(p.item_name.toLowerCase())
      );
    }
    
    return price;
  };

  // Функция для получения цены в рублях
  const getPriceInRub = (cropName: string): number => {
    const price = getCropPrice(cropName);
    return price ? price.producer_price : 0;
  };

  // Расчет доходов и затрат
  const calculateProfit = (crop: Crop, area: number) => {
    if (!crop || area <= 0) return null;

    const cropPrice = getCropPrice(crop.name);
    if (!cropPrice || !crop.yieldPerHectare || !crop.costPerHectare) return null;

    const totalYield = crop.yieldPerHectare * area;
    const priceInRub = cropPrice.producer_price;
    const totalRevenue = totalYield * priceInRub;
    const totalCost = crop.costPerHectare * area;
    const totalProfit = totalRevenue - totalCost;
    const profitPerHectare = totalProfit / area;
    const profitability = (totalProfit / totalCost) * 100;

    const detailedCosts = calculateDetailedCosts(crop);

    return {
      totalYield,
      priceInRub,
      totalRevenue,
      totalCost,
      totalProfit,
      profitPerHectare,
      profitability,
      detailedCosts
    };
  };

  // Функция для обработки поиска
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Статистика
  const totalCropsCount = crops.length;
  const mainCropsCount = crops.filter(c => c.type === 'основная').length;
  const rareCropsCount = crops.filter(c => c.type === 'редкая').length;

  return {
    // FAO цены
    faoPrices,
    priceLoading,
    faoPriceData,
    getCropPrice,
    getPriceInRub,
    calculateProfit,
    
    // Состояния культур
    filteredCrops,
    selectedCrop,
    searchQuery,
    area,
    loading,
    error,
    totalCropsCount,
    mainCropsCount,
    rareCropsCount,
    
    // Функции
    setArea,
    setSearchQuery,
    handleSearchChange,
    setSelectedCrop,
  };
};