import path from "path";
import fs from "fs";

export const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? "/var/data/uploads"
    : path.join(process.cwd(), "uploads");

// tryggja að uploads mappa sé til
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
