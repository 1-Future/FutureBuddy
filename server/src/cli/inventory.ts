#!/usr/bin/env tsx
// Copyright 2025 #1 Future — Apache 2.0 License

import { resolve } from "node:path";
import { ITEM_CATEGORIES } from "@futurebuddy/shared";
import { getDb, closeDb } from "../db/index.js";
import {
  createItem,
  getItem,
  searchItems,
  updateItem,
  deleteItem,
  addTags,
  removeTags,
  getSummary,
  type CreateItemData,
} from "../modules/inventory/manager.js";

const DB_PATH = resolve(process.env.DB_PATH || "./data/futurebuddy.db");

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }
  return flags;
}

function positionalArgs(args: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const next = args[i + 1];
      if (next && !next.startsWith("--")) i++;
      continue;
    }
    result.push(args[i]);
  }
  return result;
}

function printItem(item: any): void {
  console.log(`  ${item.id.slice(0, 8)}  ${item.name}`);
  if (item.brand) console.log(`           Brand: ${item.brand}`);
  console.log(`           Category: ${item.category} | Status: ${item.status} | Condition: ${item.condition}`);
  if (item.location) console.log(`           Location: ${item.location}${item.locationDetail ? ` (${item.locationDetail})` : ""}`);
  if (item.width || item.height || item.depth) {
    const dims = [item.width && `${item.width}"W`, item.height && `${item.height}"H`, item.depth && `${item.depth}"D`]
      .filter(Boolean)
      .join(" x ");
    console.log(`           Size: ${dims}`);
  }
  if (item.weight) console.log(`           Weight: ${item.weight} lbs`);
  if (item.purchasePrice !== undefined) console.log(`           Price: $${item.purchasePrice.toFixed(2)}${item.purchaseStore ? ` from ${item.purchaseStore}` : ""}`);
  if (item.tags && item.tags.length > 0) console.log(`           Tags: ${item.tags.join(", ")}`);
  if (item.quantity > 1) console.log(`           Qty: ${item.quantity}`);
  console.log();
}

