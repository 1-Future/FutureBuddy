// Copyright 2025 #1 Future — Apache 2.0 License

import type { FastifyPluginAsync } from "fastify";
import type { InventorySearchParams, ItemStatus } from "@futurebuddy/shared";
import { loadConfig } from "../config.js";
import { getDb } from "../db/index.js";
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
  type UpdateItemData,
} from "../modules/inventory/manager.js";

export const inventoryRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();
  const db = await getDb(config.dbPath);

  // List / search items
  app.get<{
    Querystring: {
      query?: string;
      category?: string;
      location?: string;
      status?: string;
      tag?: string;
      parentId?: string;
      minPrice?: string;
      maxPrice?: string;
    };
  }>("/", async (request) => {
    const q = request.query;
    const params: InventorySearchParams = {};

    if (q.query) params.query = q.query;
    if (q.category) params.category = q.category;
    if (q.location) params.location = q.location;
    if (q.status) params.status = q.status as ItemStatus;
    if (q.tag) params.tag = q.tag;
    if (q.parentId !== undefined) params.parentId = q.parentId === "null" ? null : q.parentId;
    if (q.minPrice) params.minPrice = parseFloat(q.minPrice);
    if (q.maxPrice) params.maxPrice = parseFloat(q.maxPrice);

    const items = searchItems(db, params);
    return { items };
  });

  // Summary stats
  app.get("/summary", async () => {
    return getSummary(db);
  });

  // Get single item
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const item = getItem(db, request.params.id);
    if (!item) return reply.status(404).send({ error: "Item not found" });
    return item;
  });

  // Create item
  app.post<{ Body: CreateItemData }>("/", async (request) => {
    const item = createItem(db, request.body);
    return item;
  });

  // Update item
  app.patch<{ Params: { id: string }; Body: UpdateItemData }>("/:id", async (request, reply) => {
    const item = updateItem(db, request.params.id, request.body);
    if (!item) return reply.status(404).send({ error: "Item not found" });
    return item;
  });

  // Delete item
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const deleted = deleteItem(db, request.params.id);
    if (!deleted) return reply.status(404).send({ error: "Item not found" });
    return { success: true };
  });

  // Add tags
  app.post<{ Params: { id: string }; Body: { tags: string[] } }>("/:id/tags", async (request, reply) => {
    const item = getItem(db, request.params.id);
    if (!item) return reply.status(404).send({ error: "Item not found" });
    addTags(db, request.params.id, request.body.tags);
    return getItem(db, request.params.id);
  });

  // Remove tag
  app.delete<{ Params: { id: string; tag: string } }>("/:id/tags/:tag", async (request, reply) => {
    const item = getItem(db, request.params.id);
    if (!item) return reply.status(404).send({ error: "Item not found" });
    removeTags(db, request.params.id, [request.params.tag]);
    return getItem(db, request.params.id);
  });
};
