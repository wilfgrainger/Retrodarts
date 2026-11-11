# Security policy

## Scope and supported versions

Security fixes target the latest `main` revision. Older deployed, cached or downloaded copies are not maintained separately. The app is a static scoreboard with local browser persistence, not a service for sensitive data or an encrypted record store.

## Report a vulnerability

Do not post exploit details, credentials or another person's information in a public issue.

Email [support@retrodarts.com](mailto:support@retrodarts.com), or use [GitHub private vulnerability reporting](https://github.com/wilfgrainger/Retrodarts/security/advisories/new) if the repository offers it. A public issue is not a confidential channel. No response-time or bounty commitment is made. The same contact is published at [/.well-known/security.txt](https://retrodarts.com/.well-known/security.txt).

Include the affected revision, browser/device, reproducible steps, impact and a minimal example using invented data. Test only your own local copy and data. Do not test other users' devices or hosting infrastructure.

## Data boundaries

Match state is stored in `localStorage` under `wheatsheaf-team-scorer-v3`; downloaded PDFs remain wherever the browser/user saves them. There is no app-level encryption or authentication. Scripts served from the app's origin may access origin storage. The public web version is served from Cloudflare Pages as static files and has no account service. Local storage is not an isolation or backup mechanism.

The app never sends match data to the publisher. Optional Google Drive backup writes only to a private app folder in the signed-in user's own Drive (`drive.appdata` scope; the access token is held in memory only), and Google Analytics loads only after consent. The hosting provider still processes ordinary web requests. Use one scoring tab, avoid sensitive names, and read the [known limitations](README.md#current-limitations).
