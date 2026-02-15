// Copyright 2025 #1 Future — Apache 2.0 License

import initSqlJs, { type Database } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export async function initDatabase(dbPath: string): Promise<Database> {
  const SQL = await initSqlJs();

  // Ensure directory exists
  mkdirSync(dirname(dbPath), { recursive: true });

  let db: Database;
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      conversation_id TEXT REFERENCES conversations(id),
      tier TEXT NOT NULL CHECK (tier IN ('green', 'yellow', 'red')),
      description TEXT NOT NULL,
      command TEXT NOT NULL,
      module TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'denied', 'executed', 'failed')),
      result TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS security_scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      score INTEGER NOT NULL,
      issues TEXT NOT NULL,
      scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'other',
      brand TEXT,
      model_number TEXT,
      serial_number TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      condition TEXT NOT NULL DEFAULT 'good',
      location TEXT,
      location_detail TEXT,
      width REAL,
      height REAL,
      depth REAL,
      weight REAL,
      purchase_price REAL,
      purchase_store TEXT,
      acquired_date TEXT,
      warranty_expires TEXT,
      parent_id TEXT REFERENCES items(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'owned',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS item_tags (
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      tag TEXT NOT NULL COLLATE NOCASE,
      PRIMARY KEY (item_id, tag)
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'fact',
      importance REAL NOT NULL DEFAULT 0.5,
      embedding TEXT,
      source TEXT NOT NULL DEFAULT 'conversation',
      source_id TEXT,
      last_accessed TEXT,
      access_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      domain TEXT NOT NULL,
      installed INTEGER NOT NULL DEFAULT 0,
      version TEXT,
      path TEXT,
      install_method TEXT,
      last_checked TEXT DEFAULT (datetime('now')),
      capabilities TEXT DEFAULT '[]',
      install_command TEXT
    );

    CREATE TABLE IF NOT EXISTS tool_operations_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_id TEXT REFERENCES actions(id),
      tool_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      params TEXT,
      success INTEGER NOT NULL,
      output TEXT,
      error TEXT,
      duration INTEGER NOT NULL,
      executed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS summaries (
      id TEXT PRIMARY KEY,
      url_hash TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      content_type TEXT NOT NULL,
      extracted_text TEXT,
      summary TEXT,
      summary_length TEXT,
      provider TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
  `);

  // Create indexes (IF NOT EXISTS is implied by catching errors)
  try {
    db.run("CREATE INDEX idx_messages_conversation ON messages(conversation_id)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_actions_status ON actions(status)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_actions_conversation ON actions(conversation_id)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_items_category ON items(category)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_items_location ON items(location)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_items_status ON items(status)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_items_parent ON items(parent_id)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_items_warranty ON items(warranty_expires)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_item_tags_tag ON item_tags(tag)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_memories_category ON memories(category)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_memories_source ON memories(source)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_memories_importance ON memories(importance)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_tools_domain ON tools(domain)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_tools_installed ON tools(installed)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_tool_ops_log_tool ON tool_operations_log(tool_id)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_tool_ops_log_domain ON tool_operations_log(domain)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_summaries_url_hash ON summaries(url_hash)");
  } catch {
    // Index already exists
  }
  try {
    db.run("CREATE INDEX idx_summaries_expires_at ON summaries(expires_at)");
  } catch {
    // Index already exists
  }

  return db;
}

export function saveDatabase(db: Database, dbPath: string): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}
