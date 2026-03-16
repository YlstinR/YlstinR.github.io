// ═══════════════════════════════════════════════════════════════════════
// DOCENT-IA — Mini App Controller v2.0 "Cascade"
// ═══════════════════════════════════════════════════════════════════════

const twa = window.Telegram?.WebApp;
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8000'
  : 'https://docente-ia.onrender.com';

// ── INIT ─────────────────────────────────────────────────────────────

if (twa) {
  twa.ready();
  twa.expand();
  twa.setHeaderColor?.('bg_color');
  twa.setBackgroundColor?.('#18191B');
} else {
  document.getElementById('conn-dot').style.background = '#C49A3C';
  document.getElementById('sync-status').textContent = 'Modo prueba';
}

// ── GREETING ─────────────────────────────────────────────────────────

function setGreeting() {
  const h = new Date().getHours();
  const name = twa?.initDataUnsafe?.user?.first_name;
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const tail   = h < 12 ? '¿Qué planificamos esta mañana?' : h < 19 ? '¿Qué planificamos hoy?' : '¿Preparamos la clase de mañana?';
  const el = document.getElementById('dynamic-greeting');
  if (el) el.innerHTML = name
    ? `${saludo}, <span>${name}</span>. ${tail}`
    : `${saludo}, profe. <span>${tail}</span>`;
}
setGreeting();

// ── LOADER ────────────────────────────────────────────────────────────

const loader = {
  el: document.getElementById('loading-overlay'),
  textEl: document.getElementById('loading-text'),
  show(txt = 'Procesando con IA…') {
    this.textEl.textContent = txt;
    this.el.style.display = 'flex';
  },
  hide() { this.el.style.display = 'none'; }
};

// ── NAVIGATION ────────────────────────────────────────────────────────

const VIEWS = {
  dashboard:      document.getElementById('view-dashboard'),
  perfil:         document.getElementById('view-perfil'),
  diagnostico:    document.getElementById('view-diagnostico'),
  planificacion:  document.getElementById('view-planificacion'),
  unidad:         document.getElementById('view-unidad'),
  sesion:         document.getElementById('view-sesion'),
  rubrica:        document.getElementById('view-rubrica'),
  materiales:     document.getElementById('view-materiales'),
  convivencia:    document.getElementById('view-convivencia'),
  metodologia:    document.getElementById('view-metodologia'),
  gestion:        document.getElementById('view-gestion'),
  gestion_wizard: document.getElementById('view-gestion-wizard'),
  login:          document.getElementById('view-login'),
};

const NAV_VIEWS = ['dashboard', 'planificacion', 'materiales', 'perfil'];
let currentView = 'dashboard';

function showView(name) {
  const cur = VIEWS[currentView];
  const next = VIEWS[name];
  if (!next || name === currentView) return;

  if (cur) {
    cur.classList.add('exit');
    cur.classList.remove('active');
    setTimeout(() => cur.classList.remove('exit'), 260);
  }
  next.classList.add('active');
  currentView = name;

  // Bottom nav sync
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === name);
  });

  // Bottom nav visibility
  const bottomNav = document.getElementById('bottom-nav');
  bottomNav.style.display = NAV_VIEWS.includes(name) ? 'flex' : 'none';

  // Telegram back button
  if (twa?.BackButton) {
    if (!NAV_VIEWS.includes(name)) {
      twa.BackButton.show();
    } else {
      twa.BackButton.hide();
    }
  }

  // View-specific init
  if (name === 'perfil')        fetchUserProfile();
  if (name === 'diagnostico')   initDiagnostico();
  if (name === 'planificacion') initPlanificacion();
  if (name === 'rubrica')       initRubricBuilder();
  if (name === 'unidad')        autoFillDocForm('unit-form');
  if (name === 'sesion')        autoFillDocForm('session-form');
  if (name === 'materiales')    fetchMaterials();
  if (name === 'rubrica')       initRubricBuilder();
}

// Back button - Telegram native
twa?.BackButton?.onClick(() => {
  const parent = BACK_MAP[currentView] || 'dashboard';
  showView(parent);
});

const BACK_MAP = {
  diagnostico: 'perfil',
  unidad: 'planificacion', sesion: 'planificacion',
  rubrica: 'planificacion', gestion_wizard: 'gestion',
};

// Back buttons in views
document.querySelectorAll('.btn-back').forEach(btn => {
  const viewId = btn.id.replace('back-', '').replace(/-/g,'_');
  btn.addEventListener('click', () => {
    const parent = BACK_MAP[viewId] || 'dashboard';
    showView(parent);
  });
});

// Nav tabs
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    twa?.HapticFeedback?.impactOccurred?.('light');
    showView(tab.dataset.view);
  });
});

// Pipeline steps & dashboard cards
document.querySelectorAll('.pipeline-step[data-view], .tool-card[data-view]').forEach(el => {
  el.addEventListener('click', () => {
    twa?.HapticFeedback?.impactOccurred?.('light');
    showView(el.dataset.view);
  });
});

// Profile btn in topbar
document.getElementById('btn-nav-perfil')?.addEventListener('click', () => showView('perfil'));

// Auth tabs
document.getElementById('tab-login')?.addEventListener('click', () => switchAuthTab('login'));
document.getElementById('tab-register')?.addEventListener('click', () => switchAuthTab('register'));

function switchAuthTab(mode) {
  const loginForm = document.getElementById('login-form');
  const regForm   = document.getElementById('register-form');
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-register').classList.toggle('active', mode === 'register');
  loginForm.style.display = mode === 'login' ? 'flex' : 'none';
  regForm.style.display   = mode === 'register' ? 'flex' : 'none';
}

// ── START PARAM ───────────────────────────────────────────────────────

const startParam = twa?.initDataUnsafe?.start_param
  || new URLSearchParams(location.search).get('startapp') || '';
const initialView = VIEWS[startParam] ? startParam : 'dashboard';
showView(initialView);

// ── FORM SUBMIT BUTTONS ────────────────────────────────────────────────

// Helper: reads profile form and returns context object for document headers
function getProfileContext() {
  const form = document.getElementById('profile-form');
  const f = n => (form && form[n]?.value) || '';
  return {
    ie:           f('institucion'),
    director:     f('director') || window._profileDirector || '',
    docente:      f('nombre'),
    ugel:         f('ugel'),
    nivel:        f('nivel'),
    grado:        f('grado'),
    seccion:      f('seccion'),
    area:         f('area'),
    modalidad:    f('modalidad'),
    region:       f('region'),
    anio_lectivo: f('anio_lectivo') || '2026',
  };
}

