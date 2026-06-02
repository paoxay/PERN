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
        lines: { include: { menuItem: true, inventoryItem: true } },
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
        lines: { include: { menuItem: true, inventoryItem: true } },
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
        lines: { include: { menuItem: true, inventoryItem: true }, orderBy: { id: "asc" } },
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
          lines: { include: { menuItem: true, inventoryItem: true }, orderBy: { id: "asc" } },
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

    const menuItemId =
      req.body?.menuItemId === undefined || req.body?.menuItemId === null
        ? null
        : Number(req.body.menuItemId);
    const inventoryItemId =
      req.body?.inventoryItemId === undefined || req.body?.inventoryItemId === null
        ? null
        : Number(req.body.inventoryItemId);
    const qty = Number(req.body?.qty ?? req.body?.quantity ?? 0);
    const note = req.body?.note ? String(req.body.note).slice(0, 200) : null;

    const hasMenuItem = menuItemId !== null && Number.isFinite(menuItemId);
    const hasInventoryItem = inventoryItemId !== null && Number.isFinite(inventoryItemId);
    if (hasMenuItem === hasInventoryItem)
      return res.status(400).json({ error: "choose one menu item or stock item" });
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: "qty invalid" });

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order || order.status !== OrderStatus.DRAFT) {
        throw Object.assign(new Error("ORDER_LOCKED"), { code: 409 });
      }

      const menuItem = hasMenuItem
        ? await tx.menuItem.findFirst({
            where: { id: menuItemId!, isActive: true },
          })
        : null;
      if (hasMenuItem && !menuItem) throw Object.assign(new Error("MENU_NOT_FOUND"), { code: 404 });

      const inventoryItem = hasInventoryItem
        ? await tx.inventoryItem.findUnique({
            where: { id: inventoryItemId! },
          })
        : null;
      if (hasInventoryItem && !inventoryItem)
        throw Object.assign(new Error("STOCK_NOT_FOUND"), { code: 404 });
      if (inventoryItem && inventoryItem.quantity !== null && new Decimal(inventoryItem.quantity).lt(qty)) {
        throw Object.assign(new Error("INSUFFICIENT_STOCK"), {
          code: 409,
          itemName: inventoryItem.name,
          available: inventoryItem.quantity.toFixed(),
        });
      }

      await tx.orderLine.create({
        data: {
          orderId: id,
          ...(hasMenuItem ? { menuItemId: menuItemId! } : {}),
          ...(hasInventoryItem ? { inventoryItemId: inventoryItemId! } : {}),
          qty,
          unitPrice: menuItem ? menuItem.price : inventoryItem!.costPerUnit ?? "0",
          note,
        },
      });
    }).catch((err: Error & { code?: number; itemName?: string; available?: string }) => {
      const c = err.code;
      if (err.message === "INSUFFICIENT_STOCK")
        return res.status(409).json({
          error: `stock not enough: ${err.itemName ?? ""}`,
          available: err.available,
        });
      if (c === 409) return res.status(409).json({ error: "order not editable after kitchen print" });
      if (c === 404) return res.status(404).json({ error: "menu item inactive or missing" });
      throw err;
    });
    if (res.headersSent) return;

    const full = await prisma.order.findUnique({
      where: { id },
      include: { lines: { include: { menuItem: true, inventoryItem: true }, orderBy: { id: "asc" } } },
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
      include: { lines: { include: { menuItem: true, inventoryItem: true }, orderBy: { id: "asc" } } },
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
        lines: { include: { menuItem: true, inventoryItem: true }, orderBy: { id: "asc" } },
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
        lines: { include: { menuItem: true, inventoryItem: true }, orderBy: { id: "asc" } },
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
            lines: { include: { menuItem: true, inventoryItem: true }, orderBy: { id: "asc" } },
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

      for (const line of order.lines) {
        if (line.inventoryItemId === null) continue;
        const item = await tx.inventoryItem.findUnique({ where: { id: line.inventoryItemId } });
        if (!item) {
          throw Object.assign(new Error("STOCK_NOT_FOUND"), { code: 404 });
        }
        if (item.quantity === null) {
          throw Object.assign(new Error("STOCK_NOT_COUNTED"), {
            code: 409,
            itemName: item.name,
          });
        }

        const nextQty = new Decimal(item.quantity).minus(line.qty);
        if (nextQty.lt(0)) {
          throw Object.assign(new Error("INSUFFICIENT_STOCK"), {
            code: 409,
            itemName: item.name,
            available: item.quantity.toFixed(),
          });
        }
        await tx.inventoryItem.update({
          where: { id: line.inventoryItemId },
          data: { quantity: nextQty.toFixed() },
        });
      }

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
          lines: { include: { menuItem: true, inventoryItem: true }, orderBy: { id: "asc" } },
          payments: true,
        },
      });
    });

      res.json(decorate(paidOrder));
    } catch (err) {
      const e = err as Error & {
        code?: number;
        expected?: string;
        paid?: string;
        itemName?: string;
        available?: string;
      };
      if (e.code === 404) return res.status(404).json({ error: "not found" });
      if (e.message === "STOCK_NOT_COUNTED")
        return res.status(409).json({ error: `stock quantity not set: ${e.itemName ?? ""}` });
      if (e.message === "INSUFFICIENT_STOCK")
        return res.status(409).json({
          error: `stock not enough: ${e.itemName ?? ""}`,
          available: e.available,
        });
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

