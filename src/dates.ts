import { e } from './utils.js';
import type { PublicationDate } from './types.js';

function paddedDateString(num: number | string | undefined, length: number, message: string) {
  if (num == null) return undefined;
  const padded = typeof num === 'number' ? String(num) : num;
  if (padded.length > length) throw new Error(message);
  return padded.padStart(length, '0');
}

export function dateXml(element: string, date?: PublicationDate) {
  if (!date) return undefined;
  if (date instanceof Date) {
    return dateXml(element, {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    });
  }
  const month = paddedDateString(date.month, 2, 'date.month must be a 2 digit string');
  const day = paddedDateString(date.day, 2, 'date.day must be a 2 digit string');
  const year = typeof date.year === 'number' ? String(date.year) : date.year;
  if (year.length !== 4) throw new Error('date.year must be a 4 digit string');
  if (day && !(Number.parseInt(day, 10) >= 1 && Number.parseInt(day, 10) <= 31)) {
    throw new Error('date.day must be a 2 digit string between "01" and "31"');
  }
  if (month && !(Number.parseInt(month, 10) >= 1 && Number.parseInt(month, 10) <= 12)) {
    // Note that there are ways to say "Spring" and "First Quarter", not dealt with here
    throw new Error('date.month must be a 2 digit string between "01" and "12"');
  }
  return e(element, { media_type: date.media_type ?? 'online' }, [
    month ? e('month', month) : undefined,
    day ? e('day', day) : undefined,
    e('year', year),
  ]);
}

export function publicationDateXml(date?: PublicationDate) {
  return dateXml('publication_date', date);
}
