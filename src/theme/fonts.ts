import { Platform } from 'react-native';

/** Три роли шрифта в таблицах: прошлое / текущее / служебное */
export const fonts = {
  /** Серые повторения, сумма прошлой недели, суммы дней прошлой недели */
  past: Platform.select({
    web: 'Georgia, "Palatino Linotype", Times, serif',
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }) as string,
  /** Цветные повторения этой недели и её суммы */
  current: Platform.select({
    web: '"Trebuchet MS", "Segoe UI", sans-serif',
    ios: 'AvenirNext-DemiBold',
    android: 'sans-serif-medium',
    default: 'System',
  }) as string,
  /** Дни, номера подходов, прочая разметка */
  ui: Platform.select({
    web: 'Consolas, "Cascadia Mono", "Courier New", monospace',
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
} as const;
