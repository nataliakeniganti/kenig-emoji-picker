/**
 * Kenig Emoji Picker - Main Script
 * Improvements: Bug fixes, debouncing, localStorage consistency, better error handling
 */

// ===== INTERNATIONALIZATION =====
const I18N_MAP = {
  en: {
    search: "Search emojis...",
    recent: "Frequently used",
    placeholder: "Select an emoji",
    set: "Set:",
    color: "Color:",
    theme: "Theme:",
    icons: "Icons:",
    version: "Emoji version:",
    locale: "Locale (UI):",
    tones: ["Default", "Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"]
  },
  pl: {
    search: "Szukaj emoji...",
    recent: "Często używane",
    placeholder: "Wybierz emoji",
    set: "Zestaw:",
    color: "Kolor:",
    theme: "Motyw:",
    icons: "Ikony:",
    version: "Wersja emoji:",
    locale: "Język (UI):",
    tones: ["Domyślny", "Jasny", "Średnio-jasny", "Średni", "Średnio-ciemny", "Ciemny"]
  }
};

// ===== SKIN TONE PATHS =====
const SKIN_PATHS = {
  native: ['default', 'light', 'mediumlight', 'medium', 'mediumdark', 'dark'].map(n => `/skintone/${n}.png`),
  openmoji: ['default', 'light', 'mediumlight', 'medium', 'mediumdark', 'dark'].map(n => `/skintone/openmoji_${n}.svg`),
  google: ['default', 'light', 'mediumlight', 'medium', 'mediumdark', 'dark'].map(n => `/skintone/google_${n}.png`),
  twemoji: ['default', 'light', 'mediumlight', 'medium', 'mediumdark', 'dark'].map(n => `/skintone/${n}.png`)
};

// ===== CONSTANTS =====
const STORAGE_KEYS = {
  recent: 'fav_v17_allsets',
  skin: 'user_skin_v17',
  set: 'user_set_v17',
  theme: 'user_theme_v17',
  icons: 'user_icons_v17',
  locale: 'user_lang_v17',
  color: 'user_color_v17'
};

// ===== STATE MANAGEMENT =====
let ALL_DATA = [];
let GROUPS = {};
let RECENT = JSON.parse(localStorage.getItem(STORAGE_KEYS.recent) || '[]');
let SKIN = parseInt(localStorage.getItem(STORAGE_KEYS.skin) || '0');
let SET = localStorage.getItem(STORAGE_KEYS.set) || 'native';
let THEME = localStorage.getItem(STORAGE_KEYS.theme) || 'auto';
let ICONS = localStorage.getItem(STORAGE_KEYS.icons) || 'auto';
let LOCALE = localStorage.getItem(STORAGE_KEYS.locale) || 'en';
let COLOR_MODE = localStorage.getItem(STORAGE_KEYS.color) || 'color';

// ===== UTILITY FUNCTIONS =====

/**
 * Debounce function to prevent excessive function calls
 */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Safely get element by ID with error handling
 */
function getElement(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Element with id "${id}" not found`);
  return el;
}

/**
 * Show/hide loader
 */
function setLoaderVisible(visible, message = '') {
  const loader = getElement('loader');
  if (!loader) return;
  loader.style.display = visible ? 'flex' : 'none';
  if (message) loader.textContent = message;
}

// ===== DATA FETCHING =====

async function fetchData() {
  setLoaderVisible(true, 'Loading v17.0 Stable...');
  try {
    const [data, messages] = await Promise.all([
      fetch(`https://cdn.jsdelivr.net/npm/emojibase-data@latest/${LOCALE}/data.json`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      fetch(`https://cdn.jsdelivr.net/npm/emojibase-data@latest/${LOCALE}/messages.json`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    ]);

    // Validate response structure
    if (!Array.isArray(data)) throw new Error('Invalid data format');
    if (!messages || !Array.isArray(messages.groups)) throw new Error('Invalid messages format');

    ALL_DATA = data;
    messages.groups.forEach(g => {
      GROUPS[g.order] = g.message;
    });

    setLoaderVisible(false);
    updateUIStrings();
    updateThemeAndIcons();
    updateSkinUI();
    render();
  } catch (error) {
    console.error('Failed to load emoji data:', error);
    setLoaderVisible(true, `Error: ${error.message}\nPlease refresh the page`);
  }
}

// ===== UI UPDATES =====

