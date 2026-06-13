/**
 * e-QMS — Google Sheets backend (Apps Script Web App)
 * ---------------------------------------------------
 * Deploy this bound to your e-QMS workbook as a Web App:
 *   Deploy ▸ New deployment ▸ Web app
 *   Execute as: Me   |   Who has access: Anyone
 * Copy the /exec URL into the app: Settings ▸ Data Source ▸ Google Sheets.
 *
 * Storage model: each "collection" (module slug, plus _users / _audit / _meta)
 * is a worksheet/tab. Row 1 holds dynamic headers; every record is one row.
 * New fields automatically add new columns, so it stays readable in Sheets.
 *
 * Optional shared token: set SHARED_TOKEN below and in the app to require auth.
 */

var SHARED_TOKEN = ''; // e.g. 'my-secret' — leave '' to disable

function doGet(e) {
  return handle(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    body = {};
  }
  return handle(body);
}

function handle(req) {
  try {
    if (SHARED_TOKEN && req.token !== SHARED_TOKEN) {
      return json({ error: 'Unauthorized' });
    }
    var action = req.action;
    switch (action) {
      case 'list':
        return json({ rows: readAll(req.collection) });
      case 'create':
        return json({ record: createRecord(req.collection, req.record) });
      case 'update':
        return json({ record: updateRecord(req.collection, req.id, req.patch) });
      case 'remove':
        removeRecord(req.collection, req.id);
        return json({ ok: true });
      case 'upsertUser':
        return json({ record: upsertUser(req.user) });
      case 'isSeeded':
        return json({ seeded: getMeta('seeded') === 'true' });
      case 'markSeeded':
        setMeta('seeded', 'true');
        return json({ ok: true });
      default:
        return json({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json({ error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(['id']);
  }
  return sh;
}

function headers(sh) {
  var last = sh.getLastColumn();
  if (last === 0) {
    sh.appendRow(['id']);
    return ['id'];
  }
  return sh.getRange(1, 1, 1, last).getValues()[0].map(String);
}

function ensureHeaders(sh, keys) {
  var hs = headers(sh);
  var added = false;
  keys.forEach(function (k) {
    if (hs.indexOf(k) === -1) {
      hs.push(k);
      added = true;
    }
  });
  if (added) sh.getRange(1, 1, 1, hs.length).setValues([hs]);
  return hs;
}

function readAll(collection) {
  var sh = getSheet(collection);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var hs = values[0].map(String);
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < hs.length; c++) {
      var v = values[r][c];
      obj[hs[c]] = v;
      if (v !== '' && v !== null) empty = false;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

function createRecord(collection, record) {
  var sh = getSheet(collection);
  var hs = ensureHeaders(sh, Object.keys(record));
  var row = hs.map(function (h) {
    return record[h] !== undefined && record[h] !== null ? record[h] : '';
  });
  sh.appendRow(row);
  return record;
}

function findRow(sh, id) {
  var hs = headers(sh);
  var idCol = hs.indexOf('id');
  if (idCol === -1) return -1;
  var values = sh.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(id)) return r + 1; // 1-based row
  }
  return -1;
}

function updateRecord(collection, id, patch) {
  var sh = getSheet(collection);
  var hs = ensureHeaders(sh, Object.keys(patch));
  var rowIdx = findRow(sh, id);
  if (rowIdx === -1) throw 'Record not found: ' + id;
  var existing = sh.getRange(rowIdx, 1, 1, hs.length).getValues()[0];
  var merged = {};
  for (var c = 0; c < hs.length; c++) merged[hs[c]] = existing[c];
  for (var k in patch) merged[k] = patch[k];
  var row = hs.map(function (h) {
    return merged[h] !== undefined && merged[h] !== null ? merged[h] : '';
  });
  sh.getRange(rowIdx, 1, 1, hs.length).setValues([row]);
  return merged;
}

function removeRecord(collection, id) {
  var sh = getSheet(collection);
  var rowIdx = findRow(sh, id);
  if (rowIdx > 0) sh.deleteRow(rowIdx);
}

function upsertUser(user) {
  var sh = getSheet('_users');
  var rowIdx = findRow(sh, user.id);
  if (rowIdx === -1) return createRecord('_users', user);
  return updateRecord('_users', user.id, user);
}

function getMeta(key) {
  var rows = readAll('_meta');
  for (var i = 0; i < rows.length; i++) if (rows[i].key === key) return String(rows[i].value);
  return null;
}

function setMeta(key, value) {
  var sh = getSheet('_meta');
  ensureHeaders(sh, ['id', 'key', 'value']);
  var rows = readAll('_meta');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key) {
      updateRecord('_meta', rows[i].id, { value: value });
      return;
    }
  }
  createRecord('_meta', { id: 'meta_' + key, key: key, value: value });
}
