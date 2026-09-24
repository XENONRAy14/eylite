export const initials = (value: string) =>
  value.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export const weekDates = (value: string) => {
  const selected = new Date(`${value}T12:00:00Z`);
  selected.setUTCDate(selected.getUTCDate() - selected.getUTCDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(selected);
    day.setUTCDate(selected.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
};

export const shortDay = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)).replace('.', '');

export const longDate = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));

export const currentSchoolYear = () => {
  const now = new Date();
  const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}–${start + 1}`;
};
