// ═══════════════════════════════════════════════════════════════════════════
// DOCENTE IA — Mini App Controller v10.0
// "Liquid Crystal" — Dashboard-first architecture
// ═══════════════════════════════════════════════════════════════════════════

const twa = window.Telegram?.WebApp;

// ── INITIALIZATION ──────────────────────────────────────────────────────────

function setDynamicGreeting() {
  const el = document.getElementById('dynamic-greeting');
  if (!el) return;
  const h = new Date().getHours();
  el.textContent = h >= 19 || h < 5 ? "Buenas noches, Colega"
                 : h >= 12           ? "Buenas tardes, Colega"
                 :                     "Buen día, Colega";
}

if (twa) {
  twa.ready();
  twa.expand();
  twa.setHeaderColor('secondary_bg_color');
  twa.setBackgroundColor('secondary_bg_color');
} else {
  console.warn("Telegram WebApp API not found. Running in browser test mode.");
  const dot = document.querySelector('.dot');
  const status = document.getElementById('sync-status');
  if (dot) dot.style.backgroundColor = "#f59e0b";
  if (status) status.textContent = "Modo Prueba";
}

setDynamicGreeting();

// ── UX HELPERS ──────────────────────────────────────────────────────────────

const loader = {
  el: document.getElementById('loading-overlay'),
  show(text = "Procesando...") {
    if (this.el) {
      this.el.querySelector('.loading-text').textContent = text;
      this.el.classList.add('visible');
    }
    if (twa?.MainButton) {
      twa.MainButton.showProgress(false);
      twa.MainButton.disable();
    }
  },
  hide() {
    if (this.el) this.el.classList.remove('visible');
    if (twa?.MainButton) {
      twa.MainButton.hideProgress();
      twa.MainButton.enable();
    }
  }
};

// ── DOM REFERENCES ──────────────────────────────────────────────────────────

const views = {
  dashboard: document.getElementById("dashboard-view"),
  profile:   document.getElementById("profile-view"),
  login:     document.getElementById("login-view"),
  rubric:    document.getElementById("rubric-view"),
  planning:  document.getElementById("planning-view"),
  unit:      document.getElementById("unit-view"),
  session:   document.getElementById("session-view"),
  materials: document.getElementById("materials-view"),
  convivencia: document.getElementById("convivencia-view"),
  metodologia: document.getElementById("metodologia-view"),
};

const forms = {
  profile:  document.getElementById('profile-form'),
  login:    document.getElementById('login-form'),
  register: document.getElementById('register-form'),
  unit:     document.getElementById('unit-form'),
  session:  document.getElementById('session-form'),
  convivencia: document.getElementById('convivencia-form'),
  metodologia: document.getElementById('metodologia-form'),
};

const rubricBody     = document.getElementById("rubric-body");
const btnAddCriterion = document.getElementById("btn-add-criterion");
const rubricTopic    = document.getElementById("rubric-topic");
const syncStatus     = document.getElementById('sync-status');

const progressAnual    = document.getElementById("progress-anual");
const progressUnidades = document.getElementById("progress-unidades");
const progressSesiones = document.getElementById("progress-sesiones");
const statusAnualText    = document.getElementById("status-anual");
const statusUnidadesText = document.getElementById("status-unidades");
const statusSesionesText = document.getElementById("status-sesiones");

let currentActiveForm = null;
let currentViewName = "dashboard";

// ── ROUTING & NAVIGATION ────────────────────────────────────────────────────

const startParam = twa?.initDataUnsafe?.start_param
  || new URLSearchParams(window.location.search).get('startapp')
  || '';

const VIEW_CONFIG = {
  dashboard:    { form: null,           mainBtn: null,                  status: "Conectado" },
  perfil:       { form: forms.profile,  mainBtn: "GUARDAR PERFIL",      status: "Mi Perfil" },
  login:        { form: forms.login,    mainBtn: "INICIAR SESIÓN",      status: "Portal de Acceso" },
  register:     { form: forms.register, mainBtn: "CREAR CUENTA",        status: "Portal de Acceso" },
  rubrica:      { form: null,           mainBtn: "GENERAR RÚBRICA",     status: "Constructor de Rúbricas" },
  planificacion:{ form: null,           mainBtn: null,                  status: "Hub de Planificación" },
  materiales:   { form: null,           mainBtn: null,                  status: "Mis Materiales" },
  unidad:       { form: forms.unit,     mainBtn: "GENERAR UNIDAD",      status: "Generador de Unidades" },
  sesion:       { form: forms.session,  mainBtn: "GENERAR SESIÓN",      status: "Generador de Sesiones" },
  convivencia:  { form: forms.convivencia, mainBtn: "CONSULTAR",        status: "Protocolo de Convivencia" },
  metodologia:  { form: forms.metodologia, mainBtn: "GENERAR PROYECTO", status: "Metodologías Activas" },
};

