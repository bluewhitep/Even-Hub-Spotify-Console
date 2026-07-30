import {
  CreateStartUpPageContainer,
  ImageRawDataUpdate,
  ImageRawDataUpdateResult,
  OsEventTypeList,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  type EvenAppBridge,
  type EvenHubEvent,
  waitForEvenAppBridge,
} from "@evenrealities/even_hub_sdk";
import {
  buildAuthRequiredPage,
  buildDevicesPage,
  buildNowPlayingPage,
  buildPlaylistPage,
  computeContainerShapeKey,
  DEFAULT_IMAGE_TEXT_MARQUEE_GAP_PX,
  DEFAULT_IMAGE_TEXT_MARQUEE_STEP_PX,
  IMAGE_TEXT_SLOW_TICK_THRESHOLD_MS,
  estimateDisplayTextWidthChars,
  getMarqueeText,
  type BorderFrameSettings,
  type ControlGlyphVariant,
  type ControlsRepeatMode,
  type GlassesContainerShapeKey,
  type GlassesImageTextMode,
  type ImageControlsSendFormat,
  type ImageRowUpdatePlan,
  type ImageTextAlignMode,
  type ImageTextPayload,
  type ImageTextRowKind,
  type ImageTextStylePreset,
  type TextAlignMode,
} from "./glasses-ui";
import {
  clearSelfHostConfig,
  clearSpotifySessionOnServer,
  clearSpotifySession,
  getEffectiveConfigState,
  getErrorMessage,
  getNextRepeatMode,
  getPlaybackState,
  getRateLimitRemainingMs,
  getServerApiOriginOverride,
  getSelfHostDiagnostics,
  getSpotifyAuthMode,
  hasAuthorizedSessionMismatch,
  hasTokenBundle,
  isClientSpotifyAuthMode,
  loadWebViewConfigFromServer,
  getAvailableDevices,
  nextTrack,
  openSpotifyLoginPage,
  peekLastAuthError,
  previousTrack,
  playFirstLikedSong,
  playPlaylistContext,
  readSelfHostConfig,
  saveSelfHostConfig,
  saveWebViewConfigOnServer,
  setRepeat,
  setServerApiOrigin,
  setShuffle,
  startSpotifyAuth,
  startSpotifyAuthWithServer,
  syncSelfHostStateFromServer,
  transferPlayback,
  togglePlayPause,
  validateServiceOrigin,
  validateSpotifyClientId,
  getUserPlaylists,
  type DeviceSummary,
  type PlaybackState,
  type PlaylistSummary,
  type SelfHostConfig,
  type SpotifyErrorCode,
} from "./spotify";

declare const __BUILD_VERSION__: string;
declare const __APP_VERSION__: string;

const BUILD_CACHE_QUERY_KEY = "__cv";
const SERVER_API_ORIGIN_BRIDGE_KEY = "spotify_server_api_origin_v1";

type AppPage = "AUTH_REQUIRED" | "NOW_PLAYING" | "PLAYLISTS" | "DEVICES";
type NavigableGlassesPage = Exclude<AppPage, "AUTH_REQUIRED">;
type LanguageCode = "zh" | "en" | "ja";
type PhonePanel = "A" | "B";
type PhoneView = "HOME" | "SETTINGS";
type PanelBProbeState = "idle" | "checking" | "ok" | "premium_required";
type GlassesDisplayMode = "text" | "hybrid";
type DeveloperGlassesLayoutMode = "pure-text" | "album-art";
type ProgressBarStyle = "eq" | "block" | "square";
type DeveloperGlassesPageOverride = "auto" | "now_playing" | "playlists" | "devices";
type MockPlaylistKind = "liked" | "playlist";
type DeviceMockPresetId = "iphone" | "macbook" | "living_room" | "bedroom_speaker" | "web_player" | "car_audio";
type WebViewSettingsConfig = {
  schemaVersion: number;
  app: string;
  savedAt: string;
  buildVersion: string;
  settings: Record<string, string>;
};
type MockPlaylistEntry = {
  id: string;
  kind: MockPlaylistKind;
  name: string;
  subtitle: string;
  itemCount: number;
  spotifyPlaylistId: string | null;
  coverUrl: string | null;
};
type MockDeviceEntry = {
  id: string;
  name: string;
  typeLabel: string;
  isActive: boolean;
  isRestricted: boolean;
};
type SelectablePageState = {
  focusIndex: number;
  selectedIndex: number;
  windowStart: number;
};

type AppError = {
  code: SpotifyErrorCode;
  message: string;
};

type PhoneBannerKind = "playback-control-error" | null;

type RefreshOutcome = {
  continuePolling: boolean;
  nextDelayMs?: number;
};

type ManagedImageRowKind = Exclude<ImageTextRowKind, "controls">;
type NowPlayingTextContainerName = "np-title" | "np-status" | "np-controls";

type ImageRowRenderState = {
  nextSeq: number;
  latestRequestedSeq: number;
  inFlightSeq: number | null;
  pendingSeq: number | null;
  pendingPayload: ImageTextPayload | null;
  latestCommittedSeq: number;
  pendingPlan: ImageRowUpdatePlan | null;
};

type ImageRowRenderStateByKind = Partial<Record<ManagedImageRowKind, ImageRowRenderState>>;
type SelfHostMode = SelfHostConfig["mode"];

const TITLE_WINDOW_CHARS = 30;
const MARQUEE_INTERVAL_MS = 450;
const SCROLL_COOLDOWN_MS = 300;
const CONTROL_LOCK_MS = 500;
const BUSY_HINT_MS = 800;
const IMAGE_MODE_REOPEN_DELAY_MS = 140;
const CONTROL_REFRESH_DELAY_MS = 250;
const CONTROL_STALE_POLL_GUARD_MS = 1_800;
const GLASSES_REOPEN_SETTLE_MS = 120;
const BRIDGE_RESUME_DEBOUNCE_MS = 1200;
const BRIDGE_STARTUP_SUPPRESS_MS = 2500;
const STARTUP_IMAGE_PLAN_SETTLE_MS = 160;
const IMAGE_ROW_RETRY_DELAY_MS = 120;
const REFRESH_INPUT_SUPPRESS_MS = 800;
const DEFAULT_TEXT_MODE_ALIGN: TextAlignMode = "left";
const COPY_FEEDBACK_MS = 1_200;
const PROGRESS_BAR_TRACK_CHARS = 38;
const VISIBLE_LIST_WINDOW_SIZE = 9;
const MAX_ADDED_PLAYLIST_SLOTS = 8;
const MOCK_DEVICE_SLOT_COUNT = 5;
const PLAYLIST_OPTIONS_FETCH_LIMIT = 50;

const POLL_PLAYING_MS = 2_000;
const POLL_PAUSED_MS = 7000;
const POLL_IDLE_MS = 10000;
const POLL_ERROR_MS = 5000;
const DEVICE_PAGE_POLL_MS = 2000;
const DEVICE_TRANSFER_PENDING_MS = 2500;
const NOW_PLAYING_CONTROL_COUNT = 8;
const NOW_PLAYING_DEFAULT_FOCUS_INDEX = 3;
const LANGUAGE_KEY = "phone_lang_v1";
const PHONE_PANEL_KEY = "phone_panel_v1";
const GLASSES_CONTROL_VARIANT_KEY = "glasses_control_variant_v1";
const DEVELOPER_MODE_KEY = "developer_mode_v1";
const BORDER_ENABLED_KEY = "glasses_border_enabled_v1";
const BORDER_INSET_KEY = "glasses_border_inset_v1";
const BORDER_WIDTH_KEY = "glasses_border_width_v1";
const BORDER_RADIUS_KEY = "glasses_border_radius_v1";
const BORDER_SETTINGS_RESET_ONCE_KEY = "glasses_border_reset_once_v2";
const IMAGE_MODE_KEY = "glasses_image_mode_v1";
const IMAGE_CONTROLS_TEST_KEY = "glasses_image_controls_test_v1";
const IMAGE_CONTROLS_FORMAT_KEY = "glasses_image_controls_format_v1";
const IMAGE_TEXT_STATUS_TEST_KEY = "glasses_image_text_status_test_v1";
const IMAGE_TEXT_TITLE_TEST_KEY = "glasses_image_text_title_test_v1";
const IMAGE_TEXT_ALIGN_KEY = "glasses_image_text_align_v1";
const IMAGE_TEXT_FONT_WEIGHT_KEY = "glasses_image_text_font_weight_v1";
const GLASSES_CONTROL_INVERT_KEY = "glasses_control_invert_v1";
const GLASSES_ALIGN_PADDING_KEY = "glasses_align_padding_v1";
const GLASSES_PROGRESS_BAR_STYLE_KEY = "glasses_progress_bar_style_v1";
const GLASSES_AUTO_HIDE_ENABLED_KEY = "glasses_auto_hide_enabled_v1";
const GLASSES_AUTO_HIDE_SECONDS_KEY = "glasses_auto_hide_seconds_v1";
const GLASSES_AUTO_HIDE_DEFAULT_OFF_MIGRATION_KEY = "glasses_auto_hide_default_off_migrated_v1";
const DEVELOPER_GLASSES_PAGE_OVERRIDE_KEY = "developer_glasses_page_override_v1";
const DEVELOPER_GLASSES_LAYOUT_MODE_KEY = "developer_glasses_layout_mode_v1";
const DEVELOPER_ALBUM_ART_SIZE_KEY = "developer_album_art_size_v1";
const DEVELOPER_ALBUM_ART_GAP_KEY = "developer_album_art_gap_v1";
const DEVELOPER_ALBUM_ART_OPACITY_KEY = "developer_album_art_opacity_v1";
const ALBUM_ART_SIZE_SMALL_PX = 70;
const ALBUM_ART_SIZE_MEDIUM_PX = 85;
const ALBUM_ART_SIZE_LARGE_PX = 100;
const FIXED_ALBUM_ART_GAP_PX = 15;
const ALBUM_ART_OPACITY_MIN_PERCENT = 25;
const ALBUM_ART_OPACITY_MAX_PERCENT = 100;
const ALBUM_ART_OPACITY_STEP_PERCENT = 15;
const SELECTED_PLAYLIST_SLOT_IDS_KEY = "developer_playlist_slot_ids_v1";
const PLAYLIST_SCROLL_INVERT_KEY = "developer_playlist_scroll_invert_v1";
const MOCK_DEVICE_SLOT_PRESETS_KEY = "developer_mock_device_slots_v1";
const WEBVIEW_SETTINGS_BRIDGE_KEY = "spotify_webview_settings_config_v1";
const WEBVIEW_SETTINGS_CONFIG_APP = "even-hub-spotify-console";
const WEBVIEW_SETTINGS_CONFIG_SCHEMA_VERSION = 1;
const WEBVIEW_SETTINGS_CONFIG_FILENAME = "even-hub-spotify-console-webview-settings.json";
const WEBVIEW_SETTINGS_STORAGE_KEYS = [
  LANGUAGE_KEY,
  PHONE_PANEL_KEY,
  GLASSES_CONTROL_VARIANT_KEY,
  DEVELOPER_MODE_KEY,
  BORDER_ENABLED_KEY,
  BORDER_INSET_KEY,
  BORDER_WIDTH_KEY,
  BORDER_RADIUS_KEY,
  BORDER_SETTINGS_RESET_ONCE_KEY,
  IMAGE_MODE_KEY,
  IMAGE_CONTROLS_TEST_KEY,
  IMAGE_CONTROLS_FORMAT_KEY,
  IMAGE_TEXT_STATUS_TEST_KEY,
  IMAGE_TEXT_TITLE_TEST_KEY,
  IMAGE_TEXT_ALIGN_KEY,
  IMAGE_TEXT_FONT_WEIGHT_KEY,
  GLASSES_CONTROL_INVERT_KEY,
  GLASSES_ALIGN_PADDING_KEY,
  GLASSES_PROGRESS_BAR_STYLE_KEY,
  GLASSES_AUTO_HIDE_ENABLED_KEY,
  GLASSES_AUTO_HIDE_SECONDS_KEY,
  GLASSES_AUTO_HIDE_DEFAULT_OFF_MIGRATION_KEY,
  DEVELOPER_GLASSES_PAGE_OVERRIDE_KEY,
  DEVELOPER_GLASSES_LAYOUT_MODE_KEY,
  DEVELOPER_ALBUM_ART_SIZE_KEY,
  DEVELOPER_ALBUM_ART_GAP_KEY,
  DEVELOPER_ALBUM_ART_OPACITY_KEY,
  SELECTED_PLAYLIST_SLOT_IDS_KEY,
  PLAYLIST_SCROLL_INVERT_KEY,
  MOCK_DEVICE_SLOT_PRESETS_KEY,
] as const;

const GLASSES_CONTROLS_LAYOUT = {
  pixelSize: 1,
  offsetX: 0,
  offsetY: 0,
  iconGap: 4,
  onChar: "·",
} as const;

const FIXED_IMAGE_TEXT_STYLE: ImageTextStylePreset = "black-green";
const DEV_PAGE_TEXT: Record<
  LanguageCode,
  {
    settingsTestPagesLabel: string;
    settingsTestPageOverrideLabel: string;
    settingsTestPageOverrideAuto: string;
    settingsTestPageOverrideNowPlaying: string;
    settingsTestPageOverridePlaylists: string;
    settingsTestPageOverrideDevices: string;
    settingsPlaylistModeLabel: string;
    settingsPlaylistInvertLabel: string;
    settingsPlaylistSlotsLabel: string;
    settingsPlaylistSlotFixedLabel: string;
    settingsPlaylistLikedSongsNote: string;
    settingsPlaylistEmptyOption: string;
    settingsPlaylistAddButton: string;
    settingsPlaylistRemoveButton: string;
    settingsPlaylistNoOptions: string;
    settingsDeviceSlotsLabel: string;
    glassesPlaylistsTitle: string;
    glassesDevicesTitle: string;
    glassesNoItems: string;
    glassesNothingSelected: string;
    glassesPlaylistLiveHint: string;
    glassesPlaylistMockHint: string;
    glassesDeviceMockHint: string;
    glassesActive: string;
    glassesStandby: string;
    glassesTracksSuffix: string;
    glassesBackToNowPlaying: string;
  }
> = {
  zh: {
    settingsTestPagesLabel: "眼镜测试页面",
    settingsTestPageOverrideLabel: "页面覆盖",
    settingsTestPageOverrideAuto: "自动",
    settingsTestPageOverrideNowPlaying: "正在播放",
    settingsTestPageOverridePlaylists: "播放列表",
    settingsTestPageOverrideDevices: "播放设备",
    settingsPlaylistModeLabel: "播放列表模式",
    settingsPlaylistInvertLabel: "列表滑动反转",
    settingsPlaylistSlotsLabel: "播放列表",
    settingsPlaylistSlotFixedLabel: "固定",
    settingsPlaylistLikedSongsNote: "Liked Songs 目前只能随机播放",
    settingsPlaylistEmptyOption: "选择播放列表",
    settingsPlaylistAddButton: "＋",
    settingsPlaylistRemoveButton: "－",
    settingsPlaylistNoOptions: "暂无可选播放列表",
    settingsDeviceSlotsLabel: "设备 Mock 槽位",
    glassesPlaylistsTitle: "Playlists",
    glassesDevicesTitle: "Devices",
    glassesNoItems: "No items",
    glassesNothingSelected: "Nothing selected",
    glassesPlaylistLiveHint: "Live: Spotify playlists",
    glassesPlaylistMockHint: "Mock only: play first track later",
    glassesDeviceMockHint: "Mock only: transfer later",
    glassesActive: "active",
    glassesStandby: "standby",
    glassesTracksSuffix: "tracks",
    glassesBackToNowPlaying: "< 返回正在播放",
  },
  en: {
    settingsTestPagesLabel: "Glasses Test Pages",
    settingsTestPageOverrideLabel: "Page Override",
    settingsTestPageOverrideAuto: "Auto",
    settingsTestPageOverrideNowPlaying: "Now Playing",
    settingsTestPageOverridePlaylists: "Playlists",
    settingsTestPageOverrideDevices: "Devices",
    settingsPlaylistModeLabel: "Playlist mode",
    settingsPlaylistInvertLabel: "Invert list scroll",
    settingsPlaylistSlotsLabel: "Playlists",
    settingsPlaylistSlotFixedLabel: "Fixed",
    settingsPlaylistLikedSongsNote: "Liked Songs currently supports random playback only",
    settingsPlaylistEmptyOption: "Select playlist",
    settingsPlaylistAddButton: "+",
    settingsPlaylistRemoveButton: "-",
    settingsPlaylistNoOptions: "No playlists available",
    settingsDeviceSlotsLabel: "Device Mock Slots",
    glassesPlaylistsTitle: "Playlists",
    glassesDevicesTitle: "Devices",
    glassesNoItems: "No items",
    glassesNothingSelected: "Nothing selected",
    glassesPlaylistLiveHint: "Live: Spotify playlists",
    glassesPlaylistMockHint: "Mock only: play first track later",
    glassesDeviceMockHint: "Mock only: transfer later",
    glassesActive: "active",
    glassesStandby: "standby",
    glassesTracksSuffix: "tracks",
    glassesBackToNowPlaying: "< Now Playing",
  },
  ja: {
    settingsTestPagesLabel: "グラステストページ",
    settingsTestPageOverrideLabel: "ページ切替",
    settingsTestPageOverrideAuto: "Auto",
    settingsTestPageOverrideNowPlaying: "Now Playing",
    settingsTestPageOverridePlaylists: "Playlists",
    settingsTestPageOverrideDevices: "Devices",
    settingsPlaylistModeLabel: "プレイリストモード",
    settingsPlaylistInvertLabel: "リストスクロール反転",
    settingsPlaylistSlotsLabel: "プレイリスト",
    settingsPlaylistSlotFixedLabel: "固定",
    settingsPlaylistLikedSongsNote: "Liked Songs は現在ランダム再生のみ対応",
    settingsPlaylistEmptyOption: "プレイリストを選択",
    settingsPlaylistAddButton: "＋",
    settingsPlaylistRemoveButton: "－",
    settingsPlaylistNoOptions: "選択できるプレイリストがありません",
    settingsDeviceSlotsLabel: "デバイス Mock スロット",
    glassesPlaylistsTitle: "Playlists",
    glassesDevicesTitle: "Devices",
    glassesNoItems: "No items",
    glassesNothingSelected: "Nothing selected",
    glassesPlaylistLiveHint: "Live: Spotify playlists",
    glassesPlaylistMockHint: "Mock only: play first track later",
    glassesDeviceMockHint: "Mock only: transfer later",
    glassesActive: "active",
    glassesStandby: "standby",
    glassesTracksSuffix: "tracks",
    glassesBackToNowPlaying: "< Now Playing",
  },
};
const LIKED_SONGS_ENTRY: MockPlaylistEntry = {
  id: "liked-songs",
  kind: "liked",
  name: "Liked Songs",
  subtitle: "Saved tracks",
  itemCount: 320,
  spotifyPlaylistId: null,
  coverUrl: null,
};
const DEVICE_MOCK_PRESETS: Record<DeviceMockPresetId, Omit<MockDeviceEntry, "id" | "isActive" | "isRestricted">> = {
  iphone: { name: "iPhone", typeLabel: "Phone" },
  macbook: { name: "MacBook Pro", typeLabel: "Computer" },
  living_room: { name: "Living Room Speaker", typeLabel: "Speaker" },
  bedroom_speaker: { name: "Bedroom Speaker", typeLabel: "Speaker" },
  web_player: { name: "Web Player", typeLabel: "Web" },
  car_audio: { name: "Car Audio", typeLabel: "Car" },
};
const DEFAULT_MOCK_DEVICE_SLOT_PRESETS: DeviceMockPresetId[] = ["iphone", "macbook", "living_room", "web_player", "car_audio"];

const PHONE_TEXT: Record<
  LanguageCode,
  {
    title: string;
    trust: string;
    tipLogin: string;
    loginButton: string;
    connectButton: string;
    clearButton: string;
    refreshGlassesButton: string;
    statusConnectionLabel: string;
    statusClientLabel: string;
    statusRuntimeLabel: string;
    statusConnected: string;
    statusNotConnected: string;
    statusClientConfigured: string;
    statusClientMissing: string;
    statusSourceServer: string;
    statusSourceRuntime: string;
    statusSourceEnv: string;
    statusSourceMissing: string;
    statusConnectionHelp: string;
    statusClientHelp: string;
    statusRuntimeHelp: string;
    callbackPrefix: string;
    authSetupFailedPrefix: string;
    redirectUriMismatchMessage: string;
    spotifyConnectionStatusLabel: string;
    spotifyStatusLoggedIn: string;
    spotifyStatusConnected: string;
    spotifyStatusNotConnected: string;
    spotifyStatusNotLoggedIn: string;
    serverConnectionStatusLabel: string;
    serverDomainButton: string;
    serverOriginLabel: string;
    serverOriginSaveButton: string;
    authTargetPrompt: string;
    authTargetPromptDefault: string;
    authTargetConfigured: string;
    localSimulatorConfigured: string;
    missingConfigMessage: string;
    originChangedMessage: string;
    invalidServiceOriginMessage: string;
    localAuthServerUnavailable: string;
    sessionCleared: string;
    glassesRefreshHint: string;
    languageLabel: string;
    settingsButton: string;
    settingsBackButton: string;
    settingsTitle: string;
    settingsInfoLabel: string;
    settingsSessionLabel: string;
    settingsSessionHelp: string;
    settingsVersionLabel: string;
    settingsModeLabel: string;
    settingsModeHelp: string;
    settingsModeEmbed: string;
    settingsModeRemote: string;
    settingsDisplayModeLabel: string;
    settingsDisplayModeText: string;
    settingsDisplayModeHybrid: string;
    settingsDisplayModeImage: string;
    settingsGlassesDisplayGroupLabel: string;
    settingsLayoutModeLabel: string;
    settingsLayoutModePureText: string;
    settingsLayoutModeAlbumArt: string;
    settingsAlbumArtSizeLabel: string;
    settingsAlbumArtSizeSmall: string;
    settingsAlbumArtSizeLarge: string;
    settingsAlbumArtOpacityLabel: string;
    settingsAlbumArtPreviewLabel: string;
    settingsAlbumArtPreviewEmpty: string;
    settingsGlassesRenderStatusLabel: string;
    settingsBorderLabel: string;
    settingsBorderRadiusLabel: string;
    settingsConfigGroupLabel: string;
    settingsConfigHelp: string;
    settingsConfigSaveServer: string;
    settingsConfigLoadServer: string;
    settingsConfigSaveLocal: string;
    settingsConfigLoadLocal: string;
    settingsConfigSavedServer: string;
    settingsConfigLoadedServer: string;
    settingsConfigNoServerFile: string;
    settingsConfigSavedLocal: string;
    settingsConfigLoadedLocal: string;
    settingsConfigInvalidFile: string;
    settingsDevModeLabel: string;
    settingsAlignModeLabel: string;
    settingsAlignModeHelp: string;
    settingsAlignModeCenter: string;
    settingsAlignModeLeft: string;
    settingsAlignModeRight: string;
    settingsControlInvertLabel: string;
    settingsControlInvertHelp: string;
    settingsAlignPaddingLabel: string;
    settingsProgressStyleLabel: string;
    settingsProgressStyleEq: string;
    settingsProgressStyleBlock: string;
    settingsProgressStyleSquare: string;
    settingsAutoHideEnabledLabel: string;
    settingsAutoHideSecondsLabel: string;
    settingsImageControlsTestLabel: string;
    settingsImageControlsUnstableNote: string;
    settingsImageControlsFormatLabel: string;
    settingsImageControlsFormatNumber: string;
    settingsImageControlsFormatBase64: string;
    settingsImageControlsFormatUint8: string;
    settingsForceReopenButton: string;
    settingsImageControlsStatusLabel: string;
    settingsImageControlsPreviewLabel: string;
    settingsImageTextStatusTestLabel: string;
    settingsImageTextTitleTestLabel: string;
    settingsImageTextAlignLabel: string;
    settingsImageTextFontWeightLabel: string;
    settingsImageTextTitlePreviewLabel: string;
    settingsImageTextStatusPreviewLabel: string;
    settingsImageTextControlsPreviewLabel: string;
    settingsBorderInsetLabel: string;
    settingsBorderWidthLabel: string;
    glassesIconsLabel: string;
    glassesIconsSolid: string;
    glassesIconsOpen: string;
    glassesIconsAscii: string;
    devRateLimitLabel: string;
    devRateLimitNone: string;
    manualRefreshButton: string;
    panelBChecking: string;
    panelBOk: string;
    panelBPremiumFailed: string;
    embedEmpty: string;
    bNoTrack: string;
    bNoArtist: string;
    bNoTrackAction: string;
    bBusy: string;
    btnPrev: string;
    btnPlayPause: string;
    btnNext: string;
    btnShuffle: string;
    btnRepeat: string;
    operationGuideLabel: string;
    operationClick: string;
    operationSwipe: string;
    operationDoubleClick: string;
    iconGuideLabel: string;
    iconRepeatContext: string;
    iconRepeatTrack: string;
    iconShuffleOn: string;
    iconShuffleOff: string;
    iconRepeatOff: string;
    iconHide: string;
    iconDevices: string;
    iconPlaylists: string;
  }
