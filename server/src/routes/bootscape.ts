// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";

const BOOTSCAPE_HTML = (gameUrl: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>BootScape — FutureBuddy</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #game-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    #offline-banner {
      display: none;
      position: fixed;
      inset: 0;
      background: #0a0a0a;
      color: #ccc;
      font-family: monospace;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      text-align: center;
      padding: 24px;
    }
    #offline-banner.visible { display: flex; }
    #offline-banner h1 { color: #ffcc00; font-size: 1.6rem; }
    #offline-banner p { font-size: 0.95rem; max-width: 340px; line-height: 1.5; }
    #offline-banner a {
      color: #44aaff;
      text-decoration: none;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <iframe
    id="game-frame"
    src="${gameUrl}"
    allow="accelerometer; gyroscope; autoplay; fullscreen"
    allowfullscreen
  ></iframe>

  <div id="offline-banner">
    <h1>👢 BootScape</h1>
    <p>The BootScape game server is not running yet.</p>
    <p>Start the server at <code>${gameUrl}</code> and refresh.</p>
    <a href="/bootscape/status">Check status</a>
  </div>

  <script>
    const frame = document.getElementById('game-frame');
    const banner = document.getElementById('offline-banner');
    frame.addEventListener('error', () => {
      frame.style.display = 'none';
      banner.classList.add('visible');
    });
  </script>
</body>
</html>`;

export const bootscapeRoutes: FastifyPluginAsync = async (app) => {
  const gameUrl = process.env.BOOTSCAPE_URL ?? "http://localhost:8080";

  // Serve the full-page game embed
  app.get("/", async (_request, reply) => {
    return reply
      .header("Content-Type", "text/html; charset=utf-8")
      .header("Permissions-Policy", "accelerometer=*, gyroscope=*")
      .send(BOOTSCAPE_HTML(gameUrl));
  });

  // Status / health for the module
  app.get("/status", async () => {
    return {
      module: "bootscape",
      gameUrl,
      description: "OSRS private server gated on real-world walking",
    };
  });
};
