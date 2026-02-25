// Copyright 2025 #1 Future — Apache 2.0 License

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/public/Landing.js";
import "./styles.css";

const isShowcase = !import.meta.env.VITE_APP_MODE;

// Showcase mode: static site on futurebuddy.ai — landing page only.
// App mode (VITE_APP_MODE=app): full app with backend routes.
async function renderApp() {
  if (isShowcase) {
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <BrowserRouter>
          <Routes>
            <Route index element={<LandingPage />} />
            <Route path="landing" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </StrictMode>,
    );
    return;
  }

  // Lazy-load the full app bundle only when running with a backend
  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { Layout } = await import("./components/Layout.js");
  const { ChatPage } = await import("./pages/Chat.js");
  const { TerminalPage } = await import("./pages/Terminal.js");
  const { FilesPage } = await import("./pages/Files.js");
  const { ActionsPage } = await import("./pages/Actions.js");
  const { InventoryPage } = await import("./pages/Inventory.js");
  const { MemoryPage } = await import("./pages/Memory.js");
  const { SessionsPage } = await import("./pages/Sessions.js");
  const { SettingsPage } = await import("./pages/Settings.js");
  const { BookmarksPage } = await import("./pages/Bookmarks.js");
  const { ModelsPage } = await import("./pages/Models.js");
  const { AutoTubePage } = await import("./pages/AutoTube.js");
  const { IdeasPage } = await import("./pages/Ideas.js");

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="landing" element={<LandingPage />} />
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/chat" replace />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="terminal" element={<TerminalPage />} />
              <Route path="files" element={<FilesPage />} />
              <Route path="actions" element={<ActionsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="memory" element={<MemoryPage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="bookmarks" element={<BookmarksPage />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="ideas" element={<IdeasPage />} />
              <Route path="autotube" element={<AutoTubePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

renderApp();
