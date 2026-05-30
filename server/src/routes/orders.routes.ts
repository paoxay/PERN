import { Decimal } from "@prisma/client/runtime/library";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { Router } from "express";

import { nextOrderCode } from "../lib/orderCode.js";
import { prisma } from "../lib/prisma.js";
import { orderGrandTotal, orderGrandTotalString, sumDecimals } from "../lib/money.js";

export const ordersRouter = Router();

function decorate<Order extends { lines: Array<{ qty: number; unitPrice: Decimal }> }>(order: Order) {
  return { ...order, grandTotal: orderGrandTotalString(order.lines) };
}

ordersRouter.post("/", async (req, res, next) => {
  try {
    const customerLabel = req.body?.customerLabel
      ? String(req.body.customerLabel).slice(0, 120).trim()
      : null;
    const code = await nextOrderCode();

    const order = await prisma.order.create({
      data: {
        code,
        customerLabel: customerLabel || null,
      },
      include: {
        lines: { include: { menuItem: true } },
      },
    });
    res.status(201).json(decorate(order));
  } catch (e) {
    next(e);
  }
});

ordersRouter.get("/", async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status).toUpperCase() : "";
    const where =
      status && status in OrderStatus
        ? { status: status as OrderStatus }
        : {};

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        lines: { include: { menuItem: true } },
        payments: true,
      },
    });
    res.json(orders.map(decorate));
  } catch (e) {
    next(e);
  }
});

ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        lines: { include: { menuItem: true }, orderBy: { id: "asc" } },
        payments: true,
      },
    });

    if (!order) return res.status(404).json({ error: "not found" });
    res.json(decorate(order));
  } catch (e) {
    next(e);
  }
});

ordersRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const customerLabel = req.body?.customerLabel;

    try {
      const order = await prisma.order.update({
        where: { id },
        data: {
          ...(customerLabel !== undefined
            ? { customerLabel: String(customerLabel).slice(0, 120).trim() || null }
            : {}),
        },
        include: {
          lines: { include: { menuItem: true }, orderBy: { id: "asc" } },
          payments: true,
        },
      });
      res.json(decorate(order));
    } catch {
      res.status(404).json({ error: "not found" });
    }
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/:id/lines", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const menuItemId = Number(req.body?.menuItemId);
    const qty = Number(req.body?.qty ?? req.body?.quantity ?? 0);
    const note = req.body?.note ? String(req.body.note).slice(0, 200) : null;

    if (!Number.isFinite(menuItemId)) return res.status(400).json({ error: "menuItemId invalid" });
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: "qty invalid" });

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order || order.status !== OrderStatus.DRAFT) {
        throw Object.assign(new Error("ORDER_LOCKED"), { code: 409 });
      }

      const menuItem = await tx.menuItem.findFirst({
        where: { id: menuItemId, isActive: true },
      });
      if (!menuItem) throw Object.assign(new Error("MENU_NOT_FOUND"), { code: 404 });

      await tx.orderLine.create({
        data: {
          orderId: id,
          menuItemId,
          qty,
          unitPrice: menuItem.price,
          note,
        },
      });
    }).catch((err: Error & { code?: number }) => {
      const c = err.code;
      if (c === 409) return res.status(409).json({ error: "order not editable after kitchen print" });
      if (c === 404) return res.status(404).json({ error: "menu item inactive or missing" });
      throw err;
    });
    if (res.headersSent) return;

    const full = await prisma.order.findUnique({
      where: { id },
      include: { lines: { include: { menuItem: true }, orderBy: { id: "asc" } } },
    });
    res.status(201).json(decorate(full!));
  } catch (e) {
    next(e);
  }
});

