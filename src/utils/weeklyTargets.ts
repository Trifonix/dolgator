import { getDayExercises, getDayRecord, sumExerciseDay, sumFoodWeek, sumMealsDay } from '../storage/storage';
import { AppState, DayRecord } from '../types';
import { foodDailyAverage, exerciseDailySums } from './flaskMetrics';

/** Снижение недельной нормы питания: ~10 г + 0,15 % от прошлой недели */
export function foodWeekTarget(prevWeekTotal: number): number {
  if (prevWeekTotal <= 0) return 0;
  const drop = Math.max(10, Math.round(prevWeekTotal * 0.0015));
  return Math.max(0, prevWeekTotal - drop);
}

/** Суточная цель питания на текущую неделю */
export function foodDailyTarget(prevWeekTotal: number): number {
  const weekTarget = foodWeekTarget(prevWeekTotal);
  return weekTarget > 0 ? Math.round(weekTarget / 7) : 0;
}

/** Рост недельной нормы упражнений: +3 % (в пределах 1–5 %) */
export function exerciseWeekTarget(prevWeekTotal: number): number {
  if (prevWeekTotal <= 0) return 0;
  return Math.round(prevWeekTotal * 1.03);
}

/** Типичная дневная сумма подходов за прошлую неделю — черта колбы «удержать сумму» */
export function exerciseTargetDailySum(
  days: Record<string, DayRecord>,
  prevWeekKeys: string[],
): [number | null, number | null, number | null] {
  return exerciseDailySums(days, prevWeekKeys);
}

export function prevWeekTotals(state: AppState, prevWeekKeys: string[]) {
  return {
    food: sumFoodWeek(state.days, prevWeekKeys),
    exercise: prevWeekKeys.reduce(
      (total, key) =>
        total + sumExerciseDay(getDayExercises(getDayRecord(state, key))),
      0,
    ),
  };
}

export function currentFoodDailyTarget(state: AppState, prevWeekKeys: string[]): number | null {
  const { food } = prevWeekTotals(state, prevWeekKeys);
  const daily = foodDailyTarget(food);
  return daily > 0 ? daily : foodDailyAverage(state.days, prevWeekKeys);
}
