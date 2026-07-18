import { ImageContainerProperty, ImageRawDataUpdate, TextContainerProperty, TextContainerUpgrade } from "@evenrealities/even_hub_sdk";

const CANVAS_WIDTH = 576;
const CANVAS_HEIGHT = 288;
const LINE_HEIGHT = 72;
const PAGE_TOP = 0;
const CAPTURE_NAME = "capture-hidden";
const CENTERED_TEXT_CHARS = 40;
const DEFAULT_CONTENT_PADDING_PX = 16;
const APPROX_CHAR_WIDTH_PX = CANVAS_WIDTH / CENTERED_TEXT_CHARS;
const CONTROLS_IMAGE_WIDTH = 180;
const CONTROLS_IMAGE_HEIGHT = 40;
const CONTROLS_IMAGE_CONTAINER_NAME = "np-ctrls-img";
const TITLE_IMAGE_CONTAINER_NAME = "np-title-image";
const STATUS_IMAGE_CONTAINER_NAME = "np-status-image";
const COMPOSITE_IMAGE_CONTAINER_NAME = "np-all-img";
const IMAGE_CONTAINER_MIN_WIDTH = 20;
const IMAGE_CONTAINER_MAX_WIDTH = 200;
const IMAGE_CONTAINER_MIN_HEIGHT = 20;
const IMAGE_CONTAINER_MAX_HEIGHT = 100;
const COMPOSITE_IMAGE_WIDTH = 200;
const COMPOSITE_IMAGE_HEIGHT = 96;

export const IMAGE_TEXT_PADDING_PX = 8;
export const IMAGE_TEXT_LINE_HEIGHT_RATIO = 1.2;
export const DEFAULT_IMAGE_TEXT_MARQUEE_GAP_PX = 24;
export const DEFAULT_IMAGE_TEXT_MARQUEE_STEP_PX = 2;
export const IMAGE_TEXT_SLOW_TICK_THRESHOLD_MS = 16;

export type UiMode = "dev" | "prod";
export type ImageTextLanguageCode = "zh" | "en" | "ja";
export type ImageTextAlignMode = "left" | "center" | "right";
export type ImageTextStylePreset =
  | "white-black"
  | "transparent-green"
  | "transparent-white"
  | "black-green"
  | "black-white";
export type ImageControlsSendFormat = "png-number" | "png-base64" | "png-uint8";
export type TextAlignMode = "center" | "left" | "right";
export type GlassesTextRenderMode = "text" | "image";
export type ImageTextRowKind = "title" | "status" | "controls";
export type GlassesImageTextMode = "off" | "status" | "status+title";
export type GlassesLayoutMode = "text-only" | "status-image" | "status-title-image";
export type NowPlayingOrchestrationMode = "pure-text" | "album-art";
export type GlassesLogicalSlot = "title" | "status" | "controls" | "capture";
export type LogicalShapeEntry = { slot: GlassesLogicalSlot; type: "text" | "image" };
export type GlassesContainerShapeKey = string;
export type ControlGlyphVariant = "solid" | "open" | "ascii";
export type ControlsRepeatMode = "off" | "context" | "track";

export type BorderFrameSettings = {
  enabled: boolean;
  insetPx: number;
  borderWidthPx: number;
  borderRadius: number;
  contentPaddingPx?: number;
};

export type ImageTextRenderOptions = {
  fontStack: string;
  fontPx: number;
  fontWeight: number;
  lineHeightPx: number;
  paddingPx: number;
  align: ImageTextAlignMode;
  maxWidthPx: number;
  maxHeightPx: number;
  color: "black" | "white" | "green";
  background: "white" | "transparent" | "black";
  debugGuides?: boolean;
};

export type ImageTextPayload = {
  dataUrl: string;
  bytes: number[];
  uint8: Uint8Array;
  base64: string;
  width: number;
  height: number;
};

export type ImageTextProbeResult = {
  fontStackUsed: string;
  samples: Array<{ text: string; widthPx: number }>;
};

export type ImageRowUpdatePlan = {
  rowKind: ImageTextRowKind;
  renderer: "image-text" | "legacy-controls" | "composite-image";
  update: ImageRawDataUpdate;
  payload: ImageTextPayload;
  previewDataUrl?: string;
  textWidthPx?: number;
  usesMarquee?: boolean;
  loopWidthPx?: number;
};

export type GlassesPageSpec = {
  containerTotalNum: number;
  textObject?: TextContainerProperty[];
  imageObject?: ImageContainerProperty[];
  imagePlans?: ImageRowUpdatePlan[];
  shapeEntries: LogicalShapeEntry[];
  rebuildKey: string;
};

export type PixelControlsLayout = {
  pixelSize: number;
  offsetX: number;
  offsetY: number;
  iconGap: number;
  onChar: string;
};

const AUTH_REQUIRED_PAGE_TEXT: Record<ImageTextLanguageCode, { title: string; guidance: string }> = {
  zh: {
    title: "需要 Spotify 授权",
    guidance: "请在手机端完成授权",
  },
  en: {
    title: "Spotify authorization required",
    guidance: "Please authorize on phone.",
  },
  ja: {
    title: "Spotify 認証が必要です",
    guidance: "スマホで認証してください",
  },
};

export type NowPlayingRenderInput = {
  title: string;
  statusLine: string;
  focusIndex: number;
  uiVisible: boolean;
  isPlaying: boolean;
  orchestrationMode?: NowPlayingOrchestrationMode;
  albumArtSizePx?: number;
  albumArtGapPx?: number;
  useImageControls?: boolean;
  imageSendFormat?: ImageControlsSendFormat;
  frame?: BorderFrameSettings;
  controlsLayout?: Partial<PixelControlsLayout>;
  controlsVariant?: ControlGlyphVariant;
  textAlignMode?: TextAlignMode;
  imageTextMode?: GlassesImageTextMode;
  imageTextAlignMode?: ImageTextAlignMode;
  imageTextDiagnostics?: boolean;
  imageTextStyle?: ImageTextStylePreset;
  imageTextFontWeight?: number;
  language?: ImageTextLanguageCode;
  titleImageLines?: string[];
  statusImageLines?: string[];
  titleImageOffsetPx?: number;
  titleImageGapPx?: number;
  controlsImageAlignMode?: ImageTextAlignMode;
  shuffleEnabled?: boolean;
  repeatMode?: ControlsRepeatMode;
  decorateTextControls?: boolean;
};

export type SelectableTextPageRenderInput = {
  pageTitle: string;
  countLabel: string;
  listLines: string[];
  footerLine1: string;
  footerLine2: string;
  showTitle?: boolean;
  showFooter?: boolean;
  listLineCount?: number;
  frame?: BorderFrameSettings;
  textAlignMode?: TextAlignMode;
  containerNames: {
    title: string;
    list: string;
    footer: string;
  };
};

type DisplayTextLayout = {
  x: number;
  width: number;
  widthChars: number;
  innerY: number;
  innerHeight: number;
  topY: number;
};

type DisplayRowFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type NowPlayingRowFrames = {
  title: DisplayRowFrame;
  status: DisplayRowFrame;
  controls: DisplayRowFrame;
};

type IconKind = "prev" | "play" | "pause" | "next";
type IconMatrix = readonly string[];

type ProbeSample = { label: string; text: string };

const IMAGE_TEXT_FONT_PX: Record<ImageTextRowKind, number> = {
  title: 22,
  status: 22,
  controls: 22,
};
const DEFAULT_IMAGE_TEXT_FONT_WEIGHT = 100;

const DEFAULT_PIXEL_CONTROLS_LAYOUT: PixelControlsLayout = {
  pixelSize: 1,
  offsetX: 4,
  offsetY: 0,
  iconGap: 4,
  onChar: "█",
};

const PREV_ICON: IconMatrix = ["10001", "10011", "10111", "10011", "10001"];
const PLAY_ICON: IconMatrix = ["10000", "11000", "11100", "11000", "10000"];
const PAUSE_ICON: IconMatrix = ["11011", "11011", "11011", "11011", "11011"];
const NEXT_ICON: IconMatrix = ["10001", "11001", "11101", "11001", "10001"];

const COMBINING_MARK_REGEX = /\p{M}/u;

function makeTextContainer(
  containerID: number,
  containerName: string,
  yPosition: number,
  content: string,
  isEventCapture: number,
): TextContainerProperty {
  return new TextContainerProperty({
    xPosition: 0,
    yPosition,
    width: CANVAS_WIDTH,
    height: LINE_HEIGHT,
    borderWidth: 0,
    borderColor: 0,
    paddingLength: 6,
    containerID,
    containerName,
    content,
    isEventCapture,
  });
}

