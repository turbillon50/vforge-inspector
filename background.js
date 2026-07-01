/* background.js - Service Worker de VForge Inspector */

const ENDPOINT_DEFAULT = "http://178.105.135.26/brain/vulcano/enqueue";

async function getConfig() {
  const { config = {} } = await chrome.storage.local.get("config");
  return {
    secret: config.secret || "",
    agent: config.agent || "claude_code",
    projectDomain: config.projectDomain || ""
  };
}

async function updatePinStatus(pinId, newStatus, errorMsg = "") {
  const { pins = [] } = await chrome.storage.local.get("pins");
  const idx = pins.findIndex((p) => p.id === pinId);
  if (idx >= 0) {
    pins[idx].status = newStatus;
    pins[idx].error = errorMsg;
    await chrome.storage.local.set({ pins });
  }
}

async function processPin(message, sender) {
  const { pin } = message;
  const tabId = sender && sender.tab ? sender.tab.id : (await getActiveTabId());

  let screenshotDataUrl = null;
  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: "png",
      quality: 90
    });
    await chrome.storage.local.set({
      [`screenshot_${pin.id}`]: screenshotDataUrl
    });
  } catch (e) {
    console.warn("VForge Inspector: no se pudo capturar screenshot", e);
  }

  const cfg = await getConfig();

  const dominioLinea = cfg.projectDomain
    ? `Proyecto/dominio activo: ${cfg.projectDomain}`
    : "";

  const prompt = [
    "REPORTE VISUAL — VForge Inspector",
    "",
    `Nota del usuario: "${pin.note}"`,
    "",
    `Selector del elemento: ${pin.selector}`,
    `URL de la pagina: ${pin.url}`,
    dominioLinea,
    screenshotDataUrl
      ? `Screenshot local guardado, sesion ${pin.id} (ver chrome.storage.local en la extension).`
      : "No se pudo capturar screenshot para esta sesion.",
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    secret: cfg.secret,
    prompt,
    agent: cfg.agent,
    priority: 7,
    source: "vforge-inspector-plugin"
  };

  try {
    const resp = await fetch(ENDPOINT_DEFAULT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await updatePinStatus(pin.id, "sent");
  } catch (e) {
    await updatePinStatus(pin.id, "error", e.message);
  }
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ? tab.id : null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "process_pin") {
    processPin(msg, sender).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "retry_pin") {
    processPin({ pin: msg.pin }, sender).then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.commands && chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-inspector") {
    getActiveTabId().then((tabId) => {
      if (tabId) chrome.tabs.sendMessage(tabId, { type: "toggle_inspector" });
    });
  }
});