> = {
  zh: {
    title: "Even Hub Spotify Console",
    trust: "仅用于播放控制，不会保存你的 Spotify 密码。",
    tipLogin: "使用说明：首次使用请先登录 Spotify，再连接 Spotify。连接后会显示播放控件。",
    loginButton: "登录 Spotify",
    connectButton: "连接 Spotify",
    clearButton: "清除会话",
    refreshGlassesButton: "刷新眼镜",
    statusConnectionLabel: "连接状态",
    statusClientLabel: "Client ID状态",
    statusRuntimeLabel: "运行状态",
    statusConnected: "已连接",
    statusNotConnected: "未连接",
    statusClientConfigured: "已配置",
    statusClientMissing: "未配置",
    statusSourceServer: "Server",
    statusSourceRuntime: "Runtime",
    statusSourceEnv: "Env",
    statusSourceMissing: "Missing",
    statusConnectionHelp: "已连接表示当前 WebView 已同步到 Spotify 会话。若未连接，请先点击“连接 Spotify”；如果刚修改过 Client ID 或域名，请先清除会话后再重连。",
    statusClientHelp: "Client ID 用于发起 Spotify 授权。未配置时无法连接；若填写错误，通常会在授权页被 Spotify 拒绝。",
    statusRuntimeHelp: "运行状态表示当前配置来源。Server 表示使用本机服务端配置，Runtime 表示使用当前 WebView 保存的配置，Env 表示使用构建时默认值，Missing 表示没有可用配置。",
    callbackPrefix: "回调错误：",
    authSetupFailedPrefix: "授权初始化失败：",
    redirectUriMismatchMessage: "Redirect URI 不匹配。请检查配置文件中的 serviceOrigin 和 Spotify Developer Dashboard 里的 Redirect URIs 是否完全一致。",
    spotifyConnectionStatusLabel: "Spotify连接状态",
    spotifyStatusLoggedIn: "已登陆",
    spotifyStatusConnected: "已连接",
    spotifyStatusNotConnected: "未连接",
    spotifyStatusNotLoggedIn: "未登录",
    serverConnectionStatusLabel: "服务器连接状态",
    serverDomainButton: "输入服务器域名",
    serverOriginLabel: "服务器 API 地址",
    serverOriginSaveButton: "保存并连接服务器",
    authTargetPrompt: "请输入服务器 Tailscale 长域名，不要加 https://。留空则使用本机模拟器 127.0.0.1。",
    authTargetPromptDefault: "示例：your-device.your-tailnet.ts.net",
    authTargetConfigured: "服务器地址已保存并连接。",
    localSimulatorConfigured: "已使用本机模拟器 Redirect URI。",
    missingConfigMessage: "缺少 Spotify Client ID。请检查配置文件或模拟器配置。",
    originChangedMessage: "Client ID 或 Redirect URI 已变化。请到设置中清除会话后重新授权。",
    invalidServiceOriginMessage: "服务器 Tailscale 域名无效。",
    localAuthServerUnavailable: "本机授权服务不可用。请确认 self-host server 已启动。",
    sessionCleared: "会话已清除。",
    glassesRefreshHint: "提示：连接后若眼镜未立即刷新，请在眼镜上点击一次或重开页面。",
    languageLabel: "语言",
    settingsButton: "设置",
    settingsBackButton: "返回",
    settingsTitle: "设置",
    settingsInfoLabel: "信息",
    settingsSessionLabel: "Spotify 会话",
    settingsSessionHelp: "清除会话会移除当前 Spotify 授权，需要重新连接。",
    settingsVersionLabel: "版本号",
    settingsModeLabel: "播放控件模式",
    settingsModeHelp: "Embed 不需要 Premium 订阅但不能控制，Remote 需要订阅但可以控制。",
    settingsModeEmbed: "Embed",
    settingsModeRemote: "Remote",
    settingsDisplayModeLabel: "显示模式",
    settingsDisplayModeText: "文字模式",
    settingsDisplayModeHybrid: "混合模式",
    settingsDisplayModeImage: "图像模式",
    settingsGlassesDisplayGroupLabel: "眼镜显示模式",
    settingsLayoutModeLabel: "眼镜编排模式",
    settingsLayoutModePureText: "纯文本模式",
    settingsLayoutModeAlbumArt: "带专辑图模式",
    settingsAlbumArtSizeLabel: "专辑图尺寸",
    settingsAlbumArtSizeSmall: "小",
    settingsAlbumArtSizeLarge: "大",
    settingsAlbumArtOpacityLabel: "专辑图透明度",
    settingsAlbumArtPreviewLabel: "专辑图片容器预览",
    settingsAlbumArtPreviewEmpty: "透明占位",
    settingsGlassesRenderStatusLabel: "眼镜渲染状态",
    settingsBorderLabel: "外围边框",
    settingsBorderRadiusLabel: "圆角",
    settingsConfigGroupLabel: "WebView 设置配置",
    settingsConfigHelp: "只保存语言、眼镜显示和页面偏好，不保存 Spotify 会话或密码。",
    settingsConfigSaveServer: "保存设置配置在服务器",
    settingsConfigLoadServer: "从服务器上加载设置配置文件",
    settingsConfigSaveLocal: "保存到本机",
    settingsConfigLoadLocal: "从本机加载",
    settingsConfigSavedServer: "设置配置已保存到服务器。",
    settingsConfigLoadedServer: "已从服务器加载设置配置。",
    settingsConfigNoServerFile: "服务器上还没有设置配置文件。",
    settingsConfigSavedLocal: "设置配置文件已保存到本机。",
    settingsConfigLoadedLocal: "已从本机加载设置配置。",
    settingsConfigInvalidFile: "设置配置文件无效。",
    settingsDevModeLabel: "开发者模式",
    settingsAlignModeLabel: "对齐模式",
    settingsAlignModeHelp: "默认：文本模式为左对齐",
    settingsAlignModeCenter: "居中",
    settingsAlignModeLeft: "左对齐",
    settingsAlignModeRight: "右对齐",
    settingsControlInvertLabel: "操作方向反转",
    settingsControlInvertHelp: "开启后切换为反向滚动顺序。",
    settingsAlignPaddingLabel: "对齐留白",
    settingsProgressStyleLabel: "进度条样式",
    settingsProgressStyleEq: "= -",
    settingsProgressStyleBlock: "█ ▒",
    settingsProgressStyleSquare: "■ □",
    settingsAutoHideEnabledLabel: "自动隐藏",
    settingsAutoHideSecondsLabel: "自动隐藏(秒)",
    settingsImageControlsTestLabel: "图像模式",
    settingsImageControlsUnstableNote: "当前图像图标模式不稳定。",
    settingsImageControlsFormatLabel: "发送格式",
    settingsImageControlsFormatNumber: "PNG number[]",
    settingsImageControlsFormatBase64: "PNG base64",
    settingsImageControlsFormatUint8: "PNG Uint8Array",
    settingsForceReopenButton: "强制重开页面",
    settingsImageControlsStatusLabel: "状态",
    settingsImageControlsPreviewLabel: "预览",
    settingsImageTextStatusTestLabel: "图像状态文本测试",
    settingsImageTextTitleTestLabel: "图像标题文本测试",
    settingsImageTextAlignLabel: "图像对齐模式",
    settingsImageTextFontWeightLabel: "图像文字加粗",
    settingsImageTextTitlePreviewLabel: "title 预览",
    settingsImageTextStatusPreviewLabel: "status 预览",
    settingsImageTextControlsPreviewLabel: "console 预览",
    settingsBorderInsetLabel: "内缩距离(px)",
    settingsBorderWidthLabel: "线宽(px)",
    glassesIconsLabel: "眼镜图标",
    glassesIconsSolid: "◀◀  ▶  ||  ▶▶",
    glassesIconsOpen: "◁◁  ▷  ||  ▷▷",
    glassesIconsAscii: "<<  >  ||  >>",
    devRateLimitLabel: "限流剩余倒计时",
    devRateLimitNone: "未处于限流冷却中。",
    manualRefreshButton: "刷新页面与眼镜",
    panelBChecking: "正在尝试连接...",
    panelBOk: "连接可用。若需控制，请先在任一设备开始播放。",
    panelBPremiumFailed: "失败，账户需要订阅 Spotify Premium。",
    embedEmpty: "暂无可嵌入内容，请先在任一设备开始播放歌曲。",
    bNoTrack: "暂无播放",
    bNoArtist: "Spotify",
    bNoTrackAction: "当前无可操作歌曲。",
    bBusy: "操作过快，请稍候。",
    btnPrev: "上一首",
    btnPlayPause: "播放/暂停",
    btnNext: "下一首",
    btnShuffle: "随机播放",
    btnRepeat: "循环模式",
    operationGuideLabel: "眼镜操作说明",
    operationClick: "单击：确认；隐藏时首次单击仅恢复显示",
    operationSwipe: "左右滚动：选择；隐藏时首次滚动仅恢复显示",
    operationDoubleClick: "双击：打开系统退出确认",
    iconGuideLabel: "眼镜图标说明",
    iconRepeatContext: "RA：歌单循环",
    iconRepeatTrack: "R1：单曲循环",
    iconShuffleOn: "S+：随机播放",
    iconShuffleOff: "S：不随机播放",
    iconRepeatOff: "->：不循环",
    iconHide: "H：隐藏 GlassesView",
    iconDevices: "DV：选择播放设备",
    iconPlaylists: "PL：选择已登陆的播放列表",
  },
  en: {
    title: "Even Hub Spotify Console",
    trust: "Used only for playback control, not for storing your Spotify password.",
    tipLogin: "Instructions: log in to Spotify first, then connect Spotify. Playback controls appear after connection.",
    loginButton: "Login Spotify",
    connectButton: "Connect Spotify",
    clearButton: "Clear Session",
    refreshGlassesButton: "Refresh Glasses",
    statusConnectionLabel: "Connection",
    statusClientLabel: "Client ID",
    statusRuntimeLabel: "Runtime",
    statusConnected: "Connected",
    statusNotConnected: "Not connected",
    statusClientConfigured: "Configured",
    statusClientMissing: "Missing",
    statusSourceServer: "Server",
    statusSourceRuntime: "Runtime",
    statusSourceEnv: "Env",
    statusSourceMissing: "Missing",
    statusConnectionHelp: "Connected means this WebView has synced a valid Spotify session. If not connected, run Connect Spotify first. If you changed the Client ID or origin, clear the session before reconnecting.",
    statusClientHelp: "The Client ID starts Spotify authorization. If it is missing or wrong, Spotify will reject the login flow.",
    statusRuntimeHelp: "This shows which config source is active. Server uses the local self-host config, Runtime uses this WebView's saved config, Env uses the build-time fallback, and Missing means no usable config was found.",
    callbackPrefix: "Callback error: ",
    authSetupFailedPrefix: "Auth setup failed: ",
    redirectUriMismatchMessage: "Redirect URI does not match. Check that the config file serviceOrigin and Spotify Developer Dashboard Redirect URIs are exactly the same.",
    spotifyConnectionStatusLabel: "Spotify connection status",
    spotifyStatusLoggedIn: "Logged in",
    spotifyStatusConnected: "Connected",
    spotifyStatusNotConnected: "Not connected",
    spotifyStatusNotLoggedIn: "Not logged in",
    serverConnectionStatusLabel: "Server connection status",
    serverDomainButton: "Input server domain",
    serverOriginLabel: "Server API Origin",
    serverOriginSaveButton: "Save and connect server",
    authTargetPrompt: "Enter the server Tailscale full domain without https://. Leave blank to use local simulator 127.0.0.1.",
    authTargetPromptDefault: "Example: your-device.your-tailnet.ts.net",
    authTargetConfigured: "Server origin saved and connected.",
    localSimulatorConfigured: "Local simulator Redirect URI configured.",
    missingConfigMessage: "Missing Spotify Client ID. Check the config file or simulator config.",
    originChangedMessage: "Client ID or Redirect URI changed. Clear Session in Settings, then authorize again.",
    invalidServiceOriginMessage: "Invalid server Tailscale domain.",
    localAuthServerUnavailable: "Local auth server unavailable. Confirm the self-host server is running.",
    sessionCleared: "Session cleared.",
    glassesRefreshHint: "Note: if glasses do not refresh right after connect, tap once on glasses or reopen the page.",
    languageLabel: "Language",
    settingsButton: "Settings",
    settingsBackButton: "Back",
    settingsTitle: "Settings",
    settingsInfoLabel: "Info",
    settingsSessionLabel: "Spotify Session",
    settingsSessionHelp: "Clearing the session removes the current Spotify authorization and requires reconnecting.",
    settingsVersionLabel: "Version",
    settingsModeLabel: "Playback Control Mode",
    settingsModeHelp: "Embed does not need Premium but cannot control. Remote needs Premium and can control playback.",
    settingsModeEmbed: "Embed",
    settingsModeRemote: "Remote",
    settingsDisplayModeLabel: "Display Mode",
    settingsDisplayModeText: "Text",
    settingsDisplayModeHybrid: "Hybrid",
    settingsDisplayModeImage: "Image",
    settingsGlassesDisplayGroupLabel: "Glasses Display Mode",
    settingsLayoutModeLabel: "Glasses Layout Mode",
    settingsLayoutModePureText: "Pure Text",
    settingsLayoutModeAlbumArt: "Album Art",
    settingsAlbumArtSizeLabel: "Album Art Size",
    settingsAlbumArtSizeSmall: "Small",
    settingsAlbumArtSizeLarge: "Large",
    settingsAlbumArtOpacityLabel: "Album Art Opacity",
    settingsAlbumArtPreviewLabel: "Album Art Container Preview",
    settingsAlbumArtPreviewEmpty: "Transparent placeholder",
    settingsGlassesRenderStatusLabel: "Glasses Render Status",
    settingsBorderLabel: "Outer Border",
    settingsBorderRadiusLabel: "Corner Radius",
    settingsConfigGroupLabel: "WebView Settings Config",
    settingsConfigHelp: "Saves only language, glasses display, and page preferences. Spotify sessions and passwords are not saved.",
    settingsConfigSaveServer: "Save settings config to server",
    settingsConfigLoadServer: "Load settings config from server",
    settingsConfigSaveLocal: "Save to local file",
    settingsConfigLoadLocal: "Load from local file",
    settingsConfigSavedServer: "Settings config saved to server.",
    settingsConfigLoadedServer: "Settings config loaded from server.",
    settingsConfigNoServerFile: "No settings config file exists on the server yet.",
    settingsConfigSavedLocal: "Settings config saved to local file.",
    settingsConfigLoadedLocal: "Settings config loaded from local file.",
    settingsConfigInvalidFile: "Invalid settings config file.",
    settingsDevModeLabel: "Developer Mode",
    settingsAlignModeLabel: "Align Mode",
    settingsAlignModeHelp: "Default: text mode uses left alignment",
    settingsAlignModeCenter: "Center",
    settingsAlignModeLeft: "Left",
    settingsAlignModeRight: "Right",
    settingsControlInvertLabel: "Invert Direction",
    settingsControlInvertHelp: "When enabled, the glasses control scroll order is reversed.",
    settingsAlignPaddingLabel: "Align Padding",
    settingsProgressStyleLabel: "Progress Bar Style",
    settingsProgressStyleEq: "= -",
    settingsProgressStyleBlock: "█ ▒",
    settingsProgressStyleSquare: "■ □",
    settingsAutoHideEnabledLabel: "Auto Hide",
    settingsAutoHideSecondsLabel: "Auto Hide (sec)",
    settingsImageControlsTestLabel: "Image Mode",
    settingsImageControlsUnstableNote: "Current image icon mode is unstable.",
    settingsImageControlsFormatLabel: "Send Format",
    settingsImageControlsFormatNumber: "PNG number[]",
    settingsImageControlsFormatBase64: "PNG base64",
    settingsImageControlsFormatUint8: "PNG Uint8Array",
    settingsForceReopenButton: "Force Reopen Page",
    settingsImageControlsStatusLabel: "Status",
    settingsImageControlsPreviewLabel: "Preview",
    settingsImageTextStatusTestLabel: "Image Text Status Test",
    settingsImageTextTitleTestLabel: "Image Text Title Test",
    settingsImageTextAlignLabel: "Image Align",
    settingsImageTextFontWeightLabel: "Image Text Bold",
    settingsImageTextTitlePreviewLabel: "Title Preview",
    settingsImageTextStatusPreviewLabel: "Status Preview",
    settingsImageTextControlsPreviewLabel: "Controls Preview",
    settingsBorderInsetLabel: "Inset (px)",
    settingsBorderWidthLabel: "Line Width (px)",
    glassesIconsLabel: "Glasses Icons",
    glassesIconsSolid: "◀◀  ▶  ||  ▶▶",
    glassesIconsOpen: "◁◁  ▷  ||  ▷▷",
    glassesIconsAscii: "<<  >  ||  >>",
    devRateLimitLabel: "Rate-limit Countdown",
    devRateLimitNone: "No active rate-limit cooldown.",
    manualRefreshButton: "Refresh Page + Glasses",
    panelBChecking: "Trying to connect...",
    panelBOk: "Connection available. Start playback on any device before control actions.",
    panelBPremiumFailed: "Failed: this account requires Spotify Premium.",
    embedEmpty: "No embeddable content yet. Start playback on any Spotify device first.",
    bNoTrack: "No active track",
    bNoArtist: "Spotify",
    bNoTrackAction: "No playable track for this action.",
    bBusy: "Controls are busy. Try again in a moment.",
    btnPrev: "Previous",
    btnPlayPause: "Play/Pause",
    btnNext: "Next",
    btnShuffle: "Shuffle",
    btnRepeat: "Repeat mode",
    operationGuideLabel: "Glasses controls",
    operationClick: "Click: confirm; when hidden, the first click only restores the display",
    operationSwipe: "Scroll left/right: choose; when hidden, the first scroll only restores the display",
    operationDoubleClick: "Double-click: open the system exit confirmation",
    iconGuideLabel: "Glasses icon guide",
    iconRepeatContext: "RA: playlist repeat",
    iconRepeatTrack: "R1: single-track repeat",
    iconShuffleOn: "S+: shuffle on",
    iconShuffleOff: "S: shuffle off",
    iconRepeatOff: "->: repeat off",
    iconHide: "H: hide GlassesView",
    iconDevices: "DV: choose playback device",
    iconPlaylists: "PL: choose logged-in playlist",
  },
  ja: {
    title: "Even Hub Spotify Console",
    trust: "再生コントロール用途のみで、Spotify パスワードは保存しません。",
    tipLogin: "使い方：初回は Spotify にログインしてから接続してください。接続後に再生コントロールが表示されます。",
    loginButton: "Spotifyにログイン",
    connectButton: "Spotify接続",
    clearButton: "セッション削除",
    refreshGlassesButton: "メガネ更新",
    statusConnectionLabel: "接続状態",
    statusClientLabel: "Client ID状態",
    statusRuntimeLabel: "実行状態",
    statusConnected: "接続済み",
    statusNotConnected: "未接続",
    statusClientConfigured: "設定済み",
    statusClientMissing: "未設定",
    statusSourceServer: "Server",
    statusSourceRuntime: "Runtime",
    statusSourceEnv: "Env",
    statusSourceMissing: "Missing",
    statusConnectionHelp: "接続済みは、この WebView が Spotify セッションを同期できている状態です。未接続なら先に Spotify 接続を行い、Client ID やドメインを変更した直後なら先にセッションを削除してください。",
    statusClientHelp: "Client ID は Spotify 認可の開始に必要です。未設定または誤りがあると、Spotify 側で認可が拒否されます。",
    statusRuntimeHelp: "現在どの設定ソースを使っているかを示します。Server はローカルサーバー設定、Runtime はこの WebView の保存設定、Env はビルド時の既定値、Missing は有効な設定がない状態です。",
    callbackPrefix: "コールバックエラー: ",
    authSetupFailedPrefix: "認可初期化失敗: ",
    redirectUriMismatchMessage: "Redirect URI が一致しません。設定ファイルの serviceOrigin と Spotify Developer Dashboard の Redirect URIs が完全に一致しているか確認してください。",
    spotifyConnectionStatusLabel: "Spotify接続状態",
    spotifyStatusLoggedIn: "ログイン済み",
    spotifyStatusConnected: "接続済み",
    spotifyStatusNotConnected: "未接続",
    spotifyStatusNotLoggedIn: "未ログイン",
    serverConnectionStatusLabel: "サーバー接続状態",
    serverDomainButton: "サーバードメイン入力",
    serverOriginLabel: "サーバー API Origin",
    serverOriginSaveButton: "保存してサーバー接続",
    authTargetPrompt: "サーバーの Tailscale 完全ドメインを https:// なしで入力してください。空欄なら local simulator 127.0.0.1 を使います。",
    authTargetPromptDefault: "例：your-device.your-tailnet.ts.net",
    authTargetConfigured: "サーバー Origin を保存して接続しました。",
    localSimulatorConfigured: "Local simulator Redirect URI を設定しました。",
    missingConfigMessage: "Spotify Client ID がありません。設定ファイルまたは simulator config を確認してください。",
    originChangedMessage: "Client ID または Redirect URI が変わりました。設定でセッションを削除してから再認可してください。",
    invalidServiceOriginMessage: "サーバー Tailscale ドメインが無効です。",
    localAuthServerUnavailable: "Local auth server が使えません。self-host server が起動しているか確認してください。",
    sessionCleared: "セッションを削除しました。",
    glassesRefreshHint: "接続後すぐにメガネ側が更新されない場合は、メガネで1回クリックするかページを再表示してください。",
    languageLabel: "言語",
    settingsButton: "設定",
    settingsBackButton: "戻る",
    settingsTitle: "設定",
    settingsInfoLabel: "情報",
    settingsSessionLabel: "Spotify セッション",
    settingsSessionHelp: "セッションを削除すると現在の Spotify 認可が消え、再接続が必要になります。",
    settingsVersionLabel: "バージョン",
    settingsModeLabel: "再生コントロールモード",
    settingsModeHelp: "Embed は Premium 不要ですが操作不可、Remote は Premium 必須で操作できます。",
    settingsModeEmbed: "Embed",
    settingsModeRemote: "Remote",
    settingsDisplayModeLabel: "表示モード",
    settingsDisplayModeText: "テキスト",
    settingsDisplayModeHybrid: "ハイブリッド",
    settingsDisplayModeImage: "画像",
    settingsGlassesDisplayGroupLabel: "メガネ表示モード",
    settingsLayoutModeLabel: "メガネ編成モード",
    settingsLayoutModePureText: "純テキスト",
    settingsLayoutModeAlbumArt: "アルバム画像付き",
    settingsAlbumArtSizeLabel: "アルバム画像サイズ",
    settingsAlbumArtSizeSmall: "小",
    settingsAlbumArtSizeLarge: "大",
    settingsAlbumArtOpacityLabel: "アルバム画像透明度",
    settingsAlbumArtPreviewLabel: "アルバム画像コンテナプレビュー",
    settingsAlbumArtPreviewEmpty: "透明プレースホルダー",
    settingsGlassesRenderStatusLabel: "メガネ描画状態",
    settingsBorderLabel: "外枠ボーダー",
    settingsBorderRadiusLabel: "角丸",
    settingsConfigGroupLabel: "WebView 設定ファイル",
    settingsConfigHelp: "言語、メガネ表示、ページ設定のみ保存します。Spotify セッションやパスワードは保存しません。",
    settingsConfigSaveServer: "設定をサーバーに保存",
    settingsConfigLoadServer: "サーバーから設定を読み込み",
    settingsConfigSaveLocal: "本機に保存",
    settingsConfigLoadLocal: "本機から読み込み",
    settingsConfigSavedServer: "設定をサーバーに保存しました。",
    settingsConfigLoadedServer: "サーバーから設定を読み込みました。",
    settingsConfigNoServerFile: "サーバーに設定ファイルがまだありません。",
    settingsConfigSavedLocal: "設定ファイルを本機に保存しました。",
    settingsConfigLoadedLocal: "本機から設定を読み込みました。",
    settingsConfigInvalidFile: "設定ファイルが無効です。",
    settingsDevModeLabel: "開発者モード",
    settingsAlignModeLabel: "配置",
    settingsAlignModeHelp: "既定: テキスト表示は左寄せ",
    settingsAlignModeCenter: "中央",
    settingsAlignModeLeft: "左寄せ",
    settingsAlignModeRight: "右寄せ",
    settingsControlInvertLabel: "操作方向反転",
    settingsControlInvertHelp: "オンにすると、メガネ側のスクロール順序を反転します。",
    settingsAlignPaddingLabel: "配置余白",
    settingsProgressStyleLabel: "進捗バー表示",
    settingsProgressStyleEq: "= -",
    settingsProgressStyleBlock: "█ ▒",
    settingsProgressStyleSquare: "■ □",
    settingsAutoHideEnabledLabel: "自動非表示",
    settingsAutoHideSecondsLabel: "自動非表示 (秒)",
    settingsImageControlsTestLabel: "画像モード",
    settingsImageControlsUnstableNote: "現在の画像アイコンモードは不安定です。",
    settingsImageControlsFormatLabel: "送信形式",
    settingsImageControlsFormatNumber: "PNG number[]",
    settingsImageControlsFormatBase64: "PNG base64",
    settingsImageControlsFormatUint8: "PNG Uint8Array",
    settingsForceReopenButton: "ページ強制再生成",
    settingsImageControlsStatusLabel: "状態",
    settingsImageControlsPreviewLabel: "プレビュー",
    settingsImageTextStatusTestLabel: "画像ステータス文字試験",
    settingsImageTextTitleTestLabel: "画像タイトル文字試験",
    settingsImageTextAlignLabel: "画像寄せ",
    settingsImageTextFontWeightLabel: "画像テキスト太字",
    settingsImageTextTitlePreviewLabel: "title プレビュー",
    settingsImageTextStatusPreviewLabel: "status プレビュー",
    settingsImageTextControlsPreviewLabel: "controls プレビュー",
    settingsBorderInsetLabel: "内側余白(px)",
    settingsBorderWidthLabel: "線幅(px)",
    glassesIconsLabel: "メガネ図標",
    glassesIconsSolid: "◀◀  ▶  ||  ▶▶",
    glassesIconsOpen: "◁◁  ▷  ||  ▷▷",
    glassesIconsAscii: "<<  >  ||  >>",
    devRateLimitLabel: "制限解除まで",
    devRateLimitNone: "現在はレート制限のクールダウン中ではありません。",
    manualRefreshButton: "ページとメガネを更新",
    panelBChecking: "接続を試行中...",
    panelBOk: "接続可能です。操作前に任意デバイスで再生を開始してください。",
    panelBPremiumFailed: "失敗：このアカウントでは Spotify Premium が必要です。",
    embedEmpty: "埋め込み対象がありません。先に任意デバイスで再生を開始してください。",
    bNoTrack: "再生中の曲がありません",
    bNoArtist: "Spotify",
    bNoTrackAction: "操作できる曲がありません。",
    bBusy: "操作が混み合っています。少し待ってください。",
    btnPrev: "前の曲",
    btnPlayPause: "再生/一時停止",
    btnNext: "次の曲",
    btnShuffle: "シャッフル",
    btnRepeat: "リピートモード",
    operationGuideLabel: "メガネ操作説明",
    operationClick: "クリック：確定（非表示中の最初のクリックは表示復元のみ）",
    operationSwipe: "左右スクロール：選択（非表示中の最初のスクロールは表示復元のみ）",
    operationDoubleClick: "ダブルクリック：システムの終了確認を開く",
    iconGuideLabel: "メガネアイコン説明",
    iconRepeatContext: "RA：プレイリストリピート",
    iconRepeatTrack: "R1：1曲リピート",
    iconShuffleOn: "S+：シャッフルオン",
    iconShuffleOff: "S：シャッフルオフ",
    iconRepeatOff: "->：リピートなし",
    iconHide: "H：GlassesView を非表示",
    iconDevices: "DV：再生デバイス選択",
    iconPlaylists: "PL：ログイン済みプレイリスト選択",
  },
};

function normalizeLanguage(value: string | null | undefined): LanguageCode {
  if (!value) {
    return "en";
  }
  if (value === "zh" || value === "en" || value === "ja") {
    return value;
  }
  if (value.toLowerCase().startsWith("zh")) {
    return "zh";
  }
  if (value.toLowerCase().startsWith("ja")) {
    return "ja";
  }
  return "en";
}

function readBrowserLanguage(): LanguageCode {
  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = candidate.toLowerCase();
    if (normalized.startsWith("zh")) {
      return "zh";
    }
    if (normalized.startsWith("ja")) {
      return "ja";
    }
    if (normalized.startsWith("en")) {
      return "en";
    }
  }

  return "en";
}

function readInitialLanguage(): LanguageCode {
  const fromStorage = localStorage.getItem(LANGUAGE_KEY);
  if (fromStorage) {
    return normalizeLanguage(fromStorage);
  }
  return readBrowserLanguage();
}

const GLASSES_ERROR_TEXT: Record<LanguageCode, Record<SpotifyErrorCode, string>> = {
  zh: {
    AUTH_REQUIRED: "请在手机端授权 Spotify",
    AUTH_EXPIRED: "会话已过期，请重新授权",
    NO_ACTIVE_DEVICE: "没有活跃的 Spotify 设备",
    PREMIUM_REQUIRED: "需要 Spotify Premium",
    NETWORK: "网络异常，请检查手机浏览器",
    RATE_LIMITED: "请求过快，请稍后重试",
    UNKNOWN: "Spotify 错误，请在手机端处理",
  },
  en: {
    AUTH_REQUIRED: "Please authorize Spotify on phone.",
    AUTH_EXPIRED: "Spotify session expired. Re-authorize on phone.",
    NO_ACTIVE_DEVICE: "No active Spotify device.",
    PREMIUM_REQUIRED: "Spotify Premium required.",
    NETWORK: "Network issue. Check phone browser.",
    RATE_LIMITED: "Rate limited. Try again later.",
    UNKNOWN: "Spotify error. Resolve in phone browser.",
  },
  ja: {
    AUTH_REQUIRED: "スマホで Spotify を認証してください",
    AUTH_EXPIRED: "セッション期限切れ。再認証してください",
    NO_ACTIVE_DEVICE: "有効な Spotify デバイスがありません",
    PREMIUM_REQUIRED: "Spotify Premium が必要です",
    NETWORK: "ネットワークを確認してください",
    RATE_LIMITED: "リクエスト過多です。後で再試行してください",
    UNKNOWN: "Spotify エラーです。スマホで確認してください",
  },
};

function normalizePhonePanel(value: string | null | undefined): PhonePanel {
  return value === "A" ? "A" : "B";
}

function readInitialPhonePanel(): PhonePanel {
  return normalizePhonePanel(localStorage.getItem(PHONE_PANEL_KEY));
}

function normalizeGlassesControlVariant(value: string | null | undefined): ControlGlyphVariant {
  if (value === "ascii" || value === "open" || value === "solid") {
    return value;
  }

  return "solid";
}

function readInitialGlassesControlVariant(): ControlGlyphVariant {
  return normalizeGlassesControlVariant(localStorage.getItem(GLASSES_CONTROL_VARIANT_KEY));
}

function normalizeTextAlignMode(value: string | null | undefined): TextAlignMode {
  if (value === "left" || value === "right" || value === "center") {
    return value;
  }

  return DEFAULT_TEXT_MODE_ALIGN;
}

function readInitialTextAlignMode(): TextAlignMode {
  return DEFAULT_TEXT_MODE_ALIGN;
}

function readInitialControlInvert(): boolean {
  return readStoredBoolean(GLASSES_CONTROL_INVERT_KEY, false);
}

function normalizeProgressBarStyle(value: string | null | undefined): ProgressBarStyle {
  if (value === "eq" || value === "block" || value === "square") {
    return value;
  }

  return "eq";
}

function readInitialProgressBarStyle(): ProgressBarStyle {
  return normalizeProgressBarStyle(localStorage.getItem(GLASSES_PROGRESS_BAR_STYLE_KEY));
}

function ensureAutoHideDefaultOffMigrationOnce(): void {
  try {
    if (localStorage.getItem(GLASSES_AUTO_HIDE_DEFAULT_OFF_MIGRATION_KEY) === "1") {
      return;
    }

    localStorage.setItem(GLASSES_AUTO_HIDE_ENABLED_KEY, "false");
    localStorage.setItem(GLASSES_AUTO_HIDE_DEFAULT_OFF_MIGRATION_KEY, "1");
  } catch {
    // ignore storage errors
  }
}

function readInitialAutoHideEnabled(): boolean {
  ensureAutoHideDefaultOffMigrationOnce();
  return readStoredBoolean(GLASSES_AUTO_HIDE_ENABLED_KEY, false);
}

function readInitialAutoHideSeconds(): number {
  return readStoredNumber(GLASSES_AUTO_HIDE_SECONDS_KEY, 5, 0, 120);
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return fallback;
}

function clampStoredNumber(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function readStoredNumber(key: string, fallback: number, min: number, max: number): number {
  const rawValue = localStorage.getItem(key);
  if (rawValue === null || rawValue.trim() === "") {
    return fallback;
  }

  return clampStoredNumber(Number(rawValue), fallback, min, max);
}

function readInitialDeveloperMode(): boolean {
  return readStoredBoolean(DEVELOPER_MODE_KEY, false);
}

function normalizeDeveloperGlassesPageOverride(value: string | null | undefined): DeveloperGlassesPageOverride {
  if (value === "now_playing" || value === "playlists" || value === "devices" || value === "auto") {
    return value;
  }
  return "auto";
}

function isDeviceMockPresetId(value: string): value is DeviceMockPresetId {
  return value in DEVICE_MOCK_PRESETS;
}

function readStoredStringArray(key: string): string[] | null {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : null;
  } catch {
    return null;
  }
}

function repairStoredPresetArray<T extends string>(
  rawItems: string[] | null,
  defaults: readonly T[],
  expectedLength: number,
  predicate: (value: string) => value is T,
): T[] {
  if (!rawItems || rawItems.length !== expectedLength) {
    return [...defaults];
  }
  return rawItems.map((value, index) => (predicate(value) ? value : defaults[index])) as T[];
}

function readInitialDeveloperGlassesPageOverride(): DeveloperGlassesPageOverride {
  return normalizeDeveloperGlassesPageOverride(localStorage.getItem(DEVELOPER_GLASSES_PAGE_OVERRIDE_KEY));
}

function normalizeDeveloperGlassesLayoutMode(value: string | null | undefined): DeveloperGlassesLayoutMode {
  return value === "album-art" ? "album-art" : "pure-text";
}

function readInitialDeveloperGlassesLayoutMode(): DeveloperGlassesLayoutMode {
  return normalizeDeveloperGlassesLayoutMode(localStorage.getItem(DEVELOPER_GLASSES_LAYOUT_MODE_KEY));
}

function clampAlbumArtSizePx(value: number, fallback = ALBUM_ART_SIZE_LARGE_PX): number {
  const clamped = clampStoredNumber(
    value,
    fallback,
    ALBUM_ART_SIZE_SMALL_PX,
    ALBUM_ART_SIZE_LARGE_PX,
  );
  if (clamped <= (ALBUM_ART_SIZE_SMALL_PX + ALBUM_ART_SIZE_MEDIUM_PX) / 2) {
    return ALBUM_ART_SIZE_SMALL_PX;
  }
  if (clamped <= (ALBUM_ART_SIZE_MEDIUM_PX + ALBUM_ART_SIZE_LARGE_PX) / 2) {
    return ALBUM_ART_SIZE_MEDIUM_PX;
  }
  return ALBUM_ART_SIZE_LARGE_PX;
}

function readInitialAlbumArtSizePx(): number {
  return clampAlbumArtSizePx(
    readStoredNumber(
      DEVELOPER_ALBUM_ART_SIZE_KEY,
      ALBUM_ART_SIZE_LARGE_PX,
      ALBUM_ART_SIZE_SMALL_PX,
      ALBUM_ART_SIZE_LARGE_PX,
    ),
    ALBUM_ART_SIZE_LARGE_PX,
  );
}

function clampAlbumArtGapPx(value: number, fallback = FIXED_ALBUM_ART_GAP_PX): number {
  void value;
  return clampStoredNumber(fallback, FIXED_ALBUM_ART_GAP_PX, FIXED_ALBUM_ART_GAP_PX, FIXED_ALBUM_ART_GAP_PX);
}

function readInitialAlbumArtGapPx(): number {
  return clampAlbumArtGapPx(
    readStoredNumber(
      DEVELOPER_ALBUM_ART_GAP_KEY,
      FIXED_ALBUM_ART_GAP_PX,
      FIXED_ALBUM_ART_GAP_PX,
      FIXED_ALBUM_ART_GAP_PX,
    ),
    FIXED_ALBUM_ART_GAP_PX,
  );
}

function clampAlbumArtOpacityPercent(value: number, fallback = 100): number {
  const clamped = clampStoredNumber(
    value,
    fallback,
    ALBUM_ART_OPACITY_MIN_PERCENT,
    ALBUM_ART_OPACITY_MAX_PERCENT,
  );
  const snapped =
    ALBUM_ART_OPACITY_MIN_PERCENT +
    Math.round((clamped - ALBUM_ART_OPACITY_MIN_PERCENT) / ALBUM_ART_OPACITY_STEP_PERCENT) *
      ALBUM_ART_OPACITY_STEP_PERCENT;
  return Math.round(
    clampStoredNumber(
      snapped,
      ALBUM_ART_OPACITY_MAX_PERCENT,
      ALBUM_ART_OPACITY_MIN_PERCENT,
      ALBUM_ART_OPACITY_MAX_PERCENT,
    ),
  );
}

function readInitialAlbumArtOpacityPercent(): number {
  return clampAlbumArtOpacityPercent(
    readStoredNumber(
      DEVELOPER_ALBUM_ART_OPACITY_KEY,
      ALBUM_ART_OPACITY_MAX_PERCENT,
      ALBUM_ART_OPACITY_MIN_PERCENT,
      ALBUM_ART_OPACITY_MAX_PERCENT,
    ),
    ALBUM_ART_OPACITY_MAX_PERCENT,
  );
}

function normalizeStoredPlaylistSlotId(value: string): string {
  return value.trim();
}

function readInitialSelectedPlaylistSlotIds(): string[] {
  const rawItems = readStoredStringArray(SELECTED_PLAYLIST_SLOT_IDS_KEY);
  if (!rawItems) {
    return [];
  }

  const normalized = rawItems
    .slice(0, MAX_ADDED_PLAYLIST_SLOTS)
    .map(normalizeStoredPlaylistSlotId)
    .filter((playlistId) => playlistId !== LIKED_SONGS_ENTRY.id);

  return normalized;
}

function persistSelectedPlaylistSlotIds(): void {
  localStorage.setItem(SELECTED_PLAYLIST_SLOT_IDS_KEY, JSON.stringify(state.selectedPlaylistSlotIds));
}

function readInitialPlaylistScrollInvert(): boolean {
  return readStoredBoolean(PLAYLIST_SCROLL_INVERT_KEY, false);
}

function readInitialMockDeviceSlotPresetIds(): DeviceMockPresetId[] {
  return repairStoredPresetArray(
    readStoredStringArray(MOCK_DEVICE_SLOT_PRESETS_KEY),
    DEFAULT_MOCK_DEVICE_SLOT_PRESETS,
    MOCK_DEVICE_SLOT_COUNT,
    isDeviceMockPresetId,
  );
}

function createSelectablePageState(): SelectablePageState {
  return {
    focusIndex: 0,
    selectedIndex: 0,
    windowStart: 0,
  };
}

let borderSettingsResetChecked = false;

function ensureBorderSettingsResetOnce(): void {
  if (borderSettingsResetChecked) {
    return;
  }
  borderSettingsResetChecked = true;

  try {
    if (localStorage.getItem(BORDER_SETTINGS_RESET_ONCE_KEY) === "1") {
      return;
    }

    localStorage.setItem(BORDER_ENABLED_KEY, "true");
    localStorage.setItem(BORDER_INSET_KEY, "5");
    localStorage.setItem(BORDER_WIDTH_KEY, "3");
    localStorage.setItem(BORDER_RADIUS_KEY, "0");
    localStorage.setItem(IMAGE_MODE_KEY, "text");
    localStorage.setItem(IMAGE_CONTROLS_TEST_KEY, "false");
    localStorage.setItem(IMAGE_TEXT_STATUS_TEST_KEY, "false");
    localStorage.setItem(IMAGE_TEXT_TITLE_TEST_KEY, "false");
    localStorage.setItem(GLASSES_AUTO_HIDE_ENABLED_KEY, "false");
    localStorage.setItem(BORDER_SETTINGS_RESET_ONCE_KEY, "1");
  } catch {
    // ignore storage errors
  }
}

function readInitialBorderEnabled(): boolean {
  ensureBorderSettingsResetOnce();
  return readStoredBoolean(BORDER_ENABLED_KEY, false);
}

function readInitialBorderInsetPx(): number {
  ensureBorderSettingsResetOnce();
  return readStoredNumber(BORDER_INSET_KEY, 5, 0, 40);
}

function readInitialBorderWidthPx(): number {
  ensureBorderSettingsResetOnce();
  return readStoredNumber(BORDER_WIDTH_KEY, 3, 0, 5);
}

function clampBorderRadiusPx(value: number, fallback = 0): number {
  const clamped = clampStoredNumber(value, fallback, 0, 20);
  return Math.round(clamped / 5) * 5;
}

function readInitialBorderRadius(): number {
  ensureBorderSettingsResetOnce();
  const rawValue = localStorage.getItem(BORDER_RADIUS_KEY);
  if (rawValue === null || rawValue.trim() === "") {
    return 0;
  }

  return clampBorderRadiusPx(Number(rawValue), 0);
}

function readInitialImageModeEnabled(): boolean {
  ensureBorderSettingsResetOnce();
  return false;
}

function readInitialFullImageTextModeEnabled(): boolean {
  return false;
}

function normalizeImageControlsSendFormat(value: string | null | undefined): ImageControlsSendFormat {
  void value;
  return "png-number";
}

function readInitialImageControlsSendFormat(): ImageControlsSendFormat {
  return "png-number";
}

function readInitialImageTextStatusTest(): boolean {
  return readStoredBoolean(IMAGE_TEXT_STATUS_TEST_KEY, false);
}

function readInitialImageTextTitleTest(): boolean {
  return readStoredBoolean(IMAGE_TEXT_TITLE_TEST_KEY, false);
}

function normalizeImageTextAlignMode(value: string | null | undefined): ImageTextAlignMode {
  if (value === "left" || value === "right" || value === "center") {
    return value;
  }

  return "center";
}

function readInitialImageTextAlignMode(): ImageTextAlignMode {
  return normalizeImageTextAlignMode(localStorage.getItem(IMAGE_TEXT_ALIGN_KEY));
}

function normalizeImageTextFontWeight(value: number): number {
  return Number.isFinite(value) && value >= 350 ? 400 : 100;
}

function readInitialImageTextFontWeight(): number {
  return normalizeImageTextFontWeight(readStoredNumber(IMAGE_TEXT_FONT_WEIGHT_KEY, 100, 100, 700));
}

function readInitialSelfHostMode(): SelfHostMode {
  return readSelfHostConfig()?.mode ?? "same-origin";
}

function readInitialSelfHostClientIdInput(): string {
  return readSelfHostConfig()?.spotifyClientId ?? "";
}

function readInitialSelfHostServiceOriginInput(): string {
  return readSelfHostConfig()?.serviceOrigin ?? getEffectiveConfigState().serviceOrigin;
}

function isWebViewSettingsStorageKey(key: string): key is (typeof WEBVIEW_SETTINGS_STORAGE_KEYS)[number] {
  return (WEBVIEW_SETTINGS_STORAGE_KEYS as readonly string[]).includes(key);
}

function collectWebViewSettingsConfig(): WebViewSettingsConfig {
  const settings: Record<string, string> = {};
  for (const key of WEBVIEW_SETTINGS_STORAGE_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      settings[key] = value;
    }
  }

  return {
    schemaVersion: WEBVIEW_SETTINGS_CONFIG_SCHEMA_VERSION,
    app: WEBVIEW_SETTINGS_CONFIG_APP,
    savedAt: new Date().toISOString(),
    buildVersion: __BUILD_VERSION__,
    settings,
  };
}

