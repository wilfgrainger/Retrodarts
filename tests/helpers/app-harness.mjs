import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import Element from './element.cjs';
import appScript from './app-script.cjs';
export function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
// overrides replace store methods; api names the exposed internals; sandbox adds or replaces globals (Date, navigator, googleAccount...).
export function harness(overrides = {}, { api = 'initialize,startMatch,startFirstGame,setDigit,submit,record,undo,applyUndo,retrySave,continueAfterResult,goToSetup,guardTransition,retryCompletedArchive,discardUnreadableMatch,get:()=>state,persistence:()=>persistenceState,archiveStatus:()=>archiveStatus,setState:x=>state=x', sandbox: globals = {} } = {}) {
  const js = appScript(api);
  const elements = new Map(), $ = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  for (const [id, value] of Object.entries({ team0: 'Home', team1: 'Away', 'start-score': '301', 'game-mode': 'all', 'game-count': '8', 'leg-mode': 'best', 'leg-count': '3' })) $(id).value = value;
  $('save-blocker').hidden = true;
  let raw = null; const records = new Map(), keys = new Map(), ACTIVE_KEY = 'wheatsheaf-team-scorer-v3';
  const store = { readActive: async () => raw, saveActive: async text => { raw = text; }, archiveCompleted: async record => { if (!records.has(record.id)) records.set(record.id, structuredClone(record)); return records.get(record.id); }, readFixture: async id => records.get(id), deleteFixture: async record => { records.delete(record.id); }, ...overrides };
  const sandbox = { __testStore:store, window: {}, document: {documentElement:{dataset:{theme:'retro'}}, getElementById: $, addEventListener() {}, visibilityState: 'visible', createElement: () => new Element(), querySelector: selector => selector === 'input[name="start-score"]:checked' ? {value:$('start-score').value} : null, querySelectorAll: () => [] }, crypto: webcrypto, TextEncoder, Date, console, setTimeout: () => 0, clearTimeout() {}, localStorage: { getItem(key) { return key === ACTIVE_KEY ? raw : keys.get(key) ?? null; }, setItem(key,value) { if (key === ACTIVE_KEY) raw = value; else keys.set(key, value); }, removeItem(key) { if (key === ACTIVE_KEY) raw = null; else keys.delete(key); } }, ...globals };
  vm.createContext(sandbox); vm.runInContext(js, sandbox);
  return { api: sandbox.api, $, store, records, sandbox, raw: () => raw, setRaw: text => { raw = text; } };
}
export async function start(h) { await h.api.initialize(); await h.api.startMatch(); h.api.get().pendingStarter = 0; await h.api.startFirstGame(); }
