const line = document.getElementById('line');
const status = document.getElementById('status');

const SETUP_PATTERN = /^(https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec)(?:#(.+))?$/;

chrome.storage.sync.get(['webAppUrl', 'token']).then(s => {
  line.value = s.webAppUrl ? s.webAppUrl + (s.token ? '#' + s.token : '') : '';
});

document.getElementById('save').onclick = async () => {
  const value = line.value.trim();

  if (!value) {
    await chrome.storage.sync.set({ webAppUrl: '', token: '' });
    status.textContent = 'Cleared. Downloads to this computer still work.';
    return setTimeout(closeSettings, 800);
  }

  const match = value.match(SETUP_PATTERN);
  if (!match) {
    status.textContent = 'That does not look right. Paste the whole line from the receiver page: an address ending in /exec, then # and the password.';
    return;
  }
  if (!match[2]) {
    status.textContent = 'The password is missing. The line should end with # followed by the password.';
    return;
  }

  await chrome.storage.sync.set({ webAppUrl: match[1], token: match[2] });
  status.textContent = 'Saved.';
  setTimeout(closeSettings, 500);
};

document.getElementById('close').onclick = closeSettings;

// Settings open as a dialog over whatever page you were on; closing returns you there.
// If Chrome opened them in a tab instead, close that tab.
async function closeSettings() {
  window.close();
  const tab = await chrome.tabs.getCurrent();
  if (tab) chrome.tabs.remove(tab.id);
}
