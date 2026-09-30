/**
 * Standard IST (Asia/Kolkata) Date & Time Formatting Utilities for AeroAqua
 * Ensures consistent timestamp presentation across alerts, broadcasts,
 * station telemetry, anomalies, forecasts, and events.
 */

export const formatISTDateTime = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return isoStr;
    return (
      dt.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST'
    );
  } catch {
    return isoStr;
  }
};

export const formatISTTime = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return isoStr;
    return (
      dt.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST'
    );
  } catch {
    return isoStr;
  }
};

export const formatISTDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return isoStr;
    return dt.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
};
