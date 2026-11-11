import {defineConfig} from '@playwright/test';

const port=Number(process.env.RETRO_TEST_PORT||8765);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('RETRO_TEST_PORT must be an unused TCP port between 1024 and 65535');

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  // Every test uses its own browser context, so tests may run in any order and in parallel.
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  reporter: 'line',
  outputDir: '../artifacts/test-results',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // A cookie choice is preset so the banner does not affect layout checks (tests/consent.spec.mjs clears it); tests/helpers/test.mjs keeps Google unreachable, so the sign-in gate gives way to Start a match.
    storageState: {cookies: [], origins: [{origin: `http://127.0.0.1:${port}`, localStorage: [{name: 'retro-darts-consent-v1', value: '{"analytics":"denied","at":"2026-01-01T00:00:00.000Z"}'}]}]},
    trace: 'off',
  },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    cwd: '..',
    // Hide Python access logs so CI output retains Playwright failure details.
    stderr: 'ignore',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
