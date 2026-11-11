import test from 'node:test';
import assert from 'node:assert/strict';
import { deferred, harness, start } from './helpers/app-harness.mjs';

test('startup waits for local storage and blocks scoring when opening fails', async () => {
  const opening = deferred(), h = harness({ readActive: () => opening.promise });
  const ready = h.api.initialize();
  await h.api.startMatch(); assert.equal(h.api.get().phase, 'setup');
  assert.equal(h.api.persistence(), 'INITIALIZING');
  opening.reject(new Error('database unavailable')); await ready;
  assert.equal(h.api.persistence(), 'RECOVERY_REQUIRED');
  assert.equal(h.$('save-blocker').hidden, false);
  await h.api.startMatch(); assert.equal(h.api.get().phase, 'setup');
});

test('unreadable local state stays blocked and is never replaced by an export action', async () => {
  let writes = 0, raw = '{broken'; const h = harness({ readActive: async () => raw, saveActive: async value => { writes++; raw = value; } });
  await h.api.initialize(); await h.api.startMatch();
  assert.equal(h.api.persistence(), 'RECOVERY_REQUIRED'); assert.equal(writes, 0);
  assert.equal(raw, '{broken', 'the unreadable bytes remain untouched');
  assert.equal(h.$('save-blocker').hidden, false);
});

test('one pending local save accepts one score and rejects duplicate submit, Undo and replacement', async () => {
  const h = harness(); await start(h); const pending = deferred(); let writes = 0;
  h.store.saveActive = async raw => { writes++; await pending.promise; };
  h.api.setDigit('6'); h.api.setDigit('0'); const action = h.api.submit();
  await h.api.submit(); await h.api.undo(); await h.api.goToSetup(); h.api.setDigit('9');
  assert.equal(h.api.get().players[0].remaining, 241); assert.equal(h.api.get().log.length, 1);
  assert.equal(h.api.persistence(), 'SAVING'); assert.equal(writes, 1);
  pending.resolve(); await action; assert.equal(h.api.persistence(), 'READY');
});

test('save failure retains the candidate; Retry commits it without applying another visit', async () => {
  const h = harness(); await start(h); const committed = h.raw();
  h.store.saveActive = async () => { throw new Error('disk full'); };
  await h.api.record(60, false); await h.api.record(20, false);
  assert.equal(h.api.persistence(), 'SAVE_FAILED'); assert.equal(h.api.get().log.length, 1);
  assert.equal(h.raw(), committed); assert.equal(h.api.get().players[0].remaining, 241);
  let retried; h.store.saveActive = async raw => { retried = raw; }; await h.api.retrySave();
  assert.equal(JSON.parse(retried).log.length, 1); assert.equal(h.api.persistence(), 'READY');
  await h.api.applyUndo(); assert.equal(h.api.get().players[0].remaining, 301);
});

test('completed active state precedes archive verification and replacement', async () => {
  const h = harness(); await start(h); const s = h.api.get();
  s.phase = 'game-result'; s.fixtureFinished = true; s.gameWinner = 0;
  const archiving = deferred(), oldArchive = h.store.archiveCompleted;
  let activeAtArchive; h.store.archiveCompleted = async record => { activeAtArchive = JSON.parse(h.raw()); await archiving.promise; return oldArchive(record); };
  const finish = h.api.continueAfterResult();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(activeAtArchive.phase, 'complete'); assert.equal(activeAtArchive.fixtureId, s.fixtureId);
  await h.api.goToSetup(); assert.equal(h.api.get().phase, 'complete');
  archiving.resolve(); await finish;
  assert.equal(h.api.archiveStatus(), 'saved'); assert.equal(h.records.size, 1);
  await h.api.goToSetup(); assert.equal(h.api.get().phase, 'setup'); assert.equal(h.records.size, 1);
});

