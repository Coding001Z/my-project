# Digital Balance

Digital Balance is a responsive, privacy-first screen-time and focus tracker. It helps students, professionals, and anyone looking for a healthier relationship with their screens understand daily habits and make room for focused work and regular eye breaks.

All personal data stays in the browser's LocalStorage. Data remains in the user's browser and is not synchronized across devices. The app has no account, backend, analytics service, or external runtime dependency.

## Live demo

- **Web app:** [https://coding001z.github.io/my-project/](https://coding001z.github.io/my-project/)
- **Source repository:** [https://github.com/Coding001Z/my-project](https://github.com/Coding001Z/my-project)

## Features

- Record, edit, and delete screen-time entries by date, category, and time.
- Calculate session duration as times are entered and use quick end-time presets.
- Review daily screen time, category totals, goals, and completed focus sessions on the dashboard.
- Set daily screen-time, social-media, and focus goals.
- Run a persistent Focus Timer with pause, resume, reset, and saved completed sessions.
- Configure an Eye Break Reminder with snooze, break, and accessible controls.
- View a weekly report with seven-day totals, daily category and focus breakdowns, charts, statistics, and data-based insights.
- Reset Digital Balance data stored on this device from Settings after confirmation.
- Use the interface on desktop, tablet, and mobile.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Browser LocalStorage

Charts are rendered with SVG and CSS. No charting or JavaScript framework is required.

## Run locally

No package installation or build step is required.

1. Download or clone this project.
2. Open `index.html` in a modern browser.
3. If your browser restricts LocalStorage for files opened directly, serve the project folder with any static HTTP server and open its `index.html` URL. For example, with Python installed:

   ```powershell
   python -m http.server 8000
   ```

   Then visit `http://localhost:8000`.

## Deploy with GitHub Pages

This is a static site and can be hosted from the repository root without a build step:

1. Push the project to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then save.
5. Open the URL shown in the Pages settings after the deployment completes.

The app uses relative paths for its pages and assets so it can be hosted from a repository subpath. Verify the deployed site's Pages URL and browser console after publishing.

## Screenshots

The repository does not currently include captured screenshots. For a portfolio capture, run the app locally or open its deployed URL and save browser screenshots to `assets/screenshots/`:

- `dashboard.png` — Dashboard at desktop width.
- `time-tracker.png` — Screen-time entry form and saved entries.
- `weekly-report.png` — Weekly statistics and charts.
- `mobile-dashboard.png` — Dashboard at a mobile width.

Use real browser captures with representative local data; do not commit private personal tracking data.

## Data and privacy

Screen-time entries, goals, focus sessions, Focus Timer state, and Eye Break preferences are stored in the user's browser. **Data is stored in the user's browser and is not synchronized across devices.** Clearing browser site data removes it. The Settings page provides a confirmed **Reset All Data** action for this app's LocalStorage keys.

## How to use

1. Open the Dashboard to see today's totals and goal progress.
2. Use **บันทึกเวลา** to add, edit, or delete screen-time entries.
3. Set daily targets in **เป้าหมาย** and start a session in **Focus Timer**.
4. Configure eye-break reminders under **ตั้งค่า**.
5. Open **รายงาน** to review the last seven days.
6. To erase this app's saved browser data, choose **Reset All Data** in Settings and confirm.

## Known limitations

- Personal data is stored only in LocalStorage on the current browser and device; it does not sync across devices or browsers.
- Clearing site data or using private browsing may remove saved data.
- Screen-time entries are entered by the user; the browser cannot automatically observe device-wide app usage.
- Eye Break Reminder counts time only while a Digital Balance page is open and visible.
- The app has no accounts, cloud backup, backend, or multi-user support.

## Future architecture

If cross-device sync or managed backups are needed, a future version could introduce a small HTTPS API, an authenticated account service, and a database with per-user access controls. Keep the current LocalStorage-only mode as an offline-friendly option, and add explicit export/import and consent before any personal tracking data leaves the device.

## Future improvements

- Export and import a user-controlled backup.
- Add date-range selection and compare custom periods.
- Expand automated browser and accessibility testing.
- Capture and maintain portfolio screenshots.
- Add an optional installable offline experience.
