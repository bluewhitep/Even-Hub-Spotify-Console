import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const appDir = path.join(repoRoot, "app");
const appJsonPath = path.join(repoRoot, "app.json");
const appPackageJsonPath = path.join(repoRoot, "app", "package.json");
const appPackageLockPath = path.join(repoRoot, "app", "package-lock.json");
const distDir = path.join(repoRoot, "app", "dist");
const packageDir = path.join(repoRoot, "ehpk");
const packageName = "even-hub-spotify-console";
const execFileAsync = promisify(execFile);
const baseVersionPattern = /^\d+\.\d+\.\d+$/;
const buildHashPattern = /^[0-9a-f]{6}$/;
const deviceSdkPackageName = "@evenrealities/even_hub_sdk";
const requiredDeviceSdkVersion = "0.0.9";

function isGeneratedPackageFile(name) {
  return (
    name.startsWith(packageName) &&
    (name.endsWith(".ehpk") || name.endsWith(".build-meta.json"))
  );
}

async function removePackageFiles(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return 0;
    throw error;
  }

  let removed = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !isGeneratedPackageFile(entry.name)) continue;
    await fs.unlink(path.join(dir, entry.name));
    removed += 1;
  }
  return removed;
}

function runEvenhubPack(manifestPath, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "evenhub",
      ["pack", manifestPath, distDir, "--output", outputPath],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    );
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`evenhub pack exited with code ${code}`));
    });
  });
}

