export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_INACTIVITY_TIMEOUT_SECONDS = Math.floor(
  SESSION_INACTIVITY_TIMEOUT_MS / 1000,
);
export const SESSION_REFRESH_THROTTLE_MS = 60 * 1000;
export const SESSION_ABSOLUTE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_ABSOLUTE_MAX_AGE_MS =
  SESSION_ABSOLUTE_MAX_AGE_SECONDS * 1000;
export const SESSION_ACTIVITY_COOKIE_NAME =
  process.env.SESSION_ACTIVITY_COOKIE_NAME ?? "pglms_session_activity";

export function buildSessionActivityValue(now = Date.now()) {
  return String(now);
}

export function parseSessionActivityValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasSessionExpiredByInactivity(
  value: string | null | undefined,
  now = Date.now(),
) {
  const lastActivityAt = parseSessionActivityValue(value);

  if (!lastActivityAt) {
    return true;
  }

  return now - lastActivityAt > SESSION_INACTIVITY_TIMEOUT_MS;
}