// Auto-fill form selects/inputs that match profile fields (area, grado, nivel)
function autoFillDocForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  const ctx = getProfileContext();
  // Try to pre-select area and grado in form selects
  const trySet = (name, val) => {
    const el = form[name];
    if (!el || !val) return;
    // For select: find matching option
    if (el.tagName === 'SELECT') {
      const opt = Array.from(el.options).find(o => o.text === val || o.value === val);
      if (opt) el.value = opt.value;
    } else if (!el.value) {
      el.value = val;
    }
  };
  trySet('area',  ctx.area);
  trySet('grado', ctx.grado?.replace(' grado','°')?.replace('° ','°') || ctx.grado);
  trySet('nivel', ctx.nivel);
}

document.getElementById('btn-save-profile')?.addEventListener('click', () => {
  const form = document.getElementById('profile-form');
  if (!form.checkValidity()) { form.querySelector(':invalid')?.focus(); return; }
  submitToBackend(Object.fromEntries(new FormData(form)), '/api/tma/profile');
});

document.getElementById('btn-login')?.addEventListener('click', () => {
  const form = document.getElementById('login-form');
  if (!form.checkValidity()) { form.querySelector(':invalid')?.focus(); return; }
  submitToBackend(Object.fromEntries(new FormData(form)), '/api/tma/auth/login');
});

document.getElementById('btn-register')?.addEventListener('click', () => {
  const form = document.getElementById('register-form');
  if (!form.checkValidity()) { form.querySelector(':invalid')?.focus(); return; }
  submitToBackend(Object.fromEntries(new FormData(form)), '/api/tma/auth/register');
});

document.getElementById('btn-gen-unit')?.addEventListener('click', () => {
  const form = document.getElementById('unit-form');
  if (!form.checkValidity()) { form.querySelector(':invalid')?.focus(); return; }
  const payload = { ...Object.fromEntries(new FormData(form)), perfil: getProfileContext() };
  submitToBackend(payload, '/api/tma/units/generate', 'Generando unidad didáctica…');
});

document.getElementById('btn-gen-session')?.addEventListener('click', () => {
  const form = document.getElementById('session-form');
  if (!form.checkValidity()) { form.querySelector(':invalid')?.focus(); return; }
  const payload = { ...Object.fromEntries(new FormData(form)), perfil: getProfileContext() };
  submitToBackend(payload, '/api/tma/sessions/generate', 'Diseñando sesión de aprendizaje…');
});

document.getElementById('btn-gen-convivencia')?.addEventListener('click', () => {
  const form = document.getElementById('convivencia-form');
  if (!form.checkValidity()) { form.querySelector(':invalid')?.focus(); return; }
  const payload = { ...Object.fromEntries(new FormData(form)), perfil: getProfileContext() };
  submitToBackend(payload, '/api/tma/convivencia/consult', 'Consultando protocolos…');
});

document.getElementById('btn-gen-metodologia')?.addEventListener('click', () => {
  const form = document.getElementById('metodologia-form');
  if (!form.checkValidity()) { form.querySelector(':invalid')?.focus(); return; }
  const payload = { ...Object.fromEntries(new FormData(form)), perfil: getProfileContext() };
  submitToBackend(payload, '/api/tma/metodologia/generate', 'Diseñando proyecto pedagógico…');
});

// ── BACKEND SYNC ─────────────────────────────────────────────────────

// ── RÚBRICA DISEÑADOR ─────────────────────────────────────────────────

let rubCurrentSec = 1;
let rubCriterios = [];

const RUB_SUGERENCIAS = {
  'Comunicación':       ['Comprensión lectora','Producción escrita','Coherencia textual','Adecuación comunicativa','Expresión oral','Fluidez lectora','Vocabulario','Uso de conectores','Ortografía y puntuación','Creatividad narrativa'],
  'Matemática':         ['Comprensión del problema','Planificación y estrategia','Procedimiento de cálculo','Representación numérica','Justificación de respuesta','Uso de datos','Exactitud del resultado','Razonamiento lógico'],
  'Personal Social':    ['Identidad y autoestima','Respeto a normas','Participación ciudadana','Responsabilidad social','Análisis histórico','Manejo de fuentes','Convivencia democrática','Pensamiento crítico'],
  'Ciencia y Tecnología':['Planteamiento de hipótesis','Diseño de indagación','Recolección de datos','Análisis e interpretación','Comunicación de resultados','Uso de materiales','Creatividad en soluciones','Trabajo científico'],
  'Arte y Cultura':     ['Exploración de materiales','Expresión creativa','Técnica artística','Reflexión estética','Comunicación de ideas','Proceso creativo','Contextualización cultural'],
  'Educación Física':   ['Control corporal','Coordinación motriz','Participación activa','Respeto a reglas','Trabajo en equipo','Superación personal','Hábitos saludables'],
};

const RUB_NIVEL_COLORS = { AD: '#4CAF7D', A: '#6AAE82', B: '#C49A3C', C: '#E05252' };
const RUB_NIVEL_PLACEHOLDERS = {
  AD: 'Supera lo esperado: describe la evidencia de máximo dominio…',
  A:  'Logro esperado: describe el desempeño adecuado al grado…',
  B:  'En proceso: describe el avance parcial que requiere apoyo…',
  C:  'En inicio: describe la dificultad o el mínimo evidenciado…',
};

function rubGoTo(sec) {
  document.getElementById(`rub-sec-${rubCurrentSec}`)?.style && (document.getElementById(`rub-sec-${rubCurrentSec}`).style.display = 'none');
  rubCurrentSec = sec;
  const next = document.getElementById(`rub-sec-${sec}`);
  if (next) next.style.display = 'block';
  document.querySelectorAll('.pa-tab[data-rsec]').forEach(t => t.classList.toggle('active', +t.dataset.rsec === sec));
  if (sec === 4) updateRubPreview();
  document.querySelector('#view-rubrica .scroll-area')?.scrollTo(0, 0);
}

document.querySelectorAll('.pa-tab[data-rsec]').forEach(tab => {
  tab.addEventListener('click', () => { rubGoTo(+tab.dataset.rsec); twa?.HapticFeedback?.selectionChanged?.(); });
});

function rubAutoFill() {
  const form = document.getElementById('profile-form');
  if (!form) return;
  const safe = n => form[n]?.value || '';
  const setRub = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  setRub('rub-ie',       safe('institucion'));
  setRub('rub-director', safe('director'));
  setRub('rub-docente',  safe('nombre'));
  setRub('rub-area',     safe('area'));
  setRub('rub-ugel',     safe('ugel'));
  const grado = safe('grado'); const sec = safe('seccion'); const nivel = safe('nivel');
  setRub('rub-grado', [nivel, grado, sec].filter(Boolean).join(' — '));
  // Pre-fill competencia based on area
  const compMap = {
    'Comunicación':          'Lee diversos tipos de textos escritos en lengua materna',
    'Matemática':            'Resuelve problemas de cantidad',
    'Personal Social':       'Convive y participa democráticamente en la búsqueda del bien común',
    'Ciencia y Tecnología':  'Indaga mediante métodos científicos para construir conocimientos',
    'Arte y Cultura':        'Crea proyectos desde los lenguajes artísticos',
    'Educación Física':      'Se desenvuelve de manera autónoma a través de su motricidad',
  };
  const area = safe('area');
  if (area && compMap[area]) setRub('rub-competencia', compMap[area]);
  // Load suggestions for the area
  renderRubSugerencias(area);
  // Seed initial criteria
  if (rubCriterios.length === 0) {
    const seeds = (RUB_SUGERENCIAS[area] || ['Criterio 1','Criterio 2','Criterio 3']).slice(0, 4);
    seeds.forEach(s => addRubCriterio(s));
  }
}

