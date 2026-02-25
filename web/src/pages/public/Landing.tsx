// Copyright 2025 #1 Future — Apache 2.0 License

import {
  MessageSquare,
  Shield,
  Terminal,
  FolderOpen,
  Brain,
  Package,
  Search,
  Bookmark,
  FileText,
  Cpu,
  Video,
  Bell,
  ExternalLink,
  Github,
  ChevronRight,
  ArrowRight,
  Download,
} from "lucide-react";

const GITHUB_URL = "https://github.com/1-Future/FutureBuddy";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "AI Chat",
    description:
      "Talk to your PC like a person. Multi-provider AI with Ollama, Claude, OpenAI, Gemini.",
  },
  {
    icon: Shield,
    title: "Action System",
    description:
      "Green, yellow, red tiers. Safe commands auto-execute, dangerous ones need your approval.",
  },
  {
    icon: Terminal,
    title: "Terminal",
    description:
      "Full PTY terminal from your phone or browser. Real-time WebSocket I/O.",
  },
  {
    icon: FolderOpen,
    title: "File Browser",
    description:
      "Navigate your file system from anywhere. Read, preview, manage.",
  },
  {
    icon: Brain,
    title: "Memory",
    description:
      "FutureBuddy remembers everything. Semantic search across your conversation history.",
  },
  {
    icon: Package,
    title: "Inventory",
    description:
      "Track your belongings, hardware, warranties. Hierarchical with tags.",
  },
  {
    icon: Search,
    title: "Session Search",
    description: "Search and replay your Claude Code sessions.",
  },
  {
    icon: Bookmark,
    title: "Smart Bookmarks",
    description:
      "Auto-extract and categorize URLs from your sessions.",
  },
  {
    icon: FileText,
    title: "Auto-Docs",
    description:
      "AI-generated README and changelogs from your codebase.",
  },
  {
    icon: Cpu,
    title: "Local AI",
    description:
      "Manage Ollama models. Download, benchmark, and switch models.",
  },
  {
    icon: Video,
    title: "AutoTube",
    description:
      "Turn coding sessions into tutorial videos. Privacy scrubber included.",
  },
  {
    icon: Bell,
    title: "Nudge System",
    description:
      "Get nudged to share novel code patterns you build.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="FutureBuddy" className="h-9 w-9" />
            <span className="text-lg font-semibold">FutureBuddy</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
            >
              <Github size={18} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              <Download size={16} />
              Get It Free
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)]/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          {/* Logo */}
          <img src="/logo.png" alt="FutureBuddy" className="mx-auto mb-8 h-28 w-28 sm:h-36 sm:w-36" />

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1.5 text-sm text-[var(--color-text-dim)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-green)]" />
            Open source and free forever
          </div>

          {/* Heading */}
          <h1 className="text-5xl leading-tight font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            Your{" "}
            <span className="bg-gradient-to-r from-[var(--color-accent)] to-[#60a5fa] bg-clip-text text-transparent">
              24/7
            </span>{" "}
            IT Department
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-text-dim)] sm:text-xl">
            FutureBuddy is an AI-powered personal IT assistant. Free, open
            source, privacy-first. Manage your PC from your phone, your
            browser, or anywhere.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-7 py-3.5 text-base font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-lg hover:shadow-[var(--color-accent)]/20"
            >
              Get Started
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-7 py-3.5 text-base font-semibold text-[var(--color-text)] transition-all hover:border-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)]"
            >
              <Github size={18} />
              View on GitHub
              <ExternalLink
                size={14}
                className="text-[var(--color-text-dim)]"
              />
            </a>
          </div>

          {/* Quick start code block */}
          <div className="mx-auto mt-12 max-w-md">
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-[var(--color-red)]/60" />
                <span className="h-3 w-3 rounded-full bg-[var(--color-yellow)]/60" />
                <span className="h-3 w-3 rounded-full bg-[var(--color-green)]/60" />
                <span className="ml-2 text-xs text-[var(--color-text-dim)]">
                  terminal
                </span>
              </div>
              <div className="flex items-center gap-3 px-5 py-4">
                <ChevronRight
                  size={16}
                  className="shrink-0 text-[var(--color-green)]"
                />
                <code className="text-sm font-mono text-[var(--color-text)]">
                  docker compose up
                </code>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--color-text-dim)]">
              That&apos;s it. One command to run your own AI IT department.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--color-border)] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          {/* Section header */}
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-4 text-lg text-[var(--color-text-dim)]">
              A complete IT toolkit that runs on your machine, controlled from
              anywhere. No cloud dependencies, no subscriptions, no data
              harvesting.
            </p>
          </div>

          {/* Grid */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface-hover)]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] transition-colors group-hover:bg-[var(--color-accent)]/20">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-dim)]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="border-t border-[var(--color-border)] py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          {/* License badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--color-green)]/30 bg-[var(--color-green)]/10 px-4 py-1.5 text-sm font-medium text-[var(--color-green)]">
            <Shield size={14} />
            Apache 2.0 License
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free and open source forever
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--color-text-dim)]">
            No vendor lock-in. No telemetry. No strings attached. Your data
            stays on your machine, packaged the way you want it.
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-dim)]">
            By{" "}
            <span className="font-semibold text-[var(--color-text)]">
              #1 Future
            </span>
          </p>

          {/* GitHub stars placeholder */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 transition-all hover:border-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)]"
            >
              <Github size={20} />
              <span className="text-sm font-medium">Star on GitHub</span>
              <span className="rounded-md bg-[var(--color-bg)] px-2 py-0.5 text-xs text-[var(--color-text-dim)]">
                --
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="FutureBuddy" className="h-7 w-7" />
            <span className="text-sm text-[var(--color-text-dim)]">
              FutureBuddy by #1 Future — Apache 2.0 License
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
            >
              <Github size={16} />
              GitHub
            </a>
            <a
              href={`${GITHUB_URL}#readme`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--color-text-dim)] transition-colors hover:text-[var(--color-text)]"
            >
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
