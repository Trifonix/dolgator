import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDayExercises,
  getDayRecord,
  getLastExerciseRepFromHistory,
  getLastMealGramsFromHistory,
  inferCurrentExerciseIndex,
  isExerciseDayFull,
  loadState,
  saveState,
  sumExerciseDay,
  sumExerciseWeek,
  sumFoodWeek,
  sumMealsDay,
} from '../storage/storage';
import { AppState, DEFAULT_STATE, EMPTY_EXERCISES, ExerciseColumns } from '../types';
import { EXERCISE_LABELS, MAX_MEALS, MAX_SETS } from '../theme/colors';
import { formatDateKey, getCurrentWeekDays, getPreviousWeekDays } from '../utils/dates';
import {
  exerciseAvgPerSet,
  exerciseFlaskFill,
  foodDailyAverage,
  foodFlaskFill,
  prevWeekExerciseAvgPerSet,
  prevWeekFoodDailyAverage,
  todayExerciseSums,
} from '../utils/flaskMetrics';
import { needsOnboarding } from '../utils/onboarding';
import { buildPreviousWeekSeed, PREV_WEEK_EXERCISE_COL, PREV_WEEK_FOOD_COL } from '../utils/onboardingSeed';
import {
  currentFoodDailyTarget,
  exerciseTargetAvgPerSet,
  foodWeekTarget,
  prevWeekTotals,
} from '../utils/weeklyTargets';

function syncExerciseIndex(state: AppState, todayKey: string): AppState {
  const exercises = getDayExercises(getDayRecord(state, todayKey));
  return {
    ...state,
    currentExerciseIndex: inferCurrentExerciseIndex(exercises),
  };
}

const UNDO_WINDOW_MS = 60_000;

