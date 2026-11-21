# Component Canvas

Visualize and organize your Figma component relationships. Plan hierarchies, manage variants, and collaborate on design system architecture.

## Getting started

Requires [Node.js](https://nodejs.org/) (or [Bun](https://bun.sh/)) and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
# Install dependencies
npm install

# Start the dev server at http://localhost:8080
npm run dev

# Production build into dist/
npm run build

# Preview the production build
npm run preview

# Lint
npm run lint
```

## Desktop app (Tauri)

The app also runs as a native desktop app via [Tauri v2](https://v2.tauri.app/), using the OS webview (WKWebView on macOS) instead of bundling Chromium.

```sh
# Run the desktop app with hot reload
npm run desktop:dev

# Build a macOS .app and .dmg
npm run desktop:build
```

The dev server starts on port 8080 and automatically falls back to the next free port if it's taken.

Set `VITE_WEB_ORIGIN` in `.env` (see `.env.example`) so share links and Supabase email redirects point at the hosted web app instead of `tauri://localhost`.

The Tauri shell lives in `src-tauri/`. macOS is the primary target; Windows/Linux support is tracked separately.

## Views

The planner has two views, switchable from the **View** menu in the dock:

- **Canvas** — the free-form React Flow editor for creating nodes and connections.
- **Structured map** — a table-like grid where columns are hierarchy levels (main component → variant, literal → alias → usage) and rows are leaves. Each root starts a new block of rows, and the header toggles filter which node types are visible.

The **View** menu also has a **Lock editing** toggle that applies to both views. In the structured map, drag the grip handle at the start of a chip to re-order rows within its sibling group (or focus the handle and use the arrow keys), and use the header undo/redo buttons (or `Cmd+Z` / `Shift+Cmd+Z`) to step through changes.

## Tech stack

- [Vite](https://vitejs.dev/) + TypeScript
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [React Flow](https://reactflow.dev/) for the canvas
- [Supabase](https://supabase.com/) for auth and project persistence

## Backend

Database schema lives in `supabase/migrations`. The Supabase client and generated types are in `src/integrations/supabase`. To point the app at your own Supabase project, update the project URL and publishable (anon) key in `src/integrations/supabase/client.ts` and apply the migrations in `supabase/migrations`.

## Project structure

```
src/
  components/          Feature components (canvas, dock, panels, version history)
  components/ui/       shadcn/ui primitives
  hooks/               Auth, persistence, and toast hooks
  integrations/        Supabase client and generated database types
  lib/                 Utilities and initial canvas data
  pages/               Route-level pages (app, auth, shared projects)
  types/               Shared TypeScript types
public/                Static assets (favicon, robots.txt)
supabase/              Local Supabase config and migrations
```

## Deployment

`npm run build` produces a static bundle in `dist/` that can be served by any static host (Netlify, Vercel, Cloudflare Pages, S3 + CDN, etc.). The app uses client-side routing, so configure the host to rewrite unknown paths to `index.html`.
