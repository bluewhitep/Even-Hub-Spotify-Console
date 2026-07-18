import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appDir, "..");
const appJsonPath = path.join(repoRoot, "app.json");
const appPackageJsonPath = path.join(appDir, "package.json");
const appPackageLockPath = path.join(appDir, "package-lock.json");
const buildHashPattern = /^[0-9a-f]{6}$/;
const baseVersionPattern = /^\d+\.\d+\.\d+$/;
const deviceSdkPackageName = "@evenrealities/even_hub_sdk";
const requiredDeviceSdkVersion = "0.0.9";

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: appDir,
      stdio: "inherit",
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function listSourceFiles(targetPath, baseDir = repoRoot) {
  const stat = await fs.stat(targetPath);
  if (stat.isFile()) {
    return [
      {
        fullPath: targetPath,
        relativePath: path.relative(baseDir, targetPath).split(path.sep).join("/"),
      },
    ];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules") continue;
      files.push(...(await listSourceFiles(fullPath, baseDir)));
      continue;
    }
    if (!entry.isFile()) continue;
    files.push({
      fullPath,
      relativePath: path.relative(baseDir, fullPath).split(path.sep).join("/"),
    });
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function readPackageBuildHash() {
  const hash = createHash("sha256");
  const roots = [
    appJsonPath,
    path.join(appDir, "package.json"),
    path.join(appDir, "package-lock.json"),
    path.join(appDir, "callback.html"),
    path.join(appDir, "index.html"),
    path.join(appDir, "vite.config.ts"),
    path.join(appDir, "src"),
    path.join(appDir, "scripts", "build-device.mjs"),
    path.join(appDir, "scripts", "postbuild-evenhub-pack-compat.mjs"),
  ];
  const files = [];

  for (const root of roots) {
    files.push(...(await listSourceFiles(root)));
  }

  for (const file of files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
    hash.update(file.relativePath);
    hash.update("\0");
    hash.update(await fs.readFile(file.fullPath));
    hash.update("\0");
  }

  return hash.digest("hex").slice(0, 6);
}

async function assertDeviceSdkVersion() {
  const packageJson = JSON.parse(await fs.readFile(appPackageJsonPath, "utf8"));
  const declaredVersion = packageJson.dependencies?.[deviceSdkPackageName] ?? "";
  if (declaredVersion !== requiredDeviceSdkVersion) {
    throw new Error(
      `device builds require ${deviceSdkPackageName}@${requiredDeviceSdkVersion}; package.json declares ${declaredVersion || "missing"}`,
    );
  }

  const packageLock = JSON.parse(await fs.readFile(appPackageLockPath, "utf8"));
  const lockedVersion = packageLock.packages?.[`node_modules/${deviceSdkPackageName}`]?.version ?? "";
  if (lockedVersion !== requiredDeviceSdkVersion) {
    throw new Error(
      `device builds require ${deviceSdkPackageName}@${requiredDeviceSdkVersion}; package-lock.json locks ${lockedVersion || "missing"}`,
    );
  }
}

async function main() {
  await assertDeviceSdkVersion();

  const appConfig = JSON.parse(await fs.readFile(appJsonPath, "utf8"));
  const baseVersion = String(appConfig.version || "0.0.0").trim();
  if (!baseVersionPattern.test(baseVersion)) {
    throw new Error(`app.json base version must use strict x.y.z format, received: ${baseVersion}`);
  }

  const buildHash = await readPackageBuildHash();
  if (!buildHashPattern.test(buildHash)) {
    throw new Error(`build hash must be 6 lowercase hex characters, received: ${buildHash}`);
  }

  const buildVersion = `${baseVersion}_${buildHash}`;
  console.log(`[build-device] build version: ${buildVersion}`);

  await runCommand(path.join(appDir, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite"), ["build"], {
    env: {
      ...process.env,
      VITE_BUILD_VERSION: buildVersion,
      VITE_SPOTIFY_AUTH_MODE: "server",
    },
  });
  await runCommand(process.execPath, [path.join(appDir, "scripts", "postbuild-evenhub-pack-compat.mjs")]);
}

main().catch((error) => {
  console.error("[build-device] failed:", error);
  process.exit(1);
});
