import { initUsers } from './data/users.js';
import { initHabits } from './data/habits.js';
import { initBackup } from './data/backup.js';
import { initStats } from './data/stats.js';
import { initDashboard } from './ui/dashboard.js';
import { initDuel } from './ui/duel.js';
import { initSettings } from './ui/settings.js';
import { initAdminPanel } from './admin/statspanel.js';

const config = {
  SUPABASE_URL: 'https://jqzrviqbtgfqspthvegv.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxenJ2aXFidGdmcXNwdGh2ZWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTE5NTksImV4cCI6MjA4ODU4Nzk1OX0.g6Lm1aB7xS3Kv9x-IftmI_bMA2s4Hxgix-oFG80Ixqw',
  DUEL_TABLE: 'tracker_duel_scores',
  RELATION_EVENT_TABLE: 'tracker_relation_events',
  DATA_BACKENDS: [
    { table: 'user_data', idCol: 'user_id', contentCol: 'content', label: 'user_data' },
    { table: 'tracker_states', idCol: 'profile_id', contentCol: 'payload', label: 'tracker_states' }
  ],
  DUEL_NAME_KEY: 'tracker_duel_name',
  THEME_KEY: 'tracker_theme',
  LAYOUT_KEY: 'tracker_layout',
  TYPE_KEY: 'tracker_font',
  LOCAL_CACHE_PREFIX: 'tracker_state_cache_v2:',
  RELATION_NOTICE_KEY: 'tracker_relation_notice_day',
  RELATION_BOTH_NOTICE_KEY: 'tracker_relation_both_notice_day',
  RELATION_EVENT_WARN_KEY: 'tracker_relation_event_warned',
  PAULO_ALIASES: ['paulo'],
  NAROA_ALIASES: ['naroa'],
  THEMES: ['neutral', 'rojo', 'rosa'],
  FONTS: ['minimal', 'serif', 'mono'],
  LAYOUTS: ['list', 'grid'],
  RELATION_HABIT_NAMES: ['cuidar la relacion', 'cuidar la relación'],
  RELATION_MESSAGES: [
    'Otro día más cumpliendo "Cuidar la relación". Pequeños gestos, gran equipo.',
    'Hoy también sumaste en "Cuidar la relación". Paulo y Naroa van en modo racha.',
    'Marcado "Cuidar la relación". Lo importante se construye día a día.',
    'Hábito favorito completado: "Cuidar la relación". Hoy también cuenta.',
    'Check de pareja hecho. Constancia tranquila, resultado enorme.',
    'Otro punto para vosotros dos: "Cuidar la relación" completado.',
    'Día cumplido en "Cuidar la relación". Seguís invirtiendo en lo que importa.'
  ],
  RELATION_BOTH_MESSAGES: [
    'Hoy los dos completasteis "Cuidar la relación". Dos corazones, un mismo ritmo.',
    'Doble check en "Cuidar la relación". Corazones alineados.',
    'Gran equipo: hoy cuidasteis la relación a la vez.',
    'Sumasteis juntos en "Cuidar la relación". Ese gesto vale oro.',
    'Dos sí a "Cuidar la relación". Bonito y constante.',
    'Hoy fue un día de pareja: "Cuidar la relación" cumplido por ambos.'
  ]
};

const supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tracker-auth-session'
  }
});

const ctx = {
  config,
  supabaseClient,
  state: { habits: [], logs: {}, notes: {}, meta: { updatedAt: '' } },
  selectedDayKey: dateKey(),
  calendarCursor: new Date(),
  currentUser: null,
  activeDataBackend: null,
  timers: {
    save: null,
    syncReminder: null,
    notes: null,
    relation: null,
    duelUpdate: null
  }
};

ctx.utils = {
  uid,
  dateKey,
  parseDateKey,
  formatDateLabel,
  monthLabel,
  currentMonthKey,
  daysInMonth,
  level,
  colorByRatio,
  escapeHtml,
  normalizeText,
  messageForDay
};

ctx.ui = {
  setNote,
  showSyncReminder,
  showRelationCelebration
};

