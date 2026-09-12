const url = document.getElementById('url');
const token = document.getElementById('token');
const status = document.getElementById('status');

chrome.storage.sync.get(['webAppUrl', 'token']).then(s => {
  url.value = s.webAppUrl || '';
  token.value = s.token || '';
});

document.getElementById('save').onclick = async () => {
  const value = url.value.trim();
  if (value && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(value)) {
    status.textContent = 'That does not look like a web app address. It should end in /exec.';
    return;
  }
  await chrome.storage.sync.set({ webAppUrl: value, token: token.value.trim() });
  status.textContent = 'Saved.';
};
