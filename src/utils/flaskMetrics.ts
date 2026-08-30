import { AppState, DayRecord, ExerciseColumns } from '../types';
import { getDayExercises, getDayRecord, sumMealsDay } from '../storage/storage';

/** Нижняя засечка зоны поддержки (жёлтый диапазон) */
export const EXERCISE_BAND_LOW = 0.6;
/** Черта на колбе упражнений: объём прошлой недели = 80% высоты */
export const EXERCISE_MARK_RATIO = 0.8;

/** Засечка нормы еды на колбе */
export const FOOD_MARK_RATIO = 0.95;
/** Красная зона еды */
export const FOOD_RED_RATIO = 0.99;

export type FlaskKind = 'exercise' | 'food';

/** Акцент мигания по высоте заливки колбы */
export function flaskPulseAccent(kind: FlaskKind, fillRatio: number): string {
  if (kind === 'exercise') {
    if (fillRatio >= EXERCISE_MARK_RATIO) return '#66bb6a';
    if (fillRatio >= EXERCISE_BAND_LOW) return '#ffd54f';
    return '#ef5350';
  }
  if (fillRatio >= FOOD_RED_RATIO) return '#ef5350';
  if (fillRatio >= FOOD_MARK_RATIO) return '#ffd54f';
  return '#66bb6a';
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function roundMean(values: number[]): number | null {
  const avg = mean(values);
  return avg == null ? null : Math.round(avg);
}

function asState(days: Record<string, DayRecord>): AppState {
  return { days } as AppState;
}

export function sumExerciseColumn(column: number[]): number {
  return column.reduce((a, b) => a + b, 0);
}

/**
 * Типичная дневная сумма подходов (ноги / грудные / спина) — целое.
 * Дни без подходов в упражнении не входят в среднее.
 */
export function exerciseDailySums(
  days: Record<string, DayRecord>,
  dateKeys: string[],
): [number | null, number | null, number | null] {
  const buckets: [number[], number[], number[]] = [[], [], []];

  for (const key of dateKeys) {
    const exercises = getDayExercises(getDayRecord(asState(days), key));
    for (let i = 0; i < 3; i++) {
      if (exercises[i].length > 0) {
        buckets[i].push(sumExerciseColumn(exercises[i]));
      }
    }
  }

  return [roundMean(buckets[0]), roundMean(buckets[1]), roundMean(buckets[2])];
}

export function prevWeekExerciseDailySums(
  days: Record<string, DayRecord>,
  prevWeekKeys: string[],
): [number | null, number | null, number | null] {
  return exerciseDailySums(days, prevWeekKeys);
}

export interface FlaskFill {
  /** 0…1, заливка внутри колбы (выше 100% не растягивает сосуд) */
  fillRatio: number;
  /** насколько превышена полная колба; рисуется как вытекание */
  overflowRatio: number;
  /** 0…1, положение черты (снизу) */
  markRatio: number;
  hasBaseline: boolean;
}

function firstPositive(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (value != null && value > 0) return value;
  }
  return null;
}

/**
 * Сегодняшняя сумма подходов vs эталон дня.
 * Черта (80%) = типичная сумма за день прошлой недели (6+6+7+7+11 → 37).
 * Полная колба = эталон / 0.8. Чуть выше черты = +1–2 повторения.
 */
export function exerciseFlaskFill(
  todaySum: number,
  prevDailySum: number | null,
  fallbackDailySum = 0,
): FlaskFill {
  const targetVolume = firstPositive(prevDailySum, fallbackDailySum);
  if (targetVolume == null) {
    return {
      fillRatio: 0,
      overflowRatio: 0,
      markRatio: EXERCISE_MARK_RATIO,
      hasBaseline: false,
    };
  }

  const fullVolume = targetVolume / EXERCISE_MARK_RATIO;
  const raw = todaySum / fullVolume;

  return {
    fillRatio: Math.min(1, raw),
    overflowRatio: Math.max(0, raw - 1),
    markRatio: EXERCISE_MARK_RATIO,
    hasBaseline: true,
  };
}

/** Средняя сумма граммов за дни, где была еда */
export function foodDailyAverage(
  days: Record<string, DayRecord>,
  dateKeys: string[],
): number | null {
  const dailyTotals: number[] = [];

  for (const key of dateKeys) {
    const meals = getDayRecord(asState(days), key).meals;
    if (meals.length > 0) {
      dailyTotals.push(sumMealsDay(meals));
    }
  }

  return mean(dailyTotals);
}

/** Средняя сумма граммов за дни прошлой недели, где была еда */
export function prevWeekFoodDailyAverage(
  days: Record<string, DayRecord>,
  prevWeekKeys: string[],
): number | null {
  return foodDailyAverage(days, prevWeekKeys);
}

export interface FoodFlaskFill extends FlaskFill {
  overTarget: boolean;
}

/**
 * Сегодняшняя сумма граммов. 100% колбы = среднесуточная прошлой недели.
 * Черта = 95% — дальше жёлтая, с 99% красная.
 */
export function foodFlaskFill(
  todaySum: number,
  prevDailyAvg: number | null,
  fallbackDaily = 0,
): FoodFlaskFill {
  const capacity = firstPositive(prevDailyAvg, fallbackDaily);
  if (capacity == null) {
    return {
      fillRatio: 0,
      overflowRatio: 0,
      markRatio: FOOD_MARK_RATIO,
      hasBaseline: false,
      overTarget: false,
    };
  }

  const target = capacity * FOOD_MARK_RATIO;
  const raw = todaySum / capacity;

  return {
    fillRatio: Math.min(1, raw),
    overflowRatio: Math.max(0, raw - 1),
    markRatio: FOOD_MARK_RATIO,
    hasBaseline: true,
    overTarget: todaySum > target,
  };
}

export function todayExerciseSums(exercises: ExerciseColumns): [number, number, number] {
  return [
    sumExerciseColumn(exercises[0]),
    sumExerciseColumn(exercises[1]),
    sumExerciseColumn(exercises[2]),
  ];
}
