// Runs the same specs against the deployed site instead of a local server.
//   node_modules/.bin/playwright test -c tests/playwright.live.config.mjs
// Set RETRO_LIVE_URL to point at a preview deployment. Tests that serve their own
// release files (service-worker upgrade checks) still use local files.
import {defineConfig} from '@playwright/test';
import base from './playwright.config.mjs';

export default defineConfig({
  ...base,
  workers: 2,
  use: {...base.use, baseURL: process.env.RETRO_LIVE_URL || 'https://retrodarts.com',
    storageState: {cookies: [], origins: [{origin: process.env.RETRO_LIVE_URL || 'https://retrodarts.com', localStorage: [{name: 'retro-darts-consent-v1', value: '{"analytics":"denied","at":"2026-01-01T00:00:00.000Z"}'}]}]}},
  webServer: undefined,
});
