/* ============================================================
   storage.js — localStorage pour les préférences légères
   uniquement (page active, thème, chrono en cours...).
   Toutes les données de suivi vivent dans IndexedDB (database.js).
   ============================================================ */

const PREFS_KEY = 'bedis-fitness-prefs';

const DEFAULT_PREFS = {
  activePage: 'dashboard',
  theme: 'dark',
  timerState: null, // { exerciseOrSession, startedAt, elapsedBeforePause, running }
  lastVisit: null
};

function getPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch (e) {
    return { ...DEFAULT_PREFS };
  }
}

function setPrefs(updates) {
  const next = { ...getPrefs(), ...updates };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  return next;
}

window.Storage = { getPrefs, setPrefs };
