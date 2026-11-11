'use strict';
// The app's main script, ready to run in a vm sandbox: the browser store is swapped for globalThis.__testStore, the DOM
// event wiring from $('start-match').addEventListener onwards is cut, and the named internals are exposed on globalThis.api.
const fs = require('node:fs');
const path = require('node:path');
module.exports = function appScript(api, html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8')) {
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('const localStore=browserStore();'));
  if (!js) throw new Error('index.html: app script not found');
  const swapped = js.replace('const localStore=browserStore();', 'const localStore=globalThis.__testStore;');
  return swapped.slice(0, swapped.indexOf("  $('start-match').addEventListener")) + `\n globalThis.api={${api}};\n})();`;
};
