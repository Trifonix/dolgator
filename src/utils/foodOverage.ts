import { FOOD_MARK_RATIO } from './flaskMetrics';

/** Шаг «−» / «+» на главном экране */
export const FOOD_COUNTER_STEP = 10;

/** Доп. нажатий «+» в скрытом режиме переедания */
export const FOOD_OVERAGE_PLUS_BUDGET = 20;

/** Порог «у красной границы» — как жёлтая засечка колбы (96% нормы) */
export function isApproachingRedBoundary(
  todaySum: number,
  counter: number,
  norm: number,
): boolean {
  const n = Math.floor(norm);
  if (n <= 0) return false;
  return todaySum + counter >= Math.floor(n * FOOD_MARK_RATIO);
}

/** Если до нормы осталось меньше последнего приёма — половина остатка, до десятков вниз. */
export function suggestNextFoodCounter(
  todaySumAfterMeal: number,
  prevWeekDailyAvg: number,
  lastMealGrams: number,
): number | null {
  const norm = Math.floor(prevWeekDailyAvg);
  if (norm <= 0) return null;
  const remaining = Math.max(0, norm - todaySumAfterMeal);
  if (remaining >= lastMealGrams) return null;
  const half = Math.floor(remaining / 2);
  return Math.floor(half / FOOD_COUNTER_STEP) * FOOD_COUNTER_STEP;
}

export function armOverageIfApproaching(
  todaySum: number,
  counter: number,
  norm: number,
  overageArmed: boolean,
  overagePlusLeft: number,
): { overageArmed: boolean; overagePlusLeft: number } {
  if (overageArmed) {
    return { overageArmed: true, overagePlusLeft };
  }
  if (!isApproachingRedBoundary(todaySum, counter, norm)) {
    return { overageArmed: false, overagePlusLeft: 0 };
  }
  return { overageArmed: true, overagePlusLeft: FOOD_OVERAGE_PLUS_BUDGET };
}

/**
 * Скрытый режим переедания: у красной границы превью (≥96% нормы) —
 * ещё FOOD_OVERAGE_PLUS_BUDGET шагов «+»; «−» возвращает шаг (до потолка).
 */
export function foodCounterAfterAdjust(
  todaySum: number,
  norm: number,
  currentGrams: number,
  delta: number,
  overageArmed: boolean,
  overagePlusLeft: number,
): { next: number; overageArmed: boolean; overagePlusLeft: number } {
  const normFloor = Math.floor(norm);

  if (delta <= 0) {
    const next = Math.max(0, currentGrams + delta);
    if (!overageArmed) {
      return { next, overageArmed: false, overagePlusLeft: 0 };
    }
    return {
      next,
      overageArmed: true,
      overagePlusLeft: Math.min(
        FOOD_OVERAGE_PLUS_BUDGET,
        overagePlusLeft + 1,
      ),
    };
  }

  const next = currentGrams + delta;

  if (!overageArmed) {
    if (!isApproachingRedBoundary(todaySum, next, normFloor)) {
      return { next, overageArmed: false, overagePlusLeft: 0 };
    }
    return {
      next,
      overageArmed: true,
      overagePlusLeft: FOOD_OVERAGE_PLUS_BUDGET - 1,
    };
  }

  if (overagePlusLeft <= 0) {
    return { next: currentGrams, overageArmed: true, overagePlusLeft: 0 };
  }

  return {
    next,
    overageArmed: true,
    overagePlusLeft: overagePlusLeft - 1,
  };
}

export function isFoodOveragePlusBlocked(
  overageArmed: boolean,
  overagePlusLeft: number,
): boolean {
  return overageArmed && overagePlusLeft <= 0;
}

export function resetFoodOverageState(): {
  overageArmed: boolean;
  overagePlusLeft: number;
} {
  return { overageArmed: false, overagePlusLeft: 0 };
}
