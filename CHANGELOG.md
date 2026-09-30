# Changelog

Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org).

## [1.3.6] - 2026-09-30

- Typographic changes: em dashes removed from the documentation, the landing page and the interface text.

## [1.3.5] - 2026-09-30

- Fixed: an export could save only the file that was open, skipping the rest. Files the editor hadn't loaded yet are now opened reliably. The list re-renders as they load, so entries are addressed by id, clicks are dispatched as real mouse events, and each file is waited for (up to 4s, with one retry) instead of a fixed 800ms.
- The editor returns to whichever file you had open.

## [1.3.4] - 2026-09-29

- Icon recoloured orange to match the project's look.

## [1.3.3] - 2026-09-29

- Fixed: files with unsaved edits were saved as `Code.gs unsaved`. The editor adds that marker to its labels; it is now stripped.
- The popup reports how many files had unsaved edits (their pending changes are what gets backed up).

## [1.3.2] - 2026-09-11

- Fixed: settings still rejected Workspace addresses in the `/a/<domain>/macros/s/...` form.

## [1.3.1] - 2026-09-11

- Fixed: settings rejected Workspace receiver addresses (`/a/macros/<domain>/s/.../exec`).
- Requests to the receiver now carry your Google session, so domain-restricted deployments work.

## [1.3.0] - 2026-09-11

- Drive setup simplified: the receiver generates its own password and shows one setup line to paste into Settings. No manifest file and no Script Properties to edit by hand.
- Settings now take that single line instead of separate address and password fields.

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
