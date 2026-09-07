/**
 * Pure JWT decoding logic -- zero dependency on the `vscode` module, so it
 * can be unit tested with plain Node (`node --test`) instead of needing the
 * full @vscode/test-electron integration-test harness for something that
 * has nothing to do with the editor. `extension.ts` is the only file that
 * imports `vscode` and wires this into hover/command UI.
 *
 * v0.1 scope, honestly noted: structure + expiry only, no cryptographic
 * signature verification (unlike the IntelliJ-family JWT Companion, which
 * verifies HS256/RS256 against the JDK's own crypto APIs). That's a real
 * gap to close in a future version, not something this file pretends to do.
 */

export interface JwtDecodeResult {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signaturePresent: boolean;
  isExpired: boolean | null; // null when the payload has no `exp` claim
  expiresAt: Date | null;
}

export class JwtDecodeError extends Error {}

// Exactly two dots, three segments -- the third may be empty (an unsigned
// `alg: none` token is legitimately `header.payload.`, not just two parts).
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

export function looksLikeJwt(candidate: string): boolean {
  return JWT_PATTERN.test(candidate.trim());
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const paddingNeeded = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(paddingNeeded), 'base64').toString('utf8');
}

function decodeJsonSegment(segment: string, segmentName: string): Record<string, unknown> {
  let text: string;
  try {
    text = base64UrlDecode(segment);
  } catch {
    throw new JwtDecodeError(`${segmentName} is not valid base64url.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new JwtDecodeError(`${segmentName} is not valid JSON once decoded.`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new JwtDecodeError(`${segmentName} did not decode to a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

export function decodeJwt(token: string): JwtDecodeResult {
  const trimmed = token.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    throw new JwtDecodeError(
      `Expected exactly 3 dot-separated parts (header.payload.signature), got ${parts.length}.`,
    );
  }
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = decodeJsonSegment(headerPart, 'Header');
  const payload = decodeJsonSegment(payloadPart, 'Payload');

  let isExpired: boolean | null = null;
  let expiresAt: Date | null = null;
  const exp = payload['exp'];
  if (typeof exp === 'number' && Number.isFinite(exp)) {
    expiresAt = new Date(exp * 1000);
    isExpired = expiresAt.getTime() < Date.now();
  }

  return {
    header,
    payload,
    signaturePresent: signaturePart.length > 0,
    isExpired,
    expiresAt,
  };
}
