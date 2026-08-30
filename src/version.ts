/**
 * Версия приложения. При каждом коммите:
 * 1. Повысить APP_VERSION (semver: 0.1.0 → 0.1.1 → 0.2.0 …)
 * 2. Обновить LAST_COMMIT_AT (дата/время коммита, ISO 8601)
 * 3. Добавить запись в CHANGELOG.md и src/changelog.ts
 */
export const APP_NAME = 'Dolgator';
export const APP_VERSION = '0.1.13';

export const DEVELOPER_NAME = 'Trifonix';
export const DEVELOPER_URL = 'https://t.me/trifonixwebsites';

/** Дата и время последнего коммита (ISO 8601) */
export const LAST_COMMIT_AT = '2026-08-30T12:28:00+03:00';

export function formatLastCommit(dateIso: string): string {
  const d = new Date(dateIso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
