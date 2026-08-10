/* ============================================================
   database.js — Couche IndexedDB (source de vérité de l'app)
   Toutes les données historiques (poids, séances, nutrition...)
   vivent ici. Rien n'est jamais écrasé : chaque ajout crée un
   nouvel enregistrement daté. localStorage ne sert qu'aux
   petites préférences d'interface (voir storage.js).
   ============================================================ */

const DB_NAME = 'BedisFitnessDB';
const DB_VERSION = 1;

// Liste des object stores et de leurs index. keyPath 'id' auto-incrémenté
// partout : on ne réutilise jamais un id, donc rien ne peut s'écraser.
const STORES = {
  profile:            { keyPath: 'id' },                                   // profil courant (id fixe = 'current')
  profileHistory:      { keyPath: 'id', autoIncrement: true, indexes: ['date'] }, // historique des changements de profil
  weightHistory:       { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  measurementsHistory:  { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  workoutHistory:       { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  cyclingHistory:       { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  runningHistory:       { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  nutritionHistory:     { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  hydrationHistory:     { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  sleepHistory:         { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  stepsHistory:         { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  photos:               { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  journal:              { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  dailyChecklist:        { keyPath: 'id', autoIncrement: true, indexes: ['date'] }, // 1 par jour (date unique en pratique)
  trash:                 { keyPath: 'id', autoIncrement: true, indexes: ['deletedAt'] }
};

let _db = null;
let _dbReadyPromise = null;

function initDatabase() {
  if (_dbReadyPromise) return _dbReadyPromise;
  _dbReadyPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      Object.entries(STORES).forEach(([name, cfg]) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, {
            keyPath: cfg.keyPath,
            autoIncrement: !!cfg.autoIncrement
          });
          (cfg.indexes || []).forEach(idx => store.createIndex(idx, idx, { unique: false }));
        }
      });
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbReadyPromise;
}

// ---- Helpers génériques ----------------------------------------------

function tx(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

function addRecord(storeName, obj) {
  return initDatabase().then(() => new Promise((resolve, reject) => {
    const store = tx(storeName, 'readwrite');
    const req = store.add(obj);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function putRecord(storeName, obj) {
  return initDatabase().then(() => new Promise((resolve, reject) => {
    const store = tx(storeName, 'readwrite');
    const req = store.put(obj);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function getAllRecords(storeName) {
  return initDatabase().then(() => new Promise((resolve, reject) => {
    const req = tx(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

function getRecord(storeName, id) {
  return initDatabase().then(() => new Promise((resolve, reject) => {
    const req = tx(storeName).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

function deleteFromStore(storeName, id) {
  return initDatabase().then(() => new Promise((resolve, reject) => {
    const req = tx(storeName, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function clearStore(storeName) {
  return initDatabase().then(() => new Promise((resolve, reject) => {
    const req = tx(storeName, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

// ---- API profil (avec historique des modifications) -------------------

const DEFAULT_PROFILE = {
  id: 'current',
  nom: 'Bedis',
  taille: 172,               // cm
  poidsDepart: 116,          // kg
  objectifPoids: 80,         // kg
  dateDebut: null,           // fixé au premier lancement
  caloriesCibles: 2350,
  proteinesCibles: 165,
  eauCible: 2500,             // ml
  pasCible: 8000,
  joursEntrainement: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  semaineProgramme: 1
};

async function getProfile() {
  await initDatabase();
  let p = await getRecord('profile', 'current');
  if (!p) {
    p = { ...DEFAULT_PROFILE, dateDebut: todayISO() };
    await putRecord('profile', p);
  }
  return p;
}

async function saveProfile(updates) {
  const current = await getProfile();
  const changed = [];
  Object.keys(updates).forEach(key => {
    if (current[key] !== undefined && current[key] !== updates[key]) {
      changed.push({ field: key, oldValue: current[key], newValue: updates[key] });
    }
  });
  const next = { ...current, ...updates, id: 'current' };
  await putRecord('profile', next);
  for (const c of changed) {
    await addRecord('profileHistory', { date: nowISO(), ...c });
  }
  return next;
}

// ---- API spécifiques par domaine --------------------------------------

function saveWeight(entry) {
  // entry: { date, time, weight, waist, comment }
  return addRecord('weightHistory', { date: todayISO(), time: nowTime(), ...entry });
}
function getWeightHistory() { return getAllRecords('weightHistory').then(sortByDate); }

function saveMeasurement(entry) {
  return addRecord('measurementsHistory', { date: todayISO(), ...entry });
}
function getMeasurementsHistory() { return getAllRecords('measurementsHistory').then(sortByDate); }

function saveWorkout(entry) {
  // entry: { date, type, exercice, series, repsPlanned, repsDone, charge, repos, dureeSeance, calories, difficulte, douleur, commentaire, termine }
  return addRecord('workoutHistory', { date: todayISO(), ...entry });
}
function getWorkoutHistory() { return getAllRecords('workoutHistory').then(sortByDate); }

function saveCycling(entry) {
  return addRecord('cyclingHistory', { date: todayISO(), ...entry });
}
function getCyclingHistory() { return getAllRecords('cyclingHistory').then(sortByDate); }

function saveRunning(entry) {
  return addRecord('runningHistory', { date: todayISO(), ...entry });
}
function getRunningHistory() { return getAllRecords('runningHistory').then(sortByDate); }

function saveMeal(entry) {
  // entry: { date, repas, aliments, calories, proteines, glucides, lipides, heure, termine, modifications }
  return addRecord('nutritionHistory', { date: todayISO(), ...entry });
}
function getNutritionHistory() { return getAllRecords('nutritionHistory').then(sortByDate); }

// Un seul enregistrement par (date, repas) : on met à jour ce repas tant que
// la journée n'est pas passée (coche, remplacement d'aliment...). Les jours
// précédents restent intacts pour toujours dans nutritionHistory.
async function saveMealUpsert(date, repasKey, data) {
  const all = await getAllRecords('nutritionHistory');
  const existing = all.find(m => m.date === date && m.repas === repasKey);
  if (existing) {
    const next = { ...existing, ...data, date, repas: repasKey };
    await putRecord('nutritionHistory', next);
    return next;
  }
  const rec = { date, repas: repasKey, ...data };
  const id = await addRecord('nutritionHistory', rec);
  return { ...rec, id };
}

function saveHydration(quantite) {
  return addRecord('hydrationHistory', { date: todayISO(), heure: nowTime(), quantite });
}
function getHydrationHistory() { return getAllRecords('hydrationHistory').then(sortByDate); }

function saveSleep(entry) {
  return addRecord('sleepHistory', { date: todayISO(), ...entry });
}
function getSleepHistory() { return getAllRecords('sleepHistory').then(sortByDate); }

function saveSteps(pas) {
  return addRecord('stepsHistory', { date: todayISO(), pas });
}
function getStepsHistory() { return getAllRecords('stepsHistory').then(sortByDate); }

function saveProgressPhoto(entry) {
  // entry: { date, poids, face, profil, dos } (base64 dataURLs)
  return addRecord('photos', { date: todayISO(), ...entry });
}
function getPhotos() { return getAllRecords('photos').then(sortByDate); }

function saveJournal(entry) {
  return addRecord('journal', { date: todayISO(), ...entry });
}
function getJournal() { return getAllRecords('journal').then(sortByDate); }

async function saveDailyLog(date, updates) {
  const all = await getAllRecords('dailyChecklist');
  const existing = all.find(d => d.date === date);
  if (existing) {
    const next = { ...existing, ...updates };
    await putRecord('dailyChecklist', next);
    return next;
  } else {
    const rec = { date, petitDej: false, dejeuner: false, collation: false, diner: false,
      eau: false, sport: false, pas: false, pesee: false, sommeil: false, score: 0, ...updates };
    const id = await addRecord('dailyChecklist', rec);
    return { ...rec, id };
  }
}
function getDailyChecklists() { return getAllRecords('dailyChecklist').then(sortByDate); }

// ---- Corbeille (soft delete, purge après 30 jours) ---------------------

async function deleteRecord(storeName, id) {
  const record = await getRecord(storeName, id);
  if (!record) return;
  await addRecord('trash', { store: storeName, originalId: id, data: record, deletedAt: nowISO() });
  await deleteFromStore(storeName, id);
}

async function restoreRecord(trashId) {
  const t = await getRecord('trash', trashId);
  if (!t) return;
  const { id, ...data } = t.data;
  await putRecord(t.store, t.data.id !== undefined ? t.data : data);
  await deleteFromStore('trash', trashId);
}

async function purgeOldTrash() {
  const items = await getAllRecords('trash');
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const item of items) {
    if (new Date(item.deletedAt).getTime() < cutoff) {
      await deleteFromStore('trash', item.id);
    }
  }
}

// ---- Export / Import complet -------------------------------------------

async function exportDatabase() {
  const data = {};
  for (const storeName of Object.keys(STORES)) {
    data[storeName] = await getAllRecords(storeName);
  }
  data._meta = { exportedAt: nowISO(), version: DB_VERSION, app: 'bedis-fitness' };
  return data;
}

async function importDatabase(data, mode = 'merge') {
  // mode: 'replace' (vide chaque store avant import) ou 'merge' (ajoute par-dessus)
  for (const storeName of Object.keys(STORES)) {
    if (!data[storeName]) continue;
    if (mode === 'replace') await clearStore(storeName);
    for (const record of data[storeName]) {
      if (storeName === 'profile') {
        await putRecord(storeName, record);
      } else if (mode === 'replace') {
        await putRecord(storeName, record); // conserve les ids d'origine
      } else {
        // merge : on retire l'id auto pour éviter les collisions, sauf profile
        const { id, ...rest } = record;
        await addRecord(storeName, rest);
      }
    }
  }
}

// ---- Utilitaires date ---------------------------------------------------

function todayISO() { return new Date().toISOString().slice(0, 10); }
function nowISO() { return new Date().toISOString(); }
function nowTime() { return new Date().toTimeString().slice(0, 5); }
function sortByDate(arr) { return arr.slice().sort((a, b) => (a.date + (a.time||'')).localeCompare(b.date + (b.time||''))); }

// Export global (pas de bundler : simple script classique)
window.DB = {
  initDatabase, getProfile, saveProfile,
  saveWeight, getWeightHistory,
  saveMeasurement, getMeasurementsHistory,
  saveWorkout, getWorkoutHistory,
  saveCycling, getCyclingHistory,
  saveRunning, getRunningHistory,
  saveMeal, getNutritionHistory, saveMealUpsert,
  saveHydration, getHydrationHistory,
  saveSleep, getSleepHistory,
  saveSteps, getStepsHistory,
  saveProgressPhoto, getPhotos,
  saveJournal, getJournal,
  saveDailyLog, getDailyChecklists,
  deleteRecord, restoreRecord, purgeOldTrash, getAllRecords,
  exportDatabase, importDatabase,
  todayISO, nowISO, nowTime
};
