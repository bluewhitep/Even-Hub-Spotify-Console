import {
  clearLastAuthError,
  exchangeCodeForTokenFromCallback,
  setLastAuthError,
  syncSelfHostStateFromServer,
} from "./spotify";

const APP_HOME_PATH = "/";
const SETTINGS_PATH = "/?view=settings";
const LANGUAGE_KEY = "phone_lang_v1";

type LanguageCode = "zh" | "en" | "ja";

const CALLBACK_TEXT: Record<
  LanguageCode,
  {
    successTitle: string;
    successMessage: string;
    successGuidance: string;
    failedTitle: string;
    failedMessagePrefix: string;
    failedGuidance: string;
    redirectUriMismatchMessage: string;
    redirectUriMismatchGuidance: string;
    returnToApp: string;
    backToSettings: string;
    steps: string[];
  }
> = {
  zh: {
    successTitle: "成功",
    successMessage: "已连接",
    successGuidance: "Spotify 授权成功，正在返回应用。",
    failedTitle: "授权失败",
    failedMessagePrefix: "授权失败：",
    failedGuidance: "授权未完成。请检查配置后重试。",
    redirectUriMismatchMessage: "Redirect URI 不匹配。请检查配置文件中的 serviceOrigin 和 Spotify Developer Dashboard 里的 Redirect URIs 是否完全一致。",
    redirectUriMismatchGuidance: "Spotify 拒绝了当前 Redirect URI。",
    returnToApp: "返回应用",
    backToSettings: "返回设置",
    steps: [
      "确认配置文件或模拟器配置中的 Spotify Client ID 正确。",
      "确认页面显示的 Effective Redirect URI 与 Spotify Developer Dashboard 完全一致。",
      "如果域名变化，请先更新 Spotify Developer Dashboard，再清除会话。",
      "检查完成后重新连接 Spotify。",
    ],
  },
  en: {
    successTitle: "Success",
    successMessage: "Connected",
    successGuidance: "Spotify authorization succeeded. Returning to the app now.",
    failedTitle: "Auth Failed",
    failedMessagePrefix: "Auth failed: ",
    failedGuidance: "Authorization did not complete. Check the configuration and retry.",
    redirectUriMismatchMessage: "Redirect URI does not match. Check that the config file serviceOrigin and Spotify Developer Dashboard Redirect URIs are exactly the same.",
    redirectUriMismatchGuidance: "Spotify rejected the current Redirect URI.",
    returnToApp: "Return to App",
    backToSettings: "Back to Settings",
    steps: [
      "Confirm the Spotify Client ID in the config file or simulator config.",
      "Confirm the displayed Effective Redirect URI exactly matches Spotify Developer Dashboard.",
      "If the domain changed, update Spotify Developer Dashboard first, then clear the session.",
      "Reconnect Spotify after these checks.",
    ],
  },
  ja: {
    successTitle: "成功",
    successMessage: "接続済み",
    successGuidance: "Spotify 認可に成功しました。アプリに戻ります。",
    failedTitle: "認可失敗",
    failedMessagePrefix: "認可失敗：",
    failedGuidance: "認可が完了しませんでした。設定を確認して再試行してください。",
    redirectUriMismatchMessage: "Redirect URI が一致しません。設定ファイルの serviceOrigin と Spotify Developer Dashboard の Redirect URIs が完全に一致しているか確認してください。",
    redirectUriMismatchGuidance: "Spotify が現在の Redirect URI を拒否しました。",
    returnToApp: "アプリへ戻る",
    backToSettings: "設定へ戻る",
    steps: [
      "設定ファイルまたは simulator config の Spotify Client ID が正しいか確認する。",
      "表示された Effective Redirect URI が Spotify Developer Dashboard と完全に一致するか確認する。",
      "domain が変わった場合は、先に Spotify Developer Dashboard を更新してから session を削除する。",
      "確認後、Spotify に再接続する。",
    ],
  },
};

function normalizeCallbackLanguage(value: string | null | undefined): LanguageCode {
  const normalized = (value || "").toLowerCase();
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("ja")) return "ja";
  return "en";
}

function readBrowserCallbackLanguage(): LanguageCode {
  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeCallbackLanguage(candidate);
    if (normalized !== "en" || candidate.toLowerCase().startsWith("en")) {
      return normalized;
    }
  }

  return "en";
}

function readCallbackLanguage(): LanguageCode {
  const fromStorage = localStorage.getItem(LANGUAGE_KEY);
  return fromStorage ? normalizeCallbackLanguage(fromStorage) : readBrowserCallbackLanguage();
}

