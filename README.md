# FutureBuddy

**Your 24/7 IT Department.** By [#1 Future](https://futurebuddy.ai).

FutureBuddy is an AI-powered IT department that lives on every device you own. It handles the tedious stuff so you can focus on what actually matters. Free, open source, and always on.

## What it does

- **IT Department** — Sets up, configures, secures, and manages your system. Your computer finally has an IT guy.
- **Companion App** — Control your AI-powered PC from your phone. Chat, terminal, files, approvals, voice.
- **Content Pipeline** — Turns your coding sessions into shareable tutorials automatically.
- **Learning Engine** — Generates quizzes and tracks your learning from your own work.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm run dev:server

# Start the mobile app (requires Expo Go)
npm run dev:app
```

## Architecture

```
FutureBuddy/
  server/    — Fastify API + WebSocket server (Node.js, TypeScript, SQLite)
  app/       — Companion mobile app (React Native, Expo)
  web/       — futurebuddy.ai frontend (Vite + React)
  shared/    — Shared types and constants
```

## License

Apache 2.0. Free. Open source. Forever.

Copyright 2025 #1 Future.
