import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Offline unit tests only. No Google requests or real leads.
const source = readFileSync(new URL('../google-apps-script/org-owned/Code.gs', import.meta.url), 'utf8');
const legacy = readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');
const schema = vm.runInNewContext(`${legacy}\nHEADERS`);
let checks = 0;
function fixture(options = {}) {
  const rows = [];
  let releases = 0;
  let opens = 0;
  const sheet = {
    getRange: () => ({ getValues: () => [options.headers || schema] }),
    appendRow: row => {
      if (options.appendError) throw new Error('private destination details');
      rows.push(row);
    },
  };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => {
        assert.equal(key, 'SPREADSHEET_ID');
        return options.missingId ? null : 'test-sheet-id';
      },
    }) },
    SpreadsheetApp: {
      openById: id => {
        assert.equal(id, 'test-sheet-id');
        opens++;
        return { getSheetByName: name => {
          assert.equal(name, 'Leads');
          return options.missingSheet ? null : sheet;
        } };
      },
      flush: () => {},
    },
    LockService: { getScriptLock: () => ({
      tryLock: () => !options.busy,
      releaseLock: () => { releases++; },
    }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }),
    },
  });
  vm.runInContext(source, context);
  return { context, rows, releases: () => releases, opens: () => opens };
}
const valid = { name: 'Test Person', email: 'test@example.invalid', message: 'Offline test' };
function check(name, run) { run(); checks++; console.log(`PASS ${name}`); }

check('same 14-column schema as the current form', () => {
  assert.deepEqual(Array.from(vm.runInContext('HEADERS', fixture().context)), Array.from(schema));
});
check('setup check inserts no lead', () => {
  const f = fixture(); f.context.verifySetup(); assert.equal(f.rows.length, 0);
});
check('GET is liveness only', () => {
  const f = fixture(); assert.equal(f.context.doGet().ok, true); assert.equal(f.opens(), 0);
});
check('valid post appends once and releases lock', () => {
  const f = fixture();
  assert.equal(f.context.doPost({ parameter: { ...valid, submitted_at: 'forged' } }).ok, true);
  assert.equal(f.rows.length, 1); assert.equal(f.rows[0].length, 14);
  assert.match(f.rows[0][0], /^\d{4}-\d\d-\d\dT/);
  assert.equal(f.rows[0][2], valid.name); assert.equal(f.rows[0][3], valid.email);
  assert.equal(f.releases(), 1);
});
check('honeypot never touches spreadsheet', () => {
  const f = fixture(); assert.equal(f.context.doPost({ parameter: { ...valid, website: 'spam' } }).ignored, true);
  assert.equal(f.opens(), 0); assert.equal(f.rows.length, 0);
});
check('missing or invalid input never writes', () => {
  for (const parameter of [undefined, {}, { ...valid, name: '' }, { ...valid, email: 'bad' }]) {
    const f = fixture(); assert.equal(f.context.doPost(parameter ? { parameter } : undefined).ok, false);
    assert.equal(f.rows.length, 0); assert.equal(f.opens(), 0);
  }
});
check('configuration failures are closed and do not leak details', () => {
  for (const options of [{ missingId: true }, { missingSheet: true }, { headers: ['wrong'] }, { appendError: true }]) {
    const f = fixture(options); const response = f.context.doPost({ parameter: valid });
    assert.equal(response.ok, false); assert.equal(response.error, 'Unable to save the inquiry.');
    assert.equal(f.rows.length, 0); assert.equal(f.releases(), 1);
  }
});
check('busy lock does not append or release someone else’s lock', () => {
  const f = fixture({ busy: true }); assert.equal(f.context.doPost({ parameter: valid }).ok, false);
  assert.equal(f.rows.length, 0); assert.equal(f.releases(), 0);
});
check('formula escaping, length limits, and optional user agent', () => {
  const f = fixture();
  for (const value of ['=1+1', '+1', '-1', '@SUM(A1)', '\t =1+1']) {
    assert.equal(f.context.safeCell_(value, 100), "'" + value);
  }
  f.context.doPost({ parameter: { ...valid, message: 'a'.repeat(6000), user_agent: 'test-agent' } });
  assert.equal(f.rows[0][11].length, 5000); assert.equal(f.rows[0][13], 'test-agent');
});
console.log(`${checks} offline checks passed; no real submissions.`);
