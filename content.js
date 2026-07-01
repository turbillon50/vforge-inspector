/* content.js - VForge Inspector: inyectado en cada pagina */

const STATE = {
  active: false,
  pinCounter: 0,
  hoverOutline: null
};

function createInspectorButton() {
  if (document.getElementById("vforge-btn")) return;
  const btn = document.createElement("div");
  btn.id = "vforge-btn";
  btn.title = "VForge Inspector (Alt+Shift+V)";
  btn.innerHTML = "&#10021;";
  document.documentElement.appendChild(btn);
  btn.addEventListener("click", toggleInspector);
  return btn;
}

function createHoverOutline() {
  const div = document.createElement("div");
  div.id = "vforge-hover-outline";
  document.documentElement.appendChild(div);
  return div;
}

function toggleInspector() {
  STATE.active = !STATE.active;
  const btn = document.getElementById("vforge-btn");
  if (STATE.active) {
    document.documentElement.classList.add("vforge-active");
    if (btn) btn.classList.add("vforge-btn-on");
    STATE.hoverOutline = createHoverOutline();
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
  } else {
    document.documentElement.classList.remove("vforge-active");
    if (btn) btn.classList.remove("vforge-btn-on");
    if (STATE.hoverOutline) STATE.hoverOutline.remove();
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
  }
}

function onMouseMove(e) {
  if (!STATE.hoverOutline) return;
  const el = e.target;
  if (el.closest && el.closest("#vforge-btn, .vforge-mini-panel, .vforge-pin-badge")) return;
  const rect = el.getBoundingClientRect();
  const outline = STATE.hoverOutline;
  outline.style.top = `${rect.top + window.scrollY}px`;
  outline.style.left = `${rect.left + window.scrollX}px`;
  outline.style.width = `${rect.width}px`;
  outline.style.height = `${rect.height}px`;
}

function buildSimpleSelector(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return "";
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  if (el.classList && el.classList.length) {
    const cls = [...el.classList].filter(Boolean).slice(0, 3).join(".");
    if (cls) return `${tag}.${cls}`;
  }
  const parent = el.parentElement;
  if (parent) {
    const idx = Array.from(parent.children).indexOf(el) + 1;
    return `${tag}:nth-child(${idx})`;
  }
  return tag;
}

function onClick(e) {
  if (!STATE.active) return;
  const el = e.target;
  if (el.closest && el.closest("#vforge-btn, .vforge-mini-panel, .vforge-pin-badge")) return;

  e.preventDefault();
  e.stopPropagation();

  const rect = el.getBoundingClientRect();
  const selector = buildSimpleSelector(el);
  STATE.pinCounter += 1;
  const pinNumber = STATE.pinCounter;
  const pinId = `pin_${Date.now()}_${pinNumber}`;

  document.querySelectorAll(".vforge-mini-panel").forEach((p) => p.remove());

  const pin = document.createElement("div");
  pin.className = "vforge-pin-badge";
  pin.dataset.pinId = pinId;
  pin.textContent = pinNumber;
  pin.style.top = `${rect.top + window.scrollY - 12}px`;
  pin.style.left = `${rect.left + window.scrollX - 12}px`;
  document.documentElement.appendChild(pin);

  const panel = document.createElement("div");
  panel.className = "vforge-mini-panel";
  panel.innerHTML = `
    <div class="vforge-mini-panel-header">Pin #${pinNumber} &middot; ${selector}</div>
    <textarea placeholder="Que esta mal aqui, en tus palabras" rows="3"></textarea>
    <div class="vforge-mini-panel-actions">
      <button class="vforge-send">Mandar a Claude Code</button>
      <button class="vforge-cancel" type="button">Cancelar</button>
    </div>
  `;
  document.documentElement.appendChild(panel);

  const top = rect.top + window.scrollY + rect.height + 6;
  const left = Math.min(
    rect.left + window.scrollX,
    window.scrollX + window.innerWidth - 280
  );
  panel.style.top = `${top}px`;
  panel.style.left = `${Math.max(8, left)}px`;

  const textarea = panel.querySelector("textarea");
  textarea.focus();

  panel.querySelector(".vforge-cancel").addEventListener("click", () => {
    panel.remove();
    pin.remove();
  });

  panel.querySelector(".vforge-send").addEventListener("click", async () => {
    const note = textarea.value.trim();
    if (!note) {
      textarea.focus();
      return;
    }

    const pinData = {
      id: pinId,
      selector,
      note,
      url: location.href,
      timestamp: Date.now(),
      rect: {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
      },
      status: "pending"
    };

    const { pins = [] } = await chrome.storage.local.get("pins");
    pins.push(pinData);
    await chrome.storage.local.set({ pins });

    chrome.runtime.sendMessage({ type: "process_pin", pin: pinData });

    const btn = panel.querySelector(".vforge-send");
    btn.disabled = true;
    btn.textContent = "Enviado";
    textarea.disabled = true;
    setTimeout(() => panel.remove(), 900);
  });
}

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.shiftKey && (e.key === "V" || e.key === "v")) {
    toggleInspector();
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "toggle_inspector") {
    toggleInspector();
  }
});

createInspectorButton();
