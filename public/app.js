// El trastero de Ana — SPA sin dependencias.
// Rutas: #/  ·  #/p/<id>  ·  #/admin  ·  #/admin/nuevo  ·  #/admin/editar/<id>  ·  #/admin/ajustes

const $app = document.getElementById('app');
const state = { items: null, settings: null, filter: 'todo', lastId: null };

/* ---------- utilidades ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STATUS_LABEL = { disponible: 'Disponible', reservado: 'Reservado', vendido: 'Vendido' };
const DEFAULTS = { shopName: 'El trastero de Ana', ownerName: 'Ana', intro: '', whatsapp: '' };

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
const token = () => store.get('trastero_token');

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (token()) headers.authorization = 'Bearer ' + token();
  if (opts.json !== undefined) {
    headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(opts.json);
  }
  const res = await fetch('/api/' + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token() && path !== 'login') {
    store.set('trastero_token', null);
    location.hash = '#/admin';
  }
  if (!res.ok) throw new Error(data.error || 'Algo ha fallado. Inténtalo de nuevo.');
  return data;
}

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

const icon = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A1.5 1.5 0 014.5 7h2.3l1.6-2.4h7.2L17.2 7h2.3A1.5 1.5 0 0121 8.5v10a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18.5z"/><circle cx="12" cy="13.2" r="3.6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.2c0-.1-.2-.2-.5-.3z"/></svg>',
};

const absoluteUrl = (hash) => location.origin + location.pathname + hash;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.4-4.5-9.5-9.1C1 8 3.1 4.4 6.6 4.4c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.5 0 5.6 3.6 4.1 7C19.4 16 12 20.5 12 20.5z"/></svg>';

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

/* favoritos: se guardan en el móvil de cada visitante */
const favs = new Set(JSON.parse(store.get('trastero_favs') || '[]'));
function toggleFav(id) {
  favs.has(id) ? favs.delete(id) : favs.add(id);
  store.set('trastero_favs', JSON.stringify([...favs]));
  return favs.has(id);
}

function burst(el) {
  if (reducedMotion()) return;
  const r = el.getBoundingClientRect();
  const b = document.createElement('div');
  b.className = 'burst';
  b.style.left = r.left + r.width / 2 + 'px';
  b.style.top = r.top + r.height / 2 + 'px';
  const colors = ['#c4553c', '#f1d9a0', '#7f9c80', '#e89a83'];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const d = 22 + Math.random() * 12;
    const p = document.createElement('i');
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', Math.cos(a) * d + 'px');
    p.style.setProperty('--dy', Math.sin(a) * d + 'px');
    b.appendChild(p);
  }
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 700);
}

function floatHearts(el, n = 7) {
  if (reducedMotion()) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    h.className = 'floating-heart';
    h.innerHTML = HEART.replace('<path', '<path fill="currentColor"');
    h.style.left = r.left + r.width * (0.2 + Math.random() * 0.6) + 'px';
    h.style.top = r.top + 'px';
    h.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    h.style.setProperty('--r', (Math.random() * 50 - 25) + 'deg');
    h.style.animationDelay = i * 90 + 'ms';
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 1800 + i * 90);
  }
}

function bindHearts(root) {
  root.querySelectorAll('.heart').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const on = toggleFav(b.dataset.fav);
    b.setAttribute('aria-pressed', on);
    b.classList.remove('beat'); void b.offsetWidth;
    if (on) { b.classList.add('beat'); burst(b); }
    root.dispatchEvent(new CustomEvent('favchange'));
  }));
}

// aparece al entrar en pantalla
const revealObs = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('seen'); revealObs.unobserve(en.target); }
    }), { threshold: 0.2 })
  : null;
function reveal(root) {
  root.querySelectorAll('.reveal, .sign').forEach((el) => (revealObs ? revealObs.observe(el) : el.classList.add('seen')));
}

