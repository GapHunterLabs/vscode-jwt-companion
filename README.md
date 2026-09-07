# JWT Companion (VS Code)

Decode and inspect JSON Web Tokens on hover or via command — no data
leaves your editor.

**v0.1, pilot.** First extension of a new Gap Hunter Labs workstream:
porting selected niches from the
[IntelliJ-family catalog](https://plugins.jetbrains.com/vendor/gap-hunter-labs)
to VS Code. The two platforms don't share code (TypeScript/VS Code
Extension API vs. Kotlin/IntelliJ Platform PSI) — what's ported here is
the niche and the UX decisions, not the implementation. See
[`src/jwtDecode.ts`](src/jwtDecode.ts) for the honest scope: structure
and expiry, no cryptographic signature verification yet (the IntelliJ
version verifies HS256/RS256; this one doesn't, on purpose, for a v0.1
pilot focused on learning the VS Code publish cycle end to end before
committing to full parity).

## What it does

- **Hover over any `header.payload.signature`-shaped string** in any
  file to see the decoded header and payload, plus an expiry check
  (⚠️ expired / ✅ valid until, from the `exp` claim if present).
- **Command: `JWT Companion: Decode Selected Token`** — select a token
  (or leave nothing selected to get a paste prompt) and see the same
  decode in an output channel, for a token that's inconvenient to
  hover over directly.

Each claim renders as its own line in real JSON, never squeezed into a
fixed-height table — the same fix the IntelliJ-family version applies,
here for the same underlying reason: a token with a dozen claims stays
exactly as readable as a token with two.

## Privacy

See [PRIVACY.md](PRIVACY.md) — short version: zero network calls, zero
telemetry, decoding happens entirely in your editor process.

## Development

```bash
npm install
npm run compile   # or: npm run watch
npm test          # node's built-in test runner against the pure decode logic
```

Press F5 in VS Code (with this folder open) to launch an Extension
Development Host and try it against a real token.

To build an installable package without publishing:

```bash
npx @vscode/vsce package
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).