function makeDisplayTextContainer(
  containerID: number,
  containerName: string,
  xPosition: number,
  yPosition: number,
  width: number,
  content: string,
  height = LINE_HEIGHT,
): TextContainerProperty {
  return new TextContainerProperty({
    xPosition,
    yPosition,
    width,
    height,
    borderWidth: 0,
    borderColor: 0,
    paddingLength: 0,
    containerID,
    containerName,
    content,
    isEventCapture: 0,
  });
}

function makeDisplayImageContainer(
  containerID: number,
  containerName: string,
  xPosition: number,
  yPosition: number,
  width: number,
  height = LINE_HEIGHT,
): ImageContainerProperty {
  return new ImageContainerProperty({
    xPosition,
    yPosition,
    width,
    height,
    containerID,
    containerName,
  });
}

function fitImageContainerFrame(frame: DisplayRowFrame): DisplayRowFrame {
  const width = Math.min(IMAGE_CONTAINER_MAX_WIDTH, Math.max(IMAGE_CONTAINER_MIN_WIDTH, frame.width));
  const height = Math.min(IMAGE_CONTAINER_MAX_HEIGHT, Math.max(IMAGE_CONTAINER_MIN_HEIGHT, frame.height));
  const x = frame.x + Math.max(0, Math.floor((frame.width - width) / 2));
  const y = frame.y + Math.max(0, Math.floor((frame.height - height) / 2));

  return {
    x,
    y,
    width,
    height,
  };
}

function getCompositeImageFrame(displayLayout: DisplayTextLayout): DisplayRowFrame {
  const width = Math.min(COMPOSITE_IMAGE_WIDTH, Math.max(IMAGE_CONTAINER_MIN_WIDTH, displayLayout.width));
  const height = Math.min(COMPOSITE_IMAGE_HEIGHT, LINE_HEIGHT * 3);
  const x = displayLayout.x + Math.max(0, Math.floor((displayLayout.width - width) / 2));
  const y = displayLayout.topY + Math.max(0, Math.floor((LINE_HEIGHT * 3 - height) / 2));

  return {
    x,
    y,
    width,
    height,
  };
}

function normalizeBorderFrame(frame?: BorderFrameSettings): BorderFrameSettings {
  return {
    enabled: frame?.enabled === true,
    insetPx: clampInt(frame?.insetPx ?? 5, 0, 40, 5),
    borderWidthPx: clampInt(frame?.borderWidthPx ?? 3, 0, 5, 3),
    borderRadius: clampInt(frame?.borderRadius ?? 0, 0, 20, 0),
    contentPaddingPx: clampInt(frame?.contentPaddingPx ?? DEFAULT_CONTENT_PADDING_PX, 8, 24, DEFAULT_CONTENT_PADDING_PX),
  };
}

function makeHiddenCaptureContainer(containerID: number, frame?: BorderFrameSettings): TextContainerProperty {
  void frame;
  return makeTextContainer(containerID, CAPTURE_NAME, PAGE_TOP + LINE_HEIGHT * 3, " ", 1);
}

function makeBorderFrameContainer(containerID: number, frame?: BorderFrameSettings): TextContainerProperty {
  const normalizedFrame = normalizeBorderFrame(frame);
  const borderWidth = normalizedFrame.enabled ? normalizedFrame.borderWidthPx : 0;
  const hiddenFrame = !normalizedFrame.enabled;
  const xPosition = hiddenFrame ? CANVAS_WIDTH - 1 : normalizedFrame.insetPx;
  const yPosition = hiddenFrame ? CANVAS_HEIGHT - 1 : normalizedFrame.insetPx;
  const width = hiddenFrame ? 1 : CANVAS_WIDTH - normalizedFrame.insetPx * 2;
  const height = hiddenFrame ? 1 : CANVAS_HEIGHT - normalizedFrame.insetPx * 2;
  const init: Record<string, unknown> = {
    xPosition,
    yPosition,
    width,
    height,
    borderWidth,
    borderColor: 5,
    borderRadius: normalizedFrame.borderRadius,
    paddingLength: 0,
    containerID,
    containerName: "border-frame",
    content: " ",
    isEventCapture: 0,
  };
  return new TextContainerProperty(init as ConstructorParameters<typeof TextContainerProperty>[0]);
}

function getContainerBorderRadius(container: TextContainerProperty): number {
  const legacyRadius = (container as unknown as { borderRdaius?: number }).borderRdaius;
  const modernRadius = (container as unknown as { borderRadius?: number }).borderRadius;
  return typeof modernRadius === "number" ? modernRadius : typeof legacyRadius === "number" ? legacyRadius : 0;
}

function cloneContainer(container: TextContainerProperty): TextContainerProperty {
  const init: Record<string, unknown> = {
    xPosition: container.xPosition,
    yPosition: container.yPosition,
    width: container.width,
    height: container.height,
    borderWidth: container.borderWidth,
    borderColor: container.borderColor,
    borderRadius: getContainerBorderRadius(container),
    paddingLength: container.paddingLength,
    containerID: container.containerID,
    containerName: container.containerName,
    content: container.content,
    isEventCapture: container.isEventCapture,
  };
  return new TextContainerProperty(init as ConstructorParameters<typeof TextContainerProperty>[0]);
}

function cloneImageContainer(container: ImageContainerProperty): ImageContainerProperty {
  return new ImageContainerProperty({
    xPosition: container.xPosition,
    yPosition: container.yPosition,
    width: container.width,
    height: container.height,
    containerID: container.containerID,
    containerName: container.containerName,
  });
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.round(value);
  if (rounded < min) {
    return min;
  }
  if (rounded > max) {
    return max;
  }
  return rounded;
}

function normalizePixelControlsLayout(layout?: Partial<PixelControlsLayout>): PixelControlsLayout {
  const onChar = typeof layout?.onChar === "string" && layout.onChar.length > 0 ? layout.onChar[0] : "█";
  return {
    pixelSize: clampInt(layout?.pixelSize ?? DEFAULT_PIXEL_CONTROLS_LAYOUT.pixelSize, 1, 4, 1),
    offsetX: clampInt(layout?.offsetX ?? DEFAULT_PIXEL_CONTROLS_LAYOUT.offsetX, 0, 32, 0),
    offsetY: clampInt(layout?.offsetY ?? DEFAULT_PIXEL_CONTROLS_LAYOUT.offsetY, 0, 8, 0),
    iconGap: clampInt(layout?.iconGap ?? DEFAULT_PIXEL_CONTROLS_LAYOUT.iconGap, 1, 10, 2),
    onChar,
  };
}

function estimateCenteredChars(widthPx: number): number {
  const estimated = Math.floor(widthPx / APPROX_CHAR_WIDTH_PX);
  return Math.max(12, estimated);
}

function getDisplayTextLayout(lineCount: number, frame?: BorderFrameSettings): DisplayTextLayout {
  const normalizedFrame = normalizeBorderFrame(frame);
  const contentPaddingPx = normalizedFrame.contentPaddingPx ?? DEFAULT_CONTENT_PADDING_PX;
  const horizontalInset = normalizedFrame.enabled ? normalizedFrame.insetPx + contentPaddingPx : contentPaddingPx;
  const innerX = horizontalInset;
  const innerWidth = CANVAS_WIDTH - horizontalInset * 2;
  const innerY = PAGE_TOP + contentPaddingPx;
  const innerHeight = CANVAS_HEIGHT - contentPaddingPx * 2;
  const contentHeight = LINE_HEIGHT * lineCount;
  const topY = innerY + Math.max(0, Math.floor((innerHeight - contentHeight) / 2));

  return {
    x: innerX,
    width: innerWidth,
    widthChars: estimateCenteredChars(innerWidth),
    innerY,
    innerHeight,
    topY,
  };
}

function getRowFrame(displayLayout: DisplayTextLayout, rowIndex: 0 | 1 | 2): DisplayRowFrame {
  return {
    x: displayLayout.x,
    y: displayLayout.topY + LINE_HEIGHT * rowIndex,
    width: displayLayout.width,
    height: LINE_HEIGHT,
  };
}

function getNowPlayingRowFrames(displayLayout: DisplayTextLayout): NowPlayingRowFrames {
  const titleY = Math.max(PAGE_TOP, displayLayout.topY - 16);
  const statusY = displayLayout.topY + LINE_HEIGHT - 4;
  const controlsY = Math.min(CANVAS_HEIGHT - LINE_HEIGHT, displayLayout.topY + LINE_HEIGHT * 2 + 18);

  return {
    title: {
      x: displayLayout.x,
      y: titleY,
      width: displayLayout.width,
      height: LINE_HEIGHT,
    },
    status: {
      x: displayLayout.x,
      y: statusY,
      width: displayLayout.width,
      height: LINE_HEIGHT,
    },
    controls: {
      x: displayLayout.x,
      y: controlsY,
      width: displayLayout.width,
      height: LINE_HEIGHT,
    },
  };
}

