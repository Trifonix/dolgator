export const colors = {
  bg: '#0a0a12',
  bgCard: '#12121c',
  bgCell: '#1a1a28',
  bgCellActive: '#221a32',

  exercise: {
    primary: '#e040fb',
    glow: '#ff00ff',
    dim: '#9c27b0',
    text: '#f48fb1',
  },

  food: {
    primary: '#00d4ff',
    glow: '#00b0ff',
    dim: '#0288d1',
    text: '#80deea',
  },

  /** Название приложения в полосе версии */
  brand: {
    primary: '#9bff6a',
  },
  intro: {
    primary: '#ffd54f',
    dim: '#c6a01e',
    text: '#ffe082',
  },

  text: '#e8e8f0',
  textMuted: '#8888a0',
  compareGood: '#66bb6a',
  compareBad: '#ef5350',
  /** Призрак прошлой недели в таблице текущей */
  ghostText: 'rgba(136, 136, 160, 0.42)',
  /** Базовая заливка колб — «значения», слоновая кость */
  flaskLiquid: '#efe6c8',
  /** Стекло пробирок */
  flaskGlass: '#b7c0cc',
  flaskGlassInner: '#16181f',
  flaskGlassGlow: 'rgba(183, 192, 204, 0.28)',
  flaskGlassPartition: 'rgba(183, 192, 204, 0.55)',
  /** Вертикальные подписи у колб */
  flaskCaptionExercise: '#b8a0d4',
  flaskCaptionFood: '#8ec8e8',
  border: '#2a2a3a',
  borderGlowExercise: 'rgba(224, 64, 251, 0.4)',
  borderGlowFood: 'rgba(0, 212, 255, 0.4)',
};

export const EXERCISE_LABELS = ['ноги', 'грудные', 'спина'] as const;
/** Подколонки таблицы повторений: ноги (жёлтый) / грудные / спина */
export const EXERCISE_COLUMN_COLORS = ['#ffd54f', '#ff5c93', '#7b88ff'] as const;

export type AccentPalette = {
  primary: string;
  glow: string;
  dim: string;
};

/** Цвета кнопок −/OK/+ по текущему упражнению в тренировочном дне */
export const EXERCISE_COLUMN_PALETTES: readonly AccentPalette[] = [
  { primary: '#ffd54f', glow: '#ffeb3b', dim: '#c6a01e' },
  { primary: '#ff5c93', glow: '#ff4081', dim: '#c2185b' },
  { primary: '#7b88ff', glow: '#536dfe', dim: '#3949ab' },
];
/** Призрак прошлой недели: три серых, без цветного оттенка */
export const EXERCISE_COLUMN_GHOST = ['#5a5a66', '#848490', '#b0b0bc'] as const;
export const MAX_MEALS = 5;
export const MAX_SETS = 5;
