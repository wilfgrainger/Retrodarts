# Architecture and hosting

V1 is a local-only PWA distributed from retrodarts.com. The app uses HTML, CSS and JavaScript with no runtime package dependencies or app-bundling build step. The Cloudflare Pages Git deployment stages an allowlisted static artifact with a built-in Node script.

| File | Purpose |
| --- | --- |
| `index.html` | Installable browser app; inline CSS, fonts, icon and application logic |
| `sw.js` | Versioned precache; reloads HTTP cache during installation, deletes only project cache prefixes, fetches navigations from the network first and falls back to the cached app root when offline |
| `manifest.webmanifest`, `icons/`, `assets/` | Home-screen metadata and cached assets |
| `scripts/prepare-pages.cjs` | Copies only the public allowlist into `dist/` for Cloudflare Pages; rejects symlinks and verifies the output set |
| `tests/`, `scripts/check.cjs` | Node checks and one local/CI entry point (scoring simulations, artifact allowlist, plus optional Playwright viewports via `npx`) |

State transitions cover setup, starter selection, live play, leg results, deciding-leg selection, game results, next-game selection and fixture completion. Numeric totals are marker-verified. Completed-game visits are retained in results; the current game has its own visit log. Undo uses up to 100 compact snapshots rather than full fixture copies on every visit.

Actions save synchronously to browser storage under the legacy key `wheatsheaf-team-scorer-v3` (version field `3` inside the JSON). The name predates “Retro Darts Scorer” branding; changing the key would orphan existing saved fixtures on the same origin. A failed save leaves the in-memory fixture available and blocks scoring while the user retries or downloads a readable PDF. Draft digits are transient. The storage event imports another tab's state but does not implement locking or conflict resolution. Use one tab.

## Hosting

Serve the output of `node scripts/prepare-pages.cjs` from an HTTPS static host. The Cloudflare Pages project is connected to this GitHub repository and automatically builds and publishes `main`; its build checks and stages an exact static allowlist into `dist/`. GitHub Actions runs `node scripts/check.cjs` on Node 22 and 24 for pull requests and pushes to `main`, including Playwright viewport checks. Cloudflare Pages now runs `node scripts/check.cjs && node scripts/prepare-pages.cjs`, so all repository checks, including the browser viewport suite, must pass before the production artifact is staged. `main` currently has no required status-check protection, but the production build itself now gates publication on that full check command. Cloudflare builds on every path (`*`) and has preview deployments disabled, so docs-only `main` commits also run the full checks and publish the same app artifact, and there is no live Cloudflare PR preview. GitHub Actions and the committed screenshot gallery are the pre-merge review path. No repository deploy secret, server application or database is needed. Localhost is suitable for development.

Use a dedicated origin when isolation from other applications matters: localStorage is origin-wide, even when paths differ. Do not put credentials or private fixture records into the repository. A public GitHub repository exposes its files and commit history.

An app-resource change needs a new cache identifier in `sw.js`. Installing a new worker fetches its cache resources before activation. Existing pages keep running their loaded script until reloaded. There is no forced mid-match reload.

`index.html` is the sole app entry point. `tests/distribution.cjs` checks the PWA distribution and its precache resources. `tests/viewports.spec.mjs` asserts live-scoring layout at several emulated sizes. Match dialogs toggle `aria-hidden` on `#shade`; the save blocker uses the same pattern when dismissed.

## Accessibility (current)

Overlays (`#shade`, `#save-blocker`) sync `hidden` with `aria-hidden`. Opening a match dialog focuses the first actionable control and Tab cycles within the dialog. Escape closes the visit-history view during live play and dismisses the new-match confirmation. This is incremental improvement, not a conformance claim.

## Visit reports

A read-only report model reconstructs each leg from retained visits, pairing each team's nth visit in one round. Screen tables and the local vector PDF writer consume that model. The PDF offers a cumulative match report after each completed leg and a final fixture report with the overall result and game-by-game leg scores. Match history renders a selected saved fixture directly without replacing live state. Checkouts are positive visits leaving zero; zero-scoring busts and misses remain distinct. Summaries use visits and average points per visit because actual darts used are not recorded. Current-game reports use the current log so Undo cannot leave a stale checkout in the report. Earlier games without retained visits are explicitly marked unavailable.
