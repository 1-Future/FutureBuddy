# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FutureBuddy - "Your 24/7 IT Department" by #1 Future. AI-powered IT assistant that manages your PC from your phone. Apache 2.0, free and open source.

## Development Process — FutureFlow

FutureBuddy is built using FutureFlow, an AI-native development methodology. See `FutureFlow.md` for the full process and user manual.

**When a user presents a new feature idea or requests building something new:**

1. **Do not start writing code immediately.** Follow FutureFlow first.
2. Run through the steps in order: Gut Check → Explore → Pain Point Discovery → Research → Plan
3. **Gate rule**: No code is written until a GitHub Issue exists with the approved plan and task list (Step 7)
4. Create the GitHub Issue with a complete master task list before any implementation begins
5. Execute against the task list, checking off items as they complete
6. Write a user manual as the final step (Step 11) before considering the feature done

**What this looks like in practice:**
- User says "add X" → Claude does Steps 2–6, presents plan for approval, creates GitHub Issue, then executes
- User approves the plan → Claude creates the GitHub Issue (Step 7) before writing any code
- Feature is marked complete → Claude writes the user manual (Step 11)

**Skip FutureFlow only if:**
- The task is a bug fix, not a new feature
- The user explicitly asks to skip planning
- The change is trivial (typo fix, config change, single-line edit)

For anything that adds user-facing functionality, FutureFlow applies.

## Commands

```bash
# Install all workspace dependencies from monorepo root
npm install

# Development
npm run dev:server          # Server with hot reload (tsx watch)
npm run dev:app             # Expo mobile app (requires Expo Go)

# Building
npm run build:shared        # Must build shared BEFORE server (server depends on it)
npm run build:server        # Compile server TypeScript to dist/

# Running production server
npm start -w server         # Runs compiled dist/index.js

# Individual workspace commands
npm run dev -w server       # Same as dev:server
npm run dev -w app          # Same as dev:app
npm run build -w shared     # Same as build:shared

# Quality
npm run lint                # ESLint (0 errors expected, warnings OK)
npm run lint:fix            # ESLint with auto-fix
npm run format              # Prettier format all files
npm run format:check        # Prettier check (CI-friendly)
npm test                    # Vitest run all tests
npm run test:watch          # Vitest in watch mode
npm run test:coverage       # Vitest with V8 coverage report
```

## Architecture

npm workspaces monorepo with 4 packages. TypeScript strict mode, ES2022 target, Node16 module resolution.

### `shared/` - @futurebuddy/shared

Single source of truth for types and constants. Must be built first (`npm run build:shared`) since server imports from its compiled `dist/`. Exports: `ActionTier`, `Action`, `AIProvider`, `ChatMessage`, `SystemStatus`, `FileEntry`, `TerminalSession`, `WSMessage`, plus app constants like `DEFAULT_PORT` (3000), `WS_PATH` ("/ws"), `ACTION_TIERS`, `AI_PROVIDERS`.

### `server/` - @futurebuddy/server

Fastify 5 API + WebSocket server. ESM (`"type": "module"`). Entry: `src/index.ts`.

**Routes** (`src/routes/`): `chat.ts` (conversation CRUD + AI responses), `files.ts` (directory listing + file read), `system.ts` (system status + security scans + config), `actions.ts` (pending action approval/denial), `terminal.ts` (PTY session management), `ws.ts` (WebSocket for terminal I/O + action responses).

**Modules** (`src/modules/`):

- `ai/` - Multi-provider AI with common interface. `router.ts` selects provider. Implementations: `claude.ts`, `openai.ts`, `ollama.ts`, `gemini.ts`. Each implements `chat()`, `streamChat()`, `isAvailable()`.
- `it-department/` - Core IT functionality. `action-classifier.ts` extracts code blocks from AI responses and classifies them into tiers (green=auto-execute, yellow=notify, red=requires approval). `action-executor.ts` runs approved commands via `child_process.exec()` with 30s timeout. `security-monitor.ts` checks Windows Defender/firewall/accounts. `system-config.ts` has predefined safe PowerShell operations. `file-organizer.ts` sorts files by extension into categories.
- `terminal/pty.ts` - PTY session manager using `node-pty` (optional dep). Spawns PowerShell on Windows.

**Database** (`src/db/`): sql.js (in-memory SQLite persisted to file). Auto-saves every 30s. Tables: `conversations`, `messages`, `actions`, `security_scans`, `settings`. Path configurable via `DB_PATH` env var (default: `./data/futurebuddy.db`).

### `app/` - @futurebuddy/app

React Native + Expo 54 + Expo Router (file-based routing). 5 tab screens in `app/`: Chat (index), Terminal, Files, Actions, Settings. API client in `src/services/api.ts` (all REST calls). WebSocket client in `src/services/websocket.ts` (auto-reconnect, message type routing). Default server URL: `http://192.168.1.93:3000`.

### `web/` - @futurebuddy/web

Placeholder - only has package.json. Planned as Vite + React frontend for futurebuddy.ai.

## Key Design Patterns

**Action Tier System**: AI responses are parsed for code blocks. Commands are regex-classified: green (read-only like `Get-*`, `dir`, `ipconfig`) auto-execute, yellow (installs, config changes) execute with notification, red (destructive like `Remove-*`, `del`, `format`, `regedit`) require explicit user approval.

**AI Provider Abstraction**: All providers implement the same interface. Provider selected via `AI_PROVIDER` env var. Ollama is default for local dev. API keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`.

**Real-time**: WebSocket at `/ws` handles terminal I/O streaming and action approval responses. REST for everything else.

## Environment

Copy `.env.example` to `.env`. Key variables: `PORT`, `HOST`, `AI_PROVIDER`, `AI_MODEL`, `OLLAMA_BASE_URL`, and API keys for cloud providers. Requires Node.js 20+. Full IT Department features are Windows-specific (PowerShell commands).
