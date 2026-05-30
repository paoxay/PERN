import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const inventoryRouter = Router();

inventoryRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

inventoryRouter.post("/", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const quantity =
      req.body?.quantity === undefined || req.body?.quantity === "" || req.body?.quantity === null
        ? null
        : Number(req.body.quantity);
    const unit = String(req.body?.unit ?? "ຫນ່ວຍ").trim() || "ຫນ່ວຍ";
    const costPerUnit =
      req.body?.costPerUnit === undefined || req.body?.costPerUnit === ""
        ? null
        : String(req.body.costPerUnit);
    const reorderLevel =
      req.body?.reorderLevel === undefined || req.body?.reorderLevel === ""
        ? null
        : Number(req.body.reorderLevel);

    if (!name) return res.status(400).json({ error: "name required" });

    const row = await prisma.inventoryItem.create({
      data: {
        name,
        unit,
        ...(quantity !== null ? { quantity } : {}),
        ...(costPerUnit !== null ? { costPerUnit } : {}),
        ...(reorderLevel !== null ? { reorderLevel } : {}),
      },
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

inventoryRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const data: {
      name?: string;
      quantity?: number | null;
      unit?: string;
      costPerUnit?: string | null;
      reorderLevel?: number | null;
    } = {};

    if (req.body?.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body?.quantity !== undefined) {
      data.quantity =
        req.body.quantity === "" || req.body.quantity === null
          ? null
          : Number(req.body.quantity);
    }
    if (req.body?.unit !== undefined)
      data.unit = String(req.body.unit).trim() || "ຫນ່ວຍ";
    if (req.body?.costPerUnit !== undefined) {
      data.costPerUnit =
        req.body.costPerUnit === "" || req.body.costPerUnit === null
          ? null
          : String(req.body.costPerUnit);
    }
    if (req.body?.reorderLevel !== undefined) {
      data.reorderLevel =
        req.body.reorderLevel === "" || req.body.reorderLevel === null
          ? null
          : Number(req.body.reorderLevel);
    }

    try {
      const row = await prisma.inventoryItem.update({ where: { id }, data });
      res.json(row);
    } catch {
      res.status(404).json({ error: "not found" });
    }
  } catch (e) {
    next(e);
  }
});

inventoryRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    try {
      await prisma.inventoryItem.delete({ where: { id } });
      res.status(204).send();
    } catch {
      res.status(404).json({ error: "not found" });
    }
  } catch (e) {
    next(e);
  }
});
