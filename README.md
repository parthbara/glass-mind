# Glass Mind

A personal life-ops dashboard: a real-time map of your own devices (PC, laptop, phone), a visual mind-map for tracking active projects and tasks, and an AI assistant (Gemini) that has context on what you're working on.

## What it does

- **Live device sync** -- a lightweight PC daemon (PowerShell) and an Android automation macro report battery, active window, and location to a Firebase Realtime Database; the web app renders them live on a map and in status cards.
- **Mind-map project tracking** -- projects and tasks as nodes on a draggable canvas, with progress and status per node.
- **AI context chat** -- a Gemini-powered assistant that can answer questions using the current project context.
- **Chat widget** -- a lightweight messaging surface synced through the same Firebase backend.

## Stack

React 19, Vite, Firebase Realtime Database, Framer Motion, React Leaflet (maps), Lucide icons, Google Gemini API.

## Running it locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your own Firebase project config and Gemini API key.
3. `npm run dev`

See `FIREBASE_SETUP.md` for creating a Firebase project and `DEVICE_SETUP.md` for wiring up the PC daemon and Android reporter.

## Status

Personal project, actively used day-to-day.

This public repo carries no secrets and no live endpoints:

- API keys are read from a gitignored `.env` (see `.env.example`); nothing is hardcoded.
- `watcher.ps1`, `launcher.ps1`, and `public/tracker.html` ship with `YOUR-PROJECT` placeholder URLs you must fill in yourself.
- The seed data in `src/components/core.jsx` is generic -- example projects and a public landmark coordinate, no real personal details.

With no Firebase environment variables set, the app runs in `DEMO_MODE`: fully client-side, no network calls, nothing persisted.
