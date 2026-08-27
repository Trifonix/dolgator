/** Один подход: [ноги, грудь, спина] */
export type ExerciseSet = [number, number, number];

export interface DayRecord {
  date: string;
  exerciseSets: ExerciseSet[];
  meals: number[];
}

export interface AppState {
  days: Record<string, DayRecord>;
  lastExerciseRep: number;
  lastMealGrams: number;
  /** Индекс текущего упражнения в подходе: 0=ноги, 1=грудь, 2=спина */
  currentExerciseIndex: 0 | 1 | 2;
  /** Черновик текущего подхода */
  currentSetDraft: ExerciseSet;
}

export const DEFAULT_STATE: AppState = {
  days: {},
  lastExerciseRep: 5,
  lastMealGrams: 250,
  currentExerciseIndex: 0,
  currentSetDraft: [0, 0, 0],
};
