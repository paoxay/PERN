import { OrderStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { Router } from "express";

import { prisma } from "../lib/prisma.js";

export const reportsRouter = Router();

function utcDayBoundsUtc(dateKey: string): { startUtc: Date; endUtcExclusive: Date } | null {
  /** Expect YYYY-MM-DD; interprets midnight at UTC to avoid TZ surprises in reports APIs. */
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const startUtc = new Date(Date.UTC(y, mo, da, 0, 0, 0));
  const endUtcExclusive = new Date(Date.UTC(y, mo, da + 1, 0, 0, 0));
  return { startUtc, endUtcExclusive };
}

function utcMonthBoundsUtc(year: number, month1to12: number): { startUtc: Date; endUtcExclusive: Date } {
  const startUtc = new Date(Date.UTC(year, month1to12 - 1, 1, 0, 0, 0));
  const startNext = new Date(Date.UTC(year, month1to12, 1, 0, 0, 0));
  return { startUtc, endUtcExclusive: startNext };
}

reportsRouter.get("/day", async (req, res, next) => {
  try {
    const dateKey = String(req.query.date ?? "").slice(0, 10);
    const bounds = utcDayBoundsUtc(dateKey);
    if (!bounds) return res.status(400).json({ error: "date=YYYY-MM-DD required" });

    const rows = await prisma.paymentLine.findMany({
      where: {
        createdAt: { gte: bounds.startUtc, lt: bounds.endUtcExclusive },
        order: { status: OrderStatus.PAID },
      },
      include: {
        order: { select: { id: true, code: true, paidAt: true } },
      },
      orderBy: { id: "asc" },
    });

    let cash = new Decimal("0");
    let transfer = new Decimal("0");
    for (const r of rows) {
      if (r.method === "CASH") cash = cash.plus(r.amount);
      else transfer = transfer.plus(r.amount);
    }

    const orderIds = new Set(rows.map((r) => r.orderId));
    const total = cash.plus(transfer);

    res.json({
      period: dateKey,
      cash: cash.toFixed(2),
      transfer: transfer.toFixed(2),
      total: total.toFixed(2),
      paidOrdersCount: orderIds.size,
      lines: rows,
    });
  } catch (e) {
    next(e);
  }
});

reportsRouter.get("/month", async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12)
      return res.status(400).json({ error: "year and month (1..12) required" });

    const bounds = utcMonthBoundsUtc(year, month);

    const rows = await prisma.paymentLine.findMany({
      where: {
        createdAt: { gte: bounds.startUtc, lt: bounds.endUtcExclusive },
        order: { status: OrderStatus.PAID },
      },
      include: {
        order: { select: { id: true, code: true, paidAt: true } },
      },
      orderBy: { id: "asc" },
    });

    let cash = new Decimal("0");
    let transfer = new Decimal("0");
    for (const r of rows) {
      if (r.method === "CASH") cash = cash.plus(r.amount);
      else transfer = transfer.plus(r.amount);
    }
    const orderIds = new Set(rows.map((r) => r.orderId));
    const total = cash.plus(transfer);

    res.json({
      period: `${year}-${String(month).padStart(2, "0")}`,
      cash: cash.toFixed(2),
      transfer: transfer.toFixed(2),
      total: total.toFixed(2),
      paidOrdersCount: orderIds.size,
      lines: rows,
    });
  } catch (e) {
    next(e);
  }
});