// las etiquetas de precio se balancean según la velocidad del scroll
let lastY = scrollY, settle;
addEventListener('scroll', () => {
  const v = scrollY - lastY;
  lastY = scrollY;
  const deg = Math.max(-16, Math.min(16, -v * 0.7));
  document.documentElement.style.setProperty('--swing', deg + 'deg');
  clearTimeout(settle);
  settle = setTimeout(() => document.documentElement.style.setProperty('--swing', '0deg'), 90);
}, { passive: true });

function boxArt() {
  return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <ellipse class="shadow" cx="60" cy="107" rx="40" ry="4.5"/>
    <g class="pop p1"><path class="ln" d="M41 34h15l4.5 13h-24z" fill="#f1d9a0"/><path class="ln" d="M48.5 47v17"/></g>
    <g class="pop p2"><path class="ln" d="M63 48h17v6.5a8.5 8.5 0 01-17 0z" fill="#fffcf7"/><path class="ln" d="M80 51.5a3.2 3.2 0 010 6.4"/><path class="ln" d="M68 43c0-2 2-2 2-4M74 43c0-2 2-2 2-4" stroke-width="1.2"/></g>
    <g class="pop p3"><g class="float"><path d="M60 26.5s-6-3.7-7.7-7.4c-1.2-2.8.5-5.7 3.3-5.7 1.7 0 2.9 1 4.4 2.6 1.5-1.6 2.7-2.6 4.4-2.6 2.8 0 4.5 2.9 3.3 5.7C66 22.8 60 26.5 60 26.5z" fill="#c4553c"/></g></g>
    <path class="ln" d="M30 64h60v40H30z" fill="#e8cfae"/>
    <path class="ln" d="M52 64v14l8-4 8 4V64" fill="#f1d9a0" stroke-width="1.3"/>
    <text x="60" y="96" text-anchor="middle" font-family="Young Serif, Georgia, serif" font-size="11" fill="#2a221d">Ana</text>
    <path class="ln flap-l" d="M30 64h30l-4-7H34z" fill="#dcbf98"/>
    <path class="ln flap-r" d="M60 64h30l-4-7H64z" fill="#dcbf98"/>
  </svg>`;
}

async function shareLink(url, title) {
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); }
  catch { prompt('Copia este enlace:', url); }
}

async function loadSettings() {
  if (!state.settings) state.settings = await api('settings').catch(() => ({ ...DEFAULTS }));
  state.settings = { ...DEFAULTS, ...state.settings };
  document.title = state.settings.shopName;
  return state.settings;
}

async function loadItems(force) {
  if (!state.items || force) state.items = await api('items');
  return state.items;
}

// "El trastero de Ana" -> la última palabra en cursiva
function shopTitle(name) {
  const words = name.trim().split(/\s+/);
  const last = words.pop();
  return `${esc(words.join(' '))} <em>${esc(last)}</em>`;
}

/* ---------- router ---------- */
const routes = [
  [/^#?\/?$/, viewCatalog],
  [/^#\/p\/(\w+)$/, viewDetail],
  [/^#\/admin\/?$/, viewAdmin],
  [/^#\/admin\/nuevo$/, () => viewEdit(null)],
  [/^#\/admin\/editar\/(\w+)$/, (m) => viewEdit(m[1])],
  [/^#\/admin\/ajustes$/, viewSettings],
];

let leaveGuard = null; // devuelve false para impedir salir de la vista actual
let lastHash = location.hash || '#/';
let firstRender = true;

async function router() {
  const hash = location.hash || '#/';
  if (leaveGuard && hash !== lastHash) {
    if (!leaveGuard()) { history.replaceState(null, '', lastHash); return; }
  }
  leaveGuard = null;
  lastHash = hash;
  const route = routes.find(([re]) => re.test(hash));
  if (!route) { location.hash = '#/'; return; }
  const m = hash.match(route[0]);
  const run = async () => {
    try { await route[1](m); } catch (e) {
      $app.innerHTML = `<div class="wrap empty"><strong>No se ha podido cargar</strong>${esc(e.message)}</div>`;
    }
    window.scrollTo(0, 0);
  };
  if (document.startViewTransition && !firstRender && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(run);
  } else {
    await run();
  }
  firstRender = false;
}
window.addEventListener('hashchange', router);

const needsAdmin = () => {
  if (!token()) { viewLogin(); return true; }
  return false;
};

function segControl(current, cls = '') {
  return `<div class="seg ${cls}" data-v="${current}" role="group" aria-label="Estado"><span class="pill"></span>
    ${Object.keys(STATUS_LABEL).map((st) => `<button type="button" data-v="${st}" aria-pressed="${current === st}">${STATUS_LABEL[st]}</button>`).join('')}
  </div>`;
}

/* ---------- vistas públicas ---------- */
function card(item, i) {
  const img = item.images[0];
  const vt = item.id === state.lastId ? ' style="view-transition-name: foto"' : '';
  const newest = (state.items || []).slice(0, 3).map((x) => x.id); // solo los 3 últimos subidos
  const isNew = item.status === 'disponible' && newest.includes(item.id) && Date.now() - (item.createdAt || 0) < 4 * 864e5;
  return `
    <a class="card is-${item.status}" href="#/p/${item.id}" data-id="${item.id}" style="--i:${i}">
      <div class="ph">
        ${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async"${vt}>` : '<div class="noimg">Sin foto</div>'}
        ${item.status !== 'disponible' ? `<span class="stamp ${item.status}">${STATUS_LABEL[item.status]}</span>` : ''}
        ${isNew ? '<span class="new"><b>✦</b>Nuevo</span>' : ''}
        <button class="heart" data-fav="${item.id}" aria-pressed="${favs.has(item.id)}" aria-label="Guardar">${HEART}</button>
        ${item.price ? `<span class="tag">${esc(item.price)}</span>` : ''}
      </div>
      <div class="meta"><h3>${esc(item.title)}</h3></div>
    </a>`;
}

async function viewCatalog() {
  if (!state.items) {
    $app.innerHTML = `<div class="wrap"><header class="hero"><div class="shop-name">&nbsp;</div></header>
      <div class="grid" style="padding-top:26px">${'<div class="skeleton"></div>'.repeat(4)}</div></div>`;
  }
  const [s, items] = await Promise.all([loadSettings(), loadItems()]);
  render();
  loadItems(true).then((fresh) => {
    if (/^#?\/?$/.test(location.hash) && JSON.stringify(fresh) !== JSON.stringify(items)) render();
  }).catch(() => {});

  function render() {
    const all = state.items;
    const match = (i, f) => (f === 'todo' ? i.status !== 'vendido' : f === 'fav' ? favs.has(i.id) : i.status === f);
    if (state.filter === 'fav' && !all.some((i) => favs.has(i.id))) state.filter = 'todo';
    const shown = all.filter((i) => match(i, state.filter));
    const count = (f) => all.filter((i) => match(i, f)).length;
    const tab = (f, label) => `<button class="tab" data-f="${f}" aria-pressed="${state.filter === f}">${label}<sup>${count(f)}</sup></button>`;
    $app.innerHTML = `
      <div class="wrap">
        <header class="hero">
          <div class="text">
            <span class="eyebrow">${greeting()}</span>
            <h1 class="shop-name">${shopTitle(s.shopName)}</h1>
            ${s.intro ? `<p class="intro">${esc(s.intro)}</p>` : ''}
          </div>
          <div class="boxart" id="boxart" role="img" aria-label="Caja del trastero">${boxArt()}</div>
        </header>
        ${all.length ? `<nav class="tabs" aria-label="Filtrar">
          ${tab('todo', 'Todo')}${tab('disponible', 'Disponible')}${count('fav') ? tab('fav', 'Guardados') : ''}${count('reservado') ? tab('reservado', 'Reservado') : ''}${count('vendido') ? tab('vendido', 'Vendido') : ''}
        </nav>` : ''}
        ${shown.length
          ? `<section class="grid">${shown.map(card).join('')}</section>`
          : `<div class="empty"><strong>${all.length ? 'Nada en esta sección' : 'Todavía no hay nada publicado'}</strong></div>`}
        ${all.length ? `<div class="sign"><p>Gracias por pasarte</p>
          <svg viewBox="0 0 100 22"><path d="M4 14c10-9 18 6 28-1s16-9 24 0 18 4 26-3 10 2 14 0"/></svg>
          <small>${esc(s.ownerName)}</small></div>` : ''}
        <footer class="foot"><span>${esc(s.shopName)}</span><a href="#/admin">Acceso</a></footer>
      </div>`;
    $app.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { state.filter = b.dataset.f; render(); }));
    bindHearts($app);
    reveal($app);
    $app.addEventListener('favchange', () => {
      // actualiza la pestaña "Guardados" sin repintar las fotos
      const n = all.filter((i) => favs.has(i.id)).length;
      const t = $app.querySelector('.tab[data-f="fav"]');
      if (state.filter === 'fav' || !t !== !n) render();
      else if (t) t.querySelector('sup').textContent = n;
    }, { once: true });
    const name = $app.querySelector('.shop-name em');
    if (name) name.onclick = () => floatHearts(name);
    const box = document.getElementById('boxart');
    if (box) box.onclick = () => { box.innerHTML = boxArt(); };
    $app.querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => {
      $app.querySelectorAll('.card img').forEach((im) => (im.style.viewTransitionName = ''));
      const im = c.querySelector('img');
      if (im) im.style.viewTransitionName = 'foto';
      state.lastId = c.dataset.id;
    }));
  }
}

async function viewDetail(m) {
  const [s, items] = await Promise.all([loadSettings(), loadItems()]);
  const item = items.find((i) => i.id === m[1]) || (await loadItems(true)).find((i) => i.id === m[1]);
  if (!item) {
    $app.innerHTML = `<div class="wrap empty"><strong>Este artículo ya no está</strong><a href="#/">Ver el resto</a></div>`;
    return;
  }
  state.lastId = item.id;

  const link = absoluteUrl('#/p/' + item.id);
  const msg = item.status === 'disponible'
    ? `Hola ${s.ownerName}, me interesa «${item.title}»${item.price ? ` (${item.price})` : ''}. ¿Sigue disponible? ${link}`
    : `Hola ${s.ownerName}, si «${item.title}» queda libre, me interesa. ${link}`;
  const wa = s.whatsapp ? `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(msg)}` : '';
  const ctaLabel = item.status === 'disponible' ? `Escribir a ${s.ownerName}` : 'Avisarme si queda libre';
  const n = item.images.length;

  $app.innerHTML = `
    <div class="detail">
      <div class="gallery">
        <div class="slides">${n
          ? item.images.map((u, i) => `<img src="${esc(u)}" alt="${esc(item.title)}, foto ${i + 1}"${i ? ' loading="lazy"' : ' style="view-transition-name: foto"'}>`).join('')
          : '<div class="noimg" style="flex:0 0 100%">Sin foto</div>'}</div>
        <div class="g-top">
          <a class="round" href="#/" aria-label="Volver">${icon.back}</a>
          <div class="right">
            <button class="round heart" data-fav="${item.id}" aria-pressed="${favs.has(item.id)}" aria-label="Guardar">${HEART}</button>
            <button class="round" id="share" aria-label="Compartir">${icon.share}</button>
          </div>
        </div>
        ${n > 1 ? `<span class="counter"><span id="cur">1</span> / ${n}</span>` : ''}
        ${item.status !== 'disponible' ? `<span class="stamp ${item.status}">${STATUS_LABEL[item.status]}</span>` : ''}
      </div>
      <section class="info">
        <div class="row1">
          <span class="status ${item.status}">${STATUS_LABEL[item.status]}</span>
        </div>
        <h1>${esc(item.title)}</h1>
        ${item.price ? `<p style="margin:0 0 24px"><span class="tag">${esc(item.price)}</span></p>` : ''}
        ${item.description ? `<p class="desc">${esc(item.description)}</p>` : ''}
      </section>
      ${(() => {
        const others = items.filter((i) => i.id !== item.id && i.status !== 'vendido').slice(0, 8);
        return others.length ? `<section class="more reveal"><h2>Más cosas del <em>trastero</em></h2><div class="strip">
          ${others.map((o) => `<a href="#/p/${o.id}"><div class="ph">${o.images[0] ? `<img src="${esc(o.images[0])}" alt="" loading="lazy">` : ''}</div>
            <span>${esc(o.title)}</span><small>${esc(o.price || STATUS_LABEL[o.status])}</small></a>`).join('')}
        </div></section>` : '';
      })()}
    </div>
    <div class="cta-bar"><div class="inner">
      ${item.status === 'vendido'
        ? `<a class="btn light" href="#/">Ver otros artículos</a>`
        : wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener"><span class="wa-dot">${icon.wa}</span>${esc(ctaLabel)}</a>`
             : `<button class="btn" disabled>Contacto no disponible</button>`}
    </div></div>`;

  document.getElementById('share').onclick = () => shareLink(link, item.title);
  bindHearts($app);
  reveal($app);
  const slides = $app.querySelector('.slides');
  const cur = document.getElementById('cur');
  if (cur) {
    slides.addEventListener('scroll', () => {
      cur.textContent = Math.round(slides.scrollLeft / slides.clientWidth) + 1;
    }, { passive: true });
  }
}

/* ---------- admin ---------- */
async function viewLogin() {
  const s = await loadSettings();
  $app.innerHTML = `
    <div class="login">
      <span class="eyebrow">${esc(s.shopName)}</span>
      <h1>Hola, <em>${esc(s.ownerName)}</em></h1>
      <p>Introduce tu contraseña para gestionar tus artículos.</p>
      <form class="stack" id="f">
        <input class="input" type="password" name="password" placeholder="Contraseña" autocomplete="current-password" required>
        <button class="btn" type="submit">Entrar</button>
      </form>
      <a class="back" href="#/">${icon.back} Volver a la tienda</a>
    </div>`;
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      const { token } = await api('login', { method: 'POST', json: { password: f.password.value } });
      store.set('trastero_token', token);
      router();
    } catch (err) {
      toast(err.message);
      f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  };
}

async function viewAdmin() {
  if (needsAdmin()) return;
  const [s, items] = await Promise.all([loadSettings(), loadItems(true)]);
  const n = (st) => items.filter((i) => i.status === st).length;

  $app.innerHTML = `
    <div class="wrap">
      <div class="a-head">
        <div><span class="eyebrow">Panel</span><h1>Hola, <em>${esc(s.ownerName)}</em></h1></div>
        <a class="round outline" href="#/admin/ajustes" aria-label="Ajustes">${icon.gear}</a>
      </div>
      <div class="stats">
        <div class="stat" style="--i:0"><b>${n('disponible')}</b><span>Disponibles</span></div>
        <div class="stat" style="--i:1"><b>${n('reservado')}</b><span>Reservados</span></div>
        <div class="stat" style="--i:2"><b>${n('vendido')}</b><span>Vendidos</span></div>
      </div>
      ${!s.whatsapp ? `<div class="notice">Añade tu número de WhatsApp para que puedan escribirte. <a href="#/admin/ajustes">Ir a ajustes</a></div>` : ''}
      <div class="toolbar">
        <button class="btn small light" id="share">${icon.share} Compartir enlace</button>
        <a class="btn small light" href="#/">Ver tienda</a>
      </div>
      ${items.length ? `<div class="rows">${items.map((i, k) => `
        <div class="row" data-id="${i.id}" style="--i:${k}">
          <a class="thumb" href="#/admin/editar/${i.id}">${i.images[0] ? `<img src="${esc(i.images[0])}" alt="" loading="lazy">` : ''}</a>
          <a class="main" href="#/admin/editar/${i.id}">
            <h3>${esc(i.title)}</h3>
            <div class="meta">${esc(i.price || 'Sin precio')}${i.reservedFor ? ` · <span class="who">${esc(i.reservedFor)}</span>` : ''}</div>
          </a>
          <a href="#/admin/editar/${i.id}" aria-label="Editar">${icon.chev}</a>
          ${segControl(i.status)}
        </div>`).join('')}</div>`
        : `<div class="empty"><strong>Aún no hay artículos</strong>Pulsa «Añadir» para publicar el primero.</div>`}
      <div style="text-align:center;padding:16px 0 120px"><button class="link-btn" id="logout">Cerrar sesión</button></div>
    </div>
    <a class="fab" href="#/admin/nuevo">${icon.plus} Añadir</a>`;

  document.getElementById('share').onclick = () => shareLink(absoluteUrl('#/'), s.shopName);
  document.getElementById('logout').onclick = () => { store.set('trastero_token', null); location.hash = '#/'; };
  $app.querySelectorAll('.row').forEach((row) => {
    const seg = row.querySelector('.seg');
    seg.querySelectorAll('button').forEach((b) => (b.onclick = async () => {
      const id = row.dataset.id;
      const status = b.dataset.v;
      if (seg.dataset.v === status) return;
      seg.dataset.v = status;
      seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      try {
        const updated = await api('items?id=' + id, { method: 'PUT', json: { status } });
        state.items = state.items.map((i) => (i.id === id ? updated : i));
        toast('Marcado como ' + STATUS_LABEL[status].toLowerCase());
        const counts = $app.querySelectorAll('.stat b');
        ['disponible', 'reservado', 'vendido'].forEach((st, k) => (counts[k].textContent = state.items.filter((i) => i.status === st).length));
      } catch (e) { toast(e.message); viewAdmin(); }
    }));
  });
}

// Reduce la foto en el navegador (máx. 1600 px, JPEG) para que suba rápido
async function compress(file) {
  const MAX = 1600;
  let source;
  try { source = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    source = await new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => ko(new Error('No se pudo leer la foto'));
      img.src = URL.createObjectURL(file);
    });
  }
  const scale = Math.min(1, MAX / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('No se pudo preparar la foto'))), 'image/jpeg', 0.82));
}

const clientId = () => Date.now().toString(36) + Math.random().toString(16).slice(2, 8).padEnd(6, '0');

async function viewEdit(id) {
  if (needsAdmin()) return;
  const items = await loadItems();
  const existing = id ? items.find((i) => i.id === id) : null;
  if (id && !existing) { location.hash = '#/admin'; return; }

  const itemId = existing?.id || clientId();
  const draft = existing ? structuredClone(existing) : { title: '', price: '', description: '', status: 'disponible', reservedFor: '', images: [] };
  const pending = new Map(); // fotos subiendo: clave -> objectURL
  let dirty = false;

  $app.innerHTML = `
    <div class="wrap pad-bottom">
      <a class="back" href="#/admin">${icon.back} Artículos</a>
      <div class="a-head"><h1>${existing ? 'Editar artículo' : 'Nuevo artículo'}</h1></div>
      <form class="stack" id="f" novalidate style="margin-top:22px">
        <div>
          <div class="photos" id="photos"></div>
          <p class="hint" id="photo-hint"></p>
          <input type="file" id="file" accept="image/*" multiple hidden>
        </div>
        <label class="field">Título
          <input class="input" name="title" maxlength="120" placeholder="Lámpara de pie" value="${esc(draft.title)}" required>
        </label>
        <label class="field">Precio <small>Opcional</small>
          <input class="input" name="price" maxlength="40" placeholder="15 €" value="${esc(draft.price)}">
        </label>
        <label class="field">Descripción <small>Estado, medidas, detalles</small>
          <textarea class="input" name="description" maxlength="3000">${esc(draft.description)}</textarea>
        </label>
        <div class="field">Estado
          ${segControl(draft.status, 'big')}
        </div>
        <label class="field" id="reserved-wrap" ${draft.status === 'reservado' ? '' : 'hidden'}>Reservado para <small>Solo lo ves tú</small>
          <input class="input" name="reservedFor" maxlength="80" placeholder="Nombre" value="${esc(draft.reservedFor)}">
        </label>
        ${existing ? `<button type="button" class="btn danger" id="del" style="margin-top:10px">Eliminar artículo</button>` : ''}
      </form>
    </div>
    <div class="sticky-save"><div class="inner"><button class="btn" id="save" form="f" type="submit">${existing ? 'Guardar cambios' : 'Publicar'}</button></div></div>`;

  const saveLabel = existing ? 'Guardar cambios' : 'Publicar';
  const f = document.getElementById('f');
  const fileInput = document.getElementById('file');
  const $photos = document.getElementById('photos');
  const $hint = document.getElementById('photo-hint');
  const saveBtn = document.getElementById('save');
  f.addEventListener('input', () => (dirty = true));

  function renderPhotos() {
    const tiles = draft.images.map((u, i) => `
      <div class="photo" data-i="${i}">
        <img src="${esc(u)}" alt="">
        <button type="button" class="x" data-rm="${i}" aria-label="Quitar foto">×</button>
        ${i === 0 && draft.images.length > 1 ? '<span class="cover">Portada</span>' : ''}
      </div>`).join('');
    const loading = [...pending.values()].map((u) => `<div class="photo loading"><img src="${u}" alt=""></div>`).join('');
    const empty = !draft.images.length && !pending.size;
    $photos.innerHTML = tiles + loading + (draft.images.length + pending.size < 12
      ? `<button type="button" class="add-photo ${empty ? 'big' : ''}" id="add">${icon.camera}${empty ? 'Añadir fotos<span>Cámara o galería</span>' : 'Añadir'}</button>` : '');
    $hint.textContent = draft.images.length > 1 ? 'Toca una foto para usarla de portada.' : '';
    document.getElementById('add')?.addEventListener('click', () => fileInput.click());
    $photos.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      draft.images.splice(Number(b.dataset.rm), 1); dirty = true; renderPhotos();
    }));
    $photos.querySelectorAll('.photo[data-i]').forEach((p) => (p.onclick = () => {
      const i = Number(p.dataset.i);
      if (!i) return;
      draft.images.unshift(...draft.images.splice(i, 1)); dirty = true; renderPhotos();
    }));
    saveBtn.disabled = pending.size > 0;
    saveBtn.textContent = pending.size ? 'Subiendo fotos…' : saveLabel;
  }
  renderPhotos();

  fileInput.onchange = async () => {
    const files = [...fileInput.files].slice(0, 12 - draft.images.length - pending.size);
    fileInput.value = '';
    await Promise.all(files.map(async (file) => {
      const key = Math.random().toString(36);
      pending.set(key, URL.createObjectURL(file));
      renderPhotos();
      try {
        const blob = await compress(file);
        const res = await fetch('/api/upload?item=' + itemId, {
          method: 'POST', body: blob, headers: { 'content-type': 'image/jpeg', authorization: 'Bearer ' + token() },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'No se pudo subir una foto');
        draft.images.push(data.url); dirty = true;
      } catch (e) { toast(e.message); }
      finally { URL.revokeObjectURL(pending.get(key)); pending.delete(key); renderPhotos(); }
    }));
  };

  const $reserved = document.getElementById('reserved-wrap');
  const seg = f.querySelector('.seg');
  seg.querySelectorAll('button').forEach((b) => (b.onclick = () => {
    draft.status = b.dataset.v; dirty = true;
    seg.dataset.v = draft.status;
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    $reserved.hidden = draft.status !== 'reservado';
  }));

  f.onsubmit = async (e) => {
    e.preventDefault();
    if (pending.size) return;
    const body = {
      ...draft,
      title: f.title.value.trim(),
      price: f.price.value.trim(),
      description: f.description.value.trim(),
      reservedFor: draft.status === 'reservado' ? f.reservedFor.value.trim() : '',
    };
    if (!body.title) { toast('Falta el título'); f.title.focus(); return; }
    if (!body.images.length && !confirm('No has añadido ninguna foto. ¿Guardar igualmente?')) return;
    saveBtn.disabled = true; saveBtn.textContent = 'Guardando…';
    try {
      if (existing) {
        const updated = await api('items?id=' + itemId, { method: 'PUT', json: body });
        state.items = state.items.map((i) => (i.id === itemId ? updated : i));
        toast('Cambios guardados');
      } else {
        const created = await api('items', { method: 'POST', json: { ...body, id: itemId } });
        state.items = [created, ...(state.items || [])];
        toast('Publicado');
      }
      dirty = false;
      location.hash = '#/admin';
    } catch (err) {
      toast(err.message);
      saveBtn.disabled = false; saveBtn.textContent = saveLabel;
    }
  };

  document.getElementById('del')?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar «${existing.title}»? No se puede deshacer.`)) return;
    try {
      await api('items?id=' + itemId, { method: 'DELETE' });
      state.items = state.items.filter((i) => i.id !== itemId);
      dirty = false;
      toast('Eliminado');
      location.hash = '#/admin';
    } catch (err) { toast(err.message); }
  });

  leaveGuard = () => !dirty || confirm('Tienes cambios sin guardar. ¿Salir igualmente?');
  leaveGuard.isDirty = () => dirty;
}

