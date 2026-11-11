# Agent notes

Retro Darts Scorer is a local-only PWA served from retrodarts.com. It is a deliberately simple, retro, scorer-only app. Read [README.md](README.md) for behaviour and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the files fit together, hosting and deployment. The platform decision is in [docs/DISTRIBUTION_DECISION.md](docs/DISTRIBUTION_DECISION.md). This file owns the working rules; other docs should link here, not restate them.

## Working rules

- `index.html` is the sole app entry point. There is no bundler and no npm dependency in the app.
- Do not add a backend, adverts or remote libraries, with three exceptions: Google sign-in (`accounts.google.com/gsi/client`, offered before a match while online, for backup to the user's own Drive), Google Analytics (loaded only after consent in the cookie banner) and Google Cast (loaded only when Cast to TV is tapped; the `/tv/` page a Chromecast opens loads Google's receiver library). Offline use must never be blocked: a device that has never signed in and has no signal can still score. All three must fail quietly offline. User-facing text goes through `textContent`.
- Keep saved matches working. The storage key is `wheatsheaf-team-scorer-v3`. Do not rename it.
- Scoring logic is tested and settled. Change it only when asked, and run the full checks.
- Do not add process docs, release checklists or review write-ups unless explicitly requested. Existing files under `docs/` are historical records: leave them as they are, and do not delete or extend them without being asked.
- Tests never write into `docs/`. Screenshot capture is opt-in with `CAPTURE_SCREENSHOTS=1` and writes to `artifacts/` (git-ignored). Do not commit generated output.

## Releases

Every user-visible change bumps the version, and all of these must agree (`tests/release-version.cjs` enforces most of them):

- `APP_VERSION` and `APP_CACHE` in `index.html`, and the menu version label.
- `version` in `manifest.webmanifest`.
- `CACHE` in `sw.js`. Any change to a cached app file needs a new cache id.
- A matching entry at the top of `CHANGELOG.md`, with the version, date and cache id.

## UI

- Keep the retro identity: embedded DSEG seven-segment score digits. Themes, the default theme, colours, logo and landing page may change freely. Stay a simple scorer.
- The throwing team must be obvious at a glance in every theme; the waiting team stays legible. Touch targets are at least 44px and text at least 12px.
- Check portrait and landscape phone, tablet and desktop in every theme.

## Layout checks

`tests/viewports.spec.mjs` asserts invariants only, in every theme listed by the app's theme picker:

- no horizontal overflow; text stays inside its box; controls do not overlap; the keypad is fully on screen;
- touch targets are at least 44px, text at least 12px and key text contrast at least 4.5:1;
- the header takes at most 15% of the viewport height and the menu button is at least 44×44;
- the throwing team differs from the waiting team in computed style, and the waiting team stays at opacity 1;
- team names are not clipped; score digits use DSEG7, and Last Score digits are smaller than the total;
- scoring, persistence, offline, PDF, update, focus and ARIA behaviour.

Do not assert exact colours, pixel positions, size ratios, element order, a specific default theme or font families other than the DSEG digits. If a design change breaks a test that only encodes the old look, delete the assertion; don't update its numbers.

## Checks

```sh
node scripts/check.cjs
```

Use Node 22 (pinned in `.node-version`). GitHub Actions runs it on pull requests, and Cloudflare Pages runs it on `main` before publishing. Playwright runs `tests/*.spec.mjs` in parallel; each test must set up its own state. `node tests/viewports.cjs` runs only the Playwright checks, and `node_modules/.bin/playwright test -c tests/playwright.live.config.mjs` runs them against https://retrodarts.com. The viewport checks install `@playwright/test` into `node_modules` and download Chromium the first time. `SKIP_VIEWPORT_TESTS=1` skips them; say so when you do.
