/**
 * Formats seconds into MM:SS.mmm
 */
export function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  const minsStr = mins > 0 ? `${mins}:` : '';
  const secsStr = secs < 10 && mins > 0 ? `0${secs}` : `${secs}`;
  const msStr = ms.toString().padStart(3, '0');
  return `${minsStr}${secsStr}.${msStr}`;
}