function renderRubSugerencias(area) {
  const chips = document.getElementById('rub-sugerencias-chips');
  if (!chips) return;
  const list = RUB_SUGERENCIAS[area] || RUB_SUGERENCIAS['Comunicación'];
  chips.innerHTML = list.map(s =>
    `<button class="rub-chip" onclick="addRubCriterio('${s}');twa?.HapticFeedback?.selectionChanged?.();">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${s}
    </button>`
  ).join('');
}

function addRubCriterio(nombre = '') {
  const existing = rubCriterios.map(c => c.nombre);
  if (nombre && existing.includes(nombre)) return;
  rubCriterios.push({ nombre, peso: 25, indicadores: { AD:'', A:'', B:'', C:'' } });
  renderRubCriterios();
  twa?.HapticFeedback?.impactOccurred?.('light');
}

function deleteRubCriterio(idx) {
  rubCriterios.splice(idx, 1);
  renderRubCriterios();
  twa?.HapticFeedback?.notificationOccurred?.('warning');
}

function renderRubCriterios() {
  const body = document.getElementById('rubric-body-v2');
  if (!body) return;
  body.innerHTML = '';
  rubCriterios.forEach((c, idx) => {
    const card = document.createElement('div');
    card.className = 'rub-criterion-card';
    const pesoTotal = rubCriterios.reduce((s, x) => s + (x.peso || 0), 0);
    card.innerHTML = `
      <div class="rub-criterion-header">
        <div class="rub-criterion-num">${idx + 1}</div>
        <input class="rub-criterion-input" type="text" value="${c.nombre}" placeholder="Nombre del criterio…"
          oninput="rubCriterios[${idx}].nombre=this.value;updateRubPreview()">
        <button class="rub-criterion-del" onclick="deleteRubCriterio(${idx})">✕</button>
      </div>
      <div class="rub-criterion-body">
        <div class="rub-peso-row">
          <span class="rub-peso-label">Peso (%)</span>
          <input class="rub-peso-input" type="number" min="0" max="100" value="${c.peso}"
            oninput="rubCriterios[${idx}].peso=+this.value;updateRubPreview()">
          <span class="rub-peso-hint">Total acumulado: <strong>${pesoTotal}%</strong></span>
        </div>
        <div class="rub-indicadores-label">Indicadores orientadores (opcional — la IA los completará)</div>
        ${['AD','A','B','C'].map(niv => `
          <div class="rub-indicador-row">
            <div class="rub-nivel-dot" style="background:${RUB_NIVEL_COLORS[niv]};"></div>
            <textarea class="rub-indicador-input" rows="1" placeholder="${RUB_NIVEL_PLACEHOLDERS[niv]}"
              oninput="rubCriterios[${idx}].indicadores['${niv}']=this.value">${c.indicadores[niv]}</textarea>
            <span class="rub-ia-tag">IA</span>
          </div>`).join('')}
      </div>`;
    body.appendChild(card);
  });
  updateRubPreview();
}

document.getElementById('btn-add-criterion')?.addEventListener('click', () => {
  addRubCriterio('');
  twa?.HapticFeedback?.selectionChanged?.();
});

function updateRubPreview() {
  const ie     = document.getElementById('rub-ie')?.value || '—';
  const dir    = document.getElementById('rub-director')?.value;
  const doc    = document.getElementById('rub-docente')?.value;
  const area   = document.getElementById('rub-area')?.value;
  const grado  = document.getElementById('rub-grado')?.value;
  const ugel   = document.getElementById('rub-ugel')?.value;
  const anio   = document.getElementById('rub-anio')?.value || '2026';
  const periodo= document.getElementById('rub-periodo')?.value || '';
  const comp   = document.getElementById('rub-competencia')?.value || '—';
  const desemp = document.getElementById('rub-desempeno')?.value || '—';

  document.getElementById('prev-ie').textContent = ie;
  document.getElementById('prev-meta').textContent =
    [area, grado, ugel, anio, periodo].filter(Boolean).join(' · ');
  document.getElementById('prev-competencia').textContent = comp;
  document.getElementById('prev-desempeno').textContent = desemp;

  const rows = document.getElementById('prev-rows');
  if (rows) rows.innerHTML = [
    dir  && `<div class="rub-preview-row"><span class="rub-preview-label">Director(a):</span><span>${dir}</span></div>`,
    doc  && `<div class="rub-preview-row"><span class="rub-preview-label">Docente:</span><span>${doc}</span></div>`,
  ].filter(Boolean).join('');

  const crit = document.getElementById('prev-criterios');
  if (crit) crit.innerHTML = rubCriterios.map(c =>
    `<div class="rub-preview-criterio-pill">
      <span>${c.nombre || 'Criterio sin nombre'}</span>
      <span class="rub-preview-criterio-peso">${c.peso}%</span>
    </div>`).join('');
}

function initRubricBuilder() {
  rubCurrentSec = 1;
  rubGoTo(1);
  rubAutoFill();
}

document.getElementById('btn-gen-rubric')?.addEventListener('click', () => {
  const comp = document.getElementById('rub-competencia')?.value?.trim();
  if (!comp) { alert('Define la competencia a evaluar en la sección II.'); rubGoTo(2); return; }
  if (rubCriterios.length === 0) { alert('Agrega al menos un criterio en la sección III.'); rubGoTo(3); return; }
  const payload = {
    encabezado: {
      ie:        document.getElementById('rub-ie')?.value,
      director:  document.getElementById('rub-director')?.value,
      docente:   document.getElementById('rub-docente')?.value,
      area:      document.getElementById('rub-area')?.value,
      grado:     document.getElementById('rub-grado')?.value,
      ugel:      document.getElementById('rub-ugel')?.value,
      anio:      document.getElementById('rub-anio')?.value,
      periodo:   document.getElementById('rub-periodo')?.value,
      fecha:     document.getElementById('rub-fecha')?.value,
    },
    tipo:          document.querySelector('input[name="rub_tipo"]:checked')?.value,
    competencia:   comp,
    capacidades:   document.getElementById('rub-capacidades')?.value,
    desempeno:     document.getElementById('rub-desempeno')?.value,
    situacion_eval:document.getElementById('rub-situacion-eval')?.value,
    producto:      document.getElementById('rub-producto')?.value,
    modalidad:     Array.from(document.querySelectorAll('input[name="rub_modalidad"]:checked')).map(i=>i.value),
    criterios:     rubCriterios,
  };
  submitToBackend(payload, '/api/tma/rubrics/generate', 'Construyendo rúbrica con IA…');
});

