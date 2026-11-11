/*
 * How It Works — step-by-step animation player.
 * No dependencies. An explainer calls HowItWorks.mount(flow) with a data object
 * describing actors (boxes on the stage), links between them, and steps.
 * See README.md for the full flow format.
 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  // 24x24 stroke icons. Add more here and reference them by name in a flow.
  var ICONS = {
    browser: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><path d="M6 6.5h.01M8.5 6.5h.01"/>',
    os: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    router: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 16.5h.01M10.5 16.5h.01"/><path d="M15 13V9"/><path d="M12.2 7.2a4 4 0 0 1 5.6 0"/><path d="M10 4.8a7.5 7.5 0 0 1 10 0"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
    server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01"/>',
    db: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    cloud: '<path d="M7 19h10.5a4.5 4.5 0 0 0 .4-9A6 6 0 0 0 6.3 11.5 3.8 3.8 0 0 0 7 19z"/>',
    lb: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 12h10M7 11l10-5M7 13l10 5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
    queue: '<rect x="3" y="6" width="4" height="12" rx="1"/><rect x="10" y="6" width="4" height="12" rx="1"/><rect x="17" y="6" width="4" height="12" rx="1"/>'
  };

  var UI = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>',
    restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4.5" height="16" rx="1"/><rect x="13.5" y="4" width="4.5" height="16" rx="1"/></svg>',
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M10 9v6l5-3z" fill="currentColor"/></svg>'
  };

  // Default stage geometry. "wide" is used for landscape stages, "tall" for portrait (phones).
  var LAYOUTS = {
    wide: { w: 1000, h: 560, box: [150, 60], label: 14, sub: 11, icon: 22, packet: 7, pill: 22, pillFont: 12 },
    tall: { w: 400, h: 420, box: [116, 44], label: 11.5, sub: 8.8, icon: 15, packet: 5.5, pill: 18, pillFont: 10.5 }
  };

  var SPEEDS = [0.5, 1, 1.5, 2, 3];
  var HOP_MS = 900;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent, ns) {
    var node = ns === false ? document.createElement(tag) : document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function h(tag, attrs, parent) { return el(tag, attrs, parent, false); }

  function dedent(str) {
    var lines = String(str).replace(/^\n+|\s+$/g, '').split('\n');
    var min = Infinity;
    lines.forEach(function (l) { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    return lines.map(function (l) { return l.slice(min === Infinity ? 0 : min); }).join('\n');
  }

  function words(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || '').split(/\s+/).filter(Boolean).length;
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

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var ease = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };

  function Player(flow) {
    this.flow = flow;
    this.steps = flow.steps || [];
    this.layouts = Object.assign({}, LAYOUTS, flow.layouts || {});
    this.phases = flow.phases || {};
    this.i = 0;
    this.speedIdx = 1;
    this.playing = false;
    this.animating = false;
    this.token = 0;
    this.layoutName = null;
    this.build();
    this.bind();
    var m = /step-(\d+)/.exec(location.hash);
    var start = m ? clamp(parseInt(m[1], 10) - 1, 0, this.steps.length - 1) : 0;
    this.chooseLayout();
    this.go(start, true);
  }

  Player.prototype.build = function () {
    var f = this.flow;
    document.title = f.title + ' · How It Works';
    var root = this.root = h('div', { class: 'hiw' }, document.body);

    var top = h('header', { class: 'hiw-top' }, root);
    var back = h('a', { class: 'icon-btn hiw-back', href: f.home || '../../', 'aria-label': 'All explainers', title: 'All explainers' }, top);
    back.innerHTML = UI.back;
    var titles = h('div', { class: 'hiw-titles' }, top);
    h('h1', { class: 'hiw-title' }, titles).textContent = f.title;
    if (f.subtitle) h('p', { class: 'hiw-subtitle' }, titles).textContent = f.subtitle;
    var themeBtn = h('button', { class: 'icon-btn', 'data-theme-toggle': '', 'aria-label': 'Toggle dark mode', title: 'Toggle dark mode' }, top);
    themeBtn.innerHTML = UI.theme;

    var main = h('main', { class: 'hiw-main' }, root);
    this.stage = h('section', { class: 'hiw-stage', 'aria-label': 'Animation stage' }, main);
    this.svg = el('svg', { role: 'img', 'aria-label': f.title + ' diagram', preserveAspectRatio: 'xMidYMid meet' }, this.stage);
    this.layers = {};
    var self = this;
    ['links', 'trails', 'packets', 'actors', 'notes'].forEach(function (n) {
      self.layers[n] = el('g', { class: 'hiw-layer-' + n }, self.svg);
    });

    var panel = this.panel = h('aside', { class: 'hiw-panel' }, main);
    this.phaseNav = h('nav', { class: 'hiw-phases', 'aria-label': 'Phases' }, panel);
    var card = this.card = h('article', { class: 'hiw-card', 'aria-live': 'polite' }, panel);
    var meta = h('div', { class: 'hiw-meta' }, card);
    this.chip = h('span', { class: 'hiw-chip' }, meta);
    this.proto = h('span', { class: 'hiw-proto' }, meta);
    this.count = h('span', { class: 'hiw-count' }, meta);
    this.stepTitle = h('h2', { class: 'hiw-step-title' }, card);
    this.text = h('div', { class: 'hiw-text' }, card);
    this.inspect = h('details', { class: 'hiw-inspect', open: '' }, card);
    this.inspectHead = h('summary', null, this.inspect);
    this.inspectPre = h('pre', null, this.inspect);

    var controls = h('footer', { class: 'hiw-controls' }, root);
    this.timeline = h('div', { class: 'hiw-timeline', role: 'group', 'aria-label': 'Steps' }, controls);
    var btns = h('div', { class: 'hiw-buttons' }, controls);
    this.btnRestart = h('button', { class: 'icon-btn', 'aria-label': 'Restart', title: 'Restart (Home)' }, btns);
    this.btnRestart.innerHTML = UI.restart;
    this.btnPrev = h('button', { class: 'hiw-btn', 'aria-label': 'Previous step', title: 'Previous (←)' }, btns);
    this.btnPrev.innerHTML = UI.prev + '<span>Prev</span>';
    this.btnPlay = h('button', { class: 'hiw-btn hiw-play', title: 'Auto-play (Space)' }, btns);
    this.btnNext = h('button', { class: 'hiw-btn hiw-next', 'aria-label': 'Next step', title: 'Next (→)' }, btns);
    this.btnNext.innerHTML = '<span class="hiw-fill"></span><span>Next</span>' + UI.next;
    this.btnSpeed = h('button', { class: 'hiw-btn hiw-speed', 'aria-label': 'Playback speed', title: 'Playback speed' }, btns);
    this.btnReplay = h('button', { class: 'icon-btn hiw-replay', 'aria-label': 'Replay this step', title: 'Replay step (R)' }, btns);
    this.btnReplay.innerHTML = UI.replay;
    this.fill = this.btnNext.querySelector('.hiw-fill');

    // Phase chips + timeline segments
    var seen = {};
    this.steps.forEach(function (s, idx) {
      var ph = self.phase(s);
      if (!seen[s.phase]) {
        seen[s.phase] = true;
        var chip = h('button', { class: 'hiw-phase', 'data-phase': s.phase }, self.phaseNav);
        chip.style.setProperty('--c', ph.color);
        chip.textContent = ph.label;
        chip.addEventListener('click', function () { self.go(idx, true); });
      }
      var seg = h('button', { class: 'hiw-seg', 'aria-label': 'Step ' + (idx + 1) + ': ' + s.title, title: (idx + 1) + '. ' + s.title }, self.timeline);
      seg.style.setProperty('--c', ph.color);
      seg.addEventListener('click', function () { self.go(idx, true); });
    });

    this.updatePlay();
    this.updateSpeed();
  };

  Player.prototype.phase = function (s) {
    return this.phases[s.phase] || { label: s.phase || 'Step', color: '#64748b' };
  };

  Player.prototype.bind = function () {
    var self = this;
    this.btnPrev.addEventListener('click', function () { self.go(self.i - 1, true); });
    this.btnNext.addEventListener('click', function () { self.go(self.i + 1, true); });
    this.btnRestart.addEventListener('click', function () { self.go(0, true); });
    this.btnReplay.addEventListener('click', function () { self.go(self.i, true); });
    this.btnPlay.addEventListener('click', function () { self.togglePlay(); });
    this.btnSpeed.addEventListener('click', function () {
      self.speedIdx = (self.speedIdx + 1) % SPEEDS.length;
      self.updateSpeed();
    });

    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      var onButton = tag === 'button' || tag === 'summary';
      switch (e.key) {
        case 'ArrowRight': case 'l': self.go(self.i + 1, true); e.preventDefault(); break;
        case 'ArrowLeft': case 'h': self.go(self.i - 1, true); e.preventDefault(); break;
        case 'Home': self.go(0, true); e.preventDefault(); break;
        case 'End': self.go(self.steps.length - 1, true); e.preventDefault(); break;
        case 'r': self.go(self.i, true); break;
        case ' ': case 'k':
          if (onButton && e.key === ' ') return;
          self.togglePlay(); e.preventDefault(); break;
      }
    });

    // Swipe left/right on the stage or the card.
    [this.stage, this.card].forEach(function (area) {
      var sx = 0, sy = 0, tracking = false;
      area.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) { tracking = false; return; }
        tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      area.addEventListener('touchend', function (e) {
        if (!tracking) return;
        tracking = false;
        var t = e.changedTouches[0];
        var dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) self.go(self.i + (dx < 0 ? 1 : -1), true);
      }, { passive: true });
    });

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        if (self.chooseLayout()) self.go(self.i, false);
      }).observe(this.stage);
    } else {
      window.addEventListener('resize', function () { if (self.chooseLayout()) self.go(self.i, false); });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && self.playing) self.togglePlay();
    });
  };

  // Picks wide/tall geometry from the stage's aspect ratio. Returns true if it changed.
  Player.prototype.chooseLayout = function () {
    var r = this.stage.getBoundingClientRect();
    var name;
    if (!r.width || !r.height) {
      if (this.layoutName) return false;
      name = window.innerWidth >= window.innerHeight ? 'wide' : 'tall';
    } else {
      name = r.width / r.height >= 1.15 ? 'wide' : 'tall';
    }
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
    var p = a.at[this.layoutName] || a.at.wide;
    return [p[0], p[1]];
  };

  Player.prototype.drawScene = function () {
    var self = this, L = this.L, f = this.flow;
    Object.keys(this.layers).forEach(function (k) { self.layers[k].textContent = ''; });

    (f.links || []).forEach(function (pair) {
      var a = self.pos(pair[0]), b = self.pos(pair[1]);
      el('line', { class: 'hiw-link', x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, self.layers.links);
    });

    this.actorEls = {};
    Object.keys(f.actors).forEach(function (id) {
      var a = f.actors[id];
      var p = self.pos(id);
      var bw = L.box[0], bh = L.box[1];
      var g = el('g', { class: 'hiw-actor', transform: 'translate(' + p[0] + ',' + p[1] + ')' }, self.layers.actors);
      el('rect', { class: 'hiw-ring', x: -bw / 2 - 5, y: -bh / 2 - 5, width: bw + 10, height: bh + 10, rx: 14 }, g);
      el('rect', { class: 'hiw-box', x: -bw / 2, y: -bh / 2, width: bw, height: bh, rx: 10 }, g);
      var pad = L.icon * 0.45;
      var icon = el('svg', {
        class: 'hiw-icon', x: -bw / 2 + pad, y: -L.icon / 2, width: L.icon, height: L.icon, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      }, g);
      icon.innerHTML = ICONS[a.icon] || ICONS.box;
      var tx = -bw / 2 + pad * 2 + L.icon;
      var hasSub = !!a.sub;
      var label = el('text', { class: 'hiw-label', x: tx, y: hasSub ? -L.sub * 0.35 : 0, 'dominant-baseline': 'central', 'font-size': L.label }, g);
      label.textContent = a.label;
      if (hasSub) {
        var sub = el('text', { class: 'hiw-sub', x: tx, y: L.label * 0.85, 'dominant-baseline': 'central', 'font-size': L.sub }, g);
        sub.textContent = a.sub;
      }
      // Keep text inside the box: ellipsize anything that would overflow.
      var maxW = bw / 2 - tx - 8;
      Array.prototype.forEach.call(g.querySelectorAll('text'), function (t) { fitText(t, maxW); });
      el('title', null, g).textContent = a.label + (a.sub ? ' — ' + a.sub : '');
      self.actorEls[id] = g;
    });
  };

  Player.prototype.go = function (i, animate) {
    if (!this.steps.length) return;
    i = clamp(i, 0, this.steps.length - 1);
    this.i = i;
    var token = ++this.token;
    var s = this.steps[i];
    var ph = this.phase(s);
    this.root.style.setProperty('--phase', ph.color);
    this.stopDwell();
    this.renderPanel(s, ph);
    this.renderState(s, ph);
    this.updateTimeline();
    try { history.replaceState(null, '', '#step-' + (i + 1)); } catch (e) { /* file:// in some browsers */ }

    var self = this;
    var run = animate ? this.playPackets(s, ph, token) : Promise.resolve();
    run.then(function () {
      if (token !== self.token) return;
      if (self.playing) self.dwell(token);
    });
  };

  Player.prototype.renderPanel = function (s, ph) {
    this.chip.textContent = ph.label;
    this.proto.textContent = s.proto || '';
    this.proto.hidden = !s.proto;
    this.count.textContent = (this.i + 1) + ' / ' + this.steps.length;
    this.stepTitle.textContent = s.title;
    this.text.innerHTML = s.text || '';
    if (s.inspect) {
      this.inspect.hidden = false;
      this.inspectHead.textContent = s.inspectTitle || 'Under the hood';
      this.inspectPre.textContent = dedent(s.inspect);
    } else {
      this.inspect.hidden = true;
    }
    this.card.classList.remove('enter');
    void this.card.offsetWidth; // restart the entrance animation
    this.card.classList.add('enter');
    this.panel.scrollTop = 0;

    var phaseKey = s.phase, nav = this.phaseNav;
    Array.prototype.forEach.call(nav.children, function (c) {
      var on = c.getAttribute('data-phase') === phaseKey;
      c.classList.toggle('on', on);
      // On phones the chips scroll sideways; keep the active one in view without scrolling the page.
      if (on && nav.scrollWidth > nav.clientWidth) {
        var left = c.offsetLeft - nav.offsetLeft;
        if (left < nav.scrollLeft || left + c.offsetWidth > nav.scrollLeft + nav.clientWidth) {
          nav.scrollTo({ left: Math.max(0, left - 16), behavior: 'smooth' });
        }
      }
    });
  };

  Player.prototype.involved = function (s) {
    var set = {};
    (s.actors || []).forEach(function (id) { set[id] = true; });
    (s.work || []).forEach(function (id) { set[id] = true; });
    (s.packets || []).forEach(function (p) { p.path.forEach(function (id) { set[id] = true; }); });
    Object.keys(s.notes || {}).forEach(function (id) { set[id] = true; });
    return set;
  };

  Player.prototype.renderState = function (s, ph) {
    var self = this, L = this.L;
    var involved = this.involved(s);
    var anyInvolved = Object.keys(involved).length > 0;
    var work = {};
    (s.work || []).forEach(function (id) { work[id] = true; });

    Object.keys(this.actorEls).forEach(function (id) {
      var g = self.actorEls[id];
      g.classList.toggle('on', !!involved[id]);
      g.classList.toggle('dim', anyInvolved && !involved[id]);
      g.classList.toggle('working', !!work[id]);
    });

    // Trails: the route(s) this step's packets travel, with marching dashes showing direction.
    this.layers.trails.textContent = '';
    var segs = {};
    (s.packets || []).forEach(function (p) {
      for (var k = 0; k < p.path.length - 1; k++) {
        var a = p.path[k], b = p.path[k + 1];
        var key = a < b ? a + '|' + b : b + '|' + a;
        if (!segs[key]) segs[key] = { a: a, b: b, both: false };
        else if (segs[key].a !== a) segs[key].both = true;
      }
    });
    Object.keys(segs).forEach(function (key) {
      var sg = segs[key], pa = self.pos(sg.a), pb = self.pos(sg.b);
      el('line', { class: 'hiw-trail' + (sg.both ? ' both' : ''), x1: pa[0], y1: pa[1], x2: pb[0], y2: pb[1] }, self.layers.trails);
    });

    // Notes: small tags attached to actors ("cache miss", "TTL 300s"...)
    this.layers.notes.textContent = '';
    Object.keys(s.notes || {}).forEach(function (id) {
      var p = self.pos(id);
      var below = p[1] + L.box[1] / 2 + L.pill + 6 < L.h;
      var y = below ? p[1] + L.box[1] / 2 + L.pill / 2 + 5 : p[1] - L.box[1] / 2 - L.pill / 2 - 5;
      var g = el('g', { class: 'hiw-note', transform: 'translate(' + p[0] + ',' + y + ')' }, self.layers.notes);
      var bg = el('rect', { height: L.pill, y: -L.pill / 2, rx: L.pill / 2 }, g);
      var t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': L.pillFont }, g);
      t.textContent = s.notes[id];
      var w = (t.getComputedTextLength() || s.notes[id].length * L.pillFont * 0.6) + L.pillFont * 1.3;
      bg.setAttribute('width', w);
      bg.setAttribute('x', -w / 2);
    });
  };

  Player.prototype.hopMs = function () {
    return (reducedMotion ? 120 : HOP_MS) / SPEEDS[this.speedIdx];
  };

  Player.prototype.playPackets = function (s, ph, token) {
    var self = this;
    var list = s.packets || [];
    this.layers.packets.textContent = '';
    if (!list.length) return Promise.resolve();
    this.animating = true;
    var chain = Promise.resolve();
    var groups = [];
    list.forEach(function (p) {
      if (p.parallel && groups.length) groups[groups.length - 1].push(p);
      else groups.push([p]);
    });
    groups.forEach(function (group, gi) {
      chain = chain.then(function () {
        if (token !== self.token) return;
        var pause = gi === 0 ? 150 : 220;
        return self.wait(pause / SPEEDS[self.speedIdx]).then(function () {
          if (token !== self.token) return;
          return Promise.all(group.map(function (p, pi) {
            return self.wait((p.delay || pi * 120) / SPEEDS[self.speedIdx]).then(function () {
              return self.movePacket(p, p.color || ph.color, token);
            });
          }));
        });
      });
    });
    return chain.then(function () { if (token === self.token) self.animating = false; });
  };

  Player.prototype.wait = function (ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  };

  Player.prototype.movePacket = function (p, color, token) {
    var self = this, L = this.L;
    return new Promise(function (resolve) {
      if (token !== self.token) return resolve();
      var pts = p.path.map(function (id) { return self.pos(id); });
      var g = el('g', { class: 'hiw-packet' }, self.layers.packets);
      el('circle', { r: L.packet, fill: color }, g);
      if (p.label) {
        var pill = el('g', { transform: 'translate(0,' + -(L.packet + L.pill / 2 + 3) + ')' }, g);
        var bg = el('rect', { height: L.pill, y: -L.pill / 2, rx: L.pill / 2, fill: color }, pill);
        var t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': L.pillFont }, pill);
        t.textContent = p.label;
        var w = (t.getComputedTextLength() || p.label.length * L.pillFont * 0.6) + L.pillFont * 1.3;
        bg.setAttribute('width', w);
        bg.setAttribute('x', -w / 2);
      }
      var hops = pts.length - 1;
      var total = Math.max(1, hops * self.hopMs());
      var start = performance.now();
      g.setAttribute('transform', 'translate(' + pts[0][0] + ',' + pts[0][1] + ')');
      var finished = false;
      // Fallback in case rAF is throttled (background tab): the flow must never stall.
      var guard = setTimeout(function () { tick(start + total); }, total + 250);

      function tick(now) {
        if (finished) return;
        if (token !== self.token) { finished = true; clearTimeout(guard); g.remove(); return resolve(); }
        var k = Math.min((now - start) / total, 1);
        var prog = k * hops;
        var hop = Math.min(Math.floor(prog), hops - 1);
        var t = ease(prog - hop);
        var a = pts[hop], b = pts[hop + 1];
        g.setAttribute('transform', 'translate(' + (a[0] + (b[0] - a[0]) * t) + ',' + (a[1] + (b[1] - a[1]) * t) + ')');
        if (k < 1) requestAnimationFrame(tick);
        else {
          finished = true;
          clearTimeout(guard);
          g.classList.add('done');
          setTimeout(function () { g.remove(); }, 400);
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  };

  // Auto-play: wait long enough to read the step, then advance. The Next button fills up as a countdown.
  Player.prototype.dwell = function (token) {
    var self = this;
    var s = this.steps[this.i];
    var n = words(s.text) + words(s.title) + (s.inspect ? 6 : 0);
    var ms = clamp(1400 + n * 190, 3000, 14000) / SPEEDS[this.speedIdx];
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
    this.dwellTimer = null;
    this.fill.style.transition = 'none';
    this.fill.style.transform = 'scaleX(0)';
  };

  Player.prototype.togglePlay = function () {
    this.playing = !this.playing;
    this.updatePlay();
    if (!this.playing) { this.stopDwell(); return; }
    if (this.i >= this.steps.length - 1) { this.go(0, true); return; }
    if (!this.animating) this.dwell(this.token);
  };

  Player.prototype.updatePlay = function () {
    this.btnPlay.innerHTML = (this.playing ? UI.pause : UI.play) + '<span>' + (this.playing ? 'Pause' : 'Auto-play') + '</span>';
    this.btnPlay.setAttribute('aria-pressed', this.playing ? 'true' : 'false');
    this.btnPlay.setAttribute('aria-label', this.playing ? 'Pause auto-play' : 'Start auto-play');
    this.root.classList.toggle('playing', this.playing);
  };

  Player.prototype.updateSpeed = function () {
    this.btnSpeed.textContent = SPEEDS[this.speedIdx] + '×';
  };

  Player.prototype.updateTimeline = function () {
    var i = this.i;
    Array.prototype.forEach.call(this.timeline.children, function (seg, idx) {
      seg.classList.toggle('done', idx < i);
      seg.classList.toggle('current', idx === i);
      if (idx === i) seg.setAttribute('aria-current', 'step'); else seg.removeAttribute('aria-current');
    });
    this.btnPrev.disabled = i === 0;
    this.btnNext.disabled = i === this.steps.length - 1;
  };

  window.HowItWorks = {
    icons: ICONS,
    mount: function (flow) {
      var start = function () { window.HowItWorks.player = new Player(flow); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
      else start();
    }
  };
})();
