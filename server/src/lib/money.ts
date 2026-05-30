import { Decimal } from "@prisma/client/runtime/library";

export function decimalToString(x: Decimal | number | string): string {
  return new Decimal(x).toFixed(2);
}

export function sumDecimals(values: Decimal[]): Decimal {
  return values.reduce((a, b) => a.plus(b), new Decimal(0));
}

/** Same rule as cashier payment validation (Σ unitPrice × qty). */
export function orderGrandTotal(
  lines: Array<{ unitPrice: Decimal | string | number; qty: number }>,
): Decimal {
  const parts = lines.map((l) => new Decimal(String(l.unitPrice)).times(l.qty));
  return sumDecimals(parts);
}

export function orderGrandTotalString(
  lines: Array<{ unitPrice: Decimal | string | number; qty: number }>,
): string {
  return decimalToString(orderGrandTotal(lines));
}