function normalizeWebViewSettingsConfig(rawConfig: unknown): WebViewSettingsConfig | null {
  let parsed = rawConfig;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const candidate = parsed as Partial<WebViewSettingsConfig> & { settings?: unknown };
  const rawSettings = candidate.settings && typeof candidate.settings === "object" && !Array.isArray(candidate.settings)
    ? candidate.settings as Record<string, unknown>
    : null;
  if (!rawSettings) {
    return null;
  }

  const settings: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawSettings)) {
    if (isWebViewSettingsStorageKey(key) && typeof value === "string") {
      settings[key] = value;
    }
  }

  return {
    schemaVersion: WEBVIEW_SETTINGS_CONFIG_SCHEMA_VERSION,
    app: WEBVIEW_SETTINGS_CONFIG_APP,
    savedAt: typeof candidate.savedAt === "string" ? candidate.savedAt : new Date().toISOString(),
    buildVersion: typeof candidate.buildVersion === "string" ? candidate.buildVersion : "",
    settings,
  };
}

function syncRuntimeStateFromStoredSettings(): void {
  state.language = readInitialLanguage();
  state.phonePanel = readInitialPhonePanel();
  state.glassesControlVariant = readInitialGlassesControlVariant();
  state.glassesTextAlignMode = readInitialTextAlignMode();
  state.glassesControlInvert = readInitialControlInvert();
  state.glassesAlignPaddingPx = readInitialAlignPaddingPx();
  state.glassesProgressBarStyle = readInitialProgressBarStyle();
  state.glassesAutoHideEnabled = readInitialAutoHideEnabled();
  state.glassesAutoHideSeconds = readInitialAutoHideSeconds();
  state.developerMode = readInitialDeveloperMode();
  state.developerGlassesPageOverride = readInitialDeveloperGlassesPageOverride();
  state.developerGlassesLayoutMode = readInitialDeveloperGlassesLayoutMode();
  state.albumArtSizePx = readInitialAlbumArtSizePx();
  state.albumArtGapPx = readInitialAlbumArtGapPx();
  state.albumArtOpacityPercent = readInitialAlbumArtOpacityPercent();
  state.selectedPlaylistSlotIds = readInitialSelectedPlaylistSlotIds();
  state.playlistScrollInverted = readStoredBoolean(PLAYLIST_SCROLL_INVERT_KEY, state.glassesControlInvert);
  state.mockDeviceSlotPresetIds = readInitialMockDeviceSlotPresetIds();
  state.imageModeEnabled = readInitialImageModeEnabled();
  state.fullImageTextModeEnabled = readInitialFullImageTextModeEnabled();
  state.imageControlsSendFormat = readInitialImageControlsSendFormat();
  state.imageTextAlignMode = readInitialImageTextAlignMode();
  state.imageTextFontWeight = readInitialImageTextFontWeight();
  state.borderEnabled = readInitialBorderEnabled();
  state.borderInsetPx = readInitialBorderInsetPx();
  state.borderWidthPx = readInitialBorderWidthPx();
  state.borderRadius = readInitialBorderRadius();
  syncConfiguredPlaylistEntries();
  clearAutoHideTimer();
  lastAlbumArtSongKey = "";
  pendingAlbumArtImageUpdate = null;
  albumArtImageUpdateInFlight = false;
  lastPhoneRenderSignature = "";
  lastRenderSignature = "";
}

function applyWebViewSettingsConfig(rawConfig: unknown): boolean {
  const config = normalizeWebViewSettingsConfig(rawConfig);
  if (!config) {
    return false;
  }

  let applied = false;
  for (const key of WEBVIEW_SETTINGS_STORAGE_KEYS) {
    const value = config.settings[key];
    if (typeof value === "string") {
      localStorage.setItem(key, value);
      applied = true;
    }
  }

  if (!applied) {
    return false;
  }

  localStorage.setItem(BORDER_SETTINGS_RESET_ONCE_KEY, "1");
  localStorage.setItem(GLASSES_AUTO_HIDE_DEFAULT_OFF_MIGRATION_KEY, "1");
  syncRuntimeStateFromStoredSettings();
  return true;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentTrackEmbedUrl(): string {
  const trackId = state.playback?.trackId ?? "";
  if (!trackId || trackId === "unknown") {
    return "";
  }

  return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
}

function renderControlIcon(
  icon: "prev" | "play" | "pause" | "next" | "shuffle" | "repeat" | "repeat-track",
  active: boolean,
): string {
  const stroke = active ? "#1DB954" : "#FFFFFF";
  const fill = active ? "#1DB954" : "#FFFFFF";

  switch (icon) {
    case "prev":
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14"/><path d="M18 6l-8 6 8 6V6z"/></svg>`;
    case "play":
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="${fill}"><path d="M8 5v14l11-7z"/></svg>`;
    case "pause":
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="${fill}"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`;
    case "next":
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 5v14"/><path d="M6 6l8 6-8 6V6z"/></svg>`;
    case "shuffle":
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.8c.7 0 1.4.3 1.9.8l8.5 8.5c.5.5 1.2.8 1.9.8H21"/><path d="M18 5l3 3-3 3"/><path d="M3 17h3.8c.7 0 1.4-.3 1.9-.8l1.8-1.8"/><path d="M18 19l3-3-3-3"/></svg>`;
    case "repeat":
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5A6.5 6.5 0 0 1 17 6.6"/><path d="M17 6.6V3.8"/><path d="M17 6.6h2.8"/><path d="M17.5 14.5A6.5 6.5 0 0 1 7 17.4"/><path d="M7 17.4v2.8"/><path d="M7 17.4H4.2"/></svg>`;
    case "repeat-track":
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9.5A6.5 6.5 0 0 1 17 6.6"/><path d="M17 6.6V3.8"/><path d="M17 6.6h2.8"/><path d="M17.5 14.5A6.5 6.5 0 0 1 7 17.4"/><path d="M7 17.4v2.8"/><path d="M7 17.4H4.2"/><text x="12" y="14.1" text-anchor="middle" font-size="6.8" fill="${fill}" stroke="none" font-weight="700">1</text></svg>`;
    default:
      return "";
  }
}

function renderRefreshIcon(): string {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>`;
}

function renderSettingsIcon(): string {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6z"/></svg>`;
}

function renderBorderShapeIcon(rounded: boolean): string {
  const radius = rounded ? 5 : 0;
  return `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="#6b7280" stroke-width="1.8"><rect x="3" y="3" width="14" height="14" rx="${radius}" ry="${radius}"/></svg>`;
}

function borderRadiusPxToSliderStep(radiusPx: number): number {
  return Math.max(1, Math.min(5, Math.round(clampBorderRadiusPx(radiusPx, 0) / 5) + 1));
}

function borderRadiusSliderStepToPx(step: number): number {
  const normalizedStep = Math.max(1, Math.min(5, Math.round(step)));
  return (normalizedStep - 1) * 5;
}

function albumArtSizePxToSliderStep(sizePx: number): number {
  const normalized = clampAlbumArtSizePx(sizePx, ALBUM_ART_SIZE_LARGE_PX);
  if (normalized <= ALBUM_ART_SIZE_SMALL_PX) {
    return 1;
  }
  if (normalized <= ALBUM_ART_SIZE_MEDIUM_PX) {
    return 2;
  }
  return 3;
}

function albumArtSizeSliderStepToPx(step: number): number {
  const normalizedStep = Math.max(1, Math.min(3, Math.round(step)));
  if (normalizedStep === 1) {
    return ALBUM_ART_SIZE_SMALL_PX;
  }
  if (normalizedStep === 2) {
    return ALBUM_ART_SIZE_MEDIUM_PX;
  }
  return ALBUM_ART_SIZE_LARGE_PX;
}

function clampAlignPaddingPx(value: number, fallback = 16): number {
  const clamped = clampStoredNumber(value, fallback, 8, 24);
  return 8 + Math.round((clamped - 8) / 4) * 4;
}

function readInitialAlignPaddingPx(): number {
  const rawValue = localStorage.getItem(GLASSES_ALIGN_PADDING_KEY);
  if (rawValue === null || rawValue.trim() === "") {
    return 16;
  }

  return clampAlignPaddingPx(Number(rawValue), 16);
}

function alignPaddingPxToSliderStep(paddingPx: number): number {
  return Math.max(1, Math.min(5, Math.round((clampAlignPaddingPx(paddingPx, 16) - 8) / 4) + 1));
}

function alignPaddingSliderStepToPx(step: number): number {
  const normalizedStep = Math.max(1, Math.min(5, Math.round(step)));
  return 8 + (normalizedStep - 1) * 4;
}

const state: {
  page: AppPage;
  glassesPageRoute: NavigableGlassesPage;
  uiVisible: boolean;
  hiddenGlassesPage: AppPage | null;
  focusIndex: number;
  marqueeOffset: number;
  lastScrollTs: number;
  isForeground: boolean;
  hasStartupRendered: boolean;
  playback: PlaybackState;
  lastError: AppError | null;
  busyUntil: number;
  phoneBanner: string | null;
  phoneBannerKind: PhoneBannerKind;
  language: LanguageCode;
  phoneView: PhoneView;
  phonePanel: PhonePanel;
  panelBProbe: PanelBProbeState;
  glassesControlVariant: ControlGlyphVariant;
  glassesTextAlignMode: TextAlignMode;
  glassesControlInvert: boolean;
  glassesAlignPaddingPx: number;
  glassesProgressBarStyle: ProgressBarStyle;
  glassesAutoHideEnabled: boolean;
  glassesAutoHideSeconds: number;
  developerMode: boolean;
  developerGlassesPageOverride: DeveloperGlassesPageOverride;
  developerGlassesLayoutMode: DeveloperGlassesLayoutMode;
  albumArtSizePx: number;
  albumArtGapPx: number;
  albumArtOpacityPercent: number;
  selectedPlaylistSlotIds: string[];
  playlistScrollInverted: boolean;
  availablePlaylistOptions: PlaylistSummary[];
  mockDeviceSlotPresetIds: DeviceMockPresetId[];
  livePlaylistEntries: MockPlaylistEntry[] | null;
  liveDeviceEntries: MockDeviceEntry[] | null;
  playlistPage: SelectablePageState;
  devicePage: SelectablePageState;
  imageModeEnabled: boolean;
  fullImageTextModeEnabled: boolean;
  imageControlsSendFormat: ImageControlsSendFormat;
  imageControlsDebugStatus: string;
  imageControlsPreviewDataUrl: string | null;
  imageTextFontWeight: number;
  imageTextAlignMode: ImageTextAlignMode;
  imageTextDebugStatus: string;
  imageTextTitleDebugStatus: string;
  imageTextTitlePreviewDataUrl: string | null;
  imageTextStatusDebugStatus: string;
  imageTextStatusPreviewDataUrl: string | null;
  glassesRenderStatus: string;
  borderEnabled: boolean;
  borderInsetPx: number;
  borderWidthPx: number;
  borderRadius: number;
  selfHostMode: SelfHostMode;
  selfHostClientIdInput: string;
  selfHostServiceOriginInput: string;
  selfHostCopyFeedback: string | null;
} = {
  page: "AUTH_REQUIRED",
  glassesPageRoute: "NOW_PLAYING",
  uiVisible: true,
  hiddenGlassesPage: null,
  focusIndex: NOW_PLAYING_DEFAULT_FOCUS_INDEX,
  marqueeOffset: 0,
  lastScrollTs: 0,
  isForeground: true,
  hasStartupRendered: false,
  playback: null,
  lastError: null,
  busyUntil: 0,
  phoneBanner: null,
  phoneBannerKind: null,
  language: readInitialLanguage(),
  phoneView: "HOME",
  phonePanel: readInitialPhonePanel(),
  panelBProbe: "idle",
  glassesControlVariant: readInitialGlassesControlVariant(),
  glassesTextAlignMode: readInitialTextAlignMode(),
  glassesControlInvert: readInitialControlInvert(),
  glassesAlignPaddingPx: readInitialAlignPaddingPx(),
  glassesProgressBarStyle: readInitialProgressBarStyle(),
  glassesAutoHideEnabled: readInitialAutoHideEnabled(),
  glassesAutoHideSeconds: readInitialAutoHideSeconds(),
  developerMode: readInitialDeveloperMode(),
  developerGlassesPageOverride: readInitialDeveloperGlassesPageOverride(),
  developerGlassesLayoutMode: readInitialDeveloperGlassesLayoutMode(),
  albumArtSizePx: readInitialAlbumArtSizePx(),
  albumArtGapPx: readInitialAlbumArtGapPx(),
  albumArtOpacityPercent: readInitialAlbumArtOpacityPercent(),
  selectedPlaylistSlotIds: readInitialSelectedPlaylistSlotIds(),
  playlistScrollInverted: readInitialControlInvert(),
  availablePlaylistOptions: [],
  mockDeviceSlotPresetIds: readInitialMockDeviceSlotPresetIds(),
  livePlaylistEntries: null,
  liveDeviceEntries: null,
  playlistPage: createSelectablePageState(),
  devicePage: createSelectablePageState(),
  imageModeEnabled: readInitialImageModeEnabled(),
  fullImageTextModeEnabled: readInitialFullImageTextModeEnabled(),
  imageControlsSendFormat: readInitialImageControlsSendFormat(),
  imageControlsDebugStatus: "text-mode",
  imageControlsPreviewDataUrl: null,
  imageTextFontWeight: readInitialImageTextFontWeight(),
  imageTextAlignMode: readInitialImageTextAlignMode(),
  imageTextDebugStatus: "text-mode",
  imageTextTitleDebugStatus: "text-mode",
  imageTextTitlePreviewDataUrl: null,
  imageTextStatusDebugStatus: "text-mode",
  imageTextStatusPreviewDataUrl: null,
  glassesRenderStatus: "idle",
  borderEnabled: readInitialBorderEnabled(),
  borderInsetPx: readInitialBorderInsetPx(),
  borderWidthPx: readInitialBorderWidthPx(),
  borderRadius: readInitialBorderRadius(),
  selfHostMode: readInitialSelfHostMode(),
  selfHostClientIdInput: readInitialSelfHostClientIdInput(),
  selfHostServiceOriginInput: readInitialSelfHostServiceOriginInput(),
  selfHostCopyFeedback: null,
};

state.glassesTextAlignMode = DEFAULT_TEXT_MODE_ALIGN;

let bridge: EvenAppBridge | null = null;
let pollTimer: number | null = null;
let marqueeTimer: number | null = null;
let busyTimer: number | null = null;
let phoneStatusTimer: number | null = null;
let glassesStatusTimer: number | null = null;
let glassesStatusRecoveryTimer: number | null = null;
let deviceEntriesPollTimer: number | null = null;
let autoHideTimer: number | null = null;
let imageModeReopenTimer: number | null = null;
let selfHostCopyFeedbackTimer: number | null = null;
let webViewSettingsPersistTimer: number | null = null;
let webViewSettingsBridgeCacheLoaded = false;

let pollInFlight = false;
let controlInFlight = false;
let controlLockedUntil = 0;
let panelBProbeInFlight = false;
let manualRefreshInFlight = false;
let glassesPageReopenInFlight = false;
let bridgeResumeInFlight = false;
let pendingImmediateRefreshAfterPoll = false;
let lastBridgeResumeAt = 0;
let pendingForcedBridgeResume = false;
let hasEnteredBackground = false;
let suppressGlassesInteractionUntil = 0;
let pendingDeviceTransferTargetId = "";
let pendingDeviceTransferUntil = 0;

let unsubscribeEvenHubEvent: (() => void) | null = null;

let lastRenderSignature = "";
let lastPhoneRenderSignature = "";
let lastShapeKey: GlassesContainerShapeKey = "";
let lastPageStructureKey = "";
let lastPageRebuildKey = "";
let lastPageHasImageContainers = false;
let hasCreatedStartupPage = false;
let lastGoodImageTextPayloadByRowKind: Partial<Record<ManagedImageRowKind, ImageTextPayload>> = {};
const imageRowRenderStates: ImageRowRenderStateByKind = {};
let lastPlaybackSnapshotAt = 0;
let lastControlActionAt = 0;
let lastControlsImageRenderSignature = "";
let lastNowPlayingTextContentByName: Partial<Record<NowPlayingTextContainerName, string>> = {};
let lastNowPlayingTextContainerIdByName: Partial<Record<NowPlayingTextContainerName, number>> = {};
let lastNowPlayingTextLayoutKey = "";
let revealClientIdInStatusInfo = false;
let shouldResetImageTextStateOnStartup = false;
let imageTitleMarqueeOffsetPx = 0;
let imageTitleMarqueeLoopWidthPx = 0;
let imageTitleUsesMarquee = false;
let imageTitleTickIntervalMs = MARQUEE_INTERVAL_MS;
let lastImageTitleContentKey = "";
let lastAlbumArtSongKey = "";
let albumArtImageUpdateInFlight = false;
let pendingAlbumArtImageUpdate:
  | {
      songKey: string;
      imageUrl: string | null;
      sizePx: number;
      opacityPercent: number;
    }
  | null = null;
let imageControlsStatusTimer: number | null = null;
let controlsImageUpdateInFlight = false;
let pendingControlsImageUpdate:
  | {
      renderSignature: string;
      controlsSignature: string;
      update: Parameters<EvenAppBridge["updateImageRawData"]>[0];
      previewDataUrl: string | null;
    }
  | null = null;
const APP_LOADED_AT = Date.now();
const CLIENT_DEBUG_LOG_PATH = "/api/debug/client-log";
const CLIENT_DEBUG_HEARTBEAT_MS = 1_000;
const CLIENT_DEBUG_EMPTY_APP_CHECK_MS = 2_000;
let consoleDebugLoggingInstalled = false;
let clientDebugFrameCount = 0;

function formatClientDebugRect(element: Element | null): string {
  if (!element) {
    return "missing";
  }

  const rect = element.getBoundingClientRect();
  return `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`;
}

function getClientDebugStyle(element: Element | null, property: "display" | "visibility" | "opacity"): string {
  if (!element) {
    return "missing";
  }

  return window.getComputedStyle(element).getPropertyValue(property);
}

function getClientDebugElementAtCenter(): string {
  const element = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
  if (!element) {
    return "none";
  }

  const id = element.id ? `#${element.id}` : "";
  const className = typeof element.className === "string" && element.className ? `.${element.className}` : "";
  return `${element.tagName.toLowerCase()}${id}${className}`.slice(0, 160);
}

function getClientDebugSnapshot(): Record<string, unknown> {
  const appNode = document.getElementById("app");
  const firstChild = appNode?.firstElementChild ?? null;
  return {
    ageMs: Date.now() - APP_LOADED_AT,
    frameCount: clientDebugFrameCount,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    scrollY: Math.round(window.scrollY),
    appChildCount: appNode?.childElementCount ?? -1,
    appTextLength: appNode?.textContent?.length ?? -1,
    appRect: formatClientDebugRect(appNode),
    appDisplay: getClientDebugStyle(appNode, "display"),
    appVisibility: getClientDebugStyle(appNode, "visibility"),
    appOpacity: getClientDebugStyle(appNode, "opacity"),
    firstChildRect: formatClientDebugRect(firstChild),
    firstChildDisplay: getClientDebugStyle(firstChild, "display"),
    firstChildVisibility: getClientDebugStyle(firstChild, "visibility"),
    firstChildOpacity: getClientDebugStyle(firstChild, "opacity"),
    centerElement: getClientDebugElementAtCenter(),
    bodyChildCount: document.body?.childElementCount ?? -1,
    bodyTextLength: document.body?.textContent?.length ?? -1,
    phoneView: state.phoneView,
    phonePanel: state.phonePanel,
    page: state.page,
    uiVisible: state.uiVisible,
    hasBridge: bridge !== null,
  };
}

function sendClientDebugLog(event: string, details: Record<string, unknown> = {}): void {
  const payload = JSON.stringify({
    clientAt: new Date().toISOString(),
    event,
    buildVersion: __BUILD_VERSION__,
    href: window.location.href,
    userAgent: navigator.userAgent,
    visibilityState: document.visibilityState,
    hidden: document.hidden,
    readyState: document.readyState,
    details: {
      ...getClientDebugSnapshot(),
      ...details,
    },
  });

  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.(CLIENT_DEBUG_LOG_PATH, blob)) {
      return;
    }
  } catch {
    // fall back to fetch below
  }

  void fetch(CLIENT_DEBUG_LOG_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // ignore logging failures
  });
}

function serializeClientDebugValue(value: unknown): string {
  if (value instanceof Error) {
    return value.stack || value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function installConsoleDebugLogging(): void {
  if (consoleDebugLoggingInstalled) {
    return;
  }

  consoleDebugLoggingInstalled = true;

  for (const method of ["warn", "error"] as const) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...args);
      sendClientDebugLog(`console-${method}`, {
        args: args.map(serializeClientDebugValue).join(" "),
      });
    };
  }
}

function installClientDebugLogging(): void {
  sendClientDebugLog("boot");
  installConsoleDebugLogging();

  const tickFrame = () => {
    clientDebugFrameCount += 1;
    window.requestAnimationFrame(tickFrame);
  };
  window.requestAnimationFrame(tickFrame);

  window.addEventListener("error", (event) => {
    sendClientDebugLog("window-error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error instanceof Error ? event.error.stack || event.error.message : String(event.error ?? ""),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    sendClientDebugLog("unhandledrejection", {
      reason: reason instanceof Error ? reason.stack || reason.message : String(reason ?? ""),
    });
  });

  for (const eventName of ["pagehide", "pageshow", "freeze", "resume"]) {
    window.addEventListener(eventName, (event) => {
      sendClientDebugLog(eventName, {
        persisted: "persisted" in event ? Boolean((event as PageTransitionEvent).persisted) : false,
      });
    });
  }

  window.setInterval(() => {
    sendClientDebugLog("heartbeat");
  }, CLIENT_DEBUG_HEARTBEAT_MS);

  window.setInterval(() => {
    const appNode = document.getElementById("app");
    if (Date.now() - APP_LOADED_AT > 4_000 && appNode && appNode.childElementCount === 0) {
      sendClientDebugLog("app-empty");
    }
  }, CLIENT_DEBUG_EMPTY_APP_CHECK_MS);
}

async function loadServerApiOriginFromBridgeStore(): Promise<void> {
  try {
    const bridgeInstance = bridge ?? (await waitForEvenAppBridge());
    const saved = (await bridgeInstance.getLocalStorage(SERVER_API_ORIGIN_BRIDGE_KEY)).trim();
    if (!saved) {
      return;
    }
    setServerApiOrigin(saved);
  } catch {
    // ignore outside Even host or when bridge storage is unavailable
  }
}

async function persistServerApiOriginToBridgeStore(): Promise<void> {
  const current = getServerApiOriginOverride();
  if (!current) {
    return;
  }
  try {
    const bridgeInstance = bridge ?? (await waitForEvenAppBridge());
    await bridgeInstance.setLocalStorage(SERVER_API_ORIGIN_BRIDGE_KEY, current);
  } catch {
    // ignore outside Even host or when bridge storage is unavailable
  }
}

async function persistWebViewSettingsToBridgeStore(): Promise<boolean> {
  if (!bridge) {
    return false;
  }

  try {
    await bridge.setLocalStorage(WEBVIEW_SETTINGS_BRIDGE_KEY, JSON.stringify(collectWebViewSettingsConfig()));
    return true;
  } catch (error) {
    console.warn("Failed to persist WebView settings to bridge storage", error);
    return false;
  }
}

function schedulePersistWebViewSettingsToBridgeStore(): void {
  if (webViewSettingsPersistTimer !== null) {
    window.clearTimeout(webViewSettingsPersistTimer);
  }

  webViewSettingsPersistTimer = window.setTimeout(() => {
    webViewSettingsPersistTimer = null;
    void persistWebViewSettingsToBridgeStore();
  }, 300);
}

async function loadWebViewSettingsFromBridgeStore(force = false): Promise<boolean> {
  if (!bridge || (!force && webViewSettingsBridgeCacheLoaded)) {
    return false;
  }

  webViewSettingsBridgeCacheLoaded = true;
  try {
    const raw = (await bridge.getLocalStorage(WEBVIEW_SETTINGS_BRIDGE_KEY)).trim();
    if (!raw) {
      await persistWebViewSettingsToBridgeStore();
      return false;
    }

    return applyWebViewSettingsConfig(raw);
  } catch (error) {
    console.warn("Failed to load WebView settings from bridge storage", error);
    return false;
  }
}

function shouldCacheWebViewSettingsEvent(event: Event): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const id = target.id || "";
  return (
    id === "language-select" ||
    id.startsWith("settings-") ||
    target.hasAttribute("data-playlist-slot-index") ||
    target.hasAttribute("data-remove-playlist-slot-index")
  );
}

function triggerWebViewSettingsConfigDownload(): void {
  const blob = new Blob([`${JSON.stringify(collectWebViewSettingsConfig(), null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = WEBVIEW_SETTINGS_CONFIG_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function readWebViewSettingsConfigFile(file: File): Promise<WebViewSettingsConfig | null> {
  return normalizeWebViewSettingsConfig(await file.text());
}

function syncSelfHostInputsFromStoredConfig(): void {
  const effective = getEffectiveConfigState();
  state.selfHostMode = "same-origin";
  state.selfHostClientIdInput = effective.spotifyClientId ?? "";
  state.selfHostServiceOriginInput = effective.serviceOrigin;
}

async function syncStateFromLocalServer(force = false): Promise<boolean> {
  const synced = await syncSelfHostStateFromServer(force);
  if (!synced) {
    return false;
  }

  syncSelfHostInputsFromStoredConfig();
  return true;
}

async function refreshSessionFromLocalServer(force = false): Promise<void> {
  const hadToken = hasTokenBundle();
  const synced = await syncStateFromLocalServer(force);
  if (!synced) {
    return;
  }

	  const hasTokenNow = hasTokenBundle();
	
	  if (!hadToken && hasTokenNow) {
	    setPhoneBanner(null);
	    if (shouldPollInCurrentState()) {
      const outcome = await refreshPlaybackState(true);
      if (outcome.continuePolling && shouldPollInCurrentState()) {
        schedulePoll(outcome.nextDelayMs ?? computeBasePollDelay());
      }
    } else {
      renderPhoneUi(true);
    }
    return;
  }

  if (hadToken && !hasTokenNow) {
    state.playback = null;
    state.availablePlaylistOptions = [];
    syncConfiguredPlaylistEntries();
    state.liveDeviceEntries = null;
    state.page = "AUTH_REQUIRED";
    applyError("AUTH_REQUIRED");
    if (bridge) {
      await renderGlassesPage(true);
    }
    renderPhoneUi(true);
    return;
  }

  if (hasTokenNow && (state.page !== "NOW_PLAYING" || !state.playback)) {
    if (shouldPollInCurrentState()) {
      const outcome = await refreshPlaybackState(true);
      if (outcome.continuePolling && shouldPollInCurrentState()) {
        schedulePoll(outcome.nextDelayMs ?? computeBasePollDelay());
      }
    } else {
      renderPhoneUi(true);
    }
    return;
  }

  renderPhoneUi(true);
}

function clearSelfHostCopyFeedbackTimer(): void {
  if (selfHostCopyFeedbackTimer !== null) {
    window.clearTimeout(selfHostCopyFeedbackTimer);
    selfHostCopyFeedbackTimer = null;
  }
}

function setSelfHostCopyFeedback(message: string): void {
  state.selfHostCopyFeedback = message;
  renderPhoneUi(false);
  clearSelfHostCopyFeedbackTimer();
  selfHostCopyFeedbackTimer = window.setTimeout(() => {
    state.selfHostCopyFeedback = null;
    selfHostCopyFeedbackTimer = null;
    renderPhoneUi(false);
  }, COPY_FEEDBACK_MS);
}

async function copyToClipboardWithFeedback(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    setSelfHostCopyFeedback("Copied");
  } catch (error) {
    setPhoneBanner(error instanceof Error ? error.message : String(error));
    renderPhoneUi(false);
  }
}

function getSelfHostDraftOriginWarning(): string {
  const trimmed = state.selfHostServiceOriginInput.trim();
  if (state.selfHostMode !== "custom-origin" || !trimmed) {
    return "";
  }

  const validation = validateServiceOrigin(trimmed);
  if (!validation.ok) {
    return validation.message ?? "";
  }

  return "";
}

function canSaveSelfHostDraft(): boolean {
  if (!isClientSpotifyAuthMode()) {
    return false;
  }

  const clientIdValidation = validateSpotifyClientId(state.selfHostClientIdInput);
  if (!clientIdValidation.ok) {
    return false;
  }

  if (state.selfHostMode === "custom-origin") {
    return validateServiceOrigin(state.selfHostServiceOriginInput).ok;
  }

  return true;
}

function shouldBlockConnectFromDraft(): boolean {
  return hasAuthorizedSessionMismatch();
}

function getLocalSimulatorServiceOrigin(): string {
  const port = window.location.port || "5173";
  return `http://127.0.0.1${port ? `:${port}` : ""}`;
}

function getPromptSeedForServiceOrigin(serviceOrigin: string): string {
  try {
    const url = new URL(serviceOrigin);
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      return "";
    }
    return url.host;
  } catch {
    return "";
  }
}

function isRedirectUriMismatchMessage(code: string | undefined, message: string | undefined): boolean {
  const combined = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  return combined.includes("redirect_uri_mismatch") || combined.includes("redirect uri") || combined.includes("redirect_uri");
}

function getLocalizedAuthErrorMessage(error: { code?: string; message?: string } | null): string {
  const text = PHONE_TEXT[state.language];
  if (!error) {
    return "";
  }
  if (isRedirectUriMismatchMessage(error.code, error.message)) {
    return text.redirectUriMismatchMessage;
  }
  return error.message || error.code || "";
}

function normalizePromptServiceOrigin(input: string): { ok: true; serviceOrigin: string; isLocal: boolean } | { ok: false; message: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      ok: true,
      serviceOrigin: getLocalSimulatorServiceOrigin(),
      isLocal: true,
    };
  }

  const validation = validateServiceOrigin(trimmed);
  if (!validation.ok || !validation.normalized) {
    return {
      ok: false,
      message: validation.message || PHONE_TEXT[state.language].invalidServiceOriginMessage,
    };
  }

  return {
    ok: true,
    serviceOrigin: validation.normalized,
    isLocal: false,
  };
}

