'use strict';

/* ---------- Calculator logic (pure) ---------- */
const KEYS = ['AC','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','⌫','0','.','='];
const LABEL = { '÷':'divide','×':'multiply','−':'subtract','+':'add','=':'equals','⌫':'backspace','AC':'all clear','±':'toggle sign','%':'percent','.':'decimal point' };
const INIT = { cur: '0', prev: null, op: null, fresh: false };

const fmt  = n => isFinite(n) ? String(+n.toPrecision(12)) : 'Error';
const calc = (a, b, o) => ({ '+': a + b, '−': a - b, '×': a * b, '÷': b ? a / b : NaN })[o];

function step(s, k) {
  if (k === 'AC') return { ...INIT };
  if (s.cur === 'Error') { if (!/[\d.]/.test(k)) return s; s = { ...INIT }; }
  const { cur, prev, op, fresh } = s, n = +cur;
  if (/\d/.test(k)) return { ...s, fresh: false, cur: fresh || cur === '0' ? k : cur.length < 15 ? cur + k : cur };
  if (k === '.')    return fresh ? { ...s, cur: '0.', fresh: false } : cur.includes('.') ? s : { ...s, cur: cur + '.' };
  if (k === '⌫')    return fresh ? s : { ...s, cur: cur.length > 1 && !(cur.length === 2 && cur[0] === '-') ? cur.slice(0, -1) : '0' };
  if (k === '±')    return n ? { ...s, cur: String(-n) } : s;
  if (k === '%')    return { ...s, cur: fmt(n / 100), fresh: true };
  if (k === '=')    return op ? { cur: fmt(calc(prev, n, op)), prev: null, op: null, fresh: true } : s;
  const v = op && !fresh ? fmt(calc(prev, n, op)) : cur;           // chained operations
  return { ...s, cur: v, prev: +v, op: k, fresh: true };
}

/* ---------- Storage helpers ---------- */
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

/* ---------- UI ---------- */
if (typeof document !== 'undefined') {
  const $ = q => document.querySelector(q);
  const esc = t => String(t).replace(/[&<>"']/g, c => '&#' + c.charCodeAt() + ';');
  const cls = k => '÷×−+'.includes(k) ? 'op' : k === '=' ? 'eq' : 'AC±%⌫'.includes(k) ? 'fn' : '';

  let state = load('calc:state', INIT);
  if (typeof state.cur !== 'string') state = { ...INIT };
  let hist = load('calc:hist', []);
  if (!Array.isArray(hist)) hist = [];

  $('#keys').innerHTML = KEYS.map(k => `<button data-k="${k}" class="${cls(k)}" aria-label="${LABEL[k] || k}">${k}</button>`).join('');

  const toast = msg => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 1400);
  };

  const render = () => {
    const n = $('#num');
    n.textContent = state.cur;
    n.dataset.len = state.cur.length > 16 ? 'xl' : state.cur.length > 10 ? 'lg' : '';
    $('#expr').textContent = state.op && state.cur !== 'Error' ? `${state.prev} ${state.op}` : '\u00a0';
    $('#list').innerHTML = hist.length
      ? hist.map((h, i) => `<li><button data-i="${i}"><small>${esc(h.e)} =</small><b>${esc(h.r)}</b></button></li>`).join('')
      : '<li class="empty">No calculations yet 🌸</li>';
    save('calc:state', state); save('calc:hist', hist);
  };

  const press = k => {
    const next = step(state, k);
    if (k === '=' && next !== state && state.op)
      hist = [{ e: `${state.prev} ${state.op} ${state.cur}`, r: next.cur }, ...hist].slice(0, 10);
    state = next; render();
  };

  $('#keys').onclick = e => { const b = e.target.closest('button'); if (b) press(b.dataset.k); };
  $('#list').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    state = { ...INIT, cur: hist[b.dataset.i].r, fresh: true }; render();
  };
  $('#clear').onclick = () => { hist = []; render(); };
  $('#display').onclick = () => navigator.clipboard?.writeText(state.cur).then(() => toast('Copied 📋'), () => {});

  const alias = { '-': '−', '*': '×', '/': '÷', x: '×', Enter: '=', Backspace: '⌫', Escape: 'AC', ',': '.' };
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = alias[e.key] || e.key;
    if (!KEYS.includes(k)) return;
    e.preventDefault(); press(k);
    const b = $(`[data-k="${k}"]`); b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 110);
  });

  /* theme (saved) */
  const root = document.documentElement, themeBtn = $('#theme');
  const setTheme = t => { root.dataset.theme = t; themeBtn.textContent = t === 'dark' ? '☀️' : '🌙'; save('calc:theme', t); };
  setTheme(load('calc:theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeBtn.onclick = () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');

  render();
}