function isRedirectUriMismatch(code: string, message?: string): boolean {
  const combined = `${code} ${message ?? ""}`.toLowerCase();
  return combined.includes("redirect_uri_mismatch") || combined.includes("redirect uri") || combined.includes("redirect_uri");
}

function render(options: {
  title: string;
  message: string;
  detail?: string;
  guidance?: string;
  showReturnToApp?: boolean;
  showBackToSettings?: boolean;
  steps?: string[];
}): void {
  const app = document.getElementById("callback-app");
  if (!app) {
    return;
  }

  const text = CALLBACK_TEXT[readCallbackLanguage()];
  const showDetail = import.meta.env.DEV && options.detail;
  app.innerHTML = `
    <main style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; line-height: 1.5;">
      <h1 style="font-size: 20px; margin: 0 0 10px;">${options.title}</h1>
      <p style="margin: 0 0 8px;">${options.message}</p>
      ${options.guidance ? `<p style="margin: 0 0 8px; color: #555;">${options.guidance}</p>` : ""}
      ${
        options.steps && options.steps.length > 0
          ? `<ol style="margin: 0 0 12px 18px; padding: 0; color: #555; font-size: 13px;">
              ${options.steps.map((step) => `<li style="margin: 0 0 4px;">${step}</li>`).join("")}
            </ol>`
          : ""
      }
      ${showDetail ? `<p style="margin: 0 0 12px; font-size: 12px; color: #555;">${options.detail}</p>` : ""}
      ${
        options.showReturnToApp || options.showBackToSettings !== false
          ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${options.showReturnToApp ? `<button id="return-to-app" style="padding: 8px 14px;">${text.returnToApp}</button>` : ""}
              ${options.showBackToSettings !== false ? `<button id="back-to-settings" style="padding: 8px 14px;">${text.backToSettings}</button>` : ""}
            </div>`
          : ""
      }
    </main>
  `;

  document.getElementById("return-to-app")?.addEventListener("click", () => {
    window.location.replace(APP_HOME_PATH);
  });
  document.getElementById("back-to-settings")?.addEventListener("click", () => {
    window.location.replace(SETTINGS_PATH);
  });
}

async function main(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const backendAuthStatus = params.get("backend_auth");
  const text = CALLBACK_TEXT[readCallbackLanguage()];

  if (backendAuthStatus === "success") {
    await syncSelfHostStateFromServer(true);
    clearLastAuthError();
    render({
      title: text.successTitle,
      message: text.successMessage,
      guidance: text.successGuidance,
      showReturnToApp: false,
      showBackToSettings: false,
    });
    window.setTimeout(() => {
      window.location.replace(APP_HOME_PATH);
    }, 800);
    return;
  }

  if (backendAuthStatus === "error") {
    const errorCode = params.get("error_code") || "token_exchange_failed";
    const errorMessage = params.get("error_message") || `Auth failed: ${errorCode}`;
    const localizedMessage = isRedirectUriMismatch(errorCode, errorMessage)
      ? text.redirectUriMismatchMessage
      : `${text.failedMessagePrefix}${errorCode}`;
    setLastAuthError({
      code: errorCode,
      message: localizedMessage,
    });
    render({
      title: text.failedTitle,
      message: localizedMessage,
      detail: errorMessage,
      guidance: isRedirectUriMismatch(errorCode, errorMessage) ? text.redirectUriMismatchGuidance : text.failedGuidance,
      steps: text.steps,
      showReturnToApp: false,
    });
    return;
  }

  const result = await exchangeCodeForTokenFromCallback(params);

  if (result.ok === true) {
    clearLastAuthError();
    render({
      title: text.successTitle,
      message: text.successMessage,
      guidance: text.successGuidance,
      showReturnToApp: false,
      showBackToSettings: false,
    });
    window.setTimeout(() => {
      window.location.replace(APP_HOME_PATH);
    }, 800);
    return;
  }

  const shortCode = result.shortCode || result.error || "token_exchange_failed";
  const message = isRedirectUriMismatch(shortCode, result.detail)
    ? text.redirectUriMismatchMessage
    : `${text.failedMessagePrefix}${shortCode}`;

  setLastAuthError({
    code: shortCode,
    message,
  });

  render({
    title: text.failedTitle,
    message,
    detail: result.detail,
    guidance: isRedirectUriMismatch(shortCode, result.detail) ? text.redirectUriMismatchGuidance : text.failedGuidance,
    steps: text.steps,
    showReturnToApp: false,
  });
}

main();
