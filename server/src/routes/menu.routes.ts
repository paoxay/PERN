import { Router } from "express";
import { MenuCategory } from "@prisma/client";

import { prisma } from "../lib/prisma.js";

export const menuRouter = Router();

menuRouter.get("/", async (_req, res, next) => {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

menuRouter.post("/", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const price = String(req.body?.price ?? "").trim();
    const categoryRaw = String(req.body?.category ?? "GENERAL").toUpperCase();
    const category = categoryRaw === "TUM" ? MenuCategory.TUM : MenuCategory.GENERAL;
    const isActive = req.body?.isActive !== false;

    if (!name || !price) return res.status(400).json({ error: "name and price required" });

    const item = await prisma.menuItem.create({
      data: { name, price, category, isActive },
    });
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

menuRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    const data: {
      name?: string;
      price?: string;
      category?: MenuCategory;
      isActive?: boolean;
    } = {};

    if (req.body?.name !== undefined) data.name = String(req.body.name).trim();
    if (req.body?.price !== undefined) data.price = String(req.body.price).trim();

    const categoryRaw = req.body?.category;
    if (categoryRaw !== undefined) {
      const c = String(categoryRaw).toUpperCase();
      data.category = c === "TUM" ? MenuCategory.TUM : MenuCategory.GENERAL;
    }
    if (req.body?.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

    try {
      const item = await prisma.menuItem.update({ where: { id }, data });
      res.json(item);
    } catch {
      res.status(404).json({ error: "not found" });
    }
  } catch (e) {
    next(e);
  }
});

menuRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    try {
      await prisma.menuItem.delete({ where: { id } });
      res.status(204).send();
    } catch {
      res.status(409).json({ error: "menu item is used by orders; close it instead" });
    }
  } catch (e) {
    next(e);
  }
});
