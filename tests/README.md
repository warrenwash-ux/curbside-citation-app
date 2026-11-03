# Development validation

Run dependency-free checks with Node:

```sh
node tests/sync.test.cjs
node tests/demo.test.cjs
node tests/ai-security.test.cjs
node tests/plate.test.cjs
node tests/consensus.test.cjs
node tests/upload.test.cjs
node tests/ocr-worker.test.cjs
node tests/manual-id.test.cjs
```

Browser checks require `playwright` available to Node and an installed Chromium. Run `node tests/browser.test.cjs`; optionally set `CHROMIUM_EXECUTABLE` to a local executable path. This is development tooling only; the static app needs no build step.

The browser test serves the local index.html on a temporary loopback HTTP port, uses fresh synthetic profiles, denies camera access, and blocks external requests. It checks onboarding, legacy AI-setting cleanup, settings, camera-denial fallback, ID confirmation and cancellation, simulated lookup, disabled issue/mail/print actions, discard navigation/scroll, valid image decoding with synthetic OCR, unreadable/wrong-type uploads, and runtime errors at 390px and 1280px widths. Screenshots are temporary local inspection files, not deliverables.

Validated in headless Chromium 153.0.8010.0. External fonts/scripts are blocked, so this is functional and fallback-layout coverage, not a full production-assets rendering test. Synthetic OCR unit tests do not measure camera recognition accuracy. Real phone camera permissions, Safari, GPS, real-photo recognition, live sync, external assets, and independent review remain outstanding.
