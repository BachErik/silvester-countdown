/**
 * Handwritten "snake" digits.
 *
 * Every digit slot owns one snake. A snake is a window [tail, head] (in arc
 * length) sliding along a "track": a polyline whose segments are either ink
 * (drawn) or pen-up hops (invisible, e.g. between the two strokes of a 4).
 *
 * When a digit changes, the track becomes
 *     old digit  +  free-flying connector  +  new digit
 * and head and tail both slide forward together: the head leaves the old digit
 * where its stroke ended, swings out in a random direction, and writes the new
 * digit while the tail is pulled out of the old one. The body length eases from
 * the old digit's length to the new one's.
 *
 * Coordinates of a track are "slot units": the slot's height is 100 units, the
 * origin is the slot's top-left corner. They are mapped to screen pixels every
 * frame, so layout changes (resize, segments hiding) just work.
 */
(() => {
  "use strict";

  const GLYPHS = window.GLYPHS;
  const SLOT_W = 72; // slot width in slot units (height is 100)
  const INK = 0.84; // glyph ink height relative to the slot height
  const LINE = 5.2; // stroke width in slot units
  const HOP = 6; // arc length given to invisible pen-up hops
  const DURATION = 780; // ms per transition; must stay < 1000 for the seconds
  const ENTER_DURATION = 900;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------- small vector helpers ----------
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const len = (a) => Math.hypot(a[0], a[1]);
  const norm = (a) => {
    const l = len(a) || 1;
    return [a[0] / l, a[1] / l];
  };
  const perp = (a) => [-a[1], a[0]];
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

  // ---------- tracks ----------
  /** Track = { pts: [[x,y]], ink: [bool per segment], s: [cumulative length per point] } */
  function makeTrack() {
    return { pts: [], ink: [], s: [] };
  }

  function pushPoint(track, p, ink, segLen) {
    if (track.pts.length === 0) {
      track.pts.push(p);
      track.s.push(0);
      return;
    }
    const prev = track.pts[track.pts.length - 1];
    const l = segLen !== undefined ? segLen : len(sub(p, prev));
    track.pts.push(p);
    track.ink.push(ink);
    track.s.push(track.s[track.s.length - 1] + l);
  }

  function appendTrack(target, source) {
    source.pts.forEach((p, i) => {
      if (i === 0) {
        // join point: zero-length invisible link if it does not coincide
        pushPoint(target, p, false, 0);
      } else {
        pushPoint(target, p, source.ink[i - 1], source.s[i] - source.s[i - 1]);
      }
    });
    return target;
  }

  const total = (track) => (track.s.length ? track.s[track.s.length - 1] : 0);
  const first = (track) => track.pts[0];
  const last = (track) => track.pts[track.pts.length - 1];

  function startDir(track) {
    for (let i = 0; i < track.ink.length; i++)
      if (track.ink[i]) return norm(sub(track.pts[Math.min(i + 3, track.pts.length - 1)], track.pts[i]));
    return [0, 1];
  }

  function endDir(track) {
    for (let i = track.ink.length - 1; i >= 0; i--)
      if (track.ink[i]) return norm(sub(track.pts[i + 1], track.pts[Math.max(i - 2, 0)]));
    return [0, -1];
  }

  /** Build the track of one glyph variant, placed and scaled inside the slot. */
  function glyphTrack(digit, variantIndex) {
    const v = GLYPHS[digit][variantIndex];
    // glyph units (ink height 100) -> slot units; wide glyphs shrink to fit the slot
    const k = Math.min(INK, (SLOT_W * 0.95) / v.w);
    const ox = (SLOT_W - v.w * k) / 2;
    const oy = (100 - v.h * k) / 2;
    const track = makeTrack();
    v.strokes.forEach((flat, si) => {
      for (let i = 0; i < flat.length; i += 2) {
        const p = [ox + flat[i] * k, oy + flat[i + 1] * k];
        if (i === 0 && si > 0) pushPoint(track, p, false, HOP); // pen up
        else pushPoint(track, p, true);
      }
    });
    return track;
  }

  /** A loose, slightly wiggling curve from `a` (heading `da`) out to a random
   * waypoint and back in to `b` (heading `db`). */
  function connector(a, da, b, db) {
    const center = [SLOT_W / 2, 50];
    const ang = rand(0, Math.PI * 2);
    const dist = rand(70, 115);
    const w = add(center, [Math.cos(ang) * dist, Math.sin(ang) * dist * 0.8]);
    const dw = mul(norm(perp(sub(w, center))), Math.random() < 0.5 ? 1 : -1);

    const k1 = Math.max(25, len(sub(w, a)) * 0.55);
    const k2 = Math.max(25, len(sub(b, w)) * 0.55);
    const beziers = [
      [a, add(a, mul(da, k1)), sub(w, mul(dw, k1)), w],
      [w, add(w, mul(dw, k2)), sub(b, mul(db, k2)), b],
    ];

    const raw = [];
    beziers.forEach(([p0, p1, p2, p3], bi) => {
      const n = 40;
      for (let i = bi === 0 ? 0 : 1; i <= n; i++) {
        const t = i / n, u = 1 - t;
        raw.push([
          u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        ]);
      }
    });

    // Snake wiggle: sideways sine, zero at both ends so it joins smoothly.
    const cum = [0];
    for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + len(sub(raw[i], raw[i - 1])));
    const L = cum[cum.length - 1] || 1;
    const amp = rand(2.5, 4.5), wave = rand(28, 40), phase = rand(0, Math.PI * 2);
    const track = makeTrack();
    raw.forEach((p, i) => {
      const prev = raw[Math.max(i - 1, 0)], next = raw[Math.min(i + 1, raw.length - 1)];
      const n = perp(norm(sub(next, prev)));
      const off = amp * Math.sin((2 * Math.PI * cum[i]) / wave + phase) * Math.sin((Math.PI * cum[i]) / L);
      pushPoint(track, add(p, mul(n, off)), true);
    });
    return track;
  }

  /** Point somewhere well outside the slot, used to enter from / exit to. */
  function farPoint() {
    const ang = rand(0, Math.PI * 2);
    return [SLOT_W / 2 + Math.cos(ang) * 260, 50 + Math.sin(ang) * 200];
  }

  // ---------- one snake ----------
  class Snake {
    constructor(slotEl) {
      this.slotEl = slotEl;
      this.track = makeTrack();
      this.tail = 0;
      this.head = 0;
      this.anim = null;
      this.digit = null;
      this.variant = -1;
      this.frozenRect = null; // set when the slot is gone but the snake still exits
      this.done = false;
    }

    /** Write `digit`. With `enter`, the snake flies in from off-screen. */
    show(digit, enter = false) {
      if (digit === this.digit && !enter) return;
      this.finish();

      const variants = GLYPHS[digit].length;
      let variant = Math.floor(Math.random() * variants);
      if (digit === this.digit && variants > 1 && variant === this.variant) variant = (variant + 1) % variants;
      const next = glyphTrack(digit, variant);

      let from, fromDir;
      const t = makeTrack();
      if (enter || total(this.track) === 0) {
        from = farPoint();
        fromDir = norm(sub(first(next), from));
        pushPoint(t, from, false);
      } else {
        appendTrack(t, this.track);
        from = last(this.track);
        fromDir = endDir(this.track);
      }
      const oldLen = total(t);
      appendTrack(t, connector(from, fromDir, first(next), startDir(next)));
      const nextStart = total(t);
      appendTrack(t, next);

      this.digit = digit;
      this.variant = variant;
      this.startAnim(t, nextStart, total(t), enter ? ENTER_DURATION : DURATION, () => {
        this.track = next;
        this.tail = 0;
        this.head = total(next);
      }, oldLen);
    }

    /** Leave the slot for good: fly off and vanish. */
    exit() {
      this.finish();
      this.frozenRect = this.slotEl.getBoundingClientRect();
      const t = appendTrack(makeTrack(), this.track);
      const to = farPoint();
      appendTrack(t, connector(last(this.track), endDir(this.track), to, norm(sub(to, last(this.track)))));
      const end = total(t);
      this.startAnim(t, end, end, DURATION, () => (this.done = true), total(this.track));
    }

    startAnim(track, tailTo, headTo, duration, onDone, headFrom) {
      const tailFrom = 0;
      this.track = track;
      this.tail = tailFrom;
      this.head = headFrom;
      this.anim = { start: performance.now(), duration: reducedMotion.matches ? 0 : duration, tailFrom, tailTo, headFrom, headTo, onDone };
    }

    finish() {
      if (!this.anim) return;
      const a = this.anim;
      this.anim = null;
      a.onDone();
    }

    update(now) {
      const a = this.anim;
      if (!a) return;
      const t = a.duration ? Math.min(1, (now - a.start) / a.duration) : 1;
      if (t >= 1) return this.finish();
      const e = easeInOut(t);
      this.tail = a.tailFrom + (a.tailTo - a.tailFrom) * e;
      this.head = a.headFrom + (a.headTo - a.headFrom) * e;
    }

    draw(ctx) {
      if (this.done) return;
      const r = this.frozenRect || this.slotEl.getBoundingClientRect();
      if (r.height === 0) return; // segment hidden
      const u = r.height / 100;
      const X = (p) => r.left + p[0] * u;
      const Y = (p) => r.top + p[1] * u;
      const { pts, ink, s } = this.track;
      const tail = this.tail, head = this.head;
      const bodyLen = head - tail;
      if (bodyLen <= 0) return;

      // While moving, the tail tapers off like a snake; at rest it is a plain pen line.
      const moving = !!this.anim;
      const taperLen = moving ? Math.min(bodyLen * 0.35, 45) : 0;
      const at = (i, sv) => {
        const f = (sv - s[i]) / (s[i + 1] - s[i] || 1);
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
      };

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      let open = false;
      const flush = () => {
        if (open) ctx.stroke();
        ctx.beginPath();
        open = false;
      };
      ctx.lineWidth = LINE * u;
      for (let i = 0; i < ink.length; i++) {
        if (s[i + 1] <= tail) continue;
        if (s[i] >= head) break;
        if (!ink[i]) {
          flush();
          continue;
        }
        const s0 = Math.max(s[i], tail), s1 = Math.min(s[i + 1], head);
        const p0 = s0 > s[i] ? at(i, s0) : pts[i];
        const p1 = s1 < s[i + 1] ? at(i, s1) : pts[i + 1];
        const inTaper = s0 - tail < taperLen;
        if (inTaper) {
          // tapered part: individual segments with growing width
          flush();
          ctx.lineWidth = LINE * u * (0.25 + 0.75 * ((s0 - tail) / taperLen));
          ctx.moveTo(X(p0), Y(p0));
          ctx.lineTo(X(p1), Y(p1));
          ctx.stroke();
          ctx.beginPath();
          ctx.lineWidth = LINE * u;
          continue;
        }
        if (!open) {
          ctx.moveTo(X(p0), Y(p0));
          open = true;
        }
        ctx.lineTo(X(p1), Y(p1));
      }
      flush();
    }
  }

  // ---------- canvas overlay + render loop ----------
  const snakes = new Set();
  let canvas = null, ctx = null;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "snake-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.strokeStyle = getComputedStyle(canvas).color;
    for (const sn of snakes) {
      sn.update(now);
      if (sn.done) snakes.delete(sn);
      else sn.draw(ctx);
    }
    requestAnimationFrame(frame);
  }

  // ---------- a number made of snake digits ----------
  class SnakeNumber {
    constructor(el) {
      this.el = el;
      this.el.textContent = "";
      this.el.classList.add("snake-number");
      this.sr = document.createElement("span");
      this.sr.className = "visually-hidden";
      this.slotsEl = document.createElement("span");
      this.slotsEl.className = "digit-slots";
      this.slotsEl.setAttribute("aria-hidden", "true");
      this.el.append(this.sr, this.slotsEl);
      this.slots = []; // { el, snake }
      this.value = null;
    }

    set(text) {
      if (text === this.value) return;
      const firstRender = this.value === null;
      this.value = text;
      this.sr.textContent = text;
      const digits = text.split("");

      // Grow or shrink on the left, like an odometer.
      while (this.slots.length > digits.length) {
        const slot = this.slots.shift();
        slot.snake.exit();
        slot.el.remove();
      }
      while (this.slots.length < digits.length) {
        const el = document.createElement("span");
        el.className = "digit-slot";
        this.slotsEl.prepend(el);
        const snake = new Snake(el);
        snakes.add(snake);
        this.slots.unshift({ el, snake, fresh: true });
      }

      digits.forEach((d, i) => {
        const slot = this.slots[i];
        slot.snake.show(d, slot.fresh || firstRender);
        slot.fresh = false;
      });
    }
  }

  /** Returns an object with set(text). Falls back to plain text without glyph data. */
  window.attachSnakeNumber = (el) => {
    if (!GLYPHS || !document.createElement("canvas").getContext) {
      return { set: (text) => (el.textContent = text) };
    }
    ensureCanvas();
    return new SnakeNumber(el);
  };
})();
