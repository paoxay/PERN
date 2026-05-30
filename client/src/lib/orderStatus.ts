import type { OrderStatus } from "../types";

export const statusLabel: Record<OrderStatus, string> = {
  DRAFT: "ລົງຄິວ",
  IN_KITCHEN: "ກຳລັງເຮັດອາຫານ",
  AWAITING_PAYMENT: "ສຳເລັດ",
  PAID: "ຈ່າຍແລ້ວ",
  CANCELLED: "ຍົກເລີກ",
};

export function statusClass(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    DRAFT: "badge badge--draft",
    IN_KITCHEN: "badge badge--kitchen",
    AWAITING_PAYMENT: "badge badge--pay",
    PAID: "badge badge--paid",
    CANCELLED: "badge badge--muted",
  };
  return map[status];
}
