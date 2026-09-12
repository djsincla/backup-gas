# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org).

## [1.1.1] - 2026-09-11

### Fixed
- Downloaded files lost their extensions (`Code.gs` saved as `Code.txt`). Chrome rewrites a download's extension to match the content type it is given, so each file is now sent with a type that matches its own extension.

## [1.1.0] - 2026-09-11

### Added
- **Save to Google Drive**, via a self-deployed Apps Script receiver (`receiver/`), guarded by a token.
- Settings page for the receiver address and token.
- File list and progress messages in the popup.

### Changed
- Exporting moved from the popup to a background service worker, so closing the popup no longer stops an export in progress.
- Downloads now start together instead of one at a time.

### Fixed
- Export appearing to hang when the popup lost focus (for example, when Chrome asked where to save a file).

## [1.0.0] - 2026-09-11

### Added
- Initial release: read every file of the open Apps Script project from the editor page and download it, with original file names, into `Downloads/Apps Script Backups/`.
- Works for container-bound scripts, without the Apps Script API or a Google Cloud project.
