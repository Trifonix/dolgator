import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, DayRecord, DEFAULT_STATE } from '../types';
import { STORAGE_KEY } from '../utils/dates';

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      days: parsed.days ?? {},
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDayRecord(state: AppState, dateKey: string): DayRecord {
  return (
    state.days[dateKey] ?? {
      date: dateKey,
      exerciseSets: [],
      meals: [],
    }
  );
}

export function sumExerciseDay(sets: DayRecord['exerciseSets']): number {
  return sets.reduce(
    (total, set) => total + set[0] + set[1] + set[2],
    0,
  );
}

export function sumMealsDay(meals: number[]): number {
  return meals.reduce((a, b) => a + b, 0);
}

/** Сумма повторений за неделю */
export function sumExerciseWeek(
  days: Record<string, DayRecord>,
  dateKeys: string[],
): number {
  return dateKeys.reduce(
    (total, key) => total + sumExerciseDay(getDayRecord({ days } as AppState, key).exerciseSets),
    0,
  );
}

/** Сумма грамм за неделю */
export function sumFoodWeek(
  days: Record<string, DayRecord>,
  dateKeys: string[],
): number {
  return dateKeys.reduce(
    (total, key) => total + sumMealsDay(getDayRecord({ days } as AppState, key).meals),
    0,
  );
}
