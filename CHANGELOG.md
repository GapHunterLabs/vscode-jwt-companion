# Changelog

## 0.1.0 — 2026-09-06

Initial pilot release.

- Hover provider: decode any `header.payload.signature`-shaped string
  in any file, with an expiry check against the `exp` claim.
- Command `JWT Companion: Decode Selected Token`.
- Structure and expiry only — no cryptographic signature verification
  in this version.
