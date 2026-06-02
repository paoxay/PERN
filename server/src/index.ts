import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(serverRoot, ".env") });
import cors from "cors";
import express from "express";

import { inventoryRouter } from "./routes/inventory.routes.js";
import { menuRouter } from "./routes/menu.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/inventory", inventoryRouter);
app.use("/api/menu-items", menuRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reports", reportsRouter);

const clientDist = path.resolve(serverRoot, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`API http://localhost:${port}`);
});
