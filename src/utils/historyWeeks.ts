import { formatDateKey, getCurrentWeekDays } from './dates';

export interface HistoryWeek {
  weekStartKey: string;
  weekDays: Date[];
  weekKeys: string[];
  label: string;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function mondayOfWeek(date: Date): Date {
  return getCurrentWeekDays(date)[0];
}

export function formatWeekLabel(weekDays: Date[]): string {
  const start = weekDays[0];
  const end = weekDays[6];
  const fmtDay = (d: Date) =>
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace(/\./g, '');
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}–${fmtDay(end)}`;
  }
  return `${fmtDay(start)} – ${fmtDay(end)}`;
}

/** Все недели с данными, от новых к старым */
export function buildHistoryWeeks(dayKeys: string[]): HistoryWeek[] {
  const unique = [...new Set(dayKeys)].sort();
  if (unique.length === 0) return [];

  let monday = mondayOfWeek(parseDateKey(unique[0]));
  const lastMonday = mondayOfWeek(parseDateKey(unique[unique.length - 1]));
  const weeks: HistoryWeek[] = [];

  while (monday.getTime() <= lastMonday.getTime()) {
    const weekDays = getCurrentWeekDays(monday);
    const weekKeys = weekDays.map(formatDateKey);
    if (weekKeys.some((k) => unique.includes(k))) {
      weeks.push({
        weekStartKey: formatDateKey(weekDays[0]),
        weekDays,
        weekKeys,
        label: formatWeekLabel(weekDays),
      });
    }
    const next = new Date(monday);
    next.setDate(next.getDate() + 7);
    monday = next;
  }

  return weeks.reverse();
}
