export type SpotifyErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_EXPIRED"
  | "NO_ACTIVE_DEVICE"
  | "PREMIUM_REQUIRED"
  | "NETWORK"
  | "RATE_LIMITED"
  | "UNKNOWN";

export type RepeatMode = "off" | "context" | "track";

export type PlaybackState = {
  trackId: string;
  title: string;
  artists: string;
  isPlaying: boolean;
  contextUri: string;
  deviceName: string;
  albumImageUrl: string;
  progressMs: number;
  durationMs: number;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  liked: boolean | null;
} | null;

export type PlaybackResult =
  | { ok: true; playback: PlaybackState }
  | { ok: false; error: SpotifyErrorCode; retryAfterMs?: number; message?: string };

export type PlaylistSummary = {
  id: string;
  name: string;
  ownerName: string;
  trackCount: number;
  coverUrl: string | null;
  uri: string | null;
  kind: "liked" | "playlist";
};

export type PlaylistResult =
  | { ok: true; playlists: PlaylistSummary[] }
  | { ok: false; error: SpotifyErrorCode; retryAfterMs?: number; message?: string };

export type DeviceSummary = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  isRestricted: boolean;
};

export type DeviceResult =
  | { ok: true; devices: DeviceSummary[] }
  | { ok: false; error: SpotifyErrorCode; retryAfterMs?: number; message?: string };

export type ControlResult = {
  ok: boolean;
  error?: SpotifyErrorCode;
  retryAfterMs?: number;
  message?: string;
};

type TokenBundle = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_at: number;
  authorized_client_id?: string;
  authorized_service_origin?: string;
};

type PendingPkceRecord = {
  verifier: string;
  createdAt: number;
  redirectUri: string;
};

type PendingPkceMap = Record<string, PendingPkceRecord>;

export type SelfHostConfig = {
  spotifyClientId: string;
  serviceOrigin: string;
  mode: "same-origin" | "custom-origin";
  updatedAt: number;
};

export type SpotifyAuthMode = "server" | "client";

export type SelfHostConfigSource = "server" | "runtime" | "env" | "missing";

export type SelfHostErrorCode =
  | "missing_client_id"
  | "invalid_service_origin"
  | "redirect_uri_mismatch"
  | "pkce_state_missing"
  | "pkce_state_mismatch"
  | "pkce_pending_expired"
  | "token_exchange_failed"
  | "network_error";

export type EffectiveConfigState = {
  source: SelfHostConfigSource;
  spotifyClientId: string;
  serviceOrigin: string;
  redirectUri: string;
  hasMismatchWithAuthorizedSession: boolean;
};

export type SelfHostDiagnostics = {
  buildVersion: string;
  currentPageOrigin: string;
  configSource: SelfHostConfigSource;
  effectiveServiceOrigin: string;
  effectiveRedirectUri: string;
  authorizedClientIdSummary: string;
  authorizedServiceOriginSummary: string;
  clientNow: string;
  tokenExpiresAt: string;
  lastErrorCode: string;
  lastErrorMessage: string;
};

export type CallbackExchangeResult =
  | { ok: true }
  | { ok: false; error: SpotifyErrorCode; shortCode: string; detail?: string };

type ServerSelfHostStateResponse = {
  ok: true;
  buildVersion: string;
  configSource: SelfHostConfigSource;
  serverConfigPresent: boolean;
  effectiveSpotifyClientId: string;
  effectiveServiceOrigin: string;
  effectiveRedirectUri: string;
  hasMismatchWithAuthorizedSession: boolean;
  authorizedClientIdSummary: string;
  authorizedServiceOriginSummary: string;
  sessionAuthorized: boolean;
  grantedScopes: string[];
  tokenExpiresAt: string;
  lastError: LastAuthError | null;
};

type ServerSelfHostMeta = {
  configSource: SelfHostConfigSource;
  serverConfigPresent: boolean;
  effectiveSpotifyClientId: string;
  effectiveServiceOrigin: string;
  effectiveRedirectUri: string;
  hasMismatchWithAuthorizedSession: boolean;
  authorizedClientIdSummary: string;
  authorizedServiceOriginSummary: string;
  sessionAuthorized: boolean;
  grantedScopes: string[];
  tokenExpiresAt: string;
};

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

const TOKEN_KEY = "spotify_tokens_v1";
const PKCE_PENDING_KEY = "spotify_pkce_pending_v1";
const LAST_ERROR_KEY = "spotify_last_error_v1";
const SELF_HOST_CONFIG_KEY = "spotify_self_host_config_v1";
const SERVER_SELF_HOST_META_KEY = "spotify_server_self_host_meta_v1";
const SERVER_API_ORIGIN_KEY = "spotify_server_api_origin_v1";
const SERVER_SELF_HOST_STATE_PATH = "/api/self-host/state";
const SERVER_SELF_HOST_SESSION_CLEAR_PATH = "/api/self-host/session/clear";
const SERVER_WEBVIEW_CONFIG_PATH = "/api/self-host/webview-config";
const SERVER_SPOTIFY_PROXY_PATH = "/api/spotify";
const SERVER_AUTH_START_PATH = "/api/auth/start";
const SERVER_AUTH_CALLBACK_PATH = "/api/auth/callback";
const CLIENT_AUTH_CALLBACK_PATH = "/callback.html";
const AUTH_MODE_QUERY_KEY = "authMode";

const PKCE_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_THRESHOLD_MS = 60_000;
const RETRY_AFTER_FALLBACK_MS = 5_000;
const RATE_LIMIT_MIN_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_WINDOW_MS = 60_000;
const SERVER_STATE_SYNC_COOLDOWN_MS = 1_000;
const SHA256_BLOCK_BYTES = 64;
const SHA256_OUTPUT_BYTES = 32;

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-private",
  "user-library-read",
  "user-library-modify",
  "playlist-read-private",
  "playlist-read-collaborative",
];

const NO_ACTIVE_DEVICE_HINT = "no active device";
const PREMIUM_HINT = "premium";

export type LastAuthError = {
  code: SelfHostErrorCode | string;
  message: string;
};

let rateLimitUntilMs = 0;
let lastRateLimitWindowMs = RATE_LIMIT_MIN_WINDOW_MS;
let serverStateSyncInFlight: Promise<boolean> | null = null;
let lastServerStateSyncMs = 0;
let lastServerStateSyncResult = false;
let currentUserIdCache = "";

function getEnvSpotifyClientId(): string {
  return (import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? "").trim();
}

function getEnvSpotifyAuthMode(): SpotifyAuthMode | null {
  const raw = String(import.meta.env.VITE_SPOTIFY_AUTH_MODE ?? "").trim().toLowerCase();
  if (raw === "client" || raw === "simulator") {
    return "client";
  }
  if (raw === "server" || raw === "self-host" || raw === "device") {
    return "server";
  }
  return null;
}

function getUrlSpotifyAuthMode(): SpotifyAuthMode | null {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get(AUTH_MODE_QUERY_KEY) ?? params.get("auth") ?? "").trim().toLowerCase();
  if (raw === "client" || raw === "simulator") {
    return "client";
  }
  if (raw === "server" || raw === "self-host" || raw === "device") {
    return "server";
  }
  if (params.get("simulator") === "true") {
    return "client";
  }
  return null;
}

export function getSpotifyAuthMode(): SpotifyAuthMode {
  return getEnvSpotifyAuthMode() ?? getUrlSpotifyAuthMode() ?? "server";
}

export function isClientSpotifyAuthMode(): boolean {
  return getSpotifyAuthMode() === "client";
}

