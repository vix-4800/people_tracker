# People Tracker

A PWA for manually tracking employee locations within an office. An operator selects an employee and a room, and the application records the time and movement history on the device.

[Repository](https://github.com/vix-4800/people_tracker) · [GitHub Pages](https://vix-4800.github.io/people_tracker/)

## Features

- Employee list with search, filters, sorting, and current locations.
- People and Rooms views with employee status counts.
- Arrival, room changes, temporary departure, return, end of day, and explicit reopening of the working day.
- Individual employee history and a shared event log for the selected date, with undo for the latest action today.
- Configurable employee and room directories: add, rename, reorder, archive, and restore.
- Full database export and restore in JSON format.
- Light, dark, and system themes, with mobile and desktop layouts.
- PWA installation and offline operation after the initial load.

The application runs entirely on the client, with no server, accounts, analytics, or automatic synchronization between devices. Its interface is in Russian.

## Technology

Vue 3 Composition API, TypeScript, Vite, Dexie / IndexedDB, and vite-plugin-pwa. Business logic and storage are tested with Vitest; the browser integration scenario uses Playwright.

## Local development

Requirements: Node.js 24 and pnpm 11.25.0, matching the deployment workflow.

```sh
git clone https://github.com/vix-4800/people_tracker.git
cd people_tracker
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

## Checks and production build

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`build` checks TypeScript and generates the production build in `dist/`. `preview` serves it at `http://localhost:4173`. The service worker is enabled in production builds and is not registered in `dev` mode.

To preview the GitHub Pages build:

```sh
pnpm build --base /people_tracker/
pnpm preview --base /people_tracker/
```

Preview URL: `http://localhost:4173/people_tracker/`.

With production preview running, `pnpm test:browser` checks movement entry, all event types, undo, the event log, themes, JSON import, and offline persistence. Google Chrome must be installed. The test opens `http://127.0.0.1:4173/` by default; set `APP_URL` to use another address. For example, to test the Pages build in PowerShell:

```powershell
$env:APP_URL = 'http://127.0.0.1:4173/people_tracker/'
pnpm test:browser
```

For Microsoft Edge, set `PLAYWRIGHT_CHANNEL=msedge`. The test uses a separate temporary browser profile and saves screenshots and a test backup in `test-results/`.

## Usage

1. Add employees and rooms in Settings. Both directories are empty on first launch.
2. In the location view, select an employee and then a room. The first room assignment of the day records an arrival; subsequent changes record movements. Selecting the current room again does not create an event.
3. Temporary departure marks an employee as away. Selecting a room afterward records a return. After ending the day, explicitly reopen it and select a room before recording further movements.
4. An employee's card shows their history, first arrival time, and final departure time. Undo removes that employee's latest event today and restores the previous state.
5. Select a date to view previous days. Historical dates are read-only. At the start of a new calendar day, employees appear as not yet arrived; history and directories are preserved.
6. Archiving hides an entry from the active directory while preserving its history. Renaming does not break references: events use stable IDs and display current names.

## GitHub Pages deployment

Deployment is configured in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It runs on pushes to `main` or manually through **Actions → Publish to GitHub Pages → Run workflow**.

In the [repository settings](https://github.com/vix-4800/people_tracker/settings/pages), select **Pages → Build and deployment → Source → GitHub Actions**.

The workflow installs dependencies from the lockfile, runs tests, checks TypeScript, builds the application, and publishes `dist/`. The site path is passed to Vite automatically from the Pages configuration; there is no need to edit `base` in `vite.config.ts` manually.

Deployment URL: [vix-4800.github.io/people_tracker/](https://vix-4800.github.io/people_tracker/). Workflow status is available under [Actions](https://github.com/vix-4800/people_tracker/actions).

When an update is available, the application offers to reload. The IndexedDB database is preserved. To move data from localhost to the published site, export JSON at the old address and restore it at the new one.

## Installation and offline use

Open the published application and wait for the message confirming that it is ready to work offline.

- **Android:** use Chrome's menu to install the application or add it to the home screen.
- **Windows:** use the install button in Chrome or Edge's address bar, or the corresponding browser menu item.
- **Linux:** the application works in the browser; installation is available in browsers that support PWAs.

To check offline operation, close the application, disconnect from the network, and reopen it. Record a movement and restart the application; the state should persist. PWA functionality requires HTTPS, with `localhost` as a local development exception.

## Backups and data storage

In Settings, choose JSON export to download the directories, archived entries, events, and settings. Restore validates the format, version, unique IDs, references, and event sequence. After confirmation, the backup completely replaces the current database in a single transaction. Database merging is not supported.

Backup format: `office-movements`, version `1`. The maximum import file size is 25 MB. Backups contain employee names and movement history in plain text; keep them outside the repository.

Data is tied to the device, browser profile, and site origin (protocol, domain, and port). It does not synchronize automatically between devices. Clearing site data or deleting the browser profile can remove the database, so create backups regularly. Settings includes a persistent storage request, which the browser may decline.

The tracking date and event times come from the device clock. When restoring on a device in a different time zone, the original tracking date is preserved, while times are displayed in the viewer's local time zone. The application does not detect presence automatically: an operator enters all movements.

## Project structure

- `src/domain/` — models, state transition rules, and tests.
- `src/data/` — IndexedDB, transactions, migrations, backup validation, and tests.
- `src/composables/` — reactive state, commands, and calendar day rollover.
- `src/components/` — employee list, action panel, event log, and settings.
- `src/App.vue` — navigation, filters, and views.
- `public/icons/` — application icons.
- `tests/browser-smoke.mjs` — browser integration scenario.
- `vite.config.ts` — build configuration, PWA manifest, and resource caching.
- `.github/workflows/deploy.yml` — checks and GitHub Pages deployment.