async function applyServerTargetInput(input: string): Promise<boolean> {
  const text = PHONE_TEXT[state.language];
  const currentConfig = getEffectiveConfigState();
  const normalizedTarget = normalizePromptServiceOrigin(input);
  if (!normalizedTarget.ok) {
    setPhoneBanner(normalizedTarget.message);
    return false;
  }

  if (isClientSpotifyAuthMode()) {
    const clientId = currentConfig.spotifyClientId || state.selfHostClientIdInput.trim();
    if (!clientId) {
      setPhoneBanner(text.missingConfigMessage);
      return false;
    }

    const nextConfig: SelfHostConfig = {
      spotifyClientId: clientId,
      serviceOrigin: normalizedTarget.serviceOrigin,
      mode: "custom-origin",
      updatedAt: Date.now(),
    };

    try {
      saveSelfHostConfig(nextConfig);
      syncSelfHostInputsFromStoredConfig();
      setPhoneBanner(normalizedTarget.isLocal ? text.localSimulatorConfigured : text.authTargetConfigured);
      return true;
    } catch (error) {
      setPhoneBanner(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  try {
    setServerApiOrigin(normalizedTarget.serviceOrigin);
    await persistServerApiOriginToBridgeStore();
    const synced = await syncStateFromLocalServer(true);
    if (!synced) {
      setPhoneBanner(text.localAuthServerUnavailable);
      return false;
    }
    if (!getEffectiveConfigState().spotifyClientId) {
      setPhoneBanner(text.missingConfigMessage);
      return false;
    }
    setPhoneBanner(normalizedTarget.isLocal ? text.localSimulatorConfigured : text.authTargetConfigured);
    return true;
  } catch (error) {
    setPhoneBanner(error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function configureServerTargetFromPrompt(): Promise<boolean> {
  const text = PHONE_TEXT[state.language];
  const currentConfig = getEffectiveConfigState();
  const seed = getPromptSeedForServiceOrigin(currentConfig.serviceOrigin);
  const input = window.prompt(`${text.authTargetPrompt}\n${text.authTargetPromptDefault}`, seed);
  if (input === null) {
    return false;
  }
  return applyServerTargetInput(input);
}

function clearImageControlsStatusTimer(): void {
  if (imageControlsStatusTimer !== null) {
    window.clearTimeout(imageControlsStatusTimer);
    imageControlsStatusTimer = null;
  }
}

function syncImageControlsDebug(nextStatus: string, nextPreviewDataUrl: string | null): void {
  const statusChanged = state.imageControlsDebugStatus !== nextStatus;
  const previewChanged = state.imageControlsPreviewDataUrl !== nextPreviewDataUrl;
  if (!statusChanged && !previewChanged) {
    return;
  }

  state.imageControlsDebugStatus = nextStatus;
  state.imageControlsPreviewDataUrl = nextPreviewDataUrl;
  renderPhoneUi(false);
}

function syncImageTextDebug(nextStatus: string): void {
  if (state.imageTextDebugStatus === nextStatus) {
    return;
  }

  state.imageTextDebugStatus = nextStatus;
  renderPhoneUi(false);
}

function setGlassesRenderStatus(nextStatus: string): void {
  if (state.glassesRenderStatus === nextStatus) {
    return;
  }
  state.glassesRenderStatus = nextStatus;
  renderPhoneUi(false);
}

function getImageTextRowDebugSnapshot(rowKind: ManagedImageRowKind): { status: string; previewDataUrl: string | null } {
  if (rowKind === "title") {
    return {
      status: state.imageTextTitleDebugStatus,
      previewDataUrl: state.imageTextTitlePreviewDataUrl,
    };
  }

  return {
    status: state.imageTextStatusDebugStatus,
    previewDataUrl: state.imageTextStatusPreviewDataUrl,
  };
}

function syncImageTextRowDebug(rowKind: ManagedImageRowKind, nextStatus: string, nextPreviewDataUrl: string | null): void {
  const current = getImageTextRowDebugSnapshot(rowKind);
  if (current.status === nextStatus && current.previewDataUrl === nextPreviewDataUrl) {
    return;
  }

  if (rowKind === "title") {
    state.imageTextTitleDebugStatus = nextStatus;
    state.imageTextTitlePreviewDataUrl = nextPreviewDataUrl;
  } else {
    state.imageTextStatusDebugStatus = nextStatus;
    state.imageTextStatusPreviewDataUrl = nextPreviewDataUrl;
  }

  renderPhoneUi(false);
}

function syncCompositeImageDebug(nextStatus: string, nextPreviewDataUrl: string | null): void {
  syncImageControlsDebug(nextStatus, nextPreviewDataUrl);
  syncImageTextRowDebug("title", nextStatus, nextPreviewDataUrl);
  syncImageTextRowDebug("status", nextStatus, nextPreviewDataUrl);
}

function updateImageTextPreviewDebug(page: ReturnType<typeof buildCurrentGlassesPageSpec>): void {
  const compositePlan = page.imagePlans?.find((plan) => plan.renderer === "composite-image") ?? null;
  if (state.imageModeEnabled && compositePlan) {
    const previewDataUrl = compositePlan.payload.dataUrl ?? null;
    const status = !bridge ? "bridge-unavailable" : previewDataUrl ? "sending..." : "no-image-payload";
    syncImageTextRowDebug("title", status, previewDataUrl);
    syncImageTextRowDebug("status", status, previewDataUrl);
    return;
  }

  const titlePlan = page.imagePlans?.find((plan) => plan.rowKind === "title" && plan.renderer === "image-text") ?? null;
  const statusPlan = page.imagePlans?.find((plan) => plan.rowKind === "status" && plan.renderer === "image-text") ?? null;

  const applyPreviewState = (rowKind: ManagedImageRowKind, enabled: boolean, plan: ImageRowUpdatePlan | null): void => {
    if (!enabled) {
      syncImageTextRowDebug(rowKind, "text-mode", null);
      return;
    }

    const previewDataUrl = plan?.payload.dataUrl ?? null;
    if (!previewDataUrl) {
      syncImageTextRowDebug(rowKind, bridge ? "no-image-payload" : "bridge-unavailable", null);
      return;
    }

    const current = getImageTextRowDebugSnapshot(rowKind);
    const baseStatus =
      !bridge
        ? "bridge-unavailable"
        : current.status === "text-mode" || current.status === "bridge-unavailable" || current.status === "no-image-payload"
          ? "sending..."
          : current.status;

    syncImageTextRowDebug(rowKind, baseStatus, previewDataUrl);
  };

  applyPreviewState("title", isTitleImageModeEnabled(), titlePlan);
  applyPreviewState("status", isStatusImageModeEnabled(), statusPlan);
}

function getImageRowRenderState(rowKind: ManagedImageRowKind): ImageRowRenderState {
  const existing = imageRowRenderStates[rowKind];
  if (existing) {
    return existing;
  }

  const created: ImageRowRenderState = {
    nextSeq: 1,
    latestRequestedSeq: 0,
    inFlightSeq: null,
    pendingSeq: null,
    pendingPayload: null,
    latestCommittedSeq: 0,
    pendingPlan: null,
  };
  imageRowRenderStates[rowKind] = created;
  return created;
}

function clearImageRowRenderState(rowKind: ManagedImageRowKind): void {
  delete imageRowRenderStates[rowKind];
  delete lastGoodImageTextPayloadByRowKind[rowKind];
  syncImageTextRowDebug(rowKind, "text-mode", null);
}

function clearAllImageTextState(): void {
  clearImageRowRenderState("title");
  clearImageRowRenderState("status");
  imageTitleMarqueeOffsetPx = 0;
  imageTitleMarqueeLoopWidthPx = 0;
  imageTitleUsesMarquee = false;
  imageTitleTickIntervalMs = MARQUEE_INTERVAL_MS;
  lastImageTitleContentKey = "";
}

function clearNowPlayingTextUpgradeState(): void {
  lastNowPlayingTextContentByName = {};
  lastNowPlayingTextContainerIdByName = {};
  lastNowPlayingTextLayoutKey = "";
}

function syncNowPlayingTextContainerIds(page: ReturnType<typeof buildCurrentGlassesPageSpec>): void {
  const textContainers = page.textObject ?? [];
  for (const container of textContainers) {
    const containerName = container.containerName;
    if (containerName !== "np-title" && containerName !== "np-status" && containerName !== "np-controls") {
      continue;
    }

    if (typeof container.containerID === "number") {
      lastNowPlayingTextContainerIdByName[containerName] = container.containerID;
    }
  }
}

function getNowPlayingTextContainerId(containerName: NowPlayingTextContainerName): number | null {
  const runtimeId = lastNowPlayingTextContainerIdByName[containerName];
  if (typeof runtimeId === "number" && runtimeId > 0) {
    return runtimeId;
  }

  const isAlbumArtLayout = isAlbumArtModeActive();
  switch (containerName) {
    case "np-title":
      return isAlbumArtLayout ? 2 : 1;
    case "np-status":
      return isAlbumArtLayout ? 3 : 2;
    case "np-controls":
      return isAlbumArtLayout ? 4 : 3;
    default:
      return null;
  }
}

function createNowPlayingTextLayoutKey(): string {
  return JSON.stringify({
    uiVisible: state.uiVisible,
    displayMode: getCurrentDisplayMode(),
    textAlign: getEffectiveGlassesTextAlignMode(),
    alignPaddingPx: state.glassesAlignPaddingPx,
    frame: getGlassesFrameSettings(),
  });
}

type ControlAction = "prev" | "toggle" | "next" | "shuffle" | "repeat";

type OptimisticPlaybackSnapshot =
  | {
      playback: PlaybackState;
      lastPlaybackSnapshotAt: number;
    }
  | null;

function applyOptimisticControlState(action: ControlAction): void {
  if (!state.playback) {
    return;
  }

  const projectedProgressMs = getDisplayProgressMs();
  switch (action) {
    case "toggle":
      state.playback = {
        ...state.playback,
        isPlaying: !state.playback.isPlaying,
        progressMs: projectedProgressMs,
      };
      lastPlaybackSnapshotAt = Date.now();
      break;
    case "shuffle":
      state.playback = {
        ...state.playback,
        shuffleEnabled: !state.playback.shuffleEnabled,
      };
      break;
    case "repeat":
      state.playback = {
        ...state.playback,
        repeatMode: getNextRepeatMode(state.playback.repeatMode),
      };
      break;
    case "prev":
    case "next":
      // Track metadata comes from the next Spotify poll; do not fake it locally.
      break;
  }
}

function beginOptimisticControl(action: ControlAction): OptimisticPlaybackSnapshot {
  if (!state.playback || (action !== "toggle" && action !== "shuffle" && action !== "repeat")) {
    return null;
  }

  const snapshot = {
    playback: { ...state.playback },
    lastPlaybackSnapshotAt,
  };
  applyOptimisticControlState(action);
  return snapshot;
}

function restoreOptimisticControl(snapshot: OptimisticPlaybackSnapshot): void {
  if (!snapshot) {
    return;
  }

  state.playback = snapshot.playback;
  lastPlaybackSnapshotAt = snapshot.lastPlaybackSnapshotAt;
}

async function applyNowPlayingTextUpgrades(page: ReturnType<typeof buildCurrentGlassesPageSpec>): Promise<void> {
  if (!bridge || !isEffectiveNowPlayingPage()) {
    clearNowPlayingTextUpgradeState();
    return;
  }

  const textContainers = page.textObject ?? [];
  for (const container of textContainers) {
    const containerName = container.containerName;
    if (containerName !== "np-title" && containerName !== "np-status" && containerName !== "np-controls") {
      continue;
    }

    if (typeof container.containerID === "number") {
      lastNowPlayingTextContainerIdByName[containerName] = container.containerID;
    }
    const content = container.content ?? "";
    await updateNowPlayingTextContainer(containerName, content, container.containerID ?? 0);
  }
}

async function updateNowPlayingTextContainer(
  containerName: NowPlayingTextContainerName,
  content: string,
  containerID: number,
): Promise<void> {
  if (!bridge) {
    return;
  }

  const previousContent = lastNowPlayingTextContentByName[containerName] ?? "";
  if (previousContent === content) {
    return;
  }

  const upgradeLength = Math.max(content.length, previousContent.length, 1);
  const renderedContent = content.padEnd(upgradeLength, " ");

  try {
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({
        containerID,
        containerName,
        contentOffset: 0,
        contentLength: upgradeLength,
        content: renderedContent,
      }),
    );
    lastNowPlayingTextContentByName[containerName] = content;
  } catch (error) {
    console.warn(`Failed to update ${containerName}`, error);
  }
}

function delayMs(timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, timeoutMs);
  });
}

function isImageControlsSendingStatus(status: string): boolean {
  return status.startsWith("sending");
}

async function awaitImageUpdateResult(
  imageUpdate: Parameters<EvenAppBridge["updateImageRawData"]>[0],
): Promise<ImageRawDataUpdateResult | "call-timeout"> {
  if (!bridge) {
    return "call-timeout";
  }

  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<"call-timeout">((resolve) => {
    timeoutId = window.setTimeout(() => {
      resolve("call-timeout");
    }, 1_500);
  });

  const result = (await Promise.race([bridge.updateImageRawData(imageUpdate), timeoutPromise])) as
    | ImageRawDataUpdateResult
    | "call-timeout";

  if (timeoutId !== null) {
    window.clearTimeout(timeoutId);
  }

  return result;
}

async function awaitStartupCreateResult(
  startup: CreateStartUpPageContainer,
): Promise<number | "call-timeout"> {
  if (!bridge) {
    return "call-timeout";
  }

  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<"call-timeout">((resolve) => {
    timeoutId = window.setTimeout(() => resolve("call-timeout"), 1_800);
  });

  const result = (await Promise.race([bridge.createStartUpPageContainer(startup), timeoutPromise])) as number | "call-timeout";
  if (timeoutId !== null) {
    window.clearTimeout(timeoutId);
  }
  return result;
}

async function awaitRebuildResult(
  rebuild: RebuildPageContainer,
): Promise<boolean | "call-timeout"> {
  if (!bridge) {
    return "call-timeout";
  }

  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<"call-timeout">((resolve) => {
    timeoutId = window.setTimeout(() => resolve("call-timeout"), 1_800);
  });

  const result = (await Promise.race([bridge.rebuildPageContainer(rebuild), timeoutPromise])) as boolean | "call-timeout";
  if (timeoutId !== null) {
    window.clearTimeout(timeoutId);
  }
  return result;
}

function isAlbumArtModeActive(): boolean {
  return isEffectiveNowPlayingPage() && state.developerGlassesLayoutMode === "album-art";
}

function pngDataUrlToBytes(dataUrl: string): number[] | null {
  const base64 = dataUrl.split(",")[1];
  if (!base64) {
    return null;
  }
  const binary = atob(base64);
  const bytes = new Array<number>(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function createTransparentPngBytes(sizePx: number): number[] | null {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.clearRect(0, 0, sizePx, sizePx);
  return pngDataUrlToBytes(canvas.toDataURL("image/png"));
}

async function loadAlbumArtPngBytes(
  imageUrl: string | null,
  sizePx: number,
  opacityPercent: number,
): Promise<number[] | null> {
  const transparent = createTransparentPngBytes(sizePx);
  if (!imageUrl) {
    return transparent;
  }
  if (typeof document === "undefined") {
    return transparent;
  }

  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const element = new Image();
    element.crossOrigin = "anonymous";
    element.onload = () => resolve(element);
    element.onerror = () => resolve(null);
    element.src = imageUrl;
  });
  if (!img) {
    return transparent;
  }

  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return transparent;
  }

  const srcRatio = img.width / img.height;
  const dstRatio = 1;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (srcRatio > dstRatio) {
    sw = img.height * dstRatio;
    sx = Math.floor((img.width - sw) / 2);
  } else if (srcRatio < dstRatio) {
    sh = img.width / dstRatio;
    sy = Math.floor((img.height - sh) / 2);
  }

  try {
    ctx.clearRect(0, 0, sizePx, sizePx);
    ctx.globalAlpha = clampAlbumArtOpacityPercent(opacityPercent, 100) / 100;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sizePx, sizePx);
    ctx.globalAlpha = 1;
    return pngDataUrlToBytes(canvas.toDataURL("image/png")) ?? transparent;
  } catch {
    return transparent;
  }
}

async function flushAlbumArtImageUpdate(job: {
  songKey: string;
  imageUrl: string | null;
  sizePx: number;
  opacityPercent: number;
}): Promise<void> {
  if (!bridge || !isAlbumArtModeActive() || !state.uiVisible) {
    albumArtImageUpdateInFlight = false;
    return;
  }
  albumArtImageUpdateInFlight = true;
  setGlassesRenderStatus("album-art-updating");
  const bytes = await loadAlbumArtPngBytes(job.imageUrl, job.sizePx, job.opacityPercent);
  if (!bytes || !bridge || !isAlbumArtModeActive() || !state.uiVisible) {
    albumArtImageUpdateInFlight = false;
    setGlassesRenderStatus("album-art-bytes-failed");
    return;
  }

  const result = await awaitImageUpdateResult(new ImageRawDataUpdate({
    containerID: 1,
    containerName: "np-album",
    imageData: bytes,
  }));

  if (result === ImageRawDataUpdateResult.success) {
    lastAlbumArtSongKey = job.songKey;
    setGlassesRenderStatus("album-art-ready");
  } else if (result === "call-timeout") {
    setGlassesRenderStatus("album-art-timeout");
  } else {
    setGlassesRenderStatus(`album-art-failed:${result}`);
  }

  albumArtImageUpdateInFlight = false;
  if (!pendingAlbumArtImageUpdate) {
    return;
  }
  const nextJob = pendingAlbumArtImageUpdate;
  pendingAlbumArtImageUpdate = null;
  void flushAlbumArtImageUpdate(nextJob);
}

function queueAlbumArtImageUpdate(forceRefresh = false): void {
  if (!bridge || !isAlbumArtModeActive() || !state.uiVisible) {
    return;
  }
  const songKey = (state.playback?.title ?? "").trim();
  if (!forceRefresh && songKey === lastAlbumArtSongKey) {
    return;
  }
  const job = {
    songKey,
    imageUrl: state.playback?.albumImageUrl ?? null,
    sizePx: state.albumArtSizePx,
    opacityPercent: state.albumArtOpacityPercent,
  };
  if (albumArtImageUpdateInFlight) {
    pendingAlbumArtImageUpdate = job;
    return;
  }
  void flushAlbumArtImageUpdate(job);
}

async function pushGlassesImageUpdate(
  renderSignature: string,
  imageUpdate: Parameters<EvenAppBridge["updateImageRawData"]>[0],
): Promise<"success" | "failed" | "skipped"> {
  if (!bridge || renderSignature !== lastRenderSignature) {
    return "skipped";
  }

  clearImageControlsStatusTimer();
  imageControlsStatusTimer = window.setTimeout(() => {
    if (renderSignature !== lastRenderSignature) {
      return;
    }
    if (isImageControlsSendingStatus(state.imageControlsDebugStatus)) {
      syncImageControlsDebug("waiting-host-response", state.imageControlsPreviewDataUrl);
    }
  }, 1_000);

  const imageResult = await awaitImageUpdateResult(imageUpdate);
  clearImageControlsStatusTimer();
  if (imageResult === "call-timeout") {
    syncImageControlsDebug("call-timeout", state.imageControlsPreviewDataUrl);
    return "failed";
  }

  if (imageResult === ImageRawDataUpdateResult.success) {
    syncImageControlsDebug("success", state.imageControlsPreviewDataUrl);
    return "success";
  }
  console.warn("updateImageRawData failed", imageResult);
  syncImageControlsDebug(`retrying (${imageResult})`, state.imageControlsPreviewDataUrl);
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 60);
  });

  if (!bridge || renderSignature !== lastRenderSignature) {
    return "skipped";
  }

  clearImageControlsStatusTimer();
  const retryResult = await awaitImageUpdateResult(imageUpdate);
  if (retryResult === "call-timeout") {
    syncImageControlsDebug(`${imageResult} / retry: call-timeout`, state.imageControlsPreviewDataUrl);
    return "failed";
  }

  if (retryResult === ImageRawDataUpdateResult.success) {
    syncImageControlsDebug(`retry success (${imageResult})`, state.imageControlsPreviewDataUrl);
    return "success";
  }

  syncImageControlsDebug(`${imageResult} / retry: ${retryResult}`, state.imageControlsPreviewDataUrl);
  console.warn("updateImageRawData retry failed", retryResult);
  return "failed";
}

async function flushControlsImageUpdate(job: {
  renderSignature: string;
  controlsSignature: string;
  update: Parameters<EvenAppBridge["updateImageRawData"]>[0];
  previewDataUrl: string | null;
}): Promise<void> {
  controlsImageUpdateInFlight = true;
  state.imageControlsPreviewDataUrl = job.previewDataUrl;
  const result = await pushGlassesImageUpdate(job.renderSignature, job.update);
  if (result === "success") {
    lastControlsImageRenderSignature = job.controlsSignature;
  }
  controlsImageUpdateInFlight = false;

  if (!pendingControlsImageUpdate) {
    return;
  }

  const nextJob = pendingControlsImageUpdate;
  pendingControlsImageUpdate = null;
  void flushControlsImageUpdate(nextJob);
}

function queueControlsImageUpdate(
  renderSignature: string,
  controlsSignature: string,
  update: Parameters<EvenAppBridge["updateImageRawData"]>[0],
  previewDataUrl: string | null,
): void {
  const job = {
    renderSignature,
    controlsSignature,
    update,
    previewDataUrl,
  };

  if (controlsImageUpdateInFlight) {
    pendingControlsImageUpdate = job;
    syncImageControlsDebug("queued", previewDataUrl);
    return;
  }

  void flushControlsImageUpdate(job);
}

async function flushImageRowPlan(rowKind: ManagedImageRowKind, seq: number, plan: ImageRowUpdatePlan): Promise<void> {
  const rowState = getImageRowRenderState(rowKind);
  rowState.inFlightSeq = seq;
  syncImageTextRowDebug(rowKind, "sending...", plan.payload.dataUrl);

  let result = await awaitImageUpdateResult(plan.update);
  const hasNewerQueuedFrame = (): boolean => rowState.latestRequestedSeq > seq || rowState.pendingPlan !== null;
  const canRetryCurrentFrame = (): boolean => rowState.latestRequestedSeq === seq && rowState.pendingPlan === null;

  if (result !== ImageRawDataUpdateResult.success && canRetryCurrentFrame()) {
    syncImageTextDebug(`${rowKind}-retrying`);
    syncImageTextRowDebug(rowKind, "retrying...", plan.payload.dataUrl);
    await delayMs(IMAGE_ROW_RETRY_DELAY_MS);
    if (canRetryCurrentFrame()) {
      result = await awaitImageUpdateResult(plan.update);
    }
  }

  if (rowState.inFlightSeq === seq) {
    rowState.inFlightSeq = null;
  }

  if (result === ImageRawDataUpdateResult.success) {
    if (seq >= rowState.latestCommittedSeq) {
      rowState.latestCommittedSeq = seq;
      lastGoodImageTextPayloadByRowKind[rowKind] = plan.payload;
      syncImageTextDebug(`${rowKind}-updated`);
      syncImageTextRowDebug(rowKind, "success", plan.payload.dataUrl);
    }
  } else if (hasNewerQueuedFrame()) {
    syncImageTextDebug(`${rowKind}-superseded`);
    syncImageTextRowDebug(rowKind, "superseded", plan.payload.dataUrl);
  } else if (result === "call-timeout") {
    syncImageTextDebug(`${rowKind}-timeout`);
    syncImageTextRowDebug(rowKind, "call-timeout", plan.payload.dataUrl);
  } else {
    syncImageTextDebug(`${rowKind}-failed:${result}`);
    syncImageTextRowDebug(rowKind, `failed:${result}`, plan.payload.dataUrl);
  }

  if (rowState.pendingPlan) {
    const nextPlan = rowState.pendingPlan;
    const nextSeq = rowState.pendingSeq ?? rowState.latestRequestedSeq;
    rowState.pendingPlan = null;
    rowState.pendingPayload = null;
    rowState.pendingSeq = null;
    void flushImageRowPlan(rowKind, nextSeq, nextPlan);
  }
}

function queueImageRowPlan(plan: ImageRowUpdatePlan): void {
  if (!bridge || plan.renderer !== "image-text" || plan.rowKind === "controls") {
    return;
  }

  const rowKind = plan.rowKind as ManagedImageRowKind;
  const rowState = getImageRowRenderState(rowKind);
  const nextSeq = rowState.nextSeq;
  rowState.nextSeq += 1;
  rowState.latestRequestedSeq = nextSeq;

  if (rowState.inFlightSeq !== null) {
    rowState.pendingSeq = nextSeq;
    rowState.pendingPayload = plan.payload;
    rowState.pendingPlan = plan;
    syncImageTextRowDebug(rowKind, "queued", plan.payload.dataUrl);
    return;
  }

  void flushImageRowPlan(rowKind, nextSeq, plan);
}

function normalizeEventType(raw: unknown): OsEventTypeList | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  if (typeof raw === "number") {
    return raw as OsEventTypeList;
  }

  if (typeof raw === "string") {
    const normalized = raw.trim().toUpperCase();
    switch (normalized) {
      case "CLICK":
      case "CLICK_EVENT":
        return OsEventTypeList.CLICK_EVENT;
      case "SCROLL_TOP":
      case "SCROLL_TOP_EVENT":
        return OsEventTypeList.SCROLL_TOP_EVENT;
      case "SCROLL_BOTTOM":
      case "SCROLL_BOTTOM_EVENT":
        return OsEventTypeList.SCROLL_BOTTOM_EVENT;
      case "DOUBLE_CLICK":
      case "DOUBLE_CLICK_EVENT":
        return OsEventTypeList.DOUBLE_CLICK_EVENT;
      case "FOREGROUND_ENTER":
      case "FOREGROUND_ENTER_EVENT":
        return OsEventTypeList.FOREGROUND_ENTER_EVENT;
      case "FOREGROUND_EXIT":
      case "FOREGROUND_EXIT_EVENT":
        return OsEventTypeList.FOREGROUND_EXIT_EVENT;
      default:
        return undefined;
    }
  }

  return undefined;
}

function extractEventType(event: EvenHubEvent): OsEventTypeList {
  const rawType = event.textEvent?.eventType ?? event.listEvent?.eventType ?? event.sysEvent?.eventType;
  // Even quirk: some click events arrive with undefined eventType.
  return normalizeEventType(rawType) ?? OsEventTypeList.CLICK_EVENT;
}

function getCurrentImageTextMode(): GlassesImageTextMode {
  return "off";
}

function getCurrentDisplayMode(): GlassesDisplayMode {
  return "text";
}

function isHybridDisplayMode(): boolean {
  return getCurrentDisplayMode() === "hybrid";
}

function isFullImageDisplayMode(): boolean {
  return false;
}

function applyGlassesDisplayMode(nextMode: GlassesDisplayMode): void {
  state.imageModeEnabled = false;
  state.fullImageTextModeEnabled = false;
  localStorage.setItem(IMAGE_MODE_KEY, "text");
  localStorage.setItem(IMAGE_CONTROLS_TEST_KEY, "false");
  localStorage.setItem(IMAGE_TEXT_STATUS_TEST_KEY, "false");
  localStorage.setItem(IMAGE_TEXT_TITLE_TEST_KEY, "false");
  void nextMode;
}

function getEffectiveImageTextAlignMode(): ImageTextAlignMode {
  return state.imageTextAlignMode;
}

function isStatusImageModeEnabled(): boolean {
  return getCurrentImageTextMode() !== "off";
}

function isTitleImageModeEnabled(): boolean {
  return getCurrentImageTextMode() === "status+title";
}

function createPageStructureKey(page: {
  textObject?: Parameters<typeof JSON.stringify>[0];
  imageObject?: Parameters<typeof JSON.stringify>[0];
}): string {
  return JSON.stringify({
    text: (page.textObject as Array<{
      containerName?: string;
      xPosition?: number;
      yPosition?: number;
      width?: number;
      height?: number;
      isEventCapture?: number;
    }> | undefined)?.map((container) => ({
      name: container.containerName ?? "",
      x: container.xPosition ?? 0,
      y: container.yPosition ?? 0,
      width: container.width ?? 0,
      height: container.height ?? 0,
      capture: container.isEventCapture ?? 0,
    })),
    image: (page.imageObject as Array<{
      containerName?: string;
      xPosition?: number;
      yPosition?: number;
      width?: number;
      height?: number;
    }> | undefined)?.map((container) => ({
      name: container.containerName ?? "",
      x: container.xPosition ?? 0,
      y: container.yPosition ?? 0,
      width: container.width ?? 0,
      height: container.height ?? 0,
    })),
  });
}

function getActiveErrorLine(): string | undefined {
  if (!state.lastError) {
    return undefined;
  }

  return GLASSES_ERROR_TEXT[state.language][state.lastError.code] ?? state.lastError.message;
}

function isBusyHintActive(): boolean {
  return Date.now() < state.busyUntil;
}

function getStatusLines(): [string, string] {
  if (isBusyHintActive()) {
    return ["Busy...", ""];
  }

  if (state.lastError && isEffectiveNowPlayingPage()) {
    return [state.lastError.message, ""];
  }

  if (!state.playback) {
    return ["No active playback", "No active device"];
  }

  const deviceName = getEffectiveDeviceName();
  return [deviceName, ""];
}