function normalizeOrigin(input: string, options?: { requireHttps?: boolean }): string {
  const trimmed = input.trim();
  const isLocalLikeHost =
    /^localhost(?::\d+)?$/i.test(trimmed) ||
    /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?$/.test(trimmed) ||
    /^\[[0-9a-fA-F:]+\](?::\d+)?$/.test(trimmed);
  const withProtocol =
    /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) || trimmed.startsWith("//")
      ? trimmed
      : `${isLocalLikeHost ? "http" : "https"}://${trimmed}`;
  const url = new URL(withProtocol);
  if (options?.requireHttps && url.protocol !== "https:") {
    throw new Error("Service Origin must use HTTPS.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Service Origin must be an origin only (no path, query, or hash).");
  }

  const normalizedProtocol = url.protocol.toLowerCase();
  const normalizedHost = url.hostname.toLowerCase();
  const isDefaultPort =
    (normalizedProtocol === "https:" && url.port === "443") ||
    (normalizedProtocol === "http:" && url.port === "80");
  const normalizedPort = !url.port || isDefaultPort ? "" : `:${url.port}`;
  return `${normalizedProtocol}//${normalizedHost}${normalizedPort}`;
}

function getCurrentPageOrigin(): string {
  if (window.location.origin === "null") {
    return "null";
  }
  try {
    return normalizeOrigin(window.location.origin);
  } catch {
    return window.location.origin;
  }
}

function normalizeServerApiOrigin(value: string): string {
  const normalized = normalizeOrigin(value, { requireHttps: false });
  if (isClientSpotifyAuthMode()) {
    return normalized;
  }
  const url = new URL(normalized);
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error("Self-host server origin must use HTTPS (or loopback HTTP for local diagnostics).");
  }
  return normalized;
}

function readServerApiOriginOverride(): string {
  const raw = (localStorage.getItem(SERVER_API_ORIGIN_KEY) ?? "").trim();
  if (!raw) {
    return "";
  }
  try {
    return normalizeServerApiOrigin(raw);
  } catch {
    localStorage.removeItem(SERVER_API_ORIGIN_KEY);
    return "";
  }
}

export function getServerApiOriginOverride(): string {
  return readServerApiOriginOverride();
}

export function getServerApiOrigin(): string {
  return readServerApiOriginOverride() || getCurrentPageOrigin();
}

function canUseCurrentPageAsServerApiOrigin(): boolean {
  return (window.location.protocol === "http:" || window.location.protocol === "https:") && !!window.location.hostname;
}

export function setServerApiOrigin(value: string): string {
  const normalized = normalizeServerApiOrigin(value);
  localStorage.setItem(SERVER_API_ORIGIN_KEY, normalized);
  return normalized;
}

export function ensureServerApiOriginViaPrompt(forcePrompt = false): boolean {
  if (!forcePrompt) {
    const existing = readServerApiOriginOverride();
    if (existing) {
      return true;
    }
    if (canUseCurrentPageAsServerApiOrigin()) {
      return true;
    }
  }

  const seed = readServerApiOriginOverride() || getCurrentPageOrigin();
  const input = window.prompt("Input self-host server origin (protocol://host[:port])", seed);
  if (input === null) {
    return false;
  }

  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return false;
  }

  setServerApiOrigin(normalizedInput);
  return true;
}

function getServerApiUrl(path: string): string {
  return `${getServerApiOrigin()}${path}`;
}

