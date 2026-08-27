import { useCallback, useRef } from 'react';

const TAP_COUNT = 5;
const TAP_WINDOW_MS = 5000;
const SECRET_SEQUENCE_MS = 8000;

type TableVariant = 'exercise' | 'food';

interface TableGesturesOptions {
  onClear: (variant: TableVariant) => void;
  onOpenChangelog: () => void;
}

export function useTableGestures({
  onClear,
  onOpenChangelog,
}: TableGesturesOptions) {
  const clearTapsRef = useRef<Record<TableVariant, number[]>>({
    exercise: [],
    food: [],
  });
  const secretFoodTapsRef = useRef<number[]>([]);
  const awaitingFoodSecretRef = useRef(false);
  const secretTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetSecret = useCallback(() => {
    awaitingFoodSecretRef.current = false;
    secretFoodTapsRef.current = [];
    if (secretTimerRef.current) {
      clearTimeout(secretTimerRef.current);
      secretTimerRef.current = null;
    }
  }, []);

  const registerTap = useCallback(
    (variant: TableVariant) => {
      const now = Date.now();

      if (awaitingFoodSecretRef.current) {
        if (variant === 'food') {
          const recent = secretFoodTapsRef.current.filter(
            (t) => now - t < TAP_WINDOW_MS,
          );
          recent.push(now);
          secretFoodTapsRef.current = recent;

          if (recent.length >= TAP_COUNT) {
            resetSecret();
            clearTapsRef.current.exercise = [];
            clearTapsRef.current.food = [];
            onOpenChangelog();
          }
        } else {
          resetSecret();
        }
        return;
      }

      const recent = clearTapsRef.current[variant].filter(
        (t) => now - t < TAP_WINDOW_MS,
      );
      recent.push(now);
      clearTapsRef.current[variant] = recent;

      if (recent.length < TAP_COUNT) return;

      clearTapsRef.current[variant] = [];

      if (variant === 'exercise') {
        awaitingFoodSecretRef.current = true;
        secretFoodTapsRef.current = [];
        secretTimerRef.current = setTimeout(() => {
          resetSecret();
          onClear('exercise');
        }, SECRET_SEQUENCE_MS);
        return;
      }

      onClear('food');
    },
    [onClear, onOpenChangelog, resetSecret],
  );

  return { registerTap };
}
