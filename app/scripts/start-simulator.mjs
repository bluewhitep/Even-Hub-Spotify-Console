import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appDir, "..");
const configPath = process.env.SIMULATOR_CONFIG_FILE
  ? path.resolve(process.env.SIMULATOR_CONFIG_FILE)
  : path.join(repoRoot, "simulator.config.json");

function maskClientId(value) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function validateSpotifyClientId(value) {
  const normalized = String(value ?? "").trim();
  if (!/^[0-9a-f]{32}$/i.test(normalized)) {
    throw new Error("simulator.config.json spotifyClientId must be a 32-character Spotify Client ID.");
  }
  return normalized;
}

function normalizePort(value) {
  const port = Number(value ?? 5173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("simulator.config.json localPort must be an integer between 1 and 65535.");
  }
  return port;
}

async function readSimulatorConfig() {
  let raw;
  try {
    raw = await fs.readFile(configPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Missing ${path.relative(repoRoot, configPath)}. Create it from simulator.config.example.json.`);
    }
    throw error;
  }

  const parsed = JSON.parse(raw);
  return {
    spotifyClientId: validateSpotifyClientId(parsed.spotifyClientId),
    localPort: normalizePort(parsed.localPort),
  };
}

async function main() {
  const config = await readSimulatorConfig();
  const viteBin = path.join(appDir, "node_modules", ".bin", process.platform === "win32" ? "vite.cmd" : "vite");

  console.log(`[simulator] client id: ${maskClientId(config.spotifyClientId)}`);
  console.log(`[simulator] port: ${config.localPort}`);

  const child = spawn(
    viteBin,
    ["--host", "127.0.0.1", "--port", String(config.localPort)],
    {
      cwd: appDir,
      stdio: "inherit",
      env: {
        ...process.env,
        VITE_SPOTIFY_AUTH_MODE: "client",
        VITE_SPOTIFY_CLIENT_ID: config.spotifyClientId,
      },
    },
  );

  child.on("error", (error) => {
    console.error("[simulator] failed to start Vite:", error);
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(0);
      return;
    }
    process.exit(code ?? 0);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      child.kill(signal);
    });
  }
}

main().catch((error) => {
  console.error("[simulator] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
