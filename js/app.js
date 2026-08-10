/* ============================================================
   app.js — Logique de l'application : navigation, rendu des
   pages, chrono, graphiques, modales, formulaires.
   Tout est stocké via DB.* (IndexedDB, database.js). Les seules
   préférences UI passent par Storage.* (localStorage, storage.js).
   ============================================================ */

const App = {};
const _charts = {}; // instances Chart.js actives, par id de canvas

// ---------------------------------------------------------------
// UTILITAIRES
// ---------------------------------------------------------------
const JOURS_LABEL = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };
const TYPE_LABEL = { muscu: 'Musculation', velo: 'Vélo', course: 'Course', repos: 'Repos' };

function todayKeyJour() {
  const idx = (new Date().getDay() + 6) % 7; // 0 = lundi
  return APP_DATA.JOURS_ORDRE[idx];
}
function dateToJourKey(date) {
  const idx = (date.getDay() + 6) % 7;
  return APP_DATA.JOURS_ORDRE[idx];
}
function formatDateFR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function todayISO() { return DB.todayISO(); }
function daysBetween(iso1, iso2) {
  const d1 = new Date(iso1), d2 = new Date(iso2);
  return Math.round((d2 - d1) / 86400000);
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function round1(n) { return Math.round(n * 10) / 10; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function currentWeekNumber() {
  const profile = await DB.getProfile();
  const diff = daysBetween(profile.dateDebut, todayISO());
  const weekIdx = Math.floor(diff / 7);
  return clamp(weekIdx + 1, 1, 4);
}

function toast(message, type = 'ok') {
  const box = document.getElementById('toast');
  const item = document.createElement('div');
  item.className = `toast-item toast-${type}`;
  item.textContent = message;
  box.appendChild(item);
  requestAnimationFrame(() => item.classList.add('show'));
  setTimeout(() => {
    item.classList.remove('show');
    setTimeout(() => item.remove(), 300);
  }, 2200);
}
App.saved = () => toast('Sauvegardé ✓', 'ok');
App.record = (label) => toast(`🏆 Nouveau record : ${label}`, 'record');

function view() { return document.getElementById('view'); }
function setView(html) { view().innerHTML = html; }

// ---------------------------------------------------------------
// MODALES
// ---------------------------------------------------------------
function openModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" data-action="close-modal"><div class="modal-box" onclick="event.stopPropagation()">${html}</div></div>`;
  root.classList.add('active');
}
function closeModal() {
  document.getElementById('modal-root').classList.remove('active');
  document.getElementById('modal-root').innerHTML = '';
}
function confirmDialog(message, onConfirm) {
  openModal(`
    <div class="confirm-box">
      <p>${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Annuler</button>
        <button class="btn btn-danger" id="confirm-yes">Confirmer</button>
      </div>
    </div>`);
  document.getElementById('confirm-yes').onclick = () => { closeModal(); onConfirm(); };
}

// ---------------------------------------------------------------
// NAVIGATION
// ---------------------------------------------------------------
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Tableau de bord', icon: '🏠' },
  { key: 'today', label: "Aujourd'hui", icon: '📅' },
  { key: 'program', label: 'Programme', icon: '🗓️' },
  { key: 'muscu', label: 'Musculation', icon: '💪' },
  { key: 'cardio', label: 'Cardio', icon: '🚴' },
  { key: 'nutrition', label: 'Nutrition', icon: '🍽️' },
  { key: 'progression', label: 'Progression', icon: '📈' },
  { key: 'historique', label: 'Historique', icon: '🗂️' },
  { key: 'exercices', label: 'Exercices', icon: '📚' },
  { key: 'settings', label: 'Paramètres', icon: '⚙️' }
];
const BOTTOM_NAV_KEYS = ['dashboard', 'today', 'nutrition', 'progression', 'settings'];

function renderNav(active) {
  const sidebar = document.getElementById('sidebar-nav');
  sidebar.innerHTML = NAV_ITEMS.map(it => `
    <button class="nav-item ${it.key === active ? 'active' : ''}" data-action="nav" data-page="${it.key}">
      <span class="nav-icon">${it.icon}</span><span class="nav-label">${it.label}</span>
    </button>`).join('');
  const bottom = document.getElementById('bottom-nav');
  bottom.innerHTML = NAV_ITEMS.filter(it => BOTTOM_NAV_KEYS.includes(it.key)).map(it => `
    <button class="bottom-nav-item ${it.key === active ? 'active' : ''}" data-action="nav" data-page="${it.key}">
      <span class="nav-icon">${it.icon}</span><span class="nav-label">${it.label}</span>
    </button>`).join('');
  document.getElementById('page-title').textContent = NAV_ITEMS.find(it => it.key === active)?.label || '';
}

async function goTo(page) {
  Storage.setPrefs({ activePage: page });
  renderNav(page);
  Object.keys(_charts).forEach(k => { _charts[k].destroy(); delete _charts[k]; });
  setView('<div class="loading">Chargement…</div>');
  const renderers = {
    dashboard: renderDashboard, today: renderToday, program: renderProgram,
    muscu: renderMuscu, cardio: renderCardio, nutrition: renderNutrition,
    progression: renderProgression, historique: renderHistorique,
    exercices: renderExercices, settings: renderSettings
  };
  await renderers[page]();
  document.querySelectorAll('[data-swap-food]').length; // no-op keep linter quiet
  window.scrollTo(0, 0);
}
App.goTo = goTo;

// ---------------------------------------------------------------
// PAGE : TABLEAU DE BORD
// ---------------------------------------------------------------
async function renderDashboard() {
  const profile = await DB.getProfile();
  const weights = await DB.getWeightHistory();
  const lastWeight = weights.length ? weights[weights.length - 1] : null;
  const poidsActuel = lastWeight ? lastWeight.weight : profile.poidsDepart;
  const restant = round1(Math.max(0, poidsActuel - profile.objectifPoids));
  const totalAPerdre = profile.poidsDepart - profile.objectifPoids;
  const dejaPerdu = profile.poidsDepart - poidsActuel;
  const pct = totalAPerdre > 0 ? clamp(round1((dejaPerdu / totalAPerdre) * 100), 0, 100) : 0;

  const jour = todayKeyJour();
  const semaine = await currentWeekNumber();
  const seance = APP_DATA.getJourProgramme(semaine, jour);

  const dateToday = todayISO();
  const hydration = (await DB.getHydrationHistory()).filter(h => h.date === dateToday);
  const eauTotal = hydration.reduce((s, h) => s + h.quantite, 0);
  const nutritionToday = (await DB.getNutritionHistory()).filter(n => n.date === dateToday);
  const calToday = nutritionToday.reduce((s, m) => s + (m.calories || 0), 0);
  const protToday = nutritionToday.reduce((s, m) => s + (m.proteines || 0), 0);
  const repasFaits = nutritionToday.filter(m => m.termine).length;
  const repasRestants = Math.max(0, Object.keys(APP_DATA.MEAL_PLAN).length - repasFaits);
  const stepsToday = (await DB.getStepsHistory()).filter(s => s.date === dateToday).slice(-1)[0];
  const sleepToday = (await DB.getSleepHistory()).filter(s => s.date === dateToday).slice(-1)[0];

  setView(`
    <div class="hero-greeting">
      <h2>Bonjour ${escapeHtml(profile.nom)} 👋</h2>
      <p class="muted">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    </div>

    <div class="stat-grid">
      <div class="stat-card accent-muscu">
        <div class="stat-label">Poids actuel</div>
        <div class="stat-value">${poidsActuel} <span class="unit">kg</span></div>
        <div class="stat-sub">Départ : ${profile.poidsDepart} kg</div>
      </div>
      <div class="stat-card accent-velo">
        <div class="stat-label">Objectif</div>
        <div class="stat-value">${profile.objectifPoids} <span class="unit">kg</span></div>
        <div class="stat-sub">Reste ${restant} kg</div>
      </div>
      <div class="stat-card accent-course">
        <div class="stat-label">Progression</div>
        <div class="stat-value">${pct}<span class="unit">%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="stat-card accent-nutrition">
        <div class="stat-label">Calories aujourd'hui</div>
        <div class="stat-value">${calToday}<span class="unit">kcal</span></div>
        <div class="stat-sub">Objectif ${APP_DATA.OBJECTIFS_NUTRITION.caloriesMin}-${APP_DATA.OBJECTIFS_NUTRITION.caloriesMax}</div>
      </div>
    </div>

    <div class="stat-grid stat-grid-small">
      <div class="mini-card"><div class="mini-label">Protéines</div><div class="mini-value">${protToday} g</div></div>
      <div class="mini-card"><div class="mini-label">Eau</div><div class="mini-value">${(eauTotal/1000).toFixed(2)} L</div></div>
      <div class="mini-card"><div class="mini-label">Pas</div><div class="mini-value">${stepsToday ? stepsToday.pas : '—'}</div></div>
      <div class="mini-card"><div class="mini-label">Sommeil</div><div class="mini-value">${sleepToday ? sleepToday.duree + ' h' : '—'}</div></div>
      <div class="mini-card"><div class="mini-label">Repas restants</div><div class="mini-value">${repasRestants}</div></div>
    </div>

    <div class="card">
      <h3>Séance prévue aujourd'hui</h3>
      ${seance ? `
        <div class="seance-preview accent-${seance.couleur}">
          <div class="seance-title">${escapeHtml(seance.titre)}</div>
          <div class="muted">${TYPE_LABEL[seance.type]}${seance.duree ? ' · ' + seance.duree + ' min' : ''}</div>
        </div>
        <button class="btn btn-primary" data-action="nav" data-page="today">Voir la séance du jour</button>
      ` : '<p class="muted">Aucune séance programmée.</p>'}
    </div>

    <div class="card">
      <h3>Évolution du poids</h3>
      <div class="chart-box chart-box-lg"><canvas id="chart-dashboard-weight"></canvas></div>
    </div>
  `);

  renderWeightChart('chart-dashboard-weight', weights);
}

