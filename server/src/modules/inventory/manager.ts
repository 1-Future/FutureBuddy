// Copyright 2025 #1 Future — Apache 2.0 License

import type { Database } from "sql.js";
import type { InventoryItem, InventorySearchParams, InventorySummary, ItemCondition, ItemStatus } from "@futurebuddy/shared";
import { queryAll, queryOne, execute } from "../../db/index.js";
import { randomUUID } from "node:crypto";

export interface CreateItemData {
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  quantity?: number;
  condition?: ItemCondition;
  location?: string;
  locationDetail?: string;
  width?: number;
  height?: number;
  depth?: number;
  weight?: number;
  purchasePrice?: number;
  purchaseStore?: string;
  acquiredDate?: string;
  warrantyExpires?: string;
  parentId?: string;
  status?: ItemStatus;
  notes?: string;
  tags?: string[];
}

export type UpdateItemData = Partial<Omit<CreateItemData, "tags">>;

function rowToItem(row: any): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    category: row.category,
    brand: row.brand || undefined,
    modelNumber: row.model_number || undefined,
    serialNumber: row.serial_number || undefined,
    quantity: row.quantity,
    condition: row.condition as ItemCondition,
    location: row.location || undefined,
    locationDetail: row.location_detail || undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    depth: row.depth ?? undefined,
    weight: row.weight ?? undefined,
    purchasePrice: row.purchase_price ?? undefined,
    purchaseStore: row.purchase_store || undefined,
    acquiredDate: row.acquired_date || undefined,
    warrantyExpires: row.warranty_expires || undefined,
    parentId: row.parent_id || undefined,
    status: row.status as ItemStatus,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createItem(db: Database, data: CreateItemData): InventoryItem {
  const id = randomUUID();
  const now = new Date().toISOString();

  execute(
    db,
    `INSERT INTO items (
      id, name, description, category, brand, model_number, serial_number,
      quantity, condition, location, location_detail,
      width, height, depth, weight,
      purchase_price, purchase_store, acquired_date, warranty_expires,
      parent_id, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.description ?? null,
      data.category ?? "other",
      data.brand ?? null,
      data.modelNumber ?? null,
      data.serialNumber ?? null,
      data.quantity ?? 1,
      data.condition ?? "good",
      data.location ?? null,
      data.locationDetail ?? null,
      data.width ?? null,
      data.height ?? null,
      data.depth ?? null,
      data.weight ?? null,
      data.purchasePrice ?? null,
      data.purchaseStore ?? null,
      data.acquiredDate ?? null,
      data.warrantyExpires ?? null,
      data.parentId ?? null,
      data.status ?? "owned",
      data.notes ?? null,
      now,
      now,
    ],
  );

  if (data.tags && data.tags.length > 0) {
    addTags(db, id, data.tags);
  }

  return getItem(db, id)!;
}

export function getItem(db: Database, id: string): InventoryItem | undefined {
  const row = queryOne(db, "SELECT * FROM items WHERE id = ?", [id]);
  if (!row) return undefined;

  const item = rowToItem(row);
  item.tags = queryAll(db, "SELECT tag FROM item_tags WHERE item_id = ?", [id]).map((r: any) => r.tag);
  item.children = queryAll(db, "SELECT * FROM items WHERE parent_id = ?", [id]).map(rowToItem);

  return item;
}

export function searchItems(db: Database, params: InventorySearchParams): InventoryItem[] {
  const conditions: string[] = [];
  const values: any[] = [];

  if (params.query) {
    conditions.push("(i.name LIKE ? OR i.description LIKE ? OR i.brand LIKE ? OR i.notes LIKE ?)");
    const like = `%${params.query}%`;
    values.push(like, like, like, like);
  }

  if (params.category) {
    conditions.push("i.category = ?");
    values.push(params.category);
  }

  if (params.location) {
    conditions.push("i.location = ?");
    values.push(params.location);
  }

  if (params.status) {
    conditions.push("i.status = ?");
    values.push(params.status);
  }

  if (params.parentId !== undefined) {
    if (params.parentId === null) {
      conditions.push("i.parent_id IS NULL");
    } else {
      conditions.push("i.parent_id = ?");
      values.push(params.parentId);
    }
  }

  if (params.minPrice !== undefined) {
    conditions.push("i.purchase_price >= ?");
    values.push(params.minPrice);
  }

  if (params.maxPrice !== undefined) {
    conditions.push("i.purchase_price <= ?");
    values.push(params.maxPrice);
  }

  let sql: string;

  if (params.tag) {
    sql = `SELECT DISTINCT i.* FROM items i
      JOIN item_tags t ON t.item_id = i.id
      WHERE t.tag = ?`;
    values.unshift(params.tag);
    if (conditions.length > 0) {
      sql += " AND " + conditions.join(" AND ");
    }
  } else {
    sql = "SELECT i.* FROM items i";
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
  }

  sql += " ORDER BY i.updated_at DESC";

  const rows = queryAll(db, sql, values);
  return rows.map((row: any) => {
    const item = rowToItem(row);
    item.tags = queryAll(db, "SELECT tag FROM item_tags WHERE item_id = ?", [item.id]).map((r: any) => r.tag);
    return item;
  });
}

export function updateItem(db: Database, id: string, updates: UpdateItemData): InventoryItem | undefined {
  const existing = queryOne(db, "SELECT id FROM items WHERE id = ?", [id]);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: any[] = [];

  const map: Record<string, string> = {
    name: "name",
    description: "description",
    category: "category",
    brand: "brand",
    modelNumber: "model_number",
    serialNumber: "serial_number",
    quantity: "quantity",
    condition: "condition",
    location: "location",
    locationDetail: "location_detail",
    width: "width",
    height: "height",
    depth: "depth",
    weight: "weight",
    purchasePrice: "purchase_price",
    purchaseStore: "purchase_store",
    acquiredDate: "acquired_date",
    warrantyExpires: "warranty_expires",
    parentId: "parent_id",
    status: "status",
    notes: "notes",
  };

  for (const [key, column] of Object.entries(map)) {
    if (key in updates) {
      fields.push(`${column} = ?`);
      values.push((updates as any)[key] ?? null);
    }
  }

  if (fields.length === 0) return getItem(db, id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  execute(db, `UPDATE items SET ${fields.join(", ")} WHERE id = ?`, values);

  return getItem(db, id);
}

export function deleteItem(db: Database, id: string): boolean {
  const existing = queryOne(db, "SELECT id FROM items WHERE id = ?", [id]);
  if (!existing) return false;

  // Nullify parent references (FK ON DELETE SET NULL doesn't fire without PRAGMA foreign_keys)
  execute(db, "UPDATE items SET parent_id = NULL WHERE parent_id = ?", [id]);
  execute(db, "DELETE FROM item_tags WHERE item_id = ?", [id]);
  execute(db, "DELETE FROM items WHERE id = ?", [id]);
  return true;
}

export function addTags(db: Database, itemId: string, tags: string[]): void {
  for (const tag of tags) {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) continue;
    try {
      execute(db, "INSERT INTO item_tags (item_id, tag) VALUES (?, ?)", [itemId, trimmed]);
    } catch {
      // Tag already exists for this item — ignore
    }
  }
}

export function removeTags(db: Database, itemId: string, tags: string[]): void {
  for (const tag of tags) {
    execute(db, "DELETE FROM item_tags WHERE item_id = ? AND tag = ?", [itemId, tag.trim().toLowerCase()]);
  }
}

export function getSummary(db: Database): InventorySummary {
  const totals = queryOne(
    db,
    "SELECT COUNT(*) as total_items, COALESCE(SUM(quantity), 0) as total_quantity, COALESCE(SUM(purchase_price * quantity), 0) as total_value FROM items",
  );

  const catRows = queryAll(
    db,
    "SELECT category, COUNT(*) as count, COALESCE(SUM(purchase_price * quantity), 0) as value FROM items GROUP BY category",
  );

  const byCategory: Record<string, { count: number; value: number }> = {};
  for (const row of catRows) {
    byCategory[row.category] = { count: row.count, value: row.value };
  }

  const locRows = queryAll(
    db,
    "SELECT COALESCE(location, 'Unspecified') as loc, COUNT(*) as count FROM items GROUP BY location",
  );

  const byLocation: Record<string, number> = {};
  for (const row of locRows) {
    byLocation[row.loc] = row.count;
  }

  return {
    totalItems: totals?.total_items ?? 0,
    totalQuantity: totals?.total_quantity ?? 0,
    totalValue: totals?.total_value ?? 0,
    byCategory,
    byLocation,
  };
}
