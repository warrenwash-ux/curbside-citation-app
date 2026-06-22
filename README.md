# Curbside — Parking Enforcement Citation Tool

A mobile-first field app for parking enforcement officers: continuous live plate scanning, auto-filled vehicle/violation data, and a full citation workflow — built as a single standalone HTML file with no build step.

**Live demo:** `https://warrenwash-ux.github.io/curbside-citation-app/` *(once Pages is enabled — see Deployment below)*

---

## What this does

- **Always-on plate/VIN scanning.** Opens the camera automatically and reads plates continuously in the background (like an ALPR unit on a boot truck) — no tap-to-photograph step.
- **Auto-fill on a hit.** The moment a plate is read, it vibrates, flashes, freezes that frame as evidence, and pulls a vehicle/owner/registration/payment record automatically — no extra taps.
- **Dropdown-driven fields.** State, color, make, registration status, and payment status are all selectable, pre-filled from the scan, fully overridable.
- **Jurisdiction-aware violation codes.** State / County / City filter, with a code reference field and a per-code list of common remarks that one-tap into the notes field.
- **GPS-assisted jurisdiction state.** Auto-detected via the free US Census geocoder; always editable.
- **Audit-safe corrections.** Drafts can be fully discarded ("Halt"). Issued citations can only be **Voided with a required reason** — never silently deleted — since a citation is a legal record.
- **Offline-first.** Everything saves to the device immediately. Real-time multi-officer sync is optional (see Supabase section).
- **CSV export, editable violation-code library, officer profile** — all in Settings.

## What's real vs. mocked

| Feature | Status |
|---|---|
| Camera capture, live OCR (Tesseract.js) | **Real** — reads actual plate text off the camera feed |
| GPS location + jurisdiction state lookup | **Real** — uses device GPS + US Census geocoder |
| Registered owner, registration status, payment status | **Mocked** — deterministic fake data (same plate always returns the same fake record). DMV records and parking-payment systems require a licensed data agreement that isn't available to plug in generically — see the note in `index.html`'s source comments for what that actually requires. |
| Multi-officer real-time sync | **Real, optional** — wire in a Supabase project (instructions below) |

## Deployment (GitHub Pages)

1. New repo on GitHub → upload this file, renamed to **`index.html`**
2. Repo **Settings → Pages** → Branch `main` / `(root)` → Save
3. Live in ~1 minute at `https://<your-username>.github.io/<repo-name>/`

Camera and GPS access require a real `https://` page — they won't work from a local `file://` open on iOS Safari.

## Real-time sync setup (optional)

In your Supabase project's SQL editor, run the schema found in the source code comments near the bottom of the `<script>` block in `index.html` (search for "SUPABASE SCHEMA"). Then in the app's **Settings → Live sync**, paste your project URL and anon key and enable sync. Every citation issued or voided will then mirror to every officer's device in real time.

## First-time setup on a new device

On first load, the app asks for department name, officer name, and badge number — stored locally on that device. No login system; each officer's phone/tablet is its own instance unless you connect Supabase sync.

## Customizing violation codes

Settings → "Violation codes & fines" lets you edit jurisdiction, code section, label, fine amount, and the common-remarks list for each code. **The starter codes shipped in this app are illustrative placeholders only** — replace the code section numbers with your department's actual current code book before relying on them for real citations.

## Data & privacy notes

- All citation data lives in the browser's `localStorage` on each device unless Supabase sync is enabled.
- "Erase all local data" in Settings is permanent and irreversible.
- CSV export includes every field captured for a citation, including voided ones.

## Tech notes

- Single HTML file — no build tools, no dependencies to install. Two CDN scripts load at runtime: Google Fonts and Tesseract.js.
- `localStorage` keys: `pe_profile`, `pe_citations`, `pe_violation_codes`, `pe_daily_counter`, `pe_sync_config`.
- Citation numbers format as `{DEPT}-{YYYYMMDD}-{####}`, resetting the sequence daily.