function updateUIStrings() {
  const t = I18N_MAP[LOCALE] || I18N_MAP['en'];
  const searchInput = getElement('search');
  if (searchInput) searchInput.placeholder = t.search;

  const titleRecent = getElement('title-recent');
  if (titleRecent) titleRecent.textContent = t.recent;

  const previewName = getElement('preview-name');
  if (previewName) previewName.textContent = t.placeholder;

  // Update labels
  ['set', 'color', 'theme', 'icons', 'version', 'locale'].forEach(k => {
    const el = getElement(`lbl-${k}`);
    if (el) el.textContent = t[k] || I18N_MAP['en'][k];
  });

  // Update skin tone labels
  document.querySelectorAll('.skin-opt span').forEach((s, i) => {
    s.textContent = t.tones[i] || I18N_MAP['en'].tones[i];
  });
}

function updateThemeAndIcons() {
  const activeTheme = THEME === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : THEME;

  document.documentElement.setAttribute('data-theme', activeTheme);

  const fillValue = ICONS === 'auto'
    ? (activeTheme === 'dark' ? 1 : 0)
    : parseInt(ICONS);

  document.documentElement.style.setProperty('--fill', fillValue);
}

function updateSkinUI() {
  const list = SKIN_PATHS[SET] || SKIN_PATHS.native;
  const trigger = getElement('skin-trigger');

  if (trigger) {
    trigger.style.backgroundImage = `url('${list[SKIN]}')`;
    trigger.className = COLOR_MODE === 'black' ? 'skin-trigger mode-black' : 'skin-trigger';
  }

  document.querySelectorAll('.skin-opt img').forEach((img, i) => {
    img.src = list[i];
    img.className = COLOR_MODE === 'black' ? 'mode-black' : '';
  });
}

// ===== EMOJI DATA HANDLING =====

function getEmojiData(obj) {
  const cur = SKIN !== 0 && obj.skins ? (obj.skins[SKIN - 1] || obj) : obj;
  return {
    char: cur.emoji,
    hex: cur.hexcode,
    label: obj.label
  };
}

function applyGlyphStyle(btn, char, hex) {
  const h = hex.toLowerCase();
  const H = hex.toUpperCase();

  switch (SET) {
    case 'native':
      btn.textContent = char;
      btn.className = COLOR_MODE === 'black' ? 'emoji-btn mode-black' : 'emoji-btn';
      break;

    case 'google':
      btn.textContent = char;
      btn.className = COLOR_MODE === 'black' ? 'emoji-btn f-google-black' : 'emoji-btn f-google-color';
      break;

    case 'openmoji':
      const sub = COLOR_MODE === 'black' ? 'black' : 'color';
      const img = document.createElement('img');
      img.src = `https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/${sub}/72x72/${H}.png`;
      img.loading = 'lazy';
      img.onerror = () => { btn.textContent = char; };
      btn.innerHTML = '';
      btn.appendChild(img);
      break;

    case 'twemoji':
      const url = `https://raw.githubusercontent.com/jdecked/twemoji/main/assets/72x72/${h}.png`;
      const twImg = document.createElement('img');
      twImg.src = url;
      if (COLOR_MODE === 'black') twImg.className = 'mode-black';
      twImg.onerror = () => { btn.textContent = char; };
      btn.innerHTML = '';
      btn.appendChild(twImg);
      break;

    default:
      btn.textContent = char;
  }
}

function createBtn(obj) {
  const data = getEmojiData(obj);
  const b = document.createElement('button');
  b.className = 'emoji-btn';
  b.title = data.label;
  b.setAttribute('aria-label', data.label);
  applyGlyphStyle(b, data.char, data.hex);

  b.addEventListener('mouseenter', () => {
    const pc = getElement('preview-char');
    if (pc) applyGlyphStyle(pc, data.char, data.hex);
    const pn = getElement('preview-name');
    if (pn) pn.textContent = data.label;
  });

  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(data.char);
      // Update recent
      RECENT = [obj, ...RECENT.filter(r => r.hexcode !== obj.hexcode)].slice(0, 16);
      localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(RECENT));

      // Show "Copied" feedback
      const pn = getElement('preview-name');
      if (pn) {
        const oldName = data.label;
        pn.textContent = "Copied!";
        setTimeout(() => { pn.textContent = oldName; }, 800);
      }

      // Re-render if no search active
      if (!getElement('search')?.value) render();
    } catch (error) {
      console.error('Failed to copy emoji:', error);
    }
  });

  return b;
}

// ===== RENDERING =====

