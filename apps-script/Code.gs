// Google Apps Script, který přijímá výsledky z testu Tower of London a zapisuje je do Google Tabulky.
// Postup nasazení je v README.md (sekce „Online sběr výsledků“).

/**
 * Skript smí pracovat jen s tabulkou, ve které je vložený, ne s celým Google Diskem.
 * Díky tomu Google žádá méně citlivé oprávnění.
 * @OnlyCurrentDoc
 */

var SHEET_NAME = "Výsledky";

// Kontrola, že je skript nasazený: otevřete URL webové aplikace v prohlížeči.
function doGet() {
  return json({ ok: true, message: "Tower of London – endpoint pro výsledky běží." });
}

// Aplikace posílá JSON: { records: [ {...}, {...} ] }
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var payload = JSON.parse(e.postData.contents);
    var records = payload.records || [];
    var sheet = getSheet();
    var header = ensureHeader(sheet, records);
    var idCol = header.indexOf("record_id") + 1;

    var added = 0;
    records.forEach(function (r) {
      // Stejný záznam může přijít znovu (např. po výpadku spojení) – duplicity přeskočíme.
      if (idCol > 0 && r.record_id && sheet.getLastRow() > 1) {
        var found = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1)
          .createTextFinder(String(r.record_id)).matchEntireCell(true).findNext();
        if (found) return;
      }
      sheet.appendRow(header.map(function (col) {
        return col === "received_at" ? new Date() : clean(r[col]);
      }));
      added++;
    });
    return json({ ok: true, added: added });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

// Hlavička se vytvoří z prvního záznamu. Přibydou-li v aplikaci nové sloupce, doplní se na konec.
function ensureHeader(sheet, records) {
  var header = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String)
    : [];
  if (!header.length) header.push("received_at");
  records.forEach(function (r) {
    Object.keys(r).forEach(function (k) {
      if (header.indexOf(k) < 0) header.push(k);
    });
  });
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold");
  sheet.setFrozenRows(1);
  return header;
}

// Text začínající =, +, - nebo @ by tabulka brala jako vzorec.
function clean(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
