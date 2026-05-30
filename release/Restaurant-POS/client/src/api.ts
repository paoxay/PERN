import type { InventoryItem, MenuItem, Order } from "./types";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const maybe = data as Record<string, unknown> | null;
    const detail =
      typeof maybe?.error === "string"
        ? maybe.error
        : typeof maybe?.message === "string"
          ? maybe.message
          : `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return data as T;
}

export const api = {
  health: () => fetchJson<{ ok: boolean }>("/api/health"),

  listInventory: () => fetchJson<InventoryItem[]>("/api/inventory"),
  createInventory: (payload: Partial<InventoryItem>) =>
    fetchJson<InventoryItem>("/api/inventory", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchInventory: (id: number, payload: Partial<InventoryItem>) =>
    fetchJson<InventoryItem>(`/api/inventory/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteInventory: (id: number) =>
    fetchJson<void>(`/api/inventory/${id}`, {
      method: "DELETE",
    }),

  listMenu: () => fetchJson<MenuItem[]>("/api/menu-items"),
  createMenuItem: (payload: { name: string; price: string; category: "TUM" | "GENERAL" }) =>
    fetchJson<MenuItem>("/api/menu-items", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  patchMenuItem: (id: number, payload: Partial<Pick<MenuItem, "name" | "price" | "category" | "isActive">>) =>
    fetchJson<MenuItem>(`/api/menu-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteMenuItem: (id: number) =>
    fetchJson<void>(`/api/menu-items/${id}`, {
      method: "DELETE",
    }),

  createOrder: (customerLabel?: string) =>
    fetchJson<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ customerLabel }),
    }),

  listOrders: (params?: URLSearchParams) =>
    fetchJson<Order[]>(
      `/api/orders${params && params.toString() ? `?${params}` : ""}`,
    ),

  getOrder: (id: number) => fetchJson<Order>(`/api/orders/${id}`),

  addLine: (
    orderId: number,
    payload: { menuItemId: number; qty: number; note?: string | null },
  ) =>
    fetchJson<Order>(`/api/orders/${orderId}/lines`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteLine: (orderId: number, lineId: number) =>
    fetchJson<Order>(`/api/orders/${orderId}/lines/${lineId}`, { method: "DELETE" }),

  sendKitchen: (orderId: number) =>
    fetchJson<Order>(`/api/orders/${orderId}/send-kitchen`, { method: "POST" }),

  awaitingPayment: (orderId: number) =>
    fetchJson<Order>(`/api/orders/${orderId}/awaiting-payment`, { method: "POST" }),

  cancelOrder: (orderId: number) =>
    fetchJson<Order>(`/api/orders/${orderId}/cancel`, { method: "POST" }),

  pay: (orderId: number, payments: { method: "CASH" | "TRANSFER"; amount: string }[]) =>
    fetchJson<Order>(`/api/orders/${orderId}/pay`, {
      method: "POST",
      body: JSON.stringify({ payments }),
    }),

  dayReport: (date: string /* YYYY-MM-DD */) =>
    fetchJson<{
      period: string;
      cash: string;
      transfer: string;
      total: string;
      paidOrdersCount: number;
    }>(`/api/reports/day?date=${encodeURIComponent(date)}`),
  monthReport: (year: number, month: number) =>
    fetchJson<{
      period: string;
      cash: string;
      transfer: string;
      total: string;
      paidOrdersCount: number;
    }>(`/api/reports/month?year=${year}&month=${month}`),
};