function updateMainButton(label) {
  if (!twa || !label) {
    if (twa) twa.MainButton.hide();
    return;
  }
  twa.MainButton.color = twa.themeParams.button_color || "#6366f1";
  twa.MainButton.textColor = "#ffffff";
  twa.MainButton.text = label;
  twa.MainButton.show();
}

function showView(viewName) {
  const viewMap = {
    login:         "login",
    rubrica:       "rubric",
    planificacion: "planning",
    unidad:        "unit",
    sesion:        "session",
    perfil:        "profile",
    dashboard:     "dashboard",
    materiales:    "materials",
    convivencia:   "convivencia",
    metodologia:   "metodologia",
  };

  const nextViewKey = viewMap[viewName] || "dashboard";
  const currentViewEl = document.querySelector('.view-container.active');
  const nextViewEl = views[nextViewKey];

  if (currentViewEl && currentViewEl !== nextViewEl) {
    currentViewEl.classList.remove('active');
    currentViewEl.classList.add('exit');
    setTimeout(() => {
      currentViewEl.style.display = 'none';
      currentViewEl.classList.remove('exit');
    }, 300);
  }

  if (nextViewEl) {
    setTimeout(() => {
      nextViewEl.style.display = 'block';
      // Force reflow
      nextViewEl.offsetHeight;
      nextViewEl.classList.add('active');
    }, currentViewEl ? 150 : 0);
  }

  // Configure form & button
  const config = VIEW_CONFIG[viewName] || VIEW_CONFIG.dashboard;
  currentActiveForm = config.form;
  currentViewName = viewName;
  if (syncStatus) syncStatus.textContent = config.status;
  updateMainButton(config.mainBtn);

  // View-specific initialization
  if (viewName === "rubrica")      initRubricBuilder();
  if (viewName === "planificacion") fetchPlanningStatus();
  if (viewName === "materiales")   fetchMaterials();
}

// Determine initial view from start param
const initialView = startParam && VIEW_CONFIG[startParam] ? startParam : "dashboard";
showView(initialView);

// ── DASHBOARD CARD NAVIGATION ───────────────────────────────────────────────

document.querySelectorAll('.dash-card[data-view]').forEach(card => {
  card.addEventListener('click', () => {
    const target = card.dataset.view;
    twa?.HapticFeedback.impactOccurred('light');
    showView(target);

    // Enable back button
    if (twa) {
      twa.BackButton.show();
      twa.BackButton.onClick(() => {
        showView("dashboard");
        twa.BackButton.hide();
      });
    }
  });
});

// ── FORM VALIDATION ─────────────────────────────────────────────────────────

function shakeInput(input) {
  const el = input.closest('.glass, .glass-card, .form-group') || input.parentElement;
  el.classList.add('error-shake');
  twa?.HapticFeedback.notificationOccurred('warning');
  setTimeout(() => el.classList.remove('error-shake'), 400);
}

function checkFormValidity() {
  if (!currentActiveForm) {
    // For non-form views, show button always
    const config = VIEW_CONFIG[currentViewName];
    if (config?.mainBtn) updateMainButton(config.mainBtn);
    return;
  }
  const isValid = currentActiveForm.checkValidity();
  if (twa) {
    if (isValid) {
      const config = VIEW_CONFIG[currentViewName];
      updateMainButton(config?.mainBtn || "GUARDAR");
    } else {
      twa.MainButton.hide();
    }
  }
}

const inputs = document.querySelectorAll('input, select, textarea');
inputs.forEach(input => {
  input.addEventListener('input', () => {
    const el = input.closest('.glass, .glass-card, .form-group') || input.parentElement;
    el.classList.remove('error-shake');
    checkFormValidity();
  });
  input.addEventListener('focus', () => {
    twa?.HapticFeedback.impactOccurred('light');
  });
  input.addEventListener('blur', () => {
    if (!input.checkValidity() && input.value !== "") shakeInput(input);
  });
  input.addEventListener('change', checkFormValidity);
});

// ── AUTH TOGGLE ──────────────────────────────────────────────────────────────

const btnShowRegister = document.getElementById('btn-show-register');
const btnShowLogin = document.getElementById('btn-show-login');

if (btnShowRegister && btnShowLogin) {
  btnShowRegister.onclick = () => {
    forms.login.style.display = 'none';
    forms.register.style.display = 'flex';
    currentActiveForm = forms.register;
    currentViewName = "register";
    updateMainButton("CREAR CUENTA");
    twa?.HapticFeedback.selectionChanged();
    checkFormValidity();
  };
  btnShowLogin.onclick = () => {
    forms.register.style.display = 'none';
    forms.login.style.display = 'flex';
    currentActiveForm = forms.login;
    currentViewName = "login";
    updateMainButton("INICIAR SESIÓN");
    twa?.HapticFeedback.selectionChanged();
    checkFormValidity();
  };
}

