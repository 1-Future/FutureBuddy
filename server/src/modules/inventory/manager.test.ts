import { describe, it, expect, beforeEach, afterEach } from "vitest";
import initSqlJs, { type Database } from "sql.js";
import {
  createItem,
  getItem,
  searchItems,
  updateItem,
  deleteItem,
  addTags,
  removeTags,
  getSummary,
} from "./manager.js";

// Use a real in-memory database — sql.js works natively in tests
let db: Database;

beforeEach(async () => {
  // initDatabase creates tables, but expects a file path for disk persistence.
  // We need to create an in-memory DB with the same schema.
  const SQL = await initSqlJs();
  db = new SQL.Database();

  // Run the same schema creation as initDatabase
  db.run(`
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
  `);
});

afterEach(() => {
  db.close();
});

describe("createItem", () => {
  it("creates an item with minimal data", () => {
    const item = createItem(db, { name: "Test Item" });

    expect(item.id).toBeDefined();
    expect(item.name).toBe("Test Item");
    expect(item.category).toBe("other");
    expect(item.quantity).toBe(1);
    expect(item.condition).toBe("good");
    expect(item.status).toBe("owned");
    expect(item.createdAt).toBeDefined();
    expect(item.updatedAt).toBeDefined();
  });

  it("creates an item with all fields", () => {
    const item = createItem(db, {
      name: "Ryzen 9 9950X",
      description: "16-core CPU",
      category: "computers",
      brand: "AMD",
      modelNumber: "100-100001277WOF",
      serialNumber: "SN123",
      quantity: 1,
      condition: "new",
      location: "Office",
      locationDetail: "Inside main PC",
      width: 1.6,
      height: 0.8,
      depth: 1.6,
      weight: 0.15,
      purchasePrice: 549.0,
      purchaseStore: "Micro Center",
      acquiredDate: "2025-01-15",
      warrantyExpires: "2028-01-15",
      status: "owned",
      notes: "Beast of a CPU",
      tags: ["daily-driver", "pc-build"],
    });

    expect(item.name).toBe("Ryzen 9 9950X");
    expect(item.category).toBe("computers");
    expect(item.brand).toBe("AMD");
    expect(item.modelNumber).toBe("100-100001277WOF");
    expect(item.serialNumber).toBe("SN123");
    expect(item.width).toBe(1.6);
    expect(item.height).toBe(0.8);
    expect(item.depth).toBe(1.6);
    expect(item.weight).toBe(0.15);
    expect(item.purchasePrice).toBe(549.0);
    expect(item.purchaseStore).toBe("Micro Center");
    expect(item.tags).toEqual(["daily-driver", "pc-build"]);
  });
});

describe("getItem", () => {
  it("returns undefined for non-existent item", () => {
    expect(getItem(db, "nope")).toBeUndefined();
  });

  it("includes tags and children", () => {
    const parent = createItem(db, { name: "Gaming PC", category: "computers" });
    addTags(db, parent.id, ["pc-build"]);
    createItem(db, { name: "RTX 3070 Ti", category: "computers", parentId: parent.id });

    const fetched = getItem(db, parent.id)!;
    expect(fetched.tags).toEqual(["pc-build"]);
    expect(fetched.children).toHaveLength(1);
    expect(fetched.children![0].name).toBe("RTX 3070 Ti");
  });
});

describe("searchItems", () => {
  beforeEach(() => {
    createItem(db, { name: "Monitor", category: "peripherals", location: "Office", purchasePrice: 300 });
    createItem(db, { name: "Keyboard", category: "peripherals", location: "Office", purchasePrice: 150 });
    createItem(db, { name: "Drill", category: "tools", location: "Garage", purchasePrice: 80 });
  });

  it("returns all items with no params", () => {
    const items = searchItems(db, {});
    expect(items).toHaveLength(3);
  });

  it("filters by category", () => {
    const items = searchItems(db, { category: "peripherals" });
    expect(items).toHaveLength(2);
  });

  it("filters by location", () => {
    const items = searchItems(db, { location: "Garage" });
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Drill");
  });

  it("searches by query across name/description/brand/notes", () => {
    const items = searchItems(db, { query: "Monitor" });
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Monitor");
  });

  it("filters by price range", () => {
    const items = searchItems(db, { minPrice: 100, maxPrice: 200 });
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Keyboard");
  });

  it("filters by tag", () => {
    const all = searchItems(db, {});
    addTags(db, all.find((i) => i.name === "Monitor")!.id, ["daily-use"]);

    const items = searchItems(db, { tag: "daily-use" });
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Monitor");
  });

  it("filters by status", () => {
    const all = searchItems(db, {});
    updateItem(db, all.find((i) => i.name === "Drill")!.id, { status: "lent" });

    const items = searchItems(db, { status: "lent" });
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Drill");
  });

  it("filters by parentId = null (top-level items only)", () => {
    const all = searchItems(db, {});
    createItem(db, { name: "Drill Bit", category: "tools", parentId: all.find((i) => i.name === "Drill")!.id });

    const topLevel = searchItems(db, { parentId: null });
    expect(topLevel).toHaveLength(3);
    expect(topLevel.every((i) => !i.parentId)).toBe(true);
  });
});

