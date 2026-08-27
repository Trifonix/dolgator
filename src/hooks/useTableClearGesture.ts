import { useCallback, useRef } from 'react';

const TAP_COUNT = 5;
const TAP_WINDOW_MS = 5000;

type TableVariant = 'exercise' | 'food';

export function useTableClearGesture(
  onTrigger: (variant: TableVariant) => void,
) {
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
        onTrigger(variant);
      }
    },
    [onTrigger],
  );

  return { registerTap };
}
