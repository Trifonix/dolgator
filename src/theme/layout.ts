import { Platform, ViewStyle } from 'react-native';

/** Базовый размер шрифта для расчёта em-отступов */
export const BASE_FONT = 16;
/** ~1.2em — внешние отступы и зазоры между блоками */
export const GAP = Math.round(BASE_FONT * 1.2);

/** Эталон 720×1280 px (@2x) → 360×640 dp */
export const REF_WIDTH = 360;
export const REF_HEIGHT = 640;

/** Фиксированная высота колб — как два ряда счётчиков */
export const FLASK_HEIGHT = 100;
export const FLASK_EXERCISE_WIDTH = 38;
export const FLASK_FOOD_WIDTH = 16;

/** Мин. отступ снизу под 3-кнопочную навигацию Android (dp) */
export const ANDROID_NAV_BAR_MIN = 40;

export const fullScreen: ViewStyle = Platform.select({
  web: {
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    userSelect: 'none',
  },
  default: {
    flex: 1,
  },
}) as ViewStyle;