// ── PROFILE LOAD ───────────────────────────────────────────────────────

async function fetchUserProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/tma/profile`, {
      headers: { Authorization: `tma ${twa?.initData || ''}` }
    });
    if (!res.ok) return;
    const { data } = await res.json();
    if (!data) return;
    const form = document.getElementById('profile-form');
    ['nombre','director','institucion','ugel','modalidad','nivel','area','grado','seccion','anio_lectivo','region','provincia','distrito','lugar_exacto']
      .forEach(f => { if (data[f] && form[f]) form[f].value = data[f]; });
    // Update badge
    if (data.nombre) {
      document.getElementById('profile-name').textContent = data.nombre;
      document.getElementById('profile-avatar').textContent = data.nombre.charAt(0).toUpperCase();
    }
    if (data.area || data.nivel) {
      const grado = data.grado ? ` · ${data.grado}` : '';
      document.getElementById('profile-role').textContent = `${data.area || ''}${grado} · ${data.nivel || ''}`;
    }
    if (data.director) {
      window._profileDirector = data.director;
      const dirRow  = document.getElementById('profile-director-row');
      const dirName = document.getElementById('profile-director-name');
      if (dirRow && dirName) { dirName.textContent = data.director; dirRow.style.display = 'block'; }
    }
  } catch(e) { console.warn('Profile load failed', e); }
}

// ── PLANNING STATUS ────────────────────────────────────────────────────

async function fetchPlanningStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/tma/planning/status`, {
      headers: { Authorization: `tma ${twa?.initData || ''}` }
    });
    if (!res.ok) return;
    const { data } = await res.json();

    const set = (progressId, statusId, pctId, tagId, val, label) => {
      const pct = Math.min(100, Math.round(val || 0));
      document.getElementById(progressId)?.style && (document.getElementById(progressId).style.width = `${pct}%`);
      if (statusId) document.getElementById(statusId)?.textContent && (document.getElementById(statusId).textContent = label);
      if (pctId)    document.getElementById(pctId).textContent = `${pct}%`;
      if (tagId) {
        const t = document.getElementById(tagId);
        if (t) {
          t.textContent = pct === 0 ? 'Pendiente' : pct === 100 ? 'Completo' : `${pct}%`;
          t.className = 'tag-badge' + (pct === 100 ? ' done' : pct > 0 ? ' active' : '');
        }
      }
    };

    set('progress-anual', 'status-anual', 'pct-anual', 'tag-anual', data.anual?.progress, data.anual?.status);
    set('progress-unidades', 'status-unidades', 'pct-unidades', 'tag-unidad', data.unidades?.progress, `${data.unidades?.count || 0} unidades`);
    set('progress-sesiones', 'status-sesiones', 'pct-sesiones', 'tag-sesion', data.sesiones?.progress, `${data.sesiones?.count || 0} sesiones`);

    // Dashboard stats
    if (data.sesiones?.count !== undefined)
      document.getElementById('dash-stat-sessions').textContent = data.sesiones.count;
    if (data.unidades?.count !== undefined)
      document.getElementById('dash-stat-units').textContent = data.unidades.count;

  } catch(e) { console.warn('Planning status failed', e); }
}

// ── MATERIALS ──────────────────────────────────────────────────────────

async function fetchMaterials() {
  const listEl    = document.getElementById('materials-list');
  const loadingEl = document.getElementById('materials-loading');
  const emptyEl   = document.getElementById('materials-empty');
  if (!listEl) return;

  listEl.innerHTML = '';
  emptyEl.style.display = 'none';
  loadingEl.style.display = 'block';

  try {
    const res = await fetch(`${API_BASE}/api/tma/materials`, {
      headers: { Authorization: `tma ${twa?.initData || ''}` }
    });
    loadingEl.style.display = 'none';
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data = [] } = await res.json();

    // Update docs stat
    document.getElementById('dash-stat-docs').textContent = data.length;

    if (!data.length) { emptyEl.style.display = 'block'; return; }

    data.forEach(item => {
      const date = item.created_at
        ? new Date(item.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' }) : '';
      const score = item.score != null ? `<span class="material-score">${item.score}/100</span>` : '';
      let dl = '';
      if (item.file_urls?.docx) dl += `<a href="${item.file_urls.docx}" target="_blank" class="download-btn" title="Word">📝</a>`;
      if (item.file_urls?.pdf)  dl += `<a href="${item.file_urls.pdf}"  target="_blank" class="download-btn" title="PDF">🖨️</a>`;
      const card = document.createElement('div');
      card.className = 'material-item';
      card.innerHTML = `
        <div class="material-icon">${item.icon || '📄'}</div>
        <div class="material-info">
          <div class="material-title">${item.title}</div>
          <div class="material-meta">${item.type} · ${date}</div>
        </div>
        <div class="material-actions">${score}<div>${dl}</div></div>`;
      listEl.appendChild(card);
    });
  } catch(e) {
    loadingEl.style.display = 'none';
    listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:12px;">⚠️ No se pudo cargar el historial.</div>';
  }
}

// ── GESTIÓN: UPLOAD ────────────────────────────────────────────────────

document.querySelectorAll('.btn-upload-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.gestion-btn-row').querySelector('.hidden-file-input').click();
    twa?.HapticFeedback?.impactOccurred?.('light');
  });
});

