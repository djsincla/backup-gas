/**
 * Receiver for the BackupGAS Chrome extension.
 *
 * The extension posts the files of a script project here, and this writes them into
 *   My Drive / Apps Script Backups / <project name> / <timestamp> / <each file>
 *
 * Setup:
 *   1. Project Settings > Script Properties: add TOKEN with a long random value,
 *      and put the same value in the extension's Settings page.
 *   2. Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 *      Copy the /exec address into the extension's Settings page.
 */

const BACKUP_FOLDER_NAME = 'Apps Script Backups';

const MIME_TYPES = { '.gs': MimeType.PLAIN_TEXT, '.js': MimeType.PLAIN_TEXT, '.html': MimeType.HTML, '.json': 'application/json' };

function doPost(e) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token) throw new Error('No TOKEN set in this project’s Script Properties.');

    const body = JSON.parse(e.postData.contents);
    if (body.token !== token) throw new Error('Wrong password.');
    if (!Array.isArray(body.files) || !body.files.length) throw new Error('No files were sent.');

    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HHmm');
    const root = getOrCreateFolder_(DriveApp.getRootFolder(), BACKUP_FOLDER_NAME);
    const folder = getOrCreateFolder_(root, safeName_(body.title || 'Apps Script project')).createFolder(stamp);

    body.files.forEach(file => {
      const name = safeName_(file.name);
      const ext = (name.match(/\.[a-z]+$/i) || [''])[0].toLowerCase();
      folder.createFile(name, String(file.source || ''), MIME_TYPES[ext] || MimeType.PLAIN_TEXT);
    });

    return json_({ count: body.files.length, folderUrl: folder.getUrl() });
  } catch (err) {
    return json_({ error: err.message });
  }
}

function doGet() {
  return json_({ ok: true, message: 'BackupGAS receiver is running. Post files here.' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder_(parent, name) {
  const existing = parent.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : parent.createFolder(name);
}

// Editor file names can contain "/" (folders in the IDE); Drive has no folders inside a file name.
function safeName_(name) {
  return String(name).replace(/[\/\\]/g, '_').trim() || 'untitled';
}
