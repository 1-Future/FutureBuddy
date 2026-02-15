// Copyright 2025 #1 Future — Apache 2.0 License

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout.js";
import { LandingPage } from "./pages/public/Landing.js";
import { ChatPage } from "./pages/Chat.js";
import { TerminalPage } from "./pages/Terminal.js";
import { FilesPage } from "./pages/Files.js";
import { ActionsPage } from "./pages/Actions.js";
import { InventoryPage } from "./pages/Inventory.js";
import { MemoryPage } from "./pages/Memory.js";
import { SessionsPage } from "./pages/Sessions.js";
import { SettingsPage } from "./pages/Settings.js";
import { BookmarksPage } from "./pages/Bookmarks.js";
import { ModelsPage } from "./pages/Models.js";
import { AutoTubePage } from "./pages/AutoTube.js";
import { IdeasPage } from "./pages/Ideas.js";
import "./styles.css";

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