function runBuild(buildVersion) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "build"], {
      cwd: appDir,
      stdio: "inherit",
      env: {
        ...process.env,
        VITE_BUILD_VERSION: buildVersion,
        VITE_SPOTIFY_AUTH_MODE: "server",
      },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm run build exited with code ${code}`));
    });
  });
}

function assertAppVersion(version) {
  if (baseVersionPattern.test(version)) return;
  throw new Error(
    `app.json base version must use strict x.y.z format, received: ${version}`,
  );
}

function assertBuildHash(buildHash) {
  if (buildHashPattern.test(buildHash)) return;
  throw new Error(`build hash must be 6 lowercase hex characters, received: ${buildHash}`);
}

async function runCommand(command, args, options = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: repoRoot,
      timeout: 10000,
      maxBuffer: 1024 * 1024 * 8,
      ...options,
    });
    return {
      ok: true,
      command: [command, ...args].join(" "),
      stdout: String(stdout || "").trim(),
      stderr: String(stderr || "").trim(),
    };
  } catch (error) {
    return {
      ok: false,
      command: [command, ...args].join(" "),
      stdout: String(error?.stdout || "").trim(),
      stderr: String(error?.stderr || "").trim(),
      error: error?.message || String(error),
    };
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function assertDeviceSdkVersion() {
  const packageJson = await readJson(appPackageJsonPath);
  const declaredVersion = packageJson.dependencies?.[deviceSdkPackageName] ?? "";
  if (declaredVersion !== requiredDeviceSdkVersion) {
    throw new Error(
      `device package builds require ${deviceSdkPackageName}@${requiredDeviceSdkVersion}; package.json declares ${declaredVersion || "missing"}`,
    );
  }

  const packageLock = await readJson(appPackageLockPath);
  const lockedVersion = packageLock.packages?.[`node_modules/${deviceSdkPackageName}`]?.version ?? "";
  if (lockedVersion !== requiredDeviceSdkVersion) {
    throw new Error(
      `device package builds require ${deviceSdkPackageName}@${requiredDeviceSdkVersion}; package-lock.json locks ${lockedVersion || "missing"}`,
    );
  }
}

function packageNameFromLockPath(lockPath) {
  const parts = lockPath.split("/");
  const nodeModulesIndex = parts.lastIndexOf("node_modules");
  if (nodeModulesIndex === -1) return null;
  const firstPart = parts[nodeModulesIndex + 1];
  if (!firstPart) return null;
  if (firstPart.startsWith("@")) {
    const secondPart = parts[nodeModulesIndex + 2];
    return secondPart ? `${firstPart}/${secondPart}` : null;
  }
  return firstPart;
}

function collectLockedPackages(packageLock) {
  return Object.entries(packageLock.packages || {})
    .filter(([lockPath, value]) => lockPath && value?.version)
    .map(([lockPath, value]) => ({
      name: packageNameFromLockPath(lockPath),
      version: value.version,
      path: lockPath,
      dev: Boolean(value.dev),
      optional: Boolean(value.optional),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function collectDirectInstalledPackages(packageJson, lockedPackages) {
  const declared = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  return Object.fromEntries(
    Object.entries(declared)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, declaredVersion]) => {
        const installed = lockedPackages.find(
          (pkg) => pkg.name === name && pkg.path === `node_modules/${name}`,
        );
        return [
          name,
          {
            declared: declaredVersion,
            installed: installed?.version || null,
          },
        ];
      }),
  );
}

async function readGlobalNpmPackages(packageNames) {
  const result = await runCommand("npm", ["list", "-g", "--depth=0", "--json"]);
  if (!result.ok) {
    return {
      ok: false,
      command: result.command,
      error: result.error,
      packages: Object.fromEntries(packageNames.map((name) => [name, null])),
    };
  }

  try {
    const parsed = JSON.parse(result.stdout || "{}");
    return {
      ok: true,
      command: result.command,
      packages: Object.fromEntries(
        packageNames.map((name) => [
          name,
          parsed.dependencies?.[name]?.version || null,
        ]),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      command: result.command,
      error: error?.message || String(error),
      packages: Object.fromEntries(packageNames.map((name) => [name, null])),
    };
  }
}

async function readGitMetadata() {
  const branch = await runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const commit = await runCommand("git", ["rev-parse", "HEAD"]);
  const status = await runCommand("git", ["status", "--short"]);
  return {
    branch: branch.ok ? branch.stdout : null,
    commit: commit.ok ? commit.stdout : null,
    isDirty: status.ok ? status.stdout.length > 0 : null,
    statusShort: status.ok ? status.stdout.split("\n").filter(Boolean) : null,
  };
}

async function readFileDigest(filePath) {
  const content = await fs.readFile(filePath);
  const stats = await fs.stat(filePath);
  return {
    sizeBytes: stats.size,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
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
    appPackageJsonPath,
    appPackageLockPath,
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

async function listDistFiles(dir, baseDir = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listDistFiles(fullPath, baseDir)));
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

async function readDistBuildHash() {
  const hash = createHash("sha256");
  const files = await listDistFiles(distDir);
  for (const file of files) {
    hash.update(file.relativePath);
    hash.update("\0");
    hash.update(await fs.readFile(file.fullPath));
    hash.update("\0");
  }
  return hash.digest("hex").slice(0, 6);
}

async function writeBuildMetafile({
  outputPath,
  metadataPath,
  appConfig,
  baseAppConfig,
  packageVersion,
  baseVersion,
  buildHash,
  distHash,
}) {
  const packageJson = await readJson(appPackageJsonPath);
  const packageLock = await readJson(appPackageLockPath);
  const lockedPackages = collectLockedPackages(packageLock);
  const directInstalledPackages = collectDirectInstalledPackages(
    packageJson,
    lockedPackages,
  );
  const globalEvenHubPackages = await readGlobalNpmPackages([
    "@evenrealities/evenhub-cli",
    "@evenrealities/evenhub-simulator",
  ]);
  const npmVersion = await runCommand("npm", ["--version"]);
  const evenhubVersion = await runCommand("evenhub", ["--version"]);
  const packageFile = await readFileDigest(outputPath);

  const metadata = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    package: {
      name: packageName,
      version: packageVersion,
      baseVersion,
      buildHash,
      distHash,
      file: path.relative(repoRoot, outputPath),
      metadataFile: path.relative(repoRoot, metadataPath),
      ...packageFile,
    },
    appJson: appConfig,
    baseAppJson: baseAppConfig,
    source: {
      git: await readGitMetadata(),
    },
    tools: {
      node: process.version,
      npm: npmVersion.ok ? npmVersion.stdout : null,
      evenhubCli: evenhubVersion.ok ? evenhubVersion.stdout : null,
    },
    evenHubDevelopmentPackages: {
      local: {
        "@evenrealities/even_hub_sdk":
          directInstalledPackages["@evenrealities/even_hub_sdk"] || null,
      },
      global: globalEvenHubPackages.packages,
      globalProbe: {
        ok: globalEvenHubPackages.ok,
        command: globalEvenHubPackages.command,
        error: globalEvenHubPackages.error || null,
      },
    },
    npm: {
      packageJson: {
        name: packageJson.name,
        private: packageJson.private,
        type: packageJson.type,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
      },
      packageLock: {
        lockfileVersion: packageLock.lockfileVersion,
        directInstalledPackages,
        lockedPackages,
      },
    },
  };

  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function main() {
  await assertDeviceSdkVersion();

  const rawConfig = await fs.readFile(appJsonPath, "utf8");
  const baseAppConfig = JSON.parse(rawConfig);
  const baseVersion = String(baseAppConfig.version || "0.0.0").trim();
  assertAppVersion(baseVersion);
  const buildHash = await readPackageBuildHash();
  assertBuildHash(buildHash);
  const buildVersion = `${baseVersion}_${buildHash}`;
  const outputPath = path.join(packageDir, `${packageName}.${buildVersion}.ehpk`);
  const metadataPath = path.join(packageDir, `${packageName}.${buildVersion}.build-meta.json`);

  await fs.mkdir(packageDir, { recursive: true });

  const removedFromRoot = await removePackageFiles(repoRoot);
  const removedFromPackageDir = await removePackageFiles(packageDir);
  const removedTotal = removedFromRoot + removedFromPackageDir;
  if (removedTotal > 0) {
    console.log(`[pack-evenhub] removed ${removedTotal} old generated file(s).`);
  }

  console.log(`[pack-evenhub] build version: ${buildVersion}`);
  await runBuild(buildVersion);
  const distHash = await readDistBuildHash();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${packageName}-`));
  const tempManifestPath = path.join(tempDir, "app.json");

  try {
    await fs.writeFile(tempManifestPath, `${JSON.stringify(baseAppConfig, null, 2)}\n`, "utf8");
    await runEvenhubPack(tempManifestPath, outputPath);
    await fs.access(outputPath);
    console.log(`[pack-evenhub] wrote ${path.relative(repoRoot, outputPath)}`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  await writeBuildMetafile({
    outputPath,
    metadataPath,
    appConfig: baseAppConfig,
    baseAppConfig,
    packageVersion: buildVersion,
    baseVersion,
    buildHash,
    distHash,
  });
  console.log(`[pack-evenhub] wrote ${path.relative(repoRoot, metadataPath)}`);
}

main().catch((error) => {
  console.error("[pack-evenhub] failed:", error);
  process.exit(1);
});
