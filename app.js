/* ============================================================
   Pressure Tank Calculator v7.0
   Caspian Mobadel Amard
   Features: Cubic Simple, ASME Tab, Workshop Tab, Visual Tab,
             Advanced Coil, Per-Equipment Parts, Square Feet
   ============================================================ */

/* ============ Globals ============ */
let PRICES = JSON.parse(JSON.stringify(window.EMBEDDED_PRICES || {}));
let CATALOG = window.EMBEDDED_CATALOG || {categories:{}};

const HEAD_HISTORY_KEY = 'csp_head_history_v1';
const COIL_HISTORY_KEY = 'csp_coil_history_v1';
const WORKSHOP_KEY = 'csp_workshop_v1';
const AUTO_SAVE_KEY = 'csp_autosave_v1';
const REAL_HEAD_KEY = 'csp_real_head_v1';
const ORDER_MODE = {current: 'A'};
const DIM_MODE = {current: 'A'};
const HEAD_MODE = {current: 'simple'};
let LAST_VOLUME = null;
let WORKSHOP = null;

/* ============ Workshop Defaults ============ */
const DEFAULT_WORKSHOP = {
  maxBaseThickness: 8,
  maxManhole16Thickness: 12,
  maxManhole18Thickness: 15,
  maxManhole20Thickness: 15,
  minCoilWallClearance: 50,
  maxPressThickness: 20,
  maxPressDiameter: 3000,
  sheetWidths: [1500, 1520, 2000, 2500],
  sheetLength: 6000
};

function loadWorkshop(){
  try {
    const s = localStorage.getItem(WORKSHOP_KEY);
    return s ? Object.assign({}, DEFAULT_WORKSHOP, JSON.parse(s)) : {...DEFAULT_WORKSHOP};
  } catch(e) { return {...DEFAULT_WORKSHOP}; }
}
function saveWorkshop(w){
  try { localStorage.setItem(WORKSHOP_KEY, JSON.stringify(w)); } catch(e) {}
}
WORKSHOP = loadWorkshop();

/* ============ Helpers ============ */
function fmt(n,d=2){
  if(!isFinite(n)||n==null) return '—';
  return Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
}
function fmtT(n){
  if(!isFinite(n)) return '—';
  if(n>=1e9) return fmt(n/1e9,3)+' B';
  if(n>=1e6) return fmt(n/1e6,2)+' M';
  if(n>=1e3) return fmt(n/1e3,1)+' K';
  return fmt(n,0);
}
function val(id){
  const e = document.getElementById(id);
  return e ? parseFloat(e.value)||0 : 0;
}
function persianDate(){
  try {
    return new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year:'numeric', month:'2-digit', day:'2-digit'
    }).format(new Date());
  } catch(e) {
    return new Date().toISOString().slice(0,10);
  }
}
function initLogo(){
  const img = document.getElementById('logo-img');
  if(!img) return;
  img.onerror = function(){
    const parent = img.parentElement;
    if(parent){
      parent.innerHTML = '<svg viewBox="0 0 100 100" fill="none"><rect x="15" y="38" width="70" height="40" rx="6" stroke="#fff" stroke-width="3"/><path d="M15 48 Q50 28 85 48" stroke="#fff" stroke-width="3"/><text x="50" y="68" font-family="Arial" font-size="16" font-weight="900" fill="#fff" text-anchor="middle">PT</text></svg>';
    }
  };
}

/* ============ Theme ============ */
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('csp_theme', next);
  const icon = document.getElementById('themeIcon');
  if(icon){
    if(next === 'dark'){
      icon.setAttribute('d','M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
    } else {
      icon.setAttribute('d','M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
    }
  }
}
(function(){
  const saved = localStorage.getItem('csp_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
})();

/* ============ SVG Icons ============ */
const SVG_ICONS = {
  tank:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="10" rx="0.5"/><path d="M2 7 Q6 3 12 3 Q18 3 22 7"/><path d="M2 17 Q6 21 12 21 Q18 21 22 17"/></svg>',
  head:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12 Q12 2 21 12"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
  coil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 7 Q9 4 11 7 Q13 10 15 7 Q17 4 19 7"/><path d="M5 12 Q9 9 11 12 Q13 15 15 12 Q17 9 19 12"/><path d="M5 17 Q9 14 11 17 Q13 20 15 17 Q17 14 19 17"/></svg>',
  utube:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4 L8 14 Q8 18 12 18 Q16 18 16 14 L16 4"/></svg>',
  base:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6 L4 20 L8 20 L8 12 L16 12 L16 20 L20 20 L20 6"/></svg>',
  pad:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="14" width="20" height="5"/></svg>',
  manhole:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="4.5"/></svg>',
  flange:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/></svg>',
  valve:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7 L12 12 L6 17 Z"/><path d="M18 7 L12 12 L18 17 Z"/></svg>',
  cathode:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="3" x2="12" y2="21"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="19" x2="17" y2="19"/></svg>',
  ladder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="7" y1="3" x2="7" y2="21"/><line x1="17" y1="3" x2="17" y2="21"/><line x1="7" y1="6" x2="17" y2="6"/><line x1="7" y1="10" x2="17" y2="10"/><line x1="7" y1="14" x2="17" y2="14"/><line x1="7" y1="18" x2="17" y2="18"/></svg>',
  resin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="9" r="2"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="14" r="2"/><circle cx="17" cy="13" r="2"/></svg>',
  tower:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="3" width="10" height="18" rx="0.5"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',
  tray:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="2.5"/><rect x="3" y="14" width="18" height="2.5"/></svg>',
  diaphragm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6 Q12 12 4 18"/><path d="M20 6 Q12 12 20 18"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8 L12 3 L21 8 L21 20 L12 20 L3 20 Z"/><path d="M3 8 L12 13 L21 8"/></svg>',
  nozzle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9 L18 9 L18 15 L6 15 Z"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>',
  pipeIn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12 L10 12 L10 8 L18 8 L18 16 L10 16 L10 12"/></svg>',
  asme:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2 L4 6 L4 12 Q4 18 12 22 Q20 18 20 12 L20 6 Z"/><path d="M9 12 L11 14 L15 10"/></svg>',
  factory:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 20 L2 10 L8 14 L8 10 L14 14 L14 10 L20 14 L22 14 L22 20 Z"/><path d="M6 20 L6 16"/><path d="M11 20 L11 16"/><path d="M16 20 L16 16"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12 Q6 5 12 5 Q18 5 23 12 Q18 19 12 19 Q6 19 1 12 Z"/><circle cx="12" cy="12" r="3"/></svg>'
};

const MAT_RHO = {'ST37':7850,'S235JR':7850,'A516-70':7850,'Galvanized':7850,'SS304':8000,'SS316':8000};
const MAT_S = {
  'ST37':13500,'S235JR':15000,'A516-70':20000,'Galvanized':14000,'SS304':16700,'SS316':16700
};
// تنش مجاز بر حسب MPa (ASME Sec II Part D)
const MAT_ASME = {
  'ST37':    {S:120, Sy:235, E:210000, name:'ST37'},
  'S235JR':  {S:125, Sy:235, E:210000, name:'S235JR'},
  'A516-70': {S:138, Sy:260, E:200000, name:'A516 Gr70'},
  'Galvanized':{S:120, Sy:280, E:205000, name:'Galvanized'},
  'SS304':   {S:138, Sy:215, E:193000, name:'SS304'},
  'SS316':   {S:138, Sy:205, E:193000, name:'SS316'}
};
const MAT_MECH = MAT_ASME;

const PIPE_OD = {
  'galv_3_4':26.67,'galv_1':33.40,'galv_1_1_4':42.16,'galv_1_1_2':48.26,
  'galv_2':60.33,'galv_2_1_2':73.03,'galv_3':88.90,'galv_4':114.30,
  'SS304_3_4':26.67,'SS304_1':33.40,'SS304_1_1_4':42.16,'SS304_1_1_2':48.26,
  'SS304_2':60.33,'SS304_2_1_2':73.03,'SS304_3':88.90,'SS304_4':114.30,
  'SS309_3_4':26.67,'SS309_1':33.40,'SS309_1_1_4':42.16,'SS309_1_1_2':48.26,
  'SS309_2':60.33,'SS309_2_1_2':73.03,'SS309_3':88.90,'SS309_4':114.30,
  'copper_3_4':22.23,'copper_1':28.58,'copper_1_1_4':34.93
};

/* ============ فرمول‌ها ============ */
const cylVol = (D,H) => Math.PI/4 * D*D * H / 1e6;
const boxVol = (L,W,H) => L*W*H / 1e6;
const dishVT = D => 0.0809 * Math.pow(D,3) / 1e6;
const dishVE = D => Math.PI/24 * Math.pow(D,3) / 1e6;
const SQFT_PER_SQM = 10.7639;

function totalVol(D,H,head){
  let v = cylVol(D,H);
  if(head==='torisph') v += 2*dishVT(D);
  else if(head==='ellip') v += 2*dishVE(D);
  return v;
}
function diamFromV(V,H,head){
  const k = head==='torisph'?0.0809/1e6 : head==='ellip'?(Math.PI/24/1e6):0;
  let lo=10, hi=20000;
  for(let i=0;i<80;i++){
    const m=(lo+hi)/2;
    const f = 2*k*Math.pow(m,3) + (Math.PI*H/4)*m*m - V*1e6;
    if(f>0) hi=m; else lo=m;
  }
  return (lo+hi)/2;
}
function hFromV(V,D,head){
  let vh=0;
  if(head==='torisph') vh=2*dishVT(D);
  else if(head==='ellip') vh=2*dishVE(D);
  const vc = V-vh;
  if(vc<=0) return 0;
  return vc*1e6/(Math.PI/4*D*D);
}
function calcBoxDims(V, L_in, W_in, H_in){
  const Vmm3 = V * 1e6;
  const result = {L:0, W:0, H:0, mode:'', ratio:0};
  const haveL = L_in > 0, haveW = W_in > 0, haveH = H_in > 0;
  const known = (haveL?1:0) + (haveW?1:0) + (haveH?1:0);
  if(known === 0){
    // حالت هوشمند: نسبت 1:1:1.5
    const side = Math.cbrt(Vmm3 / 1.5);
    result.L = result.W = side;
    result.H = side * 1.5;
    result.mode = 'مکعب هوشمند (1:1:1.5)';
  } else if(known === 1){
    if(haveL){ result.L = L_in; result.W = Math.sqrt(Vmm3 / (1.5*L_in)); result.H = 1.5*result.W; result.mode = 'L معلوم'; }
    else if(haveW){ result.W = W_in; result.L = Math.sqrt(Vmm3 / (1.5*W_in)); result.H = 1.5*result.W; result.mode = 'W معلوم'; }
    else { result.H = H_in; result.L = result.W = Math.sqrt(Vmm3 / H_in); result.mode = 'H معلوم'; }
  } else if(known === 2){
    if(haveL && haveW){ result.L = L_in; result.W = W_in; result.H = Vmm3/(L_in*W_in); result.mode = 'L و W'; }
    else if(haveL && haveH){ result.L = L_in; result.H = H_in; result.W = Vmm3/(L_in*H_in); result.mode = 'L و H'; }
    else { result.W = W_in; result.H = H_in; result.L = Vmm3/(W_in*H_in); result.mode = 'W و H'; }
  } else {
    result.L = L_in; result.W = W_in; result.H = H_in;
    result.ratio = (L_in * W_in * H_in / 1e6) / V;
    result.mode = 'همه معلوم';
  }
  return result;
}
function calcBlank(D,h,L,t,type){
  let Db;
  if(type==='shallow'||type==='torisph') Db=Math.sqrt(D*D+4*D*h)+2*L;
  else if(type==='ellip') Db=Math.sqrt(D*D+4*h*h)+2*L;
  else if(type==='hemi') Db=1.414*D+2*L;
  else Db=Math.sqrt(D*D+4*D*h)+2*L;
  const A=Math.PI/4*Math.pow(Db/1000,2);
  return {Db, A, W:A*(t/1000)*7850, perim:Math.PI*Db};
}
/* سطح حرارتی: خروجی فوت مربع */
function calcThermalArea(branches, pipeSize){
  const L_m = (branches||0) * 6;
  const OD_mm = PIPE_OD[pipeSize] || 33.40;
  const area_m2 = Math.PI * (OD_mm/1000) * L_m;
  return { m2: area_m2, ft2: area_m2 * SQFT_PER_SQM };
}
function calcBoxShellWeight(f){
  const W_m = f.w/1000, H_m = f.h/1000, L_m = f.l/1000, t_m = f.t/1000;
  const bent_length = 2 * (W_m + L_m) + 0.06;
  const bent_area = bent_length * H_m;
  const end_area = 2 * (W_m * L_m);
  return (bent_area + end_area) * t_m * MAT_RHO[f.mat || 'ST37'];
}

/* ============ Springback ============ */
function calcSpringback(R_initial_mm, t_mm, mat){
  const m = MAT_MECH[mat] || MAT_MECH['ST37'];
  const R_final = R_initial_mm / (1 + (3 * m.Sy * R_initial_mm) / (m.E * t_mm));
  const springback_pct = (1 - R_final / R_initial_mm) * 100;
  return {R_final, springback_pct};
}

/* ============ Auto-save ============ */
function showAutoSaveBadge(){
  const badge = document.getElementById('autoSaveBadge');
  if(!badge) return;
  badge.classList.add('show');
  setTimeout(()=>badge.classList.remove('show'), 1200);
}
let autoSaveTimer = null;
function autoSave(){
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const data = {
      ts: Date.now(),
      v: {
        type: document.getElementById('v-type')?.value,
        d: document.getElementById('v-d')?.value,
        h: document.getElementById('v-h')?.value,
        l: document.getElementById('v-l')?.value,
        w: document.getElementById('v-w')?.value
      },
      dim: {
        v: document.getElementById('d-v')?.value,
        d: document.getElementById('d-d')?.value,
        h: document.getElementById('d-h')?.value
      },
      dim2: {
        d: document.getElementById('d2-d')?.value,
        h: document.getElementById('d2-h')?.value
      },
      coil: {
        Dtank: document.getElementById('coil-Dtank')?.value,
        Htank: document.getElementById('coil-Htank')?.value,
        Dcoil: document.getElementById('coil-Dcoil')?.value
      }
    };
    try {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
      showAutoSaveBadge();
    } catch(e) {}
  }, 1500);
}
function restoreAutoSave(){
  try {
    const s = localStorage.getItem(AUTO_SAVE_KEY);
    if(!s) return;
    const d = JSON.parse(s);
    const el = id => document.getElementById(id);
    const set = (id, v) => { if(el(id) && v != null && v !== '') el(id).value = v; };
    if(d.v){ set('v-type',d.v.type); set('v-d',d.v.d); set('v-h',d.v.h); set('v-l',d.v.l); set('v-w',d.v.w); }
    if(d.dim){ set('d-v',d.dim.v); set('d-d',d.dim.d); set('d-h',d.dim.h); }
    if(d.dim2){ set('d2-d',d.dim2.d); set('d2-h',d.dim2.h); }
  } catch(e) {}
}

/* ============ QR ============ */
function generateQRCode(containerId, text, tries){
  tries = tries || 0;
  const container = document.getElementById(containerId);
  if(!container) return;
  try {
    if(typeof qrcode !== 'function'){
      if(tries > 12){ container.innerHTML = '<div class="info-box orange">کتابخانهٔ QR در دسترس نیست (آفلاین).</div>'; return; }
      container.innerHTML = '<div class="info-box orange">QR در حال بارگذاری...</div>';
      setTimeout(()=>generateQRCode(containerId, text, tries+1), 400);
      return;
    }
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const svg = qr.createSvgTag({cellSize: 4, margin: 2});
    container.innerHTML = `<div class="qr-box">${svg}</div>`;
  } catch(e) {
    container.innerHTML = '<div class="info-box red">خطا: ' + e.message + '</div>';
  }
}

/* ============ SVG Export ============ */
function exportElementSVG(elementId, filename){
  const el = document.getElementById(elementId);
  if(!el) { alert('عنصر پیدا نشد'); return; }
  const svg = el.querySelector('svg');
  if(!svg) { alert('SVG پیدا نشد'); return; }
  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svgData], {type:'image/svg+xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (filename || 'schematic') + '_' + Date.now() + '.svg';
  a.click();
}

