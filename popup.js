console.log("[RTL v5] popup loaded");

const RESTRICTED =
  /^(chrome|chrome-untrusted|edge|about|devtools|view-source|chrome-extension|moz-extension):|^https?:\/\/chromewebstore\.google\.com|^https?:\/\/chrome\.google\.com\/webstore/;

const toggle = document.getElementById("toggle");
const statusEl = document.getElementById("status");
let tabId = null;
let key = null;

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) {
    toggle.disabled = true;
    statusEl.textContent = "تبی یافت نشد";
    return;
  }
  tabId = tab.id;
  key = "tab_" + tabId;
  console.log("[RTL v5] popup tab:", tabId, "url:", tab.url);

  const url = tab.url || tab.pendingUrl || "";
  if (RESTRICTED.test(url)) {
    toggle.disabled = true;
    toggle.checked = false;
    statusEl.textContent = "در این صفحه قابل استفاده نیست";
    console.warn("[RTL v5] restricted page, toggle disabled");
    return;
  }

  const data = await chrome.storage.local.get(key);
  toggle.checked = !!data[key];
  statusEl.textContent = toggle.checked ? "روشن" : "خاموش";
  console.log("[RTL v5] current state:", toggle.checked);
}

toggle.addEventListener("change", async () => {
  if (tabId == null || !key) return;
  const value = toggle.checked;
  console.log("[RTL v5] user toggled to:", value, "key:", key);
  await chrome.storage.local.set({ [key]: value });
  statusEl.textContent = value ? "روشن" : "خاموش";
  chrome.runtime.sendMessage({ type: "updateIcon", tabId });
});

init();