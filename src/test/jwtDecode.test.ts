import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeJwt, looksLikeJwt, JwtDecodeError } from '../jwtDecode';

// Built programmatically rather than hardcoded, same reason as the
// Kotlin catalog's own SecretDetectorTest.kt: a literal-looking
// header.payload.signature string in committed test code can trip
// GitHub's own secret-scanning push protection even when it's fake.
function makeToken(header: object, payload: object, signature = 'sig'): string {
  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${enc(header)}.${enc(payload)}.${signature}`;
}

test('looksLikeJwt accepts a well-formed 3-part token', () => {
  const token = makeToken({ alg: 'HS256', typ: 'JWT' }, { sub: '123' });
  assert.equal(looksLikeJwt(token), true);
});

test('looksLikeJwt accepts an unsigned token with an empty signature segment', () => {
  const token = makeToken({ alg: 'none' }, { sub: '123' }, '');
  assert.equal(looksLikeJwt(token), true);
});

test('looksLikeJwt rejects a plain string', () => {
  assert.equal(looksLikeJwt('not-a-jwt'), false);
});

test('looksLikeJwt rejects a string with the wrong number of segments', () => {
  assert.equal(looksLikeJwt('a.b.c.d'), false);
  assert.equal(looksLikeJwt('a.b'), false);
});

test('decodeJwt decodes header and payload', () => {
  const token = makeToken({ alg: 'HS256', typ: 'JWT' }, { sub: 'abc', name: 'Ada' });
  const result = decodeJwt(token);
  assert.equal(result.header.alg, 'HS256');
  assert.equal(result.header.typ, 'JWT');
  assert.equal(result.payload.sub, 'abc');
  assert.equal(result.payload.name, 'Ada');
  assert.equal(result.signaturePresent, true);
});

test('decodeJwt flags an expired token', () => {
  const pastExp = Math.floor(Date.now() / 1000) - 3600;
  const token = makeToken({ alg: 'HS256' }, { exp: pastExp });
  const result = decodeJwt(token);
  assert.equal(result.isExpired, true);
  assert.ok(result.expiresAt);
});

test('decodeJwt flags a token that has not expired yet', () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const token = makeToken({ alg: 'HS256' }, { exp: futureExp });
  const result = decodeJwt(token);
  assert.equal(result.isExpired, false);
});

test('decodeJwt reports null expiry when there is no exp claim', () => {
  const token = makeToken({ alg: 'HS256' }, { sub: 'no-exp' });
  const result = decodeJwt(token);
  assert.equal(result.isExpired, null);
  assert.equal(result.expiresAt, null);
});

test('decodeJwt reports an empty signature as not present', () => {
  const token = makeToken({ alg: 'none' }, { sub: 'unsigned' }, '');
  const result = decodeJwt(token);
  assert.equal(result.signaturePresent, false);
});

test('decodeJwt throws JwtDecodeError on the wrong number of parts', () => {
  assert.throws(() => decodeJwt('only.two'), JwtDecodeError);
  assert.throws(() => decodeJwt('a.b.c.d'), JwtDecodeError);
});

test('decodeJwt throws JwtDecodeError when a segment is not valid JSON', () => {
  const notJson = Buffer.from('not json').toString('base64url');
  assert.throws(() => decodeJwt(`${notJson}.${notJson}.sig`), JwtDecodeError);
});

test('decodeJwt throws JwtDecodeError when a segment decodes to a non-object', () => {
  const arrayPayload = Buffer.from(JSON.stringify([1, 2, 3])).toString('base64url');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  assert.throws(() => decodeJwt(`${header}.${arrayPayload}.sig`), JwtDecodeError);
});
