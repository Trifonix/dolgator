const STORAGE_KEY = '@dolgator/data';

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Понедельник — воскресенье текущей недели */
export function getCurrentWeekDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function getDayOfMonth(date: Date): number {
  return date.getDate();
}

/** Понедельник — воскресенье предыдущей недели (относительно переданной) */
export function getPreviousWeekDays(currentWeekDays: Date[]): Date[] {
  const monday = new Date(currentWeekDays[0]);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export { STORAGE_KEY };
