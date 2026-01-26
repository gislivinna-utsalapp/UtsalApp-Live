import path from "path";
import fs from "fs";

const isRender = process.env.RENDER === "true";

export const UPLOAD_DIR = isRender
  ? "/var/data/uploads"
  : path.join(process.cwd(), "uploads");

// tryggja að uploads mappa sé til
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
