export function initBackup(ctx) {
  const PREFIX = 'tracker_backup_v1';
  const MAX_BACKUPS = 30;

  function userKey() {
    return ctx.currentUser?.id || 'guest';
  }

  function backupKey(day) {
    return `${PREFIX}:${userKey()}:${day}`;
  }

  function lastKey() {
    return `${PREFIX}:last:${userKey()}`;
  }

  function listKey() {
    return `${PREFIX}:list:${userKey()}`;
  }

  function getBackupList() {
    try {
      const raw = localStorage.getItem(listKey());
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function setBackupList(list) {
    try { localStorage.setItem(listKey(), JSON.stringify(list)); } catch (_) {}
  }

  function addToList(day) {
    let list = getBackupList();
    if (!list.includes(day)) list.unshift(day);
    if (list.length > MAX_BACKUPS) {
      const toRemove = list.slice(MAX_BACKUPS);
      toRemove.forEach((d) => {
        try { localStorage.removeItem(backupKey(d)); } catch (_) {}
      });
      list = list.slice(0, MAX_BACKUPS);
    }
    setBackupList(list);
  }

  function getLastBackupDay() {
    const stored = localStorage.getItem(lastKey());
    if (stored) return stored;
    const list = getBackupList();
    return list[0] || '';
  }

  function updateBackupUI() {
    const label = document.getElementById('backup-last');
    if (!label) return;
    const day = getLastBackupDay();
    if (!day) {
      label.textContent = 'Sin backups todavía.';
      return;
    }
    const pretty = ctx.utils.formatDateLabel(day);
    label.textContent = `Último backup: ${pretty}`;
  }

  function createBackup({ force = false } = {}) {
    const day = ctx.utils.dateKey();
    const key = backupKey(day);
    if (!force && localStorage.getItem(key)) return false;
    try {
      localStorage.setItem(key, JSON.stringify(ctx.state));
      localStorage.setItem(lastKey(), day);
      addToList(day);
      updateBackupUI();
      return true;
    } catch (_) {
      return false;
    }
  }

  function ensureDailyBackup() {
    if (!ctx.currentUser) return;
    const created = createBackup({ force: false });
    if (created) ctx.ui.setNote('backup-note', 'Backup diario creado.');
  }

  function restoreBackup(day) {
    if (!day) return false;
    const raw = localStorage.getItem(backupKey(day));
    if (!raw) return false;
    try {
      const backupState = ctx.data.normalizeState(JSON.parse(raw));
      ctx.state = backupState;
      ctx.storage.saveLocalState();
      ctx.dashboard.render();
      ctx.ui.setNote('backup-note', 'Backup restaurado.');
      ctx.data.save(true);
      return true;
    } catch (_) {
      return false;
    }
  }

  function restoreLastBackup() {
    const day = getLastBackupDay();
    if (!day) {
      ctx.ui.setNote('backup-note', 'No hay backups para restaurar.', true);
      return false;
    }
    if (!confirm(`¿Restaurar backup del ${day}?`)) return false;
    return restoreBackup(day);
  }

  function downloadBackup(day) {
    const raw = localStorage.getItem(backupKey(day));
    if (!raw) return false;
    const blob = new Blob([raw], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tracker-backup-${userKey()}-${day}.json`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
    return true;
  }

  function downloadLastBackup() {
    const day = getLastBackupDay();
    if (!day) {
      ctx.ui.setNote('backup-note', 'No hay backups para descargar.', true);
      return false;
    }
    return downloadBackup(day);
  }

  ctx.backup = {
    ensureDailyBackup,
    createBackup,
    restoreLastBackup,
    downloadLastBackup,
    updateBackupUI,
    getLastBackupDay
  };
}