function summarizeValue(value: string | undefined): string {
  if (!value) {
    return "none";
  }
  if (value.length <= 12) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function validateSpotifyClientId(
  value: string,
): { ok: boolean; normalized: string; trimmed: boolean; message?: string } {
  const normalized = value.trim();
  const trimmed = normalized !== value;
  if (!normalized) {
    return {
      ok: false,
      normalized,
      trimmed,
      message: "Spotify Client ID is required.",
    };
  }
  if (!/^[0-9a-f]{32}$/i.test(normalized)) {
    return {
      ok: false,
      normalized,
      trimmed,
      message: "Spotify Client ID must be the 32-character Client ID from Spotify Developer Dashboard.",
    };
  }

  return {
    ok: true,
    normalized,
    trimmed,
  };
}

export function validateServiceOrigin(
  value: string,
): { ok: boolean; normalized?: string; trimmed: boolean; message?: string } {
  const trimmedValue = value.trim();
  const trimmed = trimmedValue !== value;
  try {
    const normalized = normalizeOrigin(trimmedValue, { requireHttps: false });
    return {
      ok: true,
      normalized,
      trimmed,
    };
  } catch (error) {
    return {
      ok: false,
      trimmed,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function readSelfHostConfig(): SelfHostConfig | null {
  const parsed = safeParseJson<unknown>(localStorage.getItem(SELF_HOST_CONFIG_KEY));
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const raw = parsed as Partial<SelfHostConfig>;
  const clientIdValidation = validateSpotifyClientId(String(raw.spotifyClientId ?? ""));
  if (!clientIdValidation.ok) {
    return null;
  }

  const mode = raw.mode === "custom-origin" ? "custom-origin" : "same-origin";
  if (mode === "custom-origin") {
    const originValidation = validateServiceOrigin(String(raw.serviceOrigin ?? ""));
    if (!originValidation.ok || !originValidation.normalized) {
      return null;
    }

    return {
      spotifyClientId: clientIdValidation.normalized,
      serviceOrigin: originValidation.normalized,
      mode,
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : nowMs(),
    };
  }

  return {
    spotifyClientId: clientIdValidation.normalized,
    serviceOrigin: getCurrentPageOrigin(),
    mode,
    updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : nowMs(),
  };
}

export function saveSelfHostConfig(config: SelfHostConfig): void {
  const clientIdValidation = validateSpotifyClientId(config.spotifyClientId);
  if (!clientIdValidation.ok) {
    throw new Error(clientIdValidation.message);
  }

  let nextMode: SelfHostConfig["mode"] = config.mode === "custom-origin" ? "custom-origin" : "same-origin";
  let nextServiceOrigin = getCurrentPageOrigin();

  if (nextMode === "custom-origin") {
    const originValidation = validateServiceOrigin(config.serviceOrigin);
    if (!originValidation.ok || !originValidation.normalized) {
      throw new Error(originValidation.message);
    }
    nextServiceOrigin = originValidation.normalized;
  }

  const payload: SelfHostConfig = {
    spotifyClientId: clientIdValidation.normalized,
    serviceOrigin: nextServiceOrigin,
    mode: nextMode,
    updatedAt: nowMs(),
  };
  localStorage.setItem(SELF_HOST_CONFIG_KEY, JSON.stringify(payload));
}

export function clearSelfHostConfig(): void {
  localStorage.removeItem(SELF_HOST_CONFIG_KEY);
}

function readServerSelfHostMeta(): ServerSelfHostMeta | null {
  const parsed = safeParseJson<unknown>(localStorage.getItem(SERVER_SELF_HOST_META_KEY));
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const raw = parsed as Partial<ServerSelfHostMeta>;
  const configSource =
    raw.configSource === "server" || raw.configSource === "runtime" || raw.configSource === "env"
      ? raw.configSource
      : raw.configSource === "missing"
        ? "missing"
        : null;
  const effectiveServiceOrigin =
    typeof raw.effectiveServiceOrigin === "string" && raw.effectiveServiceOrigin ? raw.effectiveServiceOrigin : "";
  const effectiveRedirectUri =
    typeof raw.effectiveRedirectUri === "string" && raw.effectiveRedirectUri ? raw.effectiveRedirectUri : "";

  if (!configSource || !effectiveServiceOrigin || !effectiveRedirectUri) {
    return null;
  }

  return {
    configSource,
    serverConfigPresent: raw.serverConfigPresent === true,
    effectiveSpotifyClientId:
      typeof raw.effectiveSpotifyClientId === "string" ? raw.effectiveSpotifyClientId : "",
    effectiveServiceOrigin,
    effectiveRedirectUri,
    hasMismatchWithAuthorizedSession: raw.hasMismatchWithAuthorizedSession === true,
    authorizedClientIdSummary:
      typeof raw.authorizedClientIdSummary === "string" ? raw.authorizedClientIdSummary : "none",
    authorizedServiceOriginSummary:
      typeof raw.authorizedServiceOriginSummary === "string" ? raw.authorizedServiceOriginSummary : "none",
    sessionAuthorized: raw.sessionAuthorized === true,
    grantedScopes: Array.isArray(raw.grantedScopes)
      ? raw.grantedScopes.filter((scope): scope is string => typeof scope === "string")
      : [],
    tokenExpiresAt: typeof raw.tokenExpiresAt === "string" ? raw.tokenExpiresAt : "none",
  };
}

function writeServerSelfHostMeta(payload: ServerSelfHostStateResponse): void {
  const snapshot: ServerSelfHostMeta = {
    configSource: payload.configSource,
    serverConfigPresent: payload.serverConfigPresent,
    effectiveSpotifyClientId: payload.effectiveSpotifyClientId,
    effectiveServiceOrigin: payload.effectiveServiceOrigin,
    effectiveRedirectUri: payload.effectiveRedirectUri,
    hasMismatchWithAuthorizedSession: payload.hasMismatchWithAuthorizedSession,
    authorizedClientIdSummary: payload.authorizedClientIdSummary,
    authorizedServiceOriginSummary: payload.authorizedServiceOriginSummary,
    sessionAuthorized: payload.sessionAuthorized,
    grantedScopes: payload.grantedScopes,
    tokenExpiresAt: payload.tokenExpiresAt,
  };
  localStorage.setItem(SERVER_SELF_HOST_META_KEY, JSON.stringify(snapshot));
}

export function getEffectiveConfigSource(): SelfHostConfigSource {
  if (isClientSpotifyAuthMode()) {
    if (readSelfHostConfig()) {
      return "runtime";
    }
    if (getEnvSpotifyClientId()) {
      return "env";
    }
    return "missing";
  }

  const serverMeta = readServerSelfHostMeta();
  if (serverMeta) {
    return serverMeta.configSource;
  }
  return "missing";
}

export function getEffectiveSpotifyClientId(): string {
  if (isClientSpotifyAuthMode()) {
    return readSelfHostConfig()?.spotifyClientId ?? getEnvSpotifyClientId();
  }

  const serverMeta = readServerSelfHostMeta();
  if (serverMeta) {
    return serverMeta.effectiveSpotifyClientId;
  }
  return "";
}

export function getEffectiveServiceOrigin(): string {
  if (isClientSpotifyAuthMode()) {
    return readSelfHostConfig()?.serviceOrigin ?? getCurrentPageOrigin();
  }

  const serverMeta = readServerSelfHostMeta();
  if (serverMeta) {
    return serverMeta.effectiveServiceOrigin;
  }
  return getCurrentPageOrigin();
}

export function getEffectiveRedirectUri(): string {
  if (isClientSpotifyAuthMode()) {
    return `${getEffectiveServiceOrigin()}${CLIENT_AUTH_CALLBACK_PATH}`;
  }

  const serverMeta = readServerSelfHostMeta();
  if (serverMeta) {
    return serverMeta.effectiveRedirectUri;
  }

  return `${getEffectiveServiceOrigin()}${SERVER_AUTH_CALLBACK_PATH}`;
}

export function getSpotifyClientId(): string {
  return getEffectiveSpotifyClientId();
}

function getRedirectUri(): string {
  return `${getEffectiveServiceOrigin()}${CLIENT_AUTH_CALLBACK_PATH}`;
}

function nowMs(): number {
  return Date.now();
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseRetryAfterMs(response: Response): number {
  const retryAfter = response.headers.get("Retry-After");
  if (!retryAfter) {
    return RETRY_AFTER_FALLBACK_MS;
  }

  const seconds = Number.parseInt(retryAfter, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return RETRY_AFTER_FALLBACK_MS;
  }

  return Math.max(1_000, seconds * 1_000);
}

function remainingRateLimitMs(): number {
  return Math.max(0, rateLimitUntilMs - nowMs());
}

function clearRateLimitWindow(): void {
  if (remainingRateLimitMs() <= 0) {
    rateLimitUntilMs = 0;
    lastRateLimitWindowMs = RATE_LIMIT_MIN_WINDOW_MS;
  }
}

function markRateLimited(retryAfterMs?: number): number {
  const baseDelay = Number.isFinite(retryAfterMs) ? Number(retryAfterMs) : RETRY_AFTER_FALLBACK_MS;
  const clampedFromHeader = Math.min(RATE_LIMIT_MAX_WINDOW_MS, Math.max(RATE_LIMIT_MIN_WINDOW_MS, baseDelay));
  const nextWindow =
    remainingRateLimitMs() > 0 ? Math.min(RATE_LIMIT_MAX_WINDOW_MS, Math.max(clampedFromHeader, lastRateLimitWindowMs * 2)) : clampedFromHeader;

  lastRateLimitWindowMs = nextWindow;
  rateLimitUntilMs = nowMs() + nextWindow;
  return nextWindow;
}

function getStoredPendingPkce(): PendingPkceMap {
  const sessionMap = safeParseJson<PendingPkceMap>(sessionStorage.getItem(PKCE_PENDING_KEY));
  if (sessionMap) {
    return sessionMap;
  }

  // Even App auth round-trips can return in a different WebView session.
  // Keep a localStorage mirror so PKCE state survives that handoff.
  return safeParseJson<PendingPkceMap>(localStorage.getItem(PKCE_PENDING_KEY)) ?? {};
}

function savePendingPkce(map: PendingPkceMap): void {
  const serialized = JSON.stringify(map);
  sessionStorage.setItem(PKCE_PENDING_KEY, serialized);
  localStorage.setItem(PKCE_PENDING_KEY, serialized);
}

function prunePendingPkce(map: PendingPkceMap): PendingPkceMap {
  const now = nowMs();
  const next: PendingPkceMap = {};

  for (const [state, value] of Object.entries(map)) {
    if (now - value.createdAt <= PKCE_MAX_AGE_MS) {
      next[state] = value;
    }
  }

  return next;
}

function setPendingPkce(state: string, verifier: string, redirectUri: string): void {
  const map: PendingPkceMap = {};
  map[state] = {
    verifier,
    createdAt: nowMs(),
    redirectUri,
  };
  savePendingPkce(map);
}

function getPendingPkceLookup(state: string): { record: PendingPkceRecord | null; expired: boolean } {
  const rawMap = getStoredPendingPkce();
  const hadRecord = !!rawMap[state];
  const map = prunePendingPkce(rawMap);
  savePendingPkce(map);
  return {
    record: map[state] ?? null,
    expired: hadRecord && !map[state],
  };
}

function removePendingPkceState(state: string): void {
  const map = prunePendingPkce(getStoredPendingPkce());
  delete map[state];
  savePendingPkce(map);
}

function readTokenBundle(): TokenBundle | null {
  return safeParseJson<TokenBundle>(localStorage.getItem(TOKEN_KEY));
}

function saveTokenBundle(tokens: TokenBundle): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function clearTokenBundle(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function clearRuntimeRateLimitedState(): void {
  clearRateLimitWindow();
}

async function fetchServerStatePayload(): Promise<ServerSelfHostStateResponse | null> {
  try {
    const response = await fetch(getServerApiUrl(SERVER_SELF_HOST_STATE_PATH), {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!payload || typeof payload !== "object" || !(payload as { ok?: boolean }).ok) {
      return null;
    }

    return payload as ServerSelfHostStateResponse;
  } catch {
    return null;
  }
}

async function postServerJson(path: string, payload?: unknown): Promise<Response | null> {
  try {
    return await fetch(getServerApiUrl(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  } catch {
    return null;
  }
}

function syncLocalSelfHostConfigFromServer(payload: ServerSelfHostStateResponse): void {
  writeServerSelfHostMeta(payload);
  localStorage.removeItem(SELF_HOST_CONFIG_KEY);
}

function removeLegacyServerTokenCopy(): void {
  clearTokenBundle();
}

function syncLastAuthErrorFromServer(payload: ServerSelfHostStateResponse): void {
  if (payload.lastError && typeof payload.lastError.code === "string" && typeof payload.lastError.message === "string") {
    setLastAuthError(payload.lastError);
    return;
  }

  clearLastAuthError();
}

function readAuthorizedMetadata():
  | {
      clientId: string;
      serviceOrigin: string;
    }
  | null {
  const bundle = readTokenBundle();
  if (!bundle?.authorized_client_id || !bundle?.authorized_service_origin) {
    return null;
  }

  return {
    clientId: bundle.authorized_client_id,
    serviceOrigin: bundle.authorized_service_origin,
  };
}

export function hasTokenBundle(): boolean {
  if (!isClientSpotifyAuthMode()) {
    return readServerSelfHostMeta()?.sessionAuthorized === true;
  }
  return !!readTokenBundle();
}

export function getRateLimitRemainingMs(): number {
  clearRateLimitWindow();
  return remainingRateLimitMs();
}

function parseScopeSet(value: string | undefined): Set<string> {
  if (!value) {
    return new Set<string>();
  }
  return new Set(
    value
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function hasGrantedScopes(requiredScopes: string[]): boolean {
  if (!isClientSpotifyAuthMode()) {
    const scopeSet = new Set(readServerSelfHostMeta()?.grantedScopes ?? []);
    return scopeSet.size > 0 && requiredScopes.every((scope) => scopeSet.has(scope));
  }
  const bundle = readTokenBundle();
  const scopeSet = parseScopeSet(bundle?.scope);
  if (scopeSet.size === 0) {
    return false;
  }
  return requiredScopes.every((scope) => scopeSet.has(scope));
}

export function clearSpotifySession(): void {
  sessionStorage.removeItem(PKCE_PENDING_KEY);
  localStorage.removeItem(PKCE_PENDING_KEY);
  clearTokenBundle();
  localStorage.removeItem(SERVER_SELF_HOST_META_KEY);
  localStorage.removeItem(LAST_ERROR_KEY);
  currentUserIdCache = "";
}

export function clearLastAuthError(): void {
  localStorage.removeItem(LAST_ERROR_KEY);
}

export function setLastAuthError(error: LastAuthError): void {
  localStorage.setItem(LAST_ERROR_KEY, JSON.stringify(error));
}

export function consumeLastAuthError(): LastAuthError | null {
  const parsed = safeParseJson<LastAuthError>(localStorage.getItem(LAST_ERROR_KEY));
  localStorage.removeItem(LAST_ERROR_KEY);
  return parsed;
}

export function peekLastAuthError(): LastAuthError | null {
  return safeParseJson<LastAuthError>(localStorage.getItem(LAST_ERROR_KEY));
}

export async function syncSelfHostStateFromServer(force = false): Promise<boolean> {
  if (isClientSpotifyAuthMode()) {
    return false;
  }

  removeLegacyServerTokenCopy();

  if (!force && serverStateSyncInFlight) {
    return serverStateSyncInFlight;
  }

  if (!force && nowMs() - lastServerStateSyncMs < SERVER_STATE_SYNC_COOLDOWN_MS) {
    return lastServerStateSyncResult;
  }

  const task = (async (): Promise<boolean> => {
    const payload = await fetchServerStatePayload();
    if (!payload) {
      lastServerStateSyncMs = nowMs();
      lastServerStateSyncResult = false;
      return false;
    }

    syncLocalSelfHostConfigFromServer(payload);
    removeLegacyServerTokenCopy();
    syncLastAuthErrorFromServer(payload);
    clearRuntimeRateLimitedState();

    lastServerStateSyncMs = nowMs();
    lastServerStateSyncResult = true;
    return true;
  })();

  serverStateSyncInFlight = task;

  try {
    return await task;
  } finally {
    if (serverStateSyncInFlight === task) {
      serverStateSyncInFlight = null;
    }
  }
}

export async function clearSpotifySessionOnServer(): Promise<boolean> {
  const response = await postServerJson(SERVER_SELF_HOST_SESSION_CLEAR_PATH, {});
  if (!response || response.status === 404) {
    return false;
  }

  await response.text();
  clearLastAuthError();
  clearTokenBundle();
  await syncSelfHostStateFromServer(true);
  return true;
}

export async function saveWebViewConfigOnServer(config: unknown): Promise<boolean> {
  const response = await postServerJson(SERVER_WEBVIEW_CONFIG_PATH, config);
  if (!response || response.status === 404) {
    return false;
  }

  const payload = (await response.json()) as { ok?: boolean; error?: { message?: string } };
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message || "Failed to save WebView config on the local server.");
  }

  return true;
}

export async function loadWebViewConfigFromServer<T = unknown>(): Promise<T | null> {
  try {
    const response = await fetch(getServerApiUrl(SERVER_WEBVIEW_CONFIG_PATH), {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { ok?: boolean; config?: T | null; error?: { message?: string } };
    if (!payload?.ok) {
      throw new Error(payload?.error?.message || "Failed to load WebView config from the local server.");
    }
    return payload.config ?? null;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}

export async function startSpotifyAuthWithServer(config: SelfHostConfig): Promise<boolean> {
  void config;
  const synced = await syncSelfHostStateFromServer(true);
  if (!synced || getEffectiveConfigSource() !== "server") {
    return false;
  }

  window.location.assign(getServerApiUrl(SERVER_AUTH_START_PATH));
  return true;
}

export function isCustomOriginBlocked(): boolean {
  return false;
}

export function hasAuthorizedSessionMismatch(): boolean {
  if (!isClientSpotifyAuthMode()) {
    return readServerSelfHostMeta()?.hasMismatchWithAuthorizedSession === true;
  }
  const bundle = readTokenBundle();
  if (!bundle?.authorized_client_id || !bundle?.authorized_service_origin) {
    return false;
  }

  return (
    bundle.authorized_client_id !== getEffectiveSpotifyClientId() ||
    bundle.authorized_service_origin !== getEffectiveServiceOrigin()
  );
}

export function getEffectiveConfigState(): EffectiveConfigState {
  return {
    source: getEffectiveConfigSource(),
    spotifyClientId: getEffectiveSpotifyClientId(),
    serviceOrigin: getEffectiveServiceOrigin(),
    redirectUri: getEffectiveRedirectUri(),
    hasMismatchWithAuthorizedSession: hasAuthorizedSessionMismatch(),
  };
}

export function getSelfHostDiagnostics(buildVersion: string): SelfHostDiagnostics {
  const effective = getEffectiveConfigState();
  const serverMeta = isClientSpotifyAuthMode() ? null : readServerSelfHostMeta();
  const authorized = readAuthorizedMetadata();
  const bundle = readTokenBundle();
  const lastError = peekLastAuthError();

  return {
    buildVersion,
    currentPageOrigin: getCurrentPageOrigin(),
    configSource: effective.source,
    effectiveServiceOrigin: effective.serviceOrigin,
    effectiveRedirectUri: effective.redirectUri,
    authorizedClientIdSummary: serverMeta?.authorizedClientIdSummary ?? summarizeValue(authorized?.clientId),
    authorizedServiceOriginSummary:
      serverMeta?.authorizedServiceOriginSummary ?? summarizeValue(authorized?.serviceOrigin),
    clientNow: new Date(nowMs()).toISOString(),
    tokenExpiresAt: serverMeta?.tokenExpiresAt ??
      (bundle && Number.isFinite(Number(bundle.expires_at)) ? new Date(Number(bundle.expires_at)).toISOString() : "none"),
    lastErrorCode: lastError?.code ?? "none",
    lastErrorMessage: lastError?.message ?? "",
  };
}

export function openSpotifyLoginPage(): void {
  const loginUrl = new URL("https://accounts.spotify.com/en/login");
  // Open login in the same WebView to increase cookie/session reuse chance.
  loginUrl.searchParams.set("continue", `${window.location.origin}/`);
  window.location.assign(loginUrl.toString());
}

async function sha256Base64Url(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const subtleDigest = globalThis.crypto?.subtle?.digest;
  if (typeof subtleDigest === "function") {
    const digest = await subtleDigest.call(globalThis.crypto.subtle, "SHA-256", data);
    return base64UrlEncode(new Uint8Array(digest));
  }

  // Some phone WebViews expose crypto.getRandomValues but not crypto.subtle on HTTP/local pages.
  // PKCE still needs SHA-256, so fall back to a local implementation instead of failing auth init.
  return base64UrlEncode(sha256Fallback(data));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBase64Url(bytesLength: number): string {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
    throw new Error("Missing crypto.getRandomValues");
  }
  const bytes = new Uint8Array(bytesLength);
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function rightRotate(value: number, amount: number): number {
  return ((value >>> amount) | (value << (32 - amount))) >>> 0;
}

function sha256Fallback(data: Uint8Array): Uint8Array {
  const bitLength = data.length * 8;
  const paddedLength = Math.ceil((data.length + 9) / SHA256_BLOCK_BYTES) * SHA256_BLOCK_BYTES;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;

  const bitLengthHigh = Math.floor(bitLength / 0x100000000);
  const bitLengthLow = bitLength >>> 0;
  const lengthOffset = paddedLength - 8;

  padded[lengthOffset] = (bitLengthHigh >>> 24) & 0xff;
  padded[lengthOffset + 1] = (bitLengthHigh >>> 16) & 0xff;
  padded[lengthOffset + 2] = (bitLengthHigh >>> 8) & 0xff;
  padded[lengthOffset + 3] = bitLengthHigh & 0xff;
  padded[lengthOffset + 4] = (bitLengthLow >>> 24) & 0xff;
  padded[lengthOffset + 5] = (bitLengthLow >>> 16) & 0xff;
  padded[lengthOffset + 6] = (bitLengthLow >>> 8) & 0xff;
  padded[lengthOffset + 7] = bitLengthLow & 0xff;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const words = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += SHA256_BLOCK_BYTES) {
    for (let i = 0; i < 16; i += 1) {
      const base = offset + i * 4;
      words[i] =
        ((padded[base] << 24) | (padded[base + 1] << 16) | (padded[base + 2] << 8) | padded[base + 3]) >>> 0;
    }

    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(words[i - 15], 7) ^ rightRotate(words[i - 15], 18) ^ (words[i - 15] >>> 3);
      const s1 = rightRotate(words[i - 2], 17) ^ rightRotate(words[i - 2], 19) ^ (words[i - 2] >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + words[i]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const output = new Uint8Array(SHA256_OUTPUT_BYTES);
  const hashes = [h0, h1, h2, h3, h4, h5, h6, h7];

  for (let i = 0; i < hashes.length; i += 1) {
    const hash = hashes[i];
    const base = i * 4;
    output[base] = (hash >>> 24) & 0xff;
    output[base + 1] = (hash >>> 16) & 0xff;
    output[base + 2] = (hash >>> 8) & 0xff;
    output[base + 3] = hash & 0xff;
  }

  return output;
}

export async function startSpotifyAuth(): Promise<void> {
  const clientId = getEffectiveSpotifyClientId();
  if (!clientId) {
    throw new Error("Missing Spotify Client ID");
  }

  if (hasAuthorizedSessionMismatch()) {
    throw new Error("Client ID / Origin changed. Clear Session first.");
  }

  const state = randomBase64Url(16);
  const verifier = randomBase64Url(64);
  const challenge = await sha256Base64Url(verifier);
  const redirectUri = getRedirectUri();

  setPendingPkce(state, verifier, redirectUri);

  const url = new URL(SPOTIFY_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  // Prefer silent auth when possible (already logged in + previously consented).
  // This still depends on whether the current WebView shares Spotify login cookies.
  url.searchParams.set("show_dialog", "false");

  window.location.assign(url.toString());
}

function createShortCode(error: string, suffix?: string): string {
  return suffix ? `${error}:${suffix}` : error;
}

function toTokenBundle(
  data: Record<string, unknown>,
  previousRefreshToken?: string,
  previousScope?: string,
): TokenBundle | null {
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  if (!accessToken) {
    return null;
  }

  const expiresIn = Number(data.expires_in);
  const expiresAt = Number.isFinite(expiresIn) ? nowMs() + expiresIn * 1_000 : Number.NaN;
  const refreshToken =
    typeof data.refresh_token === "string" && data.refresh_token
      ? data.refresh_token
      : previousRefreshToken;

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: typeof data.token_type === "string" ? data.token_type : undefined,
    scope: typeof data.scope === "string" ? data.scope : previousScope,
    expires_at: expiresAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseResponseBody(raw: string): unknown {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function bodyMessage(body: unknown): string {
  if (!isRecord(body)) {
    return "";
  }

  const directError = body.error;
  if (typeof directError === "string") {
    return directError;
  }

  if (isRecord(directError)) {
    const nestedMessage = (directError as Record<string, unknown>).message;
    if (typeof nestedMessage === "string") {
      return nestedMessage;
    }
  }

  const message = body.message;
  return typeof message === "string" ? message : "";
}

function classifyHttpError(status: number, body: unknown): SpotifyErrorCode {
  const msg = bodyMessage(body).toLowerCase();

  if (status === 401) {
    return "AUTH_EXPIRED";
  }

  if (status === 429) {
    return "RATE_LIMITED";
  }

  if (status === 404 && msg.includes(NO_ACTIVE_DEVICE_HINT)) {
    return "NO_ACTIVE_DEVICE";
  }

  if (status === 403 && msg.includes(NO_ACTIVE_DEVICE_HINT)) {
    return "NO_ACTIVE_DEVICE";
  }

  if (status === 403 && msg.includes(PREMIUM_HINT)) {
    return "PREMIUM_REQUIRED";
  }

  if (status === 404) {
    return "NO_ACTIVE_DEVICE";
  }

  return "UNKNOWN";
}

export async function exchangeCodeForTokenFromCallback(
  searchParams: URLSearchParams,
): Promise<CallbackExchangeResult> {
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const callbackError = searchParams.get("error");
  const callbackErrorDescription = searchParams.get("error_description") ?? "";

  if (callbackError) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      shortCode: "token_exchange_failed",
      detail: callbackErrorDescription,
    };
  }

  if (!state) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      shortCode: "pkce_state_missing",
      detail: "Missing login state. Please start the login again.",
    };
  }

  if (!code) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      shortCode: "token_exchange_failed",
      detail: "Missing authorization code.",
    };
  }

  const pendingLookup = getPendingPkceLookup(state);
  if (!pendingLookup.record) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      shortCode: pendingLookup.expired ? "pkce_pending_expired" : "pkce_state_mismatch",
      detail: pendingLookup.expired
        ? "The login attempt expired. Please start again."
        : "Authorization state mismatch. Please retry.",
    };
  }
  const pending = pendingLookup.record;

  const clientId = getEffectiveSpotifyClientId();
  if (!clientId) {
    return {
      ok: false,
      error: "AUTH_REQUIRED",
      shortCode: "missing_client_id",
      detail: "Missing Spotify Client ID.",
    };
  }

  try {
    const params = new URLSearchParams();
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    params.set("redirect_uri", pending.redirectUri || getRedirectUri());
    params.set("client_id", clientId);
    params.set("code_verifier", pending.verifier);

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const rawText = await response.text();
    const body = parseResponseBody(rawText);

    if (!response.ok) {
      const errorCode = classifyHttpError(response.status, body);
      return {
        ok: false,
        error: errorCode,
        shortCode: createShortCode(errorCode, `exchange_${response.status}`),
        detail: bodyMessage(body) || rawText || "Token exchange failed.",
      };
    }

    if (!isRecord(body)) {
      return {
        ok: false,
        error: "AUTH_REQUIRED",
        shortCode: createShortCode("AUTH_REQUIRED", "invalid_token_payload"),
        detail: "Token payload missing access_token.",
      };
    }

    const tokens = toTokenBundle(body);
    if (!tokens) {
      return {
        ok: false,
        error: "AUTH_REQUIRED",
        shortCode: "token_exchange_failed",
        detail: "Token payload missing access_token.",
      };
    }

    saveTokenBundle({
      ...tokens,
      authorized_client_id: clientId,
      authorized_service_origin: getEffectiveServiceOrigin(),
    });
    removePendingPkceState(state);

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: "NETWORK",
      shortCode: "network_error",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

type AccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: SpotifyErrorCode; retryAfterMs?: number };

async function refreshAccessToken(bundle: TokenBundle): Promise<AccessTokenResult> {
  const refreshToken = bundle.refresh_token;
  const clientId = getSpotifyClientId();

  if (!refreshToken || !clientId) {
    clearTokenBundle();
    return { ok: false, error: "AUTH_EXPIRED" };
  }

  const params = new URLSearchParams();
  params.set("grant_type", "refresh_token");
  params.set("refresh_token", refreshToken);
  params.set("client_id", clientId);

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const rawText = await response.text();
    const body = parseResponseBody(rawText);

    if (!response.ok) {
      if (response.status === 429) {
        return {
          ok: false,
          error: "RATE_LIMITED",
          retryAfterMs: markRateLimited(parseRetryAfterMs(response)),
        };
      }

      clearTokenBundle();
      return { ok: false, error: "AUTH_EXPIRED" };
    }

    if (!isRecord(body)) {
      clearTokenBundle();
      return { ok: false, error: "AUTH_EXPIRED" };
    }

    const nextBundle = toTokenBundle(body, refreshToken, bundle.scope);
    if (!nextBundle) {
      clearTokenBundle();
      return { ok: false, error: "AUTH_EXPIRED" };
    }

    if (!Number.isFinite(nextBundle.expires_at)) {
      clearTokenBundle();
      return { ok: false, error: "AUTH_EXPIRED" };
    }

    saveTokenBundle({
      ...nextBundle,
      authorized_client_id: bundle.authorized_client_id,
      authorized_service_origin: bundle.authorized_service_origin,
    });
    return { ok: true, accessToken: nextBundle.access_token };
  } catch {
    clearTokenBundle();
    return { ok: false, error: "AUTH_EXPIRED" };
  }
}

export async function ensureValidAccessToken(): Promise<AccessTokenResult> {
  let bundle = readTokenBundle();

  if (!bundle || !bundle.access_token) {
    await syncSelfHostStateFromServer();
    bundle = readTokenBundle();
  }

  if (!bundle || !bundle.access_token) {
    return { ok: false, error: "AUTH_REQUIRED" };
  }

  const expiresAt = Number(bundle.expires_at);
  const invalidExpiry = !Number.isFinite(expiresAt);
  const expiringSoon = !invalidExpiry && expiresAt - nowMs() <= REFRESH_THRESHOLD_MS;

  if (!invalidExpiry && !expiringSoon) {
    return { ok: true, accessToken: bundle.access_token };
  }

  return refreshAccessToken(bundle);
}

type ApiRequestResult = {
  ok: boolean;
  status: number;
  body: unknown;
  retryAfterMs?: number;
  error?: SpotifyErrorCode;
};

function readServerProxyError(body: unknown, status: number): SpotifyErrorCode {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.code === "string") {
    const code = body.error.code;
    if (
      code === "AUTH_REQUIRED" ||
      code === "AUTH_EXPIRED" ||
      code === "RATE_LIMITED" ||
      code === "NETWORK" ||
      code === "NO_ACTIVE_DEVICE" ||
      code === "PREMIUM_REQUIRED" ||
      code === "UNKNOWN"
    ) {
      return code;
    }
  }
  return classifyHttpError(status, body);
}

async function doServerSpotifyRequest(path: string, init: RequestInit): Promise<ApiRequestResult> {
  let requestBody: unknown = null;
  if (typeof init.body === "string") {
    requestBody = parseResponseBody(init.body);
  } else if (init.body !== null && init.body !== undefined) {
    return { ok: false, status: 0, body: null, error: "UNKNOWN" };
  }

  try {
    const response = await fetch(getServerApiUrl(SERVER_SPOTIFY_PROXY_PATH), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        method: String(init.method || "GET").toUpperCase(),
        body: requestBody,
      }),
      cache: "no-store",
    });

    if (response.status === 204 || response.status === 202) {
      clearRateLimitWindow();
      return { ok: true, status: response.status, body: null };
    }

    const text = await response.text();
    const body = parseResponseBody(text);
    if (response.ok) {
      clearRateLimitWindow();
      return { ok: true, status: response.status, body };
    }

    const mapped = readServerProxyError(body, response.status);
    const retryAfterMs = mapped === "RATE_LIMITED" ? markRateLimited(parseRetryAfterMs(response)) : undefined;
    if (mapped === "AUTH_REQUIRED" || mapped === "AUTH_EXPIRED") {
      await syncSelfHostStateFromServer(true);
    }
    return {
      ok: false,
      status: response.status,
      body,
      error: mapped,
      retryAfterMs,
    };
  } catch {
    return { ok: false, status: 0, body: null, error: "NETWORK" };
  }
}

async function doSpotifyRequest(path: string, init: RequestInit): Promise<ApiRequestResult> {
  const activeRateLimitMs = remainingRateLimitMs();
  if (activeRateLimitMs > 0) {
    return {
      ok: false,
      status: 429,
      body: null,
      error: "RATE_LIMITED",
      retryAfterMs: activeRateLimitMs,
    };
  }

  if (!isClientSpotifyAuthMode()) {
    return doServerSpotifyRequest(path, init);
  }

  const tokenResult = await ensureValidAccessToken();
  if (!tokenResult.ok) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: tokenResult.error,
      retryAfterMs: tokenResult.retryAfterMs,
    };
  }

  try {
    const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (response.status === 204 || response.status === 202) {
      clearRateLimitWindow();
      return {
        ok: true,
        status: response.status,
        body: null,
      };
    }

    const text = await response.text();
    const body = parseResponseBody(text);

    if (response.ok) {
      clearRateLimitWindow();
      return {
        ok: true,
        status: response.status,
        body,
      };
    }

    const mapped = classifyHttpError(response.status, body);
    const retryAfterMs = mapped === "RATE_LIMITED" ? markRateLimited(parseRetryAfterMs(response)) : undefined;
    if (mapped === "AUTH_EXPIRED") {
      clearTokenBundle();
    }

    return {
      ok: false,
      status: response.status,
      body,
      error: mapped,
      retryAfterMs,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      body: null,
      error: "NETWORK",
    };
  }
}

function normalizePlayback(body: unknown): PlaybackState {
  if (!isRecord(body)) {
    return null;
  }

  const isPlaying = body.is_playing === true;
  const item = isRecord(body.item) ? body.item : null;
  const device = isRecord(body.device) ? body.device : null;
  const context = isRecord(body.context) ? body.context : null;
  const shuffleEnabled = body.shuffle_state === true;
  const repeatRaw = body.repeat_state;
  const repeatMode: RepeatMode =
    repeatRaw === "context" || repeatRaw === "track" || repeatRaw === "off" ? repeatRaw : "off";
  const deviceName = device && typeof device.name === "string" && device.name ? device.name : "";
  const contextUri = context && typeof context.uri === "string" && context.uri ? context.uri : "";
  const progressMs = typeof body.progress_ms === "number" && Number.isFinite(body.progress_ms) ? Math.max(0, Math.round(body.progress_ms)) : 0;

  if (!item) {
    return {
      trackId: "unknown",
      title: "Unavailable content",
      artists: "Spotify",
      isPlaying,
      contextUri,
      deviceName,
      albumImageUrl: "",
      progressMs,
      durationMs: 0,
      shuffleEnabled,
      repeatMode,
      liked: null,
    };
  }

  const title = typeof item.name === "string" && item.name ? item.name : "Unknown title";
  const trackId = typeof item.id === "string" && item.id ? item.id : "unknown";

  const artistsRaw = Array.isArray(item.artists) ? item.artists : [];
  const artists = artistsRaw
    .map((artist) => {
      if (!artist || typeof artist !== "object") {
        return "";
      }
      const name = (artist as Record<string, unknown>).name;
      return typeof name === "string" ? name : "";
    })
    .filter(Boolean)
    .join(", ");

  let albumImageUrl = "";
  const durationMs =
    typeof item.duration_ms === "number" && Number.isFinite(item.duration_ms) ? Math.max(0, Math.round(item.duration_ms)) : 0;
  const album = isRecord(item.album) ? item.album : null;
  if (album && Array.isArray(album.images)) {
    for (const image of album.images) {
      if (isRecord(image) && typeof image.url === "string" && image.url) {
        albumImageUrl = image.url;
        break;
      }
    }
  }

  return {
    trackId,
    title,
    artists: artists || "Unknown artist",
    isPlaying,
    contextUri,
    deviceName,
    albumImageUrl,
    progressMs,
    durationMs,
    shuffleEnabled,
    repeatMode,
    liked: null,
  };
}

function normalizePlaylistSummary(item: unknown): PlaylistSummary | null {
  if (!isRecord(item)) {
    return null;
  }

  const id = typeof item.id === "string" && item.id ? item.id : "";
  const name = typeof item.name === "string" && item.name ? item.name : "";
  if (!id || !name) {
    return null;
  }

  const owner = isRecord(item.owner) ? item.owner : null;
  const ownerName =
    owner && typeof owner.display_name === "string" && owner.display_name
      ? owner.display_name
      : owner && typeof owner.id === "string" && owner.id
        ? owner.id
        : "";
  const playlistItems = isRecord(item.items) ? item.items : isRecord(item.tracks) ? item.tracks : null;
  const trackCount =
    playlistItems && typeof playlistItems.total === "number" && Number.isFinite(playlistItems.total)
      ? Math.max(0, Math.round(playlistItems.total))
      : 0;
  const uri = typeof item.uri === "string" && item.uri ? item.uri : null;

  let coverUrl: string | null = null;
  if (Array.isArray(item.images)) {
    for (const image of item.images) {
      if (isRecord(image) && typeof image.url === "string" && image.url) {
        coverUrl = image.url;
        break;
      }
    }
  }

  return {
    id,
    name,
    ownerName,
    trackCount,
    coverUrl,
    uri,
    kind: "playlist",
  };
}

function normalizeDeviceSummary(item: unknown): DeviceSummary | null {
  if (!isRecord(item)) {
    return null;
  }

  const id = typeof item.id === "string" && item.id ? item.id : "";
  const name = typeof item.name === "string" && item.name ? item.name : "";
  if (!id || !name) {
    return null;
  }

  const type = typeof item.type === "string" && item.type ? item.type : "Device";
  const isActive = item.is_active === true;
  const isRestricted = item.is_restricted === true;

  return {
    id,
    name,
    type,
    isActive,
    isRestricted,
  };
}

export async function getUserPlaylists(limit = 9): Promise<PlaylistResult> {
  const safeLimit = Math.max(1, Math.min(50, Math.round(limit)));
  const result = await doSpotifyRequest(`/me/playlists?limit=${safeLimit}`, { method: "GET" });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "UNKNOWN",
      retryAfterMs: result.retryAfterMs,
      message: bodyMessage(result.body),
    };
  }

  if (!isRecord(result.body) || !Array.isArray(result.body.items)) {
    return { ok: true, playlists: [] };
  }

  const playlists = result.body.items.map(normalizePlaylistSummary).filter((item): item is PlaylistSummary => item !== null);
  return { ok: true, playlists };
}

export async function getAvailableDevices(): Promise<DeviceResult> {
  const result = await doSpotifyRequest("/me/player/devices", { method: "GET" });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "UNKNOWN",
      retryAfterMs: result.retryAfterMs,
      message: bodyMessage(result.body),
    };
  }

  if (!isRecord(result.body) || !Array.isArray(result.body.devices)) {
    return { ok: true, devices: [] };
  }

  const devices = result.body.devices.map(normalizeDeviceSummary).filter((item): item is DeviceSummary => item !== null);
  return { ok: true, devices };
}

