import path from "path";
import fs from "fs";

function resolveUploadDir(): string {
  const persistentDir = "/var/data/uploads";
  try {
    const parent = path.dirname(persistentDir);
    if (fs.existsSync(parent)) {
      if (!fs.existsSync(persistentDir)) {
        fs.mkdirSync(persistentDir, { recursive: true });
      }
      return persistentDir;
    }
  } catch {}

  const localDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}

export const UPLOAD_DIR = resolveUploadDir();

export function toAbsoluteImageUrl(
  relativeUrl: string | null | undefined,
  req: { protocol: string; get: (name: string) => string | undefined },
): string | null {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
    return relativeUrl;
  }
  const host = req.get("host") ?? "localhost:5000";
  const proto = req.get("x-forwarded-proto") ?? req.protocol ?? "https";
  return `${proto}://${host}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
}
