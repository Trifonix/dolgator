import { getDayExercises, getDayRecord } from '../storage/storage';
import { AppState } from '../types';

/** Есть ли хоть какие-то записи повторений или граммов */
export function hasTrackerData(state: AppState): boolean {
  return Object.values(state.days).some((day) => {
    const exercises = getDayExercises(day);
    const hasExercise = exercises.some((col) => col.length > 0);
    return hasExercise || day.meals.length > 0;
  });
}

export function needsOnboarding(state: AppState): boolean {
  if (state.onboardingCompleted) return false;
  return !hasTrackerData(state);
}
