/**
 * Standard Asia/Kolkata (IST) Date & Time Utilities for AeroAqua
 * Guarantees zero timezone offset drift, unambiguous serialization,
 * and unified timestamp display across events, alerts, telemetry, and forecasts.
 */

const parseISTDate = (isoStr) => {
  if (!isoStr) return null;
  let str = String(isoStr).trim();
  // If string has space instead of T, normalize
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  // If naive (no offset or Z), anchor explicitly to IST (+05:30)
  if (!str.includes('+') && !str.includes('Z') && !str.match(/-\d{2}:\d{2}$/)) {
    str = `${str}+05:30`;
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
};

/**
 * Format timestamp into standard readable IST representation:
 * E.g.: "1 October 2026, 1:27 AM"
 */
export const formatISTDateTime = (isoStr) => {
  if (!isoStr) return '—';
  const dt = parseISTDate(isoStr);
  if (!dt) return isoStr;

  try {
    return dt.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
};

/**
 * Format timestamp into standard compact IST time:
 * E.g.: "1:27 AM IST"
 */
export const formatISTTime = (isoStr) => {
  if (!isoStr) return '—';
  const dt = parseISTDate(isoStr);
  if (!dt) return isoStr;

  try {
    return (
      dt.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }) + ' IST'
    );
  } catch {
    return isoStr;
  }
};

/**
 * Format timestamp into standard IST date:
 * E.g.: "1 October 2026"
 */
export const formatISTDate = (isoStr) => {
  if (!isoStr) return '—';
  const dt = parseISTDate(isoStr);
  if (!dt) return isoStr;

  try {
    return dt.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
};

/**
 * Construct an unambiguous, timezone-aware ISO 8601 string localized to Asia/Kolkata (+05:30).
 * Input: "2026-10-01", "01:27" -> "2026-10-01T01:27:00+05:30"
 */
export const createISTIsoString = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return '';
  const parts = timeStr.split(':');
  const hours = parts[0].padStart(2, '0');
  const mins = (parts[1] || '00').padStart(2, '0');
  return `${dateStr}T${hours}:${mins}:00+05:30`;
};

/**
 * Derive effective lifecycle status based on current wall-clock time in IST:
 * - isCancelled == true -> CANCELLED
 * - now < start -> UPCOMING
 * - start <= now <= end -> ACTIVE
 * - now > end -> ENDED
 */
export const deriveEventStatus = (startIso, endIso, isCancelled = false) => {
  if (isCancelled) return 'CANCELLED';
  if (!startIso || !endIso) return 'UPCOMING';

  const start = parseISTDate(startIso);
  const end = parseISTDate(endIso);
  if (!start || !end) return 'UPCOMING';

  const now = new Date();
  if (now < start) return 'UPCOMING';
  if (now >= start && now <= end) return 'ACTIVE';
  return 'ENDED';
};
