const WEEKDAYS_UZ = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

const grouped = (value: number) => Math.round(value).toLocaleString('uz-UZ').replace(/[\u00a0\u202f]/g, ' ');

export const formatSom = (amount: number) => `${grouped(amount)} so'm`;

export const formatCount = (value: number) => grouped(value);

export const formatCompact = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return `${Math.round(amount)}`;
};

export const formatTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const formatDateLong = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return { date: `${dd}.${mm}.${date.getFullYear()}`, weekday: WEEKDAYS_UZ[date.getDay()] };
};
