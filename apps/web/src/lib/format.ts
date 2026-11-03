const TIME_ZONE = 'America/Santiago';

const dateTime = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});

const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));

export const formatHours = (hours: number | null): string =>
  hours === null ? '—' : `${number.format(hours)} h`;

export const formatPercent = (value: number | null): string =>
  value === null ? '—' : `${number.format(value)} %`;