export function estimateDisplayTextWidthChars(frame?: BorderFrameSettings): number {
  const normalizedFrame = normalizeBorderFrame(frame);
  const correctionChars = normalizedFrame.enabled ? 1 : 0;
  return Math.max(12, getDisplayTextLayout(3, normalizedFrame).widthChars - correctionChars);
}

export function getImageTextFontStack(language: ImageTextLanguageCode): string {
  switch (language) {
    case "zh":
      return '"PingFang SC", "Hiragino Sans", "Noto Sans CJK SC", "Noto Sans CJK JP", "Microsoft YaHei", sans-serif';
    case "ja":
      return '"Hiragino Sans", "PingFang SC", "Noto Sans CJK JP", "Noto Sans CJK SC", sans-serif';
    case "en":
    default:
      return '"PingFang SC", "Hiragino Sans", "Noto Sans CJK SC", "Noto Sans CJK JP", "Microsoft YaHei", sans-serif';
  }
}

export function getDefaultImageTextRenderOptions(
  rowKind: ImageTextRowKind,
  language: ImageTextLanguageCode,
  maxWidthPx: number,
  maxHeightPx: number,
  align: ImageTextAlignMode = "center",
  debugGuides = false,
  stylePreset: ImageTextStylePreset = "black-green",
  fontWeightOverride?: number,
): ImageTextRenderOptions {
  const fontPx = IMAGE_TEXT_FONT_PX[rowKind];
  const fontWeight = clampInt(fontWeightOverride ?? DEFAULT_IMAGE_TEXT_FONT_WEIGHT, 100, 400, DEFAULT_IMAGE_TEXT_FONT_WEIGHT);
  const background =
    stylePreset === "white-black"
      ? "white"
      : stylePreset === "black-green" || stylePreset === "black-white"
        ? "black"
        : "transparent";
  const color =
    stylePreset === "transparent-green" || stylePreset === "black-green"
      ? "green"
      : stylePreset === "transparent-white" || stylePreset === "black-white"
        ? "white"
        : "black";
  return {
    fontStack: getImageTextFontStack(language),
    fontPx,
    fontWeight,
    lineHeightPx: Math.ceil(fontPx * IMAGE_TEXT_LINE_HEIGHT_RATIO),
    paddingPx: IMAGE_TEXT_PADDING_PX,
    align,
    maxWidthPx,
    maxHeightPx,
    color,
    background,
    debugGuides,
  };
}

function getCanvasContext(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return undefined;
  }

  return { canvas, ctx };
}

function applyTextCanvasState(ctx: CanvasRenderingContext2D, options: ImageTextRenderOptions): void {
  ctx.font = `${options.fontWeight} ${options.fontPx}px ${options.fontStack}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = options.align;
}

function getDrawableMetrics(options: ImageTextRenderOptions): { left: number; right: number; center: number; top: number } {
  const drawableLeft = options.paddingPx;
  const drawableRight = options.maxWidthPx - options.paddingPx;
  const drawableCenter = (drawableLeft + drawableRight) / 2;
  return {
    left: drawableLeft,
    right: drawableRight,
    center: drawableCenter,
    top: options.paddingPx,
  };
}

function getTextDrawX(options: ImageTextRenderOptions): number {
  const metrics = getDrawableMetrics(options);
  switch (options.align) {
    case "left":
      return metrics.left;
    case "right":
      return metrics.right;
    case "center":
    default:
      return metrics.center;
  }
}

function isVariationSelector(char: string): boolean {
  const codePoint = char.codePointAt(0) ?? 0;
  return (codePoint >= 0xfe00 && codePoint <= 0xfe0f) || (codePoint >= 0xe0100 && codePoint <= 0xe01ef);
}

function isSkinToneModifier(char: string): boolean {
  const codePoint = char.codePointAt(0) ?? 0;
  return codePoint >= 0x1f3fb && codePoint <= 0x1f3ff;
}

function isZeroWidthJoiner(char: string): boolean {
  return (char.codePointAt(0) ?? 0) === 0x200d;
}

function getControlGlyphLabels(variant: ControlGlyphVariant, isPlaying: boolean): [string, string, string] {
  if (variant === "ascii") {
    return ["<<", isPlaying ? "||" : ">", ">>"];
  }
  if (variant === "open") {
    return ["◁◁", isPlaying ? "||" : "▷", "▷▷"];
  }

  return ["◀◀", isPlaying ? "||" : "▶", "▶▶"];
}

function getDecoratedControlLabels(
  variant: ControlGlyphVariant,
  isPlaying: boolean,
  shuffleEnabled = false,
  repeatMode: ControlsRepeatMode = "off",
): string[] {
  const transportLabels = getControlGlyphLabels(variant, isPlaying);
  const playlistLabel = "PL";
  const deviceLabel = "DV";
  return [
    playlistLabel,
    shuffleEnabled ? "S+" : "S",
    ...transportLabels,
    repeatMode === "track" ? "R1" : repeatMode === "context" ? "RA" : "->",
    deviceLabel,
  ];
}

function buildCompactControlsLine(
  focusIndex: number,
  uiVisible: boolean,
  isPlaying: boolean,
  variant: ControlGlyphVariant = "solid",
  shuffleEnabled = false,
  repeatMode: ControlsRepeatMode = "off",
): string {
  if (!uiVisible) {
    return "Controls hidden";
  }

  const labels = getDecoratedControlLabels(variant, isPlaying, shuffleEnabled, repeatMode);
  return labels
    .map((label, index) => (index === focusIndex ? `[${label}]` : label))
    .join("  ");
}

function isCombiningMark(char: string): boolean {
  return COMBINING_MARK_REGEX.test(char);
}

export function splitGraphemes(text: string): string[] {
  type GraphemeSegmenter = { segment(input: string): Iterable<{ segment: string }> };
  type GraphemeSegmenterConstructor = new (
    locale?: string | string[],
    options?: { granularity: "grapheme" },
  ) => GraphemeSegmenter;
  const SegmenterCtor = (globalThis.Intl as unknown as {
    Segmenter?: GraphemeSegmenterConstructor;
  }).Segmenter;

  if (typeof SegmenterCtor === "function") {
    const segmenter = new SegmenterCtor(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (item) => item.segment);
  }

  const codePoints = Array.from(text);
  const segments: string[] = [];

  for (const char of codePoints) {
    if (segments.length === 0) {
      segments.push(char);
      continue;
    }

    if (isZeroWidthJoiner(char)) {
      segments[segments.length - 1] += char;
      continue;
    }

    const previous = segments[segments.length - 1];
    if (previous.endsWith("\u200d")) {
      segments[segments.length - 1] += char;
      continue;
    }

    if (isCombiningMark(char) || isVariationSelector(char) || isSkinToneModifier(char)) {
      segments[segments.length - 1] += char;
      continue;
    }

    segments.push(char);
  }

  return segments;
}

function createPayloadFromCanvas(canvas: HTMLCanvasElement): ImageTextPayload | undefined {
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  if (!base64) {
    return undefined;
  }

  const binary = atob(base64);
  const bytes = new Array<number>(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return {
    dataUrl,
    base64,
    bytes,
    uint8: new Uint8Array(bytes),
    width: canvas.width,
    height: canvas.height,
  };
}

function fillCanvasBackground(ctx: CanvasRenderingContext2D, options: ImageTextRenderOptions): void {
  if (options.background === "transparent") {
    ctx.clearRect(0, 0, options.maxWidthPx, options.maxHeightPx);
    return;
  }

  ctx.fillStyle = options.background === "black" ? "#000000" : "#ffffff";
  ctx.fillRect(0, 0, options.maxWidthPx, options.maxHeightPx);
}

function getImageTextFillStyle(options: ImageTextRenderOptions): string {
  switch (options.color) {
    case "white":
      return "#ffffff";
    case "green":
      return "#1DB954";
    case "black":
    default:
      return "#000000";
  }
}

function drawDebugGuides(ctx: CanvasRenderingContext2D, options: ImageTextRenderOptions, measuredWidth: number): void {
  if (!options.debugGuides) {
    return;
  }

  const drawable = getDrawableMetrics(options);
  const centerX = drawable.center;

  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(drawable.left, options.paddingPx, drawable.right - drawable.left, options.maxHeightPx - options.paddingPx * 2);
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, options.maxHeightPx);
  ctx.stroke();

  let boxX = drawable.left;
  if (options.align === "center") {
    boxX = centerX - measuredWidth / 2;
  } else if (options.align === "right") {
    boxX = drawable.right - measuredWidth;
  }

  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.strokeRect(boxX, options.paddingPx, measuredWidth, options.maxHeightPx - options.paddingPx * 2);
  ctx.restore();
}

function measureLineWidth(ctx: CanvasRenderingContext2D, text: string): number {
  return Math.ceil(ctx.measureText(text).width);
}

function drawStaticLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: ImageTextRenderOptions,
  baselineY: number,
): number {
  const width = measureLineWidth(ctx, text);
  ctx.fillStyle = getImageTextFillStyle(options);
  ctx.fillText(text, getTextDrawX(options), baselineY);
  return width;
}

export function measureImageTextBlock(lines: string[], options: ImageTextRenderOptions): { width: number; height: number } {
  const prepared = getCanvasContext(1, 1);
  if (!prepared) {
    return { width: 0, height: 0 };
  }

  const { ctx } = prepared;
  applyTextCanvasState(ctx, options);

  let width = 0;
  for (const line of lines) {
    width = Math.max(width, measureLineWidth(ctx, line));
  }

  const height = Math.min(
    options.maxHeightPx,
    options.paddingPx * 2 + lines.length * options.lineHeightPx,
  );

  return { width, height };
}

function truncateToMeasuredWidthWithContext(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number,
): string {
  if (measureLineWidth(ctx, text) <= maxWidthPx) {
    return text;
  }

  const graphemes = splitGraphemes(text);
  const ellipsis = "…";
  let output = "";

  for (const part of graphemes) {
    const next = `${output}${part}`;
    if (measureLineWidth(ctx, `${next}${ellipsis}`) > maxWidthPx) {
      break;
    }
    output = next;
  }

  if (!output) {
    return measureLineWidth(ctx, ellipsis) <= maxWidthPx ? ellipsis : "";
  }

  return `${output}${ellipsis}`;
}

export function truncateToMeasuredWidth(text: string, maxWidthPx: number, font: string): string {
  const prepared = getCanvasContext(1, 1);
  if (!prepared) {
    return text;
  }

  const { ctx } = prepared;
  ctx.font = font;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  return truncateToMeasuredWidthWithContext(ctx, text, maxWidthPx);
}

export function renderImageTextBlock(lines: string[], options: ImageTextRenderOptions): ImageTextPayload | undefined {
  const prepared = getCanvasContext(options.maxWidthPx, options.maxHeightPx);
  if (!prepared) {
    return undefined;
  }

  const { canvas, ctx } = prepared;
  applyTextCanvasState(ctx, options);
  fillCanvasBackground(ctx, options);

  let measuredWidth = 0;
  const maxTextWidth = options.maxWidthPx - options.paddingPx * 2;

  lines.forEach((line, index) => {
    const baselineY = options.paddingPx + index * options.lineHeightPx + options.fontPx;
    const safeLine = truncateToMeasuredWidthWithContext(ctx, line, maxTextWidth);
    measuredWidth = Math.max(measuredWidth, drawStaticLine(ctx, safeLine, options, baselineY));
  });

  drawDebugGuides(ctx, options, measuredWidth);
  return createPayloadFromCanvas(canvas);
}

export function renderTitleImagePayload(
  firstLine: string,
  secondLine: string,
  options: ImageTextRenderOptions,
  offsetPx = 0,
  gapPx = DEFAULT_IMAGE_TEXT_MARQUEE_GAP_PX,
): { payload?: ImageTextPayload; textWidthPx: number; usesMarquee: boolean; loopWidthPx: number } {
  const prepared = getCanvasContext(options.maxWidthPx, options.maxHeightPx);
  if (!prepared) {
    return { payload: undefined, textWidthPx: 0, usesMarquee: false, loopWidthPx: 0 };
  }

  const { canvas, ctx } = prepared;
  applyTextCanvasState(ctx, options);
  fillCanvasBackground(ctx, options);

  const drawable = getDrawableMetrics(options);
  const drawX = getTextDrawX(options);
  const availableWidth = options.maxWidthPx - options.paddingPx * 2;

  const firstBaselineY = options.paddingPx + options.fontPx;
  const secondBaselineY = options.paddingPx + options.lineHeightPx + options.fontPx;

  const safeSecondLine = truncateToMeasuredWidthWithContext(ctx, secondLine, availableWidth);
  const secondWidth = drawStaticLine(ctx, safeSecondLine, options, secondBaselineY);

  const firstLineWidth = measureLineWidth(ctx, firstLine);
  const usesMarquee = firstLineWidth > availableWidth;

  if (!usesMarquee) {
    drawStaticLine(ctx, firstLine, options, firstBaselineY);
  } else {
    const loopWidthPx = firstLineWidth + gapPx;
    const startOffsetPx = ((offsetPx % loopWidthPx) + loopWidthPx) % loopWidthPx;

    ctx.save();
    ctx.beginPath();
    ctx.rect(drawable.left, options.paddingPx, availableWidth, options.lineHeightPx);
    ctx.clip();
    ctx.translate(-startOffsetPx, 0);
    ctx.fillStyle = getImageTextFillStyle(options);

    if (options.align === "left") {
      ctx.fillText(firstLine, drawable.left, firstBaselineY);
      ctx.fillText(firstLine, drawable.left + loopWidthPx, firstBaselineY);
    } else if (options.align === "right") {
      ctx.fillText(firstLine, drawable.right, firstBaselineY);
      ctx.fillText(firstLine, drawable.right + loopWidthPx, firstBaselineY);
    } else {
      ctx.fillText(firstLine, drawX, firstBaselineY);
      ctx.fillText(firstLine, drawX + loopWidthPx, firstBaselineY);
    }
    ctx.restore();
  }

  drawDebugGuides(ctx, options, Math.max(firstLineWidth, secondWidth));
  return {
    payload: createPayloadFromCanvas(canvas),
    textWidthPx: firstLineWidth,
    usesMarquee,
    loopWidthPx: firstLineWidth + gapPx,
  };
}

export function buildImageTextUpdate(
  containerID: number,
  containerName: string,
  format: ImageControlsSendFormat,
  payload: ImageTextPayload,
): ImageRawDataUpdate {
  const imageData =
    format === "png-uint8"
      ? payload.uint8
      : format === "png-number"
        ? payload.bytes
        : payload.base64;

  return new ImageRawDataUpdate({
    containerID,
    containerName,
    imageData,
  });
}

export function buildImageTextProbeResult(language: ImageTextLanguageCode, fontWeightOverride?: number): ImageTextProbeResult {
  const probeOptions = getDefaultImageTextRenderOptions(
    "status",
    language,
    320,
    80,
    "center",
    false,
    "black-green",
    fontWeightOverride,
  );
  const prepared = getCanvasContext(1, 1);
  if (!prepared) {
    return { fontStackUsed: probeOptions.fontStack, samples: [] };
  }

  const { ctx } = prepared;
  applyTextCanvasState(ctx, probeOptions);

  const samples: ProbeSample[] = [
    { label: "iiiiiiiiii", text: "iiiiiiiiii" },
    { label: "WWWWWWWWWW", text: "WWWWWWWWWW" },
    { label: "abcdefghij", text: "abcdefghij" },
    { label: "ABCDEFGHIJ", text: "ABCDEFGHIJ" },
    { label: "你好世界", text: "你好世界" },
    { label: "こんにちは", text: "こんにちは" },
    { label: "mix", text: "abc，中文 / テスト — 123" },
  ];

  return {
    fontStackUsed: probeOptions.fontStack,
    samples: samples.map((sample) => ({ text: sample.label, widthPx: measureLineWidth(ctx, sample.text) })),
  };
}

function getControlsImageFrame(
  displayLayout: DisplayTextLayout,
  alignMode: ImageTextAlignMode = "center",
): { x: number; y: number; width: number; height: number } {
  const width = Math.min(CONTROLS_IMAGE_WIDTH, displayLayout.width);
  const height = CONTROLS_IMAGE_HEIGHT;
  const x =
    alignMode === "left"
      ? displayLayout.x
      : alignMode === "right"
      ? displayLayout.x + Math.max(0, displayLayout.width - width)
        : displayLayout.x + Math.max(0, Math.floor((displayLayout.width - width) / 2));
  const controlsLineY = getNowPlayingRowFrames(displayLayout).controls.y;
  const y = controlsLineY + Math.max(0, Math.floor((LINE_HEIGHT - height) / 2));

  return { x, y, width, height };
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<[number, number]>,
): void {
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index][0], points[index][1]);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPrevIcon(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
  ctx.fillRect(centerX - 12, centerY - 9, 3, 18);
  drawTriangle(ctx, [
    [centerX + 9, centerY - 10],
    [centerX - 6, centerY],
    [centerX + 9, centerY + 10],
  ]);
}

function drawPlayIcon(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
  drawTriangle(ctx, [
    [centerX - 6, centerY - 11],
    [centerX + 10, centerY],
    [centerX - 6, centerY + 11],
  ]);
}

function drawPauseIcon(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
  ctx.fillRect(centerX - 7, centerY - 10, 4, 20);
  ctx.fillRect(centerX + 3, centerY - 10, 4, 20);
}

function drawNextIcon(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
  ctx.fillRect(centerX + 9, centerY - 9, 3, 18);
  drawTriangle(ctx, [
    [centerX - 9, centerY - 10],
    [centerX + 6, centerY],
    [centerX - 9, centerY + 10],
  ]);
}

function drawLabelGlyph(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, label: string): void {
  ctx.save();
  ctx.font = "600 12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, centerX, centerY + 1);
  ctx.restore();
}

function createControlsPngPayload(
  focusIndex: number,
  isPlaying: boolean,
  width: number,
  height: number,
  stylePreset: ImageTextStylePreset,
  alignMode: ImageTextAlignMode = "center",
  variant: ControlGlyphVariant = "solid",
  shuffleEnabled = false,
  repeatMode: ControlsRepeatMode = "off",
): ImageTextPayload | undefined {
  const prepared = getCanvasContext(width, height);
  if (!prepared) {
    return undefined;
  }

  const { canvas, ctx } = prepared;
  const background =
    stylePreset === "white-black"
      ? "#ffffff"
      : stylePreset === "black-green" || stylePreset === "black-white"
        ? "#000000"
        : "transparent";
  const foreground =
    stylePreset === "transparent-green" || stylePreset === "black-green"
      ? "#1DB954"
      : stylePreset === "transparent-white" || stylePreset === "black-white"
        ? "#ffffff"
        : "#000000";

  if (background === "transparent") {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.fillStyle = foreground;
  ctx.strokeStyle = foreground;
  ctx.lineWidth = 2;

  const labels = getDecoratedControlLabels(variant, isPlaying, shuffleEnabled, repeatMode);
  const slotCount = labels.length;
  const contentWidth = Math.max(40, width - 12);
  const groupWidth = Math.min(contentWidth, slotCount * 34);
  const groupLeft =
    alignMode === "left"
      ? 6
      : alignMode === "right"
        ? width - 6 - groupWidth
        : Math.round((width - groupWidth) / 2);
  const slotStep = groupWidth / slotCount;
  const centers = labels.map((_, index) => Math.round(groupLeft + slotStep * (index + 0.5)));
  const slotWidth = Math.max(24, Math.round(slotStep) - 4);
  const slotHeight = Math.min(30, height - 6);
  const centerY = Math.floor(height / 2);

  centers.forEach((centerX, index) => {
    if (index === focusIndex) {
      const left = Math.round(centerX - slotWidth / 2);
      const top = Math.round(centerY - slotHeight / 2);
      ctx.strokeRect(left, top, slotWidth, slotHeight);
    }
  });

  labels.forEach((label, index) => {
    drawLabelGlyph(ctx, centers[index], centerY, label);
  });

  return createPayloadFromCanvas(canvas);
}

function centerTextLine(
  content: string,
  widthChars = CENTERED_TEXT_CHARS,
  offsetChars = 0,
  preserveWhitespace = false,
  alignMode: TextAlignMode = "center",
): string {
  const centerSingleLine = (line: string): string => {
    const visible = preserveWhitespace ? line : line.trim();
    if (!visible) {
      return line;
    }

    const extraOffset = Math.max(0, Math.round(offsetChars));
    if (alignMode === "left") {
      return `${" ".repeat(extraOffset)}${visible}`;
    }

    if (visible.length >= widthChars) {
      return `${" ".repeat(extraOffset)}${visible}`;
    }

    const leftPad =
      alignMode === "right"
        ? widthChars - visible.length + extraOffset
        : Math.floor((widthChars - visible.length) / 2) + extraOffset;
    return `${" ".repeat(Math.max(0, leftPad))}${visible}`;
  };

  return content
    .split("\n")
    .map((line) => centerSingleLine(line))
    .join("\n");
}

function getIconMatrix(kind: IconKind): IconMatrix {
  switch (kind) {
    case "prev":
      return PREV_ICON;
    case "play":
      return PLAY_ICON;
    case "pause":
      return PAUSE_ICON;
    case "next":
      return NEXT_ICON;
  }
}

function scaleIconMatrix(matrix: IconMatrix, pixelSize: number, onChar: string): string[] {
  const scaled: string[] = [];

  for (const row of matrix) {
    const expanded = row
      .split("")
      .map((pixel) => (pixel === "1" ? onChar.repeat(pixelSize) : " ".repeat(pixelSize)))
      .join("");

    for (let i = 0; i < pixelSize; i += 1) {
      scaled.push(expanded);
    }
  }

  return scaled;
}

function withFocusFrame(lines: string[], focused: boolean): string[] {
  const width = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const padded = lines.map((line) => line.padEnd(width, " "));

  if (!focused) {
    return [
      " ".repeat(width + 2),
      ...padded.map((line) => ` ${line} `),
      " ".repeat(width + 2),
    ];
  }

  return [
    `+${"-".repeat(width)}+`,
    ...padded.map((line) => `|${line}|`),
    `+${"-".repeat(width)}+`,
  ];
}

function composeIconBlocks(blocks: string[][], gap: number, offsetX: number, offsetY: number): string {
  const height = blocks[0]?.length ?? 0;
  const gapText = " ".repeat(gap);
  const leftPad = " ".repeat(offsetX);
  const outputLines: string[] = [];

  for (let i = 0; i < offsetY; i += 1) {
    outputLines.push("");
  }

  for (let row = 0; row < height; row += 1) {
    const merged = blocks.map((block) => block[row] ?? "").join(gapText);
    outputLines.push(`${leftPad}${merged}`);
  }

  return outputLines.join("\n");
}

function buildPixelControlsArt(
  focusIndex: number,
  isPlaying: boolean,
  layout: Partial<PixelControlsLayout> | undefined,
): string {
  const normalized = normalizePixelControlsLayout(layout);
  const iconKinds: IconKind[] = ["prev", isPlaying ? "pause" : "play", "next"];

  const blocks = iconKinds.map((kind, index) => {
    const matrix = getIconMatrix(kind);
    const scaled = scaleIconMatrix(matrix, normalized.pixelSize, normalized.onChar);
    return withFocusFrame(scaled, index === focusIndex);
  });

  return composeIconBlocks(blocks, normalized.iconGap, normalized.offsetX, normalized.offsetY);
}

function buildGlyphControlsLine(
  focusIndex: number,
  isPlaying: boolean,
  variant: ControlGlyphVariant,
  widthChars: number,
  layout?: Partial<PixelControlsLayout>,
  textAlignMode: TextAlignMode = "center",
  textDecorations?: {
    decorateTextControls?: boolean;
    shuffleEnabled?: boolean;
    repeatMode?: ControlsRepeatMode;
  },
): string {
  const normalized = normalizePixelControlsLayout(layout);
  const gapText = " ".repeat(normalized.iconGap);
  if (!textDecorations?.decorateTextControls) {
    const transportLabels = getControlGlyphLabels(variant, isPlaying);
    const middle = transportLabels
      .map((label, index) => {
        if (index === focusIndex) {
          return `[${label}]`;
        }
        return ` ${label} `;
      })
      .join(gapText);
    return centerTextLine(middle, widthChars, normalized.offsetX, false, textAlignMode);
  }

  const labels = getDecoratedControlLabels(
    variant,
    isPlaying,
    textDecorations.shuffleEnabled,
    textDecorations.repeatMode,
  );
  const content = labels
    .map((label, index) => {
      if (index === focusIndex) {
        return `[${label}]`;
      }
      return ` ${label} `;
    })
    .join(gapText);
  return centerTextLine(content, widthChars, normalized.offsetX, false, textAlignMode);
}

function assertContainerRules(textContainers: TextContainerProperty[], imageContainers: ImageContainerProperty[]): void {
  const captureCount = textContainers.filter((container) => container.isEventCapture === 1).length;
  const totalCount = textContainers.length + imageContainers.length;
  if (totalCount > 12) {
    throw new Error(`Even container count exceeded: ${totalCount} > 12`);
  }

  if (captureCount !== 1) {
    throw new Error(`Even capture container count invalid: ${captureCount}, expected 1`);
  }
}

function repairContainers(pageSpec: GlassesPageSpec): GlassesPageSpec {
  const normalizedText = (pageSpec.textObject ?? []).map((container) => {
    const cloned = cloneContainer(container);
    cloned.isEventCapture = 0;
    return cloned;
  });
  const normalizedImages = (pageSpec.imageObject ?? []).map(cloneImageContainer);

  let capture = normalizedText.find((container) => container.containerName === CAPTURE_NAME) ?? null;
  if (!capture) {
    capture = makeHiddenCaptureContainer(4);
  }
  capture.isEventCapture = 1;

  const nonCaptureText = normalizedText.filter((container) => container.containerName !== CAPTURE_NAME);
  const displayEntries = [
    ...nonCaptureText.map((container) => ({ kind: "text" as const, containerID: container.containerID ?? 0, text: container })),
    ...normalizedImages.map((container) => ({ kind: "image" as const, containerID: container.containerID ?? 0, image: container })),
  ].sort((left, right) => left.containerID - right.containerID);

  const keptEntries = displayEntries.slice(0, 11);
  const repairedText = keptEntries
    .filter((entry): entry is { kind: "text"; containerID: number; text: TextContainerProperty } => entry.kind === "text")
    .map((entry) => cloneContainer(entry.text));
  const repairedImages = keptEntries
    .filter((entry): entry is { kind: "image"; containerID: number; image: ImageContainerProperty } => entry.kind === "image")
    .map((entry) => cloneImageContainer(entry.image));

  repairedText.push(cloneContainer(capture));
  const containerTotalNum = repairedText.length + repairedImages.length;

  return {
    ...pageSpec,
    containerTotalNum,
    textObject: repairedText,
    imageObject: repairedImages.length > 0 ? repairedImages : undefined,
  };
}

function computeRebuildKey(textContainers: TextContainerProperty[], imageContainers: ImageContainerProperty[]): string {
  return JSON.stringify({
    text: textContainers.map((container) => ({
      name: container.containerName,
      x: container.xPosition,
      y: container.yPosition,
      width: container.width,
      height: container.height,
      borderWidth: container.borderWidth,
      borderColor: container.borderColor,
      borderRadius: getContainerBorderRadius(container),
      paddingLength: container.paddingLength,
      content: container.content,
      capture: container.isEventCapture,
    })),
    image: imageContainers.map((container) => ({
      name: container.containerName,
      x: container.xPosition,
      y: container.yPosition,
      width: container.width,
      height: container.height,
    })),
  });
}

export function computeContainerShapeKey(shape: LogicalShapeEntry[]): GlassesContainerShapeKey {
  return shape.map((entry) => `${entry.slot}:${entry.type}`).join("|");
}

export function computeLogicalShapeEntries(
  layoutMode: GlassesLayoutMode,
  controlsMode: "text" | "image",
  uiVisible: boolean,
): LogicalShapeEntry[] {
  return [
    { slot: "title", type: layoutMode === "status-title-image" ? "image" : "text" },
    { slot: "status", type: layoutMode === "status-image" || layoutMode === "status-title-image" ? "image" : "text" },
    { slot: "controls", type: controlsMode === "image" && uiVisible ? "image" : "text" },
    { slot: "capture", type: "text" },
  ];
}

export function validateOrRepairContainers(mode: UiMode, pageSpec: GlassesPageSpec): GlassesPageSpec {
  const textContainers = (pageSpec.textObject ?? []).map(cloneContainer);
  const imageContainers = (pageSpec.imageObject ?? []).map(cloneImageContainer);

  if (mode === "dev") {
    assertContainerRules(textContainers, imageContainers);
    return {
      ...pageSpec,
      containerTotalNum: textContainers.length + imageContainers.length,
      textObject: textContainers.length > 0 ? textContainers : undefined,
      imageObject: imageContainers.length > 0 ? imageContainers : undefined,
      rebuildKey: computeRebuildKey(textContainers, imageContainers),
    };
  }

  const repaired = repairContainers({
    ...pageSpec,
    containerTotalNum: textContainers.length + imageContainers.length,
    textObject: textContainers,
    imageObject: imageContainers,
  });

  return {
    ...repaired,
    rebuildKey: computeRebuildKey(repaired.textObject ?? [], repaired.imageObject ?? []),
  };
}

export function buildControlsLine(
  focusIndex: number,
  uiVisible: boolean,
  isPlaying: boolean,
  variant: ControlGlyphVariant = "solid",
  layout?: Partial<PixelControlsLayout>,
  widthChars = CENTERED_TEXT_CHARS,
  textAlignMode: TextAlignMode = "center",
  textDecorations?: {
    decorateTextControls?: boolean;
    shuffleEnabled?: boolean;
    repeatMode?: ControlsRepeatMode;
  },
): string {
  if (!uiVisible) {
    return "";
  }

  return buildGlyphControlsLine(focusIndex, isPlaying, variant, widthChars, layout, textAlignMode, textDecorations);
}

export function computeGlassesLayoutMode(imageTextMode: GlassesImageTextMode): GlassesLayoutMode {
  if (imageTextMode === "status+title") {
    return "status-title-image";
  }
  if (imageTextMode === "status") {
    return "status-image";
  }
  return "text-only";
}

export function buildAuthRequiredPage(
  errorLine?: string,
  frame?: BorderFrameSettings,
  textAlignMode: TextAlignMode = "center",
  language: ImageTextLanguageCode = "en",
): GlassesPageSpec {
  const text = AUTH_REQUIRED_PAGE_TEXT[language] ?? AUTH_REQUIRED_PAGE_TEXT.en;
  const lineCount = errorLine ? 3 : 2;
  const displayLayout = getDisplayTextLayout(lineCount, frame);
  const containers: TextContainerProperty[] = [
    makeDisplayTextContainer(
      1,
      "auth-title",
      displayLayout.x,
      displayLayout.topY + LINE_HEIGHT * 0,
      displayLayout.width,
      centerTextLine(text.title, displayLayout.widthChars, 0, false, textAlignMode),
    ),
    makeDisplayTextContainer(
      2,
      "auth-guidance",
      displayLayout.x,
      displayLayout.topY + LINE_HEIGHT * 1,
      displayLayout.width,
      centerTextLine(text.guidance, displayLayout.widthChars, 0, false, textAlignMode),
    ),
  ];

  if (errorLine) {
    containers.push(
      makeDisplayTextContainer(
        3,
        "auth-error",
        displayLayout.x,
        displayLayout.topY + LINE_HEIGHT * 2,
        displayLayout.width,
        centerTextLine(errorLine, displayLayout.widthChars, 0, false, textAlignMode),
      ),
    );
  }

  const borderContainerId = containers.length + 1;
  const captureContainerId = borderContainerId + 1;
  const authBorder = makeBorderFrameContainer(borderContainerId, frame);
  containers.push(authBorder);
  containers.push(makeHiddenCaptureContainer(captureContainerId, frame));

  return validateOrRepairContainers(import.meta.env.DEV ? "dev" : "prod", {
    containerTotalNum: containers.length,
    textObject: containers,
    shapeEntries: [
      { slot: "title", type: "text" },
      { slot: "status", type: "text" },
      { slot: "capture", type: "text" },
    ],
    rebuildKey: "",
  });
}

export function buildSelectableTextPage(input: SelectableTextPageRenderInput): GlassesPageSpec {
  const showTitle = input.showTitle !== false;
  const showFooter = input.showFooter !== false;
  const listLineCount = Math.max(1, input.listLineCount ?? input.listLines.length ?? 1);
  const displayLayout = getDisplayTextLayout(showTitle || showFooter ? 3 : listLineCount, input.frame);
  const titleFrame = showTitle
    ? getRowFrame(displayLayout, 0)
    : {
        x: displayLayout.x,
        y: PAGE_TOP,
        width: displayLayout.width,
        height: LINE_HEIGHT,
      };
  const listFrame = showTitle || showFooter
    ? getRowFrame(displayLayout, 1)
    : {
        x: displayLayout.x,
        y: displayLayout.innerY,
        width: displayLayout.width,
        height: displayLayout.innerHeight,
      };
  const footerFrame = showFooter
    ? getRowFrame(displayLayout, 2)
    : {
        x: displayLayout.x,
        y: CANVAS_HEIGHT - LINE_HEIGHT,
        width: displayLayout.width,
        height: LINE_HEIGHT,
      };
  const textAlignMode = input.textAlignMode ?? "left";
  const titleContent = showTitle
    ? centerTextLine(`${input.pageTitle} ${input.countLabel}`.trim(), displayLayout.widthChars, 0, false, textAlignMode)
    : "";
  const listContent = centerTextLine(input.listLines.join("\n"), displayLayout.widthChars, 0, false, textAlignMode);
  const footerContent = showFooter
    ? centerTextLine(`${input.footerLine1}\n${input.footerLine2}`, displayLayout.widthChars, 0, false, textAlignMode)
    : "";
  const containers: TextContainerProperty[] = [
    makeDisplayTextContainer(1, input.containerNames.title, titleFrame.x, titleFrame.y, titleFrame.width, titleContent),
    makeDisplayTextContainer(2, input.containerNames.list, listFrame.x, listFrame.y, listFrame.width, listContent, listFrame.height),
    makeDisplayTextContainer(3, input.containerNames.footer, footerFrame.x, footerFrame.y, footerFrame.width, footerContent),
  ];
  const selectableBorder = makeBorderFrameContainer(4, input.frame);
  containers.push(selectableBorder);
  containers.push(makeHiddenCaptureContainer(5, input.frame));

  return validateOrRepairContainers(import.meta.env.DEV ? "dev" : "prod", {
    containerTotalNum: containers.length,
    textObject: containers,
    shapeEntries: [
      { slot: "title", type: "text" },
      { slot: "status", type: "text" },
      { slot: "controls", type: "text" },
      { slot: "capture", type: "text" },
    ],
    rebuildKey: "",
  });
}

export function buildPlaylistPage(input: SelectableTextPageRenderInput): GlassesPageSpec {
  return buildSelectableTextPage(input);
}

export function buildDevicesPage(input: SelectableTextPageRenderInput): GlassesPageSpec {
  return buildSelectableTextPage(input);
}

function createLegacyControlsPlan(
  focusIndex: number,
  isPlaying: boolean,
  imageSendFormat: ImageControlsSendFormat,
  imageFrame: { x: number; y: number; width: number; height: number },
  stylePreset: ImageTextStylePreset,
  alignMode: ImageTextAlignMode,
  variant: ControlGlyphVariant,
  shuffleEnabled: boolean,
  repeatMode: ControlsRepeatMode,
): { container: ImageContainerProperty; plan?: ImageRowUpdatePlan } {
  const container = new ImageContainerProperty({
    xPosition: imageFrame.x,
    yPosition: imageFrame.y,
    width: imageFrame.width,
    height: imageFrame.height,
    containerID: 3,
    containerName: CONTROLS_IMAGE_CONTAINER_NAME,
  });

  const payload = createControlsPngPayload(
    focusIndex,
    isPlaying,
    imageFrame.width,
    imageFrame.height,
    stylePreset,
    alignMode,
    variant,
    shuffleEnabled,
    repeatMode,
  );
  if (!payload) {
    return { container };
  }

  return {
    container,
    plan: {
      rowKind: "controls",
      renderer: "legacy-controls",
      update: buildImageTextUpdate(3, CONTROLS_IMAGE_CONTAINER_NAME, imageSendFormat, payload),
      payload,
      previewDataUrl: payload.dataUrl,
    },
  };
}

function createCompositeNowPlayingPlan(
  input: NowPlayingRenderInput,
  displayLayout: DisplayTextLayout,
  imageSendFormat: ImageControlsSendFormat,
  imageTextStyle: ImageTextStylePreset,
): { container: ImageContainerProperty; plan?: ImageRowUpdatePlan } {
  const frame = getCompositeImageFrame(displayLayout);
  const container = new ImageContainerProperty({
    xPosition: frame.x,
    yPosition: frame.y,
    width: frame.width,
    height: frame.height,
    containerID: 1,
    containerName: COMPOSITE_IMAGE_CONTAINER_NAME,
  });

  const language = input.language ?? "en";
  const align = input.imageTextAlignMode ?? "center";
  const titleLines = input.titleImageLines ?? input.title.split("\n");
  const statusLines = input.statusImageLines ?? input.statusLine.split("\n");
  const options = getDefaultImageTextRenderOptions(
    "status",
    language,
    frame.width,
    frame.height,
    align,
    input.imageTextDiagnostics,
    imageTextStyle,
    input.imageTextFontWeight,
  );
  options.fontPx = 12;
  options.lineHeightPx = 16;
  options.paddingPx = 8;

  const prepared = getCanvasContext(frame.width, frame.height);
  if (!prepared) {
    return { container };
  }

  const { canvas, ctx } = prepared;
  applyTextCanvasState(ctx, options);
  fillCanvasBackground(ctx, options);

  const maxTextWidth = options.maxWidthPx - options.paddingPx * 2;
  const lines = [
    titleLines[0] ?? "",
    titleLines[1] ?? "",
    statusLines[0] ?? "",
    statusLines[1] ?? "",
    buildCompactControlsLine(
      input.focusIndex,
      input.uiVisible,
      input.isPlaying,
      input.controlsVariant ?? "solid",
      input.shuffleEnabled ?? false,
      input.repeatMode ?? "off",
    ),
  ];

  let measuredWidth = 0;
  lines.forEach((line, index) => {
    const baselineY = options.paddingPx + index * options.lineHeightPx + options.fontPx;
    const safeLine = truncateToMeasuredWidthWithContext(ctx, line, maxTextWidth);
    measuredWidth = Math.max(measuredWidth, drawStaticLine(ctx, safeLine, options, baselineY));
  });

  drawDebugGuides(ctx, options, measuredWidth);
  const payload = createPayloadFromCanvas(canvas);
  if (!payload) {
    return { container };
  }

  return {
    container,
    plan: {
      rowKind: "controls",
      renderer: "composite-image",
      update: buildImageTextUpdate(1, COMPOSITE_IMAGE_CONTAINER_NAME, imageSendFormat, payload),
      payload,
      previewDataUrl: payload.dataUrl,
    },
  };
}

export function buildStatusImagePlan(args: {
  lines: string[];
  frame: DisplayRowFrame;
  language: ImageTextLanguageCode;
  align: ImageTextAlignMode;
  format: ImageControlsSendFormat;
  debugGuides?: boolean;
  stylePreset?: ImageTextStylePreset;
  fontWeightOverride?: number;
}): ImageRowUpdatePlan | undefined {
  const options = getDefaultImageTextRenderOptions(
    "status",
    args.language,
    args.frame.width,
    args.frame.height,
    args.align,
    args.debugGuides,
    args.stylePreset ?? "black-green",
    args.fontWeightOverride,
  );
  const payload = renderImageTextBlock(args.lines, options);
  if (!payload) {
    return undefined;
  }

  return {
    rowKind: "status",
    renderer: "image-text",
    update: buildImageTextUpdate(2, STATUS_IMAGE_CONTAINER_NAME, args.format, payload),
    payload,
  };
}

export function buildTitleImagePlan(args: {
  firstLine: string;
  secondLine: string;
  frame: DisplayRowFrame;
  language: ImageTextLanguageCode;
  align: ImageTextAlignMode;
  format: ImageControlsSendFormat;
  offsetPx?: number;
  gapPx?: number;
  debugGuides?: boolean;
  stylePreset?: ImageTextStylePreset;
  fontWeightOverride?: number;
}): ImageRowUpdatePlan | undefined {
  const options = getDefaultImageTextRenderOptions(
    "title",
    args.language,
    args.frame.width,
    args.frame.height,
    args.align,
    args.debugGuides,
    args.stylePreset ?? "black-green",
    args.fontWeightOverride,
  );
  const renderResult = renderTitleImagePayload(
    args.firstLine,
    args.secondLine,
    options,
    args.offsetPx ?? 0,
    args.gapPx ?? DEFAULT_IMAGE_TEXT_MARQUEE_GAP_PX,
  );

  if (!renderResult.payload) {
    return undefined;
  }

  return {
    rowKind: "title",
    renderer: "image-text",
    update: buildImageTextUpdate(1, TITLE_IMAGE_CONTAINER_NAME, args.format, renderResult.payload),
    payload: renderResult.payload,
    textWidthPx: renderResult.textWidthPx,
    usesMarquee: renderResult.usesMarquee,
    loopWidthPx: renderResult.loopWidthPx,
  };
}

function buildNowPlayingTextOnlyPage(input: NowPlayingRenderInput): GlassesPageSpec {
  const displayLayout = getDisplayTextLayout(3, input.frame);
  const rowFrames = getNowPlayingRowFrames(displayLayout);
  const titleRowFrame = rowFrames.title;
  const statusRowFrame = rowFrames.status;
  const textContainers: TextContainerProperty[] = [];
  const imageContainers: ImageContainerProperty[] = [];
  const imagePlans: ImageRowUpdatePlan[] = [];

  const imageTextMode = input.imageTextMode ?? "off";
  const layoutMode = computeGlassesLayoutMode(imageTextMode);
  const language = input.language ?? "en";
  const imageTextAlignMode = input.imageTextAlignMode ?? "center";
  const imageSendFormat = input.imageSendFormat ?? "png-uint8";
  const imageTextStyle = input.imageTextStyle ?? "black-green";

  const titleLines = input.titleImageLines ?? input.title.split("\n");
  const statusLines = input.statusImageLines ?? input.statusLine.split("\n");
  const titleLine1 = titleLines[0] ?? "";
  const titleLine2 = titleLines[1] ?? "";
  const statusLine1 = statusLines[0] ?? "";
  const statusLine2 = statusLines[1] ?? "";
  const titleImageFrame = fitImageContainerFrame(titleRowFrame);
  const statusImageFrame = fitImageContainerFrame(statusRowFrame);

  if (layoutMode === "status-title-image") {
    imageContainers.push(
      makeDisplayImageContainer(
        1,
        TITLE_IMAGE_CONTAINER_NAME,
        titleImageFrame.x,
        titleImageFrame.y,
        titleImageFrame.width,
        titleImageFrame.height,
      ),
    );
    const titlePlan = buildTitleImagePlan({
      firstLine: titleLine1,
      secondLine: titleLine2,
      frame: titleImageFrame,
      language,
      align: imageTextAlignMode,
      format: imageSendFormat,
      offsetPx: input.titleImageOffsetPx ?? 0,
      gapPx: input.titleImageGapPx ?? DEFAULT_IMAGE_TEXT_MARQUEE_GAP_PX,
      debugGuides: input.imageTextDiagnostics,
      stylePreset: input.imageTextStyle ?? "white-black",
      fontWeightOverride: input.imageTextFontWeight,
    });
    if (titlePlan) {
      imagePlans.push(titlePlan);
    }
  } else {
    textContainers.push(
      makeDisplayTextContainer(
        1,
        "np-title",
        titleRowFrame.x,
        titleRowFrame.y,
        titleRowFrame.width,
        centerTextLine(input.title, displayLayout.widthChars, 0, true, input.textAlignMode ?? "center"),
      ),
    );
  }

  if (layoutMode === "status-image" || layoutMode === "status-title-image") {
    imageContainers.push(
      makeDisplayImageContainer(
        2,
        STATUS_IMAGE_CONTAINER_NAME,
        statusImageFrame.x,
        statusImageFrame.y,
        statusImageFrame.width,
        statusImageFrame.height,
      ),
    );
    const statusPlan = buildStatusImagePlan({
      lines: [statusLine1, statusLine2].filter((line, index) => line.length > 0 || index === 0),
      frame: statusImageFrame,
      language,
      align: imageTextAlignMode,
      format: imageSendFormat,
      debugGuides: input.imageTextDiagnostics,
      stylePreset: input.imageTextStyle ?? "white-black",
      fontWeightOverride: input.imageTextFontWeight,
    });
    if (statusPlan) {
      imagePlans.push(statusPlan);
    }
  } else {
    textContainers.push(
      makeDisplayTextContainer(
        2,
        "np-status",
        statusRowFrame.x,
        statusRowFrame.y,
        statusRowFrame.width,
        centerTextLine(input.statusLine, displayLayout.widthChars, 0, false, input.textAlignMode ?? "center"),
      ),
    );
  }

  const shouldUseImageControls = input.uiVisible && input.useImageControls === true;
  if (shouldUseImageControls) {
    const controlsImageAlignMode = input.controlsImageAlignMode ?? "center";
    const imageFrame = getControlsImageFrame(displayLayout, controlsImageAlignMode);
    const legacyControls = createLegacyControlsPlan(
      input.focusIndex,
      input.isPlaying,
      imageSendFormat,
      imageFrame,
      imageTextStyle,
      controlsImageAlignMode,
      input.controlsVariant ?? "solid",
      input.shuffleEnabled ?? false,
      input.repeatMode ?? "off",
    );
    imageContainers.push(legacyControls.container);
    if (legacyControls.plan) {
      imagePlans.push(legacyControls.plan);
    }
  } else {
    const controlsLine = buildControlsLine(
      input.focusIndex,
      input.uiVisible,
      input.isPlaying,
      input.controlsVariant ?? "solid",
      input.controlsLayout,
      displayLayout.widthChars,
      input.textAlignMode ?? "center",
      {
        decorateTextControls: input.decorateTextControls === true,
        shuffleEnabled: input.shuffleEnabled,
        repeatMode: input.repeatMode,
      },
    );
    textContainers.push(
      makeDisplayTextContainer(3, "np-controls", rowFrames.controls.x, rowFrames.controls.y, rowFrames.controls.width, controlsLine),
    );
  }

  const nowPlayingBorder = makeBorderFrameContainer(4, input.frame);
  textContainers.push(nowPlayingBorder);
  textContainers.push(makeHiddenCaptureContainer(5, input.frame));

  const shapeEntries = computeLogicalShapeEntries(layoutMode, shouldUseImageControls ? "image" : "text", input.uiVisible);

  return validateOrRepairContainers(import.meta.env.DEV ? "dev" : "prod", {
    containerTotalNum: textContainers.length + imageContainers.length,
    textObject: textContainers,
    imageObject: imageContainers.length > 0 ? imageContainers : undefined,
    imagePlans,
    shapeEntries,
    rebuildKey: computeRebuildKey(textContainers, imageContainers),
  });
}

function buildNowPlayingAlbumArtPage(input: NowPlayingRenderInput): GlassesPageSpec {
  const displayLayout = getDisplayTextLayout(3, input.frame);
  const textAlignMode = input.textAlignMode ?? "left";
  const albumSize = clampInt(input.albumArtSizePx ?? 100, 20, 144, 100);
  const gap = 15;
  const titleY = Math.max(PAGE_TOP + 8, displayLayout.topY - 8);
  const albumX = displayLayout.x;
  const albumY = titleY;
  const titleX = albumX + albumSize + gap;
  const titleWidth = Math.max(80, displayLayout.x + displayLayout.width - titleX);
  const progressY = Math.min(CANVAS_HEIGHT - LINE_HEIGHT * 2, albumY + albumSize + 8);
  const controlsY = Math.min(CANVAS_HEIGHT - LINE_HEIGHT, progressY + LINE_HEIGHT);

  const textContainers: TextContainerProperty[] = [
    makeDisplayTextContainer(
      2,
      "np-title",
      titleX,
      titleY,
      titleWidth,
      centerTextLine(input.title, estimateCenteredChars(titleWidth), 0, true, textAlignMode),
      albumSize,
    ),
    makeDisplayTextContainer(
      3,
      "np-status",
      displayLayout.x,
      progressY,
      displayLayout.width,
      input.statusLine,
    ),
    makeDisplayTextContainer(
      4,
      "np-controls",
      displayLayout.x,
      controlsY,
      displayLayout.width,
      buildControlsLine(
        input.focusIndex,
        input.uiVisible,
        input.isPlaying,
        input.controlsVariant ?? "solid",
        input.controlsLayout,
        displayLayout.widthChars,
        textAlignMode,
        {
          decorateTextControls: true,
          shuffleEnabled: input.shuffleEnabled,
          repeatMode: input.repeatMode,
        },
      ),
    ),
  ];
  const imageContainers: ImageContainerProperty[] = [
    makeDisplayImageContainer(1, "np-album", albumX, albumY, albumSize, albumSize),
  ];

  const nowPlayingBorder = makeBorderFrameContainer(5, input.frame);
  textContainers.push(nowPlayingBorder);
  textContainers.push(makeHiddenCaptureContainer(6, input.frame));

  return validateOrRepairContainers(import.meta.env.DEV ? "dev" : "prod", {
    containerTotalNum: textContainers.length + imageContainers.length,
    textObject: textContainers,
    imageObject: imageContainers,
    imagePlans: [],
    shapeEntries: [
      { slot: "title", type: "image" },
      { slot: "status", type: "text" },
      { slot: "controls", type: "text" },
      { slot: "capture", type: "text" },
    ],
    rebuildKey: computeRebuildKey(textContainers, imageContainers),
  });
}

export function buildNowPlayingPage(input: NowPlayingRenderInput): GlassesPageSpec {
  if (input.orchestrationMode === "album-art") {
    return buildNowPlayingAlbumArtPage(input);
  }
  return buildNowPlayingTextOnlyPage(input);
}

export function getMarqueeText(fullTitle: string, offset: number, windowChars: number): string {
  if (fullTitle.length <= windowChars) {
    return fullTitle;
  }

  const gap = "   ";
  const text = `${fullTitle}${gap}`;
  const start = offset % text.length;
  const doubled = `${text}${text}`;

  return doubled.slice(start, start + windowChars);
}

export function buildTitleUpgrade(
  content: string,
  frame?: BorderFrameSettings,
  textAlignMode: TextAlignMode = "center",
): TextContainerUpgrade {
  const displayLayout = getDisplayTextLayout(3, frame);
  const centered = centerTextLine(content, displayLayout.widthChars, 0, true, textAlignMode);
  return new TextContainerUpgrade({
    containerID: 1,
    containerName: "np-title",
    contentOffset: 0,
    contentLength: centered.length,
    content: centered,
  });
}
