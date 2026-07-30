import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mainSourceUrl = new URL("../app/src/main.ts", import.meta.url);
const glassesUiSourceUrl = new URL("../app/src/glasses-ui.ts", import.meta.url);

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

test("GlassesView exit, hide, and wake interaction contract", async () => {
  const [mainSource, glassesUiSource] = await Promise.all([
    readFile(mainSourceUrl, "utf8"),
    readFile(glassesUiSourceUrl, "utf8"),
  ]);

  assert.match(mainSource, /const NOW_PLAYING_CONTROL_COUNT = 8;/);
  assert.match(mainSource, /const NOW_PLAYING_DEFAULT_FOCUS_INDEX = 3;/);

  const decoratedLabels = sourceSection(
    glassesUiSource,
    "function getDecoratedControlLabels(",
    "function buildCompactControlsLine(",
  );
  assert.match(
    decoratedLabels,
    /playlistLabel,[\s\S]*shuffleEnabled[\s\S]*\.\.\.transportLabels,[\s\S]*repeatMode[\s\S]*hideLabel,[\s\S]*deviceLabel,/,
  );
  assert.ok(
    [...glassesUiSource.matchAll(/getDecoratedControlLabels\(/g)].length >= 4,
    "text and image control renderers must share the decorated eight-item labels",
  );
  assert.match(
    glassesUiSource,
    /const labels = getDecoratedControlLabels\([\s\S]*const slotCount = labels\.length;[\s\S]*const slotStep = groupWidth \/ slotCount;/,
  );

  const focusedControl = sourceSection(
    mainSource,
    "async function runFocusedControl(): Promise<void>",
    "async function setGlassesUiVisible(",
  );
  const hideBranchIndex = focusedControl.indexOf("if (state.focusIndex === 6)");
  const spotifyLockIndex = focusedControl.indexOf("if (controlInFlight");
  assert.notEqual(hideBranchIndex, -1);
  assert.ok(hideBranchIndex < spotifyLockIndex, "H must run before Spotify control handling");
  assert.match(
    focusedControl,
    /if \(state\.focusIndex === 6\) \{\s*await setGlassesUiVisible\(false\);\s*return;\s*\}/,
  );

  const eventHandler = sourceSection(
    mainSource,
    "async function handleEvenHubEvent(event: EvenHubEvent): Promise<void>",
    "async function initBridge(): Promise<void>",
  );
  const doubleClickIndex = eventHandler.indexOf(
    "if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT)",
  );
  const hiddenWakeIndex = eventHandler.indexOf("if (!state.uiVisible)");
  assert.notEqual(doubleClickIndex, -1);
  assert.notEqual(hiddenWakeIndex, -1);
  assert.ok(doubleClickIndex < hiddenWakeIndex, "hidden double-click must still request exit");
  assert.match(eventHandler, /await bridge\.shutDownPageContainer\(1\);/);
  assert.match(eventHandler, /catch \(error\) \{[\s\S]*system exit confirmation/);
  assert.doesNotMatch(eventHandler, /setGlassesUiVisible\(!state\.uiVisible\)/);
  assert.match(
    eventHandler,
    /if \(!state\.uiVisible\) \{[\s\S]*CLICK_EVENT[\s\S]*SCROLL_TOP_EVENT[\s\S]*SCROLL_BOTTOM_EVENT[\s\S]*await setGlassesUiVisible\(true\);[\s\S]*return;/,
  );

  const autoHide = sourceSection(
    mainSource,
    "function scheduleAutoHideIfNeeded(",
    "function restartGlassesStatusTicker(",
  );
  assert.match(autoHide, /void setGlassesUiVisible\(false\);/);

  const bridgeRefresh = sourceSection(
    mainSource,
    "async function refreshBridgeOnResume(force = false): Promise<void>",
    "function ensureFreshBuildQuery(): boolean",
  );
  assert.match(bridgeRefresh, /await bridge\.shutDownPageContainer\(0\);/);
  assert.doesNotMatch(bridgeRefresh, /shutDownPageContainer\(1\)/);

  assert.equal(
    [...mainSource.matchAll(/shutDownPageContainer\((\d)\)/g)].map((match) => match[1]).join(","),
    "1,0",
  );
  assert.doesNotMatch(mainSource, /双击：隐藏和显示|Double-click: hide\/show|ダブルクリック：非表示\/表示/);
  assert.match(mainSource, /H：隐藏 GlassesView/);
  assert.match(mainSource, /H: hide GlassesView/);
  assert.match(mainSource, /H：GlassesView を非表示/);
});
