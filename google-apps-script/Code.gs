const SHEET_NAME = 'Leads';
const HEADERS = [
  'submitted_at',
  'form_type',
  'name',
  'email',
  'company',
  'title',
  'phone',
  'industry',
  'environment',
  'device_count',
  'timeline',
  'message',
  'page_url',
  'user_agent',
];

const FIELD_LIMITS = {
  submitted_at: 64,
  form_type: 64,
  name: 200,
  email: 320,
  company: 300,
  title: 300,
  phone: 80,
  industry: 200,
  environment: 300,
  device_count: 100,
  timeline: 100,
  message: 5000,
  page_url: 2000,
  user_agent: 1000,
};

function doPost(e) {
  try {
    const params = e.parameter || {};
    if (params.website) {
      return jsonResponse({ ok: true, ignored: true });
    }

    const sheet = getSheet_();
    const row = HEADERS.map((header) => {
      if (header === 'user_agent') {
        return safeCell_((e && e.contextPath) || '', FIELD_LIMITS[header]);
      }
      return safeCell_(params[header] || '', FIELD_LIMITS[header]);
    });

    sheet.appendRow(row);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
}

function safeCell_(value, maxLength) {
  const text = String(value).slice(0, maxLength);
  // Prevent user-controlled values from being interpreted as spreadsheet formulas.
  return /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text;
}

function doGet() {
  return jsonResponse({ ok: true, service: 'Breakwater lead capture' });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function jsonResponse(payload, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);

  // Apps Script Web Apps do not support setting arbitrary status codes from ContentService.
  // The statusCode argument is kept for readability if this is later moved to Cloud Run.
  return output;
}
