import { Platform, ViewStyle } from 'react-native';

/** Эталонный размер экрана смартфона */
export const REF_WIDTH = 720;
export const REF_HEIGHT = 1280;

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
