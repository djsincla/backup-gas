/**
 * Receiver for the BackupGAS Chrome extension.
 *
 * The extension posts the files of a script project here, and this writes them into
 *   My Drive / Apps Script Backups / <project name> / <timestamp> / <each file>
 *
 * Setup:
 *   1. Paste this file into a new project at script.new and save.
 *   2. Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 *   3. Open the /exec address it gives you. The page shows a setup line; copy it.
 *   4. Paste that line into the extension's Settings page.
 *
 * The password is generated on first visit and shown only that once. To start over,
 * delete TOKEN and TOKEN_CLAIMED in Project Settings > Script Properties.
 */

const BACKUP_FOLDER_NAME = 'Apps Script Backups';

const MIME_TYPES = { '.gs': MimeType.PLAIN_TEXT, '.js': MimeType.PLAIN_TEXT, '.html': MimeType.HTML, '.json': 'application/json' };

function doPost(e) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token) throw new Error('This receiver has not been set up. Open its web app address in a browser first.');

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

/** Shows the setup line once, so there is nothing to invent or type by hand. */
function doGet() {
  const props = PropertiesService.getScriptProperties();

  if (props.getProperty('TOKEN_CLAIMED')) {
    return page_('This receiver is already set up.',
      'Its setup line was shown once and cannot be shown again. If you need a new one, open Project Settings › Script Properties, delete TOKEN and TOKEN_CLAIMED, then reload this page.');
  }

  let token = props.getProperty('TOKEN');
  if (!token) {
    token = Utilities.getUuid().replace(/-/g, '');
    props.setProperty('TOKEN', token);
  }
  props.setProperty('TOKEN_CLAIMED', new Date().toISOString());

  return page_('Copy this line into the BackupGAS settings page.',
    'It contains this receiver’s address and its password. It is shown only once. Keep it private: anyone who has it can add files to your Drive.',
    ScriptApp.getService().getUrl() + '#' + token);
}

function page_(heading, note, setupLine) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const field = setupLine
    ? `<input id="line" readonly value="${esc(setupLine)}" onclick="this.select()">
       <button onclick="document.getElementById('line').select();document.execCommand('copy');this.textContent='Copied'">Copy</button>`
    : '';

  return HtmlService.createHtmlOutput(`
    <style>
      :root { color-scheme: light dark; }
      body { font: 14px Arial, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; }
      h1 { font-size: 18px; }
      p { color: #5f6368; }
      input { width: 100%; box-sizing: border-box; padding: 8px; font-family: monospace; font-size: 12px; margin-bottom: 8px; }
      button { background: #1a73e8; color: #fff; border: 0; border-radius: 4px; padding: 8px 16px; cursor: pointer; }
    </style>
    <h1>${esc(heading)}</h1>
    ${field}
    <p>${esc(note)}</p>
  `).setTitle('BackupGAS receiver');
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
