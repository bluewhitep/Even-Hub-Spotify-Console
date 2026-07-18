import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_FILE = process.env.SELF_HOST_CONFIG_FILE || path.join(ROOT_DIR, 'self-host.config.json');
const OUTPUT_DIR = process.env.SELF_HOST_QR_DIR || path.join(ROOT_DIR, 'qr');
const OUTPUT_PNG = path.join(OUTPUT_DIR, 'evenhub-entry.png');
const OUTPUT_META = path.join(OUTPUT_DIR, 'meta.json');
const OUTPUT_HTML = path.join(OUTPUT_DIR, 'index.html');
const LOCAL_PORT = Number(process.env.SELF_HOST_LOCAL_PORT || process.env.PORT || '5173');
const PRINT_TERMINAL_QR = process.env.SELF_HOST_QR_TERMINAL === '1';
const QUIET = process.env.SELF_HOST_QR_QUIET === '1';

function loadQrCodeModule() {
  const candidateModules = [
    process.env.SELF_HOST_QRCODE_MODULE || '',
    'qrcode',
    '/opt/homebrew/lib/node_modules/@evenrealities/evenhub-cli/node_modules/qrcode',
    '/usr/local/lib/node_modules/@evenrealities/evenhub-cli/node_modules/qrcode',
  ].filter(Boolean);

  for (const modulePath of candidateModules) {
    try {
      return require(modulePath);
    } catch {
      // try next
    }
  }

  throw new Error(
    'QR module not found. Install "qrcode" in app/ or ensure evenhub-cli is installed globally.'
  );
}

function normalizeOrigin(input, { requireHttps = true } = {}) {
  const url = new URL(String(input || '').trim());
  if (requireHttps && url.protocol !== 'https:') {
    throw new Error('Service Origin must use HTTPS.');
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Service Origin must be origin-only (no path/query/hash).');
  }

  const protocol = url.protocol.toLowerCase();
  const hostname = url.hostname.toLowerCase();
  const isDefaultPort = (protocol === 'https:' && url.port === '443') || (protocol === 'http:' && url.port === '80');
  const port = !url.port || isDefaultPort ? '' : `:${url.port}`;
  return `${protocol}//${hostname}${port}`;
}

function ensureValidPort(portValue) {
  const parsed = Number(portValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5173;
}

async function readConfig() {
  const raw = await fs.readFile(CONFIG_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid self-host config JSON.');
  }

  const spotifyClientId = String(parsed.spotifyClientId || '').trim();
  if (!spotifyClientId) {
    throw new Error('Missing spotifyClientId in self-host config.');
  }

  const serviceOrigin = normalizeOrigin(parsed.serviceOrigin || '');
  return {
    spotifyClientId,
    serviceOrigin,
  };
}

function buildViewerHtml(meta) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EvenHub QR</title>
    <style>
      body {
        margin: 0;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #111;
        color: #eaeaea;
      }
      .card {
        max-width: 680px;
        margin: 0 auto;
        background: #1d1d1d;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 16px;
      }
      .img-wrap {
        display: flex;
        justify-content: center;
        background: #000;
        border-radius: 10px;
        padding: 12px;
      }
      img {
        width: min(92vw, 420px);
        height: auto;
        image-rendering: crisp-edges;
      }
      code {
        font-size: 12px;
        color: #7be97b;
        word-break: break-all;
      }
      .line {
        margin: 10px 0;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="img-wrap">
        <img src="./evenhub-entry.png" alt="EvenHub QR Code" />
      </div>
      <div class="line"><strong>Target URL</strong></div>
      <div class="line"><code>${meta.targetUrl}</code></div>
      <div class="line"><strong>Generated</strong></div>
      <div class="line"><code>${meta.generatedAt}</code></div>
    </div>
  </body>
</html>
`;
}

async function main() {
  const config = await readConfig();
  const QRCode = loadQrCodeModule();
  const targetUrl = config.serviceOrigin;
  const localPort = ensureValidPort(LOCAL_PORT);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await QRCode.toFile(OUTPUT_PNG, targetUrl, {
    type: 'png',
    width: 640,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  const meta = {
    targetUrl,
    serviceOrigin: config.serviceOrigin,
    spotifyClientId: config.spotifyClientId,
    generatedAt: new Date().toISOString(),
    localViewerUrl: `http://127.0.0.1:${localPort}/api/self-host/qr/view`,
    localPngPath: OUTPUT_PNG,
  };
  await fs.writeFile(OUTPUT_META, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_HTML, buildViewerHtml(meta), 'utf8');

  if (!QUIET) {
    console.log(`[qr] target-url: ${targetUrl}`);
    console.log(`[qr] png-file: ${OUTPUT_PNG}`);
    console.log(`[qr] html-file: ${OUTPUT_HTML}`);
    console.log(`[qr] viewer-url: ${meta.localViewerUrl}`);
  }

  if (PRINT_TERMINAL_QR && process.stdout.isTTY) {
    const terminalQr = await QRCode.toString(targetUrl, {
      type: 'terminal',
      small: true,
    });
    console.log('[qr] terminal-qr:');
    console.log(terminalQr);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[qr] failed: ${message}`);
  process.exit(1);
});