ctx.notifyError = notifyError;

ctx.storage = {
  saveLocalState,
  loadLocalState
};

ctx.handlers = {
  onLogin: async () => {
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('user-info').textContent = ctx.currentUser?.email || '';
    await loadData();
  },
  onLogout: () => {
    ctx.currentUser = null;
    document.getElementById('user-info').textContent = '';
    document.getElementById('auth-overlay').classList.remove('hidden');
    ctx.state = { habits: [], logs: {}, notes: {}, meta: { updatedAt: '' } };
    ctx.dashboard.render();
  }
};

initUsers(ctx);
initBackup(ctx);
initSettings(ctx);
initDuel(ctx);
initHabits(ctx);
initStats(ctx);
initDashboard(ctx);
ctx.admin = initAdminPanel(ctx);

function formatSupabaseError(error, fallback = 'Error desconocido') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  const parts = [error.message, error.code, error.details].filter(Boolean);
  return parts.length ? parts.join(' · ') : fallback;
}

function notifyError(prefix, error, targetNoteId = '') {
  const text = `${prefix}: ${formatSupabaseError(error)}`;
  showSyncReminder(text, 'error', 6200);
  if (targetNoteId) setNote(targetNoteId, text, true);
  return text;
}

async function detectDataBackend(force = false) {
  if (!force && ctx.activeDataBackend) return ctx.activeDataBackend;
  let lastError = null;

  for (const backend of config.DATA_BACKENDS) {
    try {
      const { error } = await supabaseClient
        .from(backend.table)
        .select(backend.idCol)
        .limit(1);

      if (!error || error.code !== 'PGRST205') {
        ctx.activeDataBackend = backend;
        return backend;
      }
      lastError = error;
    } catch (error) {
      lastError = error;
    }
  }

  ctx.activeDataBackend = null;
  notifyError('No existe tabla de datos compatible (user_data o tracker_states)', lastError || 'Configura tabla en Supabase');
  return null;
}

async function loadData() {
  if (!ctx.currentUser) return;
  try {
    const backend = await detectDataBackend();
    if (!backend) return;
    const local = loadLocalState();
    if (local) {
      ctx.state = local;
      ctx.dashboard.render();
    }
    const { data, error } = await supabaseClient
      .from(backend.table)
      .select(`${backend.contentCol},updated_at`)
      .eq(backend.idCol, ctx.currentUser.id)
      .single();

    if (!error && data && data[backend.contentCol]) {
      const remote = normalizeState(data[backend.contentCol]);
      const remoteTs = data.updated_at || remote.meta?.updatedAt || '';
      const localTs = local?.meta?.updatedAt || '';
      if (!local || remoteTs >= localTs) {
        ctx.state = remote;
        saveLocalState();
      } else {
        await save(true);
      }
    } else {
      const noRowError = error && (error.code === 'PGRST116' || String(error.message || '').toLowerCase().includes('0 rows'));
      if (!noRowError && error) notifyError('Error cargando datos en nube', error);

      if (!local) ctx.state = {
        habits: [
          { id: uid(), name: 'Beber agua' },
          { id: uid(), name: 'Leer' },
          { id: uid(), name: 'Mover el cuerpo' }
        ],
        logs: {},
        notes: {},
        meta: { updatedAt: new Date().toISOString() }
      };
      await save(true);
    }
    ctx.duel.hydrateDuelName();
    await ctx.duel.updateDuelScore(true);
    await ctx.duel.fetchDuelBoard(true);
    await ctx.duel.fetchDuelHistory(true);
    ctx.dashboard.render();
    await ctx.duel.maybeShowRelationEntryMessage();
    await ctx.duel.maybeShowBothCompletedMessage();
    ctx.backup.ensureDailyBackup();
    if (ctx.settings.needsAliasOnboarding()) ctx.settings.openAliasOnboarding();
  } catch (error) {
    notifyError('Fallo al iniciar la app', error);
    ctx.dashboard.render();
  }
}

