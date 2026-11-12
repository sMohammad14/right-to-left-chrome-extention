console.log("[RTL v5] background loaded");

const COLORS = { green: "#22c55e", red: "#ef4444", gray: "#9ca3af" };
const iconCache = new Map();

function buildIcon(color) {
  if (iconCache.has(color)) return iconCache.get(color);
  const set = {};
  for (const s of [16, 32, 48, 128]) {
    const canvas = new OffscreenCanvas(s, s);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, s, s);
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 0.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    set[s] = ctx.getImageData(0, 0, s, s);
  }
  iconCache.set(color, set);
  return set;
}

const RESTRICTED =
  /^(chrome|chrome-untrusted|edge|about|devtools|view-source|chrome-extension|moz-extension):|^https?:\/\/chromewebstore\.google\.com|^https?:\/\/chrome\.google\.com\/webstore/;

async function setTabIcon(tabId, color) {
  try {
    await chrome.action.setIcon({ tabId, imageData: buildIcon(color) });
  } catch (_) {}
}

async function refreshIcon(tabId) {
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }
  const url = tab.url || tab.pendingUrl || "";
  if (!url || RESTRICTED.test(url)) {
    return setTabIcon(tabId, COLORS.gray);
  }
  const key = "tab_" + tabId;
  const data = await chrome.storage.local.get(key);
  return setTabIcon(tabId, data[key] ? COLORS.green : COLORS.red);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("[RTL v5] bg got message:", msg, "from tab:", sender.tab?.id);
  if (msg && msg.type === "init") {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId == null) {
      sendResponse({ tabId: null, enabled: false });
      return;
    }
    const key = "tab_" + tabId;
    chrome.storage.local.get(key).then((d) => {
      const enabled = !!d[key];
      console.log("[RTL v5] init reply: tab", tabId, "enabled:", enabled);
      sendResponse({ tabId, enabled });
    });
    return true;
  }
  if (msg && msg.type === "updateIcon" && msg.tabId != null) {
    refreshIcon(msg.tabId);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => refreshIcon(tabId));
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading" || info.status === "complete" || info.url) {
    refreshIcon(tabId);
  }
});
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove("tab_" + tabId);
});
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) if (t.id != null) refreshIcon(t.id);
});
chrome.runtime.onStartup.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) if (t.id != null) refreshIcon(t.id);
});