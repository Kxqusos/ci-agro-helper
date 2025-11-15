import { useMemo } from "react";

export type LLPoint = { lat: number; lng: number };

interface UseFieldAreaProps {
  points: LLPoint[];       
  sides: number[];
}

export function useFieldArea({ points, sides }: UseFieldAreaProps) {
  const area = useMemo(() => {
    const n = sides.length;
    if (n < 3) return 0;

    if (n === 3) {

      const [a, b, c] = sides;
      const s = (a + b + c) / 2;
      return Math.sqrt(s * (s - a) * (s - b) * (s - c)) / 10000;
    }

    if (n === 4) {
      const [a, b, c, d] = sides;
      const s = (a + b + c + d) / 2;
      return Math.sqrt((s - a) * (s - b) * (s - c) * (s - d)) / 10000;
    }

    let sum = 0;
    for (let i = 1; i < n - 1; i++) {
      const [a, b, c] = [sides[0], sides[i], sides[i + 1]];
      const s = (a + b + c) / 2;
      sum += Math.sqrt(s * (s - a) * (s - b) * (s - c));
    }
    return sum / 10000;

  }, [sides]);

  return { area, points };
}
