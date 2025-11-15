import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'data', 'crops.json');
    console.log('Looking for crops.json at:', filePath);
    
    const fileContents = readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading crops.json:', error);
    
    const fallbackData = {
      searchIndex: [
        {
          id: 1,
          name: "Пшеница мягкая",
          latin: "Triticum aestivum",
          categories: ["Зерновые культуры"],
          type: "основная"
        },
        {
          id: 2,
          name: "Пшеница твёрдая",
          latin: "Triticum durum",
          categories: ["Зерновые культуры"],
          type: "основная"
        },
        {
          id: 3,
          name: "Ячмень",
          latin: "Hordeum vulgare",
          categories: ["Зерновые культуры"],
          type: "основная"
        },
        {
          id: 4,
          name: "Овёс",
          latin: "Avena sativa",
          categories: ["Зерновые культуры"],
          type: "основная"
        }
      ]
    };
    
    return NextResponse.json(fallbackData);
  }
}