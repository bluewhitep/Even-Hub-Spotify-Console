import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");
const assetsDir = path.join(distDir, "assets");

async function main() {
  let entries;
  try {
    entries = await fs.readdir(assetsDir, { withFileTypes: true });
  } catch {
    console.warn("[postbuild-pack-compat] assets directory not found, skipping.");
    return;
  }

  const copied = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const sourcePath = path.join(assetsDir, entry.name);
    const targetPath = path.join(distDir, entry.name);
    await fs.copyFile(sourcePath, targetPath);
    copied.push(entry.name);
  }

  if (copied.length === 0) {
    console.warn("[postbuild-pack-compat] no assets files copied.");
    return;
  }

  console.log(
    `[postbuild-pack-compat] copied ${copied.length} asset file(s) to dist root for evenhub pack compatibility.`,
  );
}

main().catch((error) => {
  console.error("[postbuild-pack-compat] failed:", error);
  process.exit(1);
});
