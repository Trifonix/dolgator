import {
  AccentPalette,
  EXERCISE_COLUMN_PALETTES,
  colors,
} from '../theme/colors';
import { ExerciseColumns } from '../types';
import { isExerciseDayFull } from '../storage/storage';

/** Базовая гамма до начала тренировки и после заполнения всех 15 подходов */
export function exerciseCounterAccent(
  exercises: ExerciseColumns,
  currentIndex: 0 | 1 | 2,
): AccentPalette {
  const started = exercises.some((col) => col.length > 0);
  if (!started || isExerciseDayFull(exercises)) {
    return colors.exercise;
  }
  return EXERCISE_COLUMN_PALETTES[currentIndex];
}
