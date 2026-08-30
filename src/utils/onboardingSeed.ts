import { DayRecord, ExerciseColumns } from '../types';

/** Дни прошлой недели для тренировок: пн, ср, пт */
export const PREV_WEEK_EXERCISE_COL = [0, 2, 4];
/** Дни прошлой недели для питания: вся неделя */
export const PREV_WEEK_FOOD_COL = [0, 1, 2, 3, 4, 5, 6];

export const DEFAULT_ONBOARDING_EXERCISE: ExerciseColumns = [
  [4, 4, 4, 4, 8],
  [5, 5, 5, 5, 12],
  [2, 2, 2, 2, 4],
];

/** База для кнопки «Использовать пример» */
export const EXAMPLE_EXERCISE_BASE = [6, 6, 6, 6, 12];

export const DEFAULT_ONBOARDING_MEALS = [250, 400, 500];

/** База примера: 4 приёма, как «400-200-450-500» */
export const EXAMPLE_FOOD_BASE = [400, 200, 450, 500];

function roundToTen(value: number): number {
  return Math.max(50, Math.round(value / 10) * 10);
}

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
  return roundToTen(value + biased);
}

/**
 * 3 или 4 приёма: последний — база 500 ±100%, остальные 40–80% от него.
 */
export function randomizeExampleMeals(
  baseLargest = EXAMPLE_FOOD_BASE[EXAMPLE_FOOD_BASE.length - 1],
): number[] {
  const count = randomInt(3, 4);
  const largest = roundToTen(baseLargest * (0.5 + Math.random() * 1.5));
  const others = Array.from({ length: count - 1 }, () => {
    const ratio = 0.4 + Math.random() * 0.4;
    return roundToTen(largest * ratio);
  });
  return [...others, Math.max(50, largest)];
}

/** Пн + остальные дни недели: у каждого 3–4 приёма */
export function randomizeFoodWeek(dayCount = 7): { monday: number[]; extra: number[][] } {
  const monday = randomizeExampleMeals();
  const extra = Array.from({ length: Math.max(0, dayCount - 1) }, () =>
    randomizeExampleMeals(),
  );
  return { monday, extra };
}

/** Ср и пт: те же подходы, что в пн, каждый ±1 повтор */
export function planExerciseExtraDaySets(mondayColumn: number[]): {
  wed: number[];
  fri: number[];
} {
  return {
    wed: mondayColumn.map(varyRep),
    fri: mondayColumn.map(varyRep),
  };
}

/** Добавить один подход в ср (0) или пт (1) */
export function appendExerciseSetToExtraDay(
  extraDays: ExerciseColumns[],
  dayIdx: 0 | 1,
  exerciseIdx: 0 | 1 | 2,
  value: number,
): ExerciseColumns[] {
  const next: ExerciseColumns[] = [
    extraDays[0] ? cloneExerciseColumns(extraDays[0]) : emptyExerciseColumns(),
    extraDays[1] ? cloneExerciseColumns(extraDays[1]) : emptyExerciseColumns(),
  ];
  next[dayIdx][exerciseIdx] = [...next[dayIdx][exerciseIdx], value];
  return next;
}

/** Пн — как ввели, ср и пт — та же колонка упражнения ±1 повтор */
export function spreadExerciseColumnToExtraDays(
  extraDays: ExerciseColumns[],
  exerciseIdx: 0 | 1 | 2,
  mondayColumn: number[],
): ExerciseColumns[] {
  const planned = planExerciseExtraDaySets(mondayColumn);
  const wed = extraDays[0] ? cloneExerciseColumns(extraDays[0]) : emptyExerciseColumns();
  const fri = extraDays[1] ? cloneExerciseColumns(extraDays[1]) : emptyExerciseColumns();
  wed[exerciseIdx] = planned.wed;
  fri[exerciseIdx] = planned.fri;
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
