/**
 * Convert a `DD-MM-YYYY HH:MM` input into the API's datetime format, e.g.
 * `27-09-2026 08:20` -> `2026-09-27T08:20:00+04:00` (local timezone offset,
 * no milliseconds, no `Z`). Returns `null` if the input can't be parsed.
 */
export function toApiDateTime(input: string): string | null {
	const m = input.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
	if (!m) return null;

	const [, dd, mm, yyyy, hh = '00', min = '00'] = m;
	const day = parseInt(dd, 10);
	const month = parseInt(mm, 10);
	const year = parseInt(yyyy, 10);
	const hour = parseInt(hh, 10);
	const minute = parseInt(min, 10);

	if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

	const date = new Date(year, month - 1, day, hour, minute);
	if (Number.isNaN(date.getTime())) return null;

	const offMinutes = -date.getTimezoneOffset();
	const sign = offMinutes >= 0 ? '+' : '-';
	const abs = Math.abs(offMinutes);
	const pad = (n: number, len = 2) => String(n).padStart(len, '0');

	return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00${sign}${pad(
		Math.floor(abs / 60),
	)}:${pad(abs % 60)}`;
}

/**
 * Convert a `datetime-local` input value ("YYYY-MM-DDTHH:MM") into the API's
 * datetime format, e.g. "2026-09-27T08:20" -> "2026-09-27T08:20:00+04:00"
 * (local timezone offset, no milliseconds, no `Z`). Returns `null` if invalid.
 */
export function localDateTimeToApi(value: string): string | null {
	const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
	if (!m) return null;

	const [, yyyy, mm, dd, hh, min] = m;
	const year = parseInt(yyyy, 10);
	const month = parseInt(mm, 10);
	const day = parseInt(dd, 10);
	const hour = parseInt(hh, 10);
	const minute = parseInt(min, 10);

	if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

	const date = new Date(year, month - 1, day, hour, minute);
	if (Number.isNaN(date.getTime())) return null;

	const offMinutes = -date.getTimezoneOffset();
	const sign = offMinutes >= 0 ? '+' : '-';
	const abs = Math.abs(offMinutes);
	const pad = (n: number, len = 2) => String(n).padStart(len, '0');

	return `${yyyy}-${mm}-${dd}T${hh}:${min}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}