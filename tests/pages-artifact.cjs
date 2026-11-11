'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { publicFiles } = require('../scripts/prepare-pages.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const expected = [...publicFiles].sort();

fs.rmSync(output, { recursive: true, force: true });
try {
  const result = spawnSync(process.execPath, ['scripts/prepare-pages.cjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const actual = [];
  function walk(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = path.posix.join(prefix, entry.name);
      assert.equal(entry.isSymbolicLink(), false, `symlink in artifact: ${relative}`);
      if (entry.isDirectory()) walk(path.join(directory, entry.name), relative);
      else actual.push(relative);
    }
  }
  walk(output);
  assert.deepEqual(actual.sort(), expected, 'Pages artifact must match the allowlist exactly');
} finally {
  fs.rmSync(output, { recursive: true, force: true });
}

console.log('PASS: Cloudflare Pages artifact matches the allowlist exactly');