const USAGE = `
FutureBuddy Inventory CLI

Usage:
  inventory add <name> [flags]       Add a new item
  inventory list [flags]             List/search items
  inventory search <query>           Full-text search
  inventory show <id>                Show item details
  inventory update <id> [flags]      Update an item
  inventory delete <id>              Delete an item
  inventory tag <id> <tags...>       Add tags to an item
  inventory untag <id> <tags...>     Remove tags from an item
  inventory summary                  Show inventory stats

Flags for add/update:
  --category <cat>       Category (${Object.keys(ITEM_CATEGORIES).join(", ")})
  --brand <brand>        Brand name
  --model <model>        Model number
  --serial <serial>      Serial number
  --qty <n>              Quantity
  --condition <cond>     new, like_new, good, fair, poor, broken, for_parts
  --location <loc>       Location name
  --detail <detail>      Location detail
  --width <inches>       Width in inches
  --height <inches>      Height in inches
  --depth <inches>       Depth in inches
  --weight <lbs>         Weight in pounds
  --price <amount>       Purchase price
  --store <store>        Purchase store
  --date <YYYY-MM-DD>    Acquired date
  --warranty <YYYY-MM-DD> Warranty expiration
  --parent <id>          Parent item ID
  --status <status>      owned, lent, stored, listed, sold, donated, trashed, lost
  --notes <text>         Notes
  --tag <tag1,tag2>      Tags (comma-separated)

Flags for list:
  --category <cat>       Filter by category
  --location <loc>       Filter by location
  --status <status>      Filter by status
  --tag <tag>            Filter by tag
`;

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(USAGE);
    process.exit(0);
  }

  const command = args[0];
  const rest = args.slice(1);
  const flags = parseFlags(rest);
  const positional = positionalArgs(rest);

  const db = await getDb(DB_PATH);

  try {
    switch (command) {
      case "add": {
        const name = positional[0];
        if (!name) {
          console.error("Error: item name is required");
          process.exit(1);
        }
        const data: CreateItemData = { name };
        if (flags.category) data.category = flags.category;
        if (flags.brand) data.brand = flags.brand;
        if (flags.model) data.modelNumber = flags.model;
        if (flags.serial) data.serialNumber = flags.serial;
        if (flags.qty) data.quantity = parseInt(flags.qty, 10);
        if (flags.condition) data.condition = flags.condition as any;
        if (flags.location) data.location = flags.location;
        if (flags.detail) data.locationDetail = flags.detail;
        if (flags.width) data.width = parseFloat(flags.width);
        if (flags.height) data.height = parseFloat(flags.height);
        if (flags.depth) data.depth = parseFloat(flags.depth);
        if (flags.weight) data.weight = parseFloat(flags.weight);
        if (flags.price) data.purchasePrice = parseFloat(flags.price);
        if (flags.store) data.purchaseStore = flags.store;
        if (flags.date) data.acquiredDate = flags.date;
        if (flags.warranty) data.warrantyExpires = flags.warranty;
        if (flags.parent) data.parentId = flags.parent;
        if (flags.status) data.status = flags.status as any;
        if (flags.notes) data.notes = flags.notes;
        if (flags.tag) data.tags = flags.tag.split(",").map((t) => t.trim());

        const item = createItem(db, data);
        console.log("Created:");
        printItem(item);
        break;
      }

      case "list": {
        const items = searchItems(db, {
          category: flags.category,
          location: flags.location,
          status: flags.status as any,
          tag: flags.tag,
        });
        if (items.length === 0) {
          console.log("No items found.");
        } else {
          console.log(`${items.length} item(s):\n`);
          for (const item of items) printItem(item);
        }
        break;
      }

      case "search": {
        const query = positional[0];
        if (!query) {
          console.error("Error: search query is required");
          process.exit(1);
        }
        const items = searchItems(db, { query });
        if (items.length === 0) {
          console.log("No items found.");
        } else {
          console.log(`${items.length} result(s):\n`);
          for (const item of items) printItem(item);
        }
        break;
      }

      case "show": {
        const id = positional[0];
        if (!id) {
          console.error("Error: item ID is required");
          process.exit(1);
        }
        // Support short IDs — search for items starting with the given prefix
        const allItems = searchItems(db, {});
        const match = allItems.find((i) => i.id.startsWith(id));
        if (!match) {
          console.error("Item not found.");
          process.exit(1);
        }
        const item = getItem(db, match.id);
        if (!item) {
          console.error("Item not found.");
          process.exit(1);
        }
        console.log(`\n  ${item.name} (${item.id})`);
        console.log(`  ${"─".repeat(60)}`);
        if (item.description) console.log(`  Description: ${item.description}`);
        console.log(`  Category:    ${item.category}`);
        if (item.brand) console.log(`  Brand:       ${item.brand}`);
        if (item.modelNumber) console.log(`  Model:       ${item.modelNumber}`);
        if (item.serialNumber) console.log(`  Serial:      ${item.serialNumber}`);
        console.log(`  Quantity:    ${item.quantity}`);
        console.log(`  Condition:   ${item.condition}`);
        console.log(`  Status:      ${item.status}`);
        if (item.location) console.log(`  Location:    ${item.location}${item.locationDetail ? ` (${item.locationDetail})` : ""}`);
        if (item.width || item.height || item.depth) {
          const dims = [item.width && `${item.width}"W`, item.height && `${item.height}"H`, item.depth && `${item.depth}"D`]
            .filter(Boolean)
            .join(" x ");
          console.log(`  Size:        ${dims}`);
        }
        if (item.weight) console.log(`  Weight:      ${item.weight} lbs`);
        if (item.purchasePrice !== undefined) console.log(`  Price:       $${item.purchasePrice.toFixed(2)}`);
        if (item.purchaseStore) console.log(`  Store:       ${item.purchaseStore}`);
        if (item.acquiredDate) console.log(`  Acquired:    ${item.acquiredDate}`);
        if (item.warrantyExpires) console.log(`  Warranty:    ${item.warrantyExpires}`);
        if (item.notes) console.log(`  Notes:       ${item.notes}`);
        if (item.tags && item.tags.length > 0) console.log(`  Tags:        ${item.tags.join(", ")}`);
        if (item.children && item.children.length > 0) {
          console.log(`\n  Children (${item.children.length}):`);
          for (const child of item.children) {
            console.log(`    ${child.id.slice(0, 8)}  ${child.name}`);
          }
        }
        console.log(`\n  Created:     ${item.createdAt}`);
        console.log(`  Updated:     ${item.updatedAt}`);
        console.log();
        break;
      }

      case "update": {
        const id = positional[0];
        if (!id) {
          console.error("Error: item ID is required");
          process.exit(1);
        }
        const allItems = searchItems(db, {});
        const match = allItems.find((i) => i.id.startsWith(id));
        if (!match) {
          console.error("Item not found.");
          process.exit(1);
        }
        const updates: Record<string, any> = {};
        if (positional[1]) updates.name = positional[1];
        if (flags.category) updates.category = flags.category;
        if (flags.brand) updates.brand = flags.brand;
        if (flags.model) updates.modelNumber = flags.model;
        if (flags.serial) updates.serialNumber = flags.serial;
        if (flags.qty) updates.quantity = parseInt(flags.qty, 10);
        if (flags.condition) updates.condition = flags.condition;
        if (flags.location) updates.location = flags.location;
        if (flags.detail) updates.locationDetail = flags.detail;
        if (flags.width) updates.width = parseFloat(flags.width);
        if (flags.height) updates.height = parseFloat(flags.height);
        if (flags.depth) updates.depth = parseFloat(flags.depth);
        if (flags.weight) updates.weight = parseFloat(flags.weight);
        if (flags.price) updates.purchasePrice = parseFloat(flags.price);
        if (flags.store) updates.purchaseStore = flags.store;
        if (flags.date) updates.acquiredDate = flags.date;
        if (flags.warranty) updates.warrantyExpires = flags.warranty;
        if (flags.parent) updates.parentId = flags.parent;
        if (flags.status) updates.status = flags.status;
        if (flags.notes) updates.notes = flags.notes;

        const item = updateItem(db, match.id, updates);
        if (!item) {
          console.error("Item not found.");
          process.exit(1);
        }
        console.log("Updated:");
        printItem(item);
        break;
      }

      case "delete": {
        const id = positional[0];
        if (!id) {
          console.error("Error: item ID is required");
          process.exit(1);
        }
        const allItems = searchItems(db, {});
        const match = allItems.find((i) => i.id.startsWith(id));
        if (!match) {
          console.error("Item not found.");
          process.exit(1);
        }
        deleteItem(db, match.id);
        console.log(`Deleted: ${match.name} (${match.id.slice(0, 8)})`);
        break;
      }

      case "tag": {
        const id = positional[0];
        const tags = positional.slice(1);
        if (!id || tags.length === 0) {
          console.error("Error: item ID and at least one tag are required");
          process.exit(1);
        }
        const allItems = searchItems(db, {});
        const match = allItems.find((i) => i.id.startsWith(id));
        if (!match) {
          console.error("Item not found.");
          process.exit(1);
        }
        addTags(db, match.id, tags);
        const item = getItem(db, match.id);
        console.log("Tagged:");
        printItem(item!);
        break;
      }

      case "untag": {
        const id = positional[0];
        const tags = positional.slice(1);
        if (!id || tags.length === 0) {
          console.error("Error: item ID and at least one tag are required");
          process.exit(1);
        }
        const allItems = searchItems(db, {});
        const match = allItems.find((i) => i.id.startsWith(id));
        if (!match) {
          console.error("Item not found.");
          process.exit(1);
        }
        removeTags(db, match.id, tags);
        const item = getItem(db, match.id);
        console.log("Untagged:");
        printItem(item!);
        break;
      }

      case "summary": {
        const summary = getSummary(db);
        console.log("\nInventory Summary");
        console.log("─".repeat(40));
        console.log(`  Items:      ${summary.totalItems}`);
        console.log(`  Quantity:   ${summary.totalQuantity}`);
        console.log(`  Value:      $${summary.totalValue.toFixed(2)}`);

        if (Object.keys(summary.byCategory).length > 0) {
          console.log("\n  By Category:");
          for (const [cat, data] of Object.entries(summary.byCategory)) {
            console.log(`    ${cat.padEnd(20)} ${String(data.count).padStart(4)} items  $${data.value.toFixed(2)}`);
          }
        }

        if (Object.keys(summary.byLocation).length > 0) {
          console.log("\n  By Location:");
          for (const [loc, count] of Object.entries(summary.byLocation)) {
            console.log(`    ${loc.padEnd(20)} ${String(count).padStart(4)} items`);
          }
        }
        console.log();
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log(USAGE);
        process.exit(1);
    }
  } finally {
    closeDb();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
