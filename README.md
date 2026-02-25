# FutureBuddy

<div align="center">

**Your 24/7 AI-powered IT Department — on every device you own.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React_Native-Expo-61DAFB?style=flat-square&logo=react&logoColor=black)](https://expo.dev/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-Apache_2.0-green?style=flat-square)](LICENSE)

[futurebuddy.ai](https://futurebuddy.ai) · [Quick Start](#quick-start) · [Architecture](#architecture)

</div>

---

FutureBuddy is an open-source AI assistant that acts as a full IT department for your personal setup. It handles system configuration, security, and automation — and lets you control your PC from your phone via a companion app.

## Features

- **🖥️ IT Department** — Sets up, configures, secures, and monitors your system automatically.
- **📱 Companion App** — Control your AI-powered PC from your phone. Chat, terminal, file management, voice commands.
- **🎬 Content Pipeline** — Turns your coding sessions into shareable tutorials automatically.
- **🧠 Learning Engine** — Generates quizzes and tracks knowledge from your own work sessions.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Fastify, Node.js, TypeScript, SQLite, WebSockets |
| Mobile | React Native, Expo |
| Web | Vite, React, TypeScript |
| DevOps | Docker, docker-compose, GitHub Actions |
| Testing | Vitest |

## Quick Start

```bash
# Clone
git clone https://github.com/1-Future/FutureBuddy.git && cd FutureBuddy

# Install
npm install && cp .env.example .env

# Run backend
npm run dev:server

# Run mobile app
npm run dev:app
```

### Docker

```bash
docker-compose up
```

## Architecture

```
FutureBuddy/
+-- server/   -- Fastify + WebSocket server (Node.js, TypeScript, SQLite)
+-- app/      -- Companion mobile app (React Native + Expo)
+-- web/      -- futurebuddy.ai frontend (Vite + React)
+-- shared/   -- Shared types and utilities
+-- docs/     -- Documentation
```

## License

Apache 2.0 -- free and open source, forever.

Copyright 2025 [#1 Future](https://futurebuddy.ai).
