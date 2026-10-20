/**
 * Ministry sign-up -> Google Sheet.
 *
 * SETUP (once):
 *  1. Create a Google Sheet (e.g. "Ministry Sign-Ups"). Leave it empty.
 *  2. Extensions > Apps Script. Delete what's there, paste this whole file, Save.
 *  3. Deploy > New deployment > type "Web app".
 *       Execute as: Me      Who has access: Anyone
 *     Authorize when asked, then copy the Web app URL (ends in /exec).
 *  4. Paste that URL into ENDPOINT in ministry-sign-up/index.html.
 *
 * IF YOU EDIT THIS LATER: Deploy > Manage deployments > pencil on the existing
 * deployment > Version: "New version" > Deploy. (Saving alone does not update
 * the live web app, and "New deployment" would create a second URL.)
 *
 * Check it's live: open the /exec URL in a browser. It should say "Ministry sign-up is running."
 */
var SHEET_NAME = 'Sign-Ups';
var HEADERS = ['Timestamp', 'Name', 'Email', 'Cell Phone', 'Ministry', 'Followed Up'];

function doGet() {
  return ContentService.createTextOutput('Ministry sign-up is running.');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse(e.postData.contents);

    var name = clean_(d.name), email = clean_(d.email), phone = clean_(d.phone), ministry = clean_(d.ministry);
    if (!name || !ministry || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || phone.replace(/\D/g, '').length < 10) {
      return json_({ ok: false, error: 'invalid' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(SHEET_NAME);
      sh.appendRow(HEADERS);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sh.getRange('D:D').setNumberFormat('@');                 // keep phone numbers as text
      sh.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
    }
    sh.appendRow([new Date(), name, email, phone, ministry, '']);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Trim, cap length, and defuse spreadsheet formulas (=, +, -, @ at the start).
function clean_(v) {
  v = String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 200);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
