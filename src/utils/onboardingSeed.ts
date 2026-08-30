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

export const DEFAULT_ONBOARDING_MEALS = [250, 400, 500];

function cloneExerciseColumns(exercises: ExerciseColumns): ExerciseColumns {
  return [
    [...exercises[0]],
    [...exercises[1]],
    [...exercises[2]],
  ];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function varyRep(value: number): number {
  return Math.max(1, value + randomInt(-1, 1));
}

function varyGrams(value: number): number {
  const delta = randomInt(-20, 20);
  const biased = Math.abs(delta) < 10 ? (delta >= 0 ? 10 : -10) : delta;
  return Math.max(10, value + biased);
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
