import { prisma } from "./prisma.js";

function pad(n: number, w: number): string {
  return String(n).padStart(w, "0");
}

export async function nextOrderCode(): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = timezoneSafeDateKey(today);
  const count = await prisma.order.count({
    where: { createdAt: { gte: today } },
  });
  return `ORD-${next}-${pad(count + 1, 4)}`;
}

/** YYYYMMDD in local timezone (good enough for storefront daily codes). */
function timezoneSafeDateKey(d: Date): string {
  return (
    `${d.getFullYear()}` +
    pad(d.getMonth() + 1, 2) +
    pad(d.getDate(), 2)
  );
}