function renderWeightChart(canvasId, weights) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;
  const labels = weights.map(w => formatDateFR(w.date));
  const data = weights.map(w => w.weight);
  const movingAvg = weights.map((w, i) => {
    const slice = weights.slice(Math.max(0, i - 6), i + 1);
    return round1(slice.reduce((s, x) => s + x.weight, 0) / slice.length);
  });
  _charts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Poids (kg)', data, borderColor: '#4f8cff', backgroundColor: 'rgba(79,140,255,0.15)', tension: 0.3, fill: true, pointRadius: 2 },
        { label: 'Moyenne 7 jours', data: movingAvg, borderColor: '#ff9f43', borderDash: [5, 4], tension: 0.3, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#c9d1e0' } } },
      scales: {
        x: { ticks: { color: '#8a94ab', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8a94ab' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// ---------------------------------------------------------------
// PAGE : AUJOURD'HUI
// ---------------------------------------------------------------
async function renderToday() {
  const jour = todayKeyJour();
  const semaine = await currentWeekNumber();
  const seance = APP_DATA.getJourProgramme(semaine, jour);
  const date = todayISO();

  const prefs = Storage.getPrefs();
  const timer = prefs.timerState;

  const workoutsToday = (await DB.getWorkoutHistory()).filter(w => w.date === date);
  const cyclingToday = (await DB.getCyclingHistory()).filter(w => w.date === date);
  const runningToday = (await DB.getRunningHistory()).filter(w => w.date === date);
  const sportDoneToday = seance && seance.type === 'muscu' ? workoutsToday.some(w => w.termine)
    : seance && seance.type === 'velo' ? cyclingToday.length > 0
    : seance && seance.type === 'course' ? runningToday.length > 0
    : true;

  const journalToday = (await DB.getJournal()).filter(j => j.date === date).slice(-1)[0];

  let seanceHtml = '<p class="muted">Repos aujourd\'hui, profites-en pour récupérer.</p>';
  if (seance) {
    if (seance.type === 'muscu') {
      seanceHtml = `
        <div class="steps-list">
          ${seance.echauffement ? `<div class="step-item">🔥 ${escapeHtml(seance.echauffement)}</div>` : ''}
          ${seance.blocs.map(b => {
            const ex = APP_DATA.getExerciseById(b.exerciceId);
            return `<div class="step-item clickable" data-action="open-exercise" data-id="${ex.id}">
              <strong>${escapeHtml(ex.nom)}</strong> — ${b.series} × ${b.reps}
            </div>`;
          }).join('')}
          ${seance.recuperation ? `<div class="step-item">🧊 ${escapeHtml(seance.recuperation)}</div>` : ''}
        </div>`;
    } else if (seance.etapes) {
      seanceHtml = `<div class="steps-list">${seance.etapes.map(e => `<div class="step-item">▸ ${escapeHtml(e)}</div>`).join('')}</div>`;
    } else if (seance.description) {
      seanceHtml = `<p>${escapeHtml(seance.description)}</p>`;
    }
  }

  setView(`
    <div class="card accent-${seance ? seance.couleur : 'repos'}">
      <div class="today-header">
        <div>
          <div class="day-badge">${JOURS_LABEL[jour].toUpperCase()} · Semaine ${semaine}</div>
          <h2>${seance ? escapeHtml(seance.titre) : 'Repos'}</h2>
          ${seance && seance.duree ? `<p class="muted">Durée conseillée : ${seance.duree} minutes</p>` : ''}
        </div>
        <div class="objectif-jour">
          <div class="objectif-label">Objectif du jour</div>
          <div class="objectif-text">"Aujourd'hui, ton seul objectif est de terminer ta séance et respecter tes repas."</div>
        </div>
      </div>
      ${seanceHtml}
      ${sportDoneToday ? '<div class="badge badge-done">✓ Séance faite aujourd\'hui</div>' : ''}
    </div>

    <div class="card">
      <h3>Chronomètre de séance</h3>
      <div class="timer-display" id="timer-display">${formatTimer(timer)}</div>
      <div class="timer-controls">
        <button class="btn btn-primary" data-action="timer-start">${timer && timer.running ? 'En cours…' : 'Commencer la séance'}</button>
        <button class="btn btn-ghost" data-action="timer-pause">Pause</button>
        <button class="btn btn-ghost" data-action="timer-reset">Réinitialiser</button>
      </div>
      <button class="btn btn-secondary" data-action="finish-session" style="margin-top:10px">Séance terminée ?</button>
    </div>

    ${seance && seance.type === 'muscu' ? `
    <div class="card">
      <h3>Enregistrer mes séries</h3>
      <div class="exercise-log-list">
        ${seance.blocs.map(b => {
          const ex = APP_DATA.getExerciseById(b.exerciceId);
          return `
          <form class="log-form" data-form="log-set" data-exercise-id="${ex.id}">
            <div class="log-form-title">${escapeHtml(ex.nom)} <span class="muted">(${b.series} × ${b.reps})</span></div>
            <div class="log-form-row">
              <input type="number" step="0.5" min="0" name="charge" placeholder="Charge (kg)" required>
              <input type="number" min="0" name="reps" placeholder="Répétitions" value="${typeof b.reps === 'number' ? b.reps : ''}">
              <input type="number" min="1" name="series" placeholder="Séries" value="${b.series}">
              <button class="btn btn-sm btn-primary" type="submit">Enregistrer</button>
            </div>
          </form>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${seance && seance.type === 'velo' ? renderCardioQuickForm('cycling', 'Vélo') : ''}
    ${seance && seance.type === 'course' ? renderCardioQuickForm('running', 'Course / marche') : ''}

    <div class="card">
      <h3>Checklist du jour</h3>
      <div id="checklist-container">Chargement…</div>
    </div>

    <div class="card">
      <h3>Journal du jour</h3>
      <form data-form="journal">
        <div class="form-grid">
          <label>Humeur
            <select name="humeur"><option>Excellent</option><option>Bon</option><option selected>Correct</option><option>Mauvais</option><option>Très mauvais</option></select>
          </label>
          <label>Fatigue (1-5)<input type="number" name="fatigue" min="1" max="5" value="${journalToday ? journalToday.fatigue : 3}"></label>
          <label>Motivation (1-5)<input type="number" name="motivation" min="1" max="5" value="${journalToday ? journalToday.motivation : 3}"></label>
          <label>Faim (1-5)<input type="number" name="faim" min="1" max="5" value="${journalToday ? journalToday.faim : 3}"></label>
          <label>Douleurs<input type="text" name="douleurs" placeholder="Aucune" value="${journalToday ? escapeHtml(journalToday.douleurs || '') : ''}"></label>
        </div>
        <label>Commentaire libre<textarea name="commentaire" rows="2">${journalToday ? escapeHtml(journalToday.commentaire || '') : ''}</textarea></label>
        <button class="btn btn-primary" type="submit">Enregistrer le journal</button>
      </form>
    </div>
  `);

  renderChecklist(date);
  if (timer && timer.running) startTimerTick();
}

function renderCardioQuickForm(kind, label) {
  const isVelo = kind === 'cycling';
  return `
    <div class="card">
      <h3>Enregistrer ma sortie ${label}</h3>
      <form data-form="${kind}">
        <div class="form-grid">
          <label>Durée (minutes)<input type="number" name="duree" min="1" required></label>
          <label>Distance (km)<input type="number" step="0.1" min="0" name="distance"></label>
          ${isVelo ? '<label>Vitesse moyenne (km/h)<input type="number" step="0.1" min="0" name="vitesseMoyenne"></label>'
                   : '<label>Allure (min/km)<input type="text" name="allure" placeholder="ex: 7:30"></label>'}
          <label>Difficulté (1-5)<input type="number" name="difficulte" min="1" max="5" value="3"></label>
        </div>
        <label>Commentaire<textarea name="commentaire" rows="2"></textarea></label>
        <button class="btn btn-primary" type="submit">Enregistrer la sortie</button>
      </form>
    </div>`;
}

async function renderChecklist(date) {
  const daily = (await DB.getDailyChecklists()).find(d => d.date === date) || {};
  const profile = await DB.getProfile();
  const hydration = (await DB.getHydrationHistory()).filter(h => h.date === date);
  const eauTotal = hydration.reduce((s, h) => s + h.quantite, 0);
  const steps = (await DB.getStepsHistory()).filter(s => s.date === date).slice(-1)[0];
  const weight = (await DB.getWeightHistory()).some(w => w.date === date);
  const sleep = (await DB.getSleepHistory()).some(s => s.date === date);
  const nutrition = (await DB.getNutritionHistory()).filter(n => n.date === date);
  const seance = APP_DATA.getJourProgramme(await currentWeekNumber(), todayKeyJour());
  const workouts = (await DB.getWorkoutHistory()).filter(w => w.date === date);
  const cycling = (await DB.getCyclingHistory()).filter(w => w.date === date);
  const running = (await DB.getRunningHistory()).filter(w => w.date === date);

  const items = {
    petitDej: nutrition.some(n => n.repas === 'petitDejeuner' && n.termine),
    dejeuner: nutrition.some(n => n.repas === 'dejeuner' && n.termine),
    collation: nutrition.some(n => n.repas === 'collationAM' && n.termine),
    diner: nutrition.some(n => n.repas === 'diner' && n.termine),
    eau: eauTotal >= profile.eauCible,
    sport: !seance || seance.type === 'repos' ? true : (workouts.some(w => w.termine) || cycling.length > 0 || running.length > 0),
    pas: steps ? steps.pas >= profile.pasCible : false,
    pesee: weight,
    sommeil: sleep
  };
  const score = Math.round(Object.values(items).filter(Boolean).length / Object.keys(items).length * 100);
  await DB.saveDailyLog(date, { ...items, score });

  const labels = { petitDej: 'Petit-déjeuner', dejeuner: 'Déjeuner', collation: 'Collation', diner: 'Dîner',
    eau: '2,5 L eau', sport: 'Séance de sport', pas: 'Objectif de pas', pesee: 'Pesée du matin', sommeil: 'Sommeil enregistré' };

  document.getElementById('checklist-container').innerHTML = `
    <div class="checklist-score">Score du jour : <strong>${score}%</strong></div>
    <div class="progress-bar"><div class="progress-fill" style="width:${score}%"></div></div>
    <ul class="checklist">
      ${Object.entries(items).map(([k, v]) => `<li class="${v ? 'checked' : ''}">${v ? '✅' : '⬜'} ${labels[k]}</li>`).join('')}
    </ul>
    <p class="muted small">Cette checklist se met à jour automatiquement à partir de tes actions (repas cochés, eau, poids, sommeil, pas, séance).</p>
  `;
}

function formatTimer(t) {
  const ms = timerElapsedMs(t);
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
function timerElapsedMs(t) {
  if (!t) return 0;
  let ms = t.elapsedBeforePause || 0;
  if (t.running && t.startedAt) ms += Date.now() - t.startedAt;
  return ms;
}
let _timerInterval = null;
function startTimerTick() {
  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = setInterval(() => {
    const t = Storage.getPrefs().timerState;
    const el = document.getElementById('timer-display');
    if (el && t) el.textContent = formatTimer(t);
    else clearInterval(_timerInterval);
  }, 1000);
}
App.timerStart = () => {
  const prefs = Storage.getPrefs();
  const t = prefs.timerState || { elapsedBeforePause: 0 };
  t.running = true; t.startedAt = Date.now();
  Storage.setPrefs({ timerState: t });
  startTimerTick();
};
App.timerPause = () => {
  const prefs = Storage.getPrefs();
  const t = prefs.timerState;
  if (!t || !t.running) return;
  t.elapsedBeforePause = timerElapsedMs(t);
  t.running = false; t.startedAt = null;
  Storage.setPrefs({ timerState: t });
  document.getElementById('timer-display').textContent = formatTimer(t);
};
App.timerReset = () => {
  Storage.setPrefs({ timerState: { elapsedBeforePause: 0, running: false, startedAt: null } });
  const el = document.getElementById('timer-display');
  if (el) el.textContent = '00:00:00';
};
App.finishSession = () => {
  const prefs = Storage.getPrefs();
  const t = prefs.timerState;
  const elapsedMin = Math.round(timerElapsedMs(t) / 60000);
  openModal(`
    <h3>Séance terminée ?</h3>
    <form id="finish-form">
      <label>Séance terminée ?
        <select name="termine"><option value="oui">Oui</option><option value="non">Non</option></select>
      </label>
      <label>Durée réelle (minutes)<input type="number" name="duree" min="0" value="${elapsedMin}"></label>
      <label>Difficulté (1 à 5)<input type="number" name="difficulte" min="1" max="5" value="3"></label>
      <label>Douleur éventuelle<input type="text" name="douleur" placeholder="Aucune"></label>
      <label>Commentaire<textarea name="commentaire" rows="2"></textarea></label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-action="close-modal">Annuler</button>
        <button type="submit" class="btn btn-primary">Valider</button>
      </div>
    </form>
  `);
  document.getElementById('finish-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const jour = todayKeyJour();
    const semaine = await currentWeekNumber();
    const seance = APP_DATA.getJourProgramme(semaine, jour);
    await DB.saveWorkout({
      type: seance ? seance.type : 'muscu', exercice: seance ? seance.titre : 'Séance',
      dureeSeance: Number(fd.get('duree')) || 0, difficulte: Number(fd.get('difficulte')),
      douleur: fd.get('douleur'), commentaire: fd.get('commentaire'), termine: fd.get('termine') === 'oui'
    });
    App.timerReset();
    closeModal();
    App.saved();
    goTo('today');
  };
};

// ---------------------------------------------------------------
// PAGE : PROGRAMME (4 semaines)
// ---------------------------------------------------------------
let _programWeekPreview = null;
async function renderProgram() {
  if (!_programWeekPreview) _programWeekPreview = await currentWeekNumber();
  const semaine = _programWeekPreview;
  const week = APP_DATA.getSemaineComplete(semaine);
  setView(`
    <div class="card">
      <div class="week-selector">
        ${[1, 2, 3, 4].map(w => `<button class="btn btn-sm ${w === semaine ? 'btn-primary' : 'btn-ghost'}" data-action="program-week" data-week="${w}">Semaine ${w}</button>`).join('')}
      </div>
    </div>
    <div class="program-grid">
      ${APP_DATA.JOURS_ORDRE.map(j => {
        const d = week[j];
        if (!d) return '';
        return `<div class="card day-card accent-${d.couleur}">
          <div class="day-card-header">${JOURS_LABEL[j]}</div>
          <div class="day-card-title">${escapeHtml(d.titre)}</div>
          <div class="muted">${TYPE_LABEL[d.type]}${d.duree ? ' · ' + d.duree + ' min' : ''}</div>
          ${d.blocs ? `<ul class="mini-list">${d.blocs.map(b => {
            const ex = APP_DATA.getExerciseById(b.exerciceId);
            return `<li>${escapeHtml(ex.nom)} — ${b.series}×${b.reps}</li>`;
          }).join('')}</ul>` : ''}
          ${d.etapes ? `<ul class="mini-list">${d.etapes.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : ''}
          ${d.description && !d.etapes ? `<p class="muted small">${escapeHtml(d.description)}</p>` : ''}
        </div>`;
      }).join('')}
    </div>
  `);
}
App.programWeek = (w) => { _programWeekPreview = Number(w); renderProgram(); };

// ---------------------------------------------------------------
// PAGE : MUSCULATION
// ---------------------------------------------------------------
async function renderMuscu() {
  const workouts = await DB.getWorkoutHistory();
  const byExercise = {};
  APP_DATA.EXERCISES.forEach(ex => byExercise[ex.id] = []);
  // les entrées de workoutHistory ne sont pas forcément liées à un exerciceId précis
  // (séance globale) — on affiche donc surtout la bibliothèque + logs récents de séries.
  const setLogs = JSON.parse(localStorage.getItem('bedis-fitness-setlogs') || '[]');

  setView(`
    <div class="card">
      <h3>Bibliothèque musculation</h3>
      <p class="muted">Clique un exercice pour voir la technique et ton historique de charges.</p>
      <div class="exercise-grid">
        ${APP_DATA.EXERCISES.map(ex => renderExerciseCard(ex, setLogs)).join('')}
      </div>
    </div>
    <div class="card">
      <h3>Dernières séances de musculation</h3>
      ${workouts.filter(w => w.type === 'muscu').slice(-8).reverse().map(w => `
        <div class="history-row">
          <span>${formatDateFR(w.date)}</span><span>${escapeHtml(w.exercice || '')}</span>
          <span>${w.dureeSeance || 0} min</span>
          <span>${w.termine ? '✅' : '⬜'}</span>
        </div>`).join('') || '<p class="muted">Aucune séance enregistrée pour le moment.</p>'}
    </div>
  `);
}

function renderExerciseCard(ex, setLogs) {
  const logs = (setLogs || []).filter(l => l.exerciseId === ex.id);
  const last = logs.length ? logs[logs.length - 1] : null;
  return `
    <div class="exercise-card accent-${ex.couleur}" data-action="open-exercise" data-id="${ex.id}">
      <div class="exercise-thumb">${ex.imageUrl ? `<img src="${escapeHtml(ex.imageUrl)}" alt="${escapeHtml(ex.nom)}">` : placeholderThumb(ex)}</div>
      <div class="exercise-card-body">
        <div class="exercise-name">${escapeHtml(ex.nom)}</div>
        <div class="muted small">${escapeHtml(ex.groupe)}</div>
        ${last ? `<div class="muted small">Dernière charge : ${last.charge} kg</div>` : ''}
        <div class="link-fake">Voir comment faire →</div>
      </div>
    </div>`;
}
function placeholderThumb(ex) {
  const initials = ex.nom.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return `<div class="thumb-placeholder">${initials}</div>`;
}

async function logSet(exerciseId, form) {
  const fd = new FormData(form);
  const ex = APP_DATA.getExerciseById(exerciseId);
  const charge = Number(fd.get('charge'));
  const reps = Number(fd.get('reps')) || ex.repsDefaut;
  const series = Number(fd.get('series')) || ex.seriesDefaut;

  await DB.saveWorkout({ type: 'muscu', exercice: ex.nom, exerciceId: ex.id, series, repsPlanned: ex.repsDefaut, repsDone: reps, charge, repos: ex.reposDefaut, termine: true });

  const logs = JSON.parse(localStorage.getItem('bedis-fitness-setlogs') || '[]');
  const isRecord = !logs.some(l => l.exerciseId === exerciseId && l.charge >= charge);
  logs.push({ exerciseId, date: todayISO(), charge, reps, series });
  localStorage.setItem('bedis-fitness-setlogs', JSON.stringify(logs));

  App.saved();
  if (isRecord) App.record(ex.nom + ' : ' + charge + ' kg');
}

// ---------------------------------------------------------------
// MODALE EXERCICE (fiche complète + technique)
// ---------------------------------------------------------------
function App_openExercise(id) {
  const ex = APP_DATA.getExerciseById(id);
  if (!ex) return;
  const logs = JSON.parse(localStorage.getItem('bedis-fitness-setlogs') || '[]').filter(l => l.exerciseId === id);
  const searchQuery = encodeURIComponent(`${ex.nom} technique musculation tutoriel`);
  openModal(`
    <div class="exercise-modal">
      <div class="exercise-modal-media">
        ${ex.imageUrl ? `<img src="${escapeHtml(ex.imageUrl)}" alt="${escapeHtml(ex.nom)}">` : placeholderThumb(ex)}
      </div>
      <h2>${escapeHtml(ex.nom)}</h2>
      <div class="muted">${escapeHtml(ex.groupe)} · ${ex.seriesDefaut} séries × ${ex.repsDefaut} reps · repos ${ex.reposDefaut}s</div>

      ${ex.videoUrl
        ? `<button class="btn btn-primary" id="show-video-btn">▶ Voir la technique</button>
           <div id="video-container" style="display:none;margin-top:10px">
             <div class="video-embed"><iframe src="${escapeHtml(ex.videoUrl)}" title="${escapeHtml(ex.nom)}" allowfullscreen></iframe></div>
           </div>`
        : `<a class="btn btn-secondary" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${searchQuery}">🔎 Chercher la technique sur YouTube</a>
           <p class="muted small">Aucune vidéo configurée pour cet exercice. Ajoute un lien dans js/data.js (champ videoUrl).</p>`}

      <h4>Description</h4>
      <p>${escapeHtml(ex.description)}</p>
      <h4>Conseils d'exécution</h4>
      <ul>${ex.conseils.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
      <h4>Erreurs à éviter</h4>
      <ul>${ex.erreurs.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>

      <h4>Historique des charges</h4>
      ${logs.length ? `
        <div class="chart-box"><canvas id="chart-exercise-history"></canvas></div>
        <table class="mini-table">
          <tr><th>Date</th><th>Charge</th><th>Séries×Reps</th></tr>
          ${logs.slice().reverse().map(l => `<tr><td>${formatDateFR(l.date)}</td><td>${l.charge} kg</td><td>${l.series}×${l.reps}</td></tr>`).join('')}
        </table>
      ` : '<p class="muted">Pas encore de charge enregistrée pour cet exercice.</p>'}
    </div>
  `);
  document.getElementById('show-video-btn')?.addEventListener('click', () => {
    document.getElementById('video-container').style.display = 'block';
    document.getElementById('show-video-btn').style.display = 'none';
  });
  if (logs.length) {
    const canvas = document.getElementById('chart-exercise-history');
    _charts['chart-exercise-history'] = new Chart(canvas, {
      type: 'line',
      data: { labels: logs.map(l => formatDateFR(l.date)), datasets: [{ label: 'Charge (kg)', data: logs.map(l => l.charge), borderColor: '#4f8cff', backgroundColor: 'rgba(79,140,255,0.15)', fill: true, tension: 0.25 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: '#8a94ab' }, grid: { display: false } }, y: { ticks: { color: '#8a94ab' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
  }
}
App.openExercise = App_openExercise;

// ---------------------------------------------------------------
// PAGE : EXERCICES (bibliothèque complète)
// ---------------------------------------------------------------
async function renderExercices() {
  const setLogs = JSON.parse(localStorage.getItem('bedis-fitness-setlogs') || '[]');
  const groupes = [...new Set(APP_DATA.EXERCISES.map(e => e.groupe))];
  setView(`
    <div class="card">
      <h3>Tous les exercices</h3>
      <div class="exercise-grid">
        ${APP_DATA.EXERCISES.map(ex => renderExerciseCard(ex, setLogs)).join('')}
      </div>
    </div>
  `);
}

// ---------------------------------------------------------------
// PAGE : CARDIO
// ---------------------------------------------------------------
async function renderCardio() {
  const cycling = await DB.getCyclingHistory();
  const running = await DB.getRunningHistory();
  const totalKmVelo = round1(cycling.reduce((s, c) => s + (Number(c.distance) || 0), 0));
  const totalKmCourse = round1(running.reduce((s, r) => s + (Number(r.distance) || 0), 0));

  setView(`
    <div class="stat-grid">
      <div class="stat-card accent-velo"><div class="stat-label">Total vélo</div><div class="stat-value">${totalKmVelo} <span class="unit">km</span></div></div>
      <div class="stat-card accent-course"><div class="stat-label">Total course/marche</div><div class="stat-value">${totalKmCourse} <span class="unit">km</span></div></div>
    </div>

    ${renderCardioQuickForm('cycling', 'Vélo')}
    ${renderCardioQuickForm('running', 'Course / marche')}

    <div class="card">
      <h3>Historique vélo</h3>
      ${cycling.slice().reverse().slice(0, 15).map(c => `
        <div class="history-row"><span>${formatDateFR(c.date)}</span><span>${c.duree} min</span><span>${c.distance || '—'} km</span><span>Diff. ${c.difficulte || '—'}/5</span></div>
      `).join('') || '<p class="muted">Aucune sortie enregistrée.</p>'}
    </div>
    <div class="card">
      <h3>Historique course / marche</h3>
      ${running.slice().reverse().slice(0, 15).map(r => `
        <div class="history-row"><span>${formatDateFR(r.date)}</span><span>${r.duree} min</span><span>${r.distance || '—'} km</span><span>Diff. ${r.difficulte || '—'}/5</span></div>
      `).join('') || '<p class="muted">Aucune sortie enregistrée.</p>'}
    </div>
  `);
}

// ---------------------------------------------------------------
// PAGE : NUTRITION
// ---------------------------------------------------------------
async function renderNutrition() {
  const date = todayISO();
  const todayMeals = (await DB.getNutritionHistory()).filter(n => n.date === date);
  const mealsState = {};
  Object.keys(APP_DATA.MEAL_PLAN).forEach(key => {
    const saved = todayMeals.find(m => m.repas === key);
    const base = APP_DATA.MEAL_PLAN[key];
    mealsState[key] = saved ? saved : { repas: key, aliments: base.aliments, termine: false,
      calories: base.aliments.reduce((s, a) => s + a.calories, 0), proteines: base.aliments.reduce((s, a) => s + a.proteines, 0) };
  });

  const totalCal = Object.values(mealsState).reduce((s, m) => s + (m.calories || 0), 0);
  const totalProt = Object.values(mealsState).reduce((s, m) => s + (m.proteines || 0), 0);
  const obj = APP_DATA.OBJECTIFS_NUTRITION;

  setView(`
    <div class="stat-grid">
      <div class="stat-card accent-nutrition"><div class="stat-label">Calories du jour</div><div class="stat-value">${totalCal}<span class="unit">kcal</span></div><div class="stat-sub">Objectif ${obj.caloriesMin}-${obj.caloriesMax}</div></div>
      <div class="stat-card accent-nutrition"><div class="stat-label">Protéines</div><div class="stat-value">${totalProt}<span class="unit">g</span></div><div class="stat-sub">Min ${obj.proteinesMin} g</div></div>
    </div>

    <div class="meal-list">
      ${Object.entries(APP_DATA.MEAL_PLAN).map(([key, meal]) => renderMealCard(key, meal, mealsState[key])).join('')}
    </div>

    <div class="card">
      <h3>Liste de courses (7 jours)</h3>
      <ul class="shopping-list">
        ${APP_DATA.SHOPPING_LIST_7J.map(i => `<li>${escapeHtml(i.item)} — <strong>${escapeHtml(i.quantite)}</strong></li>`).join('')}
      </ul>
    </div>
  `);
}

function renderMealCard(key, meal, state) {
  const aliments = state.aliments || meal.aliments;
  return `
    <div class="card meal-card ${state.termine ? 'meal-done' : ''}">
      <div class="meal-header">
        <div><strong>${escapeHtml(meal.nom)}</strong> <span class="muted">${meal.heure}</span></div>
        <label class="checkbox-label">
          <input type="checkbox" data-action="toggle-meal" data-meal="${key}" ${state.termine ? 'checked' : ''}>
          Repas terminé
        </label>
      </div>
      <ul class="food-list">
        ${aliments.map((a, i) => `
          <li>
            <span>${escapeHtml(a.nom)} — ${escapeHtml(a.quantite)} <span class="muted small">(${a.calories} kcal · ${a.proteines} g prot.)</span></span>
            ${APP_DATA.getSwapsFor(a) ? `<button class="btn btn-xs btn-ghost" data-action="swap-food" data-meal="${key}" data-index="${i}">Remplacer</button>` : ''}
          </li>`).join('')}
      </ul>
      <div class="muted small">Total : ${state.calories} kcal · ${state.proteines} g protéines</div>
    </div>`;
}

async function toggleMealDone(mealKey, checked) {
  const date = todayISO();
  const base = APP_DATA.MEAL_PLAN[mealKey];
  const existing = (await DB.getNutritionHistory()).find(m => m.date === date && m.repas === mealKey);
  const aliments = existing ? existing.aliments : base.aliments;
  const calories = aliments.reduce((s, a) => s + a.calories, 0);
  const proteines = aliments.reduce((s, a) => s + a.proteines, 0);
  await DB.saveMealUpsert(date, mealKey, { aliments, calories, proteines, heure: base.heure, termine: checked });
  App.saved();
  renderNutrition();
}
App.toggleMeal = toggleMealDone;

async function openSwapModal(mealKey, index) {
  const base = APP_DATA.MEAL_PLAN[mealKey];
  const date = todayISO();
  const existing = (await DB.getNutritionHistory()).find(m => m.date === date && m.repas === mealKey);
  const aliments = existing ? existing.aliments : base.aliments;
  const aliment = aliments[index];
  const swaps = APP_DATA.getSwapsFor(aliment);
  if (!swaps) return;
  openModal(`
    <h3>Remplacer : ${escapeHtml(aliment.nom)}</h3>
    <p class="muted">Choisis un remplacement. La quantité est ajustée pour rester proche des calories/protéines d'origine.</p>
    <div class="swap-options">
      ${swaps.map((s, i) => `
        <button class="swap-option" data-action="select-swap" data-meal="${mealKey}" data-index="${index}" data-swap="${i}">
          <strong>${escapeHtml(s.nom)}</strong> — ${escapeHtml(s.quantite)}<br>
          <span class="muted small">${s.calories} kcal · ${s.proteines} g protéines</span>
        </button>`).join('')}
    </div>
  `);
}
App.openSwap = openSwapModal;

async function selectSwap(mealKey, index, swapIdx) {
  const base = APP_DATA.MEAL_PLAN[mealKey];
  const date = todayISO();
  const existing = (await DB.getNutritionHistory()).find(m => m.date === date && m.repas === mealKey);
  const aliments = (existing ? existing.aliments : base.aliments).slice();
  const original = aliments[index];
  const swap = APP_DATA.getSwapsFor(original)[swapIdx];
  aliments[index] = swap;
  const calories = aliments.reduce((s, a) => s + a.calories, 0);
  const proteines = aliments.reduce((s, a) => s + a.proteines, 0);
  const modifications = (existing && existing.modifications ? existing.modifications : []).concat([`${original.nom} → ${swap.nom}`]);
  await DB.saveMealUpsert(date, mealKey, { aliments, calories, proteines, heure: base.heure, termine: existing ? existing.termine : false, modifications });
  closeModal();
  App.saved();
  renderNutrition();
}
App.selectSwap = selectSwap;

// ---------------------------------------------------------------
// PAGE : PROGRESSION
// ---------------------------------------------------------------
async function renderProgression() {
  const profile = await DB.getProfile();
  const weights = await DB.getWeightHistory();
  const measurements = await DB.getMeasurementsHistory();
  const nutrition = await DB.getNutritionHistory();
  const workouts = await DB.getWorkoutHistory();
  const cycling = await DB.getCyclingHistory();
  const running = await DB.getRunningHistory();
  const steps = await DB.getStepsHistory();
  const sleep = await DB.getSleepHistory();
  const checklists = await DB.getDailyChecklists();

  const poidsActuel = weights.length ? weights[weights.length - 1].weight : profile.poidsDepart;
  const poidsPerdu = round1(profile.poidsDepart - poidsActuel);
  const pct = clamp(round1((poidsPerdu / (profile.poidsDepart - profile.objectifPoids)) * 100), 0, 100);
  const joursEcoules = Math.max(0, daysBetween(profile.dateDebut, todayISO()));
  const totalSeances = workouts.filter(w => w.termine).length + cycling.length + running.length;
  const totalHeures = round1((workouts.reduce((s, w) => s + (w.dureeSeance || 0), 0) + cycling.reduce((s, c) => s + (c.duree || 0), 0) + running.reduce((s, r) => s + (r.duree || 0), 0)) / 60);
  const kmVelo = round1(cycling.reduce((s, c) => s + (Number(c.distance) || 0), 0));
  const kmCourse = round1(running.reduce((s, r) => s + (Number(r.distance) || 0), 0));
  const totalPas = steps.reduce((s, x) => s + (Number(x.pas) || 0), 0);
  const joursRespectes = checklists.filter(c => c.score >= 80).length;
  const imc = round1(poidsActuel / Math.pow(profile.taille / 100, 2));

  const perteHebdo = weights.length >= 2 ? round1(((weights[0].weight - poidsActuel) / Math.max(1, daysBetween(weights[0].date, todayISO()))) * 7) : 0;
  const kgRestants = round1(Math.max(0, poidsActuel - profile.objectifPoids));
  const semainesEstimees = perteHebdo > 0.05 ? Math.ceil(kgRestants / perteHebdo) : null;

  const records = computeRecords(workouts, cycling, running, steps);

  setView(`
    <div class="transformation-hero">
      <div class="transfo-col"><div class="transfo-label">DÉBUT</div><div class="transfo-value">${profile.poidsDepart} kg</div></div>
      <div class="transfo-arrow">→</div>
      <div class="transfo-col highlight"><div class="transfo-label">AUJOURD'HUI</div><div class="transfo-value">${poidsActuel} kg</div></div>
      <div class="transfo-arrow">→</div>
      <div class="transfo-col"><div class="transfo-label">OBJECTIF</div><div class="transfo-value">${profile.objectifPoids} kg</div></div>
    </div>

    <div class="stat-grid">
      <div class="mini-card"><div class="mini-label">Kg perdus</div><div class="mini-value">${poidsPerdu}</div></div>
      <div class="mini-card"><div class="mini-label">Jours écoulés</div><div class="mini-value">${joursEcoules}</div></div>
      <div class="mini-card"><div class="mini-label">Séances</div><div class="mini-value">${totalSeances}</div></div>
      <div class="mini-card"><div class="mini-label">Heures de sport</div><div class="mini-value">${totalHeures}</div></div>
      <div class="mini-card"><div class="mini-label">Km vélo</div><div class="mini-value">${kmVelo}</div></div>
      <div class="mini-card"><div class="mini-label">Km course</div><div class="mini-value">${kmCourse}</div></div>
      <div class="mini-card"><div class="mini-label">Total pas</div><div class="mini-value">${totalPas}</div></div>
      <div class="mini-card"><div class="mini-label">Jours réussis</div><div class="mini-value">${joursRespectes}</div></div>
    </div>

    <div class="card">
      <h3>Calculs</h3>
      <div class="calc-grid">
        <div>IMC actuel : <strong>${imc}</strong></div>
        <div>Progression vers l'objectif : <strong>${pct}%</strong></div>
        <div>Moyenne perte / semaine : <strong>${perteHebdo} kg</strong></div>
        <div>Temps restant estimé : <strong>${semainesEstimees ? '≈ ' + semainesEstimees + ' semaines (tendance actuelle, non garanti)' : 'pas encore assez de données'}</strong></div>
      </div>
    </div>

    <div class="card">
      <h3>Records personnels 🏆</h3>
      <ul class="records-list">
        ${records.map(r => `<li><strong>${escapeHtml(r.label)}</strong> — ${escapeHtml(r.value)}</li>`).join('') || '<li class="muted">Pas encore de record enregistré.</li>'}
      </ul>
    </div>

    <div class="charts-grid">
      <div class="card"><h4>Évolution du poids</h4><div class="chart-box"><canvas id="chart-p-weight"></canvas></div></div>
      <div class="card"><h4>Tour de taille</h4><div class="chart-box"><canvas id="chart-p-waist"></canvas></div></div>
      <div class="card"><h4>Calories / jour</h4><div class="chart-box"><canvas id="chart-p-cal"></canvas></div></div>
      <div class="card"><h4>Protéines / jour</h4><div class="chart-box"><canvas id="chart-p-prot"></canvas></div></div>
      <div class="card"><h4>Distance vélo</h4><div class="chart-box"><canvas id="chart-p-velo"></canvas></div></div>
      <div class="card"><h4>Distance course</h4><div class="chart-box"><canvas id="chart-p-course"></canvas></div></div>
      <div class="card"><h4>Sommeil</h4><div class="chart-box"><canvas id="chart-p-sleep"></canvas></div></div>
    </div>
  `);

  renderWeightChart('chart-p-weight', weights);
  lineChart('chart-p-waist', measurements.map(m => formatDateFR(m.date)), measurements.map(m => m.waist), 'Tour de taille (cm)', '#9b6bff');
  const nutByDate = groupSum(nutrition, 'date', 'calories');
  lineChart('chart-p-cal', Object.keys(nutByDate).map(formatDateFR), Object.values(nutByDate), 'Calories', '#ffbe4f');
  const protByDate = groupSum(nutrition, 'date', 'proteines');
  lineChart('chart-p-prot', Object.keys(protByDate).map(formatDateFR), Object.values(protByDate), 'Protéines (g)', '#4fd6a8');
  lineChart('chart-p-velo', cycling.map(c => formatDateFR(c.date)), cycling.map(c => Number(c.distance) || 0), 'Km vélo', '#4f8cff');
  lineChart('chart-p-course', running.map(r => formatDateFR(r.date)), running.map(r => Number(r.distance) || 0), 'Km course', '#ff6b6b');
  lineChart('chart-p-sleep', sleep.map(s => formatDateFR(s.date)), sleep.map(s => Number(s.duree) || 0), 'Heures de sommeil', '#7c6bff');
}

function groupSum(arr, dateKey, valKey) {
  const out = {};
  arr.forEach(item => { out[item[dateKey]] = (out[item[dateKey]] || 0) + (Number(item[valKey]) || 0); });
  return out;
}
function lineChart(canvasId, labels, data, label, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;
  _charts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: [{ label, data, borderColor: color, backgroundColor: color + '26', fill: true, tension: 0.3, pointRadius: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { ticks: { color: '#8a94ab', maxTicksLimit: 6 }, grid: { display: false } }, y: { ticks: { color: '#8a94ab' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
  });
}

function computeRecords(workouts, cycling, running, steps) {
  const records = [];
  const byExercise = {};
  workouts.forEach(w => {
    if (!w.exercice || !w.charge) return;
    if (!byExercise[w.exercice] || w.charge > byExercise[w.exercice]) byExercise[w.exercice] = w.charge;
  });
  Object.entries(byExercise).forEach(([name, charge]) => records.push({ label: name, value: charge + ' kg' }));
  if (cycling.length) {
    const best = cycling.reduce((a, b) => (Number(b.distance) || 0) > (Number(a.distance) || 0) ? b : a);
    records.push({ label: 'Plus longue sortie vélo', value: (best.distance || 0) + ' km' });
  }
  if (running.length) {
    const best = running.reduce((a, b) => (b.duree || 0) > (a.duree || 0) ? b : a);
    records.push({ label: 'Plus longue course/marche', value: (best.duree || 0) + ' min' });
  }
  if (steps.length) {
    const best = steps.reduce((a, b) => (b.pas || 0) > (a.pas || 0) ? b : a);
    records.push({ label: 'Plus grand nombre de pas', value: best.pas + ' pas' });
  }
  return records;
}

// ---------------------------------------------------------------
// PAGE : HISTORIQUE
// ---------------------------------------------------------------
let _historyFilter = 'depuisDebut';
async function renderHistorique() {
  const profile = await DB.getProfile();
  const checklists = await DB.getDailyChecklists();
  const weights = await DB.getWeightHistory();
  const nutrition = await DB.getNutritionHistory();
  const hydration = await DB.getHydrationHistory();
  const steps = await DB.getStepsHistory();
  const workouts = await DB.getWorkoutHistory();
  const journal = await DB.getJournal();

  const filters = [
    { key: 'today', label: "Aujourd'hui" }, { key: '7', label: '7 jours' }, { key: '30', label: '30 jours' },
    { key: '90', label: '3 mois' }, { key: '180', label: '6 mois' }, { key: '365', label: '1 an' },
    { key: 'depuisDebut', label: 'Depuis le début' }
  ];
  const cutoffDate = _historyFilter === 'depuisDebut' ? profile.dateDebut
    : _historyFilter === 'today' ? todayISO()
    : new Date(Date.now() - Number(_historyFilter) * 86400000).toISOString().slice(0, 10);

  const allDates = [...new Set([...checklists.map(c => c.date), ...weights.map(w => w.date)])]
    .filter(d => d >= cutoffDate).sort().reverse();

  setView(`
    <div class="card">
      <div class="filter-row">
        ${filters.map(f => `<button class="btn btn-sm ${f.key === _historyFilter ? 'btn-primary' : 'btn-ghost'}" data-action="history-filter" data-filter="${f.key}">${f.label}</button>`).join('')}
      </div>
    </div>

    <div class="card">
      <h3>Calendrier</h3>
      <div id="calendar-container"></div>
      <div class="calendar-legend">
        <span><i class="dot dot-green"></i> Journée complète</span>
        <span><i class="dot dot-orange"></i> Journée partielle</span>
        <span><i class="dot dot-red"></i> Journée non respectée</span>
      </div>
    </div>

    <div class="card">
      <h3>Timeline</h3>
      <div class="timeline">
        ${allDates.length ? allDates.map(date => renderTimelineDay(date, { weights, nutrition, hydration, steps, workouts, journal, checklists })).join('') : '<p class="muted">Aucune donnée sur cette période.</p>'}
      </div>
    </div>
  `);

  renderCalendar(checklists);
}
App.historyFilter = (f) => { _historyFilter = f; renderHistorique(); };

function renderTimelineDay(date, data) {
  const w = data.weights.find(x => x.date === date);
  const n = data.nutrition.filter(x => x.date === date);
  const cal = n.reduce((s, x) => s + (x.calories || 0), 0);
  const prot = n.reduce((s, x) => s + (x.proteines || 0), 0);
  const eau = data.hydration.filter(x => x.date === date).reduce((s, x) => s + x.quantite, 0);
  const st = data.steps.filter(x => x.date === date).slice(-1)[0];
  const wo = data.workouts.filter(x => x.date === date && x.termine);
  const check = data.checklists.find(c => c.date === date);
  return `
    <div class="timeline-item clickable" data-action="open-day" data-date="${date}">
      <div class="timeline-date">${formatDateFR(date)}</div>
      <div class="timeline-details">
        ${w ? `${w.weight} kg · ` : ''}${wo.length ? 'Musculation faite · ' : ''}${eau ? (eau / 1000).toFixed(1) + ' L eau · ' : ''}${cal ? cal + ' kcal · ' : ''}${prot ? prot + ' g prot. · ' : ''}${st ? st.pas + ' pas' : ''}
      </div>
      ${check ? `<div class="timeline-score">${check.score}%</div>` : ''}
    </div>`;
}

async function openDayDetail(date) {
  const [weights, measurements, workouts, cycling, running, nutrition, hydration, sleep, steps, journal] = await Promise.all([
    DB.getWeightHistory(), DB.getMeasurementsHistory(), DB.getWorkoutHistory(), DB.getCyclingHistory(),
    DB.getRunningHistory(), DB.getNutritionHistory(), DB.getHydrationHistory(), DB.getSleepHistory(), DB.getStepsHistory(), DB.getJournal()
  ]);
  const f = arr => arr.filter(x => x.date === date);
  openModal(`
    <h3>${formatDateFR(date)}</h3>
    ${renderDaySection('Poids', f(weights).map(w => `${w.weight} kg${w.waist ? ' · taille ' + w.waist + ' cm' : ''}`))}
    ${renderDaySection('Mensurations', f(measurements).map(m => JSON.stringify(m)))}
    ${renderDaySection('Musculation', f(workouts).map(w => `${w.exercice || ''} ${w.charge ? '· ' + w.charge + ' kg' : ''} ${w.termine ? '✅' : ''}`))}
    ${renderDaySection('Vélo', f(cycling).map(c => `${c.duree} min · ${c.distance || '?'} km`))}
    ${renderDaySection('Course', f(running).map(r => `${r.duree} min · ${r.distance || '?'} km`))}
    ${renderDaySection('Nutrition', f(nutrition).map(n => `${n.repas} : ${n.calories} kcal / ${n.proteines} g ${n.termine ? '✅' : ''}`))}
    ${renderDaySection('Hydratation', f(hydration).map(h => `+${h.quantite} ml à ${h.heure}`))}
    ${renderDaySection('Sommeil', f(sleep).map(s => `${s.duree || '?'} h · ${s.qualite || ''}`))}
    ${renderDaySection('Pas', f(steps).map(s => `${s.pas} pas`))}
    ${renderDaySection('Journal', f(journal).map(j => `Humeur: ${j.humeur} · Fatigue ${j.fatigue}/5 · ${j.commentaire || ''}`))}
  `);
}
App.openDay = openDayDetail;
function renderDaySection(title, items) {
  if (!items.length) return '';
  return `<div class="day-section"><strong>${title}</strong><ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>`;
}

function renderCalendar(checklists) {
  const container = document.getElementById('calendar-container');
  if (!container) return;
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = {}; checklists.forEach(c => byDate[c.date] = c);

  let html = '<div class="calendar-grid">';
  ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(d => html += `<div class="cal-head">${d}</div>`);
  for (let i = 0; i < startOffset; i++) html += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = byDate[iso];
    let cls = 'cal-cell';
    if (entry) cls += entry.score >= 80 ? ' cal-green' : entry.score >= 40 ? ' cal-orange' : ' cal-red';
    else if (iso < todayISO()) cls += ' cal-empty';
    html += `<div class="${cls}" data-action="open-day" data-date="${iso}">${d}</div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

// ---------------------------------------------------------------
// PAGE : PARAMÈTRES
// ---------------------------------------------------------------
async function renderSettings() {
  const profile = await DB.getProfile();
  const trash = await DB.getAllRecords('trash');
  setView(`
    <div class="card">
      <h3>Profil</h3>
      <form data-form="settings">
        <div class="form-grid">
          <label>Nom<input type="text" name="nom" value="${escapeHtml(profile.nom)}"></label>
          <label>Taille (cm)<input type="number" name="taille" value="${profile.taille}"></label>
          <label>Poids actuel de référence (kg)<input type="number" step="0.1" name="poidsDepart" value="${profile.poidsDepart}"></label>
          <label>Objectif (kg)<input type="number" step="0.1" name="objectifPoids" value="${profile.objectifPoids}"></label>
          <label>Calories cibles<input type="number" name="caloriesCibles" value="${profile.caloriesCibles}"></label>
          <label>Protéines cibles (g)<input type="number" name="proteinesCibles" value="${profile.proteinesCibles}"></label>
          <label>Objectif eau (ml)<input type="number" name="eauCible" value="${profile.eauCible}"></label>
          <label>Objectif pas<input type="number" name="pasCible" value="${profile.pasCible}"></label>
        </div>
        <fieldset>
          <legend>Jours d'entraînement</legend>
          ${APP_DATA.JOURS_ORDRE.map(j => `
            <label class="checkbox-label inline"><input type="checkbox" name="joursEntrainement" value="${j}" ${profile.joursEntrainement.includes(j) ? 'checked' : ''}> ${JOURS_LABEL[j]}</label>
          `).join('')}
        </fieldset>
        <button class="btn btn-primary" type="submit">Enregistrer les modifications</button>
      </form>
      <p class="muted small">L'historique conserve toujours tes anciennes valeurs (poids de départ, objectifs...) même après une modification.</p>
    </div>

    <div class="card">
      <h3>Suivi quotidien manuel</h3>
      <div class="quick-forms">
        <form data-form="weight" class="quick-form">
          <h4>Pesée du matin</h4>
          <input type="number" step="0.1" name="weight" placeholder="Poids (kg)" required>
          <input type="number" step="0.1" name="waist" placeholder="Tour de taille (cm)">
          <button class="btn btn-sm btn-primary" type="submit">Enregistrer</button>
        </form>
        <form data-form="measurement" class="quick-form">
          <h4>Mensurations</h4>
          <input type="number" step="0.1" name="chest" placeholder="Poitrine (cm)">
          <input type="number" step="0.1" name="armL" placeholder="Bras gauche (cm)">
          <input type="number" step="0.1" name="armR" placeholder="Bras droit (cm)">
          <input type="number" step="0.1" name="thighL" placeholder="Cuisse gauche (cm)">
          <input type="number" step="0.1" name="thighR" placeholder="Cuisse droite (cm)">
          <input type="number" step="0.1" name="hips" placeholder="Hanches (cm)">
          <input type="number" step="0.1" name="calves" placeholder="Mollets (cm)">
          <button class="btn btn-sm btn-primary" type="submit">Enregistrer</button>
        </form>
        <form data-form="sleep" class="quick-form">
          <h4>Sommeil</h4>
          <label>Coucher <input type="time" name="coucher" required></label>
          <label>Réveil <input type="time" name="reveil" required></label>
          <select name="qualite"><option>Très mauvais</option><option>Mauvais</option><option selected>Correct</option><option>Bon</option><option>Excellent</option></select>
          <button class="btn btn-sm btn-primary" type="submit">Enregistrer</button>
        </form>
        <form data-form="steps" class="quick-form">
          <h4>Pas aujourd'hui</h4>
          <input type="number" name="pas" placeholder="Nombre de pas" required>
          <button class="btn btn-sm btn-primary" type="submit">Enregistrer</button>
        </form>
        <form data-form="photo" class="quick-form">
          <h4>Photo de progression</h4>
          <label class="small">Face <input type="file" name="face" accept="image/*"></label>
          <label class="small">Profil <input type="file" name="profil" accept="image/*"></label>
          <label class="small">Dos <input type="file" name="dos" accept="image/*"></label>
          <button class="btn btn-sm btn-primary" type="submit">Enregistrer</button>
        </form>
      </div>
    </div>

    <div class="card">
      <h3>Hydratation</h3>
      <div class="hydration-row">
        <button class="btn btn-secondary" data-action="water-add" data-amount="250">+250 ml</button>
        <button class="btn btn-secondary" data-action="water-add" data-amount="500">+500 ml</button>
        <div id="hydration-gauge"></div>
      </div>
    </div>

    <div class="card">
      <h3>Sauvegarde des données</h3>
      <div class="settings-actions">
        <button class="btn btn-primary" data-action="export-json">⬇ Exporter mes données (JSON)</button>
        <label class="btn btn-secondary file-btn">⬆ Importer une sauvegarde
          <input type="file" id="import-file" accept=".json" hidden>
        </label>
        <button class="btn btn-ghost" data-action="export-csv" data-store="weight">Export poids.csv</button>
        <button class="btn btn-ghost" data-action="export-csv" data-store="workouts">Export entrainements.csv</button>
        <button class="btn btn-ghost" data-action="export-csv" data-store="nutrition">Export nutrition.csv</button>
        <button class="btn btn-ghost" data-action="export-csv" data-store="measurements">Export mensurations.csv</button>
      </div>
    </div>

    <div class="card">
      <h3>Corbeille (${trash.length})</h3>
      <p class="muted small">Les éléments supprimés restent ici 30 jours avant suppression définitive.</p>
      ${trash.length ? trash.map(t => `
        <div class="history-row"><span>${t.store}</span><span>${formatDateFR(t.deletedAt.slice(0,10))}</span>
        <button class="btn btn-xs btn-secondary" data-action="restore-trash" data-id="${t.id}">Restaurer</button></div>
      `).join('') : '<p class="muted">Corbeille vide.</p>'}
    </div>

    <div class="card">
      <h3 class="danger-title">Zone de danger</h3>
      <button class="btn btn-danger" data-action="reset-data">Réinitialiser toutes les données</button>
    </div>
  `);
  renderHydrationGauge();
}

async function renderHydrationGauge() {
  const el = document.getElementById('hydration-gauge');
  if (!el) return;
  const profile = await DB.getProfile();
  const total = (await DB.getHydrationHistory()).filter(h => h.date === todayISO()).reduce((s, h) => s + h.quantite, 0);
  const pct = clamp(Math.round((total / profile.eauCible) * 100), 0, 100);
  el.innerHTML = `<div class="bottle"><div class="bottle-fill" style="height:${pct}%"></div></div><div class="muted small">${(total/1000).toFixed(2)} / ${(profile.eauCible/1000).toFixed(2)} L</div>`;
}

App.waterAdd = async (amount) => {
  await DB.saveHydration(Number(amount));
  App.saved();
  renderHydrationGauge();
};

App.exportJson = async () => {
  const data = await DB.exportDatabase();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date().toISOString().slice(0, 10);
  a.href = url; a.download = `forge-backup-${d}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Export JSON téléchargé');
};

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const esc = v => `"${String(v === undefined || v === null ? '' : v).replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
}
function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
App.exportCsv = async (storeKind) => {
  const map = { weight: ['weightHistory', 'poids.csv'], workouts: ['workoutHistory', 'entrainements.csv'], nutrition: ['nutritionHistory', 'nutrition.csv'], measurements: ['measurementsHistory', 'mensurations.csv'] };
  const [store, filename] = map[storeKind];
  const rows = await DB.getAllRecords(store);
  downloadText(filename, toCsv(rows));
  toast(filename + ' téléchargé');
};

App.importFile = (file) => {
  confirmDialog('Veux-tu FUSIONNER cette sauvegarde avec tes données actuelles ? (Annuler = choisir "remplacer")', async () => {
    const text = await file.text();
    await DB.importDatabase(JSON.parse(text), 'merge');
    toast('Import fusionné effectué');
    goTo('settings');
  });
};
App.importFileReplace = () => {};

App.resetData = () => {
  confirmDialog('Cette action va supprimer TOUTES tes données locales (poids, séances, nutrition, photos...). Es-tu sûr ?', async () => {
    const dbReq = indexedDB.deleteDatabase(DB_NAME);
    dbReq.onsuccess = () => { localStorage.clear(); location.reload(); };
  });
};

App.restoreTrash = async (id) => {
  await DB.restoreRecord(Number(id));
  App.saved();
  renderSettings();
};

// ---------------------------------------------------------------
// GESTION DES FORMULAIRES (délégation)
// ---------------------------------------------------------------
async function handleFormSubmit(form) {
  const formType = form.dataset.form;
  const fd = new FormData(form);

  if (formType === 'log-set') {
    await logSet(form.dataset.exerciseId, form);
    form.reset();
    return;
  }
  if (formType === 'cycling') {
    await DB.saveCycling({ duree: Number(fd.get('duree')), distance: Number(fd.get('distance')) || 0, vitesseMoyenne: Number(fd.get('vitesseMoyenne')) || 0, difficulte: Number(fd.get('difficulte')), commentaire: fd.get('commentaire') });
    App.saved(); form.reset(); return;
  }
  if (formType === 'running') {
    await DB.saveRunning({ duree: Number(fd.get('duree')), distance: Number(fd.get('distance')) || 0, allure: fd.get('allure'), difficulte: Number(fd.get('difficulte')), commentaire: fd.get('commentaire') });
    App.saved(); form.reset(); return;
  }
  if (formType === 'journal') {
    await DB.saveJournal({ humeur: fd.get('humeur'), fatigue: Number(fd.get('fatigue')), motivation: Number(fd.get('motivation')), faim: Number(fd.get('faim')), douleurs: fd.get('douleurs'), commentaire: fd.get('commentaire') });
    App.saved(); return;
  }
  if (formType === 'weight') {
    await DB.saveWeight({ weight: Number(fd.get('weight')), waist: Number(fd.get('waist')) || null });
    App.saved(); form.reset(); goTo(Storage.getPrefs().activePage); return;
  }
  if (formType === 'measurement') {
    const obj = {}; ['chest','armL','armR','thighL','thighR','hips','calves'].forEach(k => obj[k] = Number(fd.get(k)) || null);
    await DB.saveMeasurement(obj);
    App.saved(); form.reset(); return;
  }
  if (formType === 'sleep') {
    const coucher = fd.get('coucher'), reveil = fd.get('reveil');
    let duree = null;
    if (coucher && reveil) {
      const [ch, cm] = coucher.split(':').map(Number), [rh, rm] = reveil.split(':').map(Number);
      let mins = (rh * 60 + rm) - (ch * 60 + cm);
      if (mins < 0) mins += 24 * 60;
      duree = round1(mins / 60);
    }
    await DB.saveSleep({ coucher, reveil, duree, qualite: fd.get('qualite') });
    App.saved(); form.reset(); return;
  }
  if (formType === 'steps') {
    await DB.saveSteps(Number(fd.get('pas')));
    App.saved(); form.reset(); return;
  }
  if (formType === 'photo') {
    const readFile = (f) => new Promise((res) => { if (!f || !f.size) return res(null); const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
    const [face, profil, dos] = await Promise.all([readFile(fd.get('face')), readFile(fd.get('profil')), readFile(fd.get('dos'))]);
    const weights = await DB.getWeightHistory();
    const poids = weights.length ? weights[weights.length - 1].weight : null;
    await DB.saveProgressPhoto({ face, profil, dos, poids });
    App.saved(); form.reset(); return;
  }
  if (formType === 'settings') {
    const jours = fd.getAll('joursEntrainement');
    await DB.saveProfile({
      nom: fd.get('nom'), taille: Number(fd.get('taille')), poidsDepart: Number(fd.get('poidsDepart')),
      objectifPoids: Number(fd.get('objectifPoids')), caloriesCibles: Number(fd.get('caloriesCibles')),
      proteinesCibles: Number(fd.get('proteinesCibles')), eauCible: Number(fd.get('eauCible')),
      pasCible: Number(fd.get('pasCible')), joursEntrainement: jours
    });
    App.saved(); return;
  }
}

// ---------------------------------------------------------------
// DONNÉES DE DÉMO (premier lancement uniquement)
// ---------------------------------------------------------------
async function seedDemoDataIfNeeded() {
  const weights = await DB.getWeightHistory();
  if (weights.length > 0) return; // déjà des données réelles, on ne touche à rien
  const profile = await DB.getProfile();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 20);
  await DB.saveProfile({ dateDebut: startDate.toISOString().slice(0, 10) });

  let w = profile.poidsDepart;
  for (let i = 0; i < 20; i++) {
    const d = new Date(startDate); d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    if (i % 2 === 0) {
      w = round1(w - (Math.random() * 0.25 + 0.05));
      await addDemoRecord('weightHistory', { date: iso, time: '07:30', weight: w, waist: round1(110 - i * 0.15), comment: '' });
    }
    const jour = dateToJourKey(d);
    const seance = APP_DATA.getJourProgramme(1, jour);
    if (seance && seance.type === 'muscu' && i % 3 === 0) {
      await addDemoRecord('workoutHistory', { date: iso, type: 'muscu', exercice: seance.blocs[0] ? APP_DATA.getExerciseById(seance.blocs[0].exerciceId).nom : 'Musculation', series: 3, repsDone: 12, charge: 40 + i, dureeSeance: 50, difficulte: 3, termine: true });
    }
    if (seance && seance.type === 'velo' && i % 3 === 1) {
      await addDemoRecord('cyclingHistory', { date: iso, duree: 45, distance: 14, vitesseMoyenne: 18.5, difficulte: 2, commentaire: '' });
    }
    if (seance && seance.type === 'course' && i % 3 === 2) {
      await addDemoRecord('runningHistory', { date: iso, duree: 25, distance: 2.5, allure: '10:00', difficulte: 3, commentaire: '' });
    }
    if (i % 2 === 0) {
      await addDemoRecord('hydrationHistory', { date: iso, heure: '09:00', quantite: 500 });
      await addDemoRecord('hydrationHistory', { date: iso, heure: '14:00', quantite: 750 });
      await addDemoRecord('stepsHistory', { date: iso, pas: 6000 + Math.floor(Math.random() * 4000) });
      await addDemoRecord('sleepHistory', { date: iso, coucher: '23:00', reveil: '07:00', duree: 8, qualite: 'Bon' });
      Object.keys(APP_DATA.MEAL_PLAN).forEach(async (key) => {
        const meal = APP_DATA.MEAL_PLAN[key];
        await addDemoRecord('nutritionHistory', { date: iso, repas: key, aliments: meal.aliments, calories: meal.aliments.reduce((s,a)=>s+a.calories,0), proteines: meal.aliments.reduce((s,a)=>s+a.proteines,0), heure: meal.heure, termine: true });
      });
    }
  }
}
function addDemoRecord(store, obj) {
  return new Promise((resolve) => {
    DB.initDatabase().then(db => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).add(obj);
      tx.oncomplete = resolve;
    });
  });
}

// ---------------------------------------------------------------
// DÉLÉGATION D'ÉVÉNEMENTS GLOBALE
// ---------------------------------------------------------------
document.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  switch (action) {
    case 'nav': goTo(target.dataset.page); break;
    case 'close-modal': closeModal(); break;
    case 'timer-start': App.timerStart(); break;
    case 'timer-pause': App.timerPause(); break;
    case 'timer-reset': App.timerReset(); break;
    case 'finish-session': App.finishSession(); break;
    case 'open-exercise': App.openExercise(target.dataset.id); break;
    case 'program-week': App.programWeek(target.dataset.week); break;
    case 'toggle-meal': break; // handled by change event
    case 'swap-food': App.openSwap(target.dataset.meal, Number(target.dataset.index)); break;
    case 'select-swap': App.selectSwap(target.dataset.meal, Number(target.dataset.index), Number(target.dataset.swap)); break;
    case 'water-add': App.waterAdd(target.dataset.amount); break;
    case 'export-json': App.exportJson(); break;
    case 'export-csv': App.exportCsv(target.dataset.store); break;
    case 'reset-data': App.resetData(); break;
    case 'restore-trash': App.restoreTrash(target.dataset.id); break;
    case 'history-filter': App.historyFilter(target.dataset.filter); break;
    case 'open-day': App.openDay(target.dataset.date); break;
  }
});

document.addEventListener('change', async (e) => {
  if (e.target.matches('[data-action="toggle-meal"]')) {
    App.toggleMeal(e.target.dataset.meal, e.target.checked);
  }
  if (e.target.id === 'import-file') {
    const file = e.target.files[0];
    if (file) App.importFile(file);
  }
});

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  await handleFormSubmit(form);
});

// ---------------------------------------------------------------
// INITIALISATION
// ---------------------------------------------------------------
async function initApp() {
  await DB.initDatabase();
  await DB.getProfile();
  await seedDemoDataIfNeeded();
  await DB.purgeOldTrash();
  const prefs = Storage.getPrefs();
  await goTo(prefs.activePage || 'dashboard');
}
document.addEventListener('DOMContentLoaded', initApp);
