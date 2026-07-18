import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TEST_DIR, '..');
const SERVER_FILE = path.join(ROOT_DIR, 'server', 'local-server.mjs');
const OWNER_LOGIN = 'test-tailnet-owner';
const SERVICE_ORIGIN = 'https://device.example.ts.net';

async function reservePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const address = listener.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  await new Promise((resolve, reject) => listener.close((error) => (error ? reject(error) : resolve())));
  return port;
}

async function waitForHealth(baseUrl, child, output) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early (${child.exitCode}).\n${output.join('')}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for server.\n${output.join('')}`);
}

async function stopChild(child) {
  if (child.exitCode !== null) {
    return;
  }
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

function protectedHeaders(extra = {}) {
  return {
    'Tailscale-User-Login': OWNER_LOGIN,
    ...extra,
  };
}

test('self-host server keeps tokens server-side and enforces its API boundary', async () => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'spotify-control-security-'));
  const stateDir = path.join(temporaryRoot, 'state');
  const configFile = path.join(temporaryRoot, 'self-host.config.json');
  const stateFile = path.join(stateDir, 'state.json');
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const output = [];
  let child;

  try {
    await fs.mkdir(stateDir, { mode: 0o755 });
    await fs.writeFile(
      configFile,
      `${JSON.stringify({
        spotifyClientId: 'a'.repeat(32),
        serviceOrigin: SERVICE_ORIGIN,
        allowedTailscaleUsers: [OWNER_LOGIN],
        allowedOrigins: ['null', 'https://app.example.com', 'http://127.0.0.1:*'],
        localPort: port,
        mode: 'custom-origin',
      }, null, 2)}\n`,
    );
    await fs.writeFile(
      stateFile,
      `${JSON.stringify({
        config: null,
        pending: null,
        tokens: {
          access_token: 'test-access-token-must-not-leak',
          refresh_token: 'test-refresh-token-must-not-leak',
          token_type: 'Bearer',
          scope: 'user-read-playback-state user-library-read user-library-modify',
          expires_at: Date.now() + 60 * 60 * 1000,
          authorized_client_id: 'a'.repeat(32),
          authorized_service_origin: SERVICE_ORIGIN,
        },
        lastError: null,
      }, null, 2)}\n`,
      { mode: 0o644 },
    );

    child = spawn(process.execPath, [SERVER_FILE], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(port),
        STATE_DIR: stateDir,
        SELF_HOST_CONFIG_FILE: configFile,
        ENABLE_CLIENT_DEBUG_LOGS: '0',
        BUILD_VERSION: 'security-test',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));
    await waitForHealth(baseUrl, child, output);

    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('access-control-allow-origin'), null);
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');

    const noIdentity = await fetch(`${baseUrl}/api/self-host/state`);
    assert.equal(noIdentity.status, 403);

    const wrongIdentity = await fetch(`${baseUrl}/api/self-host/state`, {
      headers: { 'Tailscale-User-Login': 'denied-tailnet-user' },
    });
    assert.equal(wrongIdentity.status, 403);

    const stateResponse = await fetch(`${baseUrl}/api/self-host/state`, {
      headers: protectedHeaders(),
    });
    assert.equal(stateResponse.status, 200);
    const state = await stateResponse.json();
    const serializedState = JSON.stringify(state);
    assert.equal(state.sessionAuthorized, true);
    assert.deepEqual(state.grantedScopes, [
      'user-read-playback-state',
      'user-library-read',
      'user-library-modify',
    ]);
    assert.equal(Object.hasOwn(state, 'tokenBundle'), false);
    assert.equal(serializedState.includes('test-access-token-must-not-leak'), false);
    assert.equal(serializedState.includes('test-refresh-token-must-not-leak'), false);
    assert.equal(/\"(?:access_token|refresh_token)\"\s*:/.test(serializedState), false);
    assert.equal((await fs.stat(stateFile)).mode & 0o777, 0o600);

    const opaqueOrigin = await fetch(`${baseUrl}/api/self-host/state`, {
      headers: protectedHeaders({ Origin: 'null' }),
    });
    assert.equal(opaqueOrigin.status, 200);
    assert.equal(opaqueOrigin.headers.get('access-control-allow-origin'), 'null');

    const deniedOrigin = await fetch(`${baseUrl}/api/self-host/state`, {
      headers: protectedHeaders({ Origin: 'https://evil.example' }),
    });
    assert.equal(deniedOrigin.status, 403);
    assert.equal(deniedOrigin.headers.get('access-control-allow-origin'), null);

    const evenHubLoopbackOrigin = await fetch(`${baseUrl}/api/self-host/state`, {
      headers: protectedHeaders({ Origin: 'http://127.0.0.1:61642' }),
    });
    assert.equal(evenHubLoopbackOrigin.status, 200);
    assert.equal(evenHubLoopbackOrigin.headers.get('access-control-allow-origin'), 'http://127.0.0.1:61642');

    const anotherEvenHubLoopbackPort = await fetch(`${baseUrl}/api/self-host/state`, {
      headers: protectedHeaders({ Origin: 'http://127.0.0.1:49152' }),
    });
    assert.equal(anotherEvenHubLoopbackPort.status, 200);
    assert.equal(anotherEvenHubLoopbackPort.headers.get('access-control-allow-origin'), 'http://127.0.0.1:49152');

    const deniedLocalhostWildcard = await fetch(`${baseUrl}/api/self-host/state`, {
      headers: protectedHeaders({ Origin: 'http://localhost:61642' }),
    });
    assert.equal(deniedLocalhostWildcard.status, 403);

    const oauthNavigation = await fetch(`${baseUrl}/api/auth/callback?error=access_denied`, {
      headers: protectedHeaders({ Origin: 'https://accounts.spotify.com' }),
      redirect: 'manual',
    });
    assert.equal(oauthNavigation.status, 302);
    assert.match(oauthNavigation.headers.get('location') || '', /^\/callback\.html\?/);

    const preflight = await fetch(`${baseUrl}/api/spotify`, {
      method: 'OPTIONS',
      headers: protectedHeaders({
        Origin: 'https://app.example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      }),
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://app.example.com');
    assert.match(preflight.headers.get('access-control-allow-methods') || '', /POST/);

    const disabledDebug = await fetch(`${baseUrl}/api/debug/client-log`, {
      headers: protectedHeaders(),
    });
    assert.equal(disabledDebug.status, 404);

    const deniedProxyRoute = await fetch(`${baseUrl}/api/spotify`, {
      method: 'POST',
      headers: protectedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path: '//evil.example/steal', method: 'GET', body: null }),
    });
    assert.equal(deniedProxyRoute.status, 400);

    const unsupportedSpotifyRoute = await fetch(`${baseUrl}/api/spotify`, {
      method: 'POST',
      headers: protectedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path: '/search?q=test&type=track', method: 'GET', body: null }),
    });
    assert.equal(unsupportedSpotifyRoute.status, 400);
    assert.equal((await unsupportedSpotifyRoute.json()).error.code, 'spotify_route_denied');

    const wrongMediaType = await fetch(`${baseUrl}/api/spotify`, {
      method: 'POST',
      headers: protectedHeaders({ 'Content-Type': 'text/plain' }),
      body: '{}',
    });
    assert.equal(wrongMediaType.status, 415);

    const oversizedBody = await fetch(`${baseUrl}/api/spotify`, {
      method: 'POST',
      headers: protectedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path: '/me', method: 'GET', padding: 'x'.repeat(70 * 1024) }),
    });
    assert.equal(oversizedBody.status, 413);

    const webViewConfig = {
      schemaVersion: 1,
      app: 'even-hub-spotify-console',
      settings: { language: 'en' },
    };
    const saveWebView = await fetch(`${baseUrl}/api/self-host/webview-config`, {
      method: 'POST',
      headers: protectedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(webViewConfig),
    });
    assert.equal(saveWebView.status, 200);

    const deniedClear = await fetch(`${baseUrl}/api/self-host/session/clear`, {
      method: 'POST',
      headers: {
        'Tailscale-User-Login': 'denied-tailnet-user',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    assert.equal(deniedClear.status, 403);

    const clearSession = await fetch(`${baseUrl}/api/self-host/session/clear`, {
      method: 'POST',
      headers: protectedHeaders({ 'Content-Type': 'application/json' }),
      body: '{}',
    });
    assert.equal(clearSession.status, 200);

    const allowedProfileRoute = await fetch(`${baseUrl}/api/spotify`, {
      method: 'POST',
      headers: protectedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path: '/me', method: 'GET', body: null }),
    });
    assert.equal(allowedProfileRoute.status, 401);
    assert.equal((await allowedProfileRoute.json()).error.code, 'AUTH_REQUIRED');

    const allowedResumeRoute = await fetch(`${baseUrl}/api/spotify`, {
      method: 'POST',
      headers: protectedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ path: '/me/player/play', method: 'PUT', body: null }),
    });
    assert.equal(allowedResumeRoute.status, 401);
    assert.equal((await allowedResumeRoute.json()).error.code, 'AUTH_REQUIRED');

    const allowedLibraryRoute = await fetch(`${baseUrl}/api/spotify`, {
      method: 'POST',
      headers: protectedHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        path: '/me/library',
        method: 'PUT',
        body: { uris: ['spotify:track:0123456789abcdef'] },
      }),
    });
    assert.equal(allowedLibraryRoute.status, 401);
    assert.equal((await allowedLibraryRoute.json()).error.code, 'AUTH_REQUIRED');

    const clearedState = await fetch(`${baseUrl}/api/self-host/state`, {
      headers: protectedHeaders(),
    });
    assert.equal(clearedState.status, 200);
    assert.equal((await clearedState.json()).sessionAuthorized, false);

    const directoryMode = (await fs.stat(stateDir)).mode & 0o777;
    const stateMode = (await fs.stat(stateFile)).mode & 0o777;
    const webViewMode = (await fs.stat(path.join(stateDir, 'webview-config.json'))).mode & 0o777;
    assert.equal(directoryMode, 0o700);
    assert.equal(stateMode, 0o600);
    assert.equal(webViewMode, 0o600);
  } finally {
    if (child) {
      await stopChild(child);
    }
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});
