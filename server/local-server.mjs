import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const TOKEN_KEY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-private',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
];
const SERVER_AUTH_CALLBACK_PATH = '/api/auth/callback';
const PKCE_TTL_MS = 15 * 60 * 1000;
const TOKEN_REFRESH_THRESHOLD_MS = 60 * 1000;
const MAX_REQUEST_BODY_BYTES = 64 * 1024;
const MAX_SPOTIFY_RESPONSE_BYTES = 2 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 15 * 1000;
const BUILD_VERSION = process.env.BUILD_VERSION || new Date().toISOString();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || '5173');
const CLIENT_DEBUG_LOGS_ENABLED = process.env.ENABLE_CLIENT_DEBUG_LOGS === '1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'app', 'dist');
const STATE_DIR = process.env.STATE_DIR || path.join(ROOT_DIR, '.self-host');
const STATE_FILE = path.join(STATE_DIR, 'state.json');
const CLIENT_DEBUG_LOG_FILE = path.join(STATE_DIR, 'client-debug.jsonl');
const WEBVIEW_CONFIG_FILE = path.join(STATE_DIR, 'webview-config.json');
const SERVER_CONFIG_FILE = process.env.SELF_HOST_CONFIG_FILE || path.join(ROOT_DIR, 'self-host.config.json');
const QR_DIR = process.env.SELF_HOST_QR_DIR || path.join(ROOT_DIR, 'qr');
const QR_PNG_FILE = path.join(QR_DIR, 'evenhub-entry.png');
const QR_META_FILE = path.join(QR_DIR, 'meta.json');

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

function nowMs() {
  return Date.now();
}

function defaultState() {
  return {
    config: null,
    pending: null,
    tokens: null,
    lastError: null,
  };
}

async function ensureStateDir() {
  await fs.mkdir(STATE_DIR, { recursive: true, mode: 0o700 });
  await fs.chmod(STATE_DIR, 0o700);
}

async function writePrivateFile(filePath, contents) {
  await ensureStateDir();
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    await fs.writeFile(temporaryPath, contents, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await fs.rename(temporaryPath, filePath);
    await fs.chmod(filePath, 0o600);
  } finally {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
  }
}

async function readState() {
  await ensureStateDir();
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    await fs.chmod(STATE_FILE, 0o600);
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      config: null,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return defaultState();
    }
    throw error;
  }
}

async function writeState(nextState) {
  await writePrivateFile(STATE_FILE, `${JSON.stringify(nextState, null, 2)}\n`);
}

