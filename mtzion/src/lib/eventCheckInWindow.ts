/**
 * Normalize common Postgres / PostgREST timestamp strings before `new Date(...)`.
 */
function normalizeTimestampInput(raw: string): string {
  let s = raw.trim();
  if (!s) return s;
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T');
  }
  if (!s.includes('T')) {
    return s;
  }
  // +0000 / -0500 style offset without colon (Postgres text) → +00:00
  if (/\+\d{4}$/.test(s) && !/\+\d{2}:\d{2}$/.test(s)) {
    s = s.replace(/\+(\d{2})(\d{2})$/, '+$1:$2');
  }
  if (/T.*-\d{4}$/.test(s) && !/-\d{2}:\d{2}$/.test(s)) {
    s = s.replace(/-(\d{2})(\d{2})$/, '-$1:$2');
  }
  // +dd without minutes (rare) → +dd:00
  if (/[+\-]\d{2}$/.test(s) && !/[+\-]\d{2}:\d{2}$/.test(s)) {
    s = s.replace(/([+\-]\d{2})$/, '$1:00');
  }
  return s;
}

/**
 * Parse timestamps from Postgres/PostgREST as the same instant everywhere.
 * Strings like `2026-04-26T05:00:00` (no `Z` / offset) are treated as **UTC** so we
 * do not apply the browser's local zone twice (which made "8:00 start" behave ~3h early in EAT).
 */
export function parseDbInstant(value: string | null | undefined): number {
  if (value == null) return NaN;
  let s = normalizeTimestampInput(String(value));
  if (!s) return NaN;
  const hasZone =
    /Z$/i.test(s) ||
    /[+\-]\d{2}:\d{2}(:\d{2})?$/.test(s) ||
    /[+\-]\d{4}$/.test(s);
  if (!hasZone) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      s = `${s}T00:00:00Z`;
    } else {
      s = `${s}Z`;
    }
  }
  const ms = new Date(s).getTime();
  return ms;
}

/**
 * QR payloads may carry `startsAt` as a number; some pipelines stringify JSON numbers.
 */
export function coercePayloadEpochMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return null;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Member QR check-in: enforce DB start vs optional signed `startsAt` in the payload, and block before start.
 * Call again inside a mutex after re-fetching the event so checks match the latest row.
 */
export function assertQrCheckInStartAllowed(opts: {
  title?: string;
  event_date: string;
  payloadStartsAt: unknown;
}): void {
  const label = opts.title ? `"${opts.title}"` : 'This event';
  const dbStartMs = parseDbInstant(String(opts.event_date));
  if (Number.isNaN(dbStartMs)) {
    throw new Error(`${label} has no valid start time. Please contact an administrator.`);
  }
  const payloadStartMs = coercePayloadEpochMs(opts.payloadStartsAt);
  if (payloadStartMs != null) {
    if (Math.abs(payloadStartMs - dbStartMs) > 120_000) {
      throw new Error(
        'This QR code does not match the current event schedule. Please scan the latest code from an administrator.'
      );
    }
    if (Date.now() < payloadStartMs) {
      const when = new Date(payloadStartMs).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      throw new Error(`${label} has not started yet. Check-in opens at ${when}.`);
    }
  } else if (Date.now() < dbStartMs) {
    const when = new Date(dbStartMs).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    throw new Error(`${label} has not started yet. Check-in opens at ${when}.`);
  }
}

/**
 * Event QR / staff check-in must fall between `events.event_date` (start) and `events.end_date` (when set).
 * If `end_date` is null, check-in is allowed from start onward until the QR payload `expiresAt` (short TTL).
 */
export function assertEventCheckInAllowed(event: {
  title?: string;
  event_date: string;
  end_date?: string | null;
}): void {
  const label = event.title ? `"${event.title}"` : 'This event';
  const startMs = parseDbInstant(String(event.event_date));
  if (Number.isNaN(startMs)) {
    throw new Error(`${label} has an invalid start time. Please contact an administrator.`);
  }
  const now = Date.now();
  if (now < startMs) {
    const when = new Date(startMs).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    throw new Error(`${label} has not started yet. Check-in opens at ${when}.`);
  }
  if (event.end_date == null || String(event.end_date).trim() === '') {
    return;
  }
  const endMs = parseDbInstant(String(event.end_date));
  if (Number.isNaN(endMs)) {
    return;
  }
  if (now > endMs) {
    throw new Error(
      `${label} has ended. Check-in is no longer available. Ask an admin if you need help.`
    );
  }
}
