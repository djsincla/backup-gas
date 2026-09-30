// All work runs here, not in the popup, so closing the popup doesn't stop an export.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
  return true; // keep the message channel open for the async reply
});

async function handle(msg) {
  if (msg.type === 'listFiles') return inject(msg.tabId, readNames);

  if (msg.type === 'export') {
    const project = await inject(msg.tabId, readProject);
    if (project.error) return project;
    const files = project.files.filter(f => f.source !== null);
    if (!files.length) return { error: 'None of the files could be read. Reload the editor page and try again.' };
    const result = msg.mode === 'drive' ? await saveToDrive(project.title, files) : await downloadFiles(project.title, files);
    if (!result.error) {
      result.skipped = project.files.length - files.length;
      result.unsaved = files.filter(f => f.unsaved).length;
    }
    return result;
  }

  throw new Error('Unknown request: ' + msg.type);
}

async function inject(tabId, func) {
  // world: 'MAIN' — the editor's `monaco` object lives in the page, not in an isolated content-script world.
  const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func });
  return result;
}

async function downloadFiles(title, files) {
  const folder = `Apps Script Backups/${safe(title)} ${stamp()}`;
  await Promise.all(files.map(f => chrome.downloads.download({
    url: toDataUrl(f.source, f.name),
    // File names can contain "/" (folders in the editor); keep them as subfolders.
    filename: `${folder}/${f.name.split('/').map(safe).join('/')}`,
    saveAs: false,
    conflictAction: 'uniquify',
  })));
  return { ok: true, count: files.length, where: 'Downloads › ' + folder };
}

async function saveToDrive(title, files) {
  const { webAppUrl, token } = await chrome.storage.sync.get(['webAppUrl', 'token']);
  if (!webAppUrl) return { error: 'No Drive address saved yet. Click Settings below and paste in your web app address.' };

  let res;
  try {
    // text/plain avoids a CORS preflight, which Apps Script web apps can't answer.
    res = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      // Workspace deployments are restricted to the domain, so the request has to carry
      // the Google session cookies rather than arriving anonymously.
      credentials: 'include',
      body: JSON.stringify({ token, title, files }),
    });
  } catch (e) {
    return { error: 'Could not reach the web app: ' + e.message };
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { error: /<html|<!DOCTYPE/i.test(text)
      ? 'The web app returned a web page instead of saving. Check that its address ends in /exec and that it is deployed with access set to Anyone.'
      : 'Unexpected reply from the web app: ' + text.slice(0, 200) };
  }
  if (data.error) return { error: 'Web app: ' + data.error };
  return { ok: true, count: data.count, where: 'Google Drive', folderUrl: data.folderUrl };
}

function stamp() {
  const n = new Date();
  const p = x => String(x).padStart(2, '0');
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}_${p(n.getHours())}${p(n.getMinutes())}`;
}

// Service workers have no URL.createObjectURL, so downloads use data: URLs.
//
// Chrome rewrites a download's extension to match its content type: sending .gs or .html
// as text/plain saved them as .txt. Types it has no opinion about are left alone, so
// anything other than .html/.json goes out as application/octet-stream.
function toDataUrl(text, name) {
  const ext = (String(name).match(/\.[a-z]+$/i) || [''])[0].toLowerCase();
  const type = { '.html': 'text/html', '.htm': 'text/html', '.json': 'application/json' }[ext] || 'application/octet-stream';
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return `data:${type};base64,` + btoa(binary);
}

// Characters Chrome, macOS or Windows reject in file names.
function safe(name) {
  return String(name).replace(/[\\:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+/, '_').trim() || '_';
}

/* ---- these two run inside the Apps Script editor page and must be self-contained ---- */

// The file list items carry data-res-id="file_N"; the editor keeps each file's code in a
// Monaco model whose address ends in /file_N.<ext>.
function readNames() {
  const list = document.querySelector('[role="listbox"][aria-label="Project files"]');
  if (!window.monaco || !list) {
    return { error: 'No project files found. Open a project in the Apps Script editor and let the page finish loading.' };
  }
  // The editor marks files with pending edits ("Code.gs unsaved"); keep just the file name.
  const clean = raw => {
    const name = String(raw).replace(/[,\s]+unsaved(\s+changes)?\s*$/i, '').trim();
    if (/\.(gs|js|html|json)$/i.test(name)) return name;
    const match = name.match(/([\w .\-\/]+\.(?:gs|js|html|json))/i);
    return match ? match[1].trim() : name;
  };

  const names = [...list.querySelectorAll('[role="option"][data-res-id]')]
    .map(i => clean(i.getAttribute('aria-label') || i.innerText.trim().split('\n')[0]));
  const title = document.title.replace(/\s*-\s*Project Editor\s*-\s*Apps Script\s*$/i, '').trim() || 'Apps Script project';
  return { title, names };
}

async function readProject() {
  const list = document.querySelector('[role="listbox"][aria-label="Project files"]');
  if (!window.monaco || !list) {
    return { error: 'No project files found. Open a project in the Apps Script editor and let the page finish loading.' };
  }

  const modelFor = id => monaco.editor.getModels().find(m => new RegExp('/' + id + '\\.[a-z]+$').test(m.uri.path));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // The editor marks files with pending edits ("Code.gs unsaved"); keep just the file name,
  // and remember which ones were unsaved so the popup can say so. The contents come from the
  // editor's buffer either way, so unsaved work is what gets backed up.
  const clean = raw => {
    const name = String(raw).replace(/[,\s]+unsaved(\s+changes)?\s*$/i, '').trim();
    if (/\.(gs|js|html|json)$/i.test(name)) return name;
    const match = name.match(/([\w .\-\/]+\.(?:gs|js|html|json))/i);
    return match ? match[1].trim() : name;
  };

  // The editor only holds a file's text once that file has been opened. Clicking the list
  // entry makes it load, but the list re-renders when it does, so entries are addressed by
  // id rather than held as element references.
  const itemFor = id => document.querySelector('[role="option"][data-res-id="' + id + '"]');

  const openFile = el => {
    el.scrollIntoView({ block: 'nearest' });
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
  };

  const waitForModel = async (id, timeout) => {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      const model = modelFor(id);
      if (model) return model;
      await sleep(150);
    }
    return null;
  };

  const entries = [...list.querySelectorAll('[role="option"][data-res-id]')].map(el => ({
    id: el.getAttribute('data-res-id'),
    raw: el.getAttribute('aria-label') || el.innerText.trim().split('\n')[0],
  }));
  const wasSelected = (document.querySelector('[role="option"][data-res-id][aria-selected="true"]') || {}).getAttribute
    ? document.querySelector('[role="option"][data-res-id][aria-selected="true"]').getAttribute('data-res-id')
    : null;

  const files = [];
  for (const entry of entries) {
    let model = modelFor(entry.id);
    if (!model) {
      const el = itemFor(entry.id);
      if (el) {
        openFile(el);
        model = await waitForModel(entry.id, 4000);
        if (!model) {           // one retry: a click can land while the list is re-rendering
          const again = itemFor(entry.id);
          if (again) openFile(again);
          model = await waitForModel(entry.id, 4000);
        }
      }
    }
    files.push({ name: clean(entry.raw), unsaved: /unsaved/i.test(entry.raw), source: model ? model.getValue() : null });
  }

  // Put the editor back on whichever file was open before.
  if (wasSelected) {
    const el = itemFor(wasSelected);
    if (el) openFile(el);
  }

  const title = document.title.replace(/\s*-\s*Project Editor\s*-\s*Apps Script\s*$/i, '').trim() || 'Apps Script project';
  return { title, files };
}
