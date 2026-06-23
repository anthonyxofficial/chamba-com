(() => {
  const STORAGE_KEY = 'theme';
  const html = document.documentElement;

  const DARK = {
    '--ch-primary': '#FFFFFF',
    '--ch-on-primary': '#000000',
    '--ch-background': '#000000',
    '--ch-surface': '#131313',
    '--ch-surface-variant': '#1A1A1A',
    '--ch-on-background': '#FFFFFF',
    '--ch-on-surface': '#FFFFFF',
    '--ch-on-surface-variant': '#A0A0A0',
    '--ch-secondary': '#A0A0A0',
    '--ch-outline': '#333333',
    '--ch-outline-variant': '#333333',
    '--ch-error': '#FF4444',
    '--ch-favorite': '#FF4444',
    '--ch-primary-container': '#111111',
    '--ch-on-primary-container': '#FFFFFF',
    '--ch-surface-container': '#131313',
    '--ch-surface-container-low': '#0A0A0A',
    '--ch-surface-container-high': '#1A1A1A',
    '--ch-surface-container-highest': '#1A1A1A',
    '--ch-surface-container-lowest': '#000000',
    '--ch-surface-bright': '#131313',
    '--ch-surface-dim': '#0A0A0A',
    '--ch-inverse-surface': '#FFFFFF',
    '--ch-inverse-on-surface': '#f2f0ef',
    '--ch-inverse-primary': '#000000',
    '--ch-inverse-on-primary': '#FFFFFF',
    '--ch-tertiary': '#FFFFFF',
    '--ch-tertiary-container': '#131313',
    '--ch-on-tertiary': '#000000',
    '--ch-on-tertiary-container': '#FFFFFF',
    '--ch-secondary-container': '#131313',
    '--ch-on-secondary': '#000000',
    '--ch-on-secondary-container': '#FFFFFF',
    '--ch-dark-bg': '#0A0A0A',
    '--ch-dark-surface': '#131313',
    '--ch-dark-text': '#E0E0E0',
    '--ch-on-error': '#ffffff',
    '--ch-error-container': '#93000a',
    '--ch-on-error-container': '#ffffff',
    '--ch-surface-tint': '#FFFFFF',
    '--ch-primary-fixed': '#FFFFFF',
    '--ch-primary-fixed-dim': '#FFFFFF',
    '--ch-on-primary-fixed': '#000000',
    '--ch-on-primary-fixed-variant': '#000000',
    '--ch-secondary-fixed': '#131313',
    '--ch-secondary-fixed-dim': '#FFFFFF',
    '--ch-on-secondary-fixed': '#000000',
    '--ch-on-secondary-fixed-variant': '#FFFFFF',
    '--ch-tertiary-fixed': '#FFFFFF',
    '--ch-tertiary-fixed-dim': '#FFFFFF',
    '--ch-on-tertiary-fixed': '#000000',
    '--ch-on-tertiary-fixed-variant': '#FFFFFF',
    '--ch-job-pink': '#E91E63',
    '--ch-job-green': '#00C853',
    '--ch-job-blue': '#2979FF',
    '--ch-shadow': 'rgba(255,255,255,1)',
    '--ch-stroke': '#FFFFFF',
    '--ch-pattern': '#FFFFFF',
    '--ch-footer-bg': '#000000',
    '--ch-footer-text': '#FFFFFF'
  };

  const LIGHT = {
    '--ch-primary': '#000000',
    '--ch-on-primary': '#FFFFFF',
    '--ch-background': '#fbf9f8',
    '--ch-surface': '#FFFFFF',
    '--ch-surface-variant': '#E3E2E2',
    '--ch-on-background': '#1B1C1C',
    '--ch-on-surface': '#1b1c1b',
    '--ch-on-surface-variant': '#4c4546',
    '--ch-secondary': '#5e5e5e',
    '--ch-outline': '#7e7576',
    '--ch-outline-variant': '#cfc4c5',
    '--ch-error': '#DC2626',
    '--ch-favorite': '#EF4444',
    '--ch-primary-container': '#1b1b1b',
    '--ch-on-primary-container': '#848484',
    '--ch-surface-container': '#efedec',
    '--ch-surface-container-low': '#f5f3f2',
    '--ch-surface-container-high': '#e9e8e7',
    '--ch-surface-container-highest': '#e4e2e1',
    '--ch-surface-container-lowest': '#ffffff',
    '--ch-surface-bright': '#fbf9f8',
    '--ch-surface-dim': '#dbdad9',
    '--ch-inverse-surface': '#303030',
    '--ch-inverse-on-surface': '#f2f0ef',
    '--ch-inverse-primary': '#c6c6c6',
    '--ch-inverse-on-primary': '#000000',
    '--ch-tertiary': '#000000',
    '--ch-tertiary-container': '#002109',
    '--ch-on-tertiary': '#ffffff',
    '--ch-on-tertiary-container': '#009842',
    '--ch-secondary-container': '#e4e2e2',
    '--ch-on-secondary': '#ffffff',
    '--ch-on-secondary-container': '#646464',
    '--ch-dark-bg': '#0A0A0A',
    '--ch-dark-surface': '#333333',
    '--ch-dark-text': '#1b1c1c',
    '--ch-on-error': '#ffffff',
    '--ch-error-container': '#ffdad6',
    '--ch-on-error-container': '#93000a',
    '--ch-surface-tint': '#5e5e5e',
    '--ch-primary-fixed': '#e2e2e2',
    '--ch-primary-fixed-dim': '#c6c6c6',
    '--ch-on-primary-fixed': '#1b1b1b',
    '--ch-on-primary-fixed-variant': '#474747',
    '--ch-secondary-fixed': '#e4e2e2',
    '--ch-secondary-fixed-dim': '#c8c6c6',
    '--ch-on-secondary-fixed': '#1b1c1c',
    '--ch-on-secondary-fixed-variant': '#474747',
    '--ch-tertiary-fixed': '#7ffc97',
    '--ch-tertiary-fixed-dim': '#62df7d',
    '--ch-on-tertiary-fixed': '#002109',
    '--ch-on-tertiary-fixed-variant': '#005320',
    '--ch-job-pink': '#E91E63',
    '--ch-job-green': '#00C853',
    '--ch-job-blue': '#2979FF',
    '--ch-shadow': 'rgba(0,0,0,1)',
    '--ch-stroke': '#000000',
    '--ch-pattern': '#000000',
    '--ch-footer-bg': '#000000',
    '--ch-footer-text': '#FFFFFF'
  };

  function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }

  function applyTheme(theme) {
    html.classList.remove('light', 'dark');
    html.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);

    const vars = theme === 'dark' ? DARK : LIGHT;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));

    updateToggleIcon(theme);
    updateMobileMenuColors(theme);
  }

  function updateToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    if (!icon) return;
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  }

  function updateMobileMenuColors(theme) {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    const vars = theme === 'dark' ? DARK : LIGHT;
    menu.style.background = vars['--ch-background'];
    menu.style.color = vars['--ch-on-background'];
  }

  function toggleTheme() {
    const current = html.classList.contains('dark') ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function openMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
      menu.classList.remove('hidden');
      menu.setAttribute('role', 'dialog');
      menu.setAttribute('aria-modal', 'true');
      menu.setAttribute('aria-label', 'Menú de navegación');
      const firstLink = menu.querySelector('a, button');
      if (firstLink) firstLink.focus();
    }
  }

  function closeMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) menu.classList.add('hidden');
  }

  applyTheme(getPreferredTheme());

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  window.toggleTheme = toggleTheme;
  window.openMobileMenu = openMobileMenu;
  window.closeMobileMenu = closeMobileMenu;
})();
