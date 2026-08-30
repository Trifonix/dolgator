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
  exerciseFlaskFill,
  foodFlaskFill,
  prevWeekExerciseAvgPerSet,
  prevWeekFoodDailyAverage,
  todayExerciseSums,
} from '../utils/flaskMetrics';

function syncExerciseIndex(state: AppState, todayKey: string): AppState {
  const exercises = getDayExercises(getDayRecord(state, todayKey));
  return {
    ...state,
    currentExerciseIndex: inferCurrentExerciseIndex(exercises),
  };
}

export function useTrackerData() {
  const [state, setState] = useState<AppState | null>(null);
  const [exerciseCounter, setExerciseCounter] = useState(DEFAULT_STATE.lastExerciseRep);
  const [foodCounter, setFoodCounter] = useState(DEFAULT_STATE.lastMealGrams);

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
  }, [state, todayKey, foodCounter, persist]);

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
  }, [state, todayKey, persist]);

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
  const fallbackAvgPerSet = state?.lastExerciseRep ?? DEFAULT_STATE.lastExerciseRep;
  const exerciseFlasks: [
    ReturnType<typeof exerciseFlaskFill>,
    ReturnType<typeof exerciseFlaskFill>,
    ReturnType<typeof exerciseFlaskFill>,
  ] = [
    exerciseFlaskFill(todaySums[0], prevAvgs[0], fallbackAvgPerSet),
    exerciseFlaskFill(todaySums[1], prevAvgs[1], fallbackAvgPerSet),
    exerciseFlaskFill(todaySums[2], prevAvgs[2], fallbackAvgPerSet),
  ];

  const todayFoodSum = state
    ? sumMealsDay(getDayRecord(state, todayKey).meals)
    : 0;
  const fallbackFoodDay =
    (state?.lastMealGrams ?? DEFAULT_STATE.lastMealGrams) * MAX_MEALS;
  const foodFlask = foodFlaskFill(
    todayFoodSum,
    state ? prevWeekFoodDailyAverage(state.days, prevWeekKeys) : null,
    fallbackFoodDay,
  );

  return {
    ready: state !== null,
    weekDays,
    todayKey,
    exerciseCounter,
    foodCounter,
    adjustExercise,
    adjustFood,
    submitExercise,
    submitFood,
    clearTodayExercise,
    clearTodayFood,
    currentExerciseLabel,
    todayMealsCount,
    todayExerciseSetsCount,
    isExerciseDayFullToday,
    isFoodDayFullToday,
    weekExerciseData,
    weekFoodData,
    weekExerciseTotal,
    prevWeekExerciseTotal,
    weekFoodTotal,
    prevWeekFoodTotal,
    exerciseFlasks,
    foodFlask,
    currentExerciseIndex: state?.currentExerciseIndex ?? 0,
  };
}