async function getPlayableSavedTrackUris(limit = 50): Promise<
  | { ok: true; uris: string[] }
  | { ok: false; error: SpotifyErrorCode; retryAfterMs?: number; message?: string }
> {
  const safeLimit = Math.max(1, Math.min(50, Math.round(limit)));
  const result = await doSpotifyRequest(`/me/tracks?limit=${safeLimit}&market=from_token`, { method: "GET" });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "UNKNOWN",
      retryAfterMs: result.retryAfterMs,
      message: bodyMessage(result.body),
    };
  }

  if (!isRecord(result.body) || !Array.isArray(result.body.items) || result.body.items.length === 0) {
    return { ok: true, uris: [] };
  }

  const playableUris: string[] = [];
  for (const item of result.body.items) {
    if (!isRecord(item) || !isRecord(item.track)) {
      continue;
    }

    if (item.track.is_local === true) {
      continue;
    }

    if (item.track.is_playable === false) {
      continue;
    }

    if (typeof item.track.uri === "string" && item.track.uri) {
      playableUris.push(item.track.uri);
    }
  }

  return { ok: true, uris: playableUris };
}

export async function getPlaybackState(): Promise<PlaybackResult> {
  const first = await doSpotifyRequest("/me/player", { method: "GET" });

  if (first.ok && first.status !== 204 && first.body) {
    const playback = normalizePlayback(first.body);
    return { ok: true, playback };
  }

  if (!first.ok && first.error && first.error !== "NO_ACTIVE_DEVICE") {
    return {
      ok: false,
      error: first.error,
      retryAfterMs: first.retryAfterMs,
      message: bodyMessage(first.body),
    };
  }

  const fallback = await doSpotifyRequest("/me/player/currently-playing", { method: "GET" });

  if (fallback.ok) {
    if (fallback.status === 204 || !fallback.body) {
      return { ok: true, playback: null };
    }

    const playback = normalizePlayback(fallback.body);
    return { ok: true, playback };
  }

  if (fallback.error) {
    return {
      ok: false,
      error: fallback.error,
      retryAfterMs: fallback.retryAfterMs,
      message: bodyMessage(fallback.body),
    };
  }

  return { ok: true, playback: null };
}