ordersRouter.delete("/:id/lines/:lineId", async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const lineId = Number(req.params.lineId);
    if (!Number.isFinite(orderId) || !Number.isFinite(lineId))
      return res.status(400).json({ error: "invalid id" });

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== OrderStatus.DRAFT)
        throw Object.assign(new Error("ORDER_LOCKED"), { code: 409 });

      const line = await tx.orderLine.findFirst({ where: { id: lineId, orderId } });
      if (!line) throw Object.assign(new Error("LINE_NOT_FOUND"), { code: 404 });

      await tx.orderLine.delete({ where: { id: lineId } });
    }).catch((err: Error & { code?: number }) => {
      if (err.code === 404) return res.status(404).json({ error: "line not found" });
      if (err.code === 409)
        return res.status(409).json({ error: "order not editable after kitchen print" });
      throw err;
    });
    if (res.headersSent) return;

    const full = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: { include: { menuItem: true }, orderBy: { id: "asc" } } },
    });
    res.json(decorate(full!));
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/:id/send-kitchen", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (!order) throw Object.assign(new Error("NOT_FOUND"), { code: 404 });
      if (order.status !== OrderStatus.DRAFT)
        throw Object.assign(new Error("BAD_STATE"), { code: 409 });
      if (order.lines.length === 0) throw Object.assign(new Error("EMPTY"), { code: 400 });

      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.IN_KITCHEN,
          kitchenPrintedAt: new Date(),
        },
      });
    }).catch((err: Error & { code?: number }) => {
      if (err.code === 404) return res.status(404).json({ error: "not found" });
      if (err.code === 409) return res.status(409).json({ error: "invalid order status" });
      if (err.code === 400) return res.status(400).json({ error: "order has no items" });
      throw err;
    });
    if (res.headersSent) return;

    const full = await prisma.order.findUnique({
      where: { id },
      include: {
        lines: { include: { menuItem: true }, orderBy: { id: "asc" } },
      },
    });
    res.json(decorate(full!));
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/:id/awaiting-payment", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw Object.assign(new Error("NOT_FOUND"), { code: 404 });
      if (order.status !== OrderStatus.IN_KITCHEN)
        throw Object.assign(new Error("BAD_STATE"), { code: 409 });

      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.AWAITING_PAYMENT,
          mealReadyAt: new Date(),
        },
      });
    }).catch((err: Error & { code?: number }) => {
      if (err.code === 404) return res.status(404).json({ error: "not found" });
      if (err.code === 409) return res.status(409).json({ error: "kitchen must confirm first" });
      throw err;
    });
    if (res.headersSent) return;

    const full = await prisma.order.findUnique({
      where: { id },
      include: {
        lines: { include: { menuItem: true }, orderBy: { id: "asc" } },
      },
    });
    res.json(decorate(full!));
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    try {
      const cancelled = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id } });
        if (!order) throw Object.assign(new Error("NOT_FOUND"), { code: 404 });
        if (order.status === OrderStatus.PAID)
          throw Object.assign(new Error("ALREADY_PAID"), { code: 409 });
        if (order.status === OrderStatus.CANCELLED)
          throw Object.assign(new Error("ALREADY_CANCELLED"), { code: 409 });

        return tx.order.update({
          where: { id },
          data: { status: OrderStatus.CANCELLED },
          include: {
            lines: { include: { menuItem: true }, orderBy: { id: "asc" } },
            payments: true,
          },
        });
      });

      res.json(decorate(cancelled));
    } catch (err) {
      const e = err as Error & { code?: number };
      if (e.code === 404) return res.status(404).json({ error: "not found" });
      if (e.code === 409 && e.message === "ALREADY_PAID")
        return res.status(409).json({ error: "paid orders cannot be cancelled" });
      if (e.code === 409 && e.message === "ALREADY_CANCELLED")
        return res.status(409).json({ error: "order already cancelled" });
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

ordersRouter.post("/:id/pay", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const paymentsIn = req.body?.payments as { method?: string; amount?: unknown }[];

    if (!Array.isArray(paymentsIn) || paymentsIn.length === 0)
      return res.status(400).json({ error: "payments array required" });

    const normalized: { method: PaymentMethod; amount: Decimal }[] = [];
    try {
      for (const p of paymentsIn) {
        const method = String(p.method ?? "").toUpperCase();
        if (method !== "CASH" && method !== "TRANSFER")
          throw Object.assign(new Error("BAD_METHOD"), { code: 400 });

        const amount = new Decimal(String(p.amount ?? "0"));
        if (!amount.gt(new Decimal("0"))) throw Object.assign(new Error("BAD_AMOUNT"), { code: 400 });

        normalized.push({
          method: method === "CASH" ? PaymentMethod.CASH : PaymentMethod.TRANSFER,
          amount,
        });
      }
    } catch {
      return res.status(400).json({ error: "invalid payments" });
    }

    try {
      const paidOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!order) throw Object.assign(new Error("NOT_FOUND"), { code: 404 });
      if (order.status !== OrderStatus.AWAITING_PAYMENT)
        throw Object.assign(new Error("BAD_STATE"), { code: 409 });

      const total = orderGrandTotal(order.lines);
      const paySum = sumDecimals(normalized.map((p) => p.amount));

      if (!paySum.equals(total))
        throw Object.assign(new Error("MISMATCH_TOTAL"), {
          code: 400,
          expected: total.toFixed(),
          paid: paySum.toFixed(),
        });

      await tx.paymentLine.deleteMany({ where: { orderId: id } });
      for (const p of normalized) {
        await tx.paymentLine.create({
          data: {
            orderId: id,
            method: p.method,
            amount: p.amount.toFixed(),
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.PAID,
          paidAt: new Date(),
        },
        include: {
          lines: { include: { menuItem: true }, orderBy: { id: "asc" } },
          payments: true,
        },
      });
    });

      res.json(decorate(paidOrder));
    } catch (err) {
      const e = err as Error & { code?: number; expected?: string; paid?: string };
      if (e.code === 404) return res.status(404).json({ error: "not found" });
      if (e.code === 409) return res.status(409).json({ error: "mark ready for payment first" });
      if (e.code === 400 && e.message === "MISMATCH_TOTAL") {
        return res.status(400).json({
          error: "payments must equal receipt total",
          expected: e.expected,
          paid: e.paid,
        });
      }
      next(err);
    }
  } catch (e) {
    next(e);
  }
});