window.addEventListener('beforeunload', (e) => {
  if (leaveGuard?.isDirty?.()) e.preventDefault();
});

async function viewSettings() {
  if (needsAdmin()) return;
  state.settings = null;
  const s = await loadSettings();
  $app.innerHTML = `
    <div class="wrap pad-bottom">
      <a class="back" href="#/admin">${icon.back} Artículos</a>
      <div class="a-head"><h1>Ajustes</h1></div>
      <form class="stack" id="f" style="margin-top:22px">
        <label class="field">Tu nombre
          <input class="input" name="ownerName" maxlength="30" value="${esc(s.ownerName)}" placeholder="Ana">
        </label>
        <label class="field">Nombre de la tienda <small>La última palabra aparece en cursiva</small>
          <input class="input" name="shopName" maxlength="60" value="${esc(s.shopName)}" placeholder="El trastero de Ana">
        </label>
        <label class="field">Texto de presentación
          <textarea class="input" name="intro" maxlength="400" style="min-height:100px">${esc(s.intro)}</textarea>
        </label>
        <label class="field">WhatsApp <small>Número donde recibirás los mensajes</small>
          <input class="input" name="whatsapp" inputmode="tel" maxlength="20" value="${esc(s.whatsapp)}" placeholder="600 123 456">
        </label>
      </form>
    </div>
    <div class="sticky-save"><div class="inner"><button class="btn" form="f" type="submit">Guardar</button></div></div>`;
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    let wa = f.whatsapp.value.replace(/\D/g, '');
    if (wa.length === 9) wa = '34' + wa; // número español sin prefijo
    try {
      state.settings = await api('settings', {
        method: 'PUT',
        json: { ownerName: f.ownerName.value, shopName: f.shopName.value, intro: f.intro.value, whatsapp: wa },
      });
      toast('Guardado');
      location.hash = '#/admin';
    } catch (err) { toast(err.message); }
  };
}

router();
