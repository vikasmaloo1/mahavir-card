export const OTP_SENDS_PER_WINDOW = 5;
export const OTP_WINDOW_MS = 60 * 60 * 1000;

/**
 * Pure decision: given the timestamps of prior sends to one address, may another
 * OTP be sent now? Only sends inside the trailing window count.
 */
export function isOtpSendAllowed(priorSendsAt: readonly Date[], now = new Date()): boolean {
  const windowStart = now.getTime() - OTP_WINDOW_MS;
  const recent = priorSendsAt.filter((sentAt) => sentAt.getTime() > windowStart).length;
  return recent < OTP_SENDS_PER_WINDOW;
}