// ── MAIN BUTTON HANDLER ─────────────────────────────────────────────────────

if (twa) {
  twa.MainButton.onClick(() => {
    if (currentViewName === "rubrica")       return handleRubricSubmission();
    if (currentViewName === "planificacion") return twa.showAlert("Tu planificación está al día. ¡Sigue así!");

    if (!currentActiveForm || !currentActiveForm.checkValidity()) {
      const firstInvalid = currentActiveForm?.querySelector(':invalid');
      if (firstInvalid) shakeInput(firstInvalid);
      return;
    }

    const formData = new FormData(currentActiveForm);
    const data = Object.fromEntries(formData.entries());

    if (currentViewName === "login" || currentViewName === "register") {
      const mode = currentViewName === "login" ? "login" : "register";
      submitDataToBackend(
        { action: `auth_${mode}`, data, initData: twa.initData },
        `/api/tma/auth/${mode}`
      );
    } else if (currentViewName === "unidad") {
      submitDataToBackend(
        { action: "generate_unit", data, initData: twa.initData },
        "/api/tma/units/generate"
      );
    } else if (currentViewName === "sesion") {
      submitDataToBackend(
        { action: "generate_session", data, initData: twa.initData },
        "/api/tma/sessions/generate"
      );
    } else if (currentViewName === "convivencia") {
      submitDataToBackend(
        { action: "consult_convivencia", data, initData: twa.initData },
        "/api/tma/convivencia/consult"
      );
    } else if (currentViewName === "metodologia") {
      submitDataToBackend(
        { action: "generate_metodologia", data, initData: twa.initData },
        "/api/tma/metodologia/generate"
      );
    } else {
      twa.showPopup({
        title: "Confirmar Cambios",
        message: "¿Deseas guardar esta configuración?",
        buttons: [
          { id: "save", type: "default", text: "Guardar" },
          { type: "cancel" }
        ]
      }, (id) => {
        if (id === "save") {
          submitDataToBackend(
            { action: "update_profile", data, initData: twa.initData },
            "/api/tma/profile"
          );
        }
      });
    }
  });
}

// ── RUBRIC BUILDER ──────────────────────────────────────────────────────────

function initRubricBuilder() {
  if (rubricBody && rubricBody.children.length === 0) {
    ["Comprensión Lectora", "Gramática", "Coherencia", "Creatividad"].forEach(c => addRubricRow(c));
  }
}

btnAddCriterion?.addEventListener("click", () => {
  addRubricRow("");
  twa?.HapticFeedback.selectionChanged();
});

