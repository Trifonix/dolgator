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

  /** Стартовые intro-экраны (не упражнения и не еда) */
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
  /** Почти белая заливка колб — контраст с тёмным фоном */
  flaskLiquid: '#f0f0f6',
  border: '#2a2a3a',
  borderGlowExercise: 'rgba(224, 64, 251, 0.4)',
  borderGlowFood: 'rgba(0, 212, 255, 0.4)',
};

export const EXERCISE_LABELS = ['ноги', 'грудные', 'спина'] as const;
/** Подколонки таблицы повторений: ноги / грудные / спина */
export const EXERCISE_COLUMN_COLORS = ['#e040fb', '#ff5c93', '#7b88ff'] as const;
/** Призрак прошлой недели: три серых, без цветного оттенка */
export const EXERCISE_COLUMN_GHOST = ['#5a5a66', '#848490', '#b0b0bc'] as const;
export const MAX_MEALS = 5;
export const MAX_SETS = 5;
