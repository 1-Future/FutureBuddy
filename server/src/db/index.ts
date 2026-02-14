// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import { initDatabase, saveDatabase } from "./schema.js";

let db: Database | null = null;
let dbPath: string = "";
let saveInterval: ReturnType<typeof setInterval> | null = null;

export async function getDb(path: string): Promise<Database> {
  if (!db) {
    dbPath = path;
    db = await initDatabase(path);

    // Auto-save every 30 seconds
    saveInterval = setInterval(() => {
      if (db) saveDatabase(db, dbPath);
    }, 30_000);
  }
  return db;
}

export function closeDb(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  if (db) {
    saveDatabase(db, dbPath);
    db.close();
    db = null;
  }
}

// Helper to run a query and return rows as objects
export function queryAll(database: Database, sql: string, params: any[] = []): any[] {
  const stmt = database.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper to run a single row query
export function queryOne(database: Database, sql: string, params: any[] = []): any | undefined {
  const results = queryAll(database, sql, params);
  return results[0];
}

// Helper to run an INSERT/UPDATE/DELETE
export function execute(database: Database, sql: string, params: any[] = []): void {
  database.run(sql, params);
}

export { initDatabase, saveDatabase };
