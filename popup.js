const $ = id => document.getElementById(id);
let tabId = null;

init();

async function init() {
  setStatus('Reading project…');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https:\/\/script\.google\.com\//.test(tab.url || '')) {
    return setStatus('Open an Apps Script project in the editor (script.google.com), then click this icon again.', true);
  }
  tabId = tab.id;

  const info = await chrome.runtime.sendMessage({ type: 'listFiles', tabId });
  if (!info || info.error) return setStatus((info && info.error) || 'Could not read this page.', true);

  $('project').textContent = info.title;
  info.names.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    $('files').appendChild(li);
  });
  setStatus(`${info.names.length} files ready.`);
  $('buttons').hidden = false;
  $('download').onclick = () => run('download');
  $('drive').onclick = () => run('drive');
}

async function run(mode) {
  $('download').disabled = $('drive').disabled = true;
  setStatus(mode === 'drive' ? 'Saving to Google Drive…' : 'Downloading…');
  $('hint').hidden = false;

  const res = await chrome.runtime.sendMessage({ type: 'export', tabId, mode });
  $('download').disabled = $('drive').disabled = false;
  $('hint').hidden = true;

  if (!res || res.error) return setStatus((res && res.error) || 'Export failed.', true);

  setStatus(`Saved ${res.count} files to ${res.where}.`
    + (res.skipped ? ` ${res.skipped} file(s) could not be read.` : '')
    + (res.unsaved ? ` ${res.unsaved} had unsaved edits in the editor; the backup has them.` : ''));
  if (res.folderUrl) {
    const a = document.createElement('a');
    a.href = res.folderUrl;
    a.target = '_blank';
    a.textContent = ' Open folder';
    $('status').appendChild(a);
  }
}

function setStatus(text, isError) {
  $('status').textContent = text;
  $('status').className = isError ? 'error' : '';
}

$('version').textContent = 'v' + chrome.runtime.getManifest().version;

$('settings').onclick = e => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
};

$('changes').onclick = e => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('CHANGELOG.md') });
};