function clampDebugString(value, maxLength = 1200) {
  const text = String(value ?? '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function redactClientDebugString(value, maxLength = 1200) {
  return clampDebugString(value, maxLength)
    .replace(/([?&](?:code|state|access_token|refresh_token|code_verifier)=)[^&#\s]*/gi, '$1[redacted]')
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]');
}

function sanitizeClientDebugPayload(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const details = source.details && typeof source.details === 'object' ? source.details : {};
  const sanitizedDetails = {};

  for (const [key, value] of Object.entries(details)) {
    if (/(?:token|authorization|secret|verifier|password|code)/i.test(key)) {
      sanitizedDetails[key] = '[redacted]';
      continue;
    }
    if (value === null || value === undefined) {
      sanitizedDetails[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitizedDetails[key] = value;
    } else {
      sanitizedDetails[key] = redactClientDebugString(value);
    }
  }

  return {
    receivedAt: typeof source.receivedAt === 'string' && source.receivedAt
      ? redactClientDebugString(source.receivedAt)
      : new Date().toISOString(),
    clientAt: redactClientDebugString(source.clientAt || ''),
    event: redactClientDebugString(source.event || 'unknown', 120),
    buildVersion: redactClientDebugString(source.buildVersion || ''),
    href: redactClientDebugString(source.href || ''),
    userAgent: redactClientDebugString(source.userAgent || ''),
    visibilityState: redactClientDebugString(source.visibilityState || ''),
    hidden: source.hidden === true,
    readyState: redactClientDebugString(source.readyState || ''),
    details: sanitizedDetails,
  };
}

async function appendClientDebugLog(payload) {
  await ensureStateDir();
  await fs.appendFile(CLIENT_DEBUG_LOG_FILE, `${JSON.stringify(sanitizeClientDebugPayload(payload))}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await fs.chmod(CLIENT_DEBUG_LOG_FILE, 0o600);
}

async function handleClientDebugLogList(response) {
  try {
    const raw = await fs.readFile(CLIENT_DEBUG_LOG_FILE, 'utf8');
    await fs.chmod(CLIENT_DEBUG_LOG_FILE, 0o600);
    const lines = raw.trim().split('\n').filter(Boolean);
    json(response, 200, {
      ok: true,
      count: lines.length,
      entries: lines.slice(-200).map((line) => {
        try {
          return sanitizeClientDebugPayload(JSON.parse(line));
        } catch {
          return { parseError: true };
        }
      }),
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      json(response, 200, { ok: true, count: 0, entries: [] });
      return;
    }
    throw error;
  }
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function redirect(response, location) {
  response.writeHead(302, {
    Location: location,
    'Cache-Control': 'no-store',
  });
  response.end();
}

function noStoreHeaders(extra = {}) {
  return {
    'Cache-Control': 'no-store',
    ...extra,
  };
}

function applySecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

class RequestError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'RequestError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeOrigin(input, { requireHttps = false } = {}) {
  const trimmed = String(input).trim();
  const isLocalLikeHost =
    /^localhost(?::\d+)?$/i.test(trimmed) ||
    /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$/.test(trimmed) ||
    /^\[[0-9a-fA-F:]+\](?::\d+)?$/.test(trimmed);
  const withProtocol =
    /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) || trimmed.startsWith('//')
      ? trimmed
      : `${isLocalLikeHost ? 'http' : 'https'}://${trimmed}`;
  const url = new URL(withProtocol);
  if (requireHttps && url.protocol !== 'https:') {
    throw new Error('Service Origin must use HTTPS.');
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Service Origin must be an origin only (no path, query, or hash).');
  }

  const protocol = url.protocol.toLowerCase();
  const hostname = url.hostname.toLowerCase();
  const isDefaultPort = (protocol === 'https:' && url.port === '443') || (protocol === 'http:' && url.port === '80');
  const port = !url.port || isDefaultPort ? '' : `:${url.port}`;
  return `${protocol}//${hostname}${port}`;
}

function normalizeCorsOrigin(value) {
  const trimmed = String(value || '').trim();
  if (trimmed === 'null') {
    return 'null';
  }
  if (trimmed === 'http://127.0.0.1:*') {
    return trimmed;
  }

  const normalized = normalizeOrigin(trimmed);
  const url = new URL(normalized);
  const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new Error('Allowed browser origins must use HTTPS, localhost HTTP, or the literal null origin.');
  }
  return normalized;
}

function isAllowedCorsOrigin(requestOrigin, allowedOrigins) {
  if (allowedOrigins.has(requestOrigin)) {
    return true;
  }
  if (!allowedOrigins.has('http://127.0.0.1:*')) {
    return false;
  }

  try {
    const url = new URL(requestOrigin);
    const port = Number(url.port);
    return url.protocol === 'http:' &&
      url.hostname === '127.0.0.1' &&
      Number.isInteger(port) &&
      port >= 1 &&
      port <= 65535;
  } catch {
    return false;
  }
}

function validateSpotifyClientId(value) {
  const normalized = String(value || '').trim();
  if (!/^[0-9a-f]{32}$/i.test(normalized)) {
    return {
      ok: false,
      message: 'Spotify Client ID must be the 32-character value from Spotify Developer Dashboard.',
    };
  }

  return {
    ok: true,
    normalized,
    trimmed: normalized !== value,
  };
}

function validateServiceOrigin(value) {
  const trimmedValue = String(value || '').trim();
  try {
    return {
      ok: true,
      normalized: normalizeOrigin(trimmedValue, { requireHttps: true }),
      trimmed: trimmedValue !== value,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      trimmed: trimmedValue !== value,
    };
  }
}

async function readServerConfigFile() {
  try {
    const raw = await fs.readFile(SERVER_CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const clientValidation = validateSpotifyClientId(parsed.spotifyClientId || '');
    if (!clientValidation.ok) {
      return null;
    }

    const normalizedOrigin = validateServiceOrigin(parsed.serviceOrigin || '');
    if (!normalizedOrigin.ok || !normalizedOrigin.normalized) {
      return null;
    }

    if (!Array.isArray(parsed.allowedTailscaleUsers) || parsed.allowedTailscaleUsers.length === 0 || parsed.allowedTailscaleUsers.length > 20) {
      return null;
    }
    if (parsed.allowedTailscaleUsers.some((value) => typeof value !== 'string')) {
      return null;
    }
    const allowedTailscaleUsers = [...new Set(parsed.allowedTailscaleUsers.map((value) => value.trim().toLowerCase()))];
    if (allowedTailscaleUsers.some((value) => !value || value.length > 254)) {
      return null;
    }

    if (parsed.allowedOrigins !== undefined && (!Array.isArray(parsed.allowedOrigins) || parsed.allowedOrigins.length > 20)) {
      return null;
    }
    let allowedOrigins;
    try {
      if ((parsed.allowedOrigins || []).some((value) => typeof value !== 'string')) {
        return null;
      }
      allowedOrigins = [...new Set((parsed.allowedOrigins || []).map(normalizeCorsOrigin))];
    } catch {
      return null;
    }

    return {
      spotifyClientId: clientValidation.normalized,
      serviceOrigin: normalizedOrigin.normalized,
      mode: 'custom-origin',
      allowedTailscaleUsers,
      allowedOrigins,
      updatedAt: Number.isFinite(Number(parsed.updatedAt)) ? Number(parsed.updatedAt) : 0,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

async function getEffectiveConfig(state) {
  const serverConfig = await readServerConfigFile();
  const source = serverConfig ? 'server' : 'missing';
  const spotifyClientId = serverConfig?.spotifyClientId || '';
  const serviceOrigin = serverConfig?.serviceOrigin || '';
  const redirectUri = serviceOrigin ? `${serviceOrigin}${SERVER_AUTH_CALLBACK_PATH}` : '';
  const tokenBundle = state.tokens;
  const hasMismatchWithAuthorizedSession = !!(
    tokenBundle?.authorized_client_id && tokenBundle?.authorized_service_origin && (
      tokenBundle.authorized_client_id !== spotifyClientId ||
      tokenBundle.authorized_service_origin !== serviceOrigin
    )
  );

  return {
    source,
    spotifyClientId,
    serviceOrigin,
    redirectUri,
    runtimeConfig: null,
    serverConfigPresent: !!serverConfig,
    hasMismatchWithAuthorizedSession,
  };
}

function normalizeRequestOriginHeader(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }
  try {
    return normalizeCorsOrigin(raw);
  } catch {
    return '';
  }
}

async function authorizeApiRequest(request, response, { allowNavigationOrigin = false } = {}) {
  const config = await readServerConfigFile();
  if (!config) {
    json(response, 503, {
      ok: false,
      error: createError('invalid_server_config', 'Self-host server configuration is missing or invalid.'),
    });
    return null;
  }

  const login = String(request.headers['tailscale-user-login'] || '').trim().toLowerCase();
  if (!login || !config.allowedTailscaleUsers.includes(login)) {
    json(response, 403, {
      ok: false,
      error: createError('tailscale_identity_denied', 'This Tailscale identity is not allowed.'),
    });
    return null;
  }

  const rawOrigin = request.headers.origin;
  const requestOrigin = normalizeRequestOriginHeader(rawOrigin);
  const allowedOrigins = new Set([config.serviceOrigin, ...config.allowedOrigins]);
  if (!allowNavigationOrigin && rawOrigin !== undefined && (!requestOrigin || !isAllowedCorsOrigin(requestOrigin, allowedOrigins))) {
    json(response, 403, {
      ok: false,
      error: createError('browser_origin_denied', 'This browser origin is not allowed.'),
    });
    return null;
  }

  if (!allowNavigationOrigin && requestOrigin) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Max-Age', '600');
  return config;
}

function summarizeValue(value) {
  if (!value) {
    return 'none';
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function createError(code, message) {
  return { code, message };
}

function normalizeWebViewConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
    return null;
  }

  const rawSettings = rawConfig.settings;
  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
    return null;
  }

  const settings = {};
  const entries = Object.entries(rawSettings);
  if (entries.length > 80) {
    return null;
  }

  for (const [key, value] of entries) {
    if (!/^[a-zA-Z0-9_.:-]{1,120}$/.test(key) || typeof value !== 'string' || value.length > 8192) {
      return null;
    }
    settings[key] = value;
  }

  return {
    schemaVersion: Number.isFinite(Number(rawConfig.schemaVersion)) ? Number(rawConfig.schemaVersion) : 1,
    app: String(rawConfig.app || 'even-hub-spotify-console').slice(0, 120),
    savedAt: typeof rawConfig.savedAt === 'string' && rawConfig.savedAt ? rawConfig.savedAt : new Date().toISOString(),
    settings,
  };
}

function buildCallbackRedirect(status, options = {}) {
  const url = new URL('/callback.html', 'http://localhost');
  url.searchParams.set('backend_auth', status);
  if (options.code) {
    url.searchParams.set('error_code', options.code);
  }
  if (options.message) {
    url.searchParams.set('error_message', options.message);
  }
  return `${url.pathname}${url.search}`;
}

async function readRequestBody(request, { required = false } = {}) {
  const contentType = String(request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw new RequestError(415, 'unsupported_media_type', 'Content-Type must be application/json.');
  }

  const contentLength = Number(request.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
    throw new RequestError(413, 'request_body_too_large', 'Request body is too large.');
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      throw new RequestError(413, 'request_body_too_large', 'Request body is too large.');
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    if (required) {
      throw new RequestError(400, 'missing_request_body', 'A JSON request body is required.');
    }
    return null;
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    if (required) {
      throw new RequestError(400, 'missing_request_body', 'A JSON request body is required.');
    }
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
}

function base64UrlEncode(buffer) {
  return buffer.toString('base64url');
}

function randomBase64Url(size) {
  return base64UrlEncode(crypto.randomBytes(size));
}

function sha256Base64Url(input) {
  return base64UrlEncode(crypto.createHash('sha256').update(input).digest());
}

async function exchangeToken({ code, verifier, redirectUri, clientId }) {
  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('code', code);
  params.set('redirect_uri', redirectUri);
  params.set('client_id', clientId);
  params.set('code_verifier', verifier);

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  const rawText = await response.text();
  let body = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }

  return { response, body, rawText };
}

function toTokenBundle(body, previousRefreshToken, previousScope) {
  const accessToken = typeof body?.access_token === 'string' ? body.access_token : '';
  if (!accessToken) {
    return null;
  }
  const expiresIn = Number(body.expires_in);
  const refreshToken = typeof body?.refresh_token === 'string' && body.refresh_token
    ? body.refresh_token
    : previousRefreshToken;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: typeof body?.token_type === 'string' ? body.token_type : undefined,
    scope: typeof body?.scope === 'string' ? body.scope : previousScope,
    expires_at: Number.isFinite(expiresIn) ? nowMs() + expiresIn * 1000 : Number.NaN,
  };
}

function isPlainRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function assertExactKeys(value, allowedKeys, message) {
  if (!isPlainRecord(value)) {
    throw new RequestError(400, 'invalid_spotify_request', message);
  }
  const keys = Object.keys(value);
  if (keys.some((key) => !allowedKeys.includes(key))) {
    throw new RequestError(400, 'invalid_spotify_request', message);
  }
}

function validateQueryKeys(searchParams, allowedKeys) {
  for (const key of searchParams.keys()) {
    if (!allowedKeys.includes(key) || searchParams.getAll(key).length !== 1) {
      throw new RequestError(400, 'invalid_spotify_request', 'Unsupported or repeated Spotify query parameter.');
    }
  }
}

function validateOptionalDeviceId(searchParams) {
  const value = searchParams.get('device_id');
  if (value !== null && (!value || value.length > 256)) {
    throw new RequestError(400, 'invalid_spotify_request', 'Invalid Spotify device_id.');
  }
}

function validateNoBody(body) {
  if (body !== null && body !== undefined) {
    throw new RequestError(400, 'invalid_spotify_request', 'This Spotify operation does not accept a body.');
  }
}

function validateTrackUris(value, maximum = 50) {
  if (!Array.isArray(value) || value.length < 1 || value.length > maximum) {
    throw new RequestError(400, 'invalid_spotify_request', 'Invalid Spotify track URI list.');
  }
  if (value.some((uri) => typeof uri !== 'string' || !/^spotify:track:[A-Za-z0-9]{1,64}$/.test(uri))) {
    throw new RequestError(400, 'invalid_spotify_request', 'Invalid Spotify track URI.');
  }
}

function validateSpotifyProxyRequest(payload) {
  if (!isPlainRecord(payload)) {
    throw new RequestError(400, 'invalid_spotify_request', 'Spotify proxy request must be a JSON object.');
  }
  assertExactKeys(payload, ['path', 'method', 'body'], 'Spotify proxy request contains unsupported fields.');

  const rawPath = typeof payload.path === 'string' ? payload.path : '';
  const method = typeof payload.method === 'string' ? payload.method.toUpperCase() : '';
  const body = payload.body ?? null;
  if (!rawPath.startsWith('/') || rawPath.startsWith('//') || rawPath.includes('\\') || rawPath.length > 1000) {
    throw new RequestError(400, 'invalid_spotify_request', 'Invalid Spotify API path.');
  }
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
    throw new RequestError(400, 'invalid_spotify_request', 'Unsupported Spotify API method.');
  }

  const url = new URL(rawPath, 'https://spotify-proxy.invalid');
  if (url.hash) {
    throw new RequestError(400, 'invalid_spotify_request', 'Spotify API path cannot contain a fragment.');
  }
  const route = `${method} ${url.pathname}`;

  if (route === 'GET /me') {
    validateQueryKeys(url.searchParams, []);
    validateNoBody(body);
  } else if (route === 'GET /me/playlists') {
    validateQueryKeys(url.searchParams, ['limit']);
    const limit = url.searchParams.get('limit');
    if (limit !== null && (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 50)) {
      throw new RequestError(400, 'invalid_spotify_request', 'Spotify playlist limit must be between 1 and 50.');
    }
    validateNoBody(body);
  } else if (route === 'GET /me/tracks') {
    validateQueryKeys(url.searchParams, ['limit', 'market']);
    const limit = url.searchParams.get('limit');
    if (limit !== null && (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 50)) {
      throw new RequestError(400, 'invalid_spotify_request', 'Spotify saved-track limit must be between 1 and 50.');
    }
    const market = url.searchParams.get('market');
    if (market !== null && market !== 'from_token') {
      throw new RequestError(400, 'invalid_spotify_request', 'Unsupported Spotify market value.');
    }
    validateNoBody(body);
  } else if (['GET /me/player', 'GET /me/player/devices', 'GET /me/player/currently-playing'].includes(route)) {
    validateQueryKeys(url.searchParams, []);
    validateNoBody(body);
  } else if (['POST /me/player/next', 'POST /me/player/previous', 'PUT /me/player/pause'].includes(route)) {
    validateQueryKeys(url.searchParams, ['device_id']);
    validateOptionalDeviceId(url.searchParams);
    validateNoBody(body);
  } else if (route === 'PUT /me/player/shuffle') {
    validateQueryKeys(url.searchParams, ['state', 'device_id']);
    validateOptionalDeviceId(url.searchParams);
    if (!['true', 'false'].includes(url.searchParams.get('state') || '')) {
      throw new RequestError(400, 'invalid_spotify_request', 'Spotify shuffle state is required.');
    }
    validateNoBody(body);
  } else if (route === 'PUT /me/player/repeat') {
    validateQueryKeys(url.searchParams, ['state', 'device_id']);
    validateOptionalDeviceId(url.searchParams);
    if (!['off', 'track', 'context'].includes(url.searchParams.get('state') || '')) {
      throw new RequestError(400, 'invalid_spotify_request', 'Spotify repeat state is required.');
    }
    validateNoBody(body);
  } else if (route === 'PUT /me/player') {
    validateQueryKeys(url.searchParams, []);
    assertExactKeys(body, ['device_ids', 'play'], 'Invalid Spotify transfer-playback body.');
    if (!Array.isArray(body.device_ids) || body.device_ids.length !== 1 || typeof body.device_ids[0] !== 'string' || !body.device_ids[0] || body.device_ids[0].length > 256) {
      throw new RequestError(400, 'invalid_spotify_request', 'A single Spotify device ID is required.');
    }
    if (typeof body.play !== 'boolean') {
      throw new RequestError(400, 'invalid_spotify_request', 'Spotify transfer play must be boolean.');
    }
  } else if (route === 'PUT /me/player/play') {
    validateQueryKeys(url.searchParams, ['device_id']);
    validateOptionalDeviceId(url.searchParams);
    if (body === null || body === undefined) {
      return {
        method,
        path: `${url.pathname}${url.search}`,
        body: null,
      };
    }
    assertExactKeys(body, ['context_uri', 'offset', 'uris'], 'Invalid Spotify start-playback body.');
    const hasContext = typeof body.context_uri === 'string' && /^spotify:[A-Za-z0-9:_-]{1,500}$/.test(body.context_uri);
    const hasUris = Array.isArray(body.uris);
    if (hasContext === hasUris) {
      throw new RequestError(400, 'invalid_spotify_request', 'Playback requires exactly one context_uri or uris list.');
    }
    if (hasContext) {
      if (body.offset !== undefined) {
        assertExactKeys(body.offset, ['position'], 'Invalid Spotify playback offset.');
        if (!Number.isInteger(body.offset.position) || body.offset.position < 0) {
          throw new RequestError(400, 'invalid_spotify_request', 'Spotify playback offset must be a non-negative integer.');
        }
      }
    } else {
      if (body.offset !== undefined || body.context_uri !== undefined) {
        throw new RequestError(400, 'invalid_spotify_request', 'URI playback cannot include context fields.');
      }
      validateTrackUris(body.uris);
    }
  } else if (['PUT /me/library', 'DELETE /me/library'].includes(route)) {
    validateQueryKeys(url.searchParams, []);
    assertExactKeys(body, ['uris'], 'Invalid Spotify library body.');
    validateTrackUris(body.uris, 1);
  } else {
    throw new RequestError(400, 'spotify_route_denied', 'Spotify route is not allowed by this application.');
  }

  return {
    method,
    path: `${url.pathname}${url.search}`,
    body,
  };
}

async function refreshServerAccessToken(state, effective) {
  const refreshToken = state.tokens?.refresh_token;
  if (!refreshToken || !effective.spotifyClientId) {
    state.tokens = null;
    state.lastError = createError('auth_expired', 'Spotify authorization has expired.');
    await writeState(state);
    return { ok: false, status: 401, code: 'AUTH_EXPIRED', message: 'Spotify authorization has expired.' };
  }

  const params = new URLSearchParams();
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', refreshToken);
  params.set('client_id', effective.spotifyClientId);

  let tokenResponse;
  try {
    tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, status: 502, code: 'NETWORK', message: 'Spotify token service is unavailable.' };
  }

  const rawText = await tokenResponse.text();
  let body = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }

  if (!tokenResponse.ok) {
    if (tokenResponse.status === 429) {
      return {
        ok: false,
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Spotify token refresh is rate limited.',
        retryAfter: tokenResponse.headers.get('retry-after') || undefined,
      };
    }
    state.tokens = null;
    state.lastError = createError('auth_expired', 'Spotify authorization has expired.');
    await writeState(state);
    return { ok: false, status: 401, code: 'AUTH_EXPIRED', message: 'Spotify authorization has expired.' };
  }

  const nextTokens = toTokenBundle(body, refreshToken, state.tokens?.scope);
  if (!nextTokens || !Number.isFinite(nextTokens.expires_at)) {
    state.tokens = null;
    state.lastError = createError('auth_expired', 'Spotify token refresh returned an invalid response.');
    await writeState(state);
    return { ok: false, status: 401, code: 'AUTH_EXPIRED', message: 'Spotify authorization has expired.' };
  }

  state.tokens = {
    ...nextTokens,
    authorized_client_id: effective.spotifyClientId,
    authorized_service_origin: effective.serviceOrigin,
  };
  state.lastError = null;
  await writeState(state);
  return { ok: true, accessToken: nextTokens.access_token };
}

async function ensureServerAccessToken(state, effective, forceRefresh = false) {
  const tokens = state.tokens;
  if (!tokens?.access_token || effective.hasMismatchWithAuthorizedSession) {
    return { ok: false, status: 401, code: 'AUTH_REQUIRED', message: 'Spotify authorization is required.' };
  }

  const expiresAt = Number(tokens.expires_at);
  const canReuse = !forceRefresh && Number.isFinite(expiresAt) && expiresAt - nowMs() > TOKEN_REFRESH_THRESHOLD_MS;
  if (canReuse) {
    return { ok: true, accessToken: tokens.access_token };
  }
  return refreshServerAccessToken(state, effective);
}

async function callSpotifyApi(spec, accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const init = { method: spec.method, headers };
  if (spec.body !== null && spec.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(spec.body);
  }
  try {
    return await fetch(`${SPOTIFY_API_BASE}${spec.path}`, {
      ...init,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    throw new RequestError(502, 'spotify_network_error', 'Spotify Web API is unavailable.');
  }
}

async function readLimitedSpotifyBody(upstreamResponse) {
  if (!upstreamResponse.body) {
    return Buffer.alloc(0);
  }
  const reader = upstreamResponse.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const chunk = Buffer.from(value);
    totalBytes += chunk.length;
    if (totalBytes > MAX_SPOTIFY_RESPONSE_BYTES) {
      await reader.cancel();
      throw new RequestError(502, 'spotify_response_too_large', 'Spotify response exceeded the allowed size.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function relaySpotifyResponse(response, upstreamResponse) {
  const headers = noStoreHeaders();
  const contentType = upstreamResponse.headers.get('content-type');
  const retryAfter = upstreamResponse.headers.get('retry-after');
  if (contentType && /^(?:application\/json|text\/plain)(?:;|$)/i.test(contentType)) {
    headers['Content-Type'] = contentType;
  } else {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }
  if (retryAfter) {
    headers['Retry-After'] = retryAfter;
  }
  const body = await readLimitedSpotifyBody(upstreamResponse);
  response.writeHead(upstreamResponse.status, headers);
  response.end(body);
}

async function handleSpotifyProxy(request, response) {
  const spec = validateSpotifyProxyRequest(await readRequestBody(request, { required: true }));
  const state = await readState();
  const effective = await getEffectiveConfig(state);
  let tokenResult = await ensureServerAccessToken(state, effective);
  if (!tokenResult.ok) {
    const headers = tokenResult.retryAfter ? { 'Retry-After': tokenResult.retryAfter } : undefined;
    response.writeHead(tokenResult.status, noStoreHeaders({ 'Content-Type': 'application/json; charset=utf-8', ...(headers || {}) }));
    response.end(JSON.stringify({ ok: false, error: createError(tokenResult.code, tokenResult.message) }));
    return;
  }

  let upstreamResponse = await callSpotifyApi(spec, tokenResult.accessToken);
  if (upstreamResponse.status === 401) {
    await upstreamResponse.body?.cancel();
    tokenResult = await ensureServerAccessToken(state, effective, true);
    if (!tokenResult.ok) {
      const headers = tokenResult.retryAfter ? { 'Retry-After': tokenResult.retryAfter } : undefined;
      response.writeHead(tokenResult.status, noStoreHeaders({ 'Content-Type': 'application/json; charset=utf-8', ...(headers || {}) }));
      response.end(JSON.stringify({ ok: false, error: createError(tokenResult.code, tokenResult.message) }));
      return;
    }
    upstreamResponse = await callSpotifyApi(spec, tokenResult.accessToken);
    if (upstreamResponse.status === 401) {
      await upstreamResponse.body?.cancel();
      state.tokens = null;
      state.lastError = createError('auth_expired', 'Spotify authorization has expired.');
      await writeState(state);
      json(response, 401, { ok: false, error: createError('AUTH_EXPIRED', 'Spotify authorization has expired.') });
      return;
    }
  }
  await relaySpotifyResponse(response, upstreamResponse);
}

async function sendStaticFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES.get(extension) || 'application/octet-stream';
  const file = await fs.readFile(filePath);
  response.writeHead(200, noStoreHeaders({ 'Content-Type': contentType }));
  response.end(file);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function readQrMeta() {
  try {
    const raw = await fs.readFile(QR_META_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

async function handleQrMeta(response) {
  const meta = await readQrMeta();
  if (!meta) {
    json(response, 404, { ok: false, error: 'QR metadata not found. Run the self-host start script first.' });
    return;
  }
  json(response, 200, { ok: true, meta });
}

async function handleQrImage(response) {
  try {
    await sendStaticFile(response, QR_PNG_FILE);
  } catch (error) {
    response.writeHead(404, noStoreHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    response.end('QR image not found. Run the self-host start script first.');
  }
}

async function handleQrView(request, response) {
  const meta = await readQrMeta();
  const target = meta?.targetUrl || 'not-generated';
  const generatedAt = meta?.generatedAt || 'not-generated';
  const imageUrl = '/api/self-host/qr/image';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EvenHub QR</title>
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0f0f0f;
        color: #e8e8e8;
      }
      .card {
        max-width: 700px;
        margin: 0 auto;
        border: 1px solid #2f2f2f;
        border-radius: 12px;
        padding: 16px;
        background: #1a1a1a;
      }
      .preview {
        display: flex;
        justify-content: center;
        background: #000;
        border-radius: 10px;
        padding: 12px;
      }
      img {
        width: min(90vw, 420px);
        height: auto;
      }
      code {
        color: #8df58d;
        font-size: 12px;
        word-break: break-all;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="preview">
        <img src="${escapeHtml(imageUrl)}" alt="EvenHub QR code" />
      </div>
      <p><strong>Target URL</strong><br /><code>${escapeHtml(target)}</code></p>
      <p><strong>Generated</strong><br /><code>${escapeHtml(generatedAt)}</code></p>
      <p><strong>PNG file</strong><br /><code>${escapeHtml(QR_PNG_FILE)}</code></p>
    </div>
  </body>
</html>`;

  response.writeHead(200, noStoreHeaders({ 'Content-Type': 'text/html; charset=utf-8' }));
  response.end(html);
}

async function handleApiState(response) {
  const state = await readState();
  const effective = await getEffectiveConfig(state);
  const hasMismatch = effective.hasMismatchWithAuthorizedSession;
  const sessionAuthorized = !hasMismatch && !!state.tokens?.access_token;
  const grantedScopes = sessionAuthorized && typeof state.tokens?.scope === 'string'
    ? [...new Set(state.tokens.scope.split(/\s+/).map((scope) => scope.trim()).filter(Boolean))]
    : [];
  const lastError = state.lastError || null;

  json(response, 200, {
    ok: true,
    buildVersion: BUILD_VERSION,
    configSource: effective.source,
    serverConfigPresent: effective.serverConfigPresent,
    effectiveSpotifyClientId: effective.spotifyClientId || '',
    effectiveServiceOrigin: effective.serviceOrigin,
    effectiveRedirectUri: effective.redirectUri,
    hasMismatchWithAuthorizedSession: hasMismatch,
    authorizedClientIdSummary: summarizeValue(state.tokens?.authorized_client_id),
    authorizedServiceOriginSummary: state.tokens?.authorized_service_origin || 'none',
    sessionAuthorized,
    grantedScopes,
    tokenExpiresAt: sessionAuthorized && Number.isFinite(Number(state.tokens?.expires_at))
      ? new Date(Number(state.tokens.expires_at)).toISOString()
      : 'none',
    lastError,
  });
}

async function handleClearSession(response) {
  const state = await readState();
  state.config = null;
  state.pending = null;
  state.tokens = null;
  state.lastError = null;
  await writeState(state);
  json(response, 200, { ok: true });
}

async function handleLoadWebViewConfig(response) {
  await ensureStateDir();
  try {
    const raw = await fs.readFile(WEBVIEW_CONFIG_FILE, 'utf8');
    await fs.chmod(WEBVIEW_CONFIG_FILE, 0o600);
    const config = normalizeWebViewConfig(JSON.parse(raw));
    if (!config) {
      json(response, 500, { ok: false, error: createError('invalid_webview_config', 'Stored WebView config is invalid.') });
      return;
    }
    json(response, 200, { ok: true, config });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      json(response, 200, { ok: true, config: null });
      return;
    }
    throw error;
  }
}

async function handleSaveWebViewConfig(request, response) {
  const body = await readRequestBody(request, { required: true });
  const config = normalizeWebViewConfig(body);
  if (!config) {
    json(response, 400, { ok: false, error: createError('invalid_webview_config', 'Invalid WebView config.') });
    return;
  }

  await writePrivateFile(WEBVIEW_CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`);
  json(response, 200, { ok: true, config });
}

async function handleAuthStart(request, response) {
  const state = await readState();
  const effective = await getEffectiveConfig(state);

  if (!effective.spotifyClientId) {
    state.lastError = createError('missing_client_id', 'Spotify Client ID is required.');
    await writeState(state);
    redirect(response, buildCallbackRedirect('error', { code: 'missing_client_id', message: 'Spotify Client ID is required.' }));
    return;
  }

  if (effective.hasMismatchWithAuthorizedSession) {
    state.lastError = createError('redirect_uri_mismatch', 'Client ID / Origin changed. Clear Session and re-authorize.');
    await writeState(state);
    redirect(response, buildCallbackRedirect('error', { code: 'redirect_uri_mismatch', message: 'Client ID / Origin changed. Clear Session and re-authorize.' }));
    return;
  }

  const authState = randomBase64Url(16);
  const verifier = randomBase64Url(48);
  const challenge = sha256Base64Url(verifier);

  state.pending = {
    state: authState,
    verifier,
    createdAt: nowMs(),
    redirectUri: effective.redirectUri,
  };
  state.lastError = null;
  await writeState(state);

  const url = new URL(SPOTIFY_AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', effective.spotifyClientId);
  url.searchParams.set('redirect_uri', effective.redirectUri);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('state', authState);
  url.searchParams.set('scope', TOKEN_KEY_SCOPES.join(' '));
  url.searchParams.set('show_dialog', 'false');

  redirect(response, url.toString());
}

async function handleAuthCallback(request, response, requestUrl) {
  const state = await readState();
  const callbackError = requestUrl.searchParams.get('error');
  const callbackDescription = requestUrl.searchParams.get('error_description') || '';
  const incomingState = requestUrl.searchParams.get('state');
  const code = requestUrl.searchParams.get('code');

  const fail = async (codeValue, message) => {
    state.lastError = createError(codeValue, message);
    if (codeValue === 'pkce_state_missing' || codeValue === 'pkce_state_mismatch' || codeValue === 'pkce_pending_expired') {
      state.pending = null;
    }
    await writeState(state);
    redirect(response, buildCallbackRedirect('error', { code: codeValue, message }));
  };

  if (callbackError) {
    const codeValue = /redirect uri/i.test(callbackDescription) ? 'redirect_uri_mismatch' : 'token_exchange_failed';
    await fail(codeValue, callbackDescription || callbackError);
    return;
  }

  if (!incomingState) {
    await fail('pkce_state_missing', 'Missing login state. Please start the login again.');
    return;
  }

  if (!state.pending) {
    await fail('pkce_state_mismatch', 'Authorization state mismatch. Please retry.');
    return;
  }

  if (nowMs() - Number(state.pending.createdAt || 0) > PKCE_TTL_MS) {
    state.pending = null;
    await fail('pkce_pending_expired', 'The login attempt expired. Please start again.');
    return;
  }

  if (state.pending.state !== incomingState) {
    state.pending = null;
    await fail('pkce_state_mismatch', 'Authorization state mismatch. Please retry.');
    return;
  }

  if (!code) {
    state.pending = null;
    await fail('token_exchange_failed', 'Missing authorization code.');
    return;
  }

  const effective = await getEffectiveConfig(state);
  if (!effective.spotifyClientId) {
    state.pending = null;
    await fail('missing_client_id', 'Spotify Client ID is required.');
    return;
  }

  try {
    const { response: tokenResponse, body, rawText } = await exchangeToken({
      code,
      verifier: state.pending.verifier,
      redirectUri: state.pending.redirectUri,
      clientId: effective.spotifyClientId,
    });

    if (!tokenResponse.ok) {
      const message = typeof body?.error_description === 'string'
        ? body.error_description
        : typeof body?.error === 'string'
          ? body.error
          : rawText || 'Token exchange failed.';
      const codeValue = /redirect uri/i.test(message) ? 'redirect_uri_mismatch' : 'token_exchange_failed';
      state.pending = null;
      await fail(codeValue, message);
      return;
    }

    const tokens = toTokenBundle(body, state.tokens?.refresh_token, state.tokens?.scope);
    if (!tokens) {
      state.pending = null;
      await fail('token_exchange_failed', 'Token payload missing access_token.');
      return;
    }

    state.tokens = {
      ...tokens,
      authorized_client_id: effective.spotifyClientId,
      authorized_service_origin: effective.serviceOrigin,
    };
    state.pending = null;
    state.lastError = null;
    await writeState(state);

    redirect(response, buildCallbackRedirect('success'));
  } catch {
    state.pending = null;
    await fail('network_error', 'Spotify token service is unavailable.');
  }
}

async function handleStatic(request, response, requestUrl) {
  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const safePath = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath);

  if (!filePath.startsWith(DIST_DIR)) {
    response.writeHead(403, noStoreHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    response.end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    await sendStaticFile(response, filePath);
  } catch {
    if (pathname !== '/index.html' && pathname !== '/callback.html') {
      try {
        await sendStaticFile(response, path.join(DIST_DIR, 'index.html'));
        return;
      } catch {
        // fall through
      }
    }
    response.writeHead(404, noStoreHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
    response.end('Not found');
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const method = request.method || 'GET';
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    applySecurityHeaders(response);

    const isProtectedApi = requestUrl.pathname.startsWith('/api/') && requestUrl.pathname !== '/api/health';
    if (isProtectedApi) {
      const isOAuthNavigation = method === 'GET' &&
        (requestUrl.pathname === '/api/auth/start' || requestUrl.pathname === '/api/auth/callback');
      const authorizedConfig = await authorizeApiRequest(request, response, { allowNavigationOrigin: isOAuthNavigation });
      if (!authorizedConfig) {
        return;
      }
    }

    if (method === 'OPTIONS') {
      if (!requestUrl.pathname.startsWith('/api/')) {
        json(response, 404, { ok: false, error: createError('not_found', 'Not found.') });
        return;
      }
      response.writeHead(204, noStoreHeaders());
      response.end();
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/api/health') {
      json(response, 200, { ok: true, buildVersion: BUILD_VERSION });
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/api/self-host/state') {
      await handleApiState(response);
      return;
    }

    if (CLIENT_DEBUG_LOGS_ENABLED && method === 'GET' && requestUrl.pathname === '/api/debug/client-log') {
      await handleClientDebugLogList(response);
      return;
    }

    if (CLIENT_DEBUG_LOGS_ENABLED && method === 'POST' && requestUrl.pathname === '/api/debug/client-log') {
      await appendClientDebugLog(await readRequestBody(request, { required: true }));
      json(response, 200, { ok: true });
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/api/self-host/qr/meta') {
      await handleQrMeta(response);
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/api/self-host/qr/image') {
      await handleQrImage(response);
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/api/self-host/qr/view') {
      await handleQrView(request, response);
      return;
    }

    if (method === 'POST' && requestUrl.pathname === '/api/self-host/session/clear') {
      await handleClearSession(response);
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/api/self-host/webview-config') {
      await handleLoadWebViewConfig(response);
      return;
    }

    if (method === 'POST' && requestUrl.pathname === '/api/self-host/webview-config') {
      await handleSaveWebViewConfig(request, response);
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/api/auth/start') {
      await handleAuthStart(request, response);
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/api/auth/callback') {
      await handleAuthCallback(request, response, requestUrl);
      return;
    }

    if (method === 'POST' && requestUrl.pathname === '/api/spotify') {
      await handleSpotifyProxy(request, response);
      return;
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      json(response, 404, { ok: false, error: createError('not_found', 'API route not found.') });
      return;
    }

    await handleStatic(request, response, requestUrl);
  } catch (error) {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    if (error instanceof RequestError) {
      json(response, error.statusCode, { ok: false, error: createError(error.code, error.message) });
      return;
    }
    console.error('[self-host] request failed:', error instanceof Error ? error.message : String(error));
    json(response, 500, { ok: false, error: createError('internal_error', 'Internal server error.') });
  }
});

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  console.error('PORT must be an integer from 0 to 65535.');
  process.exit(1);
}

const startupConfig = await readServerConfigFile();
if (!startupConfig) {
  console.error(`Missing or invalid self-host configuration at ${SERVER_CONFIG_FILE}.`);
  console.error('Required: 32-character spotifyClientId, HTTPS serviceOrigin, and non-empty allowedTailscaleUsers.');
  process.exit(1);
}

try {
  await fs.access(DIST_DIR);
} catch {
  console.error(`Missing built frontend at ${DIST_DIR}. Run \"npm run build\" in app/ first.`);
  process.exit(1);
}

await ensureStateDir();

server.listen(PORT, HOST, () => {
  const address = server.address();
  const activePort = address && typeof address === 'object' ? address.port : PORT;
  console.log(`Self-host server running at http://${HOST}:${activePort}`);
  console.log(`Serving static files from ${DIST_DIR}`);
  console.log(`State file: ${STATE_FILE}`);
});