/* ============ DXF Export ============ */
function generateDXFContent(entities){
  let dxf = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n';
  dxf += '0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
  entities.forEach(e => {
    if(e.type === 'CIRCLE'){
      dxf += '0\nCIRCLE\n8\n' + (e.layer||'0') + '\n10\n' + e.cx.toFixed(4) + '\n20\n' + e.cy.toFixed(4) + '\n30\n0.0\n40\n' + e.r.toFixed(4) + '\n';
    } else if(e.type === 'LINE'){
      dxf += '0\nLINE\n8\n' + (e.layer||'0') + '\n10\n' + e.x1.toFixed(4) + '\n20\n' + e.y1.toFixed(4) + '\n30\n0.0\n11\n' + e.x2.toFixed(4) + '\n21\n' + e.y2.toFixed(4) + '\n31\n0.0\n';
    } else if(e.type === 'ARC'){
      dxf += '0\nARC\n8\n' + (e.layer||'0') + '\n10\n' + e.cx.toFixed(4) + '\n20\n' + e.cy.toFixed(4) + '\n30\n0.0\n40\n' + e.r.toFixed(4) + '\n50\n' + e.startAngle.toFixed(2) + '\n51\n' + e.endAngle.toFixed(2) + '\n';
    } else if(e.type === 'TEXT'){
      dxf += '0\nTEXT\n8\n' + (e.layer||'0') + '\n10\n' + e.x.toFixed(4) + '\n20\n' + e.y.toFixed(4) + '\n30\n0.0\n40\n' + (e.height||10) + '\n1\n' + e.text + '\n';
    }
  });
  dxf += '0\nENDSEC\n0\nEOF\n';
  return dxf;
}
function downloadDXF(entities, filename){
  const content = generateDXFContent(entities);
  const blob = new Blob([content], {type:'application/dxf'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (filename||'pattern') + '_' + Date.now() + '.dxf';
  a.click();
}

/* ============ SVG مخزن ============ */
function generateTankSVG(D, H, label){
  const scale = Math.min(240 / D, 180 / H);
  const dPx = D * scale;
  const hPx = H * scale;
  const x = 200 - dPx / 2;
  const y = 60;
  const dishH = Math.min(30, dPx * 0.15);
  const yBottomDish = y + dishH + hPx + dishH;
  const totalH = yBottomDish + 20;
  return `<svg viewBox="0 0 400 ${totalH}" style="max-width:400px;width:100%;height:auto">
    <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3F3A32"/></marker></defs>
    <path d="M${x} ${y+dishH} Q200 ${y-dishH*0.3} ${x+dPx} ${y+dishH}" fill="#D4C8B0" stroke="#3F3A32" stroke-width="1.5"/>
    <rect x="${x}" y="${y+dishH}" width="${dPx}" height="${hPx}" fill="#F5EFE0" stroke="#3F3A32" stroke-width="2"/>
    <path d="M${x} ${y+dishH+hPx} Q200 ${y+dishH+hPx+dishH*1.3} ${x+dPx} ${y+dishH+hPx}" fill="#D4C8B0" stroke="#3F3A32" stroke-width="1.5"/>
    <line x1="${x}" y1="${yBottomDish + 8}" x2="${x+dPx}" y2="${yBottomDish + 8}" stroke="#3F3A32" stroke-width="1.2" marker-start="url(#arr)" marker-end="url(#arr)"/>
    <text x="200" y="${yBottomDish + 24}" text-anchor="middle" font-family="Courier New" font-size="15" font-weight="900" fill="#E85D04">D = ${Math.round(D)} mm</text>
    <line x1="${x - 20}" y1="${y+dishH}" x2="${x - 20}" y2="${y+dishH+hPx}" stroke="#3F3A32" stroke-width="1.2" marker-start="url(#arr)" marker-end="url(#arr)"/>
    <text x="${x - 30}" y="${y+dishH+hPx/2}" text-anchor="middle" font-family="Courier New" font-size="15" font-weight="900" fill="#E85D04" transform="rotate(-90 ${x - 30} ${y+dishH+hPx/2})">H = ${Math.round(H)} mm</text>
    <text x="200" y="20" text-anchor="middle" font-family="Tahoma" font-size="13" font-weight="800" fill="#1F1A12">${label || ''}</text>
  </svg>`;
}

function generateBoxSVG(L, W, H, label){
  const scale = Math.min(200 / L, 160 / H);
  const lPx = L * scale;
  const hPx = H * scale;
  const wOffset = W * scale * 0.4;
  const x = 100;
  const y = 60;
  return `<svg viewBox="0 0 400 300" style="max-width:400px;width:100%;height:auto">
    <defs><marker id="arr2" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3F3A32"/></marker></defs>
    <rect x="${x + wOffset}" y="${y - wOffset}" width="${lPx}" height="${hPx}" fill="#E5DBC4" stroke="#3F3A32" stroke-width="1.5"/>
    <path d="M${x} ${y} L${x + wOffset} ${y - wOffset} L${x + wOffset + lPx} ${y - wOffset} L${x + lPx} ${y} Z" fill="#D4C8B0" stroke="#3F3A32" stroke-width="1.5"/>
    <path d="M${x + lPx} ${y} L${x + wOffset + lPx} ${y - wOffset} L${x + wOffset + lPx} ${y - wOffset + hPx} L${x + lPx} ${y + hPx} Z" fill="#C4B8A0" stroke="#3F3A32" stroke-width="1.5"/>
    <rect x="${x}" y="${y}" width="${lPx}" height="${hPx}" fill="#F5EFE0" stroke="#3F3A32" stroke-width="2"/>
    <text x="${x + lPx/2}" y="${y + hPx + 38}" text-anchor="middle" font-family="Courier New" font-size="14" font-weight="900" fill="#E85D04">L = ${Math.round(L)} mm</text>
    <text x="${x - 30}" y="${y + hPx/2}" text-anchor="middle" font-family="Courier New" font-size="14" font-weight="900" fill="#E85D04" transform="rotate(-90 ${x - 30} ${y + hPx/2})">H = ${Math.round(H)} mm</text>
    <text x="${x + lPx + 40}" y="${y + hPx/2 - wOffset/2 - 5}" text-anchor="middle" font-family="Courier New" font-size="12" font-weight="900" fill="#E85D04">W = ${Math.round(W)}</text>
    <text x="200" y="20" text-anchor="middle" font-family="Tahoma" font-size="13" font-weight="800" fill="#1F1A12">${label || ''}</text>
  </svg>`;
}

/* ============ شماتیک کویل پیشرفته ============ */
function drawCoilSVG(Dtank, Htank, dishH, Dcoil, coilHeight, OD, turns, pitch, clear, fits, starts=1, type='helical'){
  const vbW = 800, vbH = 720;
  const totalTankH = Htank + 2 * dishH;
  const scale = Math.min(500 / totalTankH, 400 / Dtank, 0.42);
  const DtankPx = Dtank * scale;
  const HtankPx = Htank * scale;
  const dishHPx = Math.max(20, dishH * scale);
  const DcoilPx = Dcoil * scale;
  const coilHPx = Math.max(40, coilHeight * scale);
  const clearPx = clear * scale;
  const cx = vbW / 2;
  const topDishTopY = 80;
  const weldTopY = topDishTopY + dishHPx;
  const weldBottomY = weldTopY + HtankPx;
  const bottomDishBottomY = weldBottomY + dishHPx;
  const tankLeft = cx - DtankPx / 2;
  const tankRight = cx + DtankPx / 2;
  const coilCx = cx;
  const coilR = DcoilPx / 2;
  const coilTopY = weldTopY + clearPx;
  const coilBottomY = coilTopY + coilHPx;
  const strokeW = Math.max(4, OD * scale * 1.2);
  const tiltA = DcoilPx * 0.15;
  const coilColor = fits ? '#FF6B1A' : '#EF4444';
  const coilColorDark = fits ? '#E04E00' : '#B91C1C';
  const coilColorLight = fits ? '#FFB380' : '#FCA5A5';

  let svg = `<svg viewBox="0 0 ${vbW} ${vbH}" width="100%" style="max-width:${vbW}px">`;
  svg += `<defs>
    <linearGradient id="coilGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${coilColorLight}"/>
      <stop offset="50%" stop-color="${coilColor}"/>
      <stop offset="100%" stop-color="${coilColorDark}"/>
    </linearGradient>
  </defs>`;

  // مخزن
  svg += `<path d="M${tankLeft} ${weldTopY} Q${cx} ${topDishTopY - dishHPx * 0.3} ${tankRight} ${weldTopY}" fill="#F5EFE0" stroke="#3F3A32" stroke-width="2"/>`;
  svg += `<rect x="${tankLeft}" y="${weldTopY}" width="${DtankPx}" height="${HtankPx}" fill="#FAF6EB" stroke="#3F3A32" stroke-width="2"/>`;
  svg += `<path d="M${tankLeft} ${weldBottomY} Q${cx} ${bottomDishBottomY + dishHPx * 0.3} ${tankRight} ${weldBottomY}" fill="#F5EFE0" stroke="#3F3A32" stroke-width="2"/>`;
  svg += `<line x1="${tankLeft}" y1="${weldTopY}" x2="${tankRight}" y2="${weldTopY}" stroke="#FF6B1A" stroke-width="2.5" stroke-dasharray="8 4"/>`;
  svg += `<line x1="${tankLeft}" y1="${weldBottomY}" x2="${tankRight}" y2="${weldBottomY}" stroke="#FF6B1A" stroke-width="2.5" stroke-dasharray="8 4"/>`;

  // فاصله‌ها
  svg += `<line x1="${tankRight - 20}" y1="${weldTopY}" x2="${tankRight - 20}" y2="${coilTopY}" stroke="#3B82F6" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  svg += `<text x="${tankRight - 30}" y="${(weldTopY + coilTopY) / 2 + 4}" text-anchor="middle" font-family="Courier New" font-size="10" font-weight="900" fill="#3B82F6">${clear}mm</text>`;
  svg += `<line x1="${tankRight - 20}" y1="${coilBottomY}" x2="${tankRight - 20}" y2="${weldBottomY}" stroke="#3B82F6" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  svg += `<text x="${tankRight - 30}" y="${(coilBottomY + weldBottomY) / 2 + 4}" text-anchor="middle" font-family="Courier New" font-size="10" font-weight="900" fill="#3B82F6">${clear}mm</text>`;

  // کویل
  const segmentsPerTurn = 64;
  const totalSegments = Math.max(segmentsPerTurn, Math.ceil(turns * segmentsPerTurn));
  const points = [];
  for(let i = 0; i <= totalSegments; i++){
    const t = (i/totalSegments) * turns;
    if(t > turns) break;
    const angle = 2 * Math.PI * t * starts;
    const x = coilCx + coilR * Math.cos(angle);
    const yBase = coilTopY + (t / turns) * coilHPx;
    const y = yBase + tiltA * Math.sin(angle);
    const depth = Math.sin(angle);
    points.push({x, y, depth, t});
  }
  // پشت‌ها
  for(let i = 0; i < points.length - 1; i++){
    const p1 = points[i], p2 = points[i+1];
    if(p1.depth < 0.1 && p2.depth < 0.1) continue;
    if(p1.depth < -0.1 || p2.depth < -0.1) continue;
    const avgDepth = (p1.depth + p2.depth) / 2;
    const width = strokeW * (0.5 + 0.3 * avgDepth);
    svg += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${coilColorDark}" stroke-width="${width.toFixed(1)}" stroke-linecap="round" opacity="0.6"/>`;
  }
  // جلوها
  for(let i = 0; i < points.length - 1; i++){
    const p1 = points[i], p2 = points[i+1];
    if(p1.depth > -0.1 && p2.depth > -0.1) continue;
    if(p1.depth > 0.1 || p2.depth > 0.1) continue;
    const avgDepth = (p1.depth + p2.depth) / 2;
    const width = strokeW * (0.9 + 0.25 * -avgDepth);
    svg += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="url(#coilGrad)" stroke-width="${width.toFixed(1)}" stroke-linecap="round"/>`;
    svg += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#fff" stroke-width="${(width*0.25).toFixed(1)}" stroke-linecap="round" opacity="0.4"/>`;
  }
  // ورودی/خروجی
  if(points.length > 0){
    const inlet = points[0];
    svg += `<circle cx="${inlet.x.toFixed(1)}" cy="${inlet.y.toFixed(1)}" r="${(strokeW * 0.9).toFixed(1)}" fill="${coilColor}" stroke="#fff" stroke-width="2"/>`;
    svg += `<text x="${inlet.x + 15}" y="${inlet.y - 5}" font-family="Tahoma" font-size="11" font-weight="800" fill="${coilColor}">ورودی</text>`;
    const outlet = points[points.length - 1];
    svg += `<circle cx="${outlet.x.toFixed(1)}" cy="${outlet.y.toFixed(1)}" r="${(strokeW * 0.9).toFixed(1)}" fill="${coilColor}" stroke="#fff" stroke-width="2"/>`;
    svg += `<text x="${outlet.x + 15}" y="${outlet.y + 15}" font-family="Tahoma" font-size="11" font-weight="800" fill="${coilColor}">خروجی</text>`;
  }
  // فلش ارتفاع
  const arrowX = tankLeft - 45;
  svg += `<line x1="${arrowX}" y1="${coilTopY}" x2="${arrowX}" y2="${coilBottomY}" stroke="#1F1A12" stroke-width="1.5"/>`;
  svg += `<polygon points="${arrowX},${coilTopY} ${arrowX-5},${coilTopY+10} ${arrowX+5},${coilTopY+10}" fill="#1F1A12"/>`;
  svg += `<polygon points="${arrowX},${coilBottomY} ${arrowX-5},${coilBottomY-10} ${arrowX+5},${coilBottomY-10}" fill="#1F1A12"/>`;
  svg += `<text x="${arrowX - 15}" y="${(coilTopY + coilBottomY) / 2}" font-family="Courier New" font-size="13" font-weight="900" fill="#1F1A12" transform="rotate(-90 ${arrowX - 15} ${(coilTopY + coilBottomY) / 2})" text-anchor="middle">H = ${coilHeight.toFixed(0)} mm</text>`;

  // عنوان
  svg += `<text x="${cx}" y="30" text-anchor="middle" font-family="Tahoma" font-size="15" font-weight="800" fill="#1F1A12">کویل ${turns.toFixed(1)} دور × قطر ${Dcoil} mm — ${fits ? '✅ جا می‌شود' : '⚠️ جا نمی‌شود'}</text>`;

  const arrowXTank = tankRight + 60;
  svg += `<line x1="${arrowXTank}" y1="${topDishTopY}" x2="${arrowXTank}" y2="${bottomDishBottomY}" stroke="#3F3A32" stroke-width="1.2"/>`;
  svg += `<polygon points="${arrowXTank},${topDishTopY} ${arrowXTank-4},${topDishTopY+8} ${arrowXTank+4},${topDishTopY+8}" fill="#3F3A32"/>`;
  svg += `<polygon points="${arrowXTank},${bottomDishBottomY} ${arrowXTank-4},${bottomDishBottomY-8} ${arrowXTank+4},${bottomDishBottomY-8}" fill="#3F3A32"/>`;
  svg += `<text x="${arrowXTank + 15}" y="${(topDishTopY + bottomDishBottomY) / 2}" font-family="Courier New" font-size="12" font-weight="900" fill="#3F3A32" transform="rotate(90 ${arrowXTank + 15} ${(topDishTopY + bottomDishBottomY) / 2})" text-anchor="middle">H_total = ${Htank + 2*dishH} mm</text>`;
  svg += '</svg>';
  return svg;
}

/* ============ Segmented Head SVG ============ */
function drawSegmentedHeadSVG(D, h, n, Db){
  const scale = 300 / Db;
  const R = (Db/2) * scale;
  const cx = 250, cy = 220;
  let svg = `<svg viewBox="0 0 500 480" style="max-width:500px;width:100%;height:auto">`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#7C3AED" stroke-width="1" stroke-dasharray="5 3" opacity="0.5"/>`;
  for(let i = 0; i < n; i++){
    const startAngle = (i * 360 / n - 90) * Math.PI / 180;
    const endAngle = ((i + 1) * 360 / n - 90) * Math.PI / 180;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const largeArc = (360 / n) > 180 ? 1 : 0;
    const path = `M${cx} ${cy} L${x1} ${y1} A${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const hue = (i * 360 / n);
    svg += `<path d="${path}" fill="hsla(${hue}, 65%, 75%, 0.55)" stroke="hsl(${hue}, 55%, 45%)" stroke-width="2"/>`;
    const midAngle = (startAngle + endAngle) / 2;
    svg += `<text x="${cx + R * 0.65 * Math.cos(midAngle)}" y="${cy + R * 0.65 * Math.sin(midAngle)}" text-anchor="middle" font-family="Courier New" font-size="16" font-weight="900" fill="hsl(${hue}, 55%, 45%)">${i+1}</text>`;
  }
  svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="#3F3A32"/>`;
  svg += `<text x="250" y="30" text-anchor="middle" font-family="Tahoma" font-size="15" font-weight="800" fill="#1F1A12">عدسی قاچ‌قاچ — ${n} قاچ</text>`;
  svg += `<text x="250" y="50" text-anchor="middle" font-family="Tahoma" font-size="12" font-weight="700" fill="#7A6D57">قطر داخلی: ${D}mm — گسترده: ${Math.round(Db)}mm</text>`;
  svg += '</svg>';
  return svg;
}

/* ============ تعریف تجهیزات (Weight Parts) ============ */
const EQUIPMENT_DEFS = {
  spiral:        {name:'منبع اسپیرال',    svg:'tank',  parts:['shell','head','manhole','ladder','base','base_pad']},
  u_coil:        {name:'منبع کوئلی U',    svg:'tank',  parts:['shell','head','manhole','base','base_pad']},
  softener:      {name:'سختی‌گیر',        svg:'tank',  parts:['shell','head','manhole','ladder','base','base_pad']},
  sand_filter:   {name:'فیلتر شنی',       svg:'tank',  parts:['shell','head','manhole','ladder','base','base_pad']},
  deaerator:     {name:'دی‌اریتور',       svg:'tower', parts:['shell','head','tower_shell','tower_head','tray','manhole','ladder','base','base_pad']},
  expansion_closed:{name:'منبع انبساط بسته',svg:'tank',parts:['shell','head','manhole','base','base_pad']},
  expansion_open:{name:'منبع انبساط باز', svg:'box',   parts:['box_shell','base']},
  condensate:    {name:'مخزن کندانس',     svg:'tank',  parts:['shell','head','manhole','base','base_pad']}
};

/* قطعات اختصاصی قیمت‌گذاری — بر اساس تجهیز */
const COST_PARTS_BY_EQ = {
  spiral:          ['coil_pipe','cathode','flange','bushing','nozzle'],
  u_coil:          ['utube','cathode','flange','bushing','nozzle'],
  softener:        ['resin','control_valve','internal_piping'],
  sand_filter:     ['internal_piping','nozzle'],
  deaerator:       ['flange','bushing'],
  expansion_closed:['flange','diaphragm'],
  expansion_open:  [],
  condensate:      ['internal_piping']
};

/* همه قطعات قیمت ممکن (برای reference) */
const COST_ONLY_PARTS = ['flange','bushing','nozzle','cathode','resin','control_valve','diaphragm','coil_pipe','utube','internal_piping'];

/* ============ تعریف اجزا ============ */
const PART_DEFS = {
  shell:{name:'پوسته استوانه',icon:'tank',color:'orange',type:'structural',defOn:true,fields:[
    {id:'d',label:'قطر داخلی (mm)',def:1600},{id:'h',label:'ارتفاع (mm)',def:3000},
    {id:'t',label:'ضخامت (mm)',def:6},
    {id:'mat',label:'جنس',type:'select',options:[['ST37','ST37'],['S235JR','S235JR'],['A516-70','A516 Gr70'],['Galvanized','گالوانیزه'],['SS304','استیل ۳۰۴'],['SS316','استیل ۳۱۶']],def:'ST37'}]},
  head:{name:'عدسی‌ها',icon:'head',color:'violet',type:'structural',defOn:true,fields:[
    {id:'d',label:'قطر داخلی (mm)',def:1600},{id:'h',label:'گودی (mm)',def:107},
    {id:'l',label:'طول لبه (mm)',def:40},{id:'t',label:'ضخامت (mm)',def:8},
    {id:'htype',label:'نوع عدسی',type:'select',options:[['shallow','کم‌عمق'],['torisph','تورسفریکال'],['ellip','بیضوی'],['hemi','نیم‌کره']],def:'shallow'},
    {id:'mat',label:'جنس',type:'select',options:[['ST37','ST37'],['S235JR','S235JR'],['A516-70','A516 Gr70'],['Galvanized','گالوانیزه'],['SS304','استیل ۳۰۴']],def:'ST37'},
    {id:'n',label:'تعداد',def:2}]},
  coil_pipe:{name:'کویل مارپیچ (قیمت)',icon:'coil',color:'blue',type:'cost_only',defOn:true,costOnly:true,fields:[
    {id:'size',label:'سایز لوله',type:'select',options:[
      ['galv_3_4','گالوانیزه ۳/۴'],['galv_1','گالوانیزه ۱'],['galv_1_1_4','گالوانیزه ۱ ۱/۴'],
      ['galv_1_1_2','گالوانیزه ۱ ۱/۲'],['galv_2','گالوانیزه ۲'],['galv_2_1_2','گالوانیزه ۲ ۱/۲'],
      ['galv_3','گالوانیزه ۳'],['galv_4','گالوانیزه ۴'],
      ['SS304_3_4','استیل ۳۰۴ ۳/۴'],['SS304_1','استیل ۳۰۴ ۱'],['SS304_1_1_4','استیل ۳۰۴ ۱ ۱/۴'],
      ['SS304_1_1_2','استیل ۳۰۴ ۱ ۱/۲'],['SS304_2','استیل ۳۰۴ ۲'],['SS304_2_1_2','استیل ۳۰۴ ۲ ۱/۲'],
      ['SS304_3','استیل ۳۰۴ ۳'],['SS304_4','استیل ۳۰۴ ۴']
    ],def:'SS304_1'},
    {id:'branches',label:'مقدار مصرف (شاخه ۶۰۰cm)',def:2.5,hint:'2.5 شاخه = 15 متر'},
    {id:'thermal',label:'سطح حرارتی (ft²) — خودکار',def:0,autoCalc:true}]},
  utube:{name:'کویل U شکل (قیمت)',icon:'utube',color:'blue',type:'cost_only',defOn:true,costOnly:true,fields:[
    {id:'mat',label:'جنس',type:'select',options:[['copper','مس'],['SS304','استیل ۳۰۴'],['SS309','استیل ۳۰۹']],def:'copper'},
    {id:'size',label:'سایز لوله',type:'select',options:[
      ['copper_3_4','مسی ۳/۴'],['copper_1','مسی ۱'],
      ['SS304_3_4','استیل ۳۰۴ ۳/۴'],['SS304_1','استیل ۳۰۴ ۱'],
      ['SS304_1_1_2','استیل ۳۰۴ ۱ ۱/۲'],['SS304_2','استیل ۳۰۴ ۲'],
      ['SS309_3_4','استیل ۳۰۹ ۳/۴'],['SS309_1','استیل ۳۰۹ ۱'],
      ['SS309_1_1_2','استیل ۳۰۹ ۱ ۱/۲'],['SS309_2','استیل ۳۰۹ ۲']
    ],def:'copper_1'},
    {id:'t',label:'ضخامت داخلی لوله (mm)',def:1.5},
    {id:'n',label:'تعداد لوله U',def:4},
    {id:'len',label:'طول هر لوله (mm)',def:6000},
    {id:'thermal',label:'سطح حرارتی (ft²)',def:0,autoCalcU:true}]},
  manhole:{name:'منهول',icon:'manhole',color:'yellow',type:'structural',defOn:true,fields:[
    {id:'size',label:'سایز',type:'select',options:[['16','۱۶ اینچ'],['18','۱۸ اینچ'],['20','۲۰ اینچ']],def:'16'},
    {id:'w',label:'عرض (mm)',def:400},{id:'h',label:'ارتفاع (mm)',def:500},
    {id:'t',label:'ضخامت — خودکار (12 یا 15)',def:0,autoManholeThickness:true},
    {id:'n',label:'تعداد',def:1}]},
  ladder:{name:'نردبان',icon:'ladder',color:'green',type:'quantity',defOn:true,fields:[
    {id:'pipe',label:'سایز قوطی',type:'select',options:[['pipe_30x30','۳۰×۳۰'],['pipe_40x40','۴۰×۴۰'],['pipe_50x50','۵۰×۵۰']],def:'pipe_40x40'},
    {id:'branches',label:'مقدار مصرف (شاخه ۶۰۰cm)',def:1.5,hint:'1.5 شاخه = 9 متر'}]},
  base:{name:'پایه (ابعادی)',icon:'base',color:'green',type:'structural',defOn:true,fields:[
    {id:'n',label:'تعداد',def:2},{id:'l',label:'طول (mm)',def:1200},
    {id:'w',label:'عرض (mm)',def:400},{id:'h',label:'ارتفاع (mm)',def:500},
    {id:'t',label:'ضخامت (mm) — حداکثر ۸',def:8,maxVal:8}]},
  base_pad:{name:'پد پایه',icon:'pad',color:'green',type:'structural',defOn:true,fields:[
    {id:'n',label:'تعداد',def:2},{id:'l',label:'طول (mm)',def:500},
    {id:'w',label:'عرض (mm)',def:300},{id:'t',label:'ضخامت (mm)',def:8}]},
  internal_piping:{name:'لوله‌کشی داخلی (قیمت)',icon:'pipeIn',color:'blue',type:'cost_only',defOn:true,costOnly:true,fields:[
    {id:'size',label:'سایز',type:'select',options:[
      ['galv_1','گالوانیزه ۱'],['galv_1_1_2','گالوانیزه ۱ ۱/۲'],['galv_2','گالوانیزه ۲']
    ],def:'galv_1_1_2'},
    {id:'length_cm',label:'طول کل (cm)',def:250,hint:'فقط قیمت — بدون وزن'}]},
  tower_shell:{name:'پوسته برج',icon:'tower',color:'violet',type:'structural',defOn:true,fields:[
    {id:'d',label:'قطر برج (mm)',def:800},{id:'h',label:'ارتفاع برج (mm)',def:2500},
    {id:'t',label:'ضخامت (mm)',def:4},
    {id:'mat',label:'جنس',type:'select',options:[['SS304','استیل ۳۰۴'],['SS316','استیل ۳۱۶']],def:'SS304'}]},
  tower_head:{name:'عدسی برج',icon:'head',color:'violet',type:'structural',defOn:true,fields:[
    {id:'d',label:'قطر (mm)',def:800},{id:'t',label:'ضخامت (mm)',def:5},
    {id:'mat',label:'جنس',type:'select',options:[['SS304','استیل ۳۰۴'],['SS316','استیل ۳۱۶']],def:'SS304'}]},
  tray:{name:'سینی سوراخ‌دار',icon:'tray',color:'yellow',type:'structural',defOn:true,fields:[
    {id:'n',label:'تعداد سینی',def:5},
    {id:'l',label:'طول سینی (mm)',def:600},
    {id:'w',label:'عرض سینی (mm)',def:600},
    {id:'t',label:'ضخامت (mm)',def:3}]},
  box_shell:{name:'بدنه مکعبی',icon:'box',color:'orange',type:'structural',defOn:true,fields:[
    {id:'l',label:'طول (mm)',def:1000},{id:'w',label:'عرض (mm)',def:1000},{id:'h',label:'ارتفاع (mm)',def:1000},
    {id:'t',label:'ضخامت (mm)',def:4},
    {id:'mat',label:'جنس',type:'select',options:[['ST37','ST37'],['Galvanized','گالوانیزه']],def:'ST37'}]},
  cathode:{name:'حفاظت کاتدی (قیمت)',icon:'cathode',color:'orange',type:'cost_only',defOn:true,costOnly:true,fields:[
    {id:'type',label:'نوع آند',type:'select',options:[['zn','آند روی'],['al','آند آلومینیوم'],['mg','آند منیزیم']],def:'zn'},
    {id:'n',label:'تعداد',def:2}]},
  resin:{name:'رزین (قیمت)',icon:'resin',color:'green',type:'cost_only',defOn:true,costOnly:true,fields:[
    {id:'d',label:'قطر بستر (mm)',def:1000},{id:'h',label:'ارتفاع بستر (mm)',def:1200},
    {id:'fill',label:'ضریب',def:0.6}]},
  control_valve:{name:'شیر کنترل (قیمت)',icon:'valve',color:'orange',type:'cost_only',defOn:true,costOnly:true,fields:[
    {id:'type',label:'نوع',type:'select',options:[['auto','اتوماتیک'],['semi','نیمه اتوماتیک'],['manual','دستی']],def:'auto'}]},
  diaphragm:{name:'دیافراگم (قیمت)',icon:'diaphragm',color:'violet',type:'cost_only',defOn:true,costOnly:true,fields:[
    {id:'d',label:'قطر (mm)',def:600},
    {id:'type',label:'نوع',type:'select',options:[['butyl','بوتیل'],['epdm','EPDM']],def:'butyl'}]},
  flange:{name:'فلنج (قیمت)',icon:'flange',color:'blue',type:'cost_only',defOn:false,costOnly:true,fields:[
    {id:'size',label:'سایز',type:'select',options:[['flange_1','۱'],['flange_1_1_2','۱ ۱/۲'],['flange_2','۲'],['flange_3','۳'],['flange_4','۴'],['flange_6','۶'],['flange_8','۸']],def:'flange_2'},
    {id:'n',label:'تعداد',def:4}]},
  bushing:{name:'بوشن (قیمت)',icon:'nozzle',color:'blue',type:'cost_only',defOn:false,costOnly:true,fields:[
    {id:'size',label:'سایز',type:'select',options:[['bush_1','۱'],['bush_1_1_2','۱ ۱/۲'],['bush_2','۲'],['bush_3','۳'],['bush_4','۴']],def:'bush_2'},
    {id:'n',label:'تعداد',def:4}]},
  nozzle:{name:'نازل (قیمت)',icon:'nozzle',color:'blue',type:'cost_only',defOn:false,costOnly:true,fields:[
    {id:'size',label:'سایز',type:'select',options:[['1','۱'],['1_1_2','۱ ۱/۲'],['2','۲'],['3','۳'],['4','۴']],def:'2'},
    {id:'n',label:'تعداد',def:4}]}
};

/* ============ State ============ */
const EQ_STATE = {weight:{}, cost:{}};

function initEqState(mode){
  const eqId = mode==='weight'?'w-eq':'c-eq';
  const eqEl = document.getElementById(eqId);
  if(!eqEl) return;
  const eq = eqEl.value;
  const def = EQUIPMENT_DEFS[eq];
  if(!def) return;
  Object.keys(EQ_STATE[mode]).forEach(k => {
    if(k !== eq && k !== '_lastResult') delete EQ_STATE[mode][k];
  });
  if(!EQ_STATE[mode][eq]){
    EQ_STATE[mode][eq] = {};
    let partsList = [...def.parts];
    if(mode === 'cost'){
      partsList = partsList.concat(COST_PARTS_BY_EQ[eq] || []);
    }
    partsList.forEach(p => {
      const pd = PART_DEFS[p];
      if(!pd) return;
      if(mode==='weight' && pd.costOnly) return;
      const fields = {};
      pd.fields.forEach(f=>{
        if(f.type==='select' && f.options){
          fields[f.id] = Array.isArray(f.options[0]) ? f.options[0][0] : f.options[0];
        } else fields[f.id] = f.def;
      });
      EQ_STATE[mode][eq][p] = {on: pd.defOn, fields};
    });
  }
}

/* ============ Load Equipment ============ */
function loadEquipment(mode){
  try{
    initEqState(mode);
    const eqId = mode==='weight'?'w-eq':'c-eq';
    const containerId = mode==='weight'?'w-components':'c-components';
    const headerId = mode==='weight'?'w-eq-header':'c-eq-header';
    const eq = document.getElementById(eqId).value;
    const def = EQUIPMENT_DEFS[eq];
    if(!def) return;
    const container = document.getElementById(containerId);
    const headerEl = document.getElementById(headerId);
    const state = EQ_STATE[mode][eq];
    const activeCount = Object.values(state).filter(x=>x.on).length;

    headerEl.innerHTML = `<div class="eq-header">
      <div class="eq-icon">${SVG_ICONS[def.svg]||SVG_ICONS.tank}</div>
      <div class="eq-info">
        <h3>${def.name}</h3>
        <p>${Object.keys(state).length} جزء — ${activeCount} فعال</p>
        <span class="badge">${mode==='weight'?'⚖️ وزن‌دهی':'💰 قیمت‌گذاری'}</span>
      </div>
    </div>`;

    let partsList = mode==='cost' 
      ? [...def.parts, ...(COST_PARTS_BY_EQ[eq] || [])]
      : [...def.parts];

    let html = '';
    partsList.forEach(pid=>{
      const pd = PART_DEFS[pid];
      if(!pd) return;
      if(mode==='weight' && pd.costOnly) return;
      const st = state[pid];
      if(!st) return;
      const colorClass = pd.color ? ' ' + pd.color : '';
      html += `<div class="comp${colorClass}${st.on?' on':''}" data-mode="${mode}" data-pid="${pid}">
        <div class="comp-head" onclick="toggleComp('${mode}','${eq}','${pid}')">
          <div class="comp-icon">${SVG_ICONS[pd.icon]||SVG_ICONS.tank}</div>
          <span class="comp-title">${pd.name}${pd.costOnly?' <span style="font-size:10px;color:var(--accent-2-c)">(قیمت)</span>':''}</span>
          <span class="comp-badge ${mode==='weight'?'weight':'cost'}" id="badge-${mode}-${pid}"></span>
          <div class="comp-toggle"></div>
        </div>
        <div class="comp-body">${renderFields(mode, eq, pid, pd, st)}</div>
      </div>`;
    });
    container.innerHTML = html;
  }catch(e){ console.error('loadEquipment:', e); }
}

function renderFields(mode, eq, pid, pd, st){
  const fields = pd.fields||[];
  if(fields.length === 0) return '<div class="fld-hint">بدون پارامتر</div>';
  let html = '<div class="grid-2">';
  fields.forEach(f=>{
    const v = st.fields[f.id];
    if(f.type==='select'){
      let opts = '';
      f.options.forEach(o=>{
        const [val, label] = Array.isArray(o)? o : [o,o];
        opts += `<option value="${val}" ${v==val?'selected':''}>${label}</option>`;
      });
      html += `<div class="fld"><label>${f.label}</label>
        <select onchange="updateField('${mode}','${eq}','${pid}','${f.id}',this.value)">${opts}</select>
        ${f.hint?`<span class="fld-hint">${f.hint}</span>`:''}</div>`;
    } else if(f.autoCalc){
      const branches = st.fields.branches || 0;
      const pipeSize = st.fields.size || 'SS304_1';
      const area = calcThermalArea(branches, pipeSize);
      html += `<div class="fld"><label>${f.label}</label>
        <input type="text" value="${area.ft2.toFixed(2)}" readonly style="color:var(--ok-2);background:color-mix(in srgb,var(--ok) 10%, transparent);border-color:color-mix(in srgb,var(--ok) 40%, transparent)">
        <span class="fld-hint"><b>Auto:</b> ${area.m2.toFixed(2)} m² = ${area.ft2.toFixed(2)} ft²</span></div>`;
    } else if(f.autoCalcU){
      const n = st.fields.n || 0;
      const lenMm = st.fields.len || 0;
      const pipeSize = st.fields.size || 'copper_1';
      const L_m = (lenMm/1000) * n;
      const OD_mm = PIPE_OD[pipeSize] || 28.58;
      const area_m2 = Math.PI * (OD_mm/1000) * L_m;
      const area_ft2 = area_m2 * SQFT_PER_SQM;
      html += `<div class="fld"><label>${f.label}</label>
        <input type="text" value="${area_ft2.toFixed(2)}" readonly style="color:var(--ok-2);background:color-mix(in srgb,var(--ok) 10%, transparent);border-color:color-mix(in srgb,var(--ok) 40%, transparent)">
        <span class="fld-hint"><b>Auto:</b> ${area_m2.toFixed(2)} m² = ${area_ft2.toFixed(2)} ft²</span></div>`;
    } else if(f.autoManholeThickness){
      const eqState = EQ_STATE[mode][eq];
      let totalCap = 0;
      if(eqState && eqState.shell && eqState.shell.on){
        const sf = eqState.shell.fields;
        totalCap = totalFluidVol(sf.d, sf.h);
      }
      const size = st.fields.size || '16';
      const th = getAutoManholeThickness(size, totalCap);
      html += `<div class="fld"><label>${f.label}</label>
        <input type="text" value="${th} mm (auto)" readonly style="color:var(--warn-2);background:color-mix(in srgb,var(--warn) 12%, transparent);border-color:color-mix(in srgb,var(--warn) 40%, transparent)">
        <span class="fld-hint"><b>خودکار — ظرفیت ${fmt(totalCap,0)} L</b></span></div>`;
    } else if(f.maxVal){
      html += `<div class="fld"><label>${f.label}</label>
        <input type="number" step="any" value="${v}" max="${f.maxVal}" oninput="updateField('${mode}','${eq}','${pid}','${f.id}',Math.min(parseFloat(this.value)||0, ${f.maxVal}))">
        <span class="fld-hint"><b>حداکثر ${f.maxVal} mm</b></span></div>`;
    } else {
      const extra = (pid === 'head' && f.id === 'd') ? `<span class="fld-hint" id="head-suggest-hint"></span>` : '';
      html += `<div class="fld"><label>${f.label}</label>
        <input type="number" step="any" value="${v}" oninput="updateField('${mode}','${eq}','${pid}','${f.id}',parseFloat(this.value)||0)">
        ${f.hint?`<span class="fld-hint">${f.hint}</span>`:''}${extra}</div>`;
    }
  });
  html += '</div>';
  return html;
}

function totalFluidVol(D, H){
  if(!(D>0) || !(H>0)) return 0;
  return totalVol(D, H, 'torisph');
}

/* جدول جدید ضخامت منهول — فقط 12 یا 15 */
function getAutoManholeThickness(size, capacity){
  if(size === '16') return capacity >= 1500 ? 15 : 12;
  // 18" و 20"
  return 15;
}

function toggleComp(mode, eq, pid){
  const st = EQ_STATE[mode][eq][pid];
  st.on = !st.on;
  const card = document.querySelector(`.comp[data-mode="${mode}"][data-pid="${pid}"]`);
  if(card) card.classList.toggle('on', st.on);
  const out = document.getElementById(mode==='weight'?'w-result':'c-result');
  if(out) out.innerHTML = '';
}

function updateField(mode, eq, pid, fid, value){
  EQ_STATE[mode][eq][pid].fields[fid] = value;
  if(pid === 'coil_pipe' || pid === 'utube'){
    const st = EQ_STATE[mode][eq][pid];
    const pd = PART_DEFS[pid];
    const body = document.querySelector(`.comp[data-mode="${mode}"][data-pid="${pid}"] .comp-body`);
    if(body) body.innerHTML = renderFields(mode, eq, pid, pd, st);
  }
  if(pid === 'manhole' && fid === 'size'){
    const st = EQ_STATE[mode][eq].manhole;
    const pd = PART_DEFS.manhole;
    const body = document.querySelector(`.comp[data-mode="${mode}"][data-pid="manhole"] .comp-body`);
    if(body) body.innerHTML = renderFields(mode, eq, 'manhole', pd, st);
  }
  const out = document.getElementById(mode==='weight'?'w-result':'c-result');
  if(out) out.innerHTML = '';
  autoSave();
}

/* ============ Weight Calculation ============ */
function partWeight(part, f, eq){
  const pd = PART_DEFS[part];
  if(pd && pd.costOnly) return 0;
  switch(part){
    case 'shell': return Math.PI*(f.d/1000)*(f.h/1000)*(f.t/1000)*MAT_RHO[f.mat||'ST37'];
    case 'head': return calcBlank(f.d, f.h||f.d*0.15, f.l||40, f.t, f.htype||'shallow').W * (f.n||2);
    case 'base': {
      const t = Math.min(f.t, WORKSHOP.maxBaseThickness);
      const area = 2*(f.l/1000)*(f.h/1000) + (f.l/1000)*(f.w/1000);
      return area * (t/1000) * MAT_RHO['ST37'] * (f.n||2);
    }
    case 'base_pad': return (f.l/1000)*(f.w/1000)*(f.t/1000)*MAT_RHO['ST37'] * (f.n||2);
    case 'manhole': {
      const eqState = EQ_STATE.weight[eq] || EQ_STATE.cost[eq];
      let cap = 0;
      if(eqState && eqState.shell && eqState.shell.on){
        cap = totalFluidVol(eqState.shell.fields.d, eqState.shell.fields.h);
      }
      const autoT = getAutoManholeThickness(f.size, cap);
      const t = f.t > 0 ? f.t : autoT;
      const vol = (f.w/1000)*(f.h/1000)*(t/1000);
      const base = vol*MAT_RHO['A516-70'];
      const extra = f.size==='16'?80:f.size==='18'?100:120;
      return (base + extra) * (f.n||1);
    }
    case 'tower_shell': return Math.PI*(f.d/1000)*(f.h/1000)*(f.t/1000)*MAT_RHO[f.mat||'SS304'];
    case 'tower_head': return calcBlank(f.d, f.d*0.15, 30, f.t, 'shallow').W;
    case 'tray': return (f.n||5) * (f.l/1000)*(f.w/1000)*(f.t/1000)*MAT_RHO['SS304'];
    case 'box_shell': {
      // محاسبه حجم ورق: 2*(L*W + L*H + W*H) - باز بدون سقف
      const L_m = f.l/1000, W_m = f.w/1000, H_m = f.h/1000, t_m = f.t/1000;
      // بدون سقف: کف + 4 دیوار
      const area = (L_m*W_m) + 2*(L_m*H_m) + 2*(W_m*H_m);
      return area * t_m * MAT_RHO[f.mat || 'ST37'];
    }
    default: return 0;
  }
}
function partQuantity(part, f){
  switch(part){
    case 'ladder': return {qty:(f.branches||0)*6, unit:'m', label:'طول نردبان', extra:`${f.branches} شاخه`};
    default: return null;
  }
}
function estimateVolume(eq, state){
  if(state.shell && state.shell.on){
    const f = state.shell.fields;
    if(f.d>0 && f.h>0) return totalVol(f.d, f.h, 'torisph');
  }
  if(state.box_shell && state.box_shell.on){
    const f = state.box_shell.fields;
    return f.l*f.w*f.h/1e6;
  }
  return 0;
}
function calcWeight(){
  try{
    const eq = document.getElementById('w-eq').value;
    const def = EQUIPMENT_DEFS[eq];
    const state = EQ_STATE.weight[eq];
    const out = document.getElementById('w-result');
    if(!def || !state){ out.innerHTML = '<div class="info-box red"><b>Error</b></div>'; return; }

    let total = 0;
    const structural = [];
    const quantities = [];
    def.parts.forEach(pid=>{
      const st = state[pid];
      if(!st || !st.on) return;
      const pd = PART_DEFS[pid];
      if(!pd) return;
      if(pd.costOnly) return;
      const w = partWeight(pid, st.fields, eq);
      const q = partQuantity(pid, st.fields);
      if(w > 0){
        total += w;
        structural.push({pid, name: pd.name, w});
        const badge = document.getElementById(`badge-weight-${pid}`);
        if(badge) badge.textContent = fmt(w,1)+' kg';
      } else if(q){
        quantities.push({pid, name: pd.name, ...q});
        const badge = document.getElementById(`badge-weight-${pid}`);
        if(badge) badge.textContent = fmt(q.qty, 1) + ' ' + q.unit;
      }
    });

    const extras = total * 0.08;
    const grand = total + extras;
    const volume = estimateVolume(eq, state);
    const workingVol = volume * 0.85;

    let html = `<div class="res-summary">
      <div class="lbl">وزن سازه‌ای خالص</div>
      <div class="val">${fmt(grand,1)}</div>
      <div class="unit">kg (${fmt(grand/1000,3)} تن)</div>
    </div>`;

    if(structural.length){
      html += `<div class="info-box orange" style="margin-top:14px"><b>⚖️ وزن سازه‌ای</b>`;
      structural.forEach(d=>{
        html += `<div class="res-row"><span class="lbl">${d.name}</span><span class="val">${fmt(d.w,1)} kg</span></div>`;
      });
      html += `<div class="res-row"><span class="lbl">جوش، رنگ (۸٪)</span><span class="val">${fmt(extras,1)} kg</span></div>`;
      html += `<div class="res-row big" style="border-top:2px solid var(--line-soft);margin-top:6px;padding-top:12px">
        <span class="lbl"><b>مجموع وزن سازه</b></span>
        <span class="val" style="color:var(--accent-2)">${fmt(grand,1)} kg</span>
      </div></div>`;
    }
    if(quantities.length){
      html += `<div class="info-box" style="margin-top:14px"><b>📏 مقدار مصرفی</b>`;
      quantities.forEach(d=>{
        html += `<div class="res-row qty"><span class="lbl">${d.label}${d.extra?` (${d.extra})`:''}</span><span class="val">${fmt(d.qty, 1)} ${d.unit}</span></div>`;
      });
      html += `</div>`;
    }
    if(volume>0){
      html += `<div class="info-box green" style="margin-top:14px">
        <b>💧 حجم و وزن آب</b>
        <div class="res-row"><span class="lbl">حجم هندسی</span><span class="val">${fmt(volume,0)} L</span></div>
        <div class="res-row"><span class="lbl">حجم کاری (۸۵٪)</span><span class="val">${fmt(workingVol,0)} L</span></div>
        <div class="res-row big"><span class="lbl"><b>وزن پر از آب</b></span><span class="val" style="color:var(--ok-2)">${fmt(grand+volume,0)} kg</span></div>
      </div>`;
    }
    out.innerHTML = html;
    EQ_STATE.weight._lastResult = {eq, def, structural, quantities, extras, grand, volume, workingVol};
  }catch(e){
    console.error('calcWeight:', e);
    document.getElementById('w-result').innerHTML = '<div class="info-box red">Error: '+e.message+'</div>';
  }
}

/* ============ Cost ============ */
function findSheetPrice(mat, t){
  const keys = Object.keys(PRICES.sheets||{});
  const c = keys.filter(k=>k.startsWith(mat+'_'));
  if(!c.length) return 80000;
  let best=null;
  for(const k of c){
    const tk = parseFloat(k.split('_')[1]);
    const d = Math.abs(tk - t);
    if(!best || d < best.d) best = {d, p: PRICES.sheets[k]};
  }
  return best.p;
}

function partCost(part, f, eq){
  switch(part){
    case 'shell': return partWeight('shell',f,eq)*findSheetPrice(f.mat||'ST37',f.t)*1.15;
    case 'head': return partWeight('head',f,eq)*findSheetPrice(f.mat||'ST37',f.t)*1.35;
    case 'coil_pipe': return (f.branches||0)*((PRICES.pipes||{})[f.size]||0);
    case 'utube': return ((f.len||0)/1000/6)*((PRICES.pipes||{})[f.size]||0)*(f.n||1);
    case 'base': return partWeight('base',f,eq)*55000;
    case 'base_pad': return partWeight('base_pad',f,eq)*55000;
    case 'manhole': {
      const mp = PRICES.manholes||{};
      const price = f.size==='16'?mp.manhole_16:f.size==='18'?mp.manhole_18:mp.manhole_20;
      return (price||0)*(f.n||1);
    }
    case 'ladder': return partWeight('ladder',f,eq)*((PRICES.equipmentParts?.ladder?.price_per_kg)||80000);
    case 'cathode': {
      const c = PRICES.equipmentParts?.cathodic || {};
      return (f.type==='zn'?c.anode_zn:f.type==='al'?c.anode_al:c.anode_mg)*(f.n||1);
    }
    case 'internal_piping': return (f.length_cm / 100) * ((PRICES.pipes||{})[f.size]||0) / 6;
    case 'resin': return partWeight('resin',f,eq)*((PRICES.equipmentParts?.softener?.resin_kg)||180000);
    case 'control_valve': {
      const s = PRICES.equipmentParts?.softener||{};
      return f.type==='auto'?s.control_valve_auto:f.type==='semi'?s.control_valve_semi:s.control_valve_manual;
    }
    case 'tower_shell': return partWeight('tower_shell',f,eq)*findSheetPrice(f.mat||'SS304',f.t)*1.15;
    case 'tower_head': return partWeight('tower_head',f,eq)*findSheetPrice(f.mat||'SS304',f.t)*1.35;
    case 'tray': return (f.n||5)*1800000;
    case 'diaphragm': {
      const e = PRICES.equipmentParts?.expansion||{};
      return f.type==='butyl'?e.diaphragm_butyl:e.diaphragm_epdm;
    }
    case 'box_shell': return partWeight('box_shell',f,eq)*findSheetPrice(f.mat||'ST37',f.t)*1.15;
    case 'flange': return (f.n||1)*((PRICES.flanges||{})[f.size]||0);
    case 'bushing': return (f.n||1)*((PRICES.bushings||{})[f.size]||0);
    case 'nozzle': {
      const map = {'1':'flange_1','1_1_2':'flange_1_1_2','2':'flange_2','3':'flange_3','4':'flange_4'};
      return (f.n||1)*((PRICES.flanges||{})[map[f.size]]||780000);
    }
    default: return 0;
  }
}

function calcCost(){
  try{
    const eq = document.getElementById('c-eq').value;
    const def = EQUIPMENT_DEFS[eq];
    const state = EQ_STATE.cost[eq];
    const out = document.getElementById('c-result');
    const pp = parseFloat(document.getElementById('c-profit').value)||25;
    if(!def || !state){ out.innerHTML = '<div class="info-box red"><b>Error</b></div>'; return; }

    let total = 0;
    const details = [];
    const allParts = [...def.parts, ...(COST_PARTS_BY_EQ[eq] || [])];
    allParts.forEach(pid=>{
      const st = state[pid];
      if(!st || !st.on) return;
      const pd = PART_DEFS[pid];
      if(!pd) return;
      const c = partCost(pid, st.fields, eq);
      const w = partWeight(pid, st.fields, eq);
      total += c;
      details.push({pid, name: pd.name, c, w, isCostOnly: !!pd.costOnly});
      const badge = document.getElementById(`badge-cost-${pid}`);
      if(badge) badge.textContent = fmtT(c);
    });

    const structuralWeight = details.filter(d => !d.isCostOnly && d.w > 0).reduce((s,d)=>s+d.w, 0);
    const weldHours = structuralWeight / 20;
    const weldCost = weldHours * (PRICES.welder_hr||280000);
    const fitterCost = weldHours * 0.5 * (PRICES.fitter_hr||200000);
    const electrode = structuralWeight * 0.02 * (PRICES.electrode_kg||320000);
    const paintArea = structuralWeight * 0.05;
    const paintCost = paintArea * ((PRICES.paint_epoxy_m2||180000)+(PRICES.paint_zinc_m2||220000));
    const subtotal = total + weldCost + fitterCost + electrode + paintCost;
    const consumables = subtotal * ((PRICES.consumables_pct||8)/100);
    const transport = structuralWeight * (PRICES.transport_per_kg||350);
    const beforeProfit = subtotal + consumables + transport;
    const final = beforeProfit * (1 + pp/100);

    let html = `<div class="res-summary">
      <div class="lbl">Final Price</div>
      <div class="val">${fmtT(final)}</div>
      <div class="unit">تومان (+${pp}٪ سود)</div>
    </div>
    <div class="info-box orange">`;
    details.forEach(d=>{
      html += `<div class="res-row cost"><span class="lbl">${d.name}</span><span class="val">${fmtT(d.c)}</span></div>`;
    });
    html += `<div class="res-row"><span class="lbl">جوشکاری (${fmt(weldHours,1)} ساعت)</span><span class="val">${fmtT(weldCost)}</span></div>`;
    html += `<div class="res-row"><span class="lbl">مونتاژ</span><span class="val">${fmtT(fitterCost)}</span></div>`;
    html += `<div class="res-row"><span class="lbl">الکترود</span><span class="val">${fmtT(electrode)}</span></div>`;
    html += `<div class="res-row"><span class="lbl">رنگ</span><span class="val">${fmtT(paintCost)}</span></div>`;
    html += `<div class="res-row"><span class="lbl">مصرفی</span><span class="val">${fmtT(consumables)}</span></div>`;
    html += `<div class="res-row"><span class="lbl">حمل</span><span class="val">${fmtT(transport)}</span></div>`;
    html += `<div class="res-row big" style="border-top:2px solid var(--line-soft);margin-top:6px;padding-top:12px"><span class="lbl"><b>جمع هزینه</b></span><span class="val">${fmtT(beforeProfit)}</span></div>`;
    html += `<div class="res-row big"><span class="lbl">سود (${pp}%)</span><span class="val">${fmtT(beforeProfit*pp/100)}</span></div>`;
    html += `</div>`;
    out.innerHTML = html;
    EQ_STATE.cost._lastResult = {eq, def, details, structuralWeight, subtotal, beforeProfit, final, pp, weldHours, weldCost, fitterCost, electrode, paintCost, consumables, transport};
  }catch(e){
    console.error('calcCost:', e);
    document.getElementById('c-result').innerHTML = '<div class="info-box red">Error: '+e.message+'</div>';
  }
}

/* ============ Tab 1: Volume — مکعبی ساده ============ */
function onVolumeTypeChange(){
  const t = document.getElementById('v-type').value;
  const b = (t === 'box');
  const fl = document.getElementById('f-v-l');
  const fw = document.getElementById('f-v-w');
  const fh = document.getElementById('f-v-h');
  if(fl) fl.style.display = b?'block':'none';
  if(fw) fw.style.display = b?'block':'none';
  if(fh) fh.style.display = b?'none':'block';
  renderSchematic();
}

function renderSchematic(){
  const t = document.getElementById('v-type').value;
  const box = document.getElementById('v-schematic');
  if(!box) return;
  if(t === 'box'){
    const L = val('v-l'), W = val('v-w'), H = val('v-d');
    if(L>0 && W>0 && H>0){
      const V = boxVol(L,W,H);
      box.innerHTML = `<div class="schematic">${generateBoxSVG(L, W, H, `مکعبی — ${fmt(V,1)} لیتر`)}</div>`;
    } else box.innerHTML = '';
    return;
  }
  const D = val('v-d'), H = val('v-h');
  if(D>0 && H>0){
    const head = t==='cyl-dish'?'torisph':'flat';
    const V = totalVol(D,H,head);
    box.innerHTML = `<div class="schematic">${generateTankSVG(D, H, `مخزن — ${fmt(V,1)} لیتر`)}</div>`;
  } else box.innerHTML = '';
}

function calcVol(){
  const t = document.getElementById('v-type').value;
  const out = document.getElementById('v-res');
  if(t==='box'){
    const L=val('v-l'), W=val('v-w'), H=val('v-d');
    if(!(L>0&&W>0&&H>0)){out.innerHTML='<div class="info-box red"><b>خطا</b> — طول، عرض، ارتفاع</div>';return;}
    const V = boxVol(L,W,H);
    LAST_VOLUME = {type:'box', L, W, H, V, working:V*0.85};
    out.innerHTML = `<div class="res-summary">
      <div class="lbl">Total Volume</div>
      <div class="val">${fmt(V,1)}</div>
      <div class="unit">لیتر (${fmt(V/1000,3)} m³)</div>
    </div>
    <div class="info-box green">
      <b>💡 حجم کاری (۸۵٪) = ${fmt(V*0.85,1)} L</b><br>
      وزن آب = <b>${fmt(V,0)} kg</b><br>
      محیط خم = <b>${fmt(2*(L+W),0)} mm</b>
    </div>`;
    autoSave();
    return;
  }
  const D=val('v-d'), H=val('v-h');
  if(!(D>0&&H>0)){out.innerHTML='<div class="info-box red"><b>خطا</b></div>';return;}
  const head = t==='cyl-dish'?'torisph':'flat';
  const V = totalVol(D,H,head);
  const nearest = findNearestCatalogModel(V);
  LAST_VOLUME = {type:'cyl', D, H, head, V, working:V*0.85};
  let html = `<div class="res-summary">
    <div class="lbl">Total Volume</div>
    <div class="val">${fmt(V,1)}</div>
    <div class="unit">لیتر (${fmt(V/1000,3)} m³)</div>
  </div>
  <div class="info-box green">
    <b>💡 حجم کاری (۸۵٪) = ${fmt(V*0.85,1)} L</b><br>
    وزن آب = <b>${fmt(V,0)} kg</b>
  </div>`;
  if(nearest){
    html += `<div class="info-box"><b>نزدیک‌ترین مدل:</b> ${nearest.model} — ${nearest.capacity} L</div>`;
  }
  out.innerHTML = html;
  autoSave();
}

function saveLastVolume(){
  if(!LAST_VOLUME){ alert('ابتدا محاسبه کن'); return; }
  const name = prompt('نام:', LAST_VOLUME.type === 'box' 
    ? `مکعب ${LAST_VOLUME.V.toFixed(0)}L` 
    : `مخزن ${LAST_VOLUME.V.toFixed(0)}L`);
  if(!name) return;
  if(saveCalculation('volume', name, LAST_VOLUME, {V: LAST_VOLUME.V, working: LAST_VOLUME.working})){
    alert('ذخیره شد!');
  }
}

/* ============ Tab 2: Dimensions Dual ============ */
function setDimMode(mode){
  DIM_MODE.current = mode;
  document.querySelectorAll('#t2 .mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  document.querySelectorAll('#t2 .mode-body').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('dim-fields-' + mode);
  if(el) el.classList.add('active');
}

function toggleDimMode(){
  const t = document.getElementById('d-type').value;
  const cylF = document.getElementById('dim-cyl-fields');
  const boxF = document.getElementById('dim-box-fields');
  if(t === 'box'){ cylF.style.display = 'none'; boxF.style.display = 'block'; }
  else { cylF.style.display = 'block'; boxF.style.display = 'none'; }
}

function toggleDimMode2(){
  const t = document.getElementById('d2-type').value;
  const cylF = document.getElementById('dim2-cyl-fields');
  const boxF = document.getElementById('dim2-box-fields');
  if(t === 'box'){ cylF.style.display = 'none'; boxF.style.display = 'block'; }
  else { cylF.style.display = 'block'; boxF.style.display = 'none'; }
}

function calcVolFromDims(){
  const t = document.getElementById('d2-type').value;
  const out = document.getElementById('d2-res');
  const sch = document.getElementById('d2-schematic');
  if(t === 'box'){
    const L = val('d2-l'), W = val('d2-w'), H = val('d2-h-box');
    if(!(L>0 && W>0 && H>0)){ out.innerHTML = '<div class="info-box red">همه ابعاد را وارد کن</div>'; return; }
    const V = boxVol(L, W, H);
    LAST_VOLUME = {type:'box', L, W, H, V, working:V*0.85};
    out.innerHTML = `<div class="res-summary green">
      <div class="lbl">Volume</div>
      <div class="val">${fmt(V,1)}</div>
      <div class="unit">لیتر — ${fmt(V/1000,3)} m³</div>
    </div>
    <div class="info-box green">
      <b>💡 هوشمند:</b><br>
      حجم کاری (۸۵٪) = <b>${fmt(V*0.85,1)} لیتر</b><br>
      وزن آب = <b>${fmt(V,0)} کیلوگرم</b><br>
      محیط خم = <b>${fmt(2*(L+W),0)} mm</b>
    </div>`;
    sch.innerHTML = `<div class="schematic">${generateBoxSVG(L, W, H, `مکعبی — ${fmt(V,1)} لیتر`)}</div>`;
    autoSave();
    return;
  }
  const D = val('d2-d'), H = val('d2-h');
  if(!(D>0 && H>0)){ out.innerHTML = '<div class="info-box red">قطر و ارتفاع</div>'; return; }
  const head = t==='cyl-dish' ? 'torisph' : 'flat';
  const V_body = cylVol(D, H);
  const V_head = head==='torisph' ? 2*dishVT(D) : 0;
  const V = V_body + V_head;
  LAST_VOLUME = {type:'cyl', D, H, head, V, working:V*0.85};
  out.innerHTML = `<div class="res-summary green">
    <div class="lbl">Total Volume</div>
    <div class="val">${fmt(V,1)}</div>
    <div class="unit">لیتر — ${fmt(V/1000,3)} m³</div>
  </div>
  <div class="info-box green">
    <b>💡 تفکیک:</b><br>
    حجم بدنه: <b>${fmt(V_body,1)}</b> لیتر<br>
    حجم دو عدسی: <b>${fmt(V_head,1)}</b> لیتر<br>
    ────────────<br>
    حجم کاری (۸۵٪): <b>${fmt(V*0.85,1)} لیتر</b>
  </div>`;
  sch.innerHTML = `<div class="schematic">${generateTankSVG(D, H, `مخزن — ${fmt(V,1)} لیتر`)}</div>`;
  autoSave();
}

function transferVolToDim(){
  if(!LAST_VOLUME){ alert('ابتدا محاسبه کن'); return; }
  const el = document.getElementById('d-v');
  if(el && LAST_VOLUME.V){
    el.value = LAST_VOLUME.V.toFixed(1);
    setDimMode('A');
    const volTab = document.querySelector('[data-tab="t2"]');
    if(volTab) volTab.click();
  }
}

function calcDim(){
  const V = val('d-v');
  const t = document.getElementById('d-type').value;
  const out = document.getElementById('d-res');
  if(!(V>0)){ out.innerHTML = '<div class="info-box red">ظرفیت را وارد کن</div>'; return; }

  if(t === 'box'){
    const L_in = val('d-box-l') || 0;
    const W_in = val('d-box-w') || 0;
    const H_in = val('d-box-h') || 0;
    const result = calcBoxDims(V, L_in, W_in, H_in);
    if(result.mode === 'همه معلوم'){
      const V_calc = result.L * result.W * result.H / 1e6;
      const diff = (V_calc - V) / V * 100;
      out.innerHTML = `<div class="info-box">
        <div class="res-row"><span class="lbl">طول</span><span class="val">${fmt(result.L,0)} mm</span></div>
        <div class="res-row"><span class="lbl">عرض</span><span class="val">${fmt(result.W,0)} mm</span></div>
        <div class="res-row"><span class="lbl">ارتفاع</span><span class="val">${fmt(result.H,0)} mm</span></div>
        <div class="res-row big"><span class="lbl"><b>حجم محاسبه</b></span><span class="val" style="color:${Math.abs(diff)>5?'var(--err-2)':'var(--ok-2)'}">${fmt(V_calc,1)} L</span></div>
      </div>`;
      return;
    }
    out.innerHTML = `<div class="res-summary blue">
      <div class="lbl">${result.mode}</div>
      <div class="val">${fmt(result.L,0)}×${fmt(result.W,0)}×${fmt(result.H,0)}</div>
      <div class="unit">mm</div>
    </div>
    <div class="info-box green">
      <div class="res-row"><span class="lbl">طول</span><span class="val">${fmt(result.L,1)} mm</span></div>
      <div class="res-row"><span class="lbl">عرض</span><span class="val">${fmt(result.W,1)} mm</span></div>
      <div class="res-row"><span class="lbl">ارتفاع</span><span class="val">${fmt(result.H,1)} mm</span></div>
      <div class="res-row"><span class="lbl">محیط خم</span><span class="val">${fmt(2*(result.L + result.W),0)} mm</span></div>
      <div class="res-row"><span class="lbl">مساحت کل ورق (بدون سقف)</span><span class="val">${fmt((result.L*result.W + 2*(result.L+result.W)*result.H)/1e6,3)} m²</span></div>
    </div>
    <div class="schematic">${generateBoxSVG(result.L, result.W, result.H, `مکعب ${fmt(V,0)}L`)}</div>`;
    autoSave();
    return;
  }

  const D = val('d-d') || 0;
  const H = val('d-h') || 0;
  const head = t === 'cyl-dish' ? 'torisph' : 'flat';
  let html = '';
  if(D>0 && H>0){
    const Vc = totalVol(D,H,head);
    html += `<div class="info-box"><div class="res-row"><span class="lbl">حجم</span><span class="val">${fmt(Vc,1)} L</span></div></div>`;
  } else if(D>0){
    const Hc = hFromV(V,D,head);
    html += `<div class="res-summary blue"><div class="lbl">ارتفاع</div><div class="val">${fmt(Hc,0)}</div><div class="unit">mm</div></div>
    <div class="schematic">${generateTankSVG(D, Hc, `مخزن ${fmt(V,0)}L`)}</div>`;
  } else if(H>0){
    const Dc = diamFromV(V,H,head);
    html += `<div class="res-summary blue"><div class="lbl">قطر</div><div class="val">${fmt(Dc,0)}</div><div class="unit">mm</div></div>
    <div class="schematic">${generateTankSVG(Dc, H, `مخزن ${fmt(V,0)}L`)}</div>`;
  } else {
    let best=null;
    for(let n=1;n<=10;n++){
      const Hf=n*1500;
      const Df=diamFromV(V,Hf,head);
      const C=Math.PI*Df, m=Math.ceil(C/6000), waste=n*(m*6000-C);
      const pct=waste/(n*m*6000)*100;
      if(!best||pct<best.pct) best={n,H:Hf,D:Df,pct};
    }
    html += `<div class="res-summary blue"><div class="lbl">بهینه</div><div class="val">${fmt(best.D,0)} × ${fmt(best.H,0)}</div><div class="unit">D × H (mm)</div></div>
    <div class="schematic">${generateTankSVG(best.D, best.H, `مخزن ${fmt(V,0)}L`)}</div>`;
  }
  out.innerHTML = html;
  autoSave();
}

/* ============ Tab 6: Head ============ */
function setHeadMode(mode){
  HEAD_MODE.current = mode;
  document.querySelectorAll('#t6 .mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  document.querySelectorAll('#t6 .mode-body').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('head-fields-' + mode);
  if(el) el.classList.add('active');
}

function applyHeadPreset(){
  const type = document.getElementById('h-type').value;
  if(type==='custom') return;
  const D = val('h-d');
  if(!(D>0)) return;
  let h = 0;
  if(type==='shallow') h = D/15;
  else if(type==='torisph') h = D*0.194;
  else if(type==='ellip') h = D*0.25;
  else if(type==='hemi') h = D*0.5;
  document.getElementById('h-h').value = h.toFixed(1);
}

function calcBlankHandler(){
  const D = val('h-d'), h = val('h-h'), L = val('h-l')||0, t = val('h-t')||6;
  const type = document.getElementById('h-type').value;
  const mat = document.getElementById('h-mat').value;
  const out = document.getElementById('h-res');
  if(!(D>0&&h>0)){out.innerHTML='<div class="info-box red">قطر و گودی</div>';return;}
  const res = calcBlank(D,h,L,t,type);
  const price = findSheetPrice(mat, t);
  const cost = res.W * price * 1.35;
  const sugg = getHeadSuggestions(D);
  let smart = '';
  if(sugg && sugg.count >= 2){
    smart = `<div class="info-box green" style="margin-top:10px"><b>Smart:</b> از ${sugg.count} عدسی مشابه — h=${sugg.h}mm, L=${sugg.L}mm</div>`;
  }
  out.innerHTML = `<div class="res-summary green">
    <div class="lbl">Blank Diameter</div>
    <div class="val">${fmt(res.Db,0)}</div>
    <div class="unit">mm — سطح ${fmt(res.A,3)} m² (${fmt(res.A*SQFT_PER_SQM,2)} ft²)</div>
  </div>
  <div class="info-box green">
    <div class="res-row auto"><span class="lbl">قطر گسترده</span><span class="val">${fmt(res.Db,1)} mm</span></div>
    <div class="res-row auto"><span class="lbl">سطح گسترده</span><span class="val">${fmt(res.A,3)} m²</span></div>
    <div class="res-row auto"><span class="lbl">وزن عدسی</span><span class="val">${fmt(res.W,1)} kg</span></div>
    <div class="res-row"><span class="lbl">هزینه ساخت (+35%)</span><span class="val">${fmtT(cost)}</span></div>
  </div>${smart}
  <div class="row" style="margin-top:10px">
    <button class="btn blue small" onclick="exportSimpleHeadDXF(${D},${h},${L},${t},'${type}',${res.Db.toFixed(2)})" style="margin-top:0">⬇️ DXF</button>
    <button class="btn gray small" onclick="exportSVGFromResult('h-res')" style="margin-top:0">⬇️ SVG</button>
  </div>`;
  autoSave();
}

function exportSimpleHeadDXF(D, h, L, t, type, Db){
  exportBlankDXF(D, h, L, t, type, Db);
}

function exportBlankDXF(D, h, L, t, type, Db){
  const entities = [];
  const r = Db / 2;
  entities.push({type:'CIRCLE', cx:0, cy:0, r:r, layer:'BLANK'});
  entities.push({type:'CIRCLE', cx:0, cy:0, r:r + 30, layer:'TRIM'});
  entities.push({type:'LINE', x1:-r-100, y1:0, x2:r+100, y2:0, layer:'CENTER'});
  entities.push({type:'LINE', x1:0, y1:-r-100, x2:0, y2:r+100, layer:'CENTER'});
  entities.push({type:'TEXT', x:-80, y:r + 50, text:`BLANK D=${Db.toFixed(1)}`, height:15, layer:'TEXT'});
  downloadDXF(entities, `Head_Blank_D${D}`);
}

function exportSVGFromResult(resId){
  const el = document.getElementById(resId);
  if(!el) return;
  const svg = el.querySelector('svg');
  if(svg){
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svgData], {type:'image/svg+xml'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'result_' + Date.now() + '.svg';
    a.click();
  } else alert('SVG در خروجی وجود ندارد');
}

/* Plate & Sheet */
function calcHeadPlateSheet(){
  const D = val('hp-d'), h = val('hp-h'), t = val('hp-t') || 6;
  const L = val('hp-l') || 40;
  const mat = document.getElementById('hp-mat').value;
  const type = document.getElementById('hp-type').value;
  const sheetW = val('hp-sheet-w') || 1500;
  const sheetL = val('hp-sheet-l') || 6000;
  const out = document.getElementById('hp-res');
  if(!(D>0 && h>0)){ out.innerHTML = '<div class="info-box red">قطر و گودی</div>'; return; }

  const blank = calcBlank(D, h, L, t, type);
  const price = findSheetPrice(mat, t);
  const cost = blank.W * price * 1.35;
  const springback = calcSpringback(D, t, mat);
  const R_tool = D * (1 - springback.springback_pct / 100);
  const ratio = h / D;
  let pressSteps = 1;
  if(ratio > 0.1) pressSteps = 2;
  if(ratio > 0.15) pressSteps = 3;
  if(ratio > 0.2) pressSteps = 4;
  const sheetArea = (sheetW/1000)*(sheetL/1000);
  const sheetsNeeded = Math.ceil(blank.A / sheetArea);
  const canPress = (D <= WORKSHOP.maxPressDiameter) && (t <= WORKSHOP.maxPressThickness);

  let html = `<div class="res-summary violet">
    <div class="lbl">Blank Diameter</div>
    <div class="val">${fmt(blank.Db,0)}</div>
    <div class="unit">mm</div>
  </div>
  <div class="info-box violet">
    <div class="res-row big"><span class="lbl"><b>قطر گسترده</b></span><span class="val">${fmt(blank.Db,1)} mm</span></div>
    <div class="res-row big"><span class="lbl"><b>سطح گسترده</b></span><span class="val">${fmt(blank.A,3)} m² (${fmt(blank.A*SQFT_PER_SQM,2)} ft²)</span></div>
    <div class="res-row big"><span class="lbl"><b>وزن عدسی</b></span><span class="val">${fmt(blank.W,1)} kg</span></div>
  </div>
  <div class="info-box yellow" style="margin-top:12px">
    <b>🔧 Springback:</b>
    <div class="res-row"><span class="lbl">ضریب بازگشت</span><span class="val">${springback.springback_pct.toFixed(2)}%</span></div>
    <div class="res-row"><span class="lbl">شعاع قالب توصیه</span><span class="val">${R_tool.toFixed(1)} mm</span></div>
  </div>
  <div class="info-box orange" style="margin-top:12px">
    <b>🏭 ساخت:</b>
    <div class="res-row"><span class="lbl">مراحل پرس</span><span class="val">${pressSteps} مرحله</span></div>
    <div class="res-row"><span class="lbl">تعداد ورق</span><span class="val">${sheetsNeeded} عدد</span></div>
    <div class="res-row"><span class="lbl">هزینه</span><span class="val">${fmtT(cost)}</span></div>
  </div>`;

  if(!canPress){
    html += `<div class="info-box red" style="margin-top:12px"><b>⚠️</b> از توانایی پرس کارگاه بیشتر است!</div>`;
  }
  html += `<div class="schematic">${generatePlateSheetSVG(D, h, L, t, type, blank.Db, sheetW, sheetL)}</div>`;
  html += `<div class="row" style="margin-top:12px">
    <button class="btn violet small" onclick="exportPlateSheetDXF(${D},${h},${L},${t},'${type}',${blank.Db.toFixed(2)})" style="margin-top:0">⬇️ DXF</button>
    <button class="btn gray small" onclick="exportSVGFromResult('hp-res')" style="margin-top:0">⬇️ SVG</button>
  </div>`;
  out.innerHTML = html;
  autoSave();
}

function generatePlateSheetSVG(D, h, L, t, type, Db, sheetW, sheetL){
  const R = Db / 2;
  const scaleBlank = Math.min(180 / Db, 1);
  const Rpx = R * scaleBlank;
  const cx1 = 130, cy1 = 180;
  const cx2 = 400, cy2 = 60;
  const profileScale = Math.min(200 / Db, 200 / (D + L), 1);
  const D_px = D * profileScale;
  const h_px = h * profileScale;
  const L_px = Math.max(15, L * profileScale);
  const py = cy2 + 40;
  
  let profilePath = '';
  if(type === 'hemi'){
    profilePath = `M${cx2 - D_px/2} ${py + h_px} A ${D_px/2} ${D_px/2} 0 0 1 ${cx2 + D_px/2} ${py + h_px}`;
  } else if(type === 'ellip'){
    profilePath = `M${cx2 - D_px/2} ${py + h_px} A ${D_px/2} ${h_px} 0 0 1 ${cx2 + D_px/2} ${py + h_px}`;
  } else {
    profilePath = `M${cx2 - D_px/2} ${py + h_px} Q ${cx2} ${py - h_px*0.5} ${cx2 + D_px/2} ${py + h_px}`;
  }
  
  const sheetScale = Math.min(120 / sheetW, 60 / sheetL, 0.06);
  const sw_px = sheetW * sheetScale;
  const sl_px = sheetL * sheetScale;
  const sheetX = 30;
  const sheetY = 340;
  const circlesPerRow = Math.floor(sheetW / Db);
  const rows = Math.floor(sheetL / Db);
  const totalFit = circlesPerRow * rows;
  const sheetsNeeded = Math.ceil(1 / Math.max(totalFit, 1));
  
  return `<svg viewBox="0 0 560 500" style="max-width:560px;width:100%;height:auto">
    <defs>
      <marker id="psarr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#3F3A32"/>
      </marker>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="#7C3AED" stroke-width="0.8" opacity="0.4"/>
      </pattern>
    </defs>
    <text x="130" y="25" text-anchor="middle" font-family="Vazirmatn" font-size="13" font-weight="800" fill="#1F1A12">صفحه گسترده (Blank)</text>
    <circle cx="${cx1}" cy="${cy1}" r="${Rpx}" fill="#F5EFE0" stroke="#7C3AED" stroke-width="2.5"/>
    <circle cx="${cx1}" cy="${cy1}" r="${Rpx}" fill="url(#hatch)" opacity="0.3"/>
    <line x1="${cx1 - Rpx - 10}" y1="${cy1}" x2="${cx1 + Rpx + 10}" y2="${cy1}" stroke="#7C3AED" stroke-width="0.8" stroke-dasharray="4 3"/>
    <line x1="${cx1}" y1="${cy1 - Rpx - 10}" x2="${cx1}" y2="${cy1 + Rpx + 10}" stroke="#7C3AED" stroke-width="0.8" stroke-dasharray="4 3"/>
    <line x1="${cx1 - Rpx}" y1="${cy1 + Rpx + 22}" x2="${cx1 + Rpx}" y2="${cy1 + Rpx + 22}" stroke="#3F3A32" stroke-width="1" marker-start="url(#psarr)" marker-end="url(#psarr)"/>
    <text x="${cx1}" y="${cy1 + Rpx + 38}" text-anchor="middle" font-family="JetBrains Mono" font-size="12" font-weight="800" fill="#7C3AED">Blank D = ${Db.toFixed(1)} mm</text>
    <text x="400" y="25" text-anchor="middle" font-family="Vazirmatn" font-size="13" font-weight="800" fill="#1F1A12">پروفایل مقطع</text>
    <path d="${profilePath}" fill="#F5EFE0" stroke="#3F3A32" stroke-width="2.5"/>
    <line x1="${cx2 - D_px/2}" y1="${py + h_px}" x2="${cx2 - D_px/2}" y2="${py + h_px + L_px}" stroke="#3F3A32" stroke-width="2.5"/>
    <line x1="${cx2 + D_px/2}" y1="${py + h_px}" x2="${cx2 + D_px/2}" y2="${py + h_px + L_px}" stroke="#3F3A32" stroke-width="2.5"/>
    <line x1="${cx2 - D_px/2}" y1="${py + h_px + L_px + 15}" x2="${cx2 + D_px/2}" y2="${py + h_px + L_px + 15}" stroke="#3F3A32" stroke-width="1.2" marker-start="url(#psarr)" marker-end="url(#psarr)"/>
    <text x="${cx2}" y="${py + h_px + L_px + 32}" text-anchor="middle" font-family="JetBrains Mono" font-size="12" font-weight="800" fill="#E85D04">D = ${D} mm</text>
    <text x="280" y="320" text-anchor="middle" font-family="Vazirmatn" font-size="12" font-weight="800" fill="#1F1A12">چیدمان روی ورق ${sheetW} × ${sheetL} mm (${circlesPerRow}×${rows} = ${totalFit})</text>
    <rect x="${sheetX}" y="${sheetY}" width="${sw_px}" height="${sl_px}" fill="#FAF6EB" stroke="#3F3A32" stroke-width="1.5"/>
    ${(()=>{
      let nested = '';
      const cDia = Db * sheetScale;
      for(let r=0; r<Math.min(rows, 4); r++){
        for(let c=0; c<Math.min(circlesPerRow, 6); c++){
          const px = sheetX + cDia/2 + c * cDia + 2;
          const py2 = sheetY + cDia/2 + r * cDia + 2;
          if(px + cDia/2 > sheetX + sw_px) break;
          if(py2 + cDia/2 > sheetY + sl_px) break;
          nested += `<circle cx="${px}" cy="${py2}" r="${cDia/2 - 1}" fill="#DCFCE7" stroke="#15803D" stroke-width="1"/>`;
        }
      }
      return nested;
    })()}
  </svg>`;
}

function exportPlateSheetDXF(D, h, L, t, type, Db){
  const entities = [];
  const r = Db / 2;
  entities.push({type:'CIRCLE', cx:0, cy:0, r:r, layer:'BLANK'});
  entities.push({type:'CIRCLE', cx:0, cy:0, r:r + 30, layer:'TRIM'});
  entities.push({type:'LINE', x1:-r-100, y1:0, x2:r+100, y2:0, layer:'CENTER'});
  entities.push({type:'LINE', x1:0, y1:-r-100, x2:0, y2:r+100, layer:'CENTER'});
  entities.push({type:'TEXT', x:-90, y:r + 60, text:`BLANK D=${Db.toFixed(1)}`, height:18, layer:'TEXT'});
  downloadDXF(entities, `PlateSheet_D${D}`);
}

/* Segmented */
function calcSegmentedHead(){
  const D = val('sh-d'), h = val('sh-h');
  const n = parseInt(document.getElementById('sh-n').value) || 8;
  const L = val('sh-l') || 40;
  const t = val('sh-t') || 8;
  const out = document.getElementById('sh-res');
  const sch = document.getElementById('sh-schematic');
  if(!(D>0 && h>0)){ out.innerHTML = '<div class="info-box red">قطر و گودی</div>'; return; }
  const Db = Math.sqrt(D*D + 4*D*h) + 2*L;
  const R_blank = Db / 2;
  const totalArea = Math.PI * Math.pow(Db/1000, 2) / 4;
  const perSegArea = totalArea / n;
  const baseWidth = Math.PI * Db / n;
  const arcLength = baseWidth;
  const angle = 360 / n;
  const weldLength = (n - 1) * R_blank / 1000;
  const sheetWidth = (WORKSHOP.sheetWidths && WORKSHOP.sheetWidths[0]) || 1500;
  const sheetLength = WORKSHOP.sheetLength || 6000;
  const sheetArea = (sheetWidth / 1000) * (sheetLength / 1000);
  const sheetsNeeded = Math.ceil(totalArea / sheetArea);
  const weight = totalArea * (t/1000) * 7850;
  out.innerHTML = `<div class="res-summary blue">
    <div class="lbl">Segmented Head — ${n} قاچ</div>
    <div class="val">${fmt(perSegArea,2)}</div>
    <div class="unit">m² هر قاچ (${fmt(perSegArea*SQFT_PER_SQM,2)} ft²)</div>
  </div>
  <div class="info-box">
    <div class="res-row"><span class="lbl">قطر گسترده</span><span class="val">${fmt(Db,0)} mm</span></div>
    <div class="res-row"><span class="lbl">عرض قاعده هر قاچ</span><span class="val">${fmt(baseWidth,0)} mm</span></div>
    <div class="res-row"><span class="lbl">طول قوس</span><span class="val">${fmt(arcLength,0)} mm</span></div>
    <div class="res-row"><span class="lbl">مساحت کل</span><span class="val">${fmt(totalArea,3)} m²</span></div>
    <div class="res-row"><span class="lbl">تعداد ورق</span><span class="val">${sheetsNeeded}</span></div>
    <div class="res-row"><span class="lbl">طول کل جوش</span><span class="val">${fmt(weldLength,2)} m</span></div>
    <div class="res-row big"><span class="lbl"><b>وزن عدسی</b></span><span class="val">${fmt(weight,1)} kg</span></div>
  </div>
  <div class="row" style="margin-top:10px">
    <button class="btn blue small" onclick="exportSegmentedDXF(${D},${h},${n},${L},${t},${Db.toFixed(2)})" style="margin-top:0">⬇️ DXF</button>
    <button class="btn gray small" onclick="exportSVGFromResult('sh-res')" style="margin-top:0">⬇️ SVG</button>
  </div>`;
  sch.innerHTML = `<div class="schematic">${drawSegmentedHeadSVG(D, h, n, Db)}</div>`;
  autoSave();
}

function exportSegmentedDXF(D, h, n, L, t, Db){
  const entities = [];
  const R = Db / 2;
  const angle = 360 / n;
  const halfAngle = angle / 2;
  const x1 = R * Math.cos(-halfAngle * Math.PI / 180);
  const y1 = R * Math.sin(-halfAngle * Math.PI / 180);
  const x2 = R * Math.cos(halfAngle * Math.PI / 180);
  const y2 = R * Math.sin(halfAngle * Math.PI / 180);
  entities.push({type:'ARC', cx:0, cy:0, r:R, startAngle: 90 - halfAngle, endAngle: 90 + halfAngle, layer:'CUT'});
  entities.push({type:'LINE', x1:0, y1:0, x2:x1, y2:y1, layer:'CUT'});
  entities.push({type:'LINE', x1:0, y1:0, x2:x2, y2:y2, layer:'CUT'});
  downloadDXF(entities, `Segmented_D${D}_${n}pcs`);
}

function exportSegmentedSVG(){ exportElementSVG('sh-schematic', 'segmented_head'); }

function calcBodyHeightFromTotal(){
  const H_total = parseFloat(document.getElementById('ht-total').value) || 0;
  const h_dish = parseFloat(document.getElementById('ht-dish').value) || 0;
  const n_dish = parseInt(document.getElementById('ht-ndish').value) || 0;
  const out = document.getElementById('ht-res');
  if(!(H_total>0)){ out.innerHTML = '<div class="info-box red">ارتفاع کل</div>'; return; }
  const H_body = H_total - n_dish * h_dish;
  if(H_body <= 0){ out.innerHTML = '<div class="info-box red">ارتفاع عدسی بیشتر از کل</div>'; return; }
  out.innerHTML = `<div class="res-summary blue">
    <div class="lbl">Body Height</div>
    <div class="val">${fmt(H_body,0)}</div>
    <div class="unit">mm</div>
  </div>`;
}

/* ============ حالت ابعاد واقعی عدسی ============ */
function calcRealHead(){
  const D_design = val('rh-d-design');
  const h_design = val('rh-h-design');
  const D_actual = val('rh-d-actual');
  const h_actual = val('rh-h-actual');
  const L_actual = val('rh-l-actual');
  const t_actual = val('rh-t-actual');
  const out = document.getElementById('rh-res');
  
  if(!(D_design>0 && h_design>0)){
    out.innerHTML = '<div class="info-box red">اطلاعات طراحی را وارد کن</div>';
    return;
  }
  if(!(D_actual>0 || h_actual>0)){
    out.innerHTML = '<div class="info-box red">حداقل یک ابعاد واقعی وارد کن</div>';
    return;
  }
  
  const deltaD = D_actual>0 ? (D_actual - D_design) : 0;
  const deltah = h_actual>0 ? (h_actual - h_design) : 0;
  const springback_pct = D_actual>0 ? ((D_design - D_actual) / D_design) * 100 : 0;
  
  // ذخیره خودکار
  if(D_actual>0 && h_actual>0){
    saveRealHeadRecord(D_design, h_design, D_actual, h_actual, L_actual, t_actual, springback_pct);
  }
  
  out.innerHTML = `<div class="res-summary violet">
    <div class="lbl">Springback واقعی</div>
    <div class="val">${springback_pct.toFixed(2)}</div>
    <div class="unit">%</div>
  </div>
  <div class="info-box violet">
    <div class="res-row"><span class="lbl">D طراحی → واقعی</span><span class="val">${D_design} → ${D_actual} mm (Δ=${deltaD>0?'+':''}${deltaD.toFixed(1)})</span></div>
    <div class="res-row"><span class="lbl">h طراحی → واقعی</span><span class="val">${h_design} → ${h_actual} mm (Δ=${deltah>0?'+':''}${deltah.toFixed(1)})</span></div>
    <div class="res-row"><span class="lbl">طول لبه واقعی</span><span class="val">${L_actual} mm</span></div>
    <div class="res-row"><span class="lbl">ضخامت واقعی</span><span class="val">${t_actual} mm</span></div>
  </div>
  <div class="info-box yellow" style="margin-top:12px">
    <b>📌 تحلیل:</b><br>
    ${springback_pct > 3 ? '⚠️ برگشت فنری زیاد — قالب اصلاح شود' : springback_pct > 0.5 ? '✅ برگشت فنری نرمال' : 'ℹ️ برگشت فنری کم — قالب مناسب'}
  </div>`;
  autoSave();
}

function saveRealHeadRecord(Dd, hd, Da, ha, La, ta, sb){
  try {
    let list = JSON.parse(localStorage.getItem(REAL_HEAD_KEY) || '[]');
    list.unshift({
      id: 'rh_' + Date.now(),
      D_design: Dd, h_design: hd,
      D_actual: Da, h_actual: ha,
      L_actual: La, t_actual: ta,
      springback: sb,
      date: persianDate()
    });
    if(list.length > 200) list = list.slice(0, 200);
    localStorage.setItem(REAL_HEAD_KEY, JSON.stringify(list));
  } catch(e) {}
}

/* ============ Coil (Advanced but for Tab 5 - Cost only) ============ */
function updateCoilDesign(){
  try {
    const Dtank = parseFloat(document.getElementById('coil-Dtank').value) || 0;
    const Htank = parseFloat(document.getElementById('coil-Htank').value) || 0;
    const dishH = parseFloat(document.getElementById('coil-dish').value) || 0;
    const clear = parseFloat(document.getElementById('coil-clear').value) || 0;
    const Dcoil = parseFloat(document.getElementById('coil-Dcoil').value) || 0;
    const OD = parseFloat(document.getElementById('coil-pipe').value) || 33.4;
    const B_total = parseInt(document.getElementById('coil-branches').value) || 1;
    const gap = parseFloat(document.getElementById('coil-gap').value) || 0;
    const starts = parseInt(document.getElementById('coil-starts')?.value) || 1;
    const coilType = document.getElementById('coil-type')?.value || 'helical';
    
    if(!(Dtank>0 && Htank>0 && Dcoil>0)){ 
      document.getElementById('coil-schematic').innerHTML = '<div class="info-box red">اطلاعات را کامل وارد کن</div>';
      return;
    }
    
    const L_total_m = B_total * 6;
    const L_total_mm = L_total_m * 1000;
    const circumference = Math.PI * Dcoil;
    const turnsPerStart = L_total_mm / (circumference * starts);
    const pitch = OD + gap;
    const coilHeight = turnsPerStart * pitch;
    const availableSpace = Htank - 2 * clear;
    const fits = coilHeight <= availableSpace;
    
    // سطح حرارتی — فوت مربع
    const area_m2 = Math.PI * (OD/1000) * L_total_m;
    const area_ft2 = area_m2 * SQFT_PER_SQM;
    
    const ID = OD - 3;
    const innerVol = Math.PI/4 * Math.pow(ID/1000, 2) * L_total_m * 1000;
    const wallClear = (Dtank - Dcoil) / 2;
    const wallOK = wallClear >= WORKSHOP.minCoilWallClearance;
    
    document.getElementById('coil-schematic').innerHTML = drawCoilSVG(Dtank, Htank, dishH, Dcoil, coilHeight, OD, turnsPerStart, pitch, clear, fits, starts, coilType);
    
    document.getElementById('coil-info').innerHTML = `
      <div class="info-box green">
        <div class="res-row"><span class="lbl">تعداد استارت</span><span class="val">${starts}</span></div>
        <div class="res-row"><span class="lbl">دور در هر استارت</span><span class="val">${turnsPerStart.toFixed(2)}</span></div>
        <div class="res-row"><span class="lbl">گام</span><span class="val">${pitch.toFixed(2)} mm</span></div>
        <div class="res-row big"><span class="lbl"><b>ارتفاع کویل</b></span><span class="val" style="color:var(--accent-2)">${coilHeight.toFixed(0)} mm</span></div>
        <div class="res-row big"><span class="lbl"><b>فضای موجود</b></span><span class="val" style="color:var(--accent-2-c)">${availableSpace.toFixed(0)} mm</span></div>
        <div class="res-row big"><span class="lbl"><b>سطح حرارتی</b></span><span class="val" style="color:var(--info-2)">${area_ft2.toFixed(2)} ft² (${area_m2.toFixed(2)} m²)</span></div>
        <div class="res-row"><span class="lbl">حجم داخل کویل</span><span class="val">${innerVol.toFixed(1)} L</span></div>
        <div class="res-row"><span class="lbl">فاصله از دیواره</span><span class="val" style="color:${wallOK?'var(--ok-2)':'var(--err-2)'}">${wallClear.toFixed(1)} mm</span></div>
      </div>
    `;
    
    let warnHtml = '';
    if(!fits){
      warnHtml += `<div class="info-box red"><b>⚠️ کویل جا نمی‌شود!</b> ${(coilHeight - availableSpace).toFixed(0)} mm کم است.</div>`;
    }
    if(!wallOK){
      warnHtml += `<div class="info-box red"><b>⚠️ فاصله از دیواره کم!</b> ${wallClear.toFixed(1)} mm</div>`;
    }
    if(fits && wallOK){
      warnHtml += `<div class="info-box green"><b>✅ طراحی درست!</b> فاصله اضافی: ${(availableSpace - coilHeight).toFixed(0)} mm</div>`;
    }
    document.getElementById('coil-warning').innerHTML = warnHtml;
    
    window._lastCoilDesign = {Dtank, Htank, dishH, clear, Dcoil, OD, B_total, gap, starts, coilType, turnsPerStart, coilHeight, thermalArea_ft2: area_ft2, thermalArea_m2: area_m2, innerVol, fits};
    autoSave();
  } catch(e) { console.error('updateCoilDesign:', e); }
}

function saveCoilDesign(){
  if(!window._lastCoilDesign){ alert('ابتدا طراحی کن'); return; }
  const d = window._lastCoilDesign;
  const name = prompt('نام طراحی:', `کویل ${d.Dcoil}mm × ${d.turnsPerStart.toFixed(1)}دور`);
  if(!name) return;
  try {
    let list = JSON.parse(localStorage.getItem(COIL_HISTORY_KEY) || '[]');
    list.unshift({id:'coil_'+Date.now(), name, date:persianDate(), data:d});
    if(list.length > 100) list = list.slice(0, 100);
    localStorage.setItem(COIL_HISTORY_KEY, JSON.stringify(list));
    alert('ذخیره شد!');
  } catch(e) { alert('خطا'); }
}

/* ============ Head History ============ */
function saveHeadToHistory(D, h, L, t, blank, note){
  try {
    let list = JSON.parse(localStorage.getItem(HEAD_HISTORY_KEY) || '[]');
    list.unshift({id:'h_'+Date.now(), D, h, L, t, blank, note:note||'', date:persianDate()});
    if(list.length > 200) list = list.slice(0, 200);
    localStorage.setItem(HEAD_HISTORY_KEY, JSON.stringify(list));
    return true;
  } catch(e) { return false; }
}
function loadHeadHistory(){
  try { return JSON.parse(localStorage.getItem(HEAD_HISTORY_KEY) || '[]'); } catch(e) { return []; }
}
function getHeadSuggestions(D){
  const list = loadHeadHistory();
  if(!list.length) return null;
  const similar = list.filter(x => Math.abs(x.D - D) / D < 0.1);
  if(!similar.length) return null;
  const avgH = similar.reduce((s,x)=>s+x.h, 0) / similar.length;
  const avgL = similar.reduce((s,x)=>s+x.L, 0) / similar.length;
  return { h: Math.round(avgH), L: Math.round(avgL), count: similar.length };
}
function saveHeadCalc(){
  const D=val('h-d'), h=val('h-h'), L=val('h-l')||0, t=val('h-t')||6;
  if(!(D>0&&h>0))return;
  const res = calcBlank(D,h,L,t,document.getElementById('h-type').value);
  const note = prompt('Note:', '');
  if(saveHeadToHistory(D, h, L, t, Math.round(res.Db), note)){
    renderMemory();
    alert('ذخیره شد!');
  }
}

/* ============ Tab 8: Order ============ */
function setOrderMode(mode){
  ORDER_MODE.current = mode;
  document.querySelectorAll('#t8 .mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  document.querySelectorAll('#t8 .mode-body').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('ro-fields-' + mode);
  if(el) el.classList.add('active');
}

function getSheetWidthFromEl(selId, customId){
  const sel = document.getElementById(selId);
  if(!sel) return 1500;
  if(sel.value === 'custom'){
    const c = document.getElementById(customId);
    return (parseFloat(c?.value) || 150) * 10;
  }
  return parseFloat(sel.value) * 10;
}

function calcOrderReverse(){
  const V = parseFloat(document.getElementById('ro-v').value) || 0;
  const out = document.getElementById('ro-res');
  const mode = ORDER_MODE.current;
  if(!(V>0)){ out.innerHTML = '<div class="info-box red">ظرفیت</div>'; return; }

  if(mode === 'B'){
    const H_input = parseFloat(document.getElementById('ro-h').value) || 0;
    const sheetWidth = getSheetWidthFromEl('ro-w-b', 'ro-w-b-custom');
    if(!(H_input>0)){ out.innerHTML = '<div class="info-box red">ارتفاع</div>'; return; }
    renderOrderResult(V, H_input, sheetWidth);
    return;
  }
  if(mode === 'C'){
    const D_input = parseFloat(document.getElementById('ro-d').value) || 0;
    const sheetWidth = getSheetWidthFromEl('ro-w-c', 'ro-w-c-custom');
    if(!(D_input>0)){ out.innerHTML = '<div class="info-box red">قطر</div>'; return; }
    const H_req = hFromV(V, D_input, 'torisph');
    if(!(H_req > 0)){ out.innerHTML = '<div class="info-box red">ممکن نیست</div>'; return; }
    renderOrderResult(V, H_req, sheetWidth);
    return;
  }
  const sheetWidth = getSheetWidthFromEl('ro-w-a', 'ro-w-a-custom');
  let best = null;
  for(let n=1;n<=15;n++){
    const Hf = n * sheetWidth;
    const Df = diamFromV(V, Hf, 'torisph');
    const C = Math.PI * Df;
    const m = Math.ceil(C / 6000);
    const waste = n*(m*6000 - C);
    const pct = waste / (n*m*6000) * 100;
    if(!best || pct < best.pct) best = {n, H:Hf, D:Df, C, m, waste, pct};
  }
  renderOrderResult(V, best.H, sheetWidth);
}

function renderOrderResult(V, H_input, sheetWidth){
  const out = document.getElementById('ro-res');
  const w = sheetWidth;
  const D_req = diamFromV(V, H_input, 'torisph');
  const n_courses = Math.ceil(H_input / w);
  const H_actual = n_courses * w;
  const D_actual = diamFromV(V, H_actual, 'torisph');
  const C_actual = Math.PI * D_actual;
  const n_sheets_per_course = Math.ceil(C_actual / 6000);
  const totalSheetArea = n_courses * n_sheets_per_course * (w/1000) * 6;
  const usedArea = n_courses * C_actual * (w/1000) / 1e6;
  const wastePct = (1 - usedArea / totalSheetArea) * 100;
  const nearestModel = findNearestCatalogModel(V);
  let html = `<div class="res-summary green">
    <div class="lbl">Required Diameter</div>
    <div class="val">${fmt(D_req,1)}</div>
    <div class="unit">mm (برای H=${fmt(H_input,0)}mm)</div>
  </div>
  <div class="schematic">${generateTankSVG(D_actual, H_actual, `مخزن ${fmt(V,0)}L`)}</div>
  <div class="info-box green">
    <div class="res-row big"><span class="lbl"><b>قطر لازم</b></span><span class="val">${fmt(D_req,1)} mm</span></div>
    <div class="res-row"><span class="lbl">کورس</span><span class="val">${n_courses}</span></div>
    <div class="res-row"><span class="lbl">ارتفاع نهایی</span><span class="val">${fmt(H_actual,0)} mm</span></div>
    <div class="res-row"><span class="lbl">پرت</span><span class="val">${fmt(wastePct,1)}%</span></div>
  </div>`;
  if(nearestModel){
    html += `<div class="info-box"><b>نزدیک‌ترین مدل:</b> ${nearestModel.model} — ${nearestModel.capacity}L</div>`;
  }
  out.innerHTML = html;
}

function findNearestCatalogModel(V){
  if(!CATALOG || !CATALOG.categories) return null;
  let best = null;
  for(const catKey in CATALOG.categories){
    const cat = CATALOG.categories[catKey];
    if(!cat.rows) continue;
    cat.rows.forEach(r => {
      const cap = parseFloat(r[1]);
      if(!cap) return;
      const diff = Math.abs(cap - V);
      if(!best || diff < best.diff){
        best = {diff, model: r[0], capacity: cap, D: r[cat.mainD] || '', H: r[cat.mainH] || ''};
      }
    });
  }
  return (best && best.diff / V < 0.3) ? best : null;
}

/* ============ Tab 3: Sheet Optimization ============ */
function optSheets(){
  const V=val('s-v');
  const wSel=document.getElementById('s-w').value;
  const customW = parseFloat(document.getElementById('s-w-custom')?.value) || 150;
  const L=val('s-l')||6000;
  const maxN=parseInt(document.getElementById('s-max').value)||10;
  const forcedH = val('s-forced-h') || 0;
  const out=document.getElementById('s-res');
  if(!(V>0)){out.innerHTML='<div class="info-box red">ظرفیت</div>';return;}
  let widthsCm;
  if(wSel === 'both') widthsCm = [150, 152];
  else if(wSel === 'custom') widthsCm = [customW];
  else widthsCm = [parseFloat(wSel)];
  const rows=[];
  for(const wCm of widthsCm){
    const w = wCm * 10;
    let nStart = 1, nEnd = maxN;
    if(forcedH > 0){
      const nExact = Math.ceil(forcedH / w);
      nStart = nExact; nEnd = nExact;
    }
    for(let n=nStart;n<=nEnd;n++){
      const H=n*w;
      const D=diamFromV(V,H,'torisph');
      const C=Math.PI*D;
      const m=Math.ceil(C/L);
      const sheets=n*m;
      const waste=n*(m*L-C);
      const pct=waste/(sheets*L)*100;
      rows.push({wCm,n,H,D,C,m,sheets,waste,pct});
    }
  }
  rows.sort((a,b)=>Math.abs(a.pct-b.pct)>0.01?a.pct-b.pct:a.sheets-b.sheets);
  let html = '<div style="overflow-x:auto"><table><thead><tr><th>عرض</th><th>کورس</th><th>ارتفاع</th><th>قطر</th><th>ورق</th><th>پرت</th></tr></thead><tbody>';
  rows.slice(0,15).forEach(r=>{
    html += `<tr><td>${r.wCm} cm</td><td>${r.n}</td><td>${fmt(r.H,0)}</td><td>${fmt(r.D,1)}</td><td>${r.m}</td><td>${fmt(r.pct,1)}%</td></tr>`;
  });
  html += '</tbody></table></div>';
  out.innerHTML = html;
  autoSave();
}

function compareFourScenarios(){
  const V = val('s-v');
  const L = val('s-l') || 6000;
  const out = document.getElementById('cs-res');
  if(!(V>0)){ out.innerHTML = '<div class="info-box red">ظرفیت</div>'; return; }
  const widths = [1500, 1520, 2000, 2500];
  const labels = ['ورق 150 cm', 'ورق 152 cm', 'ورق 200 cm', 'ورق 250 cm'];
  const results = [];
  widths.forEach((w, idx) => {
    let best = null;
    for(let n=1;n<=15;n++){
      const Hf = n*w;
      const Df = diamFromV(V, Hf, 'torisph');
      const C = Math.PI*Df;
      const m = Math.ceil(C/L);
      const sheets = n*m;
      const waste = n*(m*L - C);
      const pct = waste / (sheets*L) * 100;
      if(!best || pct < best.pct) best = {n, H:Hf, D:Df, C, m, sheets, waste, pct, w};
    }
    results.push({label: labels[idx], ...best});
  });
  const bestIdx = results.reduce((best_i, r, i, arr) => r.pct < arr[best_i].pct ? i : best_i, 0);
  let html = '<div class="compare-wrap" style="margin-top:12px">';
  results.forEach((r, i) => {
    const isBest = i === bestIdx;
    const cls = isBest ? 'compare-col best-col' : 'compare-col';
    html += `<div class="${cls}">
      <h4>${isBest?'✅ ':''}${r.label}</h4>
      <div class="compare-row"><span class="lbl">کورس</span><span class="val">${r.n}</span></div>
      <div class="compare-row"><span class="lbl">ارتفاع</span><span class="val">${fmt(r.H,0)}</span></div>
      <div class="compare-row"><span class="lbl">قطر</span><span class="val">${fmt(r.D,1)}</span></div>
      <div class="compare-row"><span class="lbl">ورق</span><span class="val">${r.sheets}</span></div>
      <div class="compare-row"><span class="lbl">پرت</span><span class="val">${fmt(r.pct,1)}%</span></div>
    </div>`;
  });
  html += '</div>';
  out.innerHTML = html;
}

/* ============ Memory ============ */
function saveCalculation(type, name, inputs, outputs){
  try{
    let list = JSON.parse(localStorage.getItem('csp_calcs')||'[]');
    list.unshift({id:'c_'+Date.now(), type, name, date:persianDate(), inputs, outputs});
    if(list.length>100) list=list.slice(0,100);
    localStorage.setItem('csp_calcs', JSON.stringify(list));
    return true;
  }catch(e){return false;}
}
function loadCalculations(){try{return JSON.parse(localStorage.getItem('csp_calcs')||'[]');}catch(e){return [];}}

function renderMemory(){
  const list = loadCalculations();
  const el = document.getElementById('mem-list');
  if(!el) return;
  const headHist = loadHeadHistory();
  const coilHist = (()=>{try{return JSON.parse(localStorage.getItem(COIL_HISTORY_KEY)||'[]');}catch(e){return [];}})();
  const realHead = (()=>{try{return JSON.parse(localStorage.getItem(REAL_HEAD_KEY)||'[]');}catch(e){return [];}})();
  let html = '';
  if(realHead.length){
    html += '<div class="section-title">تاریخچه پرس واقعی</div>';
    realHead.slice(0,10).forEach(h=>{
      html += `<div class="save-row"><div class="info"><b>D: ${h.D_design}→${h.D_actual} / h: ${h.h_design}→${h.h_actual}</b><br>Springback: ${h.springback.toFixed(2)}% — ${h.date}</div>
        <button onclick="delRealHead('${h.id}')">حذف</button></div>`;
    });
  }
  if(headHist.length){
    html += '<div class="section-title">تاریخچه عدسی</div>';
    headHist.slice(0,10).forEach(h=>{
      html += `<div class="save-row"><div class="info"><b>D=${h.D} / h=${h.h} / L=${h.L}</b><br>گسترده ${h.blank}mm — ${h.date}</div>
        <button onclick="delHead('${h.id}')">حذف</button></div>`;
    });
  }
  if(coilHist.length){
    html += '<div class="section-title">تاریخچه کویل</div>';
    coilHist.slice(0,10).forEach(c=>{
      const d = c.data;
      html += `<div class="save-row"><div class="info"><b>${c.name}</b><br>قطر ${d.Dcoil}mm — ${d.turnsPerStart.toFixed(1)} دور — ${c.date}</div>
        <button onclick="delCoil('${c.id}')">حذف</button></div>`;
    });
  }
  if(list.length){
    html += '<div class="section-title">محاسبات ذخیره‌شده</div>';
    list.forEach(c=>{
      html += `<div class="save-row"><div class="info"><b>${c.name}</b><br>${c.type} — ${c.date}</div>
        <button onclick="delCalc('${c.id}')">حذف</button></div>`;
    });
  }
  if(!list.length && !headHist.length && !coilHist.length && !realHead.length){
    html = '<div class="empty-state">محاسبه‌ای ذخیره نشده</div>';
  }
  el.innerHTML = html;
}
function delCalc(id){
  if(!confirm('حذف؟'))return;
  let list = loadCalculations().filter(c=>c.id!==id);
  localStorage.setItem('csp_calcs', JSON.stringify(list));
  renderMemory();
}
function delHead(id){
  if(!confirm('حذف؟'))return;
  let list = loadHeadHistory().filter(c=>c.id!==id);
  localStorage.setItem(HEAD_HISTORY_KEY, JSON.stringify(list));
  renderMemory();
}
function delCoil(id){
  if(!confirm('حذف؟'))return;
  let list = (()=>{try{return JSON.parse(localStorage.getItem(COIL_HISTORY_KEY)||'[]');}catch(e){return [];}})();
  list = list.filter(c=>c.id!==id);
  localStorage.setItem(COIL_HISTORY_KEY, JSON.stringify(list));
  renderMemory();
}
function delRealHead(id){
  if(!confirm('حذف؟'))return;
  let list = (()=>{try{return JSON.parse(localStorage.getItem(REAL_HEAD_KEY)||'[]');}catch(e){return [];}})();
  list = list.filter(c=>c.id!==id);
  localStorage.setItem(REAL_HEAD_KEY, JSON.stringify(list));
  renderMemory();
}
function clearMemory(){
  if(!confirm('همه پاک شوند؟'))return;
  localStorage.removeItem('csp_calcs');
  localStorage.removeItem(HEAD_HISTORY_KEY);
  localStorage.removeItem(COIL_HISTORY_KEY);
  localStorage.removeItem(REAL_HEAD_KEY);
  renderMemory();
}
function exportMemory(){
  const list = loadCalculations();
  const heads = loadHeadHistory();
  const coils = (()=>{try{return JSON.parse(localStorage.getItem(COIL_HISTORY_KEY)||'[]');}catch(e){return [];}})();
  const realH = (()=>{try{return JSON.parse(localStorage.getItem(REAL_HEAD_KEY)||'[]');}catch(e){return [];}})();
  let csv = 'Type,Data,Date\n';
  list.forEach(c=>{csv += `"calc","${c.name}","${c.date}"\n`;});
  heads.forEach(h=>{csv += `"head","D=${h.D}/h=${h.h}/L=${h.L}","${h.date}"\n`;});
  coils.forEach(c=>{const d=c.data;csv += `"coil","${c.name}/D=${d.Dcoil}","${c.date}"\n`;});
  realH.forEach(h=>{csv += `"realhead","${h.D_design}->${h.D_actual},sb=${h.springback.toFixed(2)}%","${h.date}"\n`;});
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'calculations.csv';
  a.click();
}

/* ============================================================
   ═══ تب ASME (گروه ۱) ═══
   ============================================================ */
function calcASME(){
  const P = val('asme-p');       // فشار طراحی bar
  const D = val('asme-d');       // قطر داخلی mm
  const t = val('asme-t');       // ضخامت فعلی mm
  const S = val('asme-s');       // تنش مجاز MPa
  const E = val('asme-e');       // راندمان جوش
  const CA = val('asme-ca');     // خوردگی mm
  const temp = val('asme-temp'); // دما
  const headType = document.getElementById('asme-head-type')?.value || 'torisph';
  const mat = document.getElementById('asme-mat')?.value || 'ST37';
  const out = document.getElementById('asme-res');
  
  if(!(P>0 && D>0)){
    out.innerHTML = '<div class="info-box red">فشار و قطر را وارد کن</div>';
    return;
  }
  
  const P_MPa = P / 10; // bar → MPa
  const S_allow = S || (MAT_ASME[mat]?.S || 120);
  
  // ASME UG-27 (پوسته استوانه — تنش محیطی)
  // t = PR / (SE - 0.6P)
  const R = D / 2;
  const t_circ = (P_MPa * R) / (S_allow * E - 0.6 * P_MPa);
  // تنش طولی
  const t_long = (P_MPa * R) / (2 * S_allow * E + 0.4 * P_MPa);
  const t_req = Math.max(t_circ, t_long) + CA;
  const t_design = t || t_req;
  
  // MAWP — Maximum Allowable Working Pressure
  const MAWP_circ = (S_allow * E * t_design) / (R + 0.6 * t_design);
  const MAWP_long = (2 * S_allow * E * t_design) / (R - 0.4 * t_design);
  const MAWP_MPa = Math.min(MAWP_circ, MAWP_long);
  const MAWP_bar = MAWP_MPa * 10;
  
  // ضخامت عدسی — UG-32
  let t_head = 0;
  if(headType === 'hemi'){
    t_head = (P_MPa * R) / (2 * S_allow * E - 0.2 * P_MPa);
  } else if(headType === 'ellip'){
    // K = (1/6) * (2 + (D/2h)^2) — برای 2:1 K=1
    t_head = (P_MPa * D) / (2 * S_allow * E - 0.2 * P_MPa) * 1.0;
  } else {
    // torisph
    t_head = (0.885 * P_MPa * D) / (S_allow * E - 0.1 * P_MPa);
  }
  const t_head_req = t_head + CA;
  
  // Hydrotest
  const hydrotest_bar = MAWP_bar * 1.3;
  
  // D/t ratio
  const Dt_ratio = D / t_design;
  
  // هشدارها
  const warnings = [];
  if(t > 0 && t < t_req) warnings.push({lvl:'red', msg:`ضخامت فعلی (${t}mm) کمتر از حداقل مورد نیاز (${t_req.toFixed(2)}mm) است!`});
  if(Dt_ratio > 500) warnings.push({lvl:'yellow', msg:`نسبت D/t = ${Dt_ratio.toFixed(0)} بالاست — احتمال کمانش`});
  if(MAWP_bar < P) warnings.push({lvl:'red', msg:`MAWP (${MAWP_bar.toFixed(1)} bar) کمتر از فشار طراحی (${P} bar)`});
  if(temp > 300) warnings.push({lvl:'yellow', msg:`دمای بالا — تنش مجاز باید کاهش یابد`});
  
  out.innerHTML = `<div class="res-summary" style="border-color:var(--info)">
    <div class="lbl">Required Shell Thickness</div>
    <div class="val">${t_req.toFixed(2)}</div>
    <div class="unit">mm (با خوردگی ${CA}mm)</div>
  </div>
  <div class="info-box violet">
    <b>🔬 محاسبه پوسته (ASME VIII Div.1 UG-27)</b>
    <div class="res-row"><span class="lbl">فشار طراحی</span><span class="val">${P} bar (${P_MPa.toFixed(3)} MPa)</span></div>
    <div class="res-row"><span class="lbl">قطر داخلی</span><span class="val">${D} mm</span></div>
    <div class="res-row"><span class="lbl">تنش مجاز S</span><span class="val">${S_allow} MPa</span></div>
    <div class="res-row"><span class="lbl">راندمان جوش E</span><span class="val">${E}</span></div>
    <div class="res-row"><span class="lbl">ضخامت محیطی (t_circ)</span><span class="val">${t_circ.toFixed(3)} mm</span></div>
    <div class="res-row"><span class="lbl">ضخامت طولی (t_long)</span><span class="val">${t_long.toFixed(3)} mm</span></div>
    <div class="res-row big"><span class="lbl"><b>ضخامت + خوردگی</b></span><span class="val">${t_req.toFixed(2)} mm</span></div>
    <div class="res-row"><span class="lbl">ضخامت انتخابی</span><span class="val">${t_design.toFixed(2)} mm</span></div>
    <div class="res-row big"><span class="lbl"><b>MAWP</b></span><span class="val" style="color:${MAWP_bar>=P?'var(--ok-2)':'var(--err-2)'}">${MAWP_bar.toFixed(2)} bar</span></div>
    <div class="res-row"><span class="lbl">Hydrotest (1.3×MAWP)</span><span class="val">${hydrotest_bar.toFixed(1)} bar</span></div>
    <div class="res-row"><span class="lbl">نسبت D/t</span><span class="val">${Dt_ratio.toFixed(0)}</span></div>
  </div>
  <div class="info-box yellow">
    <b>🍽️ عدسی (UG-32)</b>
    <div class="res-row"><span class="lbl">نوع عدسی</span><span class="val">${headType}</span></div>
    <div class="res-row"><span class="lbl">ضخامت عدسی مورد نیاز</span><span class="val">${t_head.toFixed(3)} mm</span></div>
    <div class="res-row big"><span class="lbl"><b>با خوردگی</b></span><span class="val">${t_head_req.toFixed(2)} mm</span></div>
  </div>
  ${warnings.map(w => `<div class="info-box ${w.lvl}">${w.lvl==='red'?'🔴':'⚠️'} ${w.msg}</div>`).join('')}`;
}

/* ============================================================
   ═══ تب کارگاه (گروه ۲) ═══
   ============================================================ */
function calcWorkshopIntelligence(){
  const shellT = val('wi-t');
  const shellD = val('wi-d');
  const weldLength = val('wi-weld-len');
  const jointType = document.getElementById('wi-joint')?.value || 'butt';
  const mat = document.getElementById('wi-mat')?.value || 'ST37';
  const out = document.getElementById('wi-res');
  
  if(!(shellT>0)){
    out.innerHTML = '<div class="info-box red">ضخامت پوسته را وارد کن</div>';
    return;
  }
  
  // محاسبه زمان جوش
  const passes = shellT <= 6 ? 1 : shellT <= 12 ? 2 : shellT <= 20 ? 3 : 4;
  const weldSpeed = 200; // mm/min
  const weldTime_min = (weldLength / weldSpeed) * passes;
  const weldTime_hr = weldTime_min / 60;
  
  // Heat Input
  const current = 180; // Ampere
  const voltage = 24;  // Volt
  const travelSpeed = 3; // mm/s
  const heatInput = (60 * current * voltage) / (1000 * travelSpeed); // kJ/mm
  const heatInput_ok = heatInput >= 0.5 && heatInput <= 2.5;
  
  // PWHT check
  const pWHT_required = shellT > 32;
  
  // Electrode
  const electrode_kg = (weldLength / 1000) * shellT * 0.008;
  
  // Welding sequence
  let sequence = [];
  if(jointType === 'butt'){
    sequence = ['پیش‌گرمایش (اگر لازم)', 'پاس ریشه (Root)', passes>1?'پاس پرکننده (Fill)':'', passes>2?'پاس رویه (Cap)':'', 'بازرسی چشمی', 'PT یا RT'];
  } else if(jointType === 'fillet'){
    sequence = ['تمیزکاری', 'پاس اول (تک‌پاس)', 'بازرسی چشمی', 'در صورت نیاز پاس دوم'];
  } else {
    sequence = ['پیش‌گرمایش', 'پاس اول از وسط', 'پاس‌های متناوب', 'کنترل اعوجاج', 'بازرسی'];
  }
  sequence = sequence.filter(x => x);
  
  out.innerHTML = `<div class="res-summary" style="border-color:var(--ok)">
    <div class="lbl">Weld Time</div>
    <div class="val">${weldTime_hr.toFixed(1)}</div>
    <div class="unit">ساعت</div>
  </div>
  <div class="info-box green">
    <b>⚙️ اطلاعات جوش</b>
    <div class="res-row"><span class="lbl">ضخامت پوسته</span><span class="val">${shellT} mm</span></div>
    <div class="res-row"><span class="lbl">نوع اتصال</span><span class="val">${jointType === 'butt' ? 'لب‌به‌لب (Butt)' : jointType === 'fillet' ? 'گوشه (Fillet)' : 'T-Joint'}</span></div>
    <div class="res-row"><span class="lbl">تعداد پاس</span><span class="val">${passes}</span></div>
    <div class="res-row"><span class="lbl">طول جوش</span><span class="val">${fmt(weldLength,0)} mm</span></div>
    <div class="res-row big"><span class="lbl"><b>زمان جوش</b></span><span class="val" style="color:var(--ok-2)">${weldTime_hr.toFixed(1)} ساعت</span></div>
    <div class="res-row"><span class="lbl">مصرف الکترود</span><span class="val">${electrode_kg.toFixed(2)} kg</span></div>
  </div>
  <div class="info-box ${heatInput_ok?'green':'yellow'}">
    <b>🔥 Heat Input</b>
    <div class="res-row"><span class="lbl">جریان × ولتاژ</span><span class="val">${current}A × ${voltage}V</span></div>
    <div class="res-row"><span class="lbl">سرعت حرکت</span><span class="val">${travelSpeed} mm/s</span></div>
    <div class="res-row big"><span class="lbl"><b>Heat Input</b></span><span class="val" style="color:${heatInput_ok?'var(--ok-2)':'var(--warn-2)'}">${heatInput.toFixed(2)} kJ/mm</span></div>
    <div class="res-row" style="font-size:11px">${heatInput_ok?'✅ در محدوده استاندارد (0.5-2.5)':'⚠️ خارج از محدوده پیشنهادی'}</div>
  </div>
  ${pWHT_required ? `<div class="info-box red"><b>🔥 PWHT لازم است</b> — ضخامت بیش از 32mm. دمای پیشنهادی: 620-680°C برای ${mat}</div>` : `<div class="info-box green"><b>✅ PWHT لازم نیست</b> — ضخامت زیر حد آستانه</div>`}
  <div class="info-box violet">
    <b>📋 توالی پیشنهادی جوش</b>
    ${sequence.map((s,i) => `<div class="res-row"><span class="lbl">مرحله ${i+1}</span><span class="val">${s}</span></div>`).join('')}
  </div>
  <div class="info-box yellow">
    <b>⚡ چک‌لیست کیفیت</b>
    <div class="res-row"><span class="lbl">بازرسی چشمی (VT)</span><span class="val">الزامی</span></div>
    <div class="res-row"><span class="lbl">مایع نافذ (PT)</span><span class="val">${shellT > 8 ? 'الزامی' : 'اختیاری'}</span></div>
    <div class="res-row"><span class="lbl">رادیوگرافی (RT)</span><span class="val">${shellT > 20 ? 'الزامی' : 'نمونه‌ای'}</span></div>
    <div class="res-row"><span class="lbl">تست فشار (Hydro)</span><span class="val">پس از تکمیل</span></div>
  </div>`;
}

/* ============================================================
   ═══ تب بصری (گروه ۴) ═══
   ============================================================ */
let VISUAL_STATE = {
  rotate: 0,
  crossSection: 50,
  mode: '3d'
};

function draw3DCoil(){
  const Dtank = val('vis-Dtank') || 1400;
  const Htank = val('vis-Htank') || 2000;
  const Dcoil = val('vis-Dcoil') || 1200;
  const turns = val('vis-turns') || 13;
  const svg = document.getElementById('vis-schematic');
  if(!svg) return;
  
  const angle = VISUAL_STATE.rotate;
  const cosA = Math.cos(angle * Math.PI / 180);
  const sinA = Math.sin(angle * Math.PI / 180);
  const tiltX = 0.35;
  
  const vbW = 700, vbH = 600;
  const scale = Math.min(400 / Dtank, 450 / Htank, 0.35);
  const DtankPx = Dtank * scale;
  const HtankPx = Htank * scale;
  const DcoilPx = Dcoil * scale;
  const cx = vbW / 2;
  const cyTop = 80;
  
  // نقاط کویل 3D
  const segments = 200;
  const points3D = [];
  for(let i = 0; i <= segments; i++){
    const t = i / segments;
    const a = 2 * Math.PI * turns * t;
    const r = DcoilPx / 2;
    let x3 = r * Math.cos(a);
    let z3 = r * Math.sin(a);
    let y3 = HtankPx * 0.1 + t * HtankPx * 0.8;
    // چرخش حول محور Y
    const xr = x3 * cosA - z3 * sinA;
    const zr = x3 * sinA + z3 * cosA;
    // پروجکشن
    const px = cx + xr;
    const py = cyTop + y3 + zr * tiltX;
    const depth = zr;
    points3D.push({x:px, y:py, depth});
  }
  
  let svgContent = `<svg viewBox="0 0 ${vbW} ${vbH}" style="max-width:${vbW}px;width:100%;height:auto;background:var(--surface-2);border-radius:12px">`;
  svgContent += `<defs>
    <linearGradient id="coil3d" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFB380"/>
      <stop offset="50%" stop-color="#FF6B1A"/>
      <stop offset="100%" stop-color="#E04E00"/>
    </linearGradient>
  </defs>`;
  
  // خطوط مخزن
  svgContent += `<rect x="${cx - DtankPx/2}" y="${cyTop}" width="${DtankPx}" height="${HtankPx}" 
                 fill="none" stroke="#3F3A32" stroke-width="2" opacity="0.3" rx="8"/>`;
  
  // مرتب‌سازی نقاط بر اساس depth
  const sortedPoints = [...points3D].map((p,i)=>({...p, idx:i})).sort((a,b)=>a.depth - b.depth);
  
  for(let i = 0; i < sortedPoints.length - 1; i++){
    const p1 = sortedPoints[i], p2 = sortedPoints[i+1];
    if(Math.abs(p1.idx - p2.idx) > 5) continue;
    const opacity = 0.3 + 0.7 * (p1.depth + DtankPx/2) / DtankPx;
    const width = 3 + 3 * (p1.depth + DtankPx/2) / DtankPx;
    svgContent += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" 
                   stroke="url(#coil3d)" stroke-width="${width.toFixed(1)}" stroke-linecap="round" opacity="${opacity.toFixed(2)}"/>`;
  }
  
  svgContent += `<text x="${cx}" y="30" text-anchor="middle" font-family="Vazirmatn" font-size="14" font-weight="800" fill="#1F1A12">
    نمای 3D کویل — چرخش: ${angle.toFixed(0)}°
  </text>`;
  svgContent += '</svg>';
  svg.innerHTML = svgContent;
}

function rotate3D(delta){
  VISUAL_STATE.rotate = (VISUAL_STATE.rotate + delta) % 360;
  draw3DCoil();
}

function drawCrossSection(){
  const Dtank = val('vis-Dtank') || 1400;
  const Htank = val('vis-Htank') || 2000;
  const Dcoil = val('vis-Dcoil') || 1200;
  const cut = VISUAL_STATE.crossSection;
  const svg = document.getElementById('vis-schematic');
  if(!svg) return;
  
  const vbW = 700, vbH = 600;
  const scale = Math.min(400 / Dtank, 450 / Htank, 0.35);
  const DtankPx = Dtank * scale;
  const HtankPx = Htank * scale;
  const DcoilPx = Dcoil * scale;
  const cx = vbW / 2;
  const cyTop = 80;
  
  // خط برش
  const cutX = cx - DtankPx/2 + (DtankPx * cut / 100);
  
  let svgContent = `<svg viewBox="0 0 ${vbW} ${vbH}" style="max-width:${vbW}px;width:100%;height:auto;background:var(--surface-2);border-radius:12px">`;
  
  // مخزن
  svgContent += `<rect x="${cx - DtankPx/2}" y="${cyTop}" width="${DtankPx}" height="${HtankPx}" 
                 fill="#FAF6EB" stroke="#3F3A32" stroke-width="2" rx="8"/>`;
  
  // کویل (فقط نقاط سمت چپ برش)
  const segments = 60;
  for(let i = 0; i < segments; i++){
    const y = cyTop + 40 + (HtankPx - 80) * (i / segments);
    const coilLeft = cx - DcoilPx/2;
    const coilRight = cx + DcoilPx/2;
    svgContent += `<circle cx="${coilLeft}" cy="${y.toFixed(1)}" r="6" fill="#FF6B1A" stroke="#fff" stroke-width="2"/>`;
    svgContent += `<circle cx="${coilRight}" cy="${y.toFixed(1)}" r="6" fill="#FF6B1A" stroke="#fff" stroke-width="2"/>`;
  }
  
  // خط برش
  svgContent += `<line x1="${cutX}" y1="${cyTop - 10}" x2="${cutX}" y2="${cyTop + HtankPx + 10}" 
                 stroke="#EF4444" stroke-width="3" stroke-dasharray="10 5"/>`;
  svgContent += `<text x="${cutX + 10}" y="${cyTop - 15}" font-family="Vazirmatn" font-size="12" font-weight="800" fill="#EF4444">خط برش</text>`;
  
  // هاشور سمت راست
  svgContent += `<rect x="${cutX}" y="${cyTop}" width="${cx + DtankPx/2 - cutX}" height="${HtankPx}" 
                 fill="url(#hatch)" opacity="0.15"/>`;
  svgContent += `<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="10" stroke="#666" stroke-width="1"/>
  </pattern></defs>`;
  
  svgContent += `<text x="${cx}" y="30" text-anchor="middle" font-family="Vazirmatn" font-size="14" font-weight="800" fill="#1F1A12">
    نمای برش — موقعیت: ${cut}%
  </text>`;
  svgContent += '</svg>';
  svg.innerHTML = svgContent;
}

function setVisualMode(mode){
  VISUAL_STATE.mode = mode;
  document.querySelectorAll('#t14 .mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  if(mode === '3d') draw3DCoil();
  else if(mode === 'cross') drawCrossSection();
  else drawAnimation();
}

function drawAnimation(){
  const svg = document.getElementById('vis-schematic');
  if(!svg) return;
  const steps = [
    {t:'۱. برش ورق', d:'ورق طبق Blank برش داده می‌شود', c:'#3B82F6'},
    {t:'۲. پرس اولیه', d:'ورق در قالب پرس اولیه قرار می‌گیرد', c:'#8B5CF6'},
    {t:'۳. پرس نهایی', d:'عدسی شکل می‌گیرد', c:'#FF6B1A'},
    {t:'۴. جوش بدنه', d:'عدسی‌ها به پوسته جوش می‌شوند', c:'#F59E0B'},
    {t:'۵. تست', d:'تست هیدرواستاتیک و بازرسی', c:'#10B981'}
  ];
  let html = `<svg viewBox="0 0 700 400" style="max-width:700px;width:100%;height:auto;background:var(--surface-2);border-radius:12px">`;
  steps.forEach((s, i) => {
    const x = 60 + i * 130;
    const y = 150;
    html += `<circle cx="${x}" cy="${y}" r="40" fill="${s.c}" opacity="0.15"/>`;
    html += `<circle cx="${x}" cy="${y}" r="40" fill="none" stroke="${s.c}" stroke-width="2"/>`;
    html += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-family="Vazirmatn" font-size="20" font-weight="800" fill="${s.c}">${i+1}</text>`;
    if(i < steps.length - 1){
      html += `<path d="M${x+45} ${y} L${x+85} ${y}" stroke="${s.c}" stroke-width="2" marker-end="url(#arrowAnim)" opacity="0.5"/>`;
    }
    html += `<text x="${x}" y="${y + 70}" text-anchor="middle" font-family="Vazirmatn" font-size="11" font-weight="700" fill="#1F1A12">${s.t}</text>`;
    html += `<text x="${x}" y="${y + 90}" text-anchor="middle" font-family="Vazirmatn" font-size="9" fill="#7A6D57">${s.d}</text>`;
  });
  html += `<defs><marker id="arrowAnim" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#7A6D57" opacity="0.5"/></marker></defs>`;
  html += `<text x="350" y="40" text-anchor="middle" font-family="Vazirmatn" font-size="14" font-weight="800" fill="#1F1A12">مراحل ساخت مخزن</text>`;
  html += `</svg>`;
  svg.innerHTML = html;
}

/* ============ Firebase ============ */
async function syncFromFirebase(){
  if(typeof loadPricesFromFirebase !== 'function'){ alert('Firebase فعال نیست'); return; }
  const remote = await loadPricesFromFirebase();
  if(remote){PRICES = Object.assign({},window.EMBEDDED_PRICES,remote); renderPriceEditor(); showStatus('success','دریافت شد');}
  else showStatus('warn','داده نیست');
}
async function syncToFirebase(){
  if(typeof savePricesToFirebase !== 'function'){ alert('Firebase فعال نیست'); return; }
  PRICES.version = 'cloud_'+Date.now();
  const ok = await savePricesToFirebase(PRICES);
  showStatus(ok?'success':'warn', ok?'ارسال شد':'خطا');
}

/* ============ Price Editor ============ */
function renderPriceEditor(){
  const c = document.getElementById('price-editor');
  if(!c) return;
  let html = '';
  html += '<div class="price-section-title">ورق‌ها</div>';
  for(const k in PRICES.sheets) html += `<div class="price-row"><label>${k}</label><input type="number" data-cat="sheets" data-key="${k}" value="${PRICES.sheets[k]}"></div>`;
  html += '<div class="price-section-title">لوله‌ها</div>';
  for(const k in PRICES.pipes) html += `<div class="price-row"><label>${k}</label><input type="number" data-cat="pipes" data-key="${k}" value="${PRICES.pipes[k]}"></div>`;
  html += '<div class="price-section-title">بوشن</div>';
  for(const k in PRICES.bushings) html += `<div class="price-row"><label>${k}</label><input type="number" data-cat="bushings" data-key="${k}" value="${PRICES.bushings[k]}"></div>`;
  html += '<div class="price-section-title">فلنج</div>';
  for(const k in PRICES.flanges) html += `<div class="price-row"><label>${k}</label><input type="number" data-cat="flanges" data-key="${k}" value="${PRICES.flanges[k]}"></div>`;
  html += '<div class="price-section-title">⚙️ تنظیمات کارگاه</div>';
  html += `<div class="price-row"><label>حداکثر ضخامت پایه</label><input type="number" id="ws-maxBaseThickness" value="${WORKSHOP.maxBaseThickness}"></div>`;
  html += `<div class="price-row"><label>حداقل فاصله کویل</label><input type="number" id="ws-minCoilWallClearance" value="${WORKSHOP.minCoilWallClearance}"></div>`;
  html += `<div class="price-row"><label>حداکثر ضخامت پرس</label><input type="number" id="ws-maxPressThickness" value="${WORKSHOP.maxPressThickness}"></div>`;
  html += `<div class="price-row"><label>حداکثر قطر پرس</label><input type="number" id="ws-maxPressDiameter" value="${WORKSHOP.maxPressDiameter}"></div>`;
  html += `<button class="btn blue" onclick="saveWorkshopSettings()" style="margin-top:8px">💾 ذخیره</button>`;
  c.innerHTML = html;
}
function saveWorkshopSettings(){
  const el = id => document.getElementById(id);
  WORKSHOP.maxBaseThickness = parseFloat(el('ws-maxBaseThickness').value) || 8;
  WORKSHOP.minCoilWallClearance = parseFloat(el('ws-minCoilWallClearance').value) || 50;
  WORKSHOP.maxPressThickness = parseFloat(el('ws-maxPressThickness').value) || 20;
  WORKSHOP.maxPressDiameter = parseFloat(el('ws-maxPressDiameter').value) || 3000;
  saveWorkshop(WORKSHOP);
  alert('ذخیره شد');
}
function savePricesLocal(){
  document.querySelectorAll('#price-editor input[data-cat]').forEach(inp=>{
    const cat = inp.dataset.cat, key = inp.dataset.key;
    const v = parseFloat(inp.value)||0;
    if(PRICES[cat]) PRICES[cat][key]=v;
  });
  try{localStorage.setItem('csp_prices', JSON.stringify({version:'local_'+Date.now(), data:PRICES}));}catch(e){}
  showStatus('success','ذخیره شد');
}
function resetPrices(){
  if(!confirm('بازگشت؟'))return;
  localStorage.removeItem('csp_prices');
  PRICES = JSON.parse(JSON.stringify(window.EMBEDDED_PRICES));
  renderPriceEditor();
}
function exportPrices(){
  const b = new Blob([JSON.stringify(PRICES,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'prices.json';
  a.click();
}
function showStatus(t,m){
  const s = document.getElementById('price-status');
  if(!s) return;
  s.innerHTML = `<div class="info-box ${t==='success'?'green':'yellow'}">${m}</div>`;
  setTimeout(()=>{ if(s) s.innerHTML=''; }, 3000);
}

/* ============ Catalog ============ */
function initCatalog(){
  const sel = document.getElementById('cat-category');
  if(!sel) return;
  sel.innerHTML = '<option value="">— انتخاب دسته —</option>';
  for(const k in CATALOG.categories){
    const o = document.createElement('option');
    o.value = k;
    o.textContent = CATALOG.categories[k].name;
    sel.appendChild(o);
  }
}
function renderCatalog(){
  const k = document.getElementById('cat-category').value;
  const search = (document.getElementById('cat-search').value||'').trim();
  const info = document.getElementById('cat-info'), tbl = document.getElementById('cat-table');
  if(!tbl) return;
  if(!k){tbl.innerHTML='<div class="empty-state">دسته را انتخاب کن</div>'; return;}
  const cat = CATALOG.categories[k];
  if(!cat) return;
  let rows = cat.rows;
  if(search){
    const s = search.toLowerCase();
    rows = rows.filter(r => r.some(v => String(v).toLowerCase().includes(s)));
  }
  let h = '<div style="overflow-x:auto"><table><thead><tr>';
  cat.columns.forEach(c => h += `<th>${c}</th>`);
  h += '<th>عملیات</th></tr></thead><tbody>';
  rows.forEach(r=>{
    h += `<tr>`;
    r.forEach(v => h += `<td>${v!=null?v:'—'}</td>`);
    const D = r[cat.mainD] || '';
    const H = r[cat.mainH] || '';
    const data = JSON.stringify({model:r[0], D:D, H:H, cat:k}).replace(/"/g,'&quot;');
    h += `<td><button class="btn small" onclick="useFromCat(this)" data-info="${data}" style="margin:0">استفاده</button></td></tr>`;
  });
  h += '</tbody></table></div>';
  tbl.innerHTML = h;
  if(info) info.innerHTML = `<div class="info-box"><b>${cat.name}</b> — ${rows.length} مدل</div>`;
}
function useFromCat(btn){
  try{
    const info = JSON.parse(btn.dataset.info);
    const D = parseFloat(info.D), H = parseFloat(info.H);
    const modelName = info.model || '';
    let eqType = 'spiral';
    if(modelName.includes('SG-HE-SC-')) eqType = 'spiral';
    else if(modelName.includes('SG-HE-C-')) eqType = 'u_coil';
    else if(modelName.includes('SG-S-')) eqType = 'softener';
    else if(modelName.includes('SG-F-')) eqType = 'sand_filter';
    else if(modelName.includes('SG-DE-')) eqType = 'deaerator';
    else if(modelName.includes('SG-OE-')) eqType = 'expansion_open';
    else if(modelName.includes('SG-CE-')) eqType = 'expansion_closed';
    else if(modelName.includes('SG-CT-')) eqType = 'condensate';
    Object.keys(EQ_STATE.weight).forEach(k => {if(k !== '_lastResult') delete EQ_STATE.weight[k];});
    Object.keys(EQ_STATE.cost).forEach(k => {if(k !== '_lastResult') delete EQ_STATE.cost[k];});
    document.getElementById('w-eq').value = eqType;
    document.getElementById('c-eq').value = eqType;
    initEqState('weight');
    initEqState('cost');
    ['weight','cost'].forEach(mode=>{
      const st = EQ_STATE[mode][eqType];
      if(!st) return;
      if(st.shell && !isNaN(D) && !isNaN(H)){
        st.shell.fields.d = D; st.shell.fields.h = H;
      }
    });
    loadEquipment('weight');
    loadEquipment('cost');
    showStatus('success', `${modelName} بارگذاری شد`);
  }catch(e){ alert('خطا'); }
}

/* ============ Excel Export ============ */
function exportToExcel(type){
  const data = type==='weight' ? EQ_STATE.weight._lastResult : EQ_STATE.cost._lastResult;
  if(!data){ alert('ابتدا محاسبه کن'); return; }
  const {def} = data;
  const date = persianDate();
  let csv = '\uFEFF';
  csv += `BOM — ${def.name}\nType: ${type}\nDate: ${date}\n\n`;
  if(type === 'weight'){
    csv += '=== STRUCTURAL ===\n';
    csv += 'No,Part,Weight (kg)\n';
    data.structural.forEach((d,i)=>{ csv += `${i+1},"${d.name}",${d.w.toFixed(2)}\n`; });
    csv += `\nTotal,${data.grand.toFixed(2)}\n`;
  } else {
    csv += 'No,Part,Weight,Cost\n';
    data.details.forEach((d,i)=>{ csv += `${i+1},"${d.name}",${d.w.toFixed(2)},${d.c.toFixed(0)}\n`; });
    csv += `\nFinal Price,,,${data.final.toFixed(0)}\n`;
  }
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `BOM_${def.name}_${date.replace(/\//g,'-')}.csv`;
  a.click();
}

/* ============ PDF Export ============ */
function exportPDF(type){
  const eqId = type==='weight'?'w-eq':'c-eq';
  const resId = type==='weight'?'w-result':'c-result';
  const eq = document.getElementById(eqId).value;
  const def = EQUIPMENT_DEFS[eq];
  const resEl = document.getElementById(resId);
  if(!def || !resEl.innerHTML){ alert('ابتدا محاسبه کن'); return; }
  const data = type==='weight' ? EQ_STATE.weight._lastResult : EQ_STATE.cost._lastResult;
  if(!data){ alert('ابتدا محاسبه کن'); return; }
  const date = persianDate();
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${def.name}</title>
  <style>body{font-family:Vazirmatn,Tahoma;direction:rtl;padding:20px;font-size:12px}
  .h{border-bottom:3px solid #FF6B1A;padding-bottom:10px;margin-bottom:15px}
  h1{color:#E04E00;font-size:20px;margin:0}
  table{width:100%;border-collapse:collapse;margin:15px 0}
  th{background:#F5EFE0;padding:8px;border:1px solid #D4C8B0;font-size:11px}
  td{padding:7px;border:1px solid #D4C8B0;font-family:Courier New;font-weight:700}
  .sum{background:#1F1A12;color:#fff;padding:20px;border-radius:10px;text-align:center;margin:15px 0}
  .sum .v{font-size:28px;color:#FF6B1A;font-family:Courier New;font-weight:900}</style></head><body>
  <div class="h"><h1>${def.name}</h1><p>Caspian Mobadel Amard — ${date}</p></div>
  `);
  if(type === 'weight'){
    win.document.write(`<h3>وزن سازه‌ای</h3><table><tr><th>#</th><th>جزء</th><th>وزن (kg)</th></tr>`);
    data.structural.forEach((d,i)=>{ win.document.write(`<tr><td>${i+1}</td><td>${d.name}</td><td>${fmt(d.w,1)}</td></tr>`); });
    win.document.write(`</table><div class="sum"><div>وزن کل</div><div class="v">${fmt(data.grand,1)} kg</div></div>`);
  } else {
    win.document.write(`<h3>قیمت‌گذاری</h3><table><tr><th>#</th><th>جزء</th><th>قیمت</th></tr>`);
    data.details.forEach((d,i)=>{ win.document.write(`<tr><td>${i+1}</td><td>${d.name}</td><td>${fmtT(d.c)}</td></tr>`); });
    win.document.write(`</table><div class="sum"><div>قیمت نهایی</div><div class="v">${fmtT(data.final)}</div></div>`);
  }
  win.document.write('</body></html>');
  win.document.close();
  setTimeout(()=>win.print(), 500);
}

/* ============ Bootstrap ============ */
window.addEventListener('load', async () => {
  if(window._appInitialized){ return; }
  window._appInitialized = true;
  console.log('🚀 App v7.0 starting...');

  if(typeof initFirebase === 'function'){
    try{ await initFirebase(); }catch(e) {}
  }
  try{
    const s = localStorage.getItem('csp_prices');
    if(s) PRICES = Object.assign({}, window.EMBEDDED_PRICES, JSON.parse(s).data);
  }catch(e){}

  initLogo();

  // Tabs
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click',()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      const panel = document.getElementById(t.dataset.tab);
      if(panel) panel.classList.add('active');
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });

  // Volume type
  const vt = document.getElementById('v-type');
  if(vt) vt.addEventListener('change', onVolumeTypeChange);
  ['v-d','v-h','v-l','v-w'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', renderSchematic);
  });

  // Coil — live
  ['coil-Dtank','coil-Htank','coil-dish','coil-clear','coil-Dcoil','coil-pipe','coil-branches','coil-gap','coil-starts','coil-type'].forEach(id => {
    const el = document.getElementById(id);
    if(el) { el.addEventListener('input', updateCoilDesign); el.addEventListener('change', updateCoilDesign); }
  });

  // Visual — live
  ['vis-Dtank','vis-Htank','vis-Dcoil','vis-turns'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', () => {
      if(VISUAL_STATE.mode === '3d') draw3DCoil();
      else if(VISUAL_STATE.mode === 'cross') drawCrossSection();
    });
  });
  const csSlider = document.getElementById('vis-slider');
  if(csSlider){
    csSlider.addEventListener('input', e => {
      VISUAL_STATE.crossSection = parseInt(e.target.value);
      if(VISUAL_STATE.mode === 'cross') drawCrossSection();
    });
  }

  renderPriceEditor();
  initCatalog();
  renderMemory();
  loadEquipment('weight');
  loadEquipment('cost');

  restoreAutoSave();
  renderSchematic();
  setDimMode('A');
  setHeadMode('simple');

  // Coil initial
  setTimeout(()=>{ if(document.getElementById('coil-schematic')) updateCoilDesign(); }, 200);
  setTimeout(()=>{ if(document.getElementById('vis-schematic')) draw3DCoil(); }, 300);

  console.log('✅ App v7.0 ready');
});

/* ============ Window Exports ============ */
window.toggleTheme = toggleTheme;
window.calcWeight = calcWeight;
window.calcCost = calcCost;
window.useFromCat = useFromCat;
window.toggleComp = toggleComp;
window.updateField = updateField;
window.loadEquipment = loadEquipment;
window.calcVol = calcVol;
window.calcDim = calcDim;
window.toggleDimMode = toggleDimMode;
window.toggleDimMode2 = toggleDimMode2;
window.optSheets = optSheets;
window.compareFourScenarios = compareFourScenarios;
window.applyHeadPreset = applyHeadPreset;
window.calcBlankHandler = calcBlankHandler;
window.calcBodyHeightFromTotal = calcBodyHeightFromTotal;
window.setOrderMode = setOrderMode;
window.calcOrderReverse = calcOrderReverse;
window.saveHeadCalc = saveHeadCalc;
window.saveLastVolume = saveLastVolume;
window.updateCoilDesign = updateCoilDesign;
window.saveCoilDesign = saveCoilDesign;
window.saveWorkshopSettings = saveWorkshopSettings;
window.exportPDF = exportPDF;
window.exportToExcel = exportToExcel;
window.delCalc = delCalc;
window.delHead = delHead;
window.delCoil = delCoil;
window.delRealHead = delRealHead;
window.clearMemory = clearMemory;
window.exportMemory = exportMemory;
window.savePricesLocal = savePricesLocal;
window.resetPrices = resetPrices;
window.exportPrices = exportPrices;
window.renderCatalog = renderCatalog;
window.syncFromFirebase = syncFromFirebase;
window.syncToFirebase = syncToFirebase;
window.onVolumeTypeChange = onVolumeTypeChange;
window.setDimMode = setDimMode;
window.calcVolFromDims = calcVolFromDims;
window.transferVolToDim = transferVolToDim;
window.setHeadMode = setHeadMode;
window.calcHeadPlateSheet = calcHeadPlateSheet;
window.calcSegmentedHead = calcSegmentedHead;
window.exportSegmentedSVG = exportSegmentedSVG;
window.exportSVGFromResult = exportSVGFromResult;
window.exportSimpleHeadDXF = exportSimpleHeadDXF;
window.exportPlateSheetDXF = exportPlateSheetDXF;
window.exportSegmentedDXF = exportSegmentedDXF;
window.exportBlankDXF = exportBlankDXF;
window.generateQRCode = generateQRCode;
window.exportElementSVG = exportElementSVG;
window.autoSave = autoSave;
window.restoreAutoSave = restoreAutoSave;
window.calcASME = calcASME;
window.calcWorkshopIntelligence = calcWorkshopIntelligence;
window.draw3DCoil = draw3DCoil;
window.drawCrossSection = drawCrossSection;
window.drawAnimation = drawAnimation;
window.setVisualMode = setVisualMode;
window.rotate3D = rotate3D;
window.calcRealHead = calcRealHead;
