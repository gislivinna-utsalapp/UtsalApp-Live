// server/access.ts
import type { Request, Response, NextFunction } from "express";
import { getStoreById } from "./access-db";

export function hasActiveAccess(accessEndsAt?: string | null): boolean {
  if (!accessEndsAt) return false;
  const dt = new Date(accessEndsAt);
  if (Number.isNaN(dt.getTime())) return false;
  return dt > new Date();
}

/**
 * Enforce-ar aðgang út frá storeId í:
 * - req.params[storeIdParam]
 */
export function requireActiveStoreAccessFromParams(storeIdParam: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const storeId = String((req.params as any)?.[storeIdParam] ?? "").trim();
    if (!storeId) return res.status(400).json({ error: "Missing store id" });

    const store = getStoreById(storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });

    if (!hasActiveAccess(store.accessEndsAt ?? null)) {
      return res.status(403).json({
        error: "Access expired",
        storeId,
        accessEndsAt: store.accessEndsAt ?? null,
      });
    }

    // Valfrjálst: setja store á req til þæginda (ekkert brýtur þó þetta sé ónotað)
    (req as any).store = store;
    return next();
  };
}

/**
 * Enforce-ar admin-lykil (simple + hagsýnt).
 * Settu ADMIN_KEY í Render environment.
 * Sendu svo: header "x-admin-key: <ADMIN_KEY>"
 */
export function requireAdminKey(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const expected = (process.env.ADMIN_KEY ?? "").trim();
  if (!expected) {
    // Ef þú gleymir að setja ADMIN_KEY, þá er admin route lokað
    return res
      .status(500)
      .json({ error: "ADMIN_KEY is not configured on server" });
  }

  const provided = String(req.header("x-admin-key") ?? "").trim();
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}