function render() {
  const searchInput = getElement('search');
  const q = searchInput?.value.toLowerCase() || '';
  const main = getElement('main-groups');
  const recDiv = getElement('section-recent');
  const recGrid = getElement('grid-recent');

  if (!main || !recDiv || !recGrid) return;

  main.innerHTML = '';
  recGrid.innerHTML = '';

  // Show recent if no search
  if (!q && RECENT.length > 0) {
    recDiv.style.display = 'block';
    RECENT.forEach(o => recGrid.appendChild(createBtn(o)));
  } else {
    recDiv.style.display = 'none';
  }

  // Filter and group emojis
  const grouped = {};
  ALL_DATA.forEach(e => {
    const matchesQuery = !q ||
      e.label.toLowerCase().includes(q) ||
      (e.tags && e.tags.some(t => t.toLowerCase().includes(q)));

    if (matchesQuery) {
      if (!grouped[e.group]) grouped[e.group] = [];
      grouped[e.group].push(e);
    }
  });

  // Render groups
  Object.keys(grouped)
    .sort((a, b) => a - b)
    .forEach(gid => {
      const sec = document.createElement('div');
      sec.id = `scroll-group-${gid}`;

      const tit = document.createElement('div');
      tit.className = 'section-title';
      tit.textContent = GROUPS[gid] || `Group ${gid}`;

      const grid = document.createElement('div');
      grid.className = 'emoji-grid';
      grouped[gid].forEach(o => grid.appendChild(createBtn(o)));

      sec.append(tit, grid);
      main.appendChild(sec);
    });
}

// ===== EVENT LISTENERS =====

function setupEventListeners() {
  // Settings
  const colorSelect = getElement('color-select');
  if (colorSelect) {
    colorSelect.addEventListener('change', (e) => {
      COLOR_MODE = e.target.value;
      localStorage.setItem(STORAGE_KEYS.color, COLOR_MODE);
      updateSkinUI();
      render();
    });
  }

  const localeSelect = getElement('locale-select');
  if (localeSelect) {
    localeSelect.addEventListener('change', (e) => {
      LOCALE = e.target.value;
      localStorage.setItem(STORAGE_KEYS.locale, LOCALE);
      fetchData();
    });
  }

  const themeSelect = getElement('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      THEME = e.target.value;
      localStorage.setItem(STORAGE_KEYS.theme, THEME);
      updateThemeAndIcons();
    });
  }

  const iconStyleSelect = getElement('icon-style-select');
  if (iconStyleSelect) {
    iconStyleSelect.addEventListener('change', (e) => {
      ICONS = e.target.value;
      localStorage.setItem(STORAGE_KEYS.icons, ICONS);
      updateThemeAndIcons();
    });
  }

  const setSelect = getElement('set-select');
  if (setSelect) {
    setSelect.addEventListener('change', (e) => {
      SET = e.target.value;
      localStorage.setItem(STORAGE_KEYS.set, SET);
      updateSkinUI();
      render();
    });
  }

  const clearHistory = getElement('clear-history');
  if (clearHistory) {
    clearHistory.addEventListener('click', () => {
      RECENT = [];
      localStorage.removeItem(STORAGE_KEYS.recent);
      render();
    });
  }

  // Search with debouncing
  const search = getElement('search');
  if (search) {
    search.addEventListener('input', debounce(render, 300));
  }

  // Category navigation
  const catNav = getElement('cat-nav');
  if (catNav) {
    catNav.addEventListener('click', (e) => {
      const b = e.target.closest('.nav-btn');
      if (!b) return;

      const target = b.dataset.group === 'recent'
        ? getElement('section-recent')
        : getElement(`scroll-group-${b.dataset.group}`);

      if (target) {
        const viewport = getElement('viewport');
        if (viewport) {
          viewport.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
        }
      }
    });
  }

  // Skin tone selector
  const skinTrigger = getElement('skin-trigger');
  if (skinTrigger) {
    skinTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = getElement('skin-menu');
      if (menu) menu.classList.toggle('active');
    });
  }

  document.querySelectorAll('.skin-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      SKIN = parseInt(opt.dataset.idx);
      localStorage.setItem(STORAGE_KEYS.skin, SKIN);
      updateSkinUI();
      render();
    });
  });

  window.addEventListener('click', () => {
    const menu = getElement('skin-menu');
    if (menu) menu.classList.remove('active');
  });

  // Theme preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (THEME === 'auto') updateThemeAndIcons();
  });
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchData();
});
