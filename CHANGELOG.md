# Changelog

## 0.1.2 — 2026-09-13

Added a one-time Marketplace review prompt after real, repeated use — never on install, never on a timer.

## 0.1.1 — 2026-09-07

- Added a Marketplace icon (`images/icon.png`, 128×128, cropped from
  the Gap Hunter Labs brand mark) — 0.1.0 published with the default
  placeholder icon since none was configured yet.

## 0.1.0 — 2026-09-06

Initial pilot release.

- Hover provider: decode any `header.payload.signature`-shaped string
  in any file, with an expiry check against the `exp` claim.
- Command `JWT Companion: Decode Selected Token`.
- Structure and expiry only — no cryptographic signature verification
  in this version.
