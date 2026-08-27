import { useCallback, useRef } from 'react';

const TAP_COUNT = 5;
const TAP_WINDOW_MS = 5000;

type TableVariant = 'exercise' | 'food';

interface TableGesturesOptions {
  /** 5 тапов по таблице → очистка данных за сегодня */
  onClear: (variant: TableVariant) => void;
}

export function useTableGestures({ onClear }: TableGesturesOptions) {
  const tapsRef = useRef<Record<TableVariant, number[]>>({
    exercise: [],
    food: [],
  });

  const registerTap = useCallback(
    (variant: TableVariant) => {
      const now = Date.now();
      const recent = tapsRef.current[variant].filter(
        (t) => now - t < TAP_WINDOW_MS,
      );
      recent.push(now);
      tapsRef.current[variant] = recent;

      if (recent.length >= TAP_COUNT) {
        tapsRef.current[variant] = [];
        onClear(variant);
      }
    },
    [onClear],
  );

  return { registerTap };
}
