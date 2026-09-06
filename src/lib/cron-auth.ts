/** Pure so it's testable without spinning up a request: true only when both a secret is configured and the header matches it exactly. */
export function isValidCronAuth(authorizationHeader: string | null, configuredSecret: string | undefined): boolean {
  if (!configuredSecret) return false;
  return authorizationHeader === `Bearer ${configuredSecret}`;
}
