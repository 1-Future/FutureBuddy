// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Search, Trash2, X } from "lucide-react";
import {
  getInventoryItems,
  getInventorySummary,
  createInventoryItem,
  deleteInventoryItem,
  type InventoryItem,
} from "../services/api.js";

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "other", description: "" });

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory", search],
    queryFn: () => getInventoryItems(search ? { query: search } : undefined),
  });

  const { data: summary } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: getInventorySummary,
  });

  const addMutation = useMutation({
    mutationFn: () => createInventoryItem(newItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      setShowAdd(false);
      setNewItem({ name: "", category: "other", description: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
    },
  });

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newItem.name.trim()) addMutation.mutate();
    },
    [newItem, addMutation],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold">Inventory</h1>
          {summary && (
            <span className="text-xs text-[var(--color-text-dim)]">
              {summary.totalItems} items
              {summary.totalValue > 0 &&
                ` / $${summary.totalValue.toFixed(2)}`}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <Plus size={14} />
          Add Item
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div className="flex flex-wrap gap-3">
            <input
              value={newItem.name}
              onChange={(e) =>
                setNewItem({ ...newItem, name: e.target.value })
              }
              placeholder="Item name"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              required
            />
            <select
              value={newItem.category}
              onChange={(e) =>
                setNewItem({ ...newItem, category: e.target.value })
              }
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none"
            >
              <option value="electronics">Electronics</option>
              <option value="computers">Computers</option>
              <option value="peripherals">Peripherals</option>
              <option value="networking">Networking</option>
              <option value="audio_video">Audio & Video</option>
              <option value="cables">Cables</option>
              <option value="furniture">Furniture</option>
              <option value="tools">Tools</option>
              <option value="other">Other</option>
            </select>
            <input
              value={newItem.description}
              onChange={(e) =>
                setNewItem({ ...newItem, description: e.target.value })
              }
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addMutation.isPending}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-lg bg-[var(--color-surface-hover)] px-4 py-2 text-sm text-[var(--color-text-dim)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-9 pr-8 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-8 text-center text-sm text-[var(--color-text-dim)]">
            Loading...
          </div>
        )}

        {items?.map((item: InventoryItem) => (
          <div
            key={item.id}
            className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.name}</span>
                {item.brand && (
                  <span className="text-xs text-[var(--color-text-dim)]">
                    {item.brand}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="mt-0.5 text-xs text-[var(--color-text-dim)]">
                  {item.description}
                </p>
              )}
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded bg-[var(--color-accent)]/10 px-1.5 py-0.5 text-[10px] text-[var(--color-accent)]">
                  {item.category}
                </span>
                {item.location && (
                  <span className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-dim)]">
                    {item.location}
                  </span>
                )}
                {item.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-[var(--color-surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-dim)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              {item.quantity > 1 && (
                <div className="text-xs text-[var(--color-text-dim)]">
                  x{item.quantity}
                </div>
              )}
              {item.purchasePrice != null && (
                <div className="text-xs text-[var(--color-green)]">
                  ${item.purchasePrice.toFixed(2)}
                </div>
              )}
            </div>
            <button
              onClick={() => deleteMutation.mutate(item.id)}
              className="rounded-lg p-1.5 text-[var(--color-text-dim)] opacity-0 transition-opacity hover:text-[var(--color-red)] [div:hover>&]:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {items?.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 p-8 text-[var(--color-text-dim)]">
            <Package size={48} strokeWidth={1} />
            <p className="text-sm">
              {search
                ? "No items match your search"
                : "No items yet. Add your first item above."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