document.querySelectorAll('.hidden-file-input').forEach(input => {
  input.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    loader.show(`Analizando ${file.name}…`);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/tma/gestion/upload`, {
        method: 'POST',
        headers: { Authorization: `tma ${twa?.initData || ''}`, type: input.dataset.type },
        body: fd
      });
      loader.hide();
      const data = await res.json();
      if (res.ok) {
        twa ? twa.showPopup({ title: '¡Documento absorbido!', message: `La IA extrajo la información de tu ${input.dataset.type.toUpperCase()}. Tu planificación está mejor contextualizada.`, buttons:[{type:'ok'}] })
            : alert('Documento procesado correctamente.');
      } else {
        twa ? twa.showAlert(`Error: ${data.detail || 'No se pudo procesar'}`) : alert('Error al procesar.');
      }
    } catch(err) {
      loader.hide();
      console.error('Upload error', err);
    } finally { input.value = ''; }
  });
});

// ── WIZARD ──────────────────────────────────────────────────────────────

let wizardState = { type: null, step: 1, data: {} };

document.querySelectorAll('.btn-gestion-wizard').forEach(btn => {
  btn.addEventListener('click', () => {
    wizardState = { type: btn.dataset.type, step: 1, data: {} };
    twa?.HapticFeedback?.impactOccurred?.('medium');
    showView('gestion_wizard');
    startWizard();
  });
});

function startWizard() {
  document.getElementById('wizard-title').textContent  = `Asistente ${wizardState.type}`;
  document.getElementById('wizard-label').textContent  = `Gestión — ${wizardState.type}`;
  document.getElementById('wizard-subtitle').textContent = 'Paso 1 de 4 · Diagnóstico inicial';
  renderWizardStep({
    question: '¿Cuál es el objetivo principal de este documento?',
    desc: 'Define el propósito central. Esto alineará el resto del contenido.',
    inputs: [{ id: 'proposito', type: 'textarea', placeholder: 'Ej. Fortalecer la gestión pedagógica y el clima institucional...' }]
  });
}

function renderWizardStep(config) {
  document.getElementById('wizard-question-title').textContent = config.question;
  document.getElementById('wizard-question-desc').textContent  = config.desc;
  const container = document.getElementById('wizard-inputs');
  container.innerHTML = '';
  config.inputs.forEach(inp => {
    const g = document.createElement('div');
    g.className = 'form-group';
    g.innerHTML = inp.type === 'textarea'
      ? `<textarea id="${inp.id}" class="form-textarea" placeholder="${inp.placeholder}" style="min-height:100px;"></textarea>`
      : `<input id="${inp.id}" type="${inp.type}" class="form-input" placeholder="${inp.placeholder}">`;
    container.appendChild(g);
  });
  // Update indicators
  const indicators = document.querySelectorAll('.wizard-step-indicator');
  indicators.forEach((el, i) => {
    el.classList.toggle('active', i + 1 === wizardState.step);
    el.classList.toggle('done',   i + 1 < wizardState.step);
  });
}

document.getElementById('btn-wizard-next')?.addEventListener('click', handleWizardNext);

async function handleWizardNext() {
  const inputs = document.getElementById('wizard-inputs').querySelectorAll('input,textarea');
  const stepData = {};
  inputs.forEach(i => stepData[i.id] = i.value);
  Object.assign(wizardState.data, stepData);
  loader.show('Procesando respuesta…');
  try {
    const res = await fetch(`${API_BASE}/api/tma/gestion/wizard-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `tma ${twa?.initData || ''}` },
      body: JSON.stringify({ type: wizardState.type, step: wizardState.step, data: wizardState.data })
    });
    const result = await res.json();
    loader.hide();
    if (result.status === 'next') {
      wizardState.step++;
      document.getElementById('wizard-subtitle').textContent = `Paso ${wizardState.step} de 4 · Avanzando…`;
      renderWizardStep(result.config);
      twa?.HapticFeedback?.impactOccurred?.('light');
    } else if (result.status === 'completed') {
      const msg = 'He recopilado toda la información. Tu documento se está generando y llegará pronto a tu Telegram.';
      twa ? twa.showPopup({ title: '¡Asistente completado!', message: msg, buttons:[{type:'ok'}] }, () => showView('gestion'))
          : (alert(msg), showView('gestion'));
    }
  } catch(e) {
    loader.hide();
    const msg = 'Error en el flujo del asistente.';
    twa ? twa.showAlert(msg) : alert(msg);
  }
}

// ── BACKEND SYNC ───────────────────────────────────────────────────────

async function submitToBackend(payload, endpoint, loaderText = 'Procesando con IA…') {
  loader.show(loaderText);
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 48000);
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `tma ${twa?.initData || ''}` },
      signal: ctrl.signal,
      body: JSON.stringify(payload)
    });
    clearTimeout(tid);
    loader.hide();
    if (res.ok) {
      const result = await res.json();
      twa?.HapticFeedback?.notificationOccurred?.('success');
      const msg = result.message || '¡Listo! Revisa tu chat de Telegram.';
      twa ? twa.showPopup({ title: '¡Completado!', message: msg, buttons:[{type:'ok'}] }, () => showView('dashboard'))
          : (alert(msg), showView('dashboard'));
      return result;
    } else {
      const err = await res.json().catch(() => ({}));
      let msg = err.detail || err.message || 'Hubo un error al procesar la solicitud.';
      if (Array.isArray(msg)) msg = msg.map(e => `• ${e.loc?.slice(-1)[0]}: ${e.msg}`).join('\n');
      twa?.HapticFeedback?.notificationOccurred?.('error');
      twa ? twa.showAlert(`⚠️ ${msg}`) : alert(`⚠️ ${msg}`);
      return null;
    }
  } catch(e) {
    loader.hide();
    clearTimeout(tid);
    twa?.HapticFeedback?.notificationOccurred?.('error');
    if (e.name === 'AbortError') {
      const msg = '⏱️ El servidor tarda en responder. El proceso continúa en segundo plano. Revisa tu Telegram en unos minutos.';
      twa ? twa.showAlert(msg) : alert(msg);
    } else {
      const msg = '🚫 Error de red. Verifica tu conexión e intenta nuevamente.';
      twa ? twa.showAlert(msg) : alert(msg);
    }
    return null;
  }
}

// ── INITIAL DATA LOAD ─────────────────────────────────────────────────

