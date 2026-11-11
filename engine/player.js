/*
 * How It Works — step-by-step animation player. No dependencies.
 *
 * An explainer calls HowItWorks.mount(flow). The flow describes:
 *   chapters  big parts of the story (shown in the progress bar)
 *   zones     labelled areas on the stage ("Your home", "The website")
 *   actors    the things that talk to each other
 *   links     roads between actors (optionally bent with waypoints per layout)
 *   steps     what happens, in order
 * See README.md for the full format.
 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  // 24×24 stroke icons used inside actor tiles.
  var ICONS = {
    browser: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M2.5 9h19"/><path d="M5.5 6.5h.01M8 6.5h.01M10.5 6.5h.01"/><path d="M7 13h6M7 16h9"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    os: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    router: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 16.5h.01M10.5 16.5h.01"/><path d="M15 13V9"/><path d="M12.2 7.2a4 4 0 0 1 5.6 0"/><path d="M10 4.8a7.5 7.5 0 0 1 10 0"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3"/><path d="M8 7h7M8 10h5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
    tree: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="12" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2V17M12 11H5v5.8M12 11h7v5.8"/>',
    server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01M12 6.5h4M12 17.5h4"/>',
    edge: '<path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-6h6v6"/><path d="M2 20h20"/>',
    db: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    cloud: '<path d="M7 19h10.5a4.5 4.5 0 0 0 .4-9A6 6 0 0 0 6.3 11.5 3.8 3.8 0 0 0 7 19z"/>',
    lb: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 12h10M7 11l10-5M7 13l10 5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
    queue: '<rect x="3" y="6" width="4" height="12" rx="1"/><rect x="10" y="6" width="4" height="12" rx="1"/><rect x="17" y="6" width="4" height="12" rx="1"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'
  };

  var GLYPH = {
    envelope: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    lock: ICONS.lock
  };

  var UI = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    moon: '<svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    sun: '<svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 5.2v13.6a1 1 0 0 0 1.53.85l10.6-6.8a1 1 0 0 0 0-1.7L9.03 4.35A1 1 0 0 0 7.5 5.2z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
  };

  // Stage geometry. "wide" for landscape stages, "tall" for phones in portrait.
  var LAYOUTS = {
    wide: { w: 1000, h: 572, tile: 56, radius: 14, label: 15, sub: 11.5, showSub: true, pill: 28, pillFont: 12.5, bubble: 13.5, bubbleChars: 24, zoneFont: 11, zonePad: [16, 24] },
    tall: { w: 400, h: 420, tile: 40, radius: 11, label: 12, sub: 9, showSub: false, pill: 21, pillFont: 10, bubble: 11, bubbleChars: 20, zoneFont: 8.5, zonePad: [10, 16] }
  };

  var SPEEDS = [0.75, 1, 1.5, 2];
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- helpers ---------- */

  function svg(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function h(tag, attrs, parent) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function dedent(str) {
    var lines = String(str).replace(/^\n+|\s+$/g, '').split('\n');
    var min = Infinity;
    lines.forEach(function (l) { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    return lines.map(function (l) { return l.slice(min === Infinity ? 0 : min); }).join('\n');
  }

  function countWords(html) {
    if (!html) return 0;
    var d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || '').split(/\s+/).filter(Boolean).length;
  }

  function wrapWords(text, max) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      if (!line) line = w;
      else if ((line + ' ' + w).length <= max) line += ' ' + w;
      else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    return lines;
  }

  // Polyline with rounded corners, as SVG path data.
  function roundedPath(pts, r) {
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      var l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var rr = Math.min(r, l1 / 2, l2 / 2);
      var a = [p1[0] - (p1[0] - p0[0]) / l1 * rr, p1[1] - (p1[1] - p0[1]) / l1 * rr];
      var b = [p1[0] + (p2[0] - p1[0]) / l2 * rr, p1[1] + (p2[1] - p1[1]) / l2 * rr];
      d += ' L' + a[0] + ',' + a[1] + ' Q' + p1[0] + ',' + p1[1] + ' ' + b[0] + ',' + b[1];
    }
    var last = pts[pts.length - 1];
    return d + ' L' + last[0] + ',' + last[1];
  }

  function fitText(t, maxW) {
    var full = t.textContent;
    if (!t.getComputedTextLength || t.getComputedTextLength() <= maxW) return;
    var n = full.length;
    while (n > 1 && t.getComputedTextLength() > maxW) {
      n--;
      t.textContent = full.slice(0, n).replace(/[\s·,]+$/, '') + '…';
    }
  }

  /* ---------- player ---------- */

  function Player(flow) {
    this.flow = flow;
    this.steps = flow.steps || [];
    this.layouts = Object.assign({}, LAYOUTS, flow.layouts || {});
    this.i = 0;
    this.speedIdx = 1;
    this.playing = false;
    this.busy = false;
    this.token = 0;
    this.layoutName = null;

    // Chapters in order, with the steps that belong to each.
    var chapters = (flow.chapters || []).slice();
    var byId = {};
    chapters.forEach(function (c) { byId[c.id] = c; c.steps = []; });
    this.steps.forEach(function (s, idx) {
      var c = byId[s.chapter];
      if (!c) { c = byId[s.chapter] = { id: s.chapter || 'main', title: s.chapter || 'Steps', steps: [] }; chapters.push(c); }
      c.steps.push(idx);
    });
    this.chapters = chapters.filter(function (c) { return c.steps.length; });
    this.chapterOf = {};
    var self = this;
    this.chapters.forEach(function (c, ci) { c.steps.forEach(function (si) { self.chapterOf[si] = ci; }); });

    this.build();
    this.bind();
    this.chooseLayout();
    var m = /step-(\d+)/.exec(location.hash);
    this.go(m ? parseInt(m[1], 10) - 1 : 0, true);
  }

  Player.prototype.build = function () {
    var f = this.flow, self = this;
    document.title = (f.shortTitle || f.title) + ' · How It Works';
    var root = this.root = h('div', { class: 'hiw' }, document.body);

    // Header
    var top = h('header', { class: 'hiw-top' }, root);
    var home = h('a', { class: 'hiw-home', href: f.home || '../../' }, top);
    home.innerHTML = UI.back + '<span>How It Works</span>';
    var titles = h('div', { class: 'hiw-titles' }, top);
    h('h1', { class: 'hiw-title' }, titles).textContent = f.title;
    var tbtn = h('button', { class: 'iconbtn', type: 'button', 'data-theme-toggle': '', 'aria-label': 'Switch between light and dark', title: 'Light / dark' }, top);
    tbtn.innerHTML = UI.moon + UI.sun;

    // Stage
    var main = h('main', { class: 'hiw-main' }, root);
    this.stage = h('section', { class: 'hiw-stage', 'aria-label': 'Animated diagram' }, main);
    this.svg = svg('svg', { role: 'img', 'aria-label': f.title, preserveAspectRatio: 'xMidYMid meet' }, this.stage);
    this.layers = {};
    ['zones', 'pipes', 'links', 'trails', 'actors', 'packets', 'bubbles'].forEach(function (n) {
      self.layers[n] = svg('g', { class: 'hiw-l-' + n }, self.svg);
    });

    // Legend: what the colours mean
    var legend = h('div', { class: 'hiw-legend', 'aria-hidden': 'true' }, this.stage);
    legend.innerHTML =
      '<span><i class="k-out"></i>Message going out</span>' +
      '<span><i class="k-back"></i>Answer coming back</span>' +
      '<span><i class="k-secure"></i>Encrypted</span>';

    // Explanation panel
    var panel = this.panel = h('section', { class: 'hiw-panel', 'aria-label': 'Explanation' }, main);
    var card = this.card = h('article', { class: 'hiw-card', 'aria-live': 'polite' }, panel);
    this.eyebrow = h('p', { class: 'hiw-eyebrow' }, card);
    this.stepTitle = h('h2', { class: 'hiw-step-title' }, card);
    this.lede = h('div', { class: 'hiw-lede' }, card);
    this.analogy = h('aside', { class: 'hiw-analogy' }, card);
    h('p', { class: 'hiw-analogy-label' }, this.analogy).textContent = 'Why it matters';
    this.analogyText = h('div', { class: 'hiw-analogy-text' }, this.analogy);
    this.more = h('details', { class: 'hiw-more' }, card);
    var sum = h('summary', null, this.more);
    sum.innerHTML = '<span class="hiw-more-title">Under the hood</span><span class="hiw-more-hint">Protocol details, real messages, commands to try</span>' + UI.chevron;
    this.tech = h('div', { class: 'hiw-tech' }, this.more);
    this.inspect = h('figure', { class: 'hiw-inspect' }, this.more);
    this.inspectCap = h('figcaption', null, this.inspect);
    this.inspectPre = h('pre', { tabindex: '0' }, this.inspect);
    this.tryBox = h('figure', { class: 'hiw-inspect hiw-try' }, this.more);
    h('figcaption', null, this.tryBox).textContent = 'Try it yourself';
    this.tryPre = h('pre', { tabindex: '0' }, this.tryBox);
    // Open by default; remember if the reader closes it.
    this.more.open = true;
    try { if (localStorage.getItem('hiw-more') === '0') this.more.open = false; } catch (e) { /* no storage */ }
    this.more.addEventListener('toggle', function () {
      try { localStorage.setItem('hiw-more', self.more.open ? '1' : '0'); } catch (e) { /* no storage */ }
    });

    // Controls
    var ctr = h('footer', { class: 'hiw-controls' }, root);
    this.track = h('nav', { class: 'hiw-track', 'aria-label': 'Chapters and steps' }, ctr);
    this.segs = [];
    this.groups = [];
    this.chapters.forEach(function (c, ci) {
      var g = h('div', { class: 'hiw-group' }, self.track);
      g.style.flexGrow = c.steps.length;
      var name = h('button', { class: 'hiw-group-name', type: 'button' }, g);
      name.textContent = c.title;
      name.addEventListener('click', function () { self.go(c.steps[0], true); });
      var row = h('div', { class: 'hiw-segs' }, g);
      c.steps.forEach(function (si) {
        var b = h('button', { class: 'hiw-seg', type: 'button', 'aria-label': 'Step ' + (si + 1) + ': ' + self.steps[si].title, title: (si + 1) + '. ' + self.steps[si].title }, row);
        b.addEventListener('click', function () { self.go(si, true); });
        self.segs[si] = b;
      });
      self.groups[ci] = g;
    });

    var row = h('div', { class: 'hiw-row' }, ctr);
    this.counter = h('p', { class: 'hiw-counter' }, row);
    var mid = h('div', { class: 'hiw-transport' }, row);
    this.btnPrev = h('button', { class: 'iconbtn hiw-prev', type: 'button', 'aria-label': 'Previous step', title: 'Previous (←)' }, mid);
    this.btnPrev.innerHTML = UI.prev;
    this.btnPlay = h('button', { class: 'hiw-btn hiw-play', type: 'button', title: 'Play automatically (Space)' }, mid);
    this.btnNext = h('button', { class: 'hiw-btn hiw-next', type: 'button', title: 'Next (→)' }, mid);
    this.btnNext.innerHTML = '<span class="hiw-fill" aria-hidden="true"></span><span class="hiw-btn-text">Next</span>' + UI.next;
    this.fill = this.btnNext.querySelector('.hiw-fill');
    var tools = h('div', { class: 'hiw-tools' }, row);
    this.btnReplay = h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Replay this step', title: 'Replay step (R)' }, tools);
    this.btnReplay.innerHTML = UI.replay;
    this.btnSpeed = h('button', { class: 'hiw-btn hiw-speed', type: 'button', 'aria-label': 'Animation speed', title: 'Animation speed' }, tools);

    this.updatePlay();
    this.updateSpeed();
  };

  Player.prototype.bind = function () {
    var self = this;
    this.btnPrev.addEventListener('click', function () { self.go(self.i - 1, true); });
    this.btnNext.addEventListener('click', function () { self.go(self.i + 1, true); });
    this.btnReplay.addEventListener('click', function () { self.go(self.i, true); });
    this.btnPlay.addEventListener('click', function () { self.togglePlay(); });
    this.btnSpeed.addEventListener('click', function () {
      self.speedIdx = (self.speedIdx + 1) % SPEEDS.length;
      self.updateSpeed();
    });

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      var onControl = tag === 'button' || tag === 'summary' || tag === 'a';
      switch (e.key) {
        case 'ArrowRight': self.go(self.i + 1, true); e.preventDefault(); break;
        case 'ArrowLeft': self.go(self.i - 1, true); e.preventDefault(); break;
        case 'Home': self.go(0, true); e.preventDefault(); break;
        case 'End': self.go(self.steps.length - 1, true); e.preventDefault(); break;
        case 'r': case 'R': self.go(self.i, true); break;
        case ' ':
          if (onControl) return;
          self.togglePlay(); e.preventDefault(); break;
      }
    });

    // Swipe left / right on the diagram or the explanation.
    [this.stage, this.card].forEach(function (area) {
      var sx = 0, sy = 0, on = false;
      area.addEventListener('touchstart', function (e) {
        on = e.touches.length === 1;
        if (on) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
      }, { passive: true });
      area.addEventListener('touchend', function (e) {
        if (!on) return;
        on = false;
        var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) self.go(self.i + (dx < 0 ? 1 : -1), true);
      }, { passive: true });
    });

    var onResize = function () { if (self.chooseLayout()) self.go(self.i, false); };
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(this.stage);
    else window.addEventListener('resize', onResize);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && self.playing) self.togglePlay();
    });
  };

  // Picks the stage geometry for the available space. Returns true if it changed.
  Player.prototype.chooseLayout = function () {
    var r = this.stage.getBoundingClientRect();
    var W = r.width || window.innerWidth, H = r.height || window.innerHeight * 0.5;
    // Landscape-ish stages get the wide diagram; portrait stages (phones) get the tall one.
    var name = W / H >= 1.05 ? 'wide' : 'tall';
    if (name === this.layoutName) return false;
    this.layoutName = name;
    this.L = this.layouts[name];
    this.svg.setAttribute('viewBox', '0 0 ' + this.L.w + ' ' + this.L.h);
    this.root.setAttribute('data-layout', name);
    this.drawScene();
    return true;
  };

  Player.prototype.pos = function (id) {
    var a = this.flow.actors[id];
    if (!a) throw new Error('Unknown actor "' + id + '"');
    return a.at[this.layoutName] || a.at.wide;
  };

  Player.prototype.perLayout = function (v, fallback) {
    if (v == null) return fallback;
    if (typeof v === 'object' && !Array.isArray(v)) return v[this.layoutName] != null ? v[this.layoutName] : fallback;
    return v;
  };

  Player.prototype.drawScene = function () {
    var self = this, L = this.L, f = this.flow, T = L.tile;
    Object.keys(this.layers).forEach(function (k) { self.layers[k].textContent = ''; });

    // Zones
    (f.zones || []).forEach(function (z) {
      var r = z.at[self.layoutName];
      if (!r) return;
      svg('rect', { class: 'hiw-zone', x: r[0], y: r[1], width: r[2], height: r[3], rx: L.radius + 4 }, self.layers.zones);
      var t = svg('text', { class: 'hiw-zone-label', x: r[0] + L.zonePad[0], y: r[1] + L.zonePad[1], 'font-size': L.zoneFont }, self.layers.zones);
      t.textContent = self.perLayout(z.label, z.label.wide || '');
    });

    // Links
    this.linkPts = {};
    (f.links || []).forEach(function (lk) {
      var a = Array.isArray(lk) ? lk[0] : lk.a, b = Array.isArray(lk) ? lk[1] : lk.b;
      var via = Array.isArray(lk) ? null : self.perLayout(lk.via, null);
      var pts = [self.pos(a)].concat(via || []).concat([self.pos(b)]);
      self.linkPts[a + '|' + b] = pts;
      svg('path', { class: 'hiw-link', d: roundedPath(pts, T * 0.6) }, self.layers.links);
    });

    // Actors
    this.actorEls = {};
    Object.keys(f.actors).forEach(function (id) {
      var a = f.actors[id], p = self.pos(id);
      var g = svg('g', { class: 'hiw-actor', transform: 'translate(' + p[0] + ',' + p[1] + ')' }, self.layers.actors);
      var body = svg('g', { class: 'hiw-actor-body' }, g);
      svg('rect', { class: 'hiw-tile', x: -T / 2, y: -T / 2, width: T, height: T, rx: L.radius }, body);
      var is = T * 0.52;
      var icon = svg('svg', {
        class: 'hiw-icon', x: -is / 2, y: -is / 2, width: is, height: is, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }, body);
      icon.innerHTML = ICONS[a.icon] || ICONS.box;

      var side = self.perLayout(a.labelSide, 'below');
      var label = self.perLayout(a.label, a.label);
      var lt, st;
      if (side === 'right') {
        lt = svg('text', { class: 'hiw-label', x: T / 2 + 12, y: L.showSub && a.sub ? -3 : L.label * 0.35, 'font-size': L.label }, g);
        if (L.showSub && a.sub) st = svg('text', { class: 'hiw-sub', x: T / 2 + 12, y: L.sub + 5, 'font-size': L.sub }, g);
      } else {
        lt = svg('text', { class: 'hiw-label', x: 0, y: T / 2 + L.label + 5, 'text-anchor': 'middle', 'font-size': L.label }, g);
        if (L.showSub && a.sub) st = svg('text', { class: 'hiw-sub', x: 0, y: T / 2 + L.label + L.sub + 10, 'text-anchor': 'middle', 'font-size': L.sub }, g);
      }
      lt.textContent = label;
      if (st) { st.textContent = a.sub; fitText(st, side === 'right' ? 170 : 170); }
      svg('title', null, g).textContent = label + (a.sub ? ': ' + a.sub : '');
      self.actorEls[id] = { g: g, body: body, side: side };
    });
  };

  /* ---------- steps ---------- */

  Player.prototype.go = function (i, animate) {
    if (!this.steps.length) return;
    i = clamp(i, 0, this.steps.length - 1);
    this.i = i;
    var token = ++this.token, s = this.steps[i], self = this;
    this.stopDwell();
    this.renderCard(s);
    this.renderScene(s);
    this.updateProgress();
    try { history.replaceState(null, '', '#step-' + (i + 1)); } catch (e) { /* ignore */ }

    this.busy = true;
    var run = animate && !reducedMotion ? this.animateStep(s, token) : this.showStatic(s);
    Promise.resolve(run).then(function () {
      if (token !== self.token) return;
      self.busy = false;
      if (self.playing) self.dwell(token);
    });
  };

  Player.prototype.renderCard = function (s) {
    var ci = this.chapterOf[this.i], c = this.chapters[ci];
    this.eyebrow.textContent = 'Part ' + (ci + 1) + ' of ' + this.chapters.length + ' · ' + c.title;
    this.stepTitle.textContent = s.title;
    this.lede.innerHTML = s.text || '';
    this.analogy.hidden = !s.why;
    this.analogyText.innerHTML = s.why || '';
    this.tryBox.hidden = !s.try;
    if (s.try) this.tryPre.textContent = dedent(s.try);
    var hasTech = !!(s.tech || s.inspect || s.try);
    this.more.hidden = !hasTech;
    this.tech.innerHTML = s.tech || '';
    this.tech.hidden = !s.tech;
    this.inspect.hidden = !s.inspect;
    if (s.inspect) {
      this.inspectCap.textContent = s.inspectTitle || 'What the message looks like';
      this.inspectPre.textContent = dedent(s.inspect);
    }
    this.card.classList.remove('enter');
    void this.card.offsetWidth;
    this.card.classList.add('enter');
    this.panel.scrollTop = 0;
  };

  Player.prototype.involved = function (s) {
    var set = {};
    (s.actors || []).forEach(function (id) { set[id] = 1; });
    (s.work || []).forEach(function (id) { set[id] = 1; });
    (s.packets || []).forEach(function (p) { p.path.forEach(function (id) { set[id] = 1; }); });
    Object.keys(s.say || {}).forEach(function (id) { set[id] = 1; });
    return set;
  };

  Player.prototype.renderScene = function (s) {
    var self = this, L = this.L, T = L.tile;
    ['trails', 'packets', 'bubbles', 'pipes'].forEach(function (k) { self.layers[k].textContent = ''; });

    var inv = this.involved(s), any = Object.keys(inv).length > 0;
    var work = {};
    (s.work || []).forEach(function (id) { work[id] = 1; });
    Object.keys(this.actorEls).forEach(function (id) {
      var g = self.actorEls[id].g;
      g.classList.toggle('on', !!inv[id]);
      g.classList.toggle('dim', any && !inv[id]);
      var old = g.querySelector('.hiw-thinking');
      if (old) old.remove();
      if (work[id]) {
        var d = svg('g', { class: 'hiw-thinking', transform: 'translate(' + (T / 2 - 2) + ',' + (-T / 2 - 1) + ')' }, g);
        var u = T / 56;
        svg('rect', { x: -15 * u, y: -8 * u, width: 30 * u, height: 16 * u, rx: 8 * u }, d);
        [-7, 0, 7].forEach(function (x, k) {
          svg('circle', { cx: x * u, cy: 0, r: 2.2 * u, style: 'animation-delay:' + (k * 0.16) + 's' }, d);
        });
      }
    });

    // Pipes: an open connection, or the encrypted tunnel inside it.
    if (s.pipe) {
      var route = s.pipe.route, kind = s.pipe.kind || 'tcp';
      for (var k = 0; k < route.length - 1; k++) {
        var d = roundedPath(this.hopPoints(route[k], route[k + 1]), T * 0.6);
        if (kind === 'tls') svg('path', { class: 'hiw-pipe-halo', d: d, 'stroke-width': T * 0.42 }, this.layers.pipes);
        svg('path', { class: 'hiw-pipe ' + kind, d: d }, this.layers.pipes);
      }
      if (kind === 'tls') {
        // Put the padlock badge in the middle of the longest hop, away from labels.
        var best = null, bestLen = -1;
        for (var q = 0; q < route.length - 1; q++) {
          var probe = svg('path', { d: roundedPath(this.hopPoints(route[q], route[q + 1]), T * 0.6) }, this.layers.pipes);
          var pl = probe.getTotalLength();
          if (pl > bestLen) { bestLen = pl; best = probe.getPointAtLength(pl / 2); }
          probe.remove();
        }
        var mid = best;
        var badge = svg('g', { class: 'hiw-pipe-badge', transform: 'translate(' + mid.x + ',' + mid.y + ')' }, this.layers.pipes);
        var r = T * 0.22;
        svg('circle', { r: r }, badge);
        var lk = svg('svg', { x: -r * 0.62, y: -r * 0.66, width: r * 1.24, height: r * 1.24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, badge);
        lk.innerHTML = GLYPH.lock;
      }
    }
  };

  // Final frame of a step without animation (used for resize and reduced motion).
  Player.prototype.showStatic = function (s) {
    var self = this;
    (s.packets || []).forEach(function (p) {
      for (var k = 0; k < p.path.length - 1; k++) {
        var path = svg('path', { class: 'hiw-trail ' + (p.reply ? 'back' : 'out'), d: roundedPath(self.hopPoints(p.path[k], p.path[k + 1]), self.L.tile * 0.6) }, self.layers.trails);
        path.classList.add('settled');
      }
    });
    var say = s.say || {};
    Object.keys(say).forEach(function (id) { self.showBubble(id, say[id]); });
  };

  Player.prototype.hopPoints = function (a, b) {
    var f = this.linkPts[a + '|' + b];
    if (f) return f;
    var r = this.linkPts[b + '|' + a];
    if (r) return r.slice().reverse();
    return [this.pos(a), this.pos(b)];
  };

  Player.prototype.animateStep = function (s, token) {
    var self = this, packets = s.packets || [], say = s.say || {};

    // A speech bubble appears when a message arrives at that actor; otherwise right away.
    var after = {}, now = [];
    Object.keys(say).forEach(function (id) {
      var idx = -1;
      packets.forEach(function (p, k) { if (idx < 0 && p.path[p.path.length - 1] === id) idx = k; });
      if (idx >= 0) (after[idx] = after[idx] || []).push(id);
      else now.push(id);
    });
    now.forEach(function (id) { self.showBubble(id, say[id]); });
    if (!packets.length) return wait(300);

    var groups = [];
    packets.forEach(function (p, k) {
      if (p.parallel && groups.length) groups[groups.length - 1].push(k);
      else groups.push([k]);
    });

    var chain = wait((now.length ? 650 : 250) / this.speed());
    groups.forEach(function (group, gi) {
      chain = chain.then(function () {
        if (token !== self.token) return;
        return Promise.all(group.map(function (k, gk) {
          return wait(gk * 260 / self.speed()).then(function () {
            return self.sendPacket(packets[k], token);
          }).then(function () {
            if (token !== self.token) return;
            (after[k] || []).forEach(function (id) { self.showBubble(id, say[id]); });
          });
        })).then(function () {
          if (token === self.token && gi < groups.length - 1) return wait(380 / self.speed());
        });
      });
    });
    return chain;
  };

  Player.prototype.speed = function () { return SPEEDS[this.speedIdx]; };

  Player.prototype.makePacket = function (p) {
    var L = this.L, P = L.pill;
    var g = svg('g', { class: 'hiw-packet ' + (p.reply ? 'back' : 'out') + (p.locked ? ' locked' : '') }, this.layers.packets);
    var body = svg('g', { class: 'hiw-packet-body' }, g);
    var rect = svg('rect', { class: 'hiw-packet-bg', height: P, y: -P / 2, rx: P / 2 }, body);
    var gs = P * 0.56;
    var glyph = svg('svg', { class: 'hiw-packet-glyph', width: gs, height: gs, y: -gs / 2, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, body);
    glyph.innerHTML = p.locked ? GLYPH.lock : GLYPH.envelope;
    var t = svg('text', { class: 'hiw-packet-text', 'font-size': L.pillFont, y: L.pillFont * 0.36 }, body);
    t.textContent = p.label || '';
    var tw = p.label ? t.getComputedTextLength() || p.label.length * L.pillFont * 0.6 : 0;
    var padL = P * 0.32, gap = P * 0.2, padR = P * 0.42;
    var w = padL + gs + (tw ? gap + tw : 0) + (tw ? padR : padL);
    rect.setAttribute('x', -w / 2);
    rect.setAttribute('width', w);
    glyph.setAttribute('x', -w / 2 + padL);
    t.setAttribute('x', -w / 2 + padL + gs + gap);
    var start = this.pos(p.path[0]);
    g.setAttribute('transform', 'translate(' + start[0] + ',' + start[1] + ')');
    return g;
  };

  Player.prototype.sendPacket = function (p, token) {
    var self = this;
    if (token !== this.token) return Promise.resolve();
    var g = this.makePacket(p);
    var cls = p.reply ? 'back' : 'out';
    var chain = Promise.resolve();
    for (var k = 0; k < p.path.length - 1; k++) {
      (function (a, b, last) {
        chain = chain.then(function () {
          if (token !== self.token) return;
          return self.moveAlong(self.hopPoints(a, b), g, cls, token).then(function () {
            if (token !== self.token) return;
            self.ping(b);
            if (!last) return wait(160 / self.speed());
          });
        });
      })(p.path[k], p.path[k + 1], k === p.path.length - 2);
    }
    return chain.then(function () {
      g.classList.add('landed');
      setTimeout(function () { g.remove(); }, 450);
    });
  };

  Player.prototype.moveAlong = function (pts, g, cls, token) {
    var self = this, L = this.L;
    return new Promise(function (resolve) {
      var path = svg('path', { class: 'hiw-trail ' + cls, d: roundedPath(pts, L.tile * 0.6) }, self.layers.trails);
      var len = path.getTotalLength() || 1;
      path.style.strokeDasharray = len + ' ' + len;
      path.style.strokeDashoffset = len;
      // Duration grows with distance, normalised so both layouts feel the same.
      var ms = (420 + len * (1000 / L.w) * 1.5) / self.speed();
      var start = performance.now(), done = false;
      var guard = setTimeout(function () { frame(start + ms); }, ms + 300);
      function frame(now) {
        if (done) return;
        if (token !== self.token) { done = true; clearTimeout(guard); return resolve(); }
        var t = Math.min((now - start) / ms, 1), e = easeInOut(t);
        var pt = path.getPointAtLength(e * len);
        g.setAttribute('transform', 'translate(' + pt.x.toFixed(2) + ',' + pt.y.toFixed(2) + ')');
        path.style.strokeDashoffset = (len * (1 - e)).toFixed(2);
        if (t < 1) requestAnimationFrame(frame);
        else { done = true; clearTimeout(guard); path.classList.add('settled'); resolve(); }
      }
      requestAnimationFrame(frame);
    });
  };

  Player.prototype.ping = function (id) {
    var a = this.actorEls[id];
    if (!a) return;
    a.body.classList.remove('ping');
    void a.body.getBoundingClientRect();
    a.body.classList.add('ping');
  };

  Player.prototype.showBubble = function (id, text) {
    var L = this.L, T = L.tile, p = this.pos(id), a = this.flow.actors[id];
    var fs = L.bubble, lh = fs * 1.32, padX = fs * 0.85, padY = fs * 0.62;
    var lines = wrapWords(text, L.bubbleChars);

    var g = svg('g', { class: 'hiw-bubble' }, this.layers.bubbles);
    var body = svg('g', { class: 'hiw-bubble-body' }, g);
    var rect = svg('rect', { rx: fs * 0.75 }, body);
    var tail = svg('path', { class: 'hiw-bubble-tail' }, body);
    var tx = svg('text', { 'font-size': fs }, body);
    lines.forEach(function (ln, k) {
      var ts = svg('tspan', { x: padX, y: padY + fs * 0.8 + k * lh }, tx);
      ts.textContent = ln;
    });
    var w = Math.ceil(tx.getBBox().width + padX * 2);
    var hh = Math.ceil(padY * 2 + fs * 0.95 + (lines.length - 1) * lh);
    rect.setAttribute('width', w);
    rect.setAttribute('height', hh);

    var side = this.perLayout(a.bubble, 'above');
    var labelBlock = this.actorEls[id].side === 'right' ? 0 : L.label + 8 + (L.showSub && a.sub ? L.sub + 6 : 0);
    var bx, by;
    if (side === 'above') {
      by = p[1] - T / 2 - 12 - hh;
      if (by < 4) side = 'below';
    }
    if (side === 'below') by = p[1] + T / 2 + labelBlock + 10;
    if (side === 'above' || side === 'below') bx = clamp(p[0] - w / 2, 4, L.w - 4 - w);
    if (side === 'left') { bx = p[0] - T / 2 - 14 - w; by = p[1] - hh / 2; }
    if (side === 'right') { bx = p[0] + T / 2 + 14; by = p[1] - hh / 2; }
    by = clamp(by, 4, L.h - 4 - hh);

    var k = fs * 0.55, d;
    if (side === 'above') { var cx = clamp(p[0] - bx, 14, w - 14); d = 'M' + (cx - k) + ',' + (hh - 1) + ' L' + cx + ',' + (hh + k * 1.2) + ' L' + (cx + k) + ',' + (hh - 1); }
    else if (side === 'below') { var cx2 = clamp(p[0] - bx, 14, w - 14); d = 'M' + (cx2 - k) + ',1 L' + cx2 + ',' + (-k * 1.2) + ' L' + (cx2 + k) + ',1'; }
    else if (side === 'left') { d = 'M' + (w - 1) + ',' + (hh / 2 - k) + ' L' + (w + k * 1.2) + ',' + hh / 2 + ' L' + (w - 1) + ',' + (hh / 2 + k); }
    else { d = 'M1,' + (hh / 2 - k) + ' L' + (-k * 1.2) + ',' + hh / 2 + ' L1,' + (hh / 2 + k); }
    tail.setAttribute('d', d);
    g.setAttribute('transform', 'translate(' + bx + ',' + by + ')');
    body.setAttribute('data-side', side);
  };

  /* ---------- auto-play ---------- */

  Player.prototype.dwell = function (token) {
    var self = this, s = this.steps[this.i];
    var n = countWords(s.text) + countWords(s.why) + countWords(s.title);
    var ms = clamp(1800 + n * 210, 4000, 16000) / this.speed();
    var fill = this.fill;
    fill.style.transition = 'none';
    fill.style.transform = 'scaleX(0)';
    void fill.offsetWidth;
    fill.style.transition = 'transform ' + ms + 'ms linear';
    fill.style.transform = 'scaleX(1)';
    this.dwellTimer = setTimeout(function () {
      if (token !== self.token || !self.playing) return;
      if (self.i >= self.steps.length - 1) { self.playing = false; self.updatePlay(); self.stopDwell(); return; }
      self.go(self.i + 1, true);
    }, ms);
  };

  Player.prototype.stopDwell = function () {
    clearTimeout(this.dwellTimer);
    this.fill.style.transition = 'none';
    this.fill.style.transform = 'scaleX(0)';
  };

  Player.prototype.togglePlay = function () {
    this.playing = !this.playing;
    this.updatePlay();
    if (!this.playing) { this.stopDwell(); return; }
    if (this.i >= this.steps.length - 1) { this.go(0, true); return; }
    if (!this.busy) this.dwell(this.token);
  };

  Player.prototype.updatePlay = function () {
    this.btnPlay.innerHTML = (this.playing ? UI.pause : UI.play) + '<span class="hiw-btn-text">' + (this.playing ? 'Pause' : 'Play') + '</span>';
    this.btnPlay.setAttribute('aria-pressed', this.playing ? 'true' : 'false');
    this.btnPlay.setAttribute('aria-label', this.playing ? 'Pause' : 'Play all steps automatically');
    this.root.classList.toggle('playing', this.playing);
  };

  Player.prototype.updateSpeed = function () {
    this.btnSpeed.textContent = SPEEDS[this.speedIdx] + '×';
  };

  Player.prototype.updateProgress = function () {
    var i = this.i, ci = this.chapterOf[i];
    this.segs.forEach(function (b, idx) {
      b.classList.toggle('done', idx < i);
      b.classList.toggle('current', idx === i);
      if (idx === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    this.groups.forEach(function (g, gi) {
      g.classList.toggle('current', gi === ci);
      g.classList.toggle('done', gi < ci);
    });
    this.counter.innerHTML = '<span class="long">Step </span>' + (i + 1) + '<span class="long"> of </span><span class="short"> / </span>' + this.steps.length;
    this.btnPrev.disabled = i === 0;
    this.btnNext.disabled = i === this.steps.length - 1;
  };

  window.HowItWorks = {
    icons: ICONS,
    mount: function (flow) {
      var started = false;
      var start = function () {
        if (started) return;
        started = true;
        window.HowItWorks.player = new Player(flow);
      };
      var ready = function () {
        // Text is measured for packet labels and bubbles, so wait for the web fonts (briefly).
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(start);
          setTimeout(start, 1500);
        } else start();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
      else ready();
    }
  };
})();
