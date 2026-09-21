export function formatExpenseDate(value: string, language: 'es' | 'en') {
  const locale = language === 'es' ? 'es-CL' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value));
}
