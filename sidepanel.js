/* sidepanel.js - VForge Inspector: UI del side panel */

const DEFAULT_CONFIG = {
  secret: "",
  projectDomain: "",
  agent: "claude_code"
};

async function loadConfig() {
  const { config = {} } = await chrome.storage.local.get("config");
  return { ...DEFAULT_CONFIG, ...config };
}

async function saveConfigToStorage(cfg) {
  await chrome.storage.local.set({ config: cfg });
}

async function renderConfig() {
  const cfg = await loadConfig();
  document.getElementById("cfg-secret").value = cfg.secret;
  document.getElementById("cfg-project").value = cfg.projectDomain;
  document.getElementById("cfg-agent").value = cfg.agent;
}

function statusLabel(status) {
  if (status === "sent") return "enviado";
  if (status === "error") return "error";
  return "pendiente";
}

async function renderPins() {
  const { pins = [] } = await chrome.storage.local.get("pins");
  const list = document.getElementById("pin-list");
  const empty = document.getElementById("empty-state");
  list.innerHTML = "";

  if (!pins.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  pins
    .slice()
    .reverse()
    .forEach((pin) => {
      const li = document.createElement("li");
      li.className = "pin-item";
      li.dataset.id = pin.id;

      const num = pin.id.split("_").pop();
      const statusClass = `status-${pin.status || "pending"}`;
      const retryVisible = pin.status === "error" ? "inline-block" : "none";

      li.innerHTML = `
        <div class="pin-item-top">
          <span class="pin-number">${num}</span>
          <span class="pin-selector" title="${pin.selector}">${pin.selector}</span>
        </div>
        <div class="pin-note">${escapeHtml(pin.note)}</div>
        <div class="pin-bottom">
          <span class="status ${statusClass}">${statusLabel(pin.status)}</span>
          <button class="retry" style="display:${retryVisible}">Reintentar</button>
        </div>
      `;

      li.querySelector(".retry").addEventListener("click", () => retryPin(pin));
      list.appendChild(li);
    });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function retryPin(pin) {
  chrome.runtime.sendMessage({ type: "retry_pin", pin });
}

document.getElementById("save-config").addEventListener("click", async () => {
  const secret = document.getElementById("cfg-secret").value.trim();
  const projectDomain = document.getElementById("cfg-project").value.trim();
  const agent = document.getElementById("cfg-agent").value;
  await saveConfigToStorage({ secret, projectDomain, agent });

  const feedback = document.getElementById("save-feedback");
  feedback.textContent = "Guardado";
  setTimeout(() => { feedback.textContent = ""; }, 1800);
});

document.getElementById("clear-pins").addEventListener("click", async () => {
  const { pins = [] } = await chrome.storage.local.get("pins");
  const keysToRemove = pins.map((p) => `screenshot_${p.id}`);
  await chrome.storage.local.remove(keysToRemove);
  await chrome.storage.local.set({ pins: [] });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes.pins) renderPins();
    if (changes.config) renderConfig();
  }
});

renderConfig();
renderPins();