// Fetch stats for dashboard silently
(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/tma/planning/status`, {
      headers: { Authorization: `tma ${twa?.initData || ''}` }
    });
    if (!res.ok) return;
    const { data } = await res.json();
    if (data?.sesiones?.count !== undefined)
      document.getElementById('dash-stat-sessions').textContent = data.sesiones.count;
    if (data?.unidades?.count !== undefined)
      document.getElementById('dash-stat-units').textContent = data.unidades.count;
  } catch(_) {}
  try {
    const res = await fetch(`${API_BASE}/api/tma/materials`, {
      headers: { Authorization: `tma ${twa?.initData || ''}` }
    });
    if (!res.ok) return;
    const { data = [] } = await res.json();
    document.getElementById('dash-stat-docs').textContent = data.length;
  } catch(_) {}
})();

// ── PLANIFICACIÓN ANUAL ────────────────────────────────────────────────

let paCurrentSec = 1;
let paUnidades = [];

function paGoTo(sec) {
  document.getElementById(`pa-sec-${paCurrentSec}`)?.style && (document.getElementById(`pa-sec-${paCurrentSec}`).style.display = 'none');
  paCurrentSec = sec;
  const next = document.getElementById(`pa-sec-${sec}`);
  if (next) { next.style.display = 'block'; next.scrollIntoView?.({behavior:'smooth', block:'start'}); }
  // Sync tabs
  document.querySelectorAll('.pa-tab').forEach(t => t.classList.toggle('active', +t.dataset.sec === sec));
  // Init section-specific stuff
  if (sec === 4) renderPaUnidades();
  // Scroll to top of scroll-area
  document.querySelector('#view-planificacion .scroll-area')?.scrollTo(0, 0);
}

// Tab clicks
document.querySelectorAll('.pa-tab').forEach(tab => {
  tab.addEventListener('click', () => { paGoTo(+tab.dataset.sec); twa?.HapticFeedback?.selectionChanged?.(); });
});

// Area pills in section 3
document.querySelectorAll('.pa-area-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pa-area-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    document.querySelectorAll('.pa-comp-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById(`pc-${pill.dataset.area}`);
    if (panel) panel.style.display = 'block';
    twa?.HapticFeedback?.selectionChanged?.();
  });
});

// Auto-fill datos from profile
function paAutoFill() {
  const form = document.getElementById('profile-form');
  if (!form) return;
  const safe = id => form[id]?.value || '';
  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  setVal('pa-ugel',      safe('ugel'));
  setVal('pa-ie',        safe('institucion'));
  setVal('pa-director',  safe('director'));
  setVal('pa-docente',   safe('nombre'));
  setVal('pa-nivel',     safe('nivel'));
  setVal('pa-area',      safe('area'));
  setVal('pa-modalidad', safe('modalidad'));
  const grado = safe('grado'); const sec = safe('seccion');
  if (grado) setVal('pa-grado', sec ? `${grado} ${sec}` : grado);
  // DRE from region
  const region = safe('region');
  if (region) setVal('pa-dre', `DRE ${region}`);
}

// Unidad card builder
const BIMESTRES_LABELS = { bimestral: ['I Bimestre','II Bimestre','III Bimestre','IV Bimestre'], trimestral: ['I Trimestre','II Trimestre','III Trimestre'] };
const PA_UNIT_COLORS = ['#B9583B','#C49A3C','#3D6B50','#3A4A5C','#7B5EA7','#2E7D9E','#8B4513','#2F6B4F'];

function addPaUnidad() {
  const n = paUnidades.length + 1;
  const org = document.getElementById('pa-organizacion')?.value || 'bimestral';
  const periodos = BIMESTRES_LABELS[org] || BIMESTRES_LABELS.bimestral;
  paUnidades.push({
    n, titulo: '', situacion: '', competencias: '', evidencia: '',
    semanas: 8, periodo: periodos[Math.min(n - 1, periodos.length - 1)] || periodos[0],
    color: PA_UNIT_COLORS[(n - 1) % PA_UNIT_COLORS.length], collapsed: false
  });
  renderPaUnidades();
}

function deletePaUnidad(idx) {
  paUnidades.splice(idx, 1);
  paUnidades.forEach((u, i) => u.n = i + 1);
  renderPaUnidades();
  twa?.HapticFeedback?.notificationOccurred?.('warning');
}

function renderPaUnidades() {
  const list = document.getElementById('pa-unidades-list');
  if (!list) return;
  if (paUnidades.length === 0) {
    // Seed 4 default units on first open
    const org = document.getElementById('pa-organizacion')?.value || 'bimestral';
    const periodos = BIMESTRES_LABELS[org] || BIMESTRES_LABELS.bimestral;
    const count = org === 'trimestral' ? 6 : 8;
    const semsPerUnit = Math.floor(40 / count);
    for (let i = 0; i < count; i++) {
      paUnidades.push({
        n: i + 1, titulo: '', situacion: '', competencias: '', evidencia: '',
        semanas: semsPerUnit, periodo: periodos[Math.min(Math.floor(i / (count / periodos.length)), periodos.length - 1)],
        color: PA_UNIT_COLORS[i % PA_UNIT_COLORS.length], collapsed: i > 0
      });
    }
  }
  list.innerHTML = '';
  paUnidades.forEach((u, idx) => {
    const card = document.createElement('div');
    card.className = 'pa-unidad-card';
    const org = document.getElementById('pa-organizacion')?.value || 'bimestral';
    const periodos = BIMESTRES_LABELS[org] || BIMESTRES_LABELS.bimestral;
    const periodOpts = periodos.map(p => `<option${p === u.periodo ? ' selected' : ''}>${p}</option>`).join('');
    card.innerHTML = `
      <div class="pa-unidad-header" onclick="togglePaUnit(${idx})">
        <div class="pa-unidad-num" style="background:${u.color}">${u.n}</div>
        <div class="pa-unidad-titulo-preview">${u.titulo || `Unidad ${u.n} — Sin título`}</div>
        <div class="pa-unidad-meta">${u.semanas}sem · ${u.periodo}</div>
        <button class="pa-unidad-del" onclick="event.stopPropagation();deletePaUnidad(${idx})" title="Eliminar">✕</button>
      </div>
      <div class="pa-unidad-body" id="pa-unit-body-${idx}" style="${u.collapsed ? 'display:none' : ''}">
        <div class="form-group" style="margin:0;">
          <label class="form-label">Título de la unidad <span class="required">*</span></label>
          <input class="form-input" type="text" placeholder="Ej. Comunicamos lo que sentimos" value="${u.titulo}"
            oninput="paUnidades[${idx}].titulo=this.value;renderYearMap()">
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Situación significativa</label>
          <textarea class="form-textarea" placeholder="¿Qué reto o problema contextualizado motiva esta unidad?" style="min-height:60px;"
            oninput="paUnidades[${idx}].situacion=this.value">${u.situacion}</textarea>
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Evidencia / producto esperado <span class="required">*</span></label>
          <input class="form-input" type="text" placeholder="Ej. Carta argumentativa al director" value="${u.evidencia}"
            oninput="paUnidades[${idx}].evidencia=this.value">
        </div>
        <div class="pa-unidad-row">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Semanas</label>
            <input class="form-input" type="number" min="1" max="16" value="${u.semanas}"
              oninput="paUnidades[${idx}].semanas=+this.value;renderYearMap()">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Período</label>
            <select class="form-select" onchange="paUnidades[${idx}].periodo=this.value">${periodOpts}</select>
          </div>
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Competencias previstas</label>
          <input class="form-input" type="text" placeholder="Ej. Lee textos / Escribe textos" value="${u.competencias}"
            oninput="paUnidades[${idx}].competencias=this.value">
        </div>
      </div>`;
    list.appendChild(card);
  });
  renderYearMap();
}

function togglePaUnit(idx) {
  paUnidades[idx].collapsed = !paUnidades[idx].collapsed;
  const body = document.getElementById(`pa-unit-body-${idx}`);
  if (body) body.style.display = paUnidades[idx].collapsed ? 'none' : 'flex';
  twa?.HapticFeedback?.selectionChanged?.();
}

document.getElementById('btn-add-unidad')?.addEventListener('click', () => {
  addPaUnidad();
  twa?.HapticFeedback?.impactOccurred?.('light');
});

function renderYearMap() {
  const grid = document.getElementById('pa-year-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const total = paUnidades.reduce((s, u) => s + (u.semanas || 0), 0) || 40;
  paUnidades.forEach(u => {
    const sems = Math.max(1, u.semanas || 0);
    const pct = (sems / total * 100).toFixed(1);
    const block = document.createElement('div');
    block.className = 'pa-week-block';
    block.style.cssText = `background:${u.color};opacity:0.75;border-color:${u.color};flex-basis:${pct}%;min-width:8px;`;
    block.title = `Unidad ${u.n}: ${u.titulo || 'Sin título'} (${sems} sem)`;
    grid.appendChild(block);
  });
}

// Generate planificacion
document.getElementById('btn-gen-planificacion')?.addEventListener('click', () => {
  const proposito = document.getElementById('pa-proposito')?.value?.trim();
  if (!proposito) { alert('Completa el propósito anual en la sección II.'); paGoTo(2); return; }
  const unitsOk = paUnidades.some(u => u.titulo.trim());
  if (!unitsOk) { alert('Agrega el título de al menos una unidad en la sección IV.'); paGoTo(4); return; }

  const getCheckedPA = sel => Array.from(document.querySelectorAll(`${sel}`)).filter(i => i.checked).map(i => i.value);

  const payload = {
    datos: {
      anio: 2026, dre: document.getElementById('pa-dre')?.value,
      ugel: document.getElementById('pa-ugel')?.value, ie: document.getElementById('pa-ie')?.value,
      director: document.getElementById('pa-director')?.value,
      docente: document.getElementById('pa-docente')?.value, nivel: document.getElementById('pa-nivel')?.value,
      grado: document.getElementById('pa-grado')?.value, area: document.getElementById('pa-area')?.value,
      modalidad: document.getElementById('pa-modalidad')?.value,
      organizacion: document.getElementById('pa-organizacion')?.value,
      semanas: document.getElementById('pa-semanas')?.value,
      horas_semanales: document.getElementById('pa-horas')?.value,
    },
    proposito: { enfoque: document.querySelector('input[name="pa_enfoque"]:checked')?.value, texto: proposito },
    situacion_significativa: {
      contextos: getCheckedPA('input[name="pa_contexto_ss"]:checked'),
      texto: document.getElementById('pa-situacion-sig')?.value,
      producto_final: document.getElementById('pa-producto-final')?.value,
    },
    competencias: getCheckedPA('input[name="competencia"]:checked'),
    capacidades: getCheckedPA('input[name="cap"]:checked'),
    unidades: paUnidades.map(u => ({ n: u.n, titulo: u.titulo, situacion: u.situacion, evidencia: u.evidencia, semanas: u.semanas, periodo: u.periodo, competencias: u.competencias })),
    evaluacion: { instrumentos: getCheckedPA('input[name="pa_instrumentos"]:checked'), comunicacion_familias: getCheckedPA('input[name="pa_comunicacion_familias"]:checked') },
    enfoques_transversales: getCheckedPA('input[name="pa_enfoques"]:checked'),
    materiales: getCheckedPA('input[name="pa_materiales"]:checked'),
    recursos_digitales: getCheckedPA('input[name="pa_digital"]:checked'),
  };
  submitToBackend(payload, '/api/tma/planning/generate', 'Generando Programación Anual 2026…');
});

// Init planificacion when view opens
function initPlanificacion() {
  paAutoFill();
  paGoTo(1);
}



// Generic exclusive-toggle for button groups
function bindExclusive(containerSelector, hiddenId) {
  document.querySelectorAll(`${containerSelector} button[data-val]`).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll(`${containerSelector} button[data-val]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const el = document.getElementById(hiddenId);
      if (el) el.value = btn.dataset.val;
      twa?.HapticFeedback?.selectionChanged?.();
    });
  });
}

