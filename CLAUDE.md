# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Idly is a Windows desktop productivity tracker built with Electron + React + TypeScript. It monitors active window usage, categorizes activities into skills, and provides gamification (XP, levels, streaks, achievements). Social features (friends, chat, leaderboard) are powered by Supabase. Optional AI session analysis via DeepSeek.

## Commands

```bash
# Development
npm run electron:dev          # Full Electron dev mode (Vite HMR + Electron)
npm run dev                   # Renderer only (browser at localhost:5173)
npm run build:electron        # Compile main + preload TypeScript only

# Build
npm run build                 # Full build (TS compile + Vite bundle)
npm run electron:build        # Package into Windows installer (.exe)

# Tests (Vitest)
npm run test                  # Run all tests once
npm run test:watch            # Watch mode
npx vitest run src/tests/xp.test.ts   # Run a single test file
```

## Architecture

### Three-Process Electron Model

- **Main process** (`src/main/`, CommonJS via `tsconfig.main.json`) — app lifecycle, tray, SQLite database, PowerShell activity tracker subprocess, IPC handlers, auto-updater
- **Preload** (`src/preload/`, CommonJS via `tsconfig.preload.json`) — context bridge exposing `window.electronAPI` to renderer
- **Renderer** (`src/renderer/`, ESNext via `tsconfig.json`) — React SPA bundled by Vite

Each process has its own tsconfig. Main/preload compile to CommonJS (`dist/main/`, `dist/preload/`), renderer bundles to `dist/renderer/`.

### IPC Communication

70+ channels defined in `src/shared/ipcChannels.ts`. Handlers registered in `src/main/ipc.ts` with Zod schema validation (`src/main/validation.ts`). Renderer accesses them through `window.electronAPI` exposed by the preload script.

### Activity Tracking

`src/main/tracker.ts` spawns a PowerShell subprocess using Win32 APIs (GetForegroundWindow, GetAsyncKeyState, GetLastInputInfo). Outputs activity data every ~1.5s in format `WIN:ProcessName|Title|KeystrokeCount|IdleMs`. Windows-only.

### Data Storage

- **Local:** SQLite via better-sqlite3 at `%APPDATA%/Idly/idly.sqlite`. Schema managed by numbered migrations in `src/main/migrations/index.ts`. Core tables: sessions, activities, skill_xp, achievements_unlocked, grind_tasks, session_checkpoint.
- **Cloud (optional):** Supabase for auth, profiles, friends, messages, leaderboard. Schema in `supabase/schema.sql`. Skill XP synced from SQLite → Supabase via `src/renderer/services/supabaseSync.ts`.

### State Management

Zustand stores in `src/renderer/stores/`. The central store is `sessionStore.ts` (~630 lines) managing session lifecycle, XP, and achievements. Other stores handle auth, alerts, friends, chat, and notifications.

### Gamification

8 skills (Developer, Designer, Gamer, Communicator, Researcher, Creator, Learner, Listener) defined in `src/renderer/lib/skills.ts`. XP formulas in `src/renderer/lib/xp.ts` — 99 levels per skill with formula `xpForLevel(L) = floor(pow(L/99, 2.2) * 3_600_000)`. Activity categories map to skills via `skillXPService.ts`. Achievements checked in `achievementService.ts`.

### UI Structure

Tab-based navigation (Home, Skills, Stats, Profile, Friends, Settings) routed in `App.tsx`. Tailwind CSS with Discord-inspired dark theme defined in `tailwind.config.js`. Animations via Framer Motion.

## Environment Variables

Copy `.env.example` to `.env`. Supabase keys are optional (social features disabled without them). `VITE_`-prefixed vars are baked into renderer at build time.

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — renderer Supabase client
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — main process Supabase access
- `DEEPSEEK_API_KEY` — optional AI analysis
