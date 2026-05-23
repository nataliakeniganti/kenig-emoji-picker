/**
 * Kenig Emoji Picker - Main Script
 * Improvements: OpenMoji data integration, debouncing, localStorage consistency, better error handling,
 * memory leak prevention, image caching, and optimized rendering
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

const OPENMOJI_DATA_URL = 'https://cdn.jsdelivr.net/npm/openmoji@latest/data/openmoji.json';
const EMOJIBASE_CDN = 'https://cdn.jsdelivr.net/npm/emojibase-data@latest';

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
let OPENMOJI_MAP = {}; // Cache for OpenMoji data
let IMAGE_CACHE = new Map(); // Cache for loaded image URLs
let SKIN_OPT_LISTENERS = []; // Track skin option listeners to prevent duplicates

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

/**
 * Get cached image URL or fetch and cache it
 */
function getCachedImageUrl(set, hex, colorMode) {
  const cacheKey = `${set}-${hex}-${colorMode}`;
  
  if (IMAGE_CACHE.has(cacheKey)) {
    return IMAGE_CACHE.get(cacheKey);
  }
  
  let url = '';
  const h = hex.toLowerCase();
  const H = hex.toUpperCase();
  
  switch (set) {
    case 'google':
      url = `https://raw.githubusercontent.com/googlei18n/noto-emoji/main/png/128/emoji_u${h}.png`;
      break;
    case 'openmoji':
      const sub = colorMode === 'black' ? 'black' : 'color';
      url = `https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/${sub}/72x72/${H}.png`;
      break;
    case 'twemoji':
      url = `https://raw.githubusercontent.com/jdecked/twemoji/main/assets/72x72/${h}.png`;
      break;
  }
  
  if (url) {
    IMAGE_CACHE.set(cacheKey, url);
  }
  
  return url;
}

// ===== DATA FETCHING =====

/**
 * Fetch and parse OpenMoji data for faster emoji rendering
 */
async function fetchOpenmojiData() {
  try {
    const response = await fetch(OPENMOJI_DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    // Build map for quick lookups: hexcode -> openmoji data
    if (Array.isArray(data)) {
      data.forEach(item => {
        OPENMOJI_MAP[item.hexcode] = item;
      });
    }
    return true;
  } catch (error) {
    console.warn('Failed to load OpenMoji data:', error);
    // Not critical, continue without it
    return false;
  }
}

async function fetchData() {
  setLoaderVisible(true, 'Loading v17.0 Stable...');
  try {
    // Validate locale is supported by emojibase
    const supportedLocales = ['en', 'pl', 'fr', 'de', 'it'];
    const locale = supportedLocales.includes(LOCALE) ? LOCALE : 'en';
    
    const [data, messages] = await Promise.all([
      fetch(`${EMOJIBASE_CDN}/${locale}/data.json`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
      fetch(`${EMOJIBASE_CDN}/${locale}/messages.json`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    ]);

    // Validate response structure
    if (!Array.isArray(data)) throw new Error('Invalid data format');
    if (!messages || typeof messages !== 'object') throw new Error('Invalid messages format');

    ALL_DATA = data;
    GROUPS = {};
    
    if (Array.isArray(messages.groups)) {
      messages.groups.forEach(g => {
        if (g && typeof g === 'object' && g.order !== undefined) {
          GROUPS[g.order] = g.message;
        }
      });
    }

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
      const url = getCachedImageUrl('openmoji', hex, COLOR_MODE);
      img.src = url;
      img.loading = 'lazy';
      img.onerror = () => { 
        btn.textContent = char;
        btn.className = 'emoji-btn';
      };
      btn.innerHTML = '';
      btn.appendChild(img);
      btn.className = 'emoji-btn';
      break;

    case 'twemoji':
      const twImg = document.createElement('img');
      const twUrl = getCachedImageUrl('twemoji', hex, COLOR_MODE);
      twImg.src = twUrl;
      if (COLOR_MODE === 'black') twImg.className = 'mode-black';
      twImg.onerror = () => { 
        btn.textContent = char;
        btn.className = 'emoji-btn';
      };
      btn.innerHTML = '';
      btn.appendChild(twImg);
      btn.className = 'emoji-btn';
      break;

    default:
      btn.textContent = char;
  }
}

function createBtn(obj) {
  try {
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
  } catch (error) {
    console.error('Failed to create button for emoji:', obj, error);
    return null;
  }
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
    RECENT.forEach(o => {
      const btn = createBtn(o);
      if (btn) recGrid.appendChild(btn);
    });
  } else {
    recDiv.style.display = 'none';
  }

  // Filter and group emojis
  const grouped = {};
  ALL_DATA.forEach(e => {
    const matchesQuery = !q ||
      (e.label && e.label.toLowerCase().includes(q)) ||
      (e.tags && Array.isArray(e.tags) && e.tags.some(t => t && t.toLowerCase().includes(q)));

    if (matchesQuery) {
      if (!grouped[e.group]) grouped[e.group] = [];
      grouped[e.group].push(e);
    }
  });

  // Render groups
  Object.keys(grouped)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach(gid => {
      const sec = document.createElement('div');
      sec.id = `scroll-group-${gid}`;

      const tit = document.createElement('div');
      tit.className = 'section-title';
      tit.textContent = GROUPS[gid] || `Group ${gid}`;

      const grid = document.createElement('div');
      grid.className = 'emoji-grid';
      grouped[gid].forEach(o => {
        const btn = createBtn(o);
        if (btn) grid.appendChild(btn);
      });

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
      IMAGE_CACHE.clear(); // Clear image cache on color change
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
      IMAGE_CACHE.clear(); // Clear image cache on set change
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

  // Skin tone selector - use event delegation to prevent memory leaks
  const skinTrigger = getElement('skin-trigger');
  if (skinTrigger) {
    skinTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = getElement('skin-menu');
      if (menu) menu.classList.toggle('active');
    });
  }

  // Use event delegation for skin options to prevent listener stacking
  const skinMenu = getElement('skin-menu');
  if (skinMenu) {
    skinMenu.addEventListener('click', (e) => {
      const opt = e.target.closest('.skin-opt');
      if (opt && opt.dataset.idx !== undefined) {
        SKIN = parseInt(opt.dataset.idx);
        localStorage.setItem(STORAGE_KEYS.skin, SKIN);
        updateSkinUI();
        render();
      }
    });
  }

  window.addEventListener('click', (e) => {
    // Only close menu if click is outside skin menu
    if (!e.target.closest('.skin-trigger') && !e.target.closest('.skin-menu')) {
      const menu = getElement('skin-menu');
      if (menu) menu.classList.remove('active');
    }
  });

  // Theme preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (THEME === 'auto') updateThemeAndIcons();
  });
}

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  
  // Fetch OpenMoji data in parallel with main data (non-blocking)
  fetchOpenmojiData();
  
  // Fetch main emoji data
  fetchData();
});
