// Replacement deployment only. The existing live deployment is unchanged.
// Set SPREADSHEET_ID in Project Settings > Script properties before deployment.
const SHEET_NAME = 'Leads';
const HEADERS = [
  'submitted_at', 'form_type', 'name', 'email', 'company', 'title', 'phone',
  'industry', 'environment', 'device_count', 'timeline', 'message',
  'page_url', 'user_agent',
];
const FIELD_LIMITS = {
  submitted_at: 64, form_type: 64, name: 200, email: 320, company: 300,
  title: 300, phone: 80, industry: 200, environment: 300, device_count: 100,
  timeline: 100, message: 5000, page_url: 2000, user_agent: 1000,
};

// Run from the editor once to authorize access and check configuration.
// This does not insert a test lead or change the sheet.
function verifySetup() {
  getSheet_();
  return 'Leads destination and headers verified. No lead was submitted.';
}

function doGet() {
  // Liveness only: a GET response does not establish successful lead delivery.
  return jsonResponse_({ ok: true, service: 'Breakwater lead capture' });
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  if (params.website) return jsonResponse_({ ok: true, ignored: true });

  const name = String(params.name || '').trim();
  const email = String(params.email || '').trim();
  if (!name || name.length > FIELD_LIMITS.name ||
      email.length > FIELD_LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse_({ ok: false, error: 'A name and valid email are required.' });
  }

  let lock;
  let locked = false;
  try {
    lock = LockService.getScriptLock();
    locked = lock.tryLock(10000);
    if (!locked) return jsonResponse_({ ok: false, error: 'Please try again shortly.' });
    const sheet = getSheet_();
    const values = Object.assign({}, params, {
      name: name,
      email: email,
      // Receipt time is server-generated; do not trust the client's clock.
      submitted_at: new Date().toISOString(),
    });
    const row = HEADERS.map(function (header) {
      return safeCell_(values[header] || '', FIELD_LIMITS[header]);
    });
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return jsonResponse_({ ok: true });
  } catch (error) {
    // Do not expose spreadsheet IDs, internal errors, or submitted lead data.
    return jsonResponse_({ ok: false, error: 'Unable to save the inquiry.' });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function getSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Set the SPREADSHEET_ID script property.');
  const sheet = SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Create the Leads tab before deployment.');
  const headers = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (HEADERS.some(function (header, index) { return headers[index] !== header; })) {
    throw new Error('Leads headers do not match the expected schema.');
  }
  return sheet;
}

function safeCell_(value, maxLength) {
  const text = String(value).slice(0, maxLength);
  // Preserve the existing formula-injection defense, including leading whitespace.
  return /^[\u0000-\u0020]*[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(payload) {
  // ContentService does not support setting arbitrary HTTP status codes.
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
