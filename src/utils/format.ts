export function formatTime(timeStr: string | null | undefined, format: '12h' | '24h'): string {
  if (!timeStr) return '';
  if (format === '24h') return timeStr;

  try {
    const [h, m] = timeStr.split(':');
    let hours = parseInt(h, 10);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${suffix}`;
  } catch (e) {
    return timeStr;
  }
}