function formatDuration(ms: number): string {
  const safeMs = Math.max(0, Number.isFinite(ms) ? Math.round(ms) : 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getDisplayProgressMs(): number {
  if (!state.playback || state.playback.durationMs <= 0) {
    return 0;
  }

  const baseProgressMs = Math.max(0, Math.min(state.playback.progressMs, state.playback.durationMs));
  if (!state.playback.isPlaying || lastPlaybackSnapshotAt <= 0) {
    return baseProgressMs;
  }

  const projectedProgressMs = baseProgressMs + Math.max(0, Date.now() - lastPlaybackSnapshotAt);
  return Math.max(0, Math.min(projectedProgressMs, state.playback.durationMs));
}

function getDisplayProgressSecond(): number {
  return Math.floor(getDisplayProgressMs() / 1000);
}

function getProgressBarChars(style: ProgressBarStyle): {
  fill: string;
  empty: string;
  hideStateInBar: boolean;
  trackChars: number;
} {
  switch (style) {
    case "block":
      // Match weather-even-g2 text bar style: solid + medium shade.
      return { fill: "█", empty: "▒", hideStateInBar: true, trackChars: 18 };
    case "square":
      return { fill: "■", empty: "□", hideStateInBar: false, trackChars: 18 };
    default:
      return { fill: "=", empty: "-", hideStateInBar: false, trackChars: PROGRESS_BAR_TRACK_CHARS };
  }
}

function getProgressLine(): string {
  if (!state.playback || state.playback.durationMs <= 0) {
    return "";
  }

  const elapsed = getDisplayProgressMs();
  const remaining = Math.max(0, state.playback.durationMs - elapsed);
  const leftLabel = formatDuration(elapsed);
  const rightLabel = `-${formatDuration(remaining)}`;
  const ratio = state.playback.durationMs > 0 ? elapsed / state.playback.durationMs : 0;
  const progressChars = getProgressBarChars(state.glassesProgressBarStyle);
  const stateMarker = state.playback.isPlaying ? ">" : "||";
  const barTrackChars = progressChars.trackChars;
  const filledChars = Math.max(0, Math.min(barTrackChars, Math.round(ratio * barTrackChars)));
  const emptyChars = Math.max(0, barTrackChars - filledChars);
  if (progressChars.hideStateInBar) {
    const bar = `[${progressChars.fill.repeat(filledChars)}${progressChars.empty.repeat(emptyChars)}]`;
    return `${leftLabel} ${stateMarker} ${bar} ${rightLabel}`;
  }

  const bar = `[${progressChars.fill.repeat(filledChars)}${stateMarker}${progressChars.empty.repeat(emptyChars)}]`;
  return `${leftLabel} ${bar} ${rightLabel}`;
}

function getTextStatusBlock(): string {
  if (!state.uiVisible) {
    return "";
  }

  if (isBusyHintActive()) {
    return "Busy...";
  }

  if (state.lastError && isEffectiveNowPlayingPage()) {
    return state.lastError.message;
  }

  if (!state.playback) {
    return "No active device";
  }

  const deviceName = getEffectiveDeviceName();
  const progressLine = getProgressLine();
  if (progressLine) {
    return `${deviceName}\n${progressLine}`;
  }

  return deviceName;
}

function getTitleImageLines(): [string, string] {
  if (!state.uiVisible) {
    return ["", ""];
  }

  return [getEffectiveTrackTitle(), getEffectiveArtistLine()];
}

function getDisplayTitle(): string {
  if (!state.uiVisible) {
    return "";
  }

  const [baseTitle, artistLine] = getTitleImageLines();
  const windowChars = getSafeTitleWindowChars();
  const toMarqueeWhenOverflow = (value: string): string => {
    const plain = value || " ";
    if (plain.length <= windowChars) {
      return plain;
    }
    const text = `${plain}${"   "}`;
    const start = state.marqueeOffset % text.length;
    const doubled = `${text}${text}`;
    return doubled.slice(start, start + windowChars);
  };
  return `${toMarqueeWhenOverflow(baseTitle)}\n${toMarqueeWhenOverflow(artistLine)}`;
}

function getGlassesFrameSettings(): BorderFrameSettings {
  const shouldRenderBorder = state.borderEnabled && state.uiVisible;
  return {
    enabled: shouldRenderBorder,
    insetPx: state.borderInsetPx,
    borderWidthPx: state.borderWidthPx,
    borderRadius: state.borderRadius,
    contentPaddingPx: state.glassesAlignPaddingPx,
  };
}

function getEffectiveGlassesTextAlignMode(): TextAlignMode {
  return state.glassesTextAlignMode;
}

function getTitleWindowChars(): number {
  return Math.max(12, estimateDisplayTextWidthChars(getGlassesFrameSettings()));
}

function getSafeTitleWindowChars(): number {
  return Math.max(12, getTitleWindowChars() - 1);
}

function getEffectiveTrackTitle(): string {
  return state.playback?.title ?? "No track";
}

function getEffectiveArtistLine(): string {
  return state.playback?.artists?.trim() || "Spotify";
}

function getEffectiveDeviceName(): string {
  return state.playback?.deviceName?.trim() || "Unknown device";
}

function currentTrackId(): string {
  return state.playback?.trackId ?? "";
}

function resolveEffectiveGlassesPage(): AppPage {
  if (state.developerMode && state.developerGlassesPageOverride === "playlists") {
    return "PLAYLISTS";
  }
  if (state.developerMode && state.developerGlassesPageOverride === "devices") {
    return "DEVICES";
  }
  if (!hasTokenBundle()) {
    return "AUTH_REQUIRED";
  }
  return state.glassesPageRoute;
}

function isEffectiveNowPlayingPage(): boolean {
  return resolveEffectiveGlassesPage() === "NOW_PLAYING";
}

function clampIndex(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampSelectablePageState(pageState: SelectablePageState, itemCount: number, focusItemCount = itemCount): void {
  if (focusItemCount <= 0) {
    pageState.focusIndex = 0;
    pageState.windowStart = 0;
  } else {
    pageState.focusIndex = clampIndex(pageState.focusIndex, 0, focusItemCount - 1);
    pageState.windowStart = clampIndex(pageState.windowStart, 0, Math.max(0, focusItemCount - VISIBLE_LIST_WINDOW_SIZE));
  }

  if (itemCount <= 0) {
    pageState.selectedIndex = 0;
  } else {
    pageState.selectedIndex = clampIndex(pageState.selectedIndex, 0, itemCount - 1);
  }

  if (focusItemCount <= 0) {
    return;
  }

  if (pageState.focusIndex < pageState.windowStart) {
    pageState.windowStart = pageState.focusIndex;
  }
  if (pageState.focusIndex >= pageState.windowStart + VISIBLE_LIST_WINDOW_SIZE) {
    pageState.windowStart = pageState.focusIndex - VISIBLE_LIST_WINDOW_SIZE + 1;
  }
  pageState.windowStart = clampIndex(pageState.windowStart, 0, Math.max(0, focusItemCount - VISIBLE_LIST_WINDOW_SIZE));
}

function mapPlaylistSummaryToEntry(summary: PlaylistSummary): MockPlaylistEntry {
  return {
    id: `spotify-playlist-${summary.id}`,
    kind: summary.kind,
    name: summary.name,
    subtitle: summary.ownerName,
    itemCount: summary.trackCount,
    spotifyPlaylistId: summary.id,
    coverUrl: summary.coverUrl,
  };
}

function normalizeSelectedPlaylistSlotIds(slotIds: string[]): string[] {
  return slotIds
    .slice(0, MAX_ADDED_PLAYLIST_SLOTS)
    .map(normalizeStoredPlaylistSlotId);
}

function getAvailablePlaylistOptionById(playlistId: string): PlaylistSummary | null {
  return state.availablePlaylistOptions.find((playlist) => playlist.id === playlistId) ?? null;
}

function buildConfiguredPlaylistEntries(): MockPlaylistEntry[] {
  const selectedEntries = state.selectedPlaylistSlotIds
    .map((playlistId) => {
      if (playlistId === LIKED_SONGS_ENTRY.id) {
        return LIKED_SONGS_ENTRY;
      }
      const playlist = getAvailablePlaylistOptionById(playlistId);
      return playlist ? mapPlaylistSummaryToEntry(playlist) : null;
    })
    .filter((playlist): playlist is MockPlaylistEntry => playlist !== null);

  return [LIKED_SONGS_ENTRY, ...selectedEntries];
}

function syncConfiguredPlaylistEntries(): void {
  state.livePlaylistEntries = buildConfiguredPlaylistEntries();
  clampSelectablePageState(state.playlistPage, state.livePlaylistEntries.length);
}

function clearPendingDeviceTransfer(): void {
  pendingDeviceTransferTargetId = "";
  pendingDeviceTransferUntil = 0;
}

function repairSelectedPlaylistSlotIdsAgainstOptions(): void {
  const validIds = new Set(state.availablePlaylistOptions.map((playlist) => playlist.id));
  const repairedIds = normalizeSelectedPlaylistSlotIds(state.selectedPlaylistSlotIds).map((playlistId) =>
    !playlistId || validIds.has(playlistId) ? playlistId : "",
  );

  if (JSON.stringify(repairedIds) !== JSON.stringify(state.selectedPlaylistSlotIds)) {
    state.selectedPlaylistSlotIds = repairedIds;
    persistSelectedPlaylistSlotIds();
  }
}

function getEffectivePlaylistEntries(): MockPlaylistEntry[] {
  return state.livePlaylistEntries ?? buildConfiguredPlaylistEntries();
}

function getSelectablePageDisplayCount(itemCount: number): number {
  return Math.max(2, itemCount + 1);
}

function getActivePlaybackPlaylistKey(): string {
  const contextUri = state.playback?.contextUri ?? "";
  if (!contextUri) {
    return "";
  }

  if (contextUri.endsWith(":collection")) {
    return LIKED_SONGS_ENTRY.id;
  }

  const playlistPrefix = "spotify:playlist:";
  return contextUri.startsWith(playlistPrefix) ? contextUri.slice(playlistPrefix.length) : "";
}

function getActivePlaybackPlaylistIndex(entries: MockPlaylistEntry[]): number {
  const activePlaylistKey = getActivePlaybackPlaylistKey();
  if (!activePlaylistKey) {
    return -1;
  }

  return entries.findIndex((entry) =>
    entry.kind === "liked" ? activePlaylistKey === LIKED_SONGS_ENTRY.id : entry.spotifyPlaylistId === activePlaylistKey,
  );
}

function buildMockDeviceEntries(selectedIndex: number): MockDeviceEntry[] {
  return state.mockDeviceSlotPresetIds.map((presetId, index) => ({
    id: `mock-device-${presetId}`,
    ...DEVICE_MOCK_PRESETS[presetId],
    isActive: index === selectedIndex,
    isRestricted: false,
  }));
}

function mapDeviceSummaryToEntry(summary: DeviceSummary): MockDeviceEntry {
  return {
    id: summary.id,
    name: summary.name,
    typeLabel: summary.type || "Device",
    isActive: summary.isActive,
    isRestricted: summary.isRestricted,
  };
}

function getEffectiveDeviceEntries(): MockDeviceEntry[] {
  return state.liveDeviceEntries ?? buildMockDeviceEntries(state.devicePage.selectedIndex);
}

function applyPendingDeviceTransferToEntries(entries: MockDeviceEntry[]): MockDeviceEntry[] {
  if (!pendingDeviceTransferTargetId) {
    return entries;
  }

  if (Date.now() >= pendingDeviceTransferUntil) {
    clearPendingDeviceTransfer();
    return entries;
  }

  const targetIndex = entries.findIndex((entry) => entry.id === pendingDeviceTransferTargetId);
  if (targetIndex < 0) {
    clearPendingDeviceTransfer();
    return entries;
  }

  if (entries[targetIndex]?.isActive) {
    clearPendingDeviceTransfer();
    return entries;
  }

  return entries.map((entry, index) => ({
    ...entry,
    isActive: index === targetIndex,
  }));
}

function getPreferredPlaybackDeviceId(): string | undefined {
  if (!state.liveDeviceEntries || state.liveDeviceEntries.length === 0) {
    return undefined;
  }

  const activeDevice = state.liveDeviceEntries.find((entry) => entry.isActive);
  if (activeDevice?.id) {
    return activeDevice.id;
  }

  const selectedDevice = state.liveDeviceEntries[state.devicePage.selectedIndex];
  if (selectedDevice?.id) {
    return selectedDevice.id;
  }

  return undefined;
}

async function playSelectedPlaylist(entry: MockPlaylistEntry): Promise<{
  ok: boolean;
  error?: SpotifyErrorCode;
  message?: string;
  retryAfterMs?: number;
}> {
  const preferredDeviceId = getPreferredPlaybackDeviceId();

  if (entry.kind === "liked") {
    return playFirstLikedSong(preferredDeviceId);
  }

  const playlistSummary = entry.spotifyPlaylistId ? getAvailablePlaylistOptionById(entry.spotifyPlaylistId) : null;
  if (!playlistSummary?.uri) {
    return { ok: false, error: "UNKNOWN", message: "Selected playlist is not playable yet." };
  }

  return playPlaylistContext(playlistSummary.uri, preferredDeviceId);
}

function getVisibleSelectableLines(
  items: Array<{ name: string; isActive?: boolean }>,
  pageState: SelectablePageState,
  emptyLabel: string,
): string[] {
  if (items.length === 0) {
    return [emptyLabel];
  }

  const visibleItems = items.slice(pageState.windowStart, pageState.windowStart + VISIBLE_LIST_WINDOW_SIZE);
  return visibleItems.map((item, index) => {
    const absoluteIndex = pageState.windowStart + index;
    const prefix = absoluteIndex === pageState.focusIndex ? ">" : " ";
    const activePrefix = item.isActive ? "• " : "";
    return `${prefix} ${activePrefix}${item.name}`;
  });
}

function setSelectablePageEntryFocus(pageState: SelectablePageState, itemCount: number): void {
  pageState.focusIndex = itemCount > 0 ? 1 : 0;
  pageState.windowStart = 0;
  clampSelectablePageState(pageState, itemCount, getSelectablePageDisplayCount(itemCount));
}

function navigateToGlassesPage(nextPage: NavigableGlassesPage): void {
  state.glassesPageRoute = nextPage;
  if (nextPage === "NOW_PLAYING") {
    state.focusIndex = NOW_PLAYING_DEFAULT_FOCUS_INDEX;
  } else if (nextPage === "PLAYLISTS") {
    setSelectablePageEntryFocus(state.playlistPage, getEffectivePlaylistEntries().length);
  } else if (nextPage === "DEVICES") {
    setSelectablePageEntryFocus(state.devicePage, getEffectiveDeviceEntries().length);
  }
  refreshForEffectivePageChange(true);
  renderPhoneUi(false);
}

function buildPlaylistPageViewModel() {
  const text = DEV_PAGE_TEXT[state.language];
  const entries = getEffectivePlaylistEntries();
  const pageState = state.playlistPage;
  const activePlaylistIndex = getActivePlaybackPlaylistIndex(entries);
  const displayEntries = [
    { name: text.glassesBackToNowPlaying },
    ...(entries.length > 0
      ? entries.map((entry, index) => ({
          ...entry,
          isActive: index === activePlaylistIndex,
        }))
      : [{ name: text.glassesNoItems }]),
  ];
  clampSelectablePageState(pageState, entries.length, displayEntries.length);
  const selected = entries[pageState.selectedIndex] ?? null;

  return {
    entries,
    displayEntries,
    pageState,
    pageTitle: text.glassesPlaylistsTitle,
    countLabel: entries.length > 0 ? `${pageState.focusIndex + 1}/${entries.length}` : "0/0",
    listLines: getVisibleSelectableLines(displayEntries, pageState, text.glassesNoItems),
    footerLine1: selected ? `${selected.name} | ${selected.itemCount} ${text.glassesTracksSuffix}` : text.glassesNothingSelected,
    footerLine2: state.livePlaylistEntries ? text.glassesPlaylistLiveHint : text.glassesPlaylistMockHint,
  };
}

function buildDevicePageViewModel() {
  const text = DEV_PAGE_TEXT[state.language];
  const pageState = state.devicePage;
  const entries = getEffectiveDeviceEntries();
  const displayEntries = [
    { name: text.glassesBackToNowPlaying },
    ...(entries.length > 0 ? entries : [{ name: text.glassesNoItems }]),
  ];
  clampSelectablePageState(pageState, entries.length, displayEntries.length);
  const clampedEntries = getEffectiveDeviceEntries();
  const selected = clampedEntries[pageState.selectedIndex] ?? null;

  return {
    entries: clampedEntries,
    displayEntries,
    pageState,
    pageTitle: text.glassesDevicesTitle,
    countLabel: clampedEntries.length > 0 ? `${pageState.focusIndex + 1}/${clampedEntries.length}` : "0/0",
    listLines: getVisibleSelectableLines(displayEntries, pageState, text.glassesNoItems),
    footerLine1: selected ? `${selected.typeLabel} | ${selected.isActive ? text.glassesActive : text.glassesStandby}` : text.glassesNothingSelected,
    footerLine2: state.liveDeviceEntries ? "Live: Spotify devices" : text.glassesDeviceMockHint,
  };
}

type SongArtistModule = { content: string };
type ProgressModule = { content: string };
type ConsoleModule = { content: string };
type AlbumArtModule = { imageUrl: string | null };
type NowPlayingModuleBundle = {
  songArtist: SongArtistModule;
  progress: ProgressModule;
  console: ConsoleModule;
  albumArt: AlbumArtModule;
};

function buildNowPlayingModuleBundle(): NowPlayingModuleBundle {
  const statusBlock = getTextStatusBlock();
  const [consoleLine = "", progressLineRaw = ""] = statusBlock.split("\n");
  const progressLine = progressLineRaw || consoleLine;
  return {
    songArtist: { content: getDisplayTitle() },
    progress: { content: progressLine },
    console: { content: consoleLine },
    albumArt: { imageUrl: state.playback?.albumImageUrl ?? null },
  };
}

function buildNowPlayingOrchestrationPageSpec() {
  const modules = buildNowPlayingModuleBundle();
  void modules.albumArt.imageUrl;
  const layoutMode: DeveloperGlassesLayoutMode = state.developerGlassesLayoutMode;
  const statusBlock =
    modules.console.content && modules.progress.content
      ? `${modules.console.content}\n${modules.progress.content}`
      : modules.progress.content || modules.console.content;

  return buildNowPlayingPage({
    title: modules.songArtist.content,
    statusLine: statusBlock,
    focusIndex: state.focusIndex,
    uiVisible: state.uiVisible,
    isPlaying: state.playback?.isPlaying ?? false,
    orchestrationMode: layoutMode,
    albumArtSizePx: state.albumArtSizePx,
    albumArtGapPx: state.albumArtGapPx,
    useImageControls: false,
    imageSendFormat: state.imageControlsSendFormat,
    frame: getGlassesFrameSettings(),
    controlsVariant: state.glassesControlVariant,
    controlsLayout: GLASSES_CONTROLS_LAYOUT,
    textAlignMode: getEffectiveGlassesTextAlignMode(),
    imageTextMode: getCurrentImageTextMode(),
    imageTextAlignMode: getEffectiveImageTextAlignMode(),
    imageTextStyle: FIXED_IMAGE_TEXT_STYLE,
    imageTextFontWeight: state.imageTextFontWeight,
    language: state.language,
    titleImageLines: state.uiVisible ? getTitleImageLines() : ["", ""],
    statusImageLines: state.uiVisible ? getStatusLines() : ["", ""],
    titleImageOffsetPx: imageTitleMarqueeOffsetPx,
    titleImageGapPx: DEFAULT_IMAGE_TEXT_MARQUEE_GAP_PX,
    controlsImageAlignMode: state.glassesTextAlignMode as ImageTextAlignMode,
    shuffleEnabled: state.playback?.shuffleEnabled ?? false,
    repeatMode: (state.playback?.repeatMode ?? "off") as ControlsRepeatMode,
    decorateTextControls: true,
  });
}

function buildPlaylistOrchestrationPageSpec() {
  const playlistPage = buildPlaylistPageViewModel();
  return buildPlaylistPage({
    pageTitle: "",
    countLabel: "",
    listLines: playlistPage.listLines,
    footerLine1: "",
    footerLine2: "",
    showTitle: false,
    showFooter: false,
    listLineCount: VISIBLE_LIST_WINDOW_SIZE,
    frame: getGlassesFrameSettings(),
    textAlignMode: getEffectiveGlassesTextAlignMode(),
    containerNames: {
      title: "pl-title",
      list: "pl-list",
      footer: "pl-footer",
    },
  });
}

function buildDevicesOrchestrationPageSpec() {
  const devicePage = buildDevicePageViewModel();
  return buildDevicesPage({
    pageTitle: "",
    countLabel: "",
    listLines: devicePage.listLines,
    footerLine1: "",
    footerLine2: "",
    showTitle: false,
    showFooter: false,
    listLineCount: VISIBLE_LIST_WINDOW_SIZE,
    frame: getGlassesFrameSettings(),
    textAlignMode: getEffectiveGlassesTextAlignMode(),
    containerNames: {
      title: "dv-title",
      list: "dv-list",
      footer: "dv-footer",
    },
  });
}

async function refreshPlaylistEntries(forceRender = false): Promise<void> {
  if (!hasTokenBundle()) {
    state.availablePlaylistOptions = [];
    syncConfiguredPlaylistEntries();
    if (bridge && resolveEffectiveGlassesPage() === "PLAYLISTS") {
      await renderGlassesPage(forceRender);
    }
    renderPhoneUi(false);
    return;
  }

  const result = await getUserPlaylists(PLAYLIST_OPTIONS_FETCH_LIMIT);

  if (result.ok) {
    state.availablePlaylistOptions = result.playlists;
    repairSelectedPlaylistSlotIdsAgainstOptions();
    syncConfiguredPlaylistEntries();
  } else if (result.error === "AUTH_REQUIRED" || result.error === "AUTH_EXPIRED") {
    state.availablePlaylistOptions = [];
    syncConfiguredPlaylistEntries();
  }

  if (bridge && resolveEffectiveGlassesPage() === "PLAYLISTS") {
    await renderGlassesPage(forceRender);
  }
  renderPhoneUi(false);
}

async function refreshDeviceEntries(forceRender = false): Promise<void> {
  if (!hasTokenBundle()) {
    clearPendingDeviceTransfer();
    state.liveDeviceEntries = null;
    clampSelectablePageState(state.devicePage, getEffectiveDeviceEntries().length);
    if (bridge && resolveEffectiveGlassesPage() === "DEVICES") {
      await renderGlassesPage(forceRender);
    }
    renderPhoneUi(false);
    return;
  }

  const result = await getAvailableDevices();

  if (result.ok) {
    state.liveDeviceEntries = applyPendingDeviceTransferToEntries(result.devices.map(mapDeviceSummaryToEntry));
    clampSelectablePageState(state.devicePage, state.liveDeviceEntries.length);
  } else if (result.error === "AUTH_REQUIRED" || result.error === "AUTH_EXPIRED") {
    clearPendingDeviceTransfer();
    state.liveDeviceEntries = null;
    clampSelectablePageState(state.devicePage, getEffectiveDeviceEntries().length);
  }

  if (bridge && resolveEffectiveGlassesPage() === "DEVICES") {
    await renderGlassesPage(forceRender);
  }
  renderPhoneUi(false);
}

function refreshForEffectivePageChange(forceRender = false): void {
  clearPollTimer();
  clearDeviceEntriesPollTimer();
  pendingImmediateRefreshAfterPoll = false;

  const effectivePage = resolveEffectiveGlassesPage();
  if (effectivePage === "PLAYLISTS") {
    void renderGlassesPage(forceRender);
    void refreshPlaylistEntries(false);
    if (hasTokenBundle()) {
      kickImmediateRefresh();
    }
    return;
  }

  if (effectivePage === "DEVICES") {
    void renderGlassesPage(forceRender);
    void refreshDeviceEntries(false);
    scheduleDeviceEntriesPoll(true);
    if (hasTokenBundle()) {
      kickImmediateRefresh();
    }
    return;
  }

  if (effectivePage === "NOW_PLAYING" && hasTokenBundle()) {
    if (state.playback?.isPlaying) {
      lastPlaybackSnapshotAt = Date.now();
    }
    kickImmediateRefresh();
    void renderGlassesPage(forceRender).then(() => {
      restartMarquee();
      restartGlassesStatusTicker();
      scheduleGlassesStatusTickerRecovery();
      if (state.uiVisible) {
        scheduleAutoHideIfNeeded(true);
      }
    });
    return;
  }

  void renderGlassesPage(forceRender);
}

function ensureEffectivePageVisibility(): void {
  void 0;
}

function buildHiddenGlassesPageSpec() {
  return buildPlaylistPage({
    pageTitle: "",
    countLabel: "",
    listLines: [""],
    footerLine1: "",
    footerLine2: "",
    showTitle: false,
    showFooter: false,
    listLineCount: 1,
    frame: getGlassesFrameSettings(),
    textAlignMode: DEFAULT_TEXT_MODE_ALIGN,
    containerNames: {
      title: "hidden-title",
      list: "hidden-list",
      footer: "hidden-footer",
    },
  });
}

function buildStartupBootstrapContainer(): CreateStartUpPageContainer {
  return new CreateStartUpPageContainer({
    containerTotalNum: 2,
    textObject: [
      new TextContainerProperty({
        xPosition: 0,
        yPosition: 96,
        width: 576,
        height: 72,
        borderWidth: 0,
        borderColor: 0,
        borderRadius: 0,
        paddingLength: 0,
        containerID: 1,
        containerName: "boot-msg",
        content: "Starting...",
        isEventCapture: 0,
      }),
      new TextContainerProperty({
        xPosition: 575,
        yPosition: 287,
        width: 1,
        height: 1,
        borderWidth: 0,
        borderColor: 0,
        borderRadius: 0,
        paddingLength: 0,
        containerID: 2,
        containerName: "boot-capture",
        content: " ",
        isEventCapture: 1,
      }),
    ],
    imageObject: [],
  });
}

function createControlsImageRenderSignature(): string {
  const effectivePage = resolveEffectiveGlassesPage();
  return JSON.stringify({
    page: effectivePage,
    uiVisible: state.uiVisible,
    hiddenGlassesPage: state.hiddenGlassesPage,
    focusIndex: state.focusIndex,
    isPlaying: state.playback?.isPlaying ?? false,
    shuffleEnabled: state.playback?.shuffleEnabled ?? false,
    repeatMode: state.playback?.repeatMode ?? "off",
    displayMode: getCurrentDisplayMode(),
    controlsVariant: state.glassesControlVariant,
    controlsAlign: isHybridDisplayMode() ? "left" : getEffectiveImageTextAlignMode(),
    imageControlsSendFormat: state.imageControlsSendFormat,
  });
}

function createRenderSignature(): string {
  const playback = state.playback;
  const displayMode = getCurrentDisplayMode();
  const effectivePage = resolveEffectiveGlassesPage();
  return JSON.stringify({
    page: effectivePage,
    uiVisible: state.uiVisible,
    hiddenGlassesPage: state.hiddenGlassesPage,
    focusIndex: state.focusIndex,
    developerGlassesPageOverride: state.developerGlassesPageOverride,
    developerGlassesLayoutMode: state.developerGlassesLayoutMode,
    albumArtSizePx: state.albumArtSizePx,
    albumArtGapPx: state.albumArtGapPx,
    albumArtOpacityPercent: state.albumArtOpacityPercent,
    playlistPage: state.playlistPage,
    devicePage: state.devicePage,
    selectedPlaylistSlotIds: state.selectedPlaylistSlotIds,
    playlistScrollInverted: state.playlistScrollInverted,
    availablePlaylistOptions: state.availablePlaylistOptions.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
    })),
    mockDeviceSlotPresetIds: state.mockDeviceSlotPresetIds,
    livePlaylistEntries: (state.livePlaylistEntries ?? []).map((entry) => ({
      id: entry.id,
      name: entry.name,
      itemCount: entry.itemCount,
    })),
    liveDeviceEntries: (state.liveDeviceEntries ?? []).map((entry) => ({
      id: entry.id,
      name: entry.name,
      isActive: entry.isActive,
      isRestricted: entry.isRestricted,
    })),
    contextUri: playback?.contextUri ?? "",
    trackId: playback?.trackId ?? "",
    title: playback?.title ?? "",
    artists: playback?.artists ?? "",
    isPlaying: playback?.isPlaying ?? false,
    deviceName: playback?.deviceName ?? "",
    durationMs: playback?.durationMs ?? 0,
    shuffleEnabled: playback?.shuffleEnabled ?? false,
    repeatMode: playback?.repeatMode ?? "off",
    errorCode: state.lastError?.code ?? "",
    errorMessage: state.lastError?.message ?? "",
    busy: isBusyHintActive(),
    glassesControlVariant: state.glassesControlVariant,
    glassesTextAlignMode: getEffectiveGlassesTextAlignMode(),
    glassesControlInvert: state.glassesControlInvert,
    glassesAlignPaddingPx: state.glassesAlignPaddingPx,
    glassesProgressBarStyle: state.glassesProgressBarStyle,
    glassesAutoHideEnabled: state.glassesAutoHideEnabled,
    glassesAutoHideSeconds: state.glassesAutoHideSeconds,
    displayMode,
    imageControlsSendFormat: state.imageControlsSendFormat,
    imageTextMode: getCurrentImageTextMode(),
    imageTextAlignMode: state.imageTextAlignMode,
    imageTextFontWeight: state.imageTextFontWeight,
    glassesRenderStatus: state.glassesRenderStatus,
    borderEnabled: state.borderEnabled,
    borderInsetPx: state.borderInsetPx,
    borderWidthPx: state.borderWidthPx,
    borderRadius: state.borderRadius,
  });
}

function createPhoneRenderSignature(): string {
  const playback = state.playback;
  const showImageDebug = state.phoneView === "SETTINGS" && state.developerMode;
  const displayMode = getCurrentDisplayMode();
  const effectivePage = resolveEffectiveGlassesPage();
  return JSON.stringify({
    language: state.language,
    phoneView: state.phoneView,
    panel: state.phonePanel,
    panelBProbe: state.panelBProbe,
    trackId: playback?.trackId ?? "",
    title: playback?.title ?? "",
    artists: playback?.artists ?? "",
    albumImageUrl: playback?.albumImageUrl ?? "",
    isPlaying: playback?.isPlaying ?? false,
    shuffleEnabled: playback?.shuffleEnabled ?? false,
    repeatMode: playback?.repeatMode ?? "off",
    glassesControlVariant: state.glassesControlVariant,
    glassesTextAlignMode: state.glassesTextAlignMode,
    glassesControlInvert: state.glassesControlInvert,
    glassesAlignPaddingPx: state.glassesAlignPaddingPx,
    glassesProgressBarStyle: state.glassesProgressBarStyle,
    glassesAutoHideEnabled: state.glassesAutoHideEnabled,
    glassesAutoHideSeconds: state.glassesAutoHideSeconds,
    page: effectivePage,
    developerMode: state.developerMode,
    developerGlassesPageOverride: state.developerGlassesPageOverride,
    developerGlassesLayoutMode: state.developerGlassesLayoutMode,
    albumArtSizePx: state.albumArtSizePx,
    albumArtGapPx: state.albumArtGapPx,
    albumArtOpacityPercent: state.albumArtOpacityPercent,
    selectedPlaylistSlotIds: state.selectedPlaylistSlotIds,
    playlistScrollInverted: state.playlistScrollInverted,
    availablePlaylistOptions: state.availablePlaylistOptions.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
    })),
    mockDeviceSlotPresetIds: state.mockDeviceSlotPresetIds,
    liveDeviceEntries: (state.liveDeviceEntries ?? []).map((entry) => ({
      id: entry.id,
      name: entry.name,
      isActive: entry.isActive,
      isRestricted: entry.isRestricted,
    })),
    displayMode,
    imageControlsDebugStatus: showImageDebug ? state.imageControlsDebugStatus : "",
    imageControlsPreviewDataUrl: showImageDebug ? state.imageControlsPreviewDataUrl ?? "" : "",
    imageTextAlignMode: state.imageTextAlignMode,
    imageTextFontWeight: state.imageTextFontWeight,
    borderEnabled: state.borderEnabled,
    borderInsetPx: state.borderInsetPx,
    borderWidthPx: state.borderWidthPx,
    borderRadius: state.borderRadius,
    selfHostMode: state.selfHostMode,
    selfHostClientIdInput: state.selfHostClientIdInput,
    selfHostServiceOriginInput: state.selfHostServiceOriginInput,
    selfHostCopyFeedback: state.selfHostCopyFeedback ?? "",
    configSource: getEffectiveConfigState().source,
    authorizedMismatch: hasAuthorizedSessionMismatch(),
    lastAuthError: peekLastAuthError()?.code ?? "",
  });
}

function renderPhoneUi(force = false): void {
  const signature = createPhoneRenderSignature();
  if (!force && signature === lastPhoneRenderSignature) {
    updatePhoneStatus();
    return;
  }
  buildPhoneUi();
  lastPhoneRenderSignature = signature;
  updatePhoneStatus();
}