async function runControlRequest(path: string, method: "POST" | "PUT" | "DELETE"): Promise<ControlResult> {
  const result = await doSpotifyRequest(path, { method });

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    error: result.error ?? "UNKNOWN",
    retryAfterMs: result.retryAfterMs,
    message: bodyMessage(result.body),
  };
}

async function runJsonControlRequest(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body: Record<string, unknown>,
): Promise<ControlResult> {
  const result = await doSpotifyRequest(path, {
    method,
    body: JSON.stringify(body),
  });

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    error: result.error ?? "UNKNOWN",
    retryAfterMs: result.retryAfterMs,
    message: bodyMessage(result.body),
  };
}

async function getCurrentUserId(): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: SpotifyErrorCode; retryAfterMs?: number; message?: string }
> {
  if (currentUserIdCache) {
    return { ok: true, userId: currentUserIdCache };
  }

  const result = await doSpotifyRequest("/me", { method: "GET" });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "UNKNOWN",
      retryAfterMs: result.retryAfterMs,
      message: bodyMessage(result.body),
    };
  }

  if (!isRecord(result.body) || typeof result.body.id !== "string" || !result.body.id) {
    return { ok: false, error: "UNKNOWN", message: "Missing current user id." };
  }

  currentUserIdCache = result.body.id;
  return { ok: true, userId: currentUserIdCache };
}