describe("updateItem", () => {
  it("updates fields on an existing item", () => {
    const item = createItem(db, { name: "Old Name", category: "other" });
    const updated = updateItem(db, item.id, { name: "New Name", category: "electronics" });

    expect(updated!.name).toBe("New Name");
    expect(updated!.category).toBe("electronics");
  });

  it("returns undefined for non-existent item", () => {
    expect(updateItem(db, "nope", { name: "X" })).toBeUndefined();
  });

  it("updates size fields", () => {
    const item = createItem(db, { name: "Box" });
    const updated = updateItem(db, item.id, { width: 12, height: 8, depth: 6, weight: 2.5 });

    expect(updated!.width).toBe(12);
    expect(updated!.height).toBe(8);
    expect(updated!.depth).toBe(6);
    expect(updated!.weight).toBe(2.5);
  });

  it("returns unchanged item if no updates provided", () => {
    const item = createItem(db, { name: "Stable" });
    const same = updateItem(db, item.id, {});
    expect(same!.name).toBe("Stable");
  });
});

describe("deleteItem", () => {
  it("deletes an existing item and its tags", () => {
    const item = createItem(db, { name: "Doomed", tags: ["rip"] });
    expect(deleteItem(db, item.id)).toBe(true);
    expect(getItem(db, item.id)).toBeUndefined();
  });

  it("returns false for non-existent item", () => {
    expect(deleteItem(db, "nope")).toBe(false);
  });
});

describe("tags", () => {
  it("adds and removes tags", () => {
    const item = createItem(db, { name: "Tagged Item" });
    addTags(db, item.id, ["alpha", "beta"]);

    let fetched = getItem(db, item.id)!;
    expect(fetched.tags).toContain("alpha");
    expect(fetched.tags).toContain("beta");

    removeTags(db, item.id, ["alpha"]);
    fetched = getItem(db, item.id)!;
    expect(fetched.tags).toEqual(["beta"]);
  });

  it("handles duplicate tag gracefully", () => {
    const item = createItem(db, { name: "Dup" });
    addTags(db, item.id, ["same"]);
    addTags(db, item.id, ["same"]); // should not throw
    const fetched = getItem(db, item.id)!;
    expect(fetched.tags).toEqual(["same"]);
  });

  it("trims and lowercases tags", () => {
    const item = createItem(db, { name: "Case" });
    addTags(db, item.id, ["  MixedCase  "]);
    const fetched = getItem(db, item.id)!;
    expect(fetched.tags).toEqual(["mixedcase"]);
  });

  it("ignores empty tags", () => {
    const item = createItem(db, { name: "Empty" });
    addTags(db, item.id, ["", "  ", "valid"]);
    const fetched = getItem(db, item.id)!;
    expect(fetched.tags).toEqual(["valid"]);
  });
});

describe("getSummary", () => {
  it("returns zeros for empty inventory", () => {
    const summary = getSummary(db);
    expect(summary.totalItems).toBe(0);
    expect(summary.totalQuantity).toBe(0);
    expect(summary.totalValue).toBe(0);
    expect(summary.byCategory).toEqual({});
    expect(summary.byLocation).toEqual({});
  });

  it("aggregates correctly", () => {
    createItem(db, { name: "Monitor", category: "peripherals", location: "Office", purchasePrice: 300, quantity: 2 });
    createItem(db, { name: "Keyboard", category: "peripherals", location: "Office", purchasePrice: 150 });
    createItem(db, { name: "Drill", category: "tools", location: "Garage", purchasePrice: 80 });

    const summary = getSummary(db);
    expect(summary.totalItems).toBe(3);
    expect(summary.totalQuantity).toBe(4); // 2 + 1 + 1
    expect(summary.totalValue).toBe(830); // (300*2) + (150*1) + (80*1)
    expect(summary.byCategory.peripherals.count).toBe(2);
    expect(summary.byCategory.peripherals.value).toBe(750);
    expect(summary.byCategory.tools.count).toBe(1);
    expect(summary.byLocation.Office).toBe(2);
    expect(summary.byLocation.Garage).toBe(1);
  });
});

describe("parent-child relationships", () => {
  it("sets parent and retrieves children", () => {
    const pc = createItem(db, { name: "Gaming PC", category: "computers" });
    const gpu = createItem(db, { name: "RTX 3070 Ti", category: "computers", parentId: pc.id });
    createItem(db, { name: "Ryzen 9 9950X", category: "computers", parentId: pc.id });

    const parent = getItem(db, pc.id)!;
    expect(parent.children).toHaveLength(2);
    expect(parent.children!.map((c) => c.name).sort()).toEqual(["RTX 3070 Ti", "Ryzen 9 9950X"]);

    const child = getItem(db, gpu.id)!;
    expect(child.parentId).toBe(pc.id);
  });

  it("nullifies parent_id when parent is deleted", () => {
    const pc = createItem(db, { name: "PC", category: "computers" });
    const gpu = createItem(db, { name: "GPU", category: "computers", parentId: pc.id });

    deleteItem(db, pc.id);
    const orphan = getItem(db, gpu.id)!;
    expect(orphan.parentId).toBeUndefined();
  });
});
