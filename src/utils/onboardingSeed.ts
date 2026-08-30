import { DayRecord, ExerciseColumns } from '../types';

/** Дни прошлой недели для тренировок: пн, ср, пт */
export const PREV_WEEK_EXERCISE_COL = [0, 2, 4];
/** Дни прошлой недели для питания: пн–пт */
export const PREV_WEEK_FOOD_COL = [0, 1, 2, 3, 4];

export const DEFAULT_ONBOARDING_EXERCISE: ExerciseColumns = [
  [4, 4, 4, 4, 8],
  [5, 5, 5, 5, 12],
  [2, 2, 2, 2, 4],
];

/** База для кнопки «Использовать пример» */
export const EXAMPLE_EXERCISE_BASE = [6, 6, 6, 6, 12];

export const DEFAULT_ONBOARDING_MEALS = [250, 400, 500];

function cloneExerciseColumns(exercises: ExerciseColumns): ExerciseColumns {
  return [
    [...exercises[0]],
    [...exercises[1]],
    [...exercises[2]],
  ];
}

export function emptyExerciseColumns(): ExerciseColumns {
  return [[], [], []];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function varyRep(value: number): number {
  return Math.max(1, value + randomInt(-1, 1));
}

/** 5-й подход: база ±100%; первые 4 — случайно 50–60% от 5-го */
export function randomizeExampleSets(
  base: number[] = EXAMPLE_EXERCISE_BASE,
): number[] {
  const fifthBase = base[4] ?? 12;
  const fifthFactor = Math.random() * 2; // 0 … 2 → ±100%
  const fifth = Math.max(1, Math.round(fifthBase * fifthFactor));
  const firstFour = Array.from({ length: 4 }, () => {
    const ratio = 0.5 + Math.random() * 0.1; // 50–60%
    return Math.max(1, Math.round(fifth * ratio));
  });
  return [...firstFour, fifth];
}

function varyGrams(value: number): number {
  const delta = randomInt(-20, 20);
  const biased = Math.abs(delta) < 10 ? (delta >= 0 ? 10 : -10) : delta;
  return Math.max(10, value + biased);
}

/** Пн — как ввели, ср и пт — та же колонка упражнения ±1 повтор */
export function spreadExerciseColumnToExtraDays(
  extraDays: ExerciseColumns[],
  exerciseIdx: 0 | 1 | 2,
  mondayColumn: number[],
): ExerciseColumns[] {
  const wed = extraDays[0] ? cloneExerciseColumns(extraDays[0]) : emptyExerciseColumns();
  const fri = extraDays[1] ? cloneExerciseColumns(extraDays[1]) : emptyExerciseColumns();
  wed[exerciseIdx] = mondayColumn.map(varyRep);
  fri[exerciseIdx] = mondayColumn.map(varyRep);
  return [wed, fri];
}

/**
 * Шаблон одного тренировочного дня → 3 дня прошлой недели (±1 повтор).
 * Питание одного дня → 5 будней (±10–20 г).
 */
export function buildPreviousWeekSeed(
  prevWeekKeys: string[],
  templateExercise: ExerciseColumns,
  templateMeals: number[],
): Record<string, DayRecord> {
  const days: Record<string, DayRecord> = {};

  PREV_WEEK_EXERCISE_COL.forEach((colIdx, dayIdx) => {
    const key = prevWeekKeys[colIdx];
    const exercises =
      dayIdx === 0
        ? cloneExerciseColumns(templateExercise)
        : (cloneExerciseColumns(templateExercise).map((col) =>
            col.map(varyRep),
          ) as ExerciseColumns);

    days[key] = {
      date: key,
      exercises,
      meals: days[key]?.meals ?? [],
    };
  });

  PREV_WEEK_FOOD_COL.forEach((colIdx, dayIdx) => {
    const key = prevWeekKeys[colIdx];
    const existing = days[key];
    const meals =
      dayIdx === 0
        ? [...templateMeals]
        : templateMeals.map(varyGrams);

    days[key] = {
      date: key,
      exercises: existing?.exercises,
      meals,
    };
  });

  return days;
}

/** Превью прошлой недели во время онбординга (1-й день — черновик, остальные — после подтверждения) */
export function buildOnboardingPreviewWeek(
  prevWeekKeys: string[],
  draftExercise: ExerciseColumns,
  confirmedExerciseDays: ExerciseColumns[],
  draftMeals: number[],
  confirmedMealDays: number[][],
): Record<string, DayRecord> {
  const days: Record<string, DayRecord> = {};

  if (draftExercise.some((col) => col.length > 0)) {
    const key = prevWeekKeys[PREV_WEEK_EXERCISE_COL[0]];
    days[key] = { date: key, exercises: cloneExerciseColumns(draftExercise), meals: [] };
  }

  confirmedExerciseDays.forEach((exercises, i) => {
    const colIdx = PREV_WEEK_EXERCISE_COL[i + 1];
    if (colIdx == null) return;
    const key = prevWeekKeys[colIdx];
    const prev = days[key];
    days[key] = {
      date: key,
      exercises: cloneExerciseColumns(exercises),
      meals: prev?.meals ?? [],
    };
  });

  if (draftMeals.length > 0) {
    const key = prevWeekKeys[PREV_WEEK_FOOD_COL[0]];
    const prev = days[key];
    days[key] = {
      date: key,
      exercises: prev?.exercises,
      meals: [...draftMeals],
    };
  }

  confirmedMealDays.forEach((meals, i) => {
    const colIdx = PREV_WEEK_FOOD_COL[i + 1];
    if (colIdx == null) return;
    const key = prevWeekKeys[colIdx];
    const prev = days[key];
    days[key] = {
      date: key,
      exercises: prev?.exercises,
      meals: [...meals],
    };
  });

  return days;
}
