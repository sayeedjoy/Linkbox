# LinkBox Browser Extension

Chrome extension for saving the current tab to LinkBox from the browser.

## Requirements

- Chrome (Manifest V3)
- LinkBox web app running (or deployed URL)
- API token from LinkBox settings

## Install

1. Open `chrome://extensions`, enable **Developer mode**.
2. Click **Load unpacked** and select this `extension` folder.

## Configure

Edit `config.js` and set `BASE_URL` to your LinkBox app URL (e.g. `http://localhost:3000` for local dev or your production URL).

## Usage

- Click the LinkBox icon in the toolbar to open the popup.
- Or use **Ctrl+Shift+B** (Windows/Linux) / **Command+Shift+B** (Mac).
- First time: paste your API token and click Connect (get the token from LinkBox → Settings).
- Save: optional title, description, and group; then click **Save bookmark**. The popup closes after save.

## Files

| File | Purpose |
|------|--------|
| `manifest.json` | Extension manifest (permissions, icons, popup, shortcut) |
| `popup.html` | Popup markup (connect + save screens) |
| `popup.css` | Popup styles |
| `popup.js` | Logic: token, API calls, save flow |
| `config.js` | `BASE_URL` for the LinkBox API |
| `icons/` | Toolbar and popup icons (16, 48, 128) |

## Permissions

- **storage** – store API token locally
- **activeTab** – read current tab URL/title for saving
- **host_permissions** – `<all_urls>`, `http://localhost:*/*`, `https://*/*` for API and favicon requests
