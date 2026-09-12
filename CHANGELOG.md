# Changelog

Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org).

## [1.2.0] - 2026-09-11

- Added an icon.
- Popup and settings follow your light or dark theme.
- Settings now open as a dialog with **Save and close** and **Back**, so you return to where you were.
- Popup footer shows the version and links to this changelog.

## [1.1.1] - 2026-09-11

- Fixed: downloads lost their extensions (`Code.gs` saved as `Code.txt`).

## [1.1.0] - 2026-09-11

- Added **Save to Google Drive**, via a self-deployed Apps Script receiver (`receiver/`) guarded by a token.
- Added a settings page for the receiver address and token.
- Exporting moved to a background worker, so closing the popup no longer stops it; downloads now start together.
- Fixed: exports appearing to hang when the popup lost focus.

## [1.0.0] - 2026-09-11

- First release: download every file of the open Apps Script project, with original names, to `Downloads/Apps Script Backups/`.
- Works for container-bound scripts, without the Apps Script API or a Google Cloud project.
