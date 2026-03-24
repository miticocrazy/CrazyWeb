export function initSettings(ctx) {
  function applyTheme(theme) {
    const safeTheme = ctx.config.THEMES.includes(theme) ? theme : 'neutral';
    ctx.config.THEMES.forEach((t) => document.body.classList.remove(`theme-${t}`));
    document.body.classList.add(`theme-${safeTheme}`);
    localStorage.setItem(ctx.config.THEME_KEY, safeTheme);
    updateThemeButtons(safeTheme);
    updateThemeIcons(safeTheme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const color = getComputedStyle(document.body).getPropertyValue('--brand').trim();
      if (color) meta.setAttribute('content', color);
    }
  }

  function updateThemeIcons(theme) {
    const iconPath = `./tracker-icon-${theme}.svg`;
    const fallbackPath = './tracker-icon.svg';
    const href = ctx.config.THEMES.includes(theme) ? iconPath : fallbackPath;
    const icon = document.getElementById('app-icon');
    const apple = document.getElementById('app-apple-icon');
    if (icon) icon.setAttribute('href', href);
    if (apple) apple.setAttribute('href', href);
  }

  function updateThemeButtons(activeTheme) {
    const current = activeTheme || localStorage.getItem(ctx.config.THEME_KEY) || 'neutral';
    document.querySelectorAll('.theme-btn').forEach((btn) => {
      const theme = btn.dataset.theme;
      const isActive = theme === current;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function applyLayout(layout) {
    const safeLayout = ctx.config.LAYOUTS.includes(layout) ? layout : 'list';
    ctx.config.LAYOUTS.forEach((l) => document.body.classList.remove(`layout-${l}`));
    document.body.classList.add(`layout-${safeLayout}`);
    localStorage.setItem(ctx.config.LAYOUT_KEY, safeLayout);
    updateOptionButtons('layout', safeLayout);
  }

  function applyTypography(font) {
    const safeFont = ctx.config.FONTS.includes(font) ? font : 'serif';
    ctx.config.FONTS.forEach((f) => document.body.classList.remove(`font-${f}`));
    document.body.classList.add(`font-${safeFont}`);
    localStorage.setItem(ctx.config.TYPE_KEY, safeFont);
    updateOptionButtons('font', safeFont);
  }

  function updateOptionButtons(kind, activeValue) {
    const selector = kind === 'layout' ? '[data-layout]' : '[data-font]';
    const attr = kind === 'layout' ? 'layout' : 'font';
    const value = activeValue || localStorage.getItem(kind === 'layout' ? ctx.config.LAYOUT_KEY : ctx.config.TYPE_KEY);
    document.querySelectorAll(selector).forEach((btn) => {
      const btnValue = btn.dataset[attr];
      const isActive = btnValue === value;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function setTheme(theme) {
    applyTheme(theme);
  }

  function setLayout(layout) {
    applyLayout(layout);
    ctx.dashboard.render();
  }

  function setTypography(font) {
    applyTypography(font);
  }

  function initTheme() {
    applyTheme(localStorage.getItem(ctx.config.THEME_KEY) || 'neutral');
  }

  function initLayout() {
    applyLayout(localStorage.getItem(ctx.config.LAYOUT_KEY) || 'list');
  }

  function initTypography() {
    applyTypography(localStorage.getItem(ctx.config.TYPE_KEY) || 'serif');
  }

  function toggleSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      ctx.duel.hydrateDuelName();
      updateThemeButtons();
      updateOptionButtons('layout');
      updateOptionButtons('font');
      if (ctx.backup?.updateBackupUI) ctx.backup.updateBackupUI();
    }
  }

  function saveAliasFromSettings() {
    const input = document.getElementById('settings-alias-input');
    if (!input) return;
    const name = (input.value || '').trim();
    if (!name) return ctx.ui.setNote('duel-note', 'Pon un alias.', true);
    ctx.duel.setAlias(name);
    ctx.ui.setNote('duel-note', 'Alias guardado.');
  }

  function needsAliasOnboarding() {
    const value = localStorage.getItem(ctx.config.DUEL_NAME_KEY);
    return !value || !value.trim();
  }

  function openAliasOnboarding() {
    const modal = document.getElementById('alias-onboarding');
    if (!modal) return;
    modal.classList.remove('hidden');
    const input = document.getElementById('onboarding-alias-input');
    if (input) input.focus();
  }

  function closeAliasOnboarding() {
    const modal = document.getElementById('alias-onboarding');
    if (!modal) return;
    modal.classList.add('hidden');
  }

  function saveAliasFromOnboarding() {
    const input = document.getElementById('onboarding-alias-input');
    const note = document.getElementById('onboarding-note');
    const name = String(input?.value || '').trim();
    if (!name) {
      if (note) {
        note.className = 'note error';
        note.textContent = 'Escribe tu alias para continuar.';
      }
      return;
    }
    ctx.duel.setAlias(name);
    closeAliasOnboarding();
    ctx.duel.hydrateDuelName();
    ctx.duel.scheduleDuelUpdate(true);
  }

  ctx.settings = {
    setTheme,
    setLayout,
    setTypography,
    initTheme,
    initLayout,
    initTypography,
    toggleSettingsPanel,
    saveAliasFromSettings,
    saveAliasFromOnboarding,
    needsAliasOnboarding,
    openAliasOnboarding,
    closeAliasOnboarding
  };
}