function addRubricRow(criterion = "") {
  if (!rubricBody) return;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="row-criterion" value="${criterion}" placeholder="Nuevo criterio..."></td>
    <td><input type="text" class="row-lvl" disabled value="IA"></td>
    <td><input type="text" class="row-lvl" disabled value="IA"></td>
    <td><input type="text" class="row-lvl" disabled value="IA"></td>
    <td><input type="text" class="row-lvl" disabled value="IA"></td>
    <td><button class="btn-remove-row">🗑️</button></td>
  `;
  tr.querySelector(".btn-remove-row").onclick = () => {
    tr.remove();
    twa?.HapticFeedback.notificationOccurred("warning");
  };
  rubricBody.appendChild(tr);
}

async function handleRubricSubmission() {
  if (!rubricTopic.value.trim()) return twa?.showAlert("Ingresa un tema.");
  const criteria = Array.from(rubricBody.querySelectorAll(".row-criterion"))
    .map(i => i.value.trim()).filter(v => v);
  if (criteria.length === 0) return twa?.showAlert("Añade criterios.");

  submitDataToBackend({
    action: "generate_rubric",
    data: { topic: rubricTopic.value.trim(), criteria },
    initData: twa.initData
  }, "/api/tma/rubrics/generate");
}

// ── PLANNING HUB ────────────────────────────────────────────────────────────

async function fetchPlanningStatus() {
  try {
    const apiUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8000/api/tma/planning/status'
      : 'https://docente-ia.onrender.com/api/tma/planning/status';

    const res = await fetch(apiUrl, {
      headers: { 'Authorization': `tma ${twa?.initData || ""}` }
    });
    if (res.ok) {
      const { data } = await res.json();
      if (progressAnual)     progressAnual.style.width = `${data.anual.progress}%`;
      if (statusAnualText)   statusAnualText.textContent = data.anual.status;
      if (progressUnidades)  progressUnidades.style.width = `${data.unidades.progress}%`;
      if (statusUnidadesText) statusUnidadesText.textContent = `${data.unidades.count} Unidades`;
      if (progressSesiones)  progressSesiones.style.width = `${data.sesiones.progress}%`;
      if (statusSesionesText) statusSesionesText.textContent = `${data.sesiones.count} Sesiones`;

      // Update dashboard stats if visible
      const dashStat = document.getElementById('dash-stat-sessions');
      if (dashStat) dashStat.textContent = `${data.sesiones.count} sesiones`;
    }
  } catch (e) {
    console.error("Planning status error:", e);
  }
}

document.querySelectorAll(".btn-plan").forEach(btn => {
  btn.onclick = () => {
    twa?.HapticFeedback.impactOccurred("light");
    showView("materiales");
    if (twa) {
      twa.BackButton.show();
      twa.BackButton.onClick(() => {
        showView("planificacion");
        twa.BackButton.hide();
      });
    }
  };
});

// ── MATERIALS HISTORY ───────────────────────────────────────────────────────

async function fetchMaterials() {
  const listEl    = document.getElementById('materials-list');
  const loadingEl = document.getElementById('materials-loading');
  const emptyEl   = document.getElementById('materials-empty');
  if (!listEl) return;

  listEl.innerHTML = '';
  if (emptyEl)   emptyEl.style.display   = 'none';
  if (loadingEl) loadingEl.style.display = 'block';

  try {
    const baseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8000'
      : 'https://docente-ia.onrender.com';

    const res = await fetch(`${baseUrl}/api/tma/materials`, {
      headers: { 'Authorization': `tma ${twa?.initData || ""}` }
    });

    if (loadingEl) loadingEl.style.display = 'none';

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data = [] } = await res.json();

    if (data.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    data.forEach(item => {
      const date = item.created_at
        ? new Date(item.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';
      const score = item.score != null ? `<span class="material-score">${item.score}/100</span>` : '';

      // Botones de descarga
      let downloadHtml = '';
      if (item.file_urls) {
        if (item.file_urls.docx) {
          downloadHtml += `<a href="${item.file_urls.docx}" target="_blank" class="download-btn docx" title="Descargar Word">📝</a>`;
        }
        if (item.file_urls.pdf) {
          downloadHtml += `<a href="${item.file_urls.pdf}" target="_blank" class="download-btn pdf" title="Descargar PDF">🖨️</a>`;
        }
      }

      const card = document.createElement('div');
      card.className = 'material-item glass-card';
      card.innerHTML = `
        <div class="material-icon">${item.icon}</div>
        <div class="material-info">
          <p class="material-title">${item.title}</p>
          <p class="material-meta">${item.type} &middot; ${date}</p>
        </div>
        <div class="material-actions">
          ${score}
          <div class="download-group">
            ${downloadHtml}
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });

  } catch (err) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (listEl) listEl.innerHTML = `<div class="glass-card" style="text-align:center;color:var(--text-muted)">⚠️ No se pudo cargar el historial.</div>`;
    console.error('fetchMaterials error:', err);
  }
}

// ── BACKEND SYNC ────────────────────────────────────────────────────────────

async function submitDataToBackend(payload, endpoint) {
  loader.show();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout para LLM

  try {
    const baseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8000'
      : 'https://docente-ia.onrender.com';

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `tma ${twa?.initData || ""}`
      },
      signal: controller.signal,
      body: JSON.stringify(payload)
    });

    clearTimeout(timeoutId);
    loader.hide();

    if (response.ok) {
      const result = await response.json();
      twa?.HapticFeedback.notificationOccurred('success');
      twa?.showPopup({
        title: "¡Éxito!",
        message: result.message || "Operación completada correctamente. Revisa tu chat de Telegram.",
        buttons: [{ type: "ok" }]
      }, () => {
        showView("dashboard");
      });
    } else {
      const result = await response.json().catch(() => ({}));
      twa?.HapticFeedback.notificationOccurred('error');
      const errorMsg = result.message || result.detail || "Hubo un error al procesar tu solicitud.";
      twa?.showAlert(`⚠️ ${errorMsg}`);
    }
  } catch (error) {
    loader.hide();
    clearTimeout(timeoutId);
    twa?.HapticFeedback.notificationOccurred('error');
    
    if (error.name === 'AbortError') {
      twa?.showAlert("⏱️ El servidor tarda demasiado en responder. El proceso continuará en segundo plano, por favor revisa tu Telegram en unos minutos.");
    } else {
      console.error("Error al sincronizar con el backend:", error);
      twa?.showAlert("🚫 No se pudo conectar con el servidor. Verifica tu internet o intenta más tarde.");
    }
  }
}
