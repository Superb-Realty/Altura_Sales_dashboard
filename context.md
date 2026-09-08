# Amber Sales Dashboard — Project Context

## Purpose

This is a React and Vite dashboard for presenting the latest monthly Amber sales performance from a private Google Sheet. It is branded for Superb Realty and is intended to show CP Meetings, Total Visits, EOI Units, and EOI Area.

## Architecture

```text
Google Sheet → GET /api/sales → React dashboard
```

- `api/sales.ts` authenticates with a Google service account and reads the configured worksheet range.
- `src/App.tsx` renders the report, metric cards, and charts.
- `src/lib/sales-data.ts` defines the sales-row type and provides demo data if the private data source is unavailable.

## Google Sheets configuration

The API accepts either individual environment variables or `GOOGLE_SHEETS_CONFIG` JSON.

| Setting | Purpose |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service-account email address |
| `GOOGLE_PRIVATE_KEY` | Service-account private key |
| `GOOGLE_SHEET_ID` | Spreadsheet identifier |
| `GOOGLE_SHEET_RANGE` | Worksheet range, e.g. `Sales_Funnel!A:E` |
| `GOOGLE_SHEETS_CONFIG` | JSON alternative containing the same values |

`GOOGLE_SHEET_RANGE` takes precedence over the `range` inside `GOOGLE_SHEETS_CONFIG`. The worksheet name must exactly match the tab name, including spaces, underscores, and letter case. Share the spreadsheet with the service-account email as a Viewer.

Never commit real service-account keys, tokens, or populated `.env.local` files.

## Sheet schema

The first row is treated as headers. Supported headers are:

| Dashboard field | Accepted Sheet headers |
| --- | --- |
| Month | `Month` or `Period` |
| CP Meetings | `CP Meetings` or `Meetings` |
| Total Visits | `Total Visits` or `Visits` |
| EOI Units | `EOI Units` or `Units` |
| EOI Area | `EOI Area` or `Area` |

Rows without a Month/Period value are ignored. Numeric values may use comma separators.

## Refresh behavior

- The dashboard loads on page open and refreshes automatically every 60 seconds.
- The manual **Refresh** button adds a unique request parameter, bypassing any cached API response and fetching current Sheet data immediately.
- The API uses a 60-second shared cache for normal scheduled requests.

## UI behavior

- The Superb logo, report title, and subtitle are centered in the hero banner.
- Light/dark mode is controlled in the toolbar and saved in browser local storage under `amber-theme`.
- If the API cannot return data, the dashboard shows demo rows and displays an offline status.

## Local development

```bash
npm install
npm run dev
npm run build
```

Use a local `.env.local` file for credentials. Keep environment variable values out of source control and deployment logs.
