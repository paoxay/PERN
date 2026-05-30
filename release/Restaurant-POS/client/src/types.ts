/** Basic API shapes mirrored from backend (Decimals arrive as strings in JSON). */
export type InventoryItem = {
  id: number;
  name: string;
  quantity: string | null;
  unit: string;
  costPerUnit: string | null;
  reorderLevel: string | null;
};

export type MenuItem = {
  id: number;
  name: string;
  price: string;
  category: "TUM" | "GENERAL";
  isActive: boolean;
};

export type OrderStatus = "DRAFT" | "IN_KITCHEN" | "AWAITING_PAYMENT" | "PAID" | "CANCELLED";

export type OrderLine = {
  id: number;
  orderId: number;
  menuItemId: number;
  qty: number;
  unitPrice: string;
  note: string | null;
  menuItem?: MenuItem;
};

export type PaymentLine = {
  id: number;
  orderId: number;
  method: "CASH" | "TRANSFER";
  amount: string;
  createdAt?: string;
};

export type Order = {
  id: number;
  code: string;
  customerLabel?: string | null;
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
  kitchenPrintedAt?: string | null;
  mealReadyAt?: string | null;
  paidAt?: string | null;
  /** Computed Σ(unitPrice × qty), always 2 fractional digits (currency string). */
  grandTotal?: string;
  lines?: OrderLine[];
  payments?: PaymentLine[];
};
