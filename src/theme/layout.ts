import { Platform, ViewStyle } from 'react-native';

/**
 * Эталон 720×1280 px (@2x) → 360×640 dp — стандартная логическая ширина смартфона.
 * На web показываем именно такой размер, масштабируя под окно браузера.
 */
export const REF_WIDTH = 360;
export const REF_HEIGHT = 640;

export const fullScreen: ViewStyle = Platform.select({
  web: {
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },
  default: {
    flex: 1,
  },
}) as ViewStyle;
