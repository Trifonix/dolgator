import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState,
  DayRecord,
  DEFAULT_STATE,
  EMPTY_EXERCISES,
  ExerciseCell,
  ExerciseColumns,
} from '../types';
import { MAX_SETS } from '../theme/colors';
import { STORAGE_KEY } from '../utils/dates';
import { tryDevAutoImportState } from './devTransfer';

export async function loadState(): Promise<AppState> {
  try {
    if (__DEV__) {
      const imported = await tryDevAutoImportState();
      if (imported) {
        const merged = mergeImportedState(imported);
        await saveState(merged);
        return merged;
      }
    }

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

export function mergeImportedState(imported: AppState): AppState {
  return {
    ...DEFAULT_STATE,
    ...imported,
    days: imported.days ?? {},
  };
}

export function getDayRecord(state: AppState, dateKey: string): DayRecord {
  return (
    state.days[dateKey] ?? {
      date: dateKey,
      meals: [],
    }
  );
}

/** Упражнения дня (миграция со старого exerciseSets) */
export function getDayExercises(day: DayRecord): ExerciseColumns {
  if (day.exercises) {
    return [
      [...day.exercises[0]],
      [...day.exercises[1]],
      [...day.exercises[2]],
    ];
  }

  const result: ExerciseColumns = [[], [], []];
  for (const set of day.exerciseSets ?? []) {
    for (let i = 0; i < 3; i++) {
      result[i].push(set[i]);
    }
  }
  return result;
}

/** Какое упражнение заполняется следующим */
export function inferCurrentExerciseIndex(exercises: ExerciseColumns): 0 | 1 | 2 {
  for (let i = 0; i < 3; i++) {
    if (exercises[i].length < MAX_SETS) return i as 0 | 1 | 2;
  }
  return 2;
}

/** Строки таблицы: подход × [ноги, грудные, спина] */
export function exercisesToTableRows(exercises: ExerciseColumns): ExerciseCell[] {
  return Array.from({ length: MAX_SETS }, (_, rowIdx) => [
    exercises[0][rowIdx] ?? null,
    exercises[1][rowIdx] ?? null,
    exercises[2][rowIdx] ?? null,
  ]);
}

/** Все 15 подходов за день заполнены (5 × 3 упражнения) */
export function isExerciseDayFull(exercises: ExerciseColumns): boolean {
  return exercises.every((col) => col.length >= MAX_SETS);
}

export function sumExerciseDay(exercises: ExerciseColumns): number {
  return exercises[0].reduce((a, b) => a + b, 0)
    + exercises[1].reduce((a, b) => a + b, 0)
    + exercises[2].reduce((a, b) => a + b, 0);
}

export function sumMealsDay(meals: number[]): number {
  return meals.reduce((a, b) => a + b, 0);
}

/** Последнее сохранённое значение повторений (по хронологии записей) */
export function getLastExerciseRepFromHistory(state: AppState): number {
  let last: number | null = null;

  for (const key of Object.keys(state.days).sort()) {
    const exercises = getDayExercises(state.days[key]);
    for (const column of exercises) {
      for (const rep of column) {
        last = rep;
      }
    }
  }

  return last ?? state.lastExerciseRep ?? DEFAULT_STATE.lastExerciseRep;
}

/** Последнее сохранённое значение граммов (по хронологии записей) */
export function getLastMealGramsFromHistory(state: AppState): number {
  let last: number | null = null;

  for (const key of Object.keys(state.days).sort()) {
    for (const grams of state.days[key].meals) {
      last = grams;
    }
  }

  return last ?? state.lastMealGrams ?? DEFAULT_STATE.lastMealGrams;
}

/** Сумма повторений за неделю */
export function sumExerciseWeek(
  days: Record<string, DayRecord>,
  dateKeys: string[],
): number {
  return dateKeys.reduce(
    (total, key) => total + sumExerciseDay(getDayExercises(getDayRecord({ days } as AppState, key))),
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
