// server/admin-access-routes.ts
import { Router } from "express";
import { requireAdminKey } from "./access";
import {
  extendStoreAccess,
  setStoreAccessEndsAt,
  getStoreById,
} from "./access-db";

export function buildAdminAccessRouter(): Router {
  const r = Router();

  // Skoða access stöðu
  r.get("/admin/stores/:id/access", requireAdminKey, (req, res) => {
    const id = String(req.params.id);
    const store = getStoreById(id);
    if (!store) return res.status(404).json({ error: "Store not found" });

    return res.json({
      id: store.id,
      name: store.name ?? null,
      accessEndsAt: store.accessEndsAt ?? null,
    });
  });

  // Framlengja um X daga: { "days": 7 }
  r.post("/admin/stores/:id/extend-access", requireAdminKey, (req, res) => {
    const id = String(req.params.id);
    const daysRaw = (req.body?.days ?? req.body?.Days ?? req.body?.DAYS) as any;
    const days = Number(daysRaw);

    if (!Number.isFinite(days) || days <= 0 || days > 365) {
      return res.status(400).json({ error: "Invalid days. Use 1..365" });
    }

    const updated = extendStoreAccess(id, days);
    if (!updated) return res.status(404).json({ error: "Store not found" });

    return res.json({
      ok: true,
      id: updated.id,
      accessEndsAt: updated.accessEndsAt ?? null,
    });
  });

  // Setja ákveðna dagsetningu: { "accessEndsAt": "2026-02-15T12:00:00.000Z" } eða null
  r.post("/admin/stores/:id/set-access", requireAdminKey, (req, res) => {
    const id = String(req.params.id);
    const accessEndsAt = (req.body?.accessEndsAt ?? null) as string | null;

    if (accessEndsAt !== null) {
      const dt = new Date(accessEndsAt);
      if (Number.isNaN(dt.getTime())) {
        return res
          .status(400)
          .json({ error: "accessEndsAt must be ISO string or null" });
      }
    }

    const updated = setStoreAccessEndsAt(id, accessEndsAt);
    if (!updated) return res.status(404).json({ error: "Store not found" });

    return res.json({
      ok: true,
      id: updated.id,
      accessEndsAt: updated.accessEndsAt ?? null,
    });
  });

  return r;
}
