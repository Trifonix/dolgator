/**
 * Версия приложения. При релизе (новая версия + APK):
 * 1. Повысить APP_VERSION (semver) и android.versionCode в app.json
 * 2. Обновить LAST_COMMIT_AT (ISO 8601)
 * 3. Разобрать коммиты с прошлого релиза на патчи / фичи / глобальные обновления
 *    и добавить запись в CHANGELOG.md и src/changelog.ts (см. .cursor/rules/release-changelog.mdc)
 */
export const APP_NAME = 'Dolgator';
export const APP_VERSION = '1.0.7';

export const DEVELOPER_NAME = 'Trifonix';
export const DEVELOPER_URL = 'https://t.me/trifonixwebsites';

/** Дата и время последнего коммита (ISO 8601) */
export const LAST_COMMIT_AT = '2026-08-30T21:55:00+03:00';

export function formatLastCommit(dateIso: string): string {
  const d = new Date(dateIso);
  return d
    .toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