async function syncDown() {
  if (!ctx.currentUser) return;
  try {
    const backend = await detectDataBackend();
    if (!backend) return;
    const { data, error } = await supabaseClient
      .from(backend.table)
      .select(`${backend.contentCol},updated_at`)
      .eq(backend.idCol, ctx.currentUser.id)
      .single();
    if (error) {
      notifyError('No se pudo descargar datos de nube', error);
      return;
    }
    if (data && data[backend.contentCol]) {
      ctx.state = normalizeState(data[backend.contentCol]);
      ctx.state.meta.updatedAt = data.updated_at || ctx.state.meta.updatedAt || new Date().toISOString();
      saveLocalState();
      ctx.dashboard.render();
      await ctx.duel.maybeShowRelationEntryMessage();
      await ctx.duel.maybeShowBothCompletedMessage();
      ctx.backup.ensureDailyBackup();
    } else {
      showSyncReminder('No hay datos remotos todavía.', 'info');
    }
  } catch (error) {
    notifyError('Error de descarga', error);
  }
}

async function syncNow() {
  try {
    showSyncReminder('Sincronizando...', 'info');
    await save(true);
    await syncDown();
    await ctx.duel.updateDuelScore(true);
    await ctx.duel.fetchDuelBoard(false);
    await ctx.duel.fetchDuelHistory(false);
    showSyncReminder('Sincronizado correctamente.', 'success');
  } catch (error) {
    notifyError('Sync fallido', error);
  }
}

function save(immediate = false) {
  if (!ctx.currentUser) {
    showSyncReminder('Inicia sesión para sincronizar en todos tus dispositivos.', 'error');
    return;
  }
  ctx.state.meta = ctx.state.meta || {};
  ctx.state.meta.updatedAt = new Date().toISOString();
  saveLocalState();
  clearTimeout(ctx.timers.save);

  const doSave = async () => {
    try {
      const backend = await detectDataBackend();
      if (!backend) return false;
      const { error } = await supabaseClient
        .from(backend.table)
        .upsert({
          [backend.idCol]: ctx.currentUser.id,
          [backend.contentCol]: ctx.state,
          updated_at: new Date().toISOString()
        });
      if (error) {
        notifyError('Guardado en nube fallido', error);
        return false;
      }
      return true;
    } catch (error) {
      notifyError('Error de conexión al guardar', error);
      return false;
    }
  };

  if (immediate) {
    ctx.duel.scheduleDuelUpdate(true);
    return doSave();
  }

  ctx.timers.save = setTimeout(() => {
    doSave();
  }, 700);
  ctx.duel.scheduleDuelUpdate(false);
  showSyncReminder('Cambios locales guardados. Pulsa Sync para forzar la actualización en todos tus dispositivos.', 'info');
}

function normalizeState(raw) {
  const out = raw && typeof raw === 'object' ? raw : {};
  if (!Array.isArray(out.habits)) out.habits = [];
  if (!out.logs || typeof out.logs !== 'object') out.logs = {};
  if (!out.notes || typeof out.notes !== 'object') out.notes = {};
  if (!out.meta || typeof out.meta !== 'object') out.meta = { updatedAt: '' };
  return out;
}

function localCacheKey() {
  return ctx.currentUser ? `${config.LOCAL_CACHE_PREFIX}${ctx.currentUser.id}` : `${config.LOCAL_CACHE_PREFIX}guest`;
}