bindExclusive('#diag-freq-scale',          'diag-frecuencia');
bindExclusive('#diag-acompanamiento-scale','diag-acompanamiento');
bindExclusive('.diag-pct-row',             'diag-prob-porcentaje');

// Show/hide "otro problema" textarea
document.addEventListener('change', e => {
  if (e.target?.name === 'prob_tipo') {
    const container = document.getElementById('prob-otro-container');
    if (container) container.style.display = e.target.value === 'otro' ? 'block' : 'none';
  }
});

// Hypothesis live preview builder
function buildHypothesisPreview() {
  const estrategia = document.getElementById('hyp-estrategia')?.value;
  const tiempo     = document.getElementById('hyp-tiempo')?.value;
  const mejora     = document.getElementById('hyp-mejora')?.value;
  const nivel      = document.getElementById('hyp-nivel-cambio')?.value;
  const previewEl  = document.getElementById('diag-hyp-text');
  if (!previewEl) return;

  if (estrategia && tiempo && mejora && nivel) {
    previewEl.innerHTML = `"Si aplico <strong>${estrategia}</strong> durante <strong>${tiempo}</strong>, entonces mis estudiantes mejorarán <strong>${mejora}</strong> en un nivel <strong>${nivel}</strong>."`;
  } else {
    previewEl.innerHTML = '<em style="color:var(--text-muted);">Completa los campos de arriba para ver tu hipótesis aquí…</em>';
  }
}

['hyp-estrategia','hyp-tiempo','hyp-mejora','hyp-nivel-cambio'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', buildHypothesisPreview);
});



const DIAG_STEP_META = [
  { label: 'Paso 1 de 4', name: 'Contexto del Aula' },
  { label: 'Paso 2 de 4', name: 'Diagnóstico de Aprendizajes' },
  { label: 'Paso 3 de 4', name: 'Recursos y Condiciones' },
  { label: 'Paso 4 de 4', name: 'Problemática e Hipótesis' },
];

let diagCurrentStep = 1;

function initDiagnostico() {
  diagCurrentStep = 1;
  renderDiagStep(1);
}

function renderDiagStep(step) {
  // Hide all panels
  document.querySelectorAll('.diag-step-panel').forEach(p => p.style.display = 'none');
  // Show current
  const panel = document.getElementById(`diag-step-${step}`);
  if (panel) { panel.style.display = 'block'; panel.classList.add('diag-step-panel'); }

  // Update indicators
  for (let i = 1; i <= 4; i++) {
    const ind = document.getElementById(`diag-ind-${i}`);
    if (!ind) continue;
    ind.className = 'diag-indicator' +
      (i === step ? ' active' : i < step ? ' done' : '');
  }

  // Update label/name
  const meta = DIAG_STEP_META[step - 1];
  const labelEl = document.getElementById('diag-step-label');
  const nameEl  = document.getElementById('diag-step-name');
  if (labelEl) labelEl.textContent = meta.label;
  if (nameEl)  nameEl.textContent  = meta.name;

  // Prev button
  const prevBtn = document.getElementById('btn-diag-prev');
  const nextBtn = document.getElementById('btn-diag-next');
  const navRow  = document.getElementById('diag-nav-row');

  if (prevBtn) prevBtn.style.display = step > 1 ? 'flex' : 'none';

  // On last step: hide next (replaced by the submit button inside step 4)
  if (nextBtn) {
    if (step === 4) {
      nextBtn.style.display = 'none';
      if (navRow) navRow.style.marginTop = '0';
    } else {
      nextBtn.style.display = 'flex';
    }
  }

  // Scroll top
  const scrollEl = document.querySelector('#view-diagnostico .scroll-area');
  if (scrollEl) scrollEl.scrollTop = 0;
}

