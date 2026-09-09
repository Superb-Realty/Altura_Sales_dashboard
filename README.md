# Amber Sales Dashboard

## Google sign-in access control

The dashboard and `/api/sales` are protected by a verified Google ID token. Add these values to `.env.local` for local development and to the Vercel project environment variables for every deployed environment:

```dotenv
VITE_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
ALLOWED_GOOGLE_EMAILS=owner@example.com,viewer@example.com
```

Create a **Web application** OAuth client in Google Cloud and add your local URL (for example `http://localhost:5173`) and the deployed Vercel URL under **Authorized JavaScript origins**. The two client ID values must be identical. Email matching is case-insensitive; add or remove comma-separated addresses to change who can access the dashboard.

Keep the Sheets service-account credentials server-side only. Do not put them in a `VITE_` variable.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
