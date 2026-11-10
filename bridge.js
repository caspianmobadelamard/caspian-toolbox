/* ============================================================================
   Caspian Theme Bridge — موتور تم / پس‌زمینه / رنگ تاکیدی / فونت
   در پوسته (index.html) و هر دو ماژول (capacity.html, pressure.html) لود می‌شود.
   تنظیمات را از localStorage می‌خواند و به‌صورت متغیرهای --u-* روی <html> اعمال می‌کند.
   تغییرات از پوسته از طریق رویداد storage (و پیام postMessage به‌عنوان پشتیبان) همگام می‌شود.
   ============================================================================ */
(function () {
  'use strict';

  var KEYS = {
    theme: 'caspian_theme',      // 'dark' | 'light'
    accent: 'caspian_accent',    // hex
    bg: 'caspian_bg',            // hex (پس‌زمینه تیره)
    font: 'caspian_font',        // small|medium|large|xlarge
    fontFamily: 'caspian_font_family',
    updateUrl: 'caspian_update_url'
  };

  var DEFAULTS = { theme: 'dark', accent: '#fbbf24', bg: '#1e2a3a', font: 'medium', fontFamily: 'Vazirmatn' };

  /* ---------- ابزار رنگ ---------- */
  function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
  function hexToRgb(h) {
    h = String(h || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (x) {
      return clamp(x).toString(16).padStart(2, '0');
    }).join('');
  }
  /* t>0 روشن‌تر (مخلوط با سفید)، t<0 تیره‌تر (مخلوط با مشکی) */
  function shade(hex, t) {
    var c = hexToRgb(hex); if (!c) return hex;
    var target = t > 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
    var a = Math.abs(t);
    return rgbToHex(c.r + (target.r - c.r) * a, c.g + (target.g - c.g) * a, c.b + (target.b - c.b) * a);
  }
  function glow(hex, a) {
    var c = hexToRgb(hex); if (!c) return 'rgba(251,191,36,.35)';
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a == null ? 0.35 : a) + ')';
  }

  function get(key) { return localStorage.getItem(key) || DEFAULTS[key]; }

  /* بارگذاری فونت از Google Fonts (فونت پیش‌فرض Vazirmatn محلی است و نیازی ندارد) */
  var _loadedFont = null;
  function loadGoogleFont(family) {
    if (!family || family === 'Vazirmatn') return;
    if (_loadedFont === family) return;
    _loadedFont = family;
    var id = 'caspian-gfont';
    var old = document.getElementById(id);
    if (old) old.parentNode.removeChild(old);
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family).replace(/%20/g, '+') + ':wght@400;500;700;800&display=swap';
    document.head.appendChild(link);
  }

  /* ---------- اعمال تم ---------- */
  function apply() {
    var theme = get(KEYS.theme);
    var accent = get(KEYS.accent);
    var bg = get(KEYS.bg);
    var font = get(KEYS.font);
    var root = document.documentElement;

    root.setAttribute('data-caspian-theme', theme);

    var v = {};
    if (theme === 'light') {
      v['--u-bg-base'] = '#f0f4f8'; v['--u-bg-surface'] = '#ffffff';
      v['--u-bg-elevated'] = '#e8eef5'; v['--u-bg-input'] = '#ffffff'; v['--u-bg-hover'] = '#dbe4ee';
      v['--u-border'] = '#d0d8e0'; v['--u-border-strong'] = '#a8b4c4'; v['--u-border-dashed'] = '#c0ccd8';
      v['--u-text'] = '#1a2332'; v['--u-text-mid'] = '#4a5568'; v['--u-text-dim'] = '#7a8699';
    } else {
      v['--u-bg-base'] = bg;
      v['--u-bg-surface'] = shade(bg, 0.06);
      v['--u-bg-elevated'] = shade(bg, 0.12);
      v['--u-bg-input'] = shade(bg, -0.05);
      v['--u-bg-hover'] = shade(bg, 0.18);
      v['--u-border'] = shade(bg, 0.16);
      v['--u-border-strong'] = shade(bg, 0.28);
      v['--u-border-dashed'] = shade(bg, 0.22);
      v['--u-text'] = '#e8eef5'; v['--u-text-mid'] = '#a5b5c5'; v['--u-text-dim'] = '#738599';
    }
    v['--u-accent'] = accent;
    v['--u-accent-dim'] = shade(accent, -0.22);
    v['--u-accent-light'] = shade(accent, 0.18);
    v['--u-accent-glow'] = glow(accent, 0.35);

    var sizes = { small: '13px', medium: '15px', large: '17px', xlarge: '19px' };
    v['--base-font'] = sizes[font] || '15px';

    for (var k in v) { root.style.setProperty(k, v[k]); }
    root.style.fontSize = v['--base-font'];

    var ff = get(KEYS.fontFamily) || 'Vazirmatn';
    loadGoogleFont(ff);
    if (document.body) document.body.style.fontFamily = '"' + ff + '", "Vazirmatn", Tahoma, sans-serif';
  }

  /* تنظیم از طرف UI پوسته؛ localStorage را می‌نویسد و این سند را به‌روز می‌کند */
  function set(key, value) {
    if (!KEYS[key]) return;
    localStorage.setItem(KEYS[key], value);
    apply();
  }

  /* ---------- رویدادهای همگام‌سازی ---------- */
  // وقتی سندِ دیگر (پوسته) localStorage را تغییر دهد، این سند (iframe) آگاه می‌شود
  window.addEventListener('storage', function (e) {
    for (var k in KEYS) { if (KEYS[k] === e.key) { apply(); return; } }
  });

  // پشتیبان برای file:// یا WebView: پیام مستقیم از پوسته به iframe
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (d && d.__caspianTheme) {
      if (d.theme != null) localStorage.setItem(KEYS.theme, d.theme);
      if (d.accent != null) localStorage.setItem(KEYS.accent, d.accent);
      if (d.bg != null) localStorage.setItem(KEYS.bg, d.bg);
      if (d.font != null) localStorage.setItem(KEYS.font, d.font);
      if (d.fontFamily != null) localStorage.setItem(KEYS.fontFamily, d.fontFamily);
      apply();
    }
  });

  window.CaspianTheme = {
    apply: apply,
    set: set,
    get: get,
    KEYS: KEYS,
    shade: shade,
    glow: glow,
    hexToRgb: hexToRgb
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