test('archive failure keeps retry controls usable while protecting the completed active fixture',async()=>{
  const h=harness();await start(h);const s=h.api.get();s.phase='game-result';s.fixtureFinished=true;s.gameWinner=0;
  const archive=h.store.archiveCompleted;h.store.archiveCompleted=async()=>{throw Error('disk full');};await h.api.continueAfterResult();
  assert.equal(h.api.persistence(),'ARCHIVE_FAILED');let prevented=false;
  h.api.guardTransition({detail:0,target:{closest:()=>null},preventDefault(){prevented=true;},stopImmediatePropagation(){}});
  assert.equal(prevented,false,'the archive Retry/export controls must remain usable');
  await h.api.undo();assert.match(h.$('toast').textContent,/nothing to undo/i,'Undo finish is not ignored after a failed archive');assert.equal(h.api.get().phase,'complete');await h.api.goToSetup();assert.equal(h.api.get().phase,'complete');
  h.store.archiveCompleted=archive;await h.api.retryCompletedArchive();assert.equal(h.api.persistence(),'READY');await h.api.goToSetup();assert.equal(h.api.get().phase,'setup');
});

test('undoing a finished match and finishing again leaves one record in history', async () => {
  const h = harness(); h.$('game-mode').value = 'best'; h.$('game-count').value = '1'; h.$('leg-count').value = '1';
  await start(h);
  const finish = async () => { await h.api.record(180, false); await h.api.record(0, false); await h.api.record(121, false); while (h.api.get().phase !== 'complete') await h.api.continueAfterResult(); };
  await finish(); assert.equal(h.records.size, 1);
  await h.api.applyUndo(); assert.notEqual(h.api.get().phase, 'complete');
  assert.equal(h.records.size, 0, 'the undone result is removed from history');
  await h.api.record(121, false); while (h.api.get().phase !== 'complete') await h.api.continueAfterResult();
  assert.equal(h.records.size, 1);
});

test('an undone finish whose first save failed is still removed from history after Retry', async () => {
  const h = harness(); h.$('game-mode').value = 'best'; h.$('game-count').value = '1'; h.$('leg-count').value = '1';
  await start(h);
  await h.api.record(180, false); await h.api.record(0, false); await h.api.record(121, false); while (h.api.get().phase !== 'complete') await h.api.continueAfterResult();
  const save = h.store.saveActive; h.store.saveActive = async () => { throw new Error('disk full'); };
  await h.api.applyUndo(); assert.equal(h.api.persistence(), 'SAVE_FAILED'); assert.equal(h.records.size, 1);
  h.store.saveActive = save; await h.api.retrySave();
  await h.api.record(121, false); while (h.api.get().phase !== 'complete') await h.api.continueAfterResult();
  assert.equal(h.records.size, 1, 'only the corrected result is in history');
});

test('a saved match that cannot be opened can be discarded with two taps, and scoring works again', async () => {
  let raw = '{broken'; const h = harness({ readActive: async () => raw, saveActive: async value => { raw = value; } });
  await h.api.initialize(); assert.equal(h.api.persistence(), 'RECOVERY_REQUIRED'); assert.equal(h.$('save-discard').hidden, false);
  await h.api.discardUnreadableMatch(); assert.equal(raw, '{broken', 'the first tap only asks to confirm');
  await h.api.discardUnreadableMatch(); assert.equal(h.api.persistence(), 'READY'); assert.equal(h.$('save-blocker').hidden, true);
  await h.api.startMatch(); assert.notEqual(h.api.get().phase, 'setup');
});

test('a match finished while signed in is archived with that account as owner', async () => {
  const h = harness({}, { sandbox: { googleAccount: () => ({ email: 'a@example.com', sub: 'a' }) } });
  h.$('game-mode').value = 'best'; h.$('game-count').value = '1'; h.$('leg-count').value = '1';
  await start(h);
  await h.api.record(180, false); await h.api.record(0, false); await h.api.record(121, false); while (h.api.get().phase !== 'complete') await h.api.continueAfterResult();
  assert.equal(h.records.size, 1); assert.equal([...h.records.values()][0].owner, 'a');
});
