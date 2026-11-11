# Retro Darts Scorer V1 distribution

**Decision: PWA-first, local-only.** The free app is distributed from [retrodarts.com](https://retrodarts.com/) as an installable Progressive Web App for phones, tablets and computers.

## V1 scope

- Install from a supported browser on Android, iPhone, iPad and desktop.
- Score offline after the app shell has been cached. Match state remains in the browser on the same device/profile; it is not uploaded or synced.
- Users can download PDF reports after completed legs and fixtures. Browser storage may be cleared or evicted, so a downloaded PDF is the optional way to keep a separate readable record; it cannot restore a match in the app.
- No account, OAuth, Worker, database, cloud backup, analytics or advertising is required for V1.
- Cloudflare Pages builds the allowlisted static site from `main`. GitHub Actions runs checks; Cloudflare's Git integration handles production publishing without a repository deploy secret.


Reconsider distribution changes if real user demand or a concrete PWA limitation justifies them. Reconsider Cloudflare sync separately, with explicit opt-in and a reviewed privacy/data-retention design.
