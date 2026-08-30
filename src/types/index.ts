/** Три упражнения × до 5 подходов каждое: [ноги[], грудные[], спина[]] */
export type ExerciseColumns = [number[], number[], number[]];

/** Строка таблицы: [ноги, грудные, спина] для одного подхода */
export type ExerciseCell = [number | null, number | null, number | null];

/** @deprecated Старый формат — мигрируется в exercises */
export type ExerciseSet = [number, number, number];

export interface DayRecord {
  date: string;
  /** @deprecated мигрируется в exercises при чтении */
  exerciseSets?: ExerciseSet[];
  exercises?: ExerciseColumns;
  meals: number[];
}

export interface AppState {
  days: Record<string, DayRecord>;
  lastExerciseRep: number;
  lastMealGrams: number;
  /** Текущее упражнение: 0=ноги, 1=грудные, 2=спина */
  currentExerciseIndex: 0 | 1 | 2;
  /** Стартовый мастер пройден */
  onboardingCompleted?: boolean;
}

export const DEFAULT_STATE: AppState = {
  days: {},
  lastExerciseRep: 5,
  lastMealGrams: 250,
  currentExerciseIndex: 0,
  onboardingCompleted: false,
};

export const EMPTY_EXERCISES: ExerciseColumns = [[], [], []];