function saveLocalState() {
  try { localStorage.setItem(localCacheKey(), JSON.stringify(ctx.state)); } catch (_) {}
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(localCacheKey());
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

ctx.data = {
  save,
  syncNow,
  syncDown,
  loadData,
  detectDataBackend,
  normalizeState
};

function uid() { return Math.random().toString(36).slice(2, 9); }

function dateKey(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function parseDateKey(k) {
  const [y, m, d] = String(k).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(k) {
  return parseDateKey(k).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function monthLabel(date) {
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function level(r) {
  if (r <= 0.1) return 'l0';
  if (r < 0.35) return 'l1';
  if (r < 0.7) return 'l2';
  if (r < 0.95) return 'l3';
  return 'l4';
}

function colorByRatio(r) {
  if (r <= 0.1) return '#dc2626';
  if (r < 0.35) return '#ea580c';
  if (r < 0.7) return '#ca8a04';
  if (r < 0.95) return '#16a34a';
  return '#15803d';
}

function setNote(id, text, error = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = error ? 'note error' : 'note';
  el.textContent = text;
  setTimeout(() => {
    if (el.textContent === text) el.textContent = '';
  }, 2300);
}

function showSyncReminder(text, type = 'info', timeoutMs = 3200) {
  const el = document.getElementById('sync-reminder');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('info', 'success', 'error');
  el.classList.add(type);
  el.classList.add('show');
  clearTimeout(ctx.timers.syncReminder);
  ctx.timers.syncReminder = setTimeout(() => {
    el.classList.remove('show');
  }, timeoutMs);
}

function showRelationCelebration(text, timeoutMs = 5200) {
  const box = document.getElementById('relation-celebration');
  const label = document.getElementById('relation-celebration-text');
  if (!box || !label) return;
  label.textContent = text;
  box.classList.add('show');
  clearTimeout(ctx.timers.relation);
  ctx.timers.relation = setTimeout(() => {
    box.classList.remove('show');
  }, timeoutMs);
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function messageForDay(day, messages) {
  const clean = String(day || '').replace(/-/g, '');
  const seed = Number(clean) || Date.now();
  const idx = seed % messages.length;
  return messages[idx];
}

window.addHabit = ctx.habits.addHabit;
window.toggleHabit = ctx.habits.toggleHabit;
window.removeHabit = ctx.habits.removeHabit;
window.promptHabitIcon = ctx.habits.promptHabitIcon;
window.updateNotes = ctx.dashboard.updateNotes;
window.clearNotes = ctx.dashboard.clearNotes;
window.moveMonth = ctx.dashboard.moveMonth;
window.goToToday = ctx.dashboard.goToToday;
window.selectDay = ctx.dashboard.selectDay;
window.refreshDuel = ctx.duel.refreshDuel;
window.syncNow = syncNow;
window.handleLogin = ctx.users.handleLogin;
window.handleLogout = ctx.users.handleLogout;
window.setTheme = ctx.settings.setTheme;
window.setLayout = ctx.settings.setLayout;
window.setTypography = ctx.settings.setTypography;
window.toggleSettingsPanel = ctx.settings.toggleSettingsPanel;
window.createBackupNow = () => {
  if (!ctx.currentUser) {
    ctx.ui.setNote('backup-note', 'Inicia sesión para crear backups.', true);
    return;
  }
  const created = ctx.backup.createBackup({ force: true });
  if (created) ctx.ui.setNote('backup-note', 'Backup creado.');
  else ctx.ui.setNote('backup-note', 'No se pudo crear backup.', true);
};
window.restoreBackup = () => {
  if (!ctx.currentUser) {
    ctx.ui.setNote('backup-note', 'Inicia sesión para restaurar backups.', true);
    return;
  }
  ctx.backup.restoreLastBackup();
};
window.downloadBackup = () => {
  if (!ctx.currentUser) {
    ctx.ui.setNote('backup-note', 'Inicia sesión para descargar backups.', true);
    return;
  }
  ctx.backup.downloadLastBackup();
};
window.saveAliasFromSettings = ctx.settings.saveAliasFromSettings;
window.saveAliasFromOnboarding = ctx.settings.saveAliasFromOnboarding;
window.closeAdminPanel = ctx.admin.close;

ctx.settings.initTheme();
ctx.settings.initLayout();
ctx.settings.initTypography();
ctx.dashboard.render();
ctx.users.initAuth();

window.addEventListener('offline', () => {
  showSyncReminder('Sin conexión. Los cambios quedan guardados en local hasta recuperar internet.', 'error', 6200);
});

window.addEventListener('online', () => {
  showSyncReminder('Conexión recuperada. Pulsa Sync para actualizar todos tus dispositivos.', 'success', 5200);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
