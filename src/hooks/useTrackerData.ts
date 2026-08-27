import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getDayRecord,
  loadState,
  saveState,
  sumExerciseDay,
  sumMealsDay,
} from '../storage/storage';
import { AppState, ExerciseSet } from '../types';
import { EXERCISE_LABELS, MAX_MEALS, MAX_SETS } from '../theme/colors';
import { formatDateKey, getCurrentWeekDays } from '../utils/dates';

export function useTrackerData() {
  const [state, setState] = useState<AppState | null>(null);
  const [exerciseCounter, setExerciseCounter] = useState(5);
  const [foodCounter, setFoodCounter] = useState(250);

  const weekDays = useMemo(() => getCurrentWeekDays(), []);
  const weekKeys = useMemo(
    () => weekDays.map((d) => formatDateKey(d)),
    [weekDays],
  );
  const todayKey = formatDateKey(new Date());

  useEffect(() => {
    loadState().then((loaded) => {
      setState(loaded);
      setExerciseCounter(loaded.lastExerciseRep);
      setFoodCounter(loaded.lastMealGrams);
    });
  }, []);

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

  /** OK — записать повторение в таблицу упражнений */
  const submitExercise = useCallback(async () => {
    if (!state) return;

    const today = getDayRecord(state, todayKey);
    if (today.exerciseSets.length >= MAX_SETS) return;

    const draft: ExerciseSet = [...state.currentSetDraft] as ExerciseSet;
    draft[state.currentExerciseIndex] = exerciseCounter;

    let nextIndex = state.currentExerciseIndex;
    let nextDraft = draft;
    let nextSets = today.exerciseSets;

    if (state.currentExerciseIndex === 2) {
      nextSets = [...today.exerciseSets, draft];
      nextDraft = [0, 0, 0];
      nextIndex = 0;
    } else {
      nextIndex = (state.currentExerciseIndex + 1) as 0 | 1 | 2;
    }

    const next: AppState = {
      ...state,
      lastExerciseRep: exerciseCounter,
      currentExerciseIndex: nextIndex,
      currentSetDraft: nextDraft,
      days: {
        ...state.days,
        [todayKey]: {
          ...today,
          exerciseSets: nextSets,
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
    setFoodCounter(state.lastMealGrams);
  }, [state, todayKey, foodCounter, persist]);

  const clearTodayExercise = useCallback(async () => {
    if (!state) return;

    const today = getDayRecord(state, todayKey);
    const next: AppState = {
      ...state,
      currentExerciseIndex: 0,
      currentSetDraft: [0, 0, 0],
      days: {
        ...state.days,
        [todayKey]: { ...today, exerciseSets: [] },
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

  const todaySetsCount = state
    ? getDayRecord(state, todayKey).exerciseSets.length
    : 0;

  const weekExerciseData = weekKeys.map((key) => {
    if (!state) return { sets: [] as ExerciseSet[], sum: 0 };
    const record = getDayRecord(state, key);
    return { sets: record.exerciseSets, sum: sumExerciseDay(record.exerciseSets) };
  });

  const weekFoodData = weekKeys.map((key) => {
    if (!state) return { meals: [] as number[], sum: 0 };
    const record = getDayRecord(state, key);
    return { meals: record.meals, sum: sumMealsDay(record.meals) };
  });

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
    todaySetsCount,
    weekExerciseData,
    weekFoodData,
    currentSetDraft: state?.currentSetDraft ?? ([0, 0, 0] as ExerciseSet),
    currentExerciseIndex: state?.currentExerciseIndex ?? 0,
  };
}