// Prev button
document.getElementById('btn-diag-prev')?.addEventListener('click', () => {
  if (diagCurrentStep > 1) {
    diagCurrentStep--;
    renderDiagStep(diagCurrentStep);
    twa?.HapticFeedback?.impactOccurred?.('light');
  }
});

// Next button - validate required fields per step
document.getElementById('btn-diag-next')?.addEventListener('click', () => {
  if (!validateDiagStep(diagCurrentStep)) return;
  if (diagCurrentStep < 4) {
    diagCurrentStep++;
    renderDiagStep(diagCurrentStep);
    twa?.HapticFeedback?.impactOccurred?.('light');
  }
});

function validateDiagStep(step) {
  if (step === 1) {
    const num = document.getElementById('diag-num-estudiantes')?.value;
    if (!num || parseInt(num) < 1) {
      shakeEl('diag-num-estudiantes');
      twa?.HapticFeedback?.notificationOccurred?.('warning');
      return false;
    }
  }
  if (step === 2) {
    const activ = document.querySelectorAll('input[name="fort_actividades"]:checked').length;
    const diftask = document.querySelectorAll('input[name="dif_tareas"]:checked').length;
    if (!activ) {
      twa?.HapticFeedback?.notificationOccurred?.('warning');
      alert('Selecciona al menos una actividad en la que participen tus estudiantes.');
      return false;
    }
    if (!diftask) {
      twa?.HapticFeedback?.notificationOccurred?.('warning');
      alert('Selecciona al menos una dificultad observada en el grupo.');
      return false;
    }
  }
  if (step === 4) {
    const probTipo = document.querySelector('input[name="prob_tipo"]:checked')?.value;
    if (!probTipo) {
      twa?.HapticFeedback?.notificationOccurred?.('warning');
      alert('Selecciona la problemática educativa central identificada.');
      return false;
    }
    const hyp = document.getElementById('hyp-estrategia')?.value;
    if (!hyp) {
      twa?.HapticFeedback?.notificationOccurred?.('warning');
      alert('Completa al menos la estrategia de tu hipótesis de acción.');
      return false;
    }
  }
  return true;
}

function shakeEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const wrap = el.closest('.form-group') || el.parentElement;
  wrap.classList.add('error-shake');
  twa?.HapticFeedback?.notificationOccurred?.('warning');
  setTimeout(() => wrap.classList.remove('error-shake'), 400);
  el.focus();
}

// Back button for diagnostico view
document.getElementById('back-diagnostico')?.addEventListener('click', () => {
  showView('perfil');
});

// Submit Diagnóstico
document.getElementById('btn-save-diagnostico')?.addEventListener('click', () => {
  if (!validateDiagStep(4)) return;

  const getChecked = (selector) =>
    Array.from(document.querySelectorAll(`${selector}`)).filter(i => i.checked).map(i => i.value);

  const buildHypothesis = () => {
    const e = document.getElementById('hyp-estrategia')?.value;
    const t = document.getElementById('hyp-tiempo')?.value;
    const m = document.getElementById('hyp-mejora')?.value;
    const n = document.getElementById('hyp-nivel-cambio')?.value;
    const extra = document.getElementById('diag-hipotesis-extra')?.value;
    let h = e && t && m && n ? `Si aplico ${e} durante ${t}, entonces mis estudiantes mejorarán ${m} en un nivel ${n}.` : '';
    if (extra?.trim()) h += ' ' + extra.trim();
    return h;
  };

  const payload = {
    // Step 1
    num_estudiantes: document.getElementById('diag-num-estudiantes')?.value,
    num_mujeres:     document.getElementById('diag-num-mujeres')?.value,
    num_varones:     document.getElementById('diag-num-varones')?.value,
    tipo_aula:       document.getElementById('diag-tipo-aula')?.value,
    nee_cantidad:    document.getElementById('diag-nee')?.value,
    tipos_nee:       getChecked('#diag-step-1 input[type="checkbox"]:checked'),
    infraestructura: document.getElementById('diag-infraestructura')?.value,
    // Step 2 — Fortalezas
    fort_actividades: getChecked('input[name="fort_actividades"]:checked'),
    fort_habilidades: getChecked('input[name="fort_habilidades"]:checked'),
    fort_area_fuerte: document.querySelector('input[name="fort_area_fuerte"]:checked')?.value,
    fort_extra:       document.getElementById('diag-fortalezas-extra')?.value,
    // Step 2 — Dificultades
    nivel_logro:      document.querySelector('input[name="nivel_logro"]:checked')?.value,
    dif_tareas:       getChecked('input[name="dif_tareas"]:checked'),
    dif_momento:      document.querySelector('input[name="dif_momento"]:checked')?.value,
    dif_frecuencia:   document.getElementById('diag-frecuencia')?.value,
    dif_factores:     getChecked('input[name="dif_factores"]:checked'),
    areas_bajas:      getChecked('input[name="areas_bajas"]:checked'),
    // Step 3 — Contexto
    ctx_economia:         document.querySelector('input[name="ctx_economia"]:checked')?.value,
    ctx_acompanamiento:   document.getElementById('diag-acompanamiento')?.value,
    ctx_vulnerabilidad:   getChecked('input[name="ctx_vulnerabilidad"]:checked'),
    ctx_servicios:        getChecked('input[name="ctx_servicios"]:checked'),
    ctx_asistencia:       document.querySelector('input[name="ctx_asistencia"]:checked')?.value,
    apoyo_aip:            document.getElementById('diag-apoyo-aip')?.value,
    // Step 4 — Problemática
    prob_tipo:        document.querySelector('input[name="prob_tipo"]:checked')?.value,
    prob_descripcion: document.getElementById('diag-problema-otro')?.value,
    prob_porcentaje:  document.getElementById('diag-prob-porcentaje')?.value,
    prob_evidencia:   getChecked('input[name="prob_evidencia"]:checked'),
    causas_ped:       getChecked('input[name="causas_ped"]:checked'),
    causas_ctx:       getChecked('input[name="causas_ctx"]:checked'),
    hipotesis:        buildHypothesis(),
    compromisos:      getChecked('input[name="compromisos"]:checked'),
  };

  submitToBackend({ ...payload, perfil: getProfileContext() }, '/api/tma/diagnostico/save', 'Analizando diagnóstico con IA…')
    .then(() => {
      // Mark step as done in pipeline
      const tag = document.getElementById('tag-diagnostico');
      if (tag) { tag.textContent = 'Completado'; tag.className = 'tag-badge done'; }
    });
});


document.querySelectorAll('input,select,textarea').forEach(input => {
  input.addEventListener('blur', () => {
    if (!input.checkValidity() && input.value !== '') {
      const parent = input.closest('.form-group') || input.parentElement;
      parent.classList.add('error-shake');
      twa?.HapticFeedback?.notificationOccurred?.('warning');
      setTimeout(() => parent.classList.remove('error-shake'), 400);
    }
  });
});