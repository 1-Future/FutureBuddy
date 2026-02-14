// Copyright 2025 #1 Future — Apache 2.0 License

export const APP_NAME = "FutureBuddy";
export const COMPANY_NAME = "#1 Future";
export const SLOGAN = "Your 24/7 IT Department";
export const VERSION = "0.1.0";

export const DEFAULT_PORT = 3000;
export const DEFAULT_HOST = "0.0.0.0";

export const WS_PATH = "/ws";

export const ACTION_TIERS = {
  green: {
    label: "Safe",
    description: "Auto-executes. Read-only or low-risk operations.",
    requiresApproval: false,
  },
  yellow: {
    label: "Caution",
    description: "Executes with notification. Moderate system changes.",
    requiresApproval: false,
  },
  red: {
    label: "Dangerous",
    description: "Requires explicit approval. High-impact changes.",
    requiresApproval: true,
  },
} as const;

export const AI_PROVIDERS = {
  ollama: {
    name: "Ollama",
    description: "Local, free, private",
    defaultModel: "llama3.2",
    defaultBaseUrl: "http://localhost:11434",
  },
  claude: {
    name: "Claude",
    description: "Anthropic — power tasks",
    defaultModel: "claude-sonnet-4-5-20250929",
  },
  openai: {
    name: "OpenAI",
    description: "GPT models — fallback",
    defaultModel: "gpt-4o",
  },
  gemini: {
    name: "Gemini",
    description: "Google AI — fallback",
    defaultModel: "gemini-2.0-flash",
  },
} as const;

// ── Memory ─────────────────────────────────────────────────────────

export const MEMORY_CATEGORIES = {
  fact: { label: "Fact", description: "Something true about the user or their world" },
  preference: { label: "Preference", description: "Something the user likes, dislikes, or prefers" },
  event: { label: "Event", description: "Something that happened" },
  skill: { label: "Skill", description: "Something the user knows how to do" },
  relationship: { label: "Relationship", description: "A person, pet, or entity the user cares about" },
  context: { label: "Context", description: "Background information for better responses" },
} as const;

// ── Inventory ──────────────────────────────────────────────────────

export const ITEM_CATEGORIES = {
  electronics: { label: "Electronics" },
  computers: { label: "Computers & Components" },
  peripherals: { label: "Peripherals" },
  networking: { label: "Networking" },
  audio_video: { label: "Audio & Video" },
  cables: { label: "Cables & Adapters" },
  furniture: { label: "Furniture" },
  appliances: { label: "Appliances" },
  tools: { label: "Tools" },
  kitchen: { label: "Kitchen" },
  clothing: { label: "Clothing" },
  books_media: { label: "Books & Media" },
  office: { label: "Office Supplies" },
  outdoor: { label: "Outdoor & Garden" },
  sports: { label: "Sports & Fitness" },
  vehicles: { label: "Vehicles & Auto" },
  medical: { label: "Medical & Health" },
  games: { label: "Toys & Games" },
  storage: { label: "Storage & Organization" },
  cleaning: { label: "Cleaning" },
  pet: { label: "Pet Supplies" },
  other: { label: "Other" },
} as const;

export const ITEM_CONDITIONS = {
  new: { label: "New" },
  like_new: { label: "Like New" },
  good: { label: "Good" },
  fair: { label: "Fair" },
  poor: { label: "Poor" },
  broken: { label: "Broken" },
  for_parts: { label: "For Parts" },
} as const;

export const ITEM_STATUSES = {
  owned: { label: "Owned" },
  lent: { label: "Lent Out" },
  stored: { label: "In Storage" },
  listed: { label: "Listed for Sale" },
  sold: { label: "Sold" },
  donated: { label: "Donated" },
  trashed: { label: "Trashed" },
  lost: { label: "Lost" },
} as const;
