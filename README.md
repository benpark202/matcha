# matcha
Matcha is a modern life dashboard product for users who enjoy power with simplicity  🍵

matcha is a minimalist life dashboard built with Node.js, HTML, CSS, and vanilla JavaScript. It ships with a supabase-backed sign-in flow, a working calendar, a daily tasks list, and a tiny settings modal for picking the dashboard font.

## Features
- supabase email magic-link authentication (configure `SUPABASE_URL` and `SUPABASE_ANON_KEY`).
- interactive calendar with month navigation and task-aware days.
- daily task list that persists in localStorage per date.
- settings modal to toggle between serif or monospace fonts, stored locally.
- footer that reads `~ 🌿  jan 2026  🌿 ~` with all lowercase styling.

## Getting started
1. copy `.env.example` to `.env` and fill in your Supabase project URL and anon key.
2. install dependencies with `npm install`.
3. run `npm run dev` for local development (or `npm start` for production).

The server listens on `3000` by default and serves the static SPA from `/public`.

## Customization
- Fonts: open the settings modal (top-right) and pick `serif` or `monospace` to update the dashboard font immediately. The selection is stored in `localStorage`.
- Tasks: add, toggle, and remove tasks for the selected date. A badge on the calendar lets you know which days already have entries.
- Authentication: the magic-link form sends a one-time link using Supabase Auth. You can sign out with the button next to settings.

## Environment variables
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Leave the values empty while prototyping if you only need the calendar/tasks experience; the sign-in button will be disabled until the variables are provided.