function clearPollTimer(): void {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function clearMarqueeTimer(): void {
  if (marqueeTimer !== null) {
    window.clearTimeout(marqueeTimer);
    marqueeTimer = null;
  }
}

function clearBusyTimer(): void {
  if (busyTimer !== null) {
    window.clearTimeout(busyTimer);
    busyTimer = null;
  }
}

function clearPhoneStatusTimer(): void {
  if (phoneStatusTimer !== null) {
    window.clearTimeout(phoneStatusTimer);
    phoneStatusTimer = null;
  }
}

function clearGlassesStatusTimer(): void {
  if (glassesStatusTimer !== null) {
    window.clearTimeout(glassesStatusTimer);
    glassesStatusTimer = null;
  }
}

function clearGlassesStatusRecoveryTimer(): void {
  if (glassesStatusRecoveryTimer !== null) {
    window.clearTimeout(glassesStatusRecoveryTimer);
    glassesStatusRecoveryTimer = null;
  }
}

function clearDeviceEntriesPollTimer(): void {
  if (deviceEntriesPollTimer !== null) {
    window.clearTimeout(deviceEntriesPollTimer);
    deviceEntriesPollTimer = null;
  }
}

function clearAutoHideTimer(): void {
  if (autoHideTimer !== null) {
    window.clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
}

function clearImageModeReopenTimer(): void {
  if (imageModeReopenTimer !== null) {
    window.clearTimeout(imageModeReopenTimer);
    imageModeReopenTimer = null;
  }
}

function resetGlassesRenderStateForBridgeResume(): void {
  clearAutoHideTimer();
  clearGlassesStatusTimer();
  clearGlassesStatusRecoveryTimer();
  clearDeviceEntriesPollTimer();
  clearPendingDeviceTransfer();
  state.hasStartupRendered = false;
  lastRenderSignature = "";
  lastShapeKey = "";
  lastPageStructureKey = "";
  lastPageRebuildKey = "";
  lastPageHasImageContainers = false;
  hasCreatedStartupPage = false;
  lastControlsImageRenderSignature = "";
  lastAlbumArtSongKey = "";
  albumArtImageUpdateInFlight = false;
  pendingAlbumArtImageUpdate = null;
  controlsImageUpdateInFlight = false;
  pendingControlsImageUpdate = null;
  clearNowPlayingTextUpgradeState();
  shouldResetImageTextStateOnStartup = true;
}

function scheduleAutoHideIfNeeded(forceReset = false): void {
  if (forceReset) {
    clearAutoHideTimer();
  }
  if (autoHideTimer !== null) {
    return;
  }
  if (!state.uiVisible) {
    return;
  }
  if (!state.glassesAutoHideEnabled) {
    return;
  }
  if (state.glassesAutoHideSeconds <= 0) {
    return;
  }

  autoHideTimer = window.setTimeout(() => {
    void setGlassesUiVisible(false);
  }, state.glassesAutoHideSeconds * 1000);
}

function restartPhoneStatusTicker(): void {
  clearPhoneStatusTimer();

  const tick = (): void => {
    updatePhoneStatus();
    phoneStatusTimer = window.setTimeout(tick, 1_000);
  };

  phoneStatusTimer = window.setTimeout(tick, 1_000);
}

function shouldRunGlassesStatusTicker(): boolean {
  if (!bridge || !state.hasStartupRendered) {
    return false;
  }

  if (!isEffectiveNowPlayingPage() || !state.uiVisible) {
    return false;
  }

  if (getCurrentImageTextMode() !== "off") {
    return false;
  }

  if (isBusyHintActive() || state.lastError || !state.playback) {
    return false;
  }

  if (!state.playback.isPlaying || state.playback.durationMs <= 0) {
    return false;
  }

  return getNowPlayingTextContainerId("np-status") !== null;
}

function restartGlassesStatusTicker(): void {
  clearGlassesStatusTimer();

  if (!shouldRunGlassesStatusTicker()) {
    return;
  }

  const tick = (): void => {
    if (!shouldRunGlassesStatusTicker()) {
      clearGlassesStatusTimer();
      return;
    }

    const containerID = getNowPlayingTextContainerId("np-status");
    if (containerID === null) {
      clearGlassesStatusTimer();
      return;
    }

    void updateNowPlayingTextContainer("np-status", getTextStatusBlock(), containerID).finally(() => {
      if (!shouldRunGlassesStatusTicker()) {
        clearGlassesStatusTimer();
        return;
      }

      glassesStatusTimer = window.setTimeout(tick, 1_000);
    });
  };

  glassesStatusTimer = window.setTimeout(tick, 1_000);
}

function scheduleGlassesStatusTickerRecovery(): void {
  clearGlassesStatusRecoveryTimer();

  if (!isEffectiveNowPlayingPage()) {
    return;
  }

  glassesStatusRecoveryTimer = window.setTimeout(() => {
    glassesStatusRecoveryTimer = null;
    restartGlassesStatusTicker();
  }, 200);
}

function shouldPollDeviceEntries(): boolean {
  return !!bridge && hasTokenBundle() && state.uiVisible && resolveEffectiveGlassesPage() === "DEVICES";
}

function scheduleDeviceEntriesPoll(forceReset = false): void {
  if (forceReset) {
    clearDeviceEntriesPollTimer();
  }

  if (deviceEntriesPollTimer !== null || !shouldPollDeviceEntries()) {
    return;
  }

  deviceEntriesPollTimer = window.setTimeout(() => {
    deviceEntriesPollTimer = null;
    if (!shouldPollDeviceEntries()) {
      return;
    }
    void refreshDeviceEntries(false).finally(() => {
      scheduleDeviceEntriesPoll();
    });
  }, DEVICE_PAGE_POLL_MS);
}

function schedulePoll(delayMs: number): void {
  clearPollTimer();
  pollTimer = window.setTimeout(() => {
    void pollTick();
  }, Math.max(0, delayMs));
}

function shouldRunTextMarquee(): boolean {
  if (!isEffectiveNowPlayingPage() || isTitleImageModeEnabled()) {
    return false;
  }

  if (!state.uiVisible) {
    return false;
  }

  const [baseTitle, artistLine] = getTitleImageLines();
  const windowChars = getSafeTitleWindowChars();
  return baseTitle.length > windowChars || artistLine.length > windowChars;
}

function restartMarquee(): void {
  clearMarqueeTimer();

  if (!bridge || !isEffectiveNowPlayingPage()) {
    return;
  }

  if (isTitleImageModeEnabled()) {
    if (!imageTitleUsesMarquee || imageTitleMarqueeLoopWidthPx <= 0) {
      imageTitleMarqueeOffsetPx = 0;
      return;
    }

    const tick = (): void => {
      if (!bridge || !isEffectiveNowPlayingPage() || !isTitleImageModeEnabled() || !imageTitleUsesMarquee || imageTitleMarqueeLoopWidthPx <= 0) {
        clearMarqueeTimer();
        imageTitleMarqueeOffsetPx = 0;
        return;
      }

      imageTitleMarqueeOffsetPx =
        (imageTitleMarqueeOffsetPx + DEFAULT_IMAGE_TEXT_MARQUEE_STEP_PX) % Math.max(1, imageTitleMarqueeLoopWidthPx);

      const startTs = performance.now();
      const page = buildCurrentGlassesPageSpec();
      const titlePlan = page.imagePlans?.find((plan) => plan.rowKind === "title" && plan.renderer === "image-text");
      if (titlePlan) {
        queueImageRowPlan(titlePlan);
      }
      const renderCostMs = performance.now() - startTs;
      imageTitleTickIntervalMs =
        renderCostMs > IMAGE_TEXT_SLOW_TICK_THRESHOLD_MS ? Math.min(900, MARQUEE_INTERVAL_MS * 2) : MARQUEE_INTERVAL_MS;

      marqueeTimer = window.setTimeout(tick, imageTitleTickIntervalMs);
    };

    marqueeTimer = window.setTimeout(tick, imageTitleTickIntervalMs);
    return;
  }

  if (!shouldRunTextMarquee()) {
    return;
  }

  const tick = async (): Promise<void> => {
    if (!bridge || !shouldRunTextMarquee()) {
      clearMarqueeTimer();
      return;
    }

    const [baseTitle, artistLine] = getTitleImageLines();
    const windowChars = getSafeTitleWindowChars();
    const marqueeCycleLength = Math.max(
      ...( [baseTitle, artistLine]
        .filter((text) => text.length > windowChars)
        .map((text) => text.length + 3) ),
    );
    const cycleLength = Number.isFinite(marqueeCycleLength) && marqueeCycleLength > 0 ? marqueeCycleLength : 1;
    state.marqueeOffset = (state.marqueeOffset + 1) % Math.max(1, cycleLength);

    const marqueeText = getDisplayTitle();
    const titleContainerId = getNowPlayingTextContainerId("np-title");
    if (titleContainerId === null) {
      clearMarqueeTimer();
      return;
    }
    await updateNowPlayingTextContainer("np-title", marqueeText, titleContainerId);

    marqueeTimer = window.setTimeout(() => {
      void tick();
    }, MARQUEE_INTERVAL_MS);
  };

  marqueeTimer = window.setTimeout(() => {
    void tick();
  }, MARQUEE_INTERVAL_MS);
}

function scheduleBusyHintRenderReset(): void {
  clearBusyTimer();
  busyTimer = window.setTimeout(() => {
    void renderGlassesPage(false);
  }, BUSY_HINT_MS + 20);
}

async function forceReopenGlassesPage(): Promise<void> {
  if (!bridge) {
    syncImageControlsDebug("bridge-unavailable", state.imageControlsPreviewDataUrl);
    setGlassesRenderStatus("reopen:bridge-unavailable");
    return;
  }

  if (glassesPageReopenInFlight) {
    return;
  }

  try {
    glassesPageReopenInFlight = true;
    clearImageModeReopenTimer();
    clearMarqueeTimer();

    state.hasStartupRendered = false;
    lastRenderSignature = "";
    lastShapeKey = "";
    lastPageStructureKey = "";
    lastPageRebuildKey = "";
    lastPageHasImageContainers = false;
    lastControlsImageRenderSignature = "";
    clearNowPlayingTextUpgradeState();
    shouldResetImageTextStateOnStartup = true;
    syncImageControlsDebug("reopening...", state.imageControlsPreviewDataUrl);
    syncImageTextDebug("reopening");
    setGlassesRenderStatus("reopening");
    await renderGlassesPage(true);
  } catch (error) {
    console.warn("Failed to reopen glasses page", error);
    syncImageControlsDebug("reopen-failed", state.imageControlsPreviewDataUrl);
    syncImageTextDebug("reopen-failed");
    setGlassesRenderStatus(`reopen-failed:${error instanceof Error ? error.message : String(error)}`);
  } finally {
    glassesPageReopenInFlight = false;
  }
}

async function forceRefreshAndReopenGlassesPage(): Promise<void> {
  await forceReopenGlassesPage();

  if (!hasTokenBundle()) {
    return;
  }

  // The manual "force reopen" action should also fetch fresh playback state.
  // Reopening alone only redraws current in-memory state, which can look frozen in text mode.
  await forceManualRefresh();
}

function scheduleImageModeAutoReopen(renderSignature: string): void {
  if (!bridge) {
    syncImageControlsDebug("bridge-unavailable", state.imageControlsPreviewDataUrl);
    return;
  }

  if (glassesPageReopenInFlight) {
    return;
  }

  clearImageModeReopenTimer();
  lastRenderSignature = renderSignature;
  syncImageControlsDebug("auto-reopen-pending", state.imageControlsPreviewDataUrl);
  imageModeReopenTimer = window.setTimeout(() => {
    imageModeReopenTimer = null;
    void forceReopenGlassesPage();
  }, IMAGE_MODE_REOPEN_DELAY_MS);
}

function shouldAutoRecoverImageMode(): boolean {
  return state.imageModeEnabled && isEffectiveNowPlayingPage() && state.hasStartupRendered;
}

function markBusyHint(): void {
  state.busyUntil = Date.now() + BUSY_HINT_MS;
  scheduleBusyHintRenderReset();
}

function computeBasePollDelay(): number {
  if (!state.isForeground) {
    return state.playback?.isPlaying ? POLL_PAUSED_MS : POLL_IDLE_MS;
  }

  if (state.playback?.isPlaying) {
    return POLL_PLAYING_MS;
  }

  return state.playback ? POLL_PAUSED_MS : POLL_IDLE_MS;
}

function shouldPollInCurrentState(): boolean {
  return hasTokenBundle();
}

function buildCurrentGlassesPageSpec() {
  const effectivePage = resolveEffectiveGlassesPage();
  ensureEffectivePageVisibility();
  if (!state.uiVisible && effectivePage !== "NOW_PLAYING") {
    return buildHiddenGlassesPageSpec();
  }
  if (effectivePage === "AUTH_REQUIRED") {
    return buildAuthRequiredPage(
      getActiveErrorLine(),
      getGlassesFrameSettings(),
      getEffectiveGlassesTextAlignMode(),
      state.language,
    );
  }

  if (effectivePage === "PLAYLISTS") {
    return buildPlaylistOrchestrationPageSpec();
  }

  if (effectivePage === "DEVICES") {
    return buildDevicesOrchestrationPageSpec();
  }

  return buildNowPlayingOrchestrationPageSpec();
}

function updateLegacyImageControlsDebug(page: ReturnType<typeof buildCurrentGlassesPageSpec>): void {
  const effectivePage = resolveEffectiveGlassesPage();
  const compositePlan = page.imagePlans?.find((plan) => plan.renderer === "composite-image") ?? null;
  if (state.imageModeEnabled && compositePlan) {
    const previewDataUrl = compositePlan.payload.dataUrl ?? null;
    const status =
      !bridge
        ? "bridge-unavailable"
        : previewDataUrl
          ? "sending..."
          : "no-image-payload";
    syncImageControlsDebug(status, previewDataUrl);
    return;
  }

  const legacyPlan = page.imagePlans?.find((plan) => plan.renderer === "legacy-controls") ?? null;
  if (state.imageModeEnabled) {
    const previewDataUrl = legacyPlan?.previewDataUrl ?? null;
    let status = state.imageControlsDebugStatus;
    if (!state.uiVisible && effectivePage === "NOW_PLAYING") {
      status = "controls-hidden";
    } else if (!bridge) {
      status = "bridge-unavailable";
    } else if (previewDataUrl) {
      if (
        status === "text-mode" ||
        status === "controls-hidden" ||
        status === "bridge-unavailable" ||
        status === "no-image-payload" ||
        status === ""
      ) {
        status = "sending...";
      }
    } else {
      status = "no-image-payload";
    }

    syncImageControlsDebug(status, previewDataUrl);
  } else {
    syncImageControlsDebug("text-mode", null);
  }
}

function updateImageTitleMarqueeState(page: ReturnType<typeof buildCurrentGlassesPageSpec>): void {
  const titlePlan = page.imagePlans?.find((plan) => plan.rowKind === "title" && plan.renderer === "image-text") ?? null;
  const titleContentKey = getTitleImageLines().join("\n");

  if (!titlePlan || !isTitleImageModeEnabled()) {
    imageTitleUsesMarquee = false;
    imageTitleMarqueeLoopWidthPx = 0;
    imageTitleMarqueeOffsetPx = 0;
    imageTitleTickIntervalMs = MARQUEE_INTERVAL_MS;
    lastImageTitleContentKey = titleContentKey;
    return;
  }

  if (lastImageTitleContentKey !== titleContentKey) {
    imageTitleMarqueeOffsetPx = 0;
    imageTitleTickIntervalMs = MARQUEE_INTERVAL_MS;
  }

  if (titlePlan.usesMarquee) {
    if (!imageTitleUsesMarquee) {
      imageTitleMarqueeOffsetPx = 0;
    }
    imageTitleUsesMarquee = true;
    imageTitleMarqueeLoopWidthPx = Math.max(0, titlePlan.loopWidthPx ?? 0);
  } else {
    imageTitleUsesMarquee = false;
    imageTitleMarqueeLoopWidthPx = 0;
    imageTitleMarqueeOffsetPx = 0;
    imageTitleTickIntervalMs = MARQUEE_INTERVAL_MS;
  }

  lastImageTitleContentKey = titleContentKey;
}

async function renderGlassesPage(force = false): Promise<void> {
  const effectivePage = resolveEffectiveGlassesPage();
  const page = buildCurrentGlassesPageSpec();
  setGlassesRenderStatus("rendering");
  updateLegacyImageControlsDebug(page);
  updateImageTextPreviewDebug(page);
  if (getCurrentImageTextMode() === "off") {
    syncImageTextDebug("text-mode");
  } else if (!bridge) {
    syncImageTextDebug("bridge-unavailable");
  } else {
    syncImageTextDebug("rendering");
  }

  if (!bridge) {
    await initBridge();
    if (!bridge) {
      await delayMs(150);
      await initBridge();
    }
    if (!bridge) {
      setGlassesRenderStatus("bridge-unavailable");
      return;
    }
  }

  const signature = createRenderSignature();
  if (!force && signature === lastRenderSignature) {
    if (state.uiVisible) {
      scheduleAutoHideIfNeeded();
    } else {
      clearAutoHideTimer();
    }
    restartGlassesStatusTicker();
    setGlassesRenderStatus("skip:same-signature");
    return;
  }

  const nextShapeKey = computeContainerShapeKey(page.shapeEntries);
  const nextStructureKey = createPageStructureKey(page);
  const nextRebuildKey = page.rebuildKey;
  const nextNowPlayingTextLayoutKey = effectivePage === "NOW_PLAYING" ? createNowPlayingTextLayoutKey() : "";
  const hasImageContainers = (page.imageObject?.length ?? 0) > 0;
  const isLegacyImageControlsNowPlaying = state.imageModeEnabled && effectivePage === "NOW_PLAYING";

  if (effectivePage !== "NOW_PLAYING" || getCurrentImageTextMode() === "off") {
    clearAllImageTextState();
  }
  if (effectivePage !== "NOW_PLAYING") {
    clearNowPlayingTextUpgradeState();
  }
  if (!state.imageModeEnabled) {
    lastControlsImageRenderSignature = "";
  }

  try {
    let renderSucceeded = false;
    let createdStartupPage = false;
    let renderPath = "unknown";

    if (!state.hasStartupRendered) {
      if (!hasCreatedStartupPage) {
        const startupResult = await awaitStartupCreateResult(buildStartupBootstrapContainer());
        if (startupResult === "call-timeout") {
          setGlassesRenderStatus("startup-timeout");
        } else if (startupResult !== 0) {
          console.warn("createStartUpPageContainer failed", startupResult);
          setGlassesRenderStatus(`startup-failed:${startupResult}`);
          if (isLegacyImageControlsNowPlaying) {
            syncImageControlsDebug(`startup-failed:${startupResult}`, state.imageControlsPreviewDataUrl);
          }
          if (getCurrentImageTextMode() !== "off") {
            syncImageTextRowDebug("title", `startup-failed:${startupResult}`, state.imageTextTitlePreviewDataUrl);
            syncImageTextRowDebug("status", `startup-failed:${startupResult}`, state.imageTextStatusPreviewDataUrl);
            syncImageTextDebug(`startup-failed:${startupResult}`);
          }
        } else {
          hasCreatedStartupPage = true;
          createdStartupPage = true;
          setGlassesRenderStatus("startup-ok,rebuilding...");
          const rebuildResult = await awaitRebuildResult(
            new RebuildPageContainer({
              containerTotalNum: page.containerTotalNum,
              textObject: page.textObject,
              imageObject: page.imageObject,
            }),
          );
          renderSucceeded = rebuildResult === true;
          renderPath = "startup+rebuild";
          if (rebuildResult === "call-timeout") {
            setGlassesRenderStatus("startup-ok,rebuild-timeout");
          } else if (renderSucceeded) {
            state.hasStartupRendered = true;
            if (shouldResetImageTextStateOnStartup) {
              clearAllImageTextState();
              shouldResetImageTextStateOnStartup = false;
            }
          } else {
            setGlassesRenderStatus("startup-ok,rebuild-failed:false");
          }
        }
      } else {
        const rebuildResult = await awaitRebuildResult(
          new RebuildPageContainer({
            containerTotalNum: page.containerTotalNum,
            textObject: page.textObject,
            imageObject: page.imageObject,
          }),
        );
        renderSucceeded = rebuildResult === true;
        renderPath = "rebuild-after-startup";
        if (rebuildResult === "call-timeout") {
          setGlassesRenderStatus("rebuild-timeout");
        } else if (renderSucceeded) {
          state.hasStartupRendered = true;
        }
      }
    } else {
      const structureChanged = nextStructureKey !== lastPageStructureKey;
      const shouldRebuild = structureChanged || nextRebuildKey !== lastPageRebuildKey;
      const canApplyNowPlayingTextUpgrades =
        effectivePage === "NOW_PLAYING" &&
        state.uiVisible &&
        !isFullImageDisplayMode() &&
        !structureChanged &&
        nextRebuildKey !== lastPageRebuildKey &&
        nextNowPlayingTextLayoutKey === lastNowPlayingTextLayoutKey;

      if (canApplyNowPlayingTextUpgrades) {
        await applyNowPlayingTextUpgrades(page);
        renderSucceeded = true;
        renderPath = "text-upgrade";
      } else if (shouldRebuild) {
        const rebuildResult = await awaitRebuildResult(
          new RebuildPageContainer({
            containerTotalNum: page.containerTotalNum,
            textObject: page.textObject,
            imageObject: page.imageObject,
          }),
        );
        renderSucceeded = rebuildResult === true;
        renderPath = "rebuild";
        if (rebuildResult === "call-timeout") {
          setGlassesRenderStatus("rebuild-timeout");
        }
      } else {
        renderSucceeded = true;
        renderPath = "noop";
      }

      if (!renderSucceeded && isLegacyImageControlsNowPlaying) {
        syncImageControlsDebug("rebuild-failed", state.imageControlsPreviewDataUrl);
      }
      if (!renderSucceeded && getCurrentImageTextMode() !== "off") {
        syncImageTextDebug("rebuild-failed");
      }
      if (!renderSucceeded) {
        setGlassesRenderStatus("rebuild-failed:false");
      }
    }

    if (!renderSucceeded) {
      return;
    }
    setGlassesRenderStatus(`ok:${renderPath}`);

    lastRenderSignature = signature;
    lastShapeKey = nextShapeKey;
    lastPageStructureKey = nextStructureKey;
    lastNowPlayingTextLayoutKey = nextNowPlayingTextLayoutKey;
    lastPageRebuildKey = nextRebuildKey;
    lastPageHasImageContainers = hasImageContainers;

    syncNowPlayingTextContainerIds(page);
    updateImageTitleMarqueeState(page);

    if (createdStartupPage && (page.imagePlans?.length ?? 0) > 0) {
      await delayMs(STARTUP_IMAGE_PLAN_SETTLE_MS);
    }

    for (const plan of page.imagePlans ?? []) {
      if (plan.renderer === "legacy-controls" || plan.renderer === "composite-image") {
        if (plan.renderer === "legacy-controls") {
          const nextControlsSignature = createControlsImageRenderSignature();
          if (nextControlsSignature === lastControlsImageRenderSignature) {
            syncImageControlsDebug("success", plan.previewDataUrl ?? state.imageControlsPreviewDataUrl);
            continue;
          }
          queueControlsImageUpdate(signature, nextControlsSignature, plan.update, plan.previewDataUrl ?? null);
          continue;
        }

        const imageUpdateStatus = await pushGlassesImageUpdate(signature, plan.update);
        if (plan.renderer === "composite-image") {
          let compositeStatus = "skipped";
          if (imageUpdateStatus === "success") {
            compositeStatus = "success";
          } else if (imageUpdateStatus === "failed") {
            compositeStatus = state.imageControlsDebugStatus;
          }

          syncImageTextRowDebug("title", compositeStatus, plan.payload.dataUrl);
          syncImageTextRowDebug("status", compositeStatus, plan.payload.dataUrl);
        }
        continue;
      }

      queueImageRowPlan(plan);
    }
    if (isAlbumArtModeActive() && state.uiVisible) {
      const shouldForceAlbumArtRefresh =
        renderPath === "startup+rebuild" || renderPath === "rebuild-after-startup" || renderPath === "rebuild";
      queueAlbumArtImageUpdate(shouldForceAlbumArtRefresh);
    } else {
      lastAlbumArtSongKey = "";
      pendingAlbumArtImageUpdate = null;
      albumArtImageUpdateInFlight = false;
    }
    if (effectivePage === "NOW_PLAYING") {
      restartMarquee();
    } else {
      clearMarqueeTimer();
    }
    if (state.uiVisible) {
      scheduleAutoHideIfNeeded();
    } else {
      clearAutoHideTimer();
    }
    restartGlassesStatusTicker();
    if (effectivePage === "NOW_PLAYING") {
      scheduleGlassesStatusTickerRecovery();
    } else {
      clearGlassesStatusRecoveryTimer();
    }
  } catch (error) {
    console.error("Failed to render glasses page", error);
    setGlassesRenderStatus(`exception:${error instanceof Error ? error.message : String(error)}`);
  }
}

function applyPlaybackTrackChange(nextPlayback: PlaybackState): void {
  const previousTrack = currentTrackId();
  const nextTrack = nextPlayback?.trackId ?? "";
  if (previousTrack !== nextTrack) {
    state.marqueeOffset = 0;
    imageTitleMarqueeOffsetPx = 0;
    imageTitleMarqueeLoopWidthPx = 0;
    imageTitleUsesMarquee = false;
    lastImageTitleContentKey = "";
    if (isTitleImageModeEnabled()) {
      clearImageRowRenderState("title");
    }
  }

  state.playback = nextPlayback;
  lastPlaybackSnapshotAt = Date.now();
}

function applyError(code: SpotifyErrorCode): void {
  state.lastError = {
    code,
    message: getErrorMessage(code),
  };
}

function clearError(): void {
  state.lastError = null;
}

function setPhoneBanner(message: string | null, kind: PhoneBannerKind = null): void {
  state.phoneBanner = message;
  state.phoneBannerKind = message ? kind : null;
}

function clearPlaybackControlBanner(): void {
  if (state.phoneBannerKind === "playback-control-error") {
    setPhoneBanner(null);
  }
}

async function refreshPlaybackState(forceRender = false): Promise<RefreshOutcome> {
  const requestStartedAt = Date.now();
  const effectivePage = resolveEffectiveGlassesPage();
  const result = await getPlaybackState();

  if (result.ok) {
    const shouldIgnoreStalePoll =
      requestStartedAt < lastControlActionAt && Date.now() - lastControlActionAt <= CONTROL_STALE_POLL_GUARD_MS;
    if (shouldIgnoreStalePoll) {
      return {
        continuePolling: true,
        nextDelayMs: Math.min(CONTROL_REFRESH_DELAY_MS, computeBasePollDelay()),
      };
    }

    clearError();
    clearPlaybackControlBanner();
    if (state.phonePanel === "B") {
      state.panelBProbe = "ok";
    }
    state.page = "NOW_PLAYING";
    applyPlaybackTrackChange(result.playback);
    if (effectivePage === "NOW_PLAYING") {
      await renderGlassesPage(forceRender);
      scheduleGlassesStatusTickerRecovery();
    } else if (effectivePage === "PLAYLISTS") {
      await renderGlassesPage(forceRender);
    }
    renderPhoneUi(false);

    return {
      continuePolling: true,
      nextDelayMs: computeBasePollDelay(),
    };
  }

  applyError(result.error);

  if (state.phonePanel === "B") {
    if (result.error === "PREMIUM_REQUIRED") {
      state.panelBProbe = "premium_required";
    } else if (result.error === "NO_ACTIVE_DEVICE") {
      state.panelBProbe = "ok";
    }
  }

  if (result.error === "AUTH_REQUIRED" || result.error === "AUTH_EXPIRED") {
    state.page = "AUTH_REQUIRED";
    state.playback = null;
    state.marqueeOffset = 0;
    if (effectivePage !== "PLAYLISTS" && effectivePage !== "DEVICES") {
      await renderGlassesPage(forceRender);
    }
    renderPhoneUi(false);

    return {
      continuePolling: false,
    };
  }

  if (result.error === "NO_ACTIVE_DEVICE" || result.error === "PREMIUM_REQUIRED") {
    state.playback = null;
  }

  state.page = "NOW_PLAYING";
  if (effectivePage === "NOW_PLAYING") {
    await renderGlassesPage(forceRender);
    scheduleGlassesStatusTickerRecovery();
  }
  renderPhoneUi(false);

  return {
    continuePolling: true,
    nextDelayMs: result.error === "RATE_LIMITED" ? result.retryAfterMs ?? POLL_ERROR_MS : POLL_ERROR_MS,
  };
}

async function pollTick(): Promise<void> {
  if (!shouldPollInCurrentState()) {
    pendingImmediateRefreshAfterPoll = false;
    clearPollTimer();
    return;
  }

  if (pollInFlight) {
    schedulePoll(pendingImmediateRefreshAfterPoll ? CONTROL_REFRESH_DELAY_MS : computeBasePollDelay());
    return;
  }

  pollInFlight = true;
  const outcome = await refreshPlaybackState(false);
  pollInFlight = false;

  if (!outcome.continuePolling || !shouldPollInCurrentState()) {
    pendingImmediateRefreshAfterPoll = false;
    clearPollTimer();
    return;
  }

  if (pendingImmediateRefreshAfterPoll) {
    pendingImmediateRefreshAfterPoll = false;
    schedulePoll(Math.min(CONTROL_REFRESH_DELAY_MS, outcome.nextDelayMs ?? computeBasePollDelay()));
    return;
  }

  schedulePoll(outcome.nextDelayMs ?? computeBasePollDelay());
}

function kickImmediateRefresh(): void {
  if (!shouldPollInCurrentState()) {
    clearPollTimer();
    pendingImmediateRefreshAfterPoll = false;
    return;
  }

  if (pollInFlight) {
    pendingImmediateRefreshAfterPoll = true;
    return;
  }
  schedulePoll(CONTROL_REFRESH_DELAY_MS);
}

async function forceManualRefresh(): Promise<void> {
  if (manualRefreshInFlight) {
    return;
  }

  manualRefreshInFlight = true;
  clearPollTimer();
  try {
    // The backend auth flow can complete in a different browser container and return later.
    // Force a same-origin state pull first so manual refresh can recover the local token bundle.
    await refreshSessionFromLocalServer(true);

    if (resolveEffectiveGlassesPage() === "PLAYLISTS") {
      await refreshPlaylistEntries(true);
      if (hasTokenBundle()) {
        kickImmediateRefresh();
      }
      return;
    }

    if (resolveEffectiveGlassesPage() === "DEVICES") {
      await refreshDeviceEntries(true);
      if (hasTokenBundle()) {
        kickImmediateRefresh();
      }
      return;
    }

    if (!shouldPollInCurrentState()) {
      await renderGlassesPage(true);
      return;
    }

    let waitRounds = 0;
    while (pollInFlight && waitRounds < 20) {
      // Wait for in-flight polling to settle before manual refresh.
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      waitRounds += 1;
    }

    if (pollInFlight) {
      // Do not start a second playback refresh while the regular poll is still in flight.
      pendingImmediateRefreshAfterPoll = true;
      return;
    }

    pollInFlight = true;
    const outcome = await refreshPlaybackState(true);
    pollInFlight = false;

    if (outcome.continuePolling && shouldPollInCurrentState()) {
      schedulePoll(outcome.nextDelayMs ?? computeBasePollDelay());
    }
  } finally {
    manualRefreshInFlight = false;
    renderPhoneUi(false);
  }
}

function getPanelBStatusMessage(text: (typeof PHONE_TEXT)[LanguageCode]): string {
  if (state.panelBProbe === "checking") {
    return text.panelBChecking;
  }

  if (state.panelBProbe === "premium_required") {
    return text.panelBPremiumFailed;
  }

  return "";
}

function formatRateLimitCountdown(text: (typeof PHONE_TEXT)[LanguageCode]): string {
  const remainingMs = getRateLimitRemainingMs();
  if (remainingMs <= 0) {
    return text.devRateLimitNone;
  }

  const totalSeconds = Math.ceil(remainingMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getRepeatIcon(): "repeat" | "repeat-track" {
  const mode = state.playback?.repeatMode ?? "off";
  if (mode === "track") {
    return "repeat-track";
  }
  return "repeat";
}

function hasControllablePlaybackTarget(): boolean {
  return state.playback !== null;
}

function applyNoActivePlaybackControlState(): void {
  applyError("NO_ACTIVE_DEVICE");
  setPhoneBanner(PHONE_TEXT[state.language].panelBOk, "playback-control-error");
}

function requiresExistingPlayback(action: ControlAction): boolean {
  return action !== "toggle";
}

async function runPhoneRemoteControl(action: ControlAction): Promise<void> {
  if (!hasTokenBundle()) {
    await refreshSessionFromLocalServer(true);
    renderPhoneUi(false);
  }

  if (!hasTokenBundle()) {
    setPhoneBanner(PHONE_TEXT[state.language].statusNotConnected);
    updatePhoneStatus();
    return;
  }

  if (requiresExistingPlayback(action) && !hasControllablePlaybackTarget()) {
    applyNoActivePlaybackControlState();
    renderPhoneUi(false);
    if (isEffectiveNowPlayingPage()) {
      void renderGlassesPage(false);
    }
    return;
  }

  if (controlInFlight || Date.now() < controlLockedUntil) {
    return;
  }

  const playbackBefore = state.playback;
  controlInFlight = true;
  controlLockedUntil = Date.now() + CONTROL_LOCK_MS;
  lastControlActionAt = Date.now();
  const optimisticSnapshot = beginOptimisticControl(action);
  setPhoneBanner(null);
  renderPhoneUi(false);
  if (optimisticSnapshot && isEffectiveNowPlayingPage()) {
    void renderGlassesPage(false);
  }

  try {
    let result: {
      ok: boolean;
      error?: SpotifyErrorCode;
      retryAfterMs?: number;
      message?: string;
    };

    switch (action) {
      case "prev":
        result = await previousTrack();
        break;
      case "toggle":
        result = await togglePlayPause(playbackBefore);
        break;
      case "next":
        result = await nextTrack();
        break;
      case "shuffle":
        result = await setShuffle(!(playbackBefore?.shuffleEnabled ?? false));
        break;
      case "repeat": {
        const nextRepeatMode = getNextRepeatMode(playbackBefore?.repeatMode ?? "off");
        result = await setRepeat(nextRepeatMode);
        break;
      }
    }

    if (!result.ok && result.error) {
      restoreOptimisticControl(optimisticSnapshot);
      applyError(result.error);
      if (result.error === "PREMIUM_REQUIRED") {
        state.panelBProbe = "premium_required";
      }
      setPhoneBanner(result.message || getErrorMessage(result.error), "playback-control-error");
      if (isEffectiveNowPlayingPage()) {
        void renderGlassesPage(false);
      }
    } else {
      setPhoneBanner(null);
      if (state.panelBProbe !== "premium_required") {
        state.panelBProbe = "ok";
      }
      if (isEffectiveNowPlayingPage()) {
        void renderGlassesPage(false);
      }
      renderPhoneUi(false);
    }
  } finally {
    controlInFlight = false;
    controlLockedUntil = Date.now() + CONTROL_LOCK_MS;
    kickImmediateRefresh();
    renderPhoneUi(false);
  }
}

async function probePanelBConnection(): Promise<void> {
  if (panelBProbeInFlight || state.phonePanel !== "B" || pollInFlight || manualRefreshInFlight) {
    return;
  }

  if (!hasTokenBundle()) {
    state.panelBProbe = "idle";
    renderPhoneUi(false);
    return;
  }

  panelBProbeInFlight = true;
  state.panelBProbe = "checking";
  renderPhoneUi(false);

  try {
    const result = await getPlaybackState();

    if (!result.ok && result.error === "PREMIUM_REQUIRED") {
      state.panelBProbe = "premium_required";
    } else if (result.ok || (!result.ok && result.error === "NO_ACTIVE_DEVICE")) {
      state.panelBProbe = "ok";
    } else {
      state.panelBProbe = "idle";
    }
  } finally {
    panelBProbeInFlight = false;
    if (state.phonePanel === "B") {
      renderPhoneUi(false);
    }
  }
}

function getBaseBuildVersion(): string {
  const baseVersion = String(__APP_VERSION__ || "").trim();
  if (baseVersion) {
    return baseVersion;
  }

  return __BUILD_VERSION__.split("_")[0] || __BUILD_VERSION__ || "0.0.0";
}

function getSettingsBuildVersionText(): string {
  return state.developerMode ? __BUILD_VERSION__ : getBaseBuildVersion();
}

function getSpotifyConnectionStatusText(
  text: (typeof PHONE_TEXT)[LanguageCode],
  effectiveConfig = getEffectiveConfigState(),
): string {
  if (hasTokenBundle() && !effectiveConfig.hasMismatchWithAuthorizedSession) {
    return text.spotifyStatusConnected;
  }
  if (hasTokenBundle()) {
    return text.spotifyStatusLoggedIn;
  }
  if (effectiveConfig.spotifyClientId) {
    return text.spotifyStatusNotConnected;
  }
  return text.spotifyStatusNotLoggedIn;
}

function getServerConnectionStatusText(
  text: (typeof PHONE_TEXT)[LanguageCode],
  effectiveConfig = getEffectiveConfigState(),
): string {
  return effectiveConfig.source !== "missing" && !!effectiveConfig.serviceOrigin
    ? text.statusConnected
    : text.statusNotConnected;
}

function buildPhoneStatusMarkup(): string {
  const text = PHONE_TEXT[state.language];
  const effectiveConfig = getEffectiveConfigState();
  const tokenState = getSpotifyConnectionStatusText(text, effectiveConfig);
  const sourceState =
    effectiveConfig.source === "server"
      ? text.statusSourceServer
      : effectiveConfig.source === "runtime"
      ? text.statusSourceRuntime
      : effectiveConfig.source === "env"
        ? text.statusSourceEnv
        : text.statusSourceMissing;
  const clientIdState = effectiveConfig.spotifyClientId
    ? revealClientIdInStatusInfo
      ? effectiveConfig.spotifyClientId
      : text.statusClientConfigured
    : text.statusClientMissing;
  const versionValue = getSettingsBuildVersionText();
  const renderInfoRow = (rowKey: string, label: string, value: string, interactive = false): string => `
    <div id="phone-status-row-${rowKey}" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:8px 0;border-top:${rowKey === "version" ? "none" : "1px solid #e5e7eb"};${interactive ? "cursor:pointer;" : ""}">
      <div style="min-width:0;color:#374151;font-size:13px;font-weight:600;">${escapeHtml(label)}</div>
      <div style="font-size:13px;color:#111827;text-align:right;word-break:break-all;">${escapeHtml(value)}</div>
    </div>`;

  return `
    <details style="margin:0 0 10px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:0 12px;" open>
      <summary style="padding:10px 0;cursor:pointer;font-weight:700;color:#111827;">${escapeHtml(text.settingsInfoLabel)}</summary>
      <div style="padding-bottom:4px;">
        ${renderInfoRow("version", text.settingsVersionLabel, versionValue)}
        ${renderInfoRow("connection", text.statusConnectionLabel, tokenState)}
        ${renderInfoRow("client", text.statusClientLabel, clientIdState, effectiveConfig.spotifyClientId.length > 0)}
        ${renderInfoRow("runtime", text.statusRuntimeLabel, sourceState)}
      </div>
    </details>`;
}

function updatePhoneStatus(): void {
  const statusNode = document.getElementById("phone-status");
  const errorNode = document.getElementById("phone-error");
  const hintNode = document.getElementById("phone-glasses-hint");
  const homeRateLimitNode = document.getElementById("home-rate-limit-inline");
  const text = PHONE_TEXT[state.language];

  if (statusNode) {
    try {
      statusNode.innerHTML = buildPhoneStatusMarkup();
      document.getElementById("phone-status-row-client")?.addEventListener("dblclick", () => {
        if (!getEffectiveConfigState().spotifyClientId) {
          return;
        }

        revealClientIdInStatusInfo = !revealClientIdInStatusInfo;
        updatePhoneStatus();
      });
    } catch (error) {
      console.warn("Failed to update phone status", error);
    }
  }

  if (errorNode) {
    errorNode.textContent = state.phoneBanner ?? "";
  }

  if (hintNode) {
    hintNode.textContent = text.glassesRefreshHint;
  }

  if (homeRateLimitNode) {
    homeRateLimitNode.textContent = `${text.devRateLimitLabel}: ${formatRateLimitCountdown(text)}`;
  }
}

function buildPhoneUi(): void {
  const root = document.getElementById("app");
  if (!root) {
    return;
  }
  const text = PHONE_TEXT[state.language];
  const devPageText = DEV_PAGE_TEXT[state.language];
  const effectiveConfig = getEffectiveConfigState();
  const isSpotifyConnected = hasTokenBundle() && !effectiveConfig.hasMismatchWithAuthorizedSession;
  const selfHostDiagnostics = getSelfHostDiagnostics(__BUILD_VERSION__);
  const settingsBuildVersion = getSettingsBuildVersionText();
  const draftOriginWarning = getSelfHostDraftOriginWarning();
  const saveConfigDisabled = !canSaveSelfHostDraft();
  const connectBlocked =
    effectiveConfig.source === "missing" ||
    shouldBlockConnectFromDraft() ||
    effectiveConfig.hasMismatchWithAuthorizedSession;
  const configSourceLabel =
    effectiveConfig.source === "server"
      ? "Server"
      : effectiveConfig.source === "runtime"
        ? "Runtime"
        : effectiveConfig.source === "env"
          ? "Env"
          : "Missing";
  const serverAuthMode = !isClientSpotifyAuthMode();
  const showSelfHostSettings = serverAuthMode || effectiveConfig.source !== "server";
  const connectBlockReason =
    effectiveConfig.hasMismatchWithAuthorizedSession
      ? text.originChangedMessage
      : effectiveConfig.source === "missing"
        ? text.missingConfigMessage
        : draftOriginWarning;
  const embedUrl = getCurrentTrackEmbedUrl();
  const isSettingsView = state.phoneView === "SETTINGS";
  const panelAActive = state.phonePanel === "A";
  const panelBActive = state.phonePanel === "B";
  const panelBStatus = getPanelBStatusMessage(text);
  const trackTitle = escapeHtml(state.playback?.title ?? text.bNoTrack);
  const trackArtist = escapeHtml(state.playback?.artists ?? text.bNoArtist);
  const coverUrl = state.playback?.albumImageUrl ?? "";
  const shuffleActive = state.playback?.shuffleEnabled === true;
  const repeatMode = state.playback?.repeatMode ?? "off";
  const repeatActive = repeatMode !== "off";
  const repeatIcon = getRepeatIcon();
  const headerActionButtonStyle =
    "width:34px;height:34px;border:1px solid #d1d5db;border-radius:9px;background:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;";
  const headerTextButtonStyle =
    "height:34px;border:1px solid #d1d5db;border-radius:9px;background:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0 12px;font-size:13px;";
  const iconButtonBase =
    "width:42px;height:42px;border:1px solid #3a3a3a;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:#121212;padding:0;box-shadow:0 2px 6px rgba(0,0,0,0.28);cursor:pointer;";
  const iconButtonNormal = `${iconButtonBase}`;
  const iconButtonActive = `${iconButtonBase}border-color:#1DB954;box-shadow:0 0 0 1px rgba(29,185,84,0.25),0 4px 12px rgba(29,185,84,0.28);`;
  const settingsRowLeftStyle = "display:flex;flex-direction:column;gap:4px;min-width:0;flex:1;";
  const settingsRowStyle =
    "display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:12px 0;border-bottom:1px solid #e5e7eb;";
  const settingsSelectStyle = "padding:6px 8px;min-width:132px;";
  const settingsNumberStyle = "padding:6px 8px;width:88px;";
  // Use a lightweight indent (roughly one Han character width) so sub-options read as part of the same list.
  const settingsSubPanelStyle = "margin-top:8px;padding-left:1.25em;display:flex;flex-direction:column;gap:10px;width:100%;box-sizing:border-box;";
  const settingsSubRowStyle = "display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;";
  const diagnosticsRow = (label: string, value: string): string => `
          <div style="${settingsSubRowStyle}">
            <div style="${settingsRowLeftStyle}">
              <span style="font-weight:600;font-size:13px;">${label}</span>
            </div>
            <div style="font-size:12px;color:#374151;max-width:56%;text-align:right;word-break:break-all;">${escapeHtml(value)}</div>
          </div>`;
  const pageTitle = isSettingsView ? text.settingsTitle : text.title;
  const renderPlaylistSelectOptions = (selectedPlaylistId: string): string => {
    const placeholder = `<option value="">${escapeHtml(devPageText.settingsPlaylistEmptyOption)}</option>`;
    const liveOptions = state.availablePlaylistOptions
      .map((playlist) => {
        const selectedAttr = playlist.id === selectedPlaylistId ? " selected" : "";
        return `<option value="${escapeHtml(playlist.id)}"${selectedAttr}>${escapeHtml(playlist.name)}</option>`;
      })
      .join("");
    return `${placeholder}${liveOptions}`;
  };
  const likedSongsFixedRow = `
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                    <span style="font-size:12px;color:#6b7280;">1.</span>
                    <div style="display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;">
                      <div style="padding:6px 8px;border:1px solid #d1d5db;border-radius:8px;background:#f9fafb;font-size:13px;color:#111827;">${escapeHtml(LIKED_SONGS_ENTRY.name)}</div>
                      <div style="font-size:11px;color:#6b7280;">${escapeHtml(devPageText.settingsPlaylistLikedSongsNote)}</div>
                    </div>
                    <div style="font-size:12px;color:#6b7280;min-width:28px;text-align:right;">${escapeHtml(devPageText.settingsPlaylistSlotFixedLabel)}</div>
                  </div>`;
  const playlistSlotRows = state.selectedPlaylistSlotIds
    .map(
      (playlistId, index) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <span style="font-size:12px;color:#6b7280;">${index + 2}.</span>
                    <select data-playlist-slot-index="${index}" style="${settingsSelectStyle};width:120px;min-width:120px;max-width:120px;">
                      ${renderPlaylistSelectOptions(playlistId)}
                    </select>
                    <button
                      type="button"
                      data-remove-playlist-slot-index="${index}"
                      title="${escapeHtml(devPageText.settingsPlaylistRemoveButton)}"
                      aria-label="${escapeHtml(devPageText.settingsPlaylistRemoveButton)}"
                      style="width:28px;height:28px;border:1px solid #dc2626;border-radius:999px;background:#fff;color:#dc2626;font-weight:700;cursor:pointer;"
                    >${escapeHtml(devPageText.settingsPlaylistRemoveButton)}</button>
                  </div>`,
    )
    .join("");
  const playlistAddButtonMarkup =
    state.selectedPlaylistSlotIds.length < MAX_ADDED_PLAYLIST_SLOTS
      ? `
                  <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;">
                    <button
                      id="settings-add-playlist-slot"
                      type="button"
                      title="${escapeHtml(devPageText.settingsPlaylistAddButton)}"
                      aria-label="${escapeHtml(devPageText.settingsPlaylistAddButton)}"
                      style="width:28px;height:28px;border:1px solid #16a34a;border-radius:999px;background:#fff;color:#16a34a;font-weight:700;cursor:pointer;"
                    >${escapeHtml(devPageText.settingsPlaylistAddButton)}</button>
                  </div>`
      : "";
  const renderPreviewRow = (label: string, status: string, previewDataUrl: string | null, alt: string): string => `
                <div style="${settingsSubRowStyle};margin-top:10px;">
                  <div style="font-size:12px;color:#6b7280;min-width:0;flex:1;">
                    ${label} 【${text.settingsImageControlsStatusLabel}: ${escapeHtml(status)}】
                  </div>
                  ${
                    previewDataUrl
                      ? `<img
                           src="${escapeHtml(previewDataUrl)}"
                           alt="${alt}"
                           style="display:block;width:180px;height:40px;border:1px solid #d1d5db;border-radius:6px;background:#111;object-fit:contain;image-rendering:pixelated;flex:0 0 auto;"
                         />`
                      : `<div style="display:flex;width:180px;height:40px;border:1px dashed #d1d5db;border-radius:6px;background:#111;color:#9ca3af;align-items:center;justify-content:center;font-size:11px;flex:0 0 auto;">PNG</div>`
                  }
                </div>`;
  const selfHostConfigActionButtons = isClientSpotifyAuthMode()
    ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="self-host-save-config" type="button" style="padding:8px 12px;" ${saveConfigDisabled ? "disabled" : ""}>Save Config</button>
              <button id="self-host-clear-config" type="button" style="padding:8px 12px;">Clear Config</button>
            </div>`
    : `
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="self-host-save-server-origin" type="button" style="padding:8px 12px;">${escapeHtml(text.serverOriginSaveButton)}</button>
            </div>`;
  const operationGuideMarkup = `
      <section style="margin:10px 0 12px;padding:10px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
        <div style="display:flex;flex-wrap:wrap;gap:10px 18px;align-items:flex-start;">
          <div style="min-width:170px;flex:1;">
            <div style="font-weight:700;margin-bottom:4px;">${escapeHtml(text.operationGuideLabel)}</div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:#374151;">
              <div>${escapeHtml(text.operationClick)}</div>
              <div>${escapeHtml(text.operationSwipe)}</div>
              <div>${escapeHtml(text.operationDoubleClick)}</div>
            </div>
          </div>
          <div style="min-width:220px;flex:1.2;">
            <div style="font-weight:700;margin-bottom:4px;">${escapeHtml(text.iconGuideLabel)}</div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:#374151;">
              <div style="display:flex;flex-wrap:wrap;gap:6px 18px;">
                <span>${escapeHtml(text.iconRepeatOff)}</span>
                <span>${escapeHtml(text.iconRepeatTrack)}</span>
                <span>${escapeHtml(text.iconRepeatContext)}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px 18px;">
                <span>${escapeHtml(text.iconShuffleOff)}</span>
                <span>${escapeHtml(text.iconShuffleOn)}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px 18px;">
                <span>${escapeHtml(text.iconHide)}</span>
                <span>${escapeHtml(text.iconDevices)}</span>
                <span>${escapeHtml(text.iconPlaylists)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>`;
  const connectionStatusRowStyle =
    "display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14px;";
  const connectionButtonRowStyle = "display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 10px;";
  const homeConnectionMarkup = `
      <section style="margin: 0 0 12px; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
        <div style="${connectionStatusRowStyle}">
          <span style="font-weight:700;color:#111827;">${escapeHtml(text.spotifyConnectionStatusLabel)}</span>
          <span style="color:#374151;">${escapeHtml(getSpotifyConnectionStatusText(text, effectiveConfig))}</span>
        </div>
        <div style="${connectionButtonRowStyle}">
          <button id="login-spotify" style="padding: 8px 12px;">${text.loginButton}</button>
          <button id="connect-spotify" style="padding: 8px 12px;" ${connectBlocked ? "disabled" : ""}>${text.connectButton}</button>
        </div>
        <div style="${connectionStatusRowStyle}">
          <span style="font-weight:700;color:#111827;">${escapeHtml(text.serverConnectionStatusLabel)}</span>
          <span style="color:#374151;">${escapeHtml(getServerConnectionStatusText(text, effectiveConfig))}</span>
        </div>
        <div style="${connectionButtonRowStyle};margin-bottom:0;">
          <button id="server-domain" style="padding: 8px 12px;">${escapeHtml(text.serverDomainButton)}</button>
        </div>
      </section>`;
  const homeContent = panelAActive
    ? `
      <section style="margin-top: 12px; border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
        <div style="display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:center;margin-bottom:10px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;">
          ${
            coverUrl
              ? `<img src="${escapeHtml(coverUrl)}" alt="album cover" style="width:64px;height:64px;border-radius:6px;object-fit:cover;border:1px solid #d1d5db;" />`
              : `<div style="width:64px;height:64px;border-radius:6px;border:1px solid #d1d5db;display:flex;align-items:center;justify-content:center;color:#6b7280;background:#fff;">♪</div>`
          }
          <div style="min-width:0;">
            <p style="margin:0 0 4px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${trackTitle}</p>
            <p style="margin:0;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${trackArtist}</p>
          </div>
        </div>
        ${
          embedUrl
            ? `<iframe
                title="Spotify Embed"
                src="${embedUrl}"
                width="100%"
                height="152"
                frameborder="0"
                allowfullscreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              ></iframe>`
            : `<p style="margin: 0; color: #666;">${text.embedEmpty}</p>`
        }
      </section>`
    : `
      <section style="margin-top: 12px; border: 1px solid #1f2937; border-radius: 12px; padding: 12px; background:linear-gradient(135deg,#101418 0%,#1e293b 100%); color:#fff;">
        <div style="display: grid; grid-template-columns: 88px 1fr; gap: 10px; align-items: center;">
          ${
            coverUrl
              ? `<img src="${escapeHtml(coverUrl)}" alt="cover" style="width: 88px; height: 88px; border-radius: 8px; object-fit: cover; border: 1px solid #ccc;" />`
              : `<div style="width: 88px; height: 88px; border-radius: 8px; border: 1px solid #334155; display:flex;align-items:center;justify-content:center;color:#d1d5db;">♪</div>`
          }
          <div>
            <p style="margin: 0 0 6px; font-weight: 600;">${trackTitle}</p>
            <p style="margin: 0; color: #cbd5e1;">${trackArtist}</p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
          <button id="b-prev" title="${text.btnPrev}" style="${iconButtonNormal}">${renderControlIcon("prev", false)}</button>
          <button id="b-playpause" title="${text.btnPlayPause}" style="${iconButtonNormal}">${renderControlIcon(state.playback?.isPlaying ? "pause" : "play", false)}</button>
          <button id="b-next" title="${text.btnNext}" style="${iconButtonNormal}">${renderControlIcon("next", false)}</button>
          <button id="b-shuffle" title="${text.btnShuffle}" style="${shuffleActive ? iconButtonActive : iconButtonNormal}">${renderControlIcon("shuffle", shuffleActive)}</button>
          <button id="b-repeat" title="${text.btnRepeat}" style="${repeatActive ? iconButtonActive : iconButtonNormal}">${renderControlIcon(repeatIcon, repeatActive)}</button>
        </div>
        ${panelBStatus ? `<p style="margin: 10px 0 0; color: ${state.panelBProbe === "premium_required" ? "#fca5a5" : "#d1d5db"};">${panelBStatus}</p>` : ""}
      </section>`;
	  const selfHostSettingsSection = showSelfHostSettings
	    ? `
	      <section style="margin-top: 12px; border: 1px solid #ddd; border-radius: 10px; padding: 14px; background:#fff;">
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;flex-direction:column;gap:10px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700;">Configuration</div>
            ${state.phoneBanner ? `<p style="margin:0;color:#b42318;">${escapeHtml(state.phoneBanner)}</p>` : ""}
            ${draftOriginWarning ? `<p style="margin:0;color:#b42318;font-size:12px;">${escapeHtml(draftOriginWarning)}</p>` : ""}
            <div style="${settingsSubRowStyle}">
              <div style="${settingsRowLeftStyle}">
                <span style="font-weight:600;font-size:13px;">Spotify Client ID</span>
              </div>
              <input id="self-host-client-id" type="text" value="${escapeHtml(state.selfHostClientIdInput)}" style="padding:6px 8px;min-width:220px;" ${serverAuthMode ? "readonly" : ""} />
            </div>
            ${
              serverAuthMode
                ? ""
                : `<div style="${settingsSubRowStyle}">
                    <div style="${settingsRowLeftStyle}">
                      <span style="font-weight:600;font-size:13px;">Custom Origin</span>
                    </div>
                    <input id="self-host-custom-origin" type="checkbox" ${state.selfHostMode === "custom-origin" ? "checked" : ""} />
                  </div>`
            }
            <div style="${settingsSubRowStyle}">
              <div style="${settingsRowLeftStyle}">
                <span style="font-weight:600;font-size:13px;">${escapeHtml(serverAuthMode ? text.serverOriginLabel : "Service Origin")}</span>
              </div>
              <input
                id="self-host-service-origin"
                type="text"
                value="${escapeHtml(state.selfHostServiceOriginInput)}"
                placeholder="your-device.your-tailnet.ts.net"
                style="padding:6px 8px;min-width:220px;"
                ${!serverAuthMode && state.selfHostMode === "same-origin" ? "readonly" : ""}
              />
            </div>
            <div style="${settingsSubRowStyle}">
              <div style="${settingsRowLeftStyle}">
                <span style="font-weight:600;font-size:13px;">Current config source</span>
              </div>
              <div style="font-size:12px;color:#374151;">${configSourceLabel}</div>
            </div>
            <div style="${settingsSubRowStyle}">
              <div style="${settingsRowLeftStyle}">
                <span style="font-weight:600;font-size:13px;">Effective Redirect URI</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;max-width:56%;">
                <code style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(
                  effectiveConfig.redirectUri,
                )}</code>
                <button id="self-host-copy-redirect" type="button" style="padding:6px 8px;">Copy</button>
              </div>
            </div>
            ${
              state.selfHostCopyFeedback
                ? `<p style="margin:0;font-size:12px;color:#166534;">${escapeHtml(state.selfHostCopyFeedback)}</p>`
                : ""
            }
            ${selfHostConfigActionButtons}
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700;">Diagnostics</div>
            ${diagnosticsRow("Build version", settingsBuildVersion)}
            ${diagnosticsRow("Current page origin", selfHostDiagnostics.currentPageOrigin)}
            ${diagnosticsRow("Config source", selfHostDiagnostics.configSource)}
            ${diagnosticsRow("Effective serviceOrigin", selfHostDiagnostics.effectiveServiceOrigin)}
            ${diagnosticsRow("Effective redirectUri", selfHostDiagnostics.effectiveRedirectUri)}
            ${diagnosticsRow("Authorized Client ID", selfHostDiagnostics.authorizedClientIdSummary)}
            ${diagnosticsRow("Authorized Origin", selfHostDiagnostics.authorizedServiceOriginSummary)}
            ${diagnosticsRow("clientNow", selfHostDiagnostics.clientNow)}
            ${diagnosticsRow("tokenExpiresAt", selfHostDiagnostics.tokenExpiresAt)}
            ${diagnosticsRow("Last error", selfHostDiagnostics.lastErrorCode === "none" ? "none" : `${selfHostDiagnostics.lastErrorCode}${selfHostDiagnostics.lastErrorMessage ? ` | ${getLocalizedAuthErrorMessage({ code: selfHostDiagnostics.lastErrorCode, message: selfHostDiagnostics.lastErrorMessage })}` : ""}`)}
          </div>
          <p style="margin:0;font-size:12px;color:#6b7280;">Only Spotify Client ID and Service Origin are stored locally. Never enter a Client Secret in this app.</p>
        </div>
      </section>
	    `
	    : "";
	  const webViewConfigSettingsSection = `
	      <section style="margin-top: 12px; border: 1px solid #ddd; border-radius: 10px; padding: 14px; background:#fff;">
	        <div style="display:flex;flex-direction:column;gap:8px;">
	          <div style="font-weight:700;">${escapeHtml(text.settingsConfigGroupLabel)}</div>
	          <p style="margin:0;font-size:12px;color:#6b7280;">${escapeHtml(text.settingsConfigHelp)}</p>
	          <div style="display:flex;gap:8px;flex-wrap:wrap;">
	            <button id="settings-save-server-config" type="button" style="padding:8px 12px;">${escapeHtml(text.settingsConfigSaveServer)}</button>
	            <button id="settings-load-server-config" type="button" style="padding:8px 12px;">${escapeHtml(text.settingsConfigLoadServer)}</button>
	            <button id="settings-export-local-config" type="button" style="padding:8px 12px;">${escapeHtml(text.settingsConfigSaveLocal)}</button>
	            <button id="settings-import-local-config" type="button" style="padding:8px 12px;">${escapeHtml(text.settingsConfigLoadLocal)}</button>
	            <input id="settings-import-local-config-file" type="file" accept="application/json" style="display:none;" />
	          </div>
	        </div>
	      </section>`;
	  const spotifySessionSettingsSection = `
	      <section style="margin-top: 12px; border: 1px solid #ddd; border-radius: 10px; padding: 14px; background:#fff;">
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-weight:700;">${escapeHtml(text.settingsSessionLabel)}</div>
          <p style="margin:0;font-size:12px;color:#6b7280;">${escapeHtml(text.settingsSessionHelp)}</p>
          ${connectBlockReason ? `<p style="margin:0;font-size:12px;color:#b42318;">${escapeHtml(connectBlockReason)}</p>` : ""}
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="settings-clear-session" type="button" style="padding:8px 12px;">${text.clearButton}</button>
          </div>
        </div>
      </section>`;
  const showBorderSettings = true;
  const glassesDisplaySettingsSection = `
        <div style="${settingsRowStyle}">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${text.settingsGlassesDisplayGroupLabel}</span>
            <div style="${settingsSubPanelStyle}">
              <div style="${settingsSubRowStyle};align-items:flex-start;">
                <div style="${settingsRowLeftStyle}">
                  <span style="font-weight:600;font-size:13px;">${text.settingsLayoutModeLabel}</span>
                </div>
                <select id="settings-layout-mode-select" style="${settingsSelectStyle}">
                  <option value="pure-text" ${state.developerGlassesLayoutMode === "pure-text" ? "selected" : ""}>${text.settingsLayoutModePureText}</option>
                  <option value="album-art" ${state.developerGlassesLayoutMode === "album-art" ? "selected" : ""}>${text.settingsLayoutModeAlbumArt}</option>
                </select>
              </div>
              ${
                state.developerGlassesLayoutMode === "album-art"
                  ? `
              <div style="${settingsSubRowStyle}">
                <div style="${settingsRowLeftStyle}">
                  <span style="font-weight:600;font-size:13px;">${text.settingsAlbumArtSizeLabel}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;min-width:180px;">
                  <span style="font-size:12px;color:#6b7280;">${text.settingsAlbumArtSizeSmall}</span>
                  <input
                    id="settings-album-art-size-slider"
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value="${albumArtSizePxToSliderStep(state.albumArtSizePx)}"
                    aria-label="${text.settingsAlbumArtSizeLabel}"
                    style="flex:1;accent-color:#111827;"
                  />
                  <span style="font-size:12px;color:#6b7280;">${text.settingsAlbumArtSizeLarge}</span>
                </div>
              </div>
              <div style="${settingsSubRowStyle}">
                <div style="${settingsRowLeftStyle}">
                  <span style="font-weight:600;font-size:13px;">${text.settingsAlbumArtOpacityLabel}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;min-width:180px;">
                  <span style="font-size:12px;color:#6b7280;">${ALBUM_ART_OPACITY_MIN_PERCENT}</span>
                  <input
                    id="settings-album-art-opacity-slider"
                    type="range"
                    min="${ALBUM_ART_OPACITY_MIN_PERCENT}"
                    max="${ALBUM_ART_OPACITY_MAX_PERCENT}"
                    step="${ALBUM_ART_OPACITY_STEP_PERCENT}"
                    value="${state.albumArtOpacityPercent}"
                    aria-label="${text.settingsAlbumArtOpacityLabel}"
                    style="flex:1;accent-color:#111827;"
                  />
                  <span style="font-size:12px;color:#6b7280;">100</span>
                </div>
              </div>
              <div style="${settingsSubRowStyle};align-items:flex-start;">
                <div style="${settingsRowLeftStyle}">
                  <span style="font-weight:600;font-size:13px;">${text.settingsAlbumArtPreviewLabel}</span>
                  <span style="font-size:12px;color:#6b7280;">${state.albumArtSizePx} x ${state.albumArtSizePx}</span>
                </div>
                <div style="width:96px;height:96px;border:1px solid #d1d5db;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%) 50% / 12px 12px;">
                  ${
                    coverUrl
                      ? `<img src="${escapeHtml(coverUrl)}" alt="album-preview" style="width:100%;height:100%;object-fit:cover;opacity:${Math.max(0, Math.min(100, state.albumArtOpacityPercent)) / 100};" />`
                      : `<div style="font-size:11px;color:#9ca3af;">${text.settingsAlbumArtPreviewEmpty}</div>`
                  }
                </div>
              </div>`
                  : ""
              }
            </div>
          </div>
        </div>`;
  const settingsContent = `
      <section style="margin-top: 12px; border: 1px solid #ddd; border-radius: 10px; padding: 0 14px; background:#fff;">
        <div style="${settingsRowStyle}">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${text.settingsModeLabel}</span>
            <span style="font-size:12px;color:#6b7280;">${text.settingsModeHelp}</span>
          </div>
          <select id="settings-mode-select" style="${settingsSelectStyle}">
            <option value="A" ${panelAActive ? "selected" : ""}>${text.settingsModeEmbed}</option>
            <option value="B" ${panelBActive ? "selected" : ""}>${text.settingsModeRemote}</option>
          </select>
        </div>
        <div style="${settingsRowStyle}">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${text.glassesIconsLabel}</span>
          </div>
          <select id="settings-glasses-icons-select" style="${settingsSelectStyle}">
            <option value="solid" ${state.glassesControlVariant === "solid" ? "selected" : ""}>${text.glassesIconsSolid}</option>
            <option value="open" ${state.glassesControlVariant === "open" ? "selected" : ""}>${text.glassesIconsOpen}</option>
            <option value="ascii" ${state.glassesControlVariant === "ascii" ? "selected" : ""}>${text.glassesIconsAscii}</option>
          </select>
        </div>
        <div style="${settingsRowStyle}">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${text.settingsControlInvertLabel}</span>
            <span style="font-size:12px;color:#6b7280;">${text.settingsControlInvertHelp}</span>
          </div>
          <input id="settings-control-invert" type="checkbox" ${state.glassesControlInvert ? "checked" : ""} />
        </div>
        <div style="${settingsRowStyle};align-items:flex-start;">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${devPageText.settingsPlaylistSlotsLabel}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:160px;">
            ${likedSongsFixedRow}
            ${playlistSlotRows}
            ${playlistAddButtonMarkup}
            ${
              state.availablePlaylistOptions.length === 0
                ? `<div style="font-size:12px;color:#6b7280;text-align:right;">${escapeHtml(devPageText.settingsPlaylistNoOptions)}</div>`
                : ""
            }
          </div>
        </div>
        <div style="${settingsRowStyle}">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${text.settingsProgressStyleLabel}</span>
          </div>
          <select id="settings-progress-style-select" style="${settingsSelectStyle}">
            <option value="eq" ${state.glassesProgressBarStyle === "eq" ? "selected" : ""}>${text.settingsProgressStyleEq}</option>
            <option value="block" ${state.glassesProgressBarStyle === "block" ? "selected" : ""}>${text.settingsProgressStyleBlock}</option>
            <option value="square" ${state.glassesProgressBarStyle === "square" ? "selected" : ""}>${text.settingsProgressStyleSquare}</option>
          </select>
        </div>
        <div style="${settingsRowStyle}">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${text.settingsAutoHideEnabledLabel}</span>
          </div>
          <input id="settings-auto-hide-enabled" type="checkbox" ${state.glassesAutoHideEnabled ? "checked" : ""} />
        </div>
        ${
          state.glassesAutoHideEnabled
            ? `
        <div style="${settingsRowStyle}">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${text.settingsAutoHideSecondsLabel}</span>
          </div>
          <input
            id="settings-auto-hide-seconds"
            type="number"
            min="0"
            max="120"
            step="1"
            value="${state.glassesAutoHideSeconds}"
            style="${settingsNumberStyle}"
          />
        </div>`
            : ""
        }
        ${
          showBorderSettings
            ? `
        <div style="${settingsRowStyle}">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${text.settingsBorderLabel}</span>
            ${
              state.borderEnabled
                ? `
            <div style="${settingsSubPanelStyle}">
              <div style="${settingsSubRowStyle}">
                <div style="${settingsRowLeftStyle}">
                  <span style="font-weight:600;font-size:13px;">${text.settingsBorderRadiusLabel}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;min-width:180px;">
                  ${renderBorderShapeIcon(false)}
                  <input
                    id="settings-border-radius-slider"
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value="${borderRadiusPxToSliderStep(state.borderRadius)}"
                    aria-label="${text.settingsBorderRadiusLabel}"
                    style="flex:1;accent-color:#111827;"
                  />
                  ${renderBorderShapeIcon(true)}
                </div>
              </div>
              ${
                state.developerMode
                  ? `
              <div style="${settingsSubRowStyle};margin-top:10px;">
                <div style="${settingsRowLeftStyle}">
                  <span style="font-weight:600;font-size:13px;">${text.settingsBorderInsetLabel}</span>
                </div>
                <input id="settings-border-inset" type="number" min="0" max="40" step="1" value="${state.borderInsetPx}" style="${settingsNumberStyle}" />
              </div>
              <div style="${settingsSubRowStyle};margin-top:10px;">
                <div style="${settingsRowLeftStyle}">
                  <span style="font-weight:600;font-size:13px;">${text.settingsBorderWidthLabel}</span>
                </div>
                <input id="settings-border-width" type="number" min="0" max="5" step="1" value="${state.borderWidthPx}" style="${settingsNumberStyle}" />
              </div>`
                  : ""
              }
            </div>`
                : ""
            }
          </div>
          <input id="settings-border-enabled" type="checkbox" ${state.borderEnabled ? "checked" : ""} />
        </div>`
            : ""
        }
        ${glassesDisplaySettingsSection}
        <div style="${settingsRowStyle}">
          <div style="${settingsRowLeftStyle}">
            <span style="font-weight:600;">${text.settingsDevModeLabel}</span>
            ${
              state.developerMode
                ? `
            <div style="${settingsSubPanelStyle}">
              <div style="${settingsSubRowStyle};align-items:flex-start;">
                <div style="${settingsRowLeftStyle}">
                  <span style="font-weight:600;font-size:13px;">${text.settingsGlassesRenderStatusLabel}</span>
                </div>
                <div style="font-size:12px;color:#6b7280;min-width:160px;text-align:right;word-break:break-all;">${escapeHtml(state.glassesRenderStatus)}</div>
              </div>
            </div>`
                : ""
            }
          </div>
          <input id="settings-developer-mode" type="checkbox" ${state.developerMode ? "checked" : ""} />
	        </div>
	      </section>
	      ${webViewConfigSettingsSection}
	      ${spotifySessionSettingsSection}
	      ${selfHostSettingsSection}`;

	  root.innerHTML = `
	    <main style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; line-height: 1.5;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <h1 style="margin: 0; font-size: 22px;">${pageTitle}</h1>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <select id="language-select" title="${text.languageLabel}" style="padding: 4px 8px;">
            <option value="zh" ${state.language === "zh" ? "selected" : ""}>中文</option>
            <option value="en" ${state.language === "en" ? "selected" : ""}>English</option>
            <option value="ja" ${state.language === "ja" ? "selected" : ""}>日本語</option>
          </select>
          ${
            isSettingsView
              ? `<button id="header-refresh" title="${text.manualRefreshButton}" aria-label="${text.manualRefreshButton}" style="${headerActionButtonStyle}">${renderRefreshIcon()}</button>
                 <button id="back-home" style="${headerTextButtonStyle}">${text.settingsBackButton}</button>`
              : `<button id="header-refresh" title="${text.manualRefreshButton}" aria-label="${text.manualRefreshButton}" style="${headerActionButtonStyle}">${renderRefreshIcon()}</button>
                 <button id="open-settings" title="${text.settingsButton}" aria-label="${text.settingsButton}" style="${headerActionButtonStyle}">${renderSettingsIcon()}</button>`
          }
        </div>
      </div>
      ${isSettingsView ? `<div id="phone-status" style="margin: 0 0 6px;">${buildPhoneStatusMarkup()}</div>` : ""}
      <p id="phone-error" style="margin: 0; color: #b42318;"></p>
      ${!isSettingsView ? homeConnectionMarkup : ""}
      <p id="phone-glasses-hint" style="margin: 6px 0 0; color: #6b7280; font-size: 13px;"></p>
      ${
        isSettingsView
          ? settingsContent
          : `
      <p style="margin: 0 0 12px; color: #444;">${text.tipLogin}</p>
      ${operationGuideMarkup}
      ${isSpotifyConnected ? homeContent : ""}
      <p style="margin: 14px 0 0; color: #9ca3af; font-size: 12px;">${text.trust}</p>
      <p id="home-rate-limit-inline" style="margin: 8px 0 0; color: #6b7280; font-size: 12px;">${text.devRateLimitLabel}: ${formatRateLimitCountdown(text)}</p>`
	      }
	    </main>
	  `;

	  root.oninput = (event) => {
	    if (shouldCacheWebViewSettingsEvent(event)) {
	      schedulePersistWebViewSettingsToBridgeStore();
	    }
	  };
	  root.onchange = (event) => {
	    if (shouldCacheWebViewSettingsEvent(event)) {
	      schedulePersistWebViewSettingsToBridgeStore();
	    }
	  };
	  root.onclick = (event) => {
	    if (shouldCacheWebViewSettingsEvent(event)) {
	      schedulePersistWebViewSettingsToBridgeStore();
	    }
	  };

	  const languageSelect = document.getElementById("language-select") as HTMLSelectElement | null;
  const settingsOpenButton = document.getElementById("open-settings");
  const settingsBackButton = document.getElementById("back-home");
  const settingsModeSelect = document.getElementById("settings-mode-select") as HTMLSelectElement | null;
  const settingsGlassesIconsSelect = document.getElementById("settings-glasses-icons-select") as HTMLSelectElement | null;
  const settingsBorderEnabledCheckbox = document.getElementById("settings-border-enabled") as HTMLInputElement | null;
  const settingsBorderRadiusSlider = document.getElementById("settings-border-radius-slider") as HTMLInputElement | null;
  const settingsDeveloperModeCheckbox = document.getElementById("settings-developer-mode") as HTMLInputElement | null;
  const settingsLayoutModeSelect = document.getElementById("settings-layout-mode-select") as HTMLSelectElement | null;
  const settingsAlbumArtSizeSlider = document.getElementById("settings-album-art-size-slider") as HTMLInputElement | null;
  const settingsAlbumArtOpacitySlider = document.getElementById("settings-album-art-opacity-slider") as HTMLInputElement | null;
  const settingsControlInvertCheckbox = document.getElementById("settings-control-invert") as HTMLInputElement | null;
  const settingsProgressStyleSelect = document.getElementById("settings-progress-style-select") as HTMLSelectElement | null;
  const settingsAutoHideEnabledCheckbox = document.getElementById("settings-auto-hide-enabled") as HTMLInputElement | null;
  const settingsAutoHideSecondsInput = document.getElementById("settings-auto-hide-seconds") as HTMLInputElement | null;
  const settingsAddPlaylistSlotButton = document.getElementById("settings-add-playlist-slot");
  const settingsPlaylistSlotSelects = Array.from(
    document.querySelectorAll<HTMLSelectElement>("[data-playlist-slot-index]"),
  );
  const settingsRemovePlaylistSlotButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-remove-playlist-slot-index]"),
  );
  const settingsBorderInsetInput = document.getElementById("settings-border-inset") as HTMLInputElement | null;
  const settingsBorderWidthInput = document.getElementById("settings-border-width") as HTMLInputElement | null;
  const selfHostClientIdInput = document.getElementById("self-host-client-id") as HTMLInputElement | null;
  const selfHostCustomOriginCheckbox = document.getElementById("self-host-custom-origin") as HTMLInputElement | null;
  const selfHostServiceOriginInput = document.getElementById("self-host-service-origin") as HTMLInputElement | null;
  const selfHostCopyRedirectButton = document.getElementById("self-host-copy-redirect");
	  const selfHostSaveConfigButton = document.getElementById("self-host-save-config");
	  const selfHostClearConfigButton = document.getElementById("self-host-clear-config");
	  const selfHostSaveServerOriginButton = document.getElementById("self-host-save-server-origin");
	  const settingsClearSessionButton = document.getElementById("settings-clear-session");
	  const settingsSaveServerConfigButton = document.getElementById("settings-save-server-config");
	  const settingsLoadServerConfigButton = document.getElementById("settings-load-server-config");
	  const settingsExportLocalConfigButton = document.getElementById("settings-export-local-config");
	  const settingsImportLocalConfigButton = document.getElementById("settings-import-local-config");
	  const settingsImportLocalConfigFileInput = document.getElementById(
	    "settings-import-local-config-file",
	  ) as HTMLInputElement | null;
	  const loginButton = document.getElementById("login-spotify");
  const connectButton = document.getElementById("connect-spotify");
  const serverDomainButton = document.getElementById("server-domain");
  const headerRefreshButton = document.getElementById("header-refresh");
  const panelBPrevButton = document.getElementById("b-prev");
  const panelBPlayPauseButton = document.getElementById("b-playpause");
  const panelBNextButton = document.getElementById("b-next");
  const panelBShuffleButton = document.getElementById("b-shuffle");
  const panelBRepeatButton = document.getElementById("b-repeat");

  languageSelect?.addEventListener("change", () => {
    state.language = normalizeLanguage(languageSelect.value);
    localStorage.setItem(LANGUAGE_KEY, state.language);
    renderPhoneUi(true);
  });

  settingsOpenButton?.addEventListener("click", () => {
    state.phoneView = "SETTINGS";
    renderPhoneUi(true);
    if (hasTokenBundle()) {
      void refreshPlaylistEntries(false);
    }
  });

  settingsBackButton?.addEventListener("click", () => {
    state.phoneView = "HOME";
    renderPhoneUi(true);
  });

  settingsGlassesIconsSelect?.addEventListener("change", () => {
    state.glassesControlVariant = normalizeGlassesControlVariant(settingsGlassesIconsSelect.value);
    localStorage.setItem(GLASSES_CONTROL_VARIANT_KEY, state.glassesControlVariant);
    renderPhoneUi(true);
    void renderGlassesPage(false);
  });

  settingsModeSelect?.addEventListener("change", () => {
    state.phonePanel = normalizePhonePanel(settingsModeSelect.value);
    localStorage.setItem(PHONE_PANEL_KEY, state.phonePanel);
    renderPhoneUi(true);
    if (state.phonePanel === "B") {
      void probePanelBConnection();
    }
  });

  settingsBorderEnabledCheckbox?.addEventListener("change", () => {
    state.borderEnabled = settingsBorderEnabledCheckbox.checked;
    localStorage.setItem(BORDER_ENABLED_KEY, String(state.borderEnabled));
    renderPhoneUi(true);
    void renderGlassesPage(false);
  });

  settingsBorderRadiusSlider?.addEventListener("input", () => {
    state.borderRadius = borderRadiusSliderStepToPx(Number(settingsBorderRadiusSlider.value));
    localStorage.setItem(BORDER_RADIUS_KEY, String(state.borderRadius));
    lastPhoneRenderSignature = createPhoneRenderSignature();
    updatePhoneStatus();
    void renderGlassesPage(false);
  });

  settingsDeveloperModeCheckbox?.addEventListener("change", () => {
    state.developerMode = settingsDeveloperModeCheckbox.checked;
    localStorage.setItem(DEVELOPER_MODE_KEY, String(state.developerMode));
    if (!state.developerMode) {
      applyGlassesDisplayMode("text");
      state.developerGlassesPageOverride = "auto";
      localStorage.setItem(DEVELOPER_GLASSES_PAGE_OVERRIDE_KEY, state.developerGlassesPageOverride);
    } else if (hasTokenBundle()) {
      void refreshPlaylistEntries(false);
    }
    renderPhoneUi(true);
    refreshForEffectivePageChange(false);
  });

  settingsLayoutModeSelect?.addEventListener("change", () => {
    state.developerGlassesLayoutMode = normalizeDeveloperGlassesLayoutMode(settingsLayoutModeSelect.value);
    localStorage.setItem(DEVELOPER_GLASSES_LAYOUT_MODE_KEY, state.developerGlassesLayoutMode);
    if (state.developerGlassesLayoutMode !== "album-art") {
      pendingAlbumArtImageUpdate = null;
      albumArtImageUpdateInFlight = false;
    } else {
      lastAlbumArtSongKey = "";
    }
    renderPhoneUi(true);
    void forceReopenGlassesPage();
  });

  settingsAlbumArtSizeSlider?.addEventListener("input", () => {
    const nextSize = clampAlbumArtSizePx(albumArtSizeSliderStepToPx(Number(settingsAlbumArtSizeSlider.value)), state.albumArtSizePx);
    state.albumArtSizePx = nextSize;
    settingsAlbumArtSizeSlider.value = String(albumArtSizePxToSliderStep(nextSize));
    localStorage.setItem(DEVELOPER_ALBUM_ART_SIZE_KEY, String(nextSize));
    lastAlbumArtSongKey = "";
    renderPhoneUi(true);
    void renderGlassesPage(false);
  });

  settingsAlbumArtOpacitySlider?.addEventListener("input", () => {
    const nextOpacity = clampAlbumArtOpacityPercent(
      Number(settingsAlbumArtOpacitySlider.value),
      state.albumArtOpacityPercent,
    );
    state.albumArtOpacityPercent = nextOpacity;
    settingsAlbumArtOpacitySlider.value = String(nextOpacity);
    localStorage.setItem(DEVELOPER_ALBUM_ART_OPACITY_KEY, String(nextOpacity));
    lastAlbumArtSongKey = "";
    renderPhoneUi(true);
    void renderGlassesPage(false);
  });

  settingsControlInvertCheckbox?.addEventListener("change", () => {
    state.glassesControlInvert = settingsControlInvertCheckbox.checked;
    localStorage.setItem(GLASSES_CONTROL_INVERT_KEY, String(state.glassesControlInvert));
    state.playlistScrollInverted = state.glassesControlInvert;
    localStorage.setItem(PLAYLIST_SCROLL_INVERT_KEY, String(state.playlistScrollInverted));
    renderPhoneUi(true);
  });

  settingsProgressStyleSelect?.addEventListener("change", () => {
    state.glassesProgressBarStyle = normalizeProgressBarStyle(settingsProgressStyleSelect.value);
    localStorage.setItem(GLASSES_PROGRESS_BAR_STYLE_KEY, state.glassesProgressBarStyle);
    renderPhoneUi(true);
    void renderGlassesPage(false);
  });

  settingsAutoHideEnabledCheckbox?.addEventListener("change", () => {
    state.glassesAutoHideEnabled = settingsAutoHideEnabledCheckbox.checked;
    localStorage.setItem(GLASSES_AUTO_HIDE_ENABLED_KEY, String(state.glassesAutoHideEnabled));
    if (state.glassesAutoHideEnabled && state.uiVisible && state.glassesAutoHideSeconds > 0) {
      scheduleAutoHideIfNeeded(true);
    } else {
      clearAutoHideTimer();
    }
    renderPhoneUi(true);
  });

  settingsAutoHideSecondsInput?.addEventListener("change", () => {
    const nextSeconds = clampStoredNumber(Number(settingsAutoHideSecondsInput.value), state.glassesAutoHideSeconds, 0, 120);
    state.glassesAutoHideSeconds = nextSeconds;
    settingsAutoHideSecondsInput.value = String(nextSeconds);
    localStorage.setItem(GLASSES_AUTO_HIDE_SECONDS_KEY, String(nextSeconds));
    if (state.glassesAutoHideEnabled && state.uiVisible && nextSeconds > 0) {
      scheduleAutoHideIfNeeded(true);
    } else {
      clearAutoHideTimer();
    }
    renderPhoneUi(true);
  });

  settingsAddPlaylistSlotButton?.addEventListener("click", () => {
    if (state.selectedPlaylistSlotIds.length >= MAX_ADDED_PLAYLIST_SLOTS) {
      return;
    }
    state.selectedPlaylistSlotIds = [...state.selectedPlaylistSlotIds, ""];
    persistSelectedPlaylistSlotIds();
    syncConfiguredPlaylistEntries();
    renderPhoneUi(true);
    if (resolveEffectiveGlassesPage() === "PLAYLISTS") {
      void renderGlassesPage(false);
    }
  });

  settingsPlaylistSlotSelects.forEach((select, index) => {
    select.addEventListener("change", () => {
      const nextValue = normalizeStoredPlaylistSlotId(select.value);
      const nextPlaylistId = nextValue && getAvailablePlaylistOptionById(nextValue) ? nextValue : "";
      state.selectedPlaylistSlotIds[index] = nextPlaylistId;
      persistSelectedPlaylistSlotIds();
      syncConfiguredPlaylistEntries();
      renderPhoneUi(true);
      if (resolveEffectiveGlassesPage() === "PLAYLISTS") {
        void renderGlassesPage(false);
      }
    });
  });

  settingsRemovePlaylistSlotButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const rawIndex = button.getAttribute("data-remove-playlist-slot-index");
      const index = clampIndex(Number(rawIndex), 0, Math.max(0, state.selectedPlaylistSlotIds.length - 1));
      if (index >= state.selectedPlaylistSlotIds.length) {
        return;
      }
      state.selectedPlaylistSlotIds = state.selectedPlaylistSlotIds.filter((_, slotIndex) => slotIndex !== index);
      persistSelectedPlaylistSlotIds();
      syncConfiguredPlaylistEntries();
      renderPhoneUi(true);
      if (resolveEffectiveGlassesPage() === "PLAYLISTS") {
        void renderGlassesPage(false);
      }
    });
  });

  const handleRefreshGlassesClick = async (button: HTMLElement | null): Promise<void> => {
    if (!button) {
      return;
    }

    // Tapping the phone-side refresh control can also produce a glasses click event
    // in the host. Suppress those transient control events so refresh never triggers
    // the currently focused glasses action.
    suppressGlassesInteractionUntil = Date.now() + REFRESH_INPUT_SUPPRESS_MS;
    button.setAttribute("disabled", "true");
    const originalOpacity = button.style.opacity;
    button.style.opacity = "0.6";
    try {
      await refreshBridgeOnResume(true);
    } finally {
      button.removeAttribute("disabled");
      button.style.opacity = originalOpacity;
      renderPhoneUi(true);
    }
  };

  headerRefreshButton?.addEventListener("click", () => {
    void handleRefreshGlassesClick(headerRefreshButton);
  });

  settingsBorderInsetInput?.addEventListener("change", () => {
    state.borderInsetPx = clampStoredNumber(Number(settingsBorderInsetInput.value), state.borderInsetPx, 0, 40);
    localStorage.setItem(BORDER_INSET_KEY, String(state.borderInsetPx));
    renderPhoneUi(true);
    void renderGlassesPage(false);
  });

  settingsBorderWidthInput?.addEventListener("change", () => {
    state.borderWidthPx = clampStoredNumber(Number(settingsBorderWidthInput.value), state.borderWidthPx, 0, 5);
    localStorage.setItem(BORDER_WIDTH_KEY, String(state.borderWidthPx));
    renderPhoneUi(true);
    void renderGlassesPage(false);
  });

  selfHostClientIdInput?.addEventListener("input", () => {
    state.selfHostClientIdInput = selfHostClientIdInput.value;
    renderPhoneUi(true);
  });

  selfHostCustomOriginCheckbox?.addEventListener("change", () => {
    state.selfHostMode = selfHostCustomOriginCheckbox.checked ? "custom-origin" : "same-origin";
    if (state.selfHostMode === "same-origin") {
      state.selfHostServiceOriginInput = getEffectiveConfigState().serviceOrigin;
    }
    renderPhoneUi(true);
  });

  selfHostServiceOriginInput?.addEventListener("input", () => {
    state.selfHostServiceOriginInput = selfHostServiceOriginInput.value;
    renderPhoneUi(true);
  });

  selfHostCopyRedirectButton?.addEventListener("click", () => {
    void copyToClipboardWithFeedback(effectiveConfig.redirectUri);
  });

  selfHostSaveConfigButton?.addEventListener("click", () => {
    if (!isClientSpotifyAuthMode()) {
      return;
    }

    try {
      saveSelfHostConfig({
        spotifyClientId: state.selfHostClientIdInput,
        serviceOrigin: state.selfHostServiceOriginInput,
        mode: state.selfHostMode,
        updatedAt: Date.now(),
      });
      syncSelfHostInputsFromStoredConfig();
      setPhoneBanner("Runtime config saved for simulator mode.");
    } catch (error) {
      setPhoneBanner(error instanceof Error ? error.message : String(error));
    } finally {
      renderPhoneUi(true);
    }
  });

  selfHostClearConfigButton?.addEventListener("click", () => {
    if (!isClientSpotifyAuthMode()) {
      return;
    }

    clearSelfHostConfig();
    syncSelfHostInputsFromStoredConfig();
    setPhoneBanner("Runtime config cleared for simulator mode.");
    renderPhoneUi(true);
  });

  selfHostSaveServerOriginButton?.addEventListener("click", () => {
    if (isClientSpotifyAuthMode()) {
      return;
    }
    selfHostSaveServerOriginButton.setAttribute("disabled", "true");
    void applyServerTargetInput(state.selfHostServiceOriginInput).finally(() => {
      renderPhoneUi(true);
    });
  });

  loginButton?.addEventListener("click", () => {
    openSpotifyLoginPage();
  });

  const handleConnectSpotify = async (): Promise<void> => {
    const authMode = getSpotifyAuthMode();

    const activeConfig = getEffectiveConfigState();
    if (activeConfig.source === "missing" || !activeConfig.spotifyClientId) {
      setPhoneBanner(PHONE_TEXT[state.language].missingConfigMessage);
      renderPhoneUi(true);
      return;
    }
    if (activeConfig.hasMismatchWithAuthorizedSession || hasAuthorizedSessionMismatch()) {
      setPhoneBanner(PHONE_TEXT[state.language].originChangedMessage);
      renderPhoneUi(true);
      return;
    }
    if (shouldBlockConnectFromDraft()) {
      setPhoneBanner(draftOriginWarning || PHONE_TEXT[state.language].invalidServiceOriginMessage);
      renderPhoneUi(true);
      return;
    }

    try {
      if (authMode === "client") {
        await startSpotifyAuth();
        return;
      }

      const nextConfig: SelfHostConfig = {
        spotifyClientId: activeConfig.spotifyClientId,
        serviceOrigin: activeConfig.serviceOrigin,
        mode: state.selfHostMode,
        updatedAt: Date.now(),
      };
      const startedWithServer = await startSpotifyAuthWithServer(nextConfig);
      if (!startedWithServer) {
        setPhoneBanner(PHONE_TEXT[state.language].localAuthServerUnavailable);
        renderPhoneUi(true);
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPhoneBanner(
        isRedirectUriMismatchMessage(undefined, message)
          ? PHONE_TEXT[state.language].redirectUriMismatchMessage
          : `${PHONE_TEXT[state.language].authSetupFailedPrefix}${message}`,
      );
      renderPhoneUi(true);
    }
  };

  connectButton?.addEventListener("click", () => {
    void handleConnectSpotify();
  });

  serverDomainButton?.addEventListener("click", () => {
    if (!isClientSpotifyAuthMode()) {
      state.phoneView = "SETTINGS";
      state.selfHostMode = "custom-origin";
      state.selfHostServiceOriginInput = getPromptSeedForServiceOrigin(
        getServerApiOriginOverride() || getEffectiveConfigState().serviceOrigin,
      );
      renderPhoneUi(true);
      window.setTimeout(() => {
        document.getElementById("self-host-service-origin")?.focus();
      }, 0);
      return;
    }
    void configureServerTargetFromPrompt().finally(() => {
      renderPhoneUi(true);
    });
  });

  const handleClearSession = (): void => {
    if (getSpotifyAuthMode() === "server") {
      void clearSpotifySessionOnServer().catch((error) => {
        console.warn("Failed to clear session on the local server", error);
      });
    }
    clearSpotifySession();
    clearPendingDeviceTransfer();
    state.playback = null;
    state.availablePlaylistOptions = [];
    syncConfiguredPlaylistEntries();
    state.liveDeviceEntries = null;
    state.panelBProbe = "idle";
    state.page = "AUTH_REQUIRED";
    state.lastError = {
      code: "AUTH_REQUIRED",
      message: "Please authorize Spotify on phone.",
    };
    setPhoneBanner(PHONE_TEXT[state.language].sessionCleared);
    clearPollTimer();
    clearMarqueeTimer();
    clearAutoHideTimer();
    void renderGlassesPage(true);
    renderPhoneUi(true);
  };

	  settingsClearSessionButton?.addEventListener("click", handleClearSession);

	  const applyLoadedWebViewSettings = async (rawConfig: unknown, successMessage: string): Promise<void> => {
	    if (!applyWebViewSettingsConfig(rawConfig)) {
	      setPhoneBanner(PHONE_TEXT[state.language].settingsConfigInvalidFile);
	      renderPhoneUi(true);
	      return;
	    }

	    await persistWebViewSettingsToBridgeStore();
	    setPhoneBanner(successMessage);
	    renderPhoneUi(true);
	    refreshForEffectivePageChange(true);
	    if (state.phonePanel === "B") {
	      void probePanelBConnection();
	    }
	  };

	  settingsSaveServerConfigButton?.addEventListener("click", () => {
	    void (async () => {
	      try {
	        const saved = await saveWebViewConfigOnServer(collectWebViewSettingsConfig());
	        setPhoneBanner(
	          saved ? PHONE_TEXT[state.language].settingsConfigSavedServer : PHONE_TEXT[state.language].localAuthServerUnavailable,
	        );
	      } catch (error) {
	        setPhoneBanner(error instanceof Error ? error.message : String(error));
	      }
	      renderPhoneUi(true);
	    })();
	  });

	  settingsLoadServerConfigButton?.addEventListener("click", () => {
	    void (async () => {
	      try {
	        const config = await loadWebViewConfigFromServer<WebViewSettingsConfig>();
	        if (!config) {
	          setPhoneBanner(PHONE_TEXT[state.language].settingsConfigNoServerFile);
	          renderPhoneUi(true);
	          return;
	        }
	        await applyLoadedWebViewSettings(config, PHONE_TEXT[state.language].settingsConfigLoadedServer);
	      } catch (error) {
	        setPhoneBanner(error instanceof Error ? error.message : String(error));
	        renderPhoneUi(true);
	      }
	    })();
	  });

	  settingsExportLocalConfigButton?.addEventListener("click", () => {
	    triggerWebViewSettingsConfigDownload();
	    void persistWebViewSettingsToBridgeStore();
	    setPhoneBanner(PHONE_TEXT[state.language].settingsConfigSavedLocal);
	    renderPhoneUi(true);
	  });

	  settingsImportLocalConfigButton?.addEventListener("click", () => {
	    settingsImportLocalConfigFileInput?.click();
	  });

	  settingsImportLocalConfigFileInput?.addEventListener("change", () => {
	    void (async () => {
	      const file = settingsImportLocalConfigFileInput.files?.[0];
	      settingsImportLocalConfigFileInput.value = "";
	      if (!file) {
	        return;
	      }
	      try {
	        const config = await readWebViewSettingsConfigFile(file);
	        await applyLoadedWebViewSettings(config, PHONE_TEXT[state.language].settingsConfigLoadedLocal);
	      } catch (error) {
	        setPhoneBanner(error instanceof Error ? error.message : String(error));
	        renderPhoneUi(true);
	      }
	    })();
	  });

	  panelBPrevButton?.addEventListener("click", () => {
	    void runPhoneRemoteControl("prev");
  });
  panelBPlayPauseButton?.addEventListener("click", () => {
    void runPhoneRemoteControl("toggle");
  });
  panelBNextButton?.addEventListener("click", () => {
    void runPhoneRemoteControl("next");
  });
  panelBShuffleButton?.addEventListener("click", () => {
    void runPhoneRemoteControl("shuffle");
  });
  panelBRepeatButton?.addEventListener("click", () => {
    void runPhoneRemoteControl("repeat");
  });

  updatePhoneStatus();
}

function setForegroundState(isForeground: boolean): void {
  state.isForeground = isForeground;

  if (shouldPollInCurrentState()) {
    schedulePoll(computeBasePollDelay());
  } else {
    clearPollTimer();
  }
}

function shouldIgnoreScrollEvent(): boolean {
  const now = Date.now();
  if (now - state.lastScrollTs < SCROLL_COOLDOWN_MS) {
    return true;
  }

  state.lastScrollTs = now;
  return false;
}

function moveFocus(step: 1 | -1): void {
  if (shouldIgnoreScrollEvent()) {
    return;
  }

  state.focusIndex = (state.focusIndex + step + NOW_PLAYING_CONTROL_COUNT) % NOW_PLAYING_CONTROL_COUNT;
  void renderGlassesPage(false);
}

function moveSelectablePageFocus(pageState: SelectablePageState, itemCount: number, direction: 1 | -1): void {
  if (shouldIgnoreScrollEvent()) {
    return;
  }

  if (itemCount <= 0) {
    return;
  }

  pageState.focusIndex = (pageState.focusIndex + direction + itemCount) % itemCount;
  clampSelectablePageState(pageState, itemCount);
  void renderGlassesPage(false);
}

function getSelectableListScrollSteps(): { topStep: 1 | -1; bottomStep: 1 | -1 } {
  // List pages use a vertical selection model that should remain independent
  // from the now-playing controls row. The invert toggle applies only here.
  return state.playlistScrollInverted
    ? { topStep: 1, bottomStep: -1 }
    : { topStep: -1, bottomStep: 1 };
}

async function handlePlaylistPageEvent(eventType: OsEventTypeList): Promise<void> {
  const entries = getEffectivePlaylistEntries();
  clampSelectablePageState(state.playlistPage, entries.length, getSelectablePageDisplayCount(entries.length));
  const { topStep, bottomStep } = getSelectableListScrollSteps();

  if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
    moveSelectablePageFocus(state.playlistPage, getSelectablePageDisplayCount(entries.length), topStep);
    return;
  }

  if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    moveSelectablePageFocus(state.playlistPage, getSelectablePageDisplayCount(entries.length), bottomStep);
    return;
  }

  if (eventType === OsEventTypeList.CLICK_EVENT) {
    if (state.playlistPage.focusIndex === 0) {
      navigateToGlassesPage("NOW_PLAYING");
      return;
    }

    if (entries.length <= 0) {
      await renderGlassesPage(false);
      return;
    }

    const targetIndex = state.playlistPage.focusIndex - 1;
    state.playlistPage.selectedIndex = clampIndex(targetIndex, 0, entries.length - 1);
    clampSelectablePageState(state.playlistPage, entries.length, getSelectablePageDisplayCount(entries.length));
    const target = entries[state.playlistPage.selectedIndex];
    if (!target) {
      await renderGlassesPage(false);
      return;
    }

    if (controlInFlight || Date.now() < controlLockedUntil) {
      markBusyHint();
      await renderGlassesPage(false);
      return;
    }

    controlInFlight = true;
    controlLockedUntil = Date.now() + CONTROL_LOCK_MS;
    lastControlActionAt = Date.now();

    try {
      const result = await playSelectedPlaylist(target);
      if (!result.ok && result.error) {
        applyError(result.error);
        setPhoneBanner(result.message || getErrorMessage(result.error), "playback-control-error");
      } else {
        clearError();
        setPhoneBanner(null);
      }
      await renderGlassesPage(false);
    } finally {
      controlInFlight = false;
      controlLockedUntil = Date.now() + CONTROL_LOCK_MS;
      kickImmediateRefresh();
      renderPhoneUi(false);
    }
  }
}

async function handleDevicesPageEvent(eventType: OsEventTypeList): Promise<void> {
  const entries = getEffectiveDeviceEntries();
  clampSelectablePageState(state.devicePage, entries.length, getSelectablePageDisplayCount(entries.length));
  const { topStep, bottomStep } = getSelectableListScrollSteps();

  if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
    moveSelectablePageFocus(state.devicePage, getSelectablePageDisplayCount(entries.length), topStep);
    return;
  }

  if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    moveSelectablePageFocus(state.devicePage, getSelectablePageDisplayCount(entries.length), bottomStep);
    return;
  }

  if (eventType === OsEventTypeList.CLICK_EVENT) {
    if (state.devicePage.focusIndex === 0) {
      navigateToGlassesPage("NOW_PLAYING");
      return;
    }

    if (entries.length <= 0) {
      await renderGlassesPage(false);
      return;
    }

    state.devicePage.selectedIndex = clampIndex(state.devicePage.focusIndex - 1, 0, entries.length - 1);
    clampSelectablePageState(state.devicePage, entries.length, getSelectablePageDisplayCount(entries.length));

    if (!state.liveDeviceEntries) {
      await renderGlassesPage(false);
      return;
    }

    const target = entries[state.devicePage.selectedIndex];
    if (!target?.id) {
      await renderGlassesPage(false);
      return;
    }

    if (controlInFlight || Date.now() < controlLockedUntil) {
      markBusyHint();
      await renderGlassesPage(false);
      return;
    }

    controlInFlight = true;
    controlLockedUntil = Date.now() + CONTROL_LOCK_MS;
    lastControlActionAt = Date.now();

    try {
      const result = await transferPlayback(target.id, state.playback?.isPlaying === true);
      if (!result.ok && result.error) {
        applyError(result.error);
      } else {
        clearError();
        pendingDeviceTransferTargetId = target.id;
        pendingDeviceTransferUntil = Date.now() + DEVICE_TRANSFER_PENDING_MS;
        if (state.liveDeviceEntries) {
          state.liveDeviceEntries = state.liveDeviceEntries.map((entry) => ({
            ...entry,
            isActive: entry.id === target.id,
          }));
        }
        await renderGlassesPage(false);
      }
      await refreshDeviceEntries(false);
      scheduleDeviceEntriesPoll(true);
    } finally {
      controlInFlight = false;
      controlLockedUntil = Date.now() + CONTROL_LOCK_MS;
      kickImmediateRefresh();
    }
  }
}

async function runFocusedControl(): Promise<void> {
  if (!isEffectiveNowPlayingPage()) {
    return;
  }

  if (state.focusIndex === 0) {
    navigateToGlassesPage("PLAYLISTS");
    return;
  }

  if (state.focusIndex === NOW_PLAYING_CONTROL_COUNT - 1) {
    navigateToGlassesPage("DEVICES");
    return;
  }

  if (state.focusIndex === 6) {
    await setGlassesUiVisible(false);
    return;
  }

  if (controlInFlight || Date.now() < controlLockedUntil) {
    markBusyHint();
    await renderGlassesPage(false);
    return;
  }

  controlInFlight = true;
  controlLockedUntil = Date.now() + CONTROL_LOCK_MS;

  try {
    let action: ControlAction = "toggle";
    if (state.focusIndex === 1) {
      action = "shuffle";
    } else if (state.focusIndex === 2) {
      action = "prev";
    } else if (state.focusIndex === 4) {
      action = "next";
    } else if (state.focusIndex === 5) {
      action = "repeat";
    }

    if (requiresExistingPlayback(action) && !hasControllablePlaybackTarget()) {
      applyNoActivePlaybackControlState();
      await renderGlassesPage(false);
      renderPhoneUi(false);
      return;
    }

    const playbackBefore = state.playback;
    lastControlActionAt = Date.now();
    const optimisticSnapshot = beginOptimisticControl(action);
    if (optimisticSnapshot) {
      void renderGlassesPage(false);
    }

    let controlResult;
    if (action === "shuffle") {
      controlResult = await setShuffle(!(playbackBefore?.shuffleEnabled ?? false));
    } else if (action === "prev") {
      controlResult = await previousTrack();
    } else if (action === "next") {
      controlResult = await nextTrack();
    } else if (action === "repeat") {
      controlResult = await setRepeat(getNextRepeatMode(playbackBefore?.repeatMode ?? "off"));
    } else {
      controlResult = await togglePlayPause(playbackBefore);
    }

    if (!controlResult.ok && controlResult.error) {
      restoreOptimisticControl(optimisticSnapshot);
      applyError(controlResult.error);
      void renderGlassesPage(false);
    } else {
      void renderGlassesPage(false);
    }
  } finally {
    controlInFlight = false;
    controlLockedUntil = Date.now() + CONTROL_LOCK_MS;
    // Source of truth must be Spotify: force refresh after each control attempt.
    kickImmediateRefresh();
  }
}

async function setGlassesUiVisible(nextVisible: boolean): Promise<void> {
  if (state.uiVisible === nextVisible) {
    if (state.uiVisible) {
      scheduleAutoHideIfNeeded();
    } else {
      clearAutoHideTimer();
    }
    return;
  }

  const currentPage = resolveEffectiveGlassesPage();
  if (!nextVisible) {
    state.hiddenGlassesPage = currentPage;
  }
  if (nextVisible && isAlbumArtModeActive()) {
    // Hidden -> visible should force one album-art refresh even when songKey is unchanged.
    lastAlbumArtSongKey = "";
  }
  state.uiVisible = nextVisible;
  if (!state.uiVisible) {
    clearAutoHideTimer();
    clearGlassesStatusTimer();
    clearGlassesStatusRecoveryTimer();
    clearDeviceEntriesPollTimer();
  }

  clearNowPlayingTextUpgradeState();
  lastRenderSignature = "";
  await renderGlassesPage(true);

  if (state.uiVisible) {
    const restoredPage = state.hiddenGlassesPage ?? currentPage;
    state.hiddenGlassesPage = null;
    if (restoredPage === "NOW_PLAYING") {
      const statusContainerId = getNowPlayingTextContainerId("np-status");
      if (statusContainerId !== null) {
        await updateNowPlayingTextContainer("np-status", getTextStatusBlock(), statusContainerId);
      }
      restartGlassesStatusTicker();
      scheduleGlassesStatusTickerRecovery();
    } else if (restoredPage === "DEVICES") {
      scheduleDeviceEntriesPoll(true);
    }
    scheduleAutoHideIfNeeded(true);
  }
}

async function handleEvenHubEvent(event: EvenHubEvent): Promise<void> {
  const eventType = extractEventType(event);
  const effectivePage = resolveEffectiveGlassesPage();

  if (eventType === OsEventTypeList.FOREGROUND_ENTER_EVENT) {
    setForegroundState(true);
    return;
  }

  if (eventType === OsEventTypeList.FOREGROUND_EXIT_EVENT) {
    setForegroundState(false);
    return;
  }

  if (
    Date.now() < suppressGlassesInteractionUntil &&
    (eventType === OsEventTypeList.CLICK_EVENT ||
      eventType === OsEventTypeList.DOUBLE_CLICK_EVENT ||
      eventType === OsEventTypeList.SCROLL_TOP_EVENT ||
      eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT)
  ) {
    return;
  }

  if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    if (!bridge) {
      console.warn("Unable to open the system exit confirmation because the Even bridge is unavailable.");
      return;
    }
    try {
      await bridge.shutDownPageContainer(1);
    } catch (error) {
      console.warn("Failed to open the system exit confirmation", error);
    }
    return;
  }

  if (!state.uiVisible) {
    if (
      eventType === OsEventTypeList.CLICK_EVENT ||
      eventType === OsEventTypeList.SCROLL_TOP_EVENT ||
      eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT
    ) {
      await setGlassesUiVisible(true);
    }
    return;
  }

  if (effectivePage === "PLAYLISTS") {
    await handlePlaylistPageEvent(eventType);
    return;
  }

  if (effectivePage === "DEVICES") {
    await handleDevicesPageEvent(eventType);
    return;
  }

  if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
    moveFocus(state.glassesControlInvert ? -1 : 1);
    return;
  }

  if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    moveFocus(state.glassesControlInvert ? 1 : -1);
    return;
  }

  if (eventType === OsEventTypeList.CLICK_EVENT) {
    await runFocusedControl();
  }
}

async function initBridge(): Promise<void> {
  if (bridge && unsubscribeEvenHubEvent) {
    return;
  }

	  try {
	    bridge = await waitForEvenAppBridge();
	    unsubscribeEvenHubEvent = bridge.onEvenHubEvent((event) => {
	      void handleEvenHubEvent(event);
	    });
	    const restoredSettings = await loadWebViewSettingsFromBridgeStore();
	    if (restoredSettings) {
	      renderPhoneUi(true);
	    }
	  } catch (error) {
	    console.warn("Even bridge unavailable. Phone UI remains usable.", error);
	  }
}

async function refreshBridgeOnResume(force = false): Promise<void> {
  if (bridgeResumeInFlight) {
    if (force) {
      pendingForcedBridgeResume = true;
    }
    return;
  }

  const now = Date.now();
  if (!force && now - APP_LOADED_AT < BRIDGE_STARTUP_SUPPRESS_MS) {
    return;
  }
  if (!force && now - lastBridgeResumeAt < BRIDGE_RESUME_DEBOUNCE_MS) {
    return;
  }

  bridgeResumeInFlight = true;
  lastBridgeResumeAt = now;

  try {
    clearPollTimer();
    await refreshSessionFromLocalServer(true);
    renderPhoneUi(true);

    if (force && bridge) {
      try {
        await bridge.shutDownPageContainer(0);
      } catch (error) {
        console.warn("Failed to shut down glasses page during forced refresh", error);
      }
    }

    unsubscribeEvenHubEvent?.();
    unsubscribeEvenHubEvent = null;
    bridge = null;
    resetGlassesRenderStateForBridgeResume();

    await initBridge();

    if (!bridge) {
      await delayMs(150);
      await initBridge();
    }

    if (!bridge) {
      renderPhoneUi(true);
      return;
    }

    if (!hasTokenBundle()) {
      state.page = "AUTH_REQUIRED";
      applyError("AUTH_REQUIRED");
      await renderGlassesPage(true);
      return;
    }

    if (resolveEffectiveGlassesPage() === "PLAYLISTS") {
      await refreshPlaylistEntries(true);
      if (shouldPollInCurrentState()) {
        kickImmediateRefresh();
      }
    } else if (resolveEffectiveGlassesPage() === "DEVICES") {
      await refreshDeviceEntries(true);
      if (shouldPollInCurrentState()) {
        kickImmediateRefresh();
      }
    } else if (shouldPollInCurrentState()) {
      const startupOutcome = await refreshPlaybackState(true);
      if (startupOutcome.continuePolling) {
        schedulePoll(startupOutcome.nextDelayMs ?? computeBasePollDelay());
      }
    } else {
      await renderGlassesPage(true);
    }

    if (state.phonePanel === "B") {
      void probePanelBConnection();
    }

    renderPhoneUi(false);
  } finally {
    bridgeResumeInFlight = false;
    if (pendingForcedBridgeResume) {
      pendingForcedBridgeResume = false;
      window.setTimeout(() => {
        void refreshBridgeOnResume(true);
      }, 0);
    }
  }
}

function ensureFreshBuildQuery(): boolean {
  const currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.get(BUILD_CACHE_QUERY_KEY) === __BUILD_VERSION__) {
    return true;
  }

  currentUrl.searchParams.set(BUILD_CACHE_QUERY_KEY, __BUILD_VERSION__);
  window.location.replace(currentUrl.toString());
  return false;
}

async function bootstrap(): Promise<void> {
  if (!ensureFreshBuildQuery()) {
    return;
  }

  const query = new URLSearchParams(window.location.search);
  if (query.get("view") === "settings") {
    state.phoneView = "SETTINGS";
    query.delete("view");
    const nextSearch = query.toString();
    history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
  }

  if (getSpotifyAuthMode() === "server") {
    try {
      await loadServerApiOriginFromBridgeStore();
      await persistServerApiOriginToBridgeStore();
    } catch (error) {
      setPhoneBanner(error instanceof Error ? error.message : String(error));
      renderPhoneUi(true);
      return;
    }
  }

  renderPhoneUi(true);
  restartPhoneStatusTicker();
  if (getSpotifyAuthMode() === "server") {
    await refreshSessionFromLocalServer(true);
  }

  const lastCallbackError = peekLastAuthError();
  if (lastCallbackError) {
    setPhoneBanner(`${PHONE_TEXT[state.language].callbackPrefix}${getLocalizedAuthErrorMessage(lastCallbackError)}`);
  }

  renderPhoneUi(false);

  await initBridge();

  if (!bridge) {
    window.setTimeout(() => {
      void refreshBridgeOnResume();
    }, 500);
    if (hasTokenBundle() && resolveEffectiveGlassesPage() === "PLAYLISTS") {
      await refreshPlaylistEntries(true);
      if (shouldPollInCurrentState()) {
        kickImmediateRefresh();
      }
    } else if (hasTokenBundle() && resolveEffectiveGlassesPage() === "DEVICES") {
      await refreshDeviceEntries(true);
      if (shouldPollInCurrentState()) {
        kickImmediateRefresh();
      }
    } else if (hasTokenBundle() && shouldPollInCurrentState()) {
      const startupOutcome = await refreshPlaybackState(false);
      if (startupOutcome.continuePolling) {
        schedulePoll(startupOutcome.nextDelayMs ?? computeBasePollDelay());
      }
    } else if (hasTokenBundle()) {
      await renderGlassesPage(true);
    }
    if (state.phonePanel === "B") {
      void probePanelBConnection();
    }
    return;
  }

  if (!hasTokenBundle()) {
    state.page = "AUTH_REQUIRED";
    applyError("AUTH_REQUIRED");
    await renderGlassesPage(true);
    return;
  }

  if (resolveEffectiveGlassesPage() === "PLAYLISTS") {
    await refreshPlaylistEntries(true);
    if (shouldPollInCurrentState()) {
      kickImmediateRefresh();
    }
  } else if (resolveEffectiveGlassesPage() === "DEVICES") {
    await refreshDeviceEntries(true);
    if (shouldPollInCurrentState()) {
      kickImmediateRefresh();
    }
  } else if (shouldPollInCurrentState()) {
    const startupOutcome = await refreshPlaybackState(true);
    if (startupOutcome.continuePolling) {
      schedulePoll(startupOutcome.nextDelayMs ?? computeBasePollDelay());
    }
  } else {
    await renderGlassesPage(true);
  }

  if (state.phonePanel === "B") {
    void probePanelBConnection();
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hasEnteredBackground = true;
    return;
  }

  if (hasEnteredBackground) {
    hasEnteredBackground = false;
    void refreshBridgeOnResume();
  }
});

window.addEventListener("beforeunload", () => {
  sendClientDebugLog("beforeunload");
  clearPollTimer();
  clearMarqueeTimer();
  clearBusyTimer();
  clearPhoneStatusTimer();
  clearGlassesStatusTimer();
	  clearAutoHideTimer();
	  clearImageControlsStatusTimer();
	  clearImageModeReopenTimer();
	  if (webViewSettingsPersistTimer !== null) {
	    window.clearTimeout(webViewSettingsPersistTimer);
	    webViewSettingsPersistTimer = null;
	    void persistWebViewSettingsToBridgeStore();
	  }
	  unsubscribeEvenHubEvent?.();
  unsubscribeEvenHubEvent = null;
  bridge = null;
  bridgeResumeInFlight = false;
});

installClientDebugLogging();
void bootstrap();