function withOptionalDeviceId(path: string, deviceId?: string): string {
  if (!deviceId) {
    return path;
  }
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}device_id=${encodeURIComponent(deviceId)}`;
}

export async function togglePlayPause(current: PlaybackState): Promise<ControlResult> {
  const shouldPause = current?.isPlaying === true;
  return runControlRequest(shouldPause ? "/me/player/pause" : "/me/player/play", "PUT");
}

export async function previousTrack(): Promise<ControlResult> {
  return runControlRequest("/me/player/previous", "POST");
}

export async function nextTrack(): Promise<ControlResult> {
  return runControlRequest("/me/player/next", "POST");
}

export async function setShuffle(enabled: boolean): Promise<ControlResult> {
  return runControlRequest(`/me/player/shuffle?state=${enabled ? "true" : "false"}`, "PUT");
}

export async function setRepeat(mode: RepeatMode): Promise<ControlResult> {
  return runControlRequest(`/me/player/repeat?state=${mode}`, "PUT");
}

export async function transferPlayback(deviceId: string, play: boolean): Promise<ControlResult> {
  if (!deviceId) {
    return { ok: false, error: "NO_ACTIVE_DEVICE", message: "Missing target device." };
  }
  return runJsonControlRequest("/me/player", "PUT", {
    device_ids: [deviceId],
    play,
  });
}

export async function playPlaylistContext(contextUri: string, deviceId?: string): Promise<ControlResult> {
  if (!contextUri) {
    return { ok: false, error: "UNKNOWN", message: "Missing playlist context." };
  }

  return runJsonControlRequest(withOptionalDeviceId("/me/player/play", deviceId), "PUT", {
    context_uri: contextUri,
    offset: { position: 0 },
  });
}

export async function playFirstLikedSong(deviceId?: string): Promise<ControlResult> {
  const currentUser = await getCurrentUserId();
  let collectionAttempt: ControlResult | null = null;
  if (currentUser.ok && currentUser.userId) {
    collectionAttempt = await runJsonControlRequest(withOptionalDeviceId("/me/player/play", deviceId), "PUT", {
      context_uri: `spotify:user:${currentUser.userId}:collection`,
    });
    if (collectionAttempt.ok) {
      return collectionAttempt;
    }
  }

  const savedTracks = await getPlayableSavedTrackUris();

  if (!savedTracks.ok) {
    return {
      ok: false,
      error: savedTracks.error,
      retryAfterMs: savedTracks.retryAfterMs,
      message: savedTracks.message,
    };
  }

  if (savedTracks.uris.length === 0) {
    return { ok: false, error: "UNKNOWN", message: "No saved tracks to play." };
  }

  const urisAttempt = await runJsonControlRequest(withOptionalDeviceId("/me/player/play", deviceId), "PUT", {
    uris: savedTracks.uris.slice(0, 50),
  });
  if (urisAttempt.ok) {
    return urisAttempt;
  }

  const messages = [collectionAttempt?.message, urisAttempt.message, !currentUser.ok ? currentUser.message : ""].filter(Boolean);
  return {
    ok: false,
    error: urisAttempt.error ?? collectionAttempt?.error ?? (!currentUser.ok ? currentUser.error : "UNKNOWN"),
    retryAfterMs: urisAttempt.retryAfterMs ?? collectionAttempt?.retryAfterMs ?? (!currentUser.ok ? currentUser.retryAfterMs : undefined),
    message: messages.join(" | ") || "Failed to start Liked Songs playback.",
  };
}

export function getNextRepeatMode(current: RepeatMode): RepeatMode {
  if (current === "off") {
    return "track";
  }
  if (current === "track") {
    return "context";
  }
  return "off";
}

export async function setTrackLiked(trackId: string, liked: boolean): Promise<ControlResult> {
  if (!trackId || trackId === "unknown") {
    return { ok: false, error: "NO_ACTIVE_DEVICE", message: "No valid track for like operation." };
  }

  return runJsonControlRequest("/me/library", liked ? "PUT" : "DELETE", {
    uris: [`spotify:track:${trackId}`],
  });
}

export function getErrorMessage(code: SpotifyErrorCode): string {
  switch (code) {
    case "AUTH_REQUIRED":
      return "Please authorize Spotify on phone.";
    case "AUTH_EXPIRED":
      return "Spotify session expired. Re-authorize on phone.";
    case "NO_ACTIVE_DEVICE":
      return "No active Spotify device.";
    case "PREMIUM_REQUIRED":
      return "Spotify Premium required.";
    case "NETWORK":
      return "Network issue. Check phone browser.";
    case "RATE_LIMITED":
      return "Rate limited. Backing off before retry.";
    default:
      return "Spotify error. Resolve in phone browser.";
  }
}