export function useTrackerData() {
  const [state, setState] = useState<AppState | null>(null);
  const [exerciseCounter, setExerciseCounter] = useState(DEFAULT_STATE.lastExerciseRep);
  const [foodCounter, setFoodCounter] = useState(DEFAULT_STATE.lastMealGrams);
  const [exerciseUndoUntil, setExerciseUndoUntil] = useState(0);
  const [foodUndoUntil, setFoodUndoUntil] = useState(0);
  const [clock, setClock] = useState(Date.now());

  const weekDays = useMemo(() => getCurrentWeekDays(), []);
  const weekKeys = useMemo(
    () => weekDays.map((d) => formatDateKey(d)),
    [weekDays],
  );
  const prevWeekKeys = useMemo(
    () => getPreviousWeekDays(weekDays).map((d) => formatDateKey(d)),
    [weekDays],
  );
  const todayKey = formatDateKey(new Date());

  useEffect(() => {
    loadState().then((loaded) => {
      const synced = syncExerciseIndex(loaded, todayKey);
      setState(synced);
      setExerciseCounter(getLastExerciseRepFromHistory(synced));
      setFoodCounter(getLastMealGramsFromHistory(synced));
    });
  }, [todayKey]);

  const persist = useCallback(async (next: AppState) => {
    setState(next);
    await saveState(next);
  }, []);

  useEffect(() => {
    const until = Math.max(exerciseUndoUntil, foodUndoUntil);
    const wait = until - clock;
    if (wait <= 0) return;
    const id = setTimeout(() => setClock(Date.now()), wait);
    return () => clearTimeout(id);
  }, [exerciseUndoUntil, foodUndoUntil, clock]);

  const adjustExercise = useCallback((delta: number) => {
    setExerciseCounter((v) => Math.max(0, v + delta));
  }, []);

  const adjustFood = useCallback((delta: number) => {
    setFoodCounter((v) => Math.max(0, v + delta));
  }, []);

  /** OK — записать повторение в колонку текущего упражнения */
  const submitExercise = useCallback(async () => {
    if (!state) return;

    const today = getDayRecord(state, todayKey);
    const exercises = getDayExercises(today);
    const idx = state.currentExerciseIndex;

    if (exercises[idx].length >= MAX_SETS) return;
    if (exercises.every((col) => col.length >= MAX_SETS)) return;

    const nextExercises: ExerciseColumns = [
      [...exercises[0]],
      [...exercises[1]],
      [...exercises[2]],
    ];
    nextExercises[idx] = [...nextExercises[idx], exerciseCounter];

    const next: AppState = {
      ...state,
      lastExerciseRep: exerciseCounter,
      currentExerciseIndex: inferCurrentExerciseIndex(nextExercises),
      days: {
        ...state.days,
        [todayKey]: {
          ...today,
          exercises: nextExercises,
        },
      },
    };

    await persist(next);
    if (isExerciseDayFull(nextExercises)) {
      setExerciseUndoUntil(Date.now() + UNDO_WINDOW_MS);
    }
  }, [state, todayKey, exerciseCounter, persist]);

  /** OK — записать приём пищи в таблицу */
  const submitFood = useCallback(async () => {
    if (!state) return;

    const today = getDayRecord(state, todayKey);
    if (today.meals.length >= MAX_MEALS) return;

    const next: AppState = {
      ...state,
      lastMealGrams: foodCounter,
      days: {
        ...state.days,
        [todayKey]: {
          ...today,
          meals: [...today.meals, foodCounter],
        },
      },
    };

    await persist(next);
    if ([...today.meals, foodCounter].length >= MAX_MEALS) {
      setFoodUndoUntil(Date.now() + UNDO_WINDOW_MS);
    }
  }, [state, todayKey, foodCounter, persist]);

  const armExerciseUndo = useCallback(() => {
    setExerciseUndoUntil(Date.now() + UNDO_WINDOW_MS);
  }, []);

  const armFoodUndo = useCallback(() => {
    setFoodUndoUntil(Date.now() + UNDO_WINDOW_MS);
  }, []);

  const undoLastExercise = useCallback(async () => {
    if (!state) return;

    const today = getDayRecord(state, todayKey);
    const exercises = getDayExercises(today);
    let col = -1;
    for (let i = 2; i >= 0; i--) {
      if (exercises[i].length > 0) {
        col = i;
        break;
      }
    }
    if (col < 0) return;

    const nextExercises: ExerciseColumns = [
      [...exercises[0]],
      [...exercises[1]],
      [...exercises[2]],
    ];
    nextExercises[col] = nextExercises[col].slice(0, -1);

    const next: AppState = {
      ...state,
      currentExerciseIndex: inferCurrentExerciseIndex(nextExercises),
      days: {
        ...state.days,
        [todayKey]: { ...today, exercises: nextExercises },
      },
    };

    await persist(next);
    setExerciseUndoUntil(0);
  }, [state, todayKey, persist]);

  const undoLastFood = useCallback(async () => {
    if (!state) return;

    const today = getDayRecord(state, todayKey);
    if (today.meals.length === 0) return;

    const next: AppState = {
      ...state,
      days: {
        ...state.days,
        [todayKey]: { ...today, meals: today.meals.slice(0, -1) },
      },
    };

    await persist(next);
    setFoodUndoUntil(0);
  }, [state, todayKey, persist]);

  const clearTodayExercise = useCallback(async () => {
    if (!state) return;

    const today = getDayRecord(state, todayKey);
    const next: AppState = {
      ...state,
      currentExerciseIndex: 0,
      days: {
        ...state.days,
        [todayKey]: {
          ...today,
          exercises: EMPTY_EXERCISES.map((col) => [...col]) as ExerciseColumns,
        },
      },
    };

    await persist(next);
    setExerciseUndoUntil(0);
  }, [state, todayKey, persist]);

  const clearTodayFood = useCallback(async () => {
    if (!state) return;

    const today = getDayRecord(state, todayKey);
    const next: AppState = {
      ...state,
      days: {
        ...state.days,
        [todayKey]: { ...today, meals: [] },
      },
    };

    await persist(next);
    setFoodUndoUntil(0);
  }, [state, todayKey, persist]);

  const completeOnboarding = useCallback(
    async (
      templateExercise: ExerciseColumns,
      templateMeals: number[],
      extraExerciseDays?: ExerciseColumns[],
      extraMealDays?: number[][],
    ) => {
      if (!state) return;

      const seed = buildPreviousWeekSeed(prevWeekKeys, templateExercise, templateMeals);
      extraExerciseDays?.forEach((exercises, i) => {
        const colIdx = PREV_WEEK_EXERCISE_COL[i + 1];
        if (colIdx == null) return;
        const key = prevWeekKeys[colIdx];
        const existing = seed[key];
        seed[key] = {
          date: key,
          exercises: [
            [...exercises[0]],
            [...exercises[1]],
            [...exercises[2]],
          ],
          meals: existing?.meals ?? [],
        };
      });
      extraMealDays?.forEach((meals, i) => {
        const colIdx = PREV_WEEK_FOOD_COL[i + 1];
        if (colIdx == null) return;
        const key = prevWeekKeys[colIdx];
        const existing = seed[key];
        seed[key] = {
          date: key,
          exercises: existing?.exercises,
          meals: [...meals],
        };
      });
      const lastRep =
        templateExercise[2][templateExercise[2].length - 1]
        ?? templateExercise[1][templateExercise[1].length - 1]
        ?? templateExercise[0][templateExercise[0].length - 1]
        ?? DEFAULT_STATE.lastExerciseRep;
      const lastMeal =
        templateMeals[templateMeals.length - 1] ?? DEFAULT_STATE.lastMealGrams;

      const next = syncExerciseIndex(
        {
          ...state,
          onboardingCompleted: true,
          days: { ...state.days, ...seed },
          lastExerciseRep: lastRep,
          lastMealGrams: lastMeal,
        },
        todayKey,
      );

      await persist(next);
      setExerciseCounter(lastRep);
      setFoodCounter(lastMeal);
    },
    [state, prevWeekKeys, todayKey, persist],
  );

  const currentExerciseLabel = state
    ? EXERCISE_LABELS[state.currentExerciseIndex]
    : EXERCISE_LABELS[0];

  const todayMealsCount = state
    ? getDayRecord(state, todayKey).meals.length
    : 0;

  const todayExerciseSetsCount = state
    ? getDayExercises(getDayRecord(state, todayKey))[state.currentExerciseIndex].length
    : 0;

  const isExerciseDayFullToday = state
    ? isExerciseDayFull(getDayExercises(getDayRecord(state, todayKey)))
    : false;

  const isFoodDayFullToday = todayMealsCount >= MAX_MEALS;

  const exerciseUndoArmed = exerciseUndoUntil > clock;
  const foodUndoArmed = foodUndoUntil > clock;

  const weekExerciseData = weekKeys.map((key) => {
    if (!state) return { exercises: EMPTY_EXERCISES, sum: 0 };
    const exercises = getDayExercises(getDayRecord(state, key));
    return { exercises, sum: sumExerciseDay(exercises) };
  });

  const weekFoodData = weekKeys.map((key) => {
    if (!state) return { meals: [] as number[], sum: 0 };
    const record = getDayRecord(state, key);
    return { meals: record.meals, sum: sumMealsDay(record.meals) };
  });

  const ghostExerciseData = weekKeys.map((_, colIdx) => {
    if (!state?.onboardingCompleted) {
      return { exercises: EMPTY_EXERCISES, sum: 0 };
    }
    const key = prevWeekKeys[colIdx];
    const exercises = getDayExercises(getDayRecord(state, key));
    return { exercises, sum: sumExerciseDay(exercises) };
  });

  const ghostFoodData = weekKeys.map((_, colIdx) => {
    if (!state?.onboardingCompleted) {
      return { meals: [] as number[], sum: 0 };
    }
    const key = prevWeekKeys[colIdx];
    const record = getDayRecord(state, key);
    return { meals: record.meals, sum: sumMealsDay(record.meals) };
  });

  const weekExerciseTotal = state
    ? sumExerciseWeek(state.days, weekKeys)
    : 0;
  const prevWeekExerciseTotal = state
    ? sumExerciseWeek(state.days, prevWeekKeys)
    : 0;
  const weekFoodTotal = state
    ? sumFoodWeek(state.days, weekKeys)
    : 0;
  const prevWeekFoodTotal = state
    ? sumFoodWeek(state.days, prevWeekKeys)
    : 0;

  const todayExercises = state
    ? getDayExercises(getDayRecord(state, todayKey))
    : EMPTY_EXERCISES;
  const todaySums = todayExerciseSums(todayExercises);
  const prevAvgs = state
    ? prevWeekExerciseAvgPerSet(state.days, prevWeekKeys)
    : [null, null, null] as const;
  const prevTotals = state ? prevWeekTotals(state, prevWeekKeys) : { food: 0, exercise: 0 };
  const targetAvgs = state
    ? exerciseTargetAvgPerSet(state.days, prevWeekKeys, prevTotals.exercise)
    : [null, null, null] as const;
  const exerciseBaselines = state?.onboardingCompleted ? targetAvgs : prevAvgs;
  const weekAvgsExclToday = state
    ? exerciseAvgPerSet(
        state.days,
        weekKeys.filter((key) => key !== todayKey),
      )
    : [null, null, null] as const;
  const exerciseFlasks: [
    ReturnType<typeof exerciseFlaskFill>,
    ReturnType<typeof exerciseFlaskFill>,
    ReturnType<typeof exerciseFlaskFill>,
  ] = [
    exerciseFlaskFill(
      todaySums[0],
      exerciseBaselines[0],
      weekAvgsExclToday[0] ?? DEFAULT_STATE.lastExerciseRep,
    ),
    exerciseFlaskFill(
      todaySums[1],
      exerciseBaselines[1],
      weekAvgsExclToday[1] ?? DEFAULT_STATE.lastExerciseRep,
    ),
    exerciseFlaskFill(
      todaySums[2],
      exerciseBaselines[2],
      weekAvgsExclToday[2] ?? DEFAULT_STATE.lastExerciseRep,
    ),
  ];

  const todayFoodSum = state
    ? sumMealsDay(getDayRecord(state, todayKey).meals)
    : 0;
  const weekFoodExclToday = state
    ? foodDailyAverage(
        state.days,
        weekKeys.filter((key) => key !== todayKey),
      )
    : null;
  const fallbackFoodDay =
    weekFoodExclToday
    ?? DEFAULT_STATE.lastMealGrams * MAX_MEALS;
  const foodBaseline = state?.onboardingCompleted
    ? currentFoodDailyTarget(state, prevWeekKeys)
    : state
      ? prevWeekFoodDailyAverage(state.days, prevWeekKeys)
      : null;
  const foodFlask = foodFlaskFill(
    todayFoodSum,
    foodBaseline,
    fallbackFoodDay,
  );

  const foodWeekTargetValue = state?.onboardingCompleted
    ? foodWeekTarget(prevTotals.food)
    : null;

  return {
    ready: state !== null,
    needsOnboarding: state ? needsOnboarding(state) : false,
    completeOnboarding,
    weekDays,
    todayKey,
    exerciseCounter,
    foodCounter,
    adjustExercise,
    adjustFood,
    submitExercise,
    submitFood,
    undoLastExercise,
    undoLastFood,
    armExerciseUndo,
    armFoodUndo,
    clearTodayExercise,
    clearTodayFood,
    currentExerciseLabel,
    todayMealsCount,
    todayExerciseSetsCount,
    isExerciseDayFullToday,
    isFoodDayFullToday,
    exerciseUndoArmed,
    foodUndoArmed,
    weekExerciseData,
    weekFoodData,
    ghostExerciseData,
    ghostFoodData,
    foodWeekTargetValue,
    weekExerciseTotal,
    prevWeekExerciseTotal,
    weekFoodTotal,
    prevWeekFoodTotal,
    exerciseFlasks,
    foodFlask,
    currentExerciseIndex: state?.currentExerciseIndex ?? 0,
  };
}
