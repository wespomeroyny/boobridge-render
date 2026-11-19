/* BooBridge render - turns a short payload into a finished inline reply.
   The model sends { exchange, ... }. This script picks the form for that exchange, applies
   the look, and draws it. Colours come from the host page's own variables, so light and
   dark both work.
   0.15.0 (2026-11-19): one quiet layout for every form. Three type sizes only (26, 18, 16),
   the headline is the finding, every short row is one line, the question sits last in its
   own panel. A look is one photo fading in behind the header, an accent colour and a faint
   tint on the question panel - nothing in the body. A look may also have a hero (a moving
   clip with a still frame) that takes the photo's place on the open and close cards only. */
(function (root) {
  "use strict";
  var VERSION = "0.15.0";
  var BASE = ((document.currentScript && document.currentScript.src) || "").replace(/[^\/]*$/, "");
  var THEMES = {};
  // Looks. Each has elements/<look>/corner.webp beside this file. A look listed in HEROES
  // also has a hero for the open and close cards; any look can get one later by adding a line.
  var LOOKS = ["graffiti", "forest", "mech", "story"], LOOK = null, KIND = null;
  var HEROES = {
    graffiti: { clip: "dragon-loop.mp4", still: "dragon-poster.jpg", alt: "A cartoon dragon in a red bucket hat, painted on a brick wall, nodding to a beat", focus: "50% 18%" }
  };
  var HERO_FORMS = ["brief", "close"];
  // How long each kind of slot may be before it stops fitting on one line at 680 pixels.
  // The renderer never cuts text: a slot over its limit wraps cleanly and is marked
  // data-bb-long, which the gallery check fails on, so payload writers see it.
  var LIMIT = { h1: 64, line: 76, choice: 52, cell: 20, chip: 28 };

  var CSS = [
    ".bb{--ink:var(--color-text-primary,var(--text-primary,#1c1c1a));--muted:var(--color-text-secondary,var(--text-secondary,#5f5e5a));--line:var(--color-border-tertiary,var(--border,#e4e2dc));--bg:var(--color-background-primary,var(--surface-2,#fff));--panel:var(--color-background-secondary,var(--surface-1,#f7f6f3));--acc:var(--bb-acc,var(--color-border-info,#378ADD));--ok:var(--color-text-success,#1f8a4c);--warn:#b26a00;--bad:#c23b3b;",
    "--acct:color-mix(in srgb,var(--acc) 78%,var(--ink));--accbg:color-mix(in srgb,var(--acc) 11%,var(--bg));--accln:color-mix(in srgb,var(--acc) 34%,var(--bg));--key:color-mix(in srgb,var(--ink) 7%,var(--bg));",
    "position:relative;font-family:inherit;font-size:16px;line-height:1.5;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:14px;overflow:hidden;padding:20px 0 0}",
    ".bb *{box-sizing:border-box}.bb p{margin:0}",
    ".bb>*{position:relative;z-index:1;margin-left:24px;margin-right:24px}",
    ".bb>.bb-q,.bb>.bb-fold,.bb>.bb-corner{margin-left:0;margin-right:0}",
    ".bb>:last-child:not(.bb-q):not(.bb-fold){margin-bottom:22px}",
    ".bb [data-bb-long],.bb .bb-sub,.bb .bb-tx,.bb p{text-wrap:pretty}.bb .bb-h1{text-wrap:balance}",
    ".bb-top{display:flex;align-items:center;gap:10px;color:var(--muted);min-height:26px}",
    ".bb-top .bb-pill{margin-left:auto}",
    ".bb-pill{display:inline-flex;align-items:center;gap:7px;font-weight:500;color:var(--ok);background:color-mix(in srgb,var(--bg) 84%,transparent);padding:2px 10px;border-radius:999px;white-space:nowrap}",
    ".bb-pill i{width:8px;height:8px;border-radius:50%;background:currentColor}.bb-pill.warn{color:var(--warn)}.bb-pill.bad{color:var(--bad)}",
    ".bb-h1{font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-.012em;margin-top:6px;margin-bottom:0}",
    ".bb-sub{color:var(--muted);margin-top:6px}",
    ".bb-stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}",
    ".bb-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:var(--panel);border:1px solid var(--line);white-space:nowrap;text-decoration:none;color:var(--ink)}",
    ".bb-chip b{font-weight:600}.bb-chip.ok{background:color-mix(in srgb,var(--ok) 11%,var(--bg));border-color:transparent;color:var(--ok)}.bb-chip.warn{background:color-mix(in srgb,var(--warn) 12%,var(--bg));border-color:transparent;color:var(--warn)}",
    ".bb-sec{margin-top:20px}",
    ".bb-lab{color:var(--muted);margin-bottom:4px}",
    ".bb-ln{display:flex;align-items:flex-start;gap:12px;padding:4px 0}",
    ".bb-ln .bb-tx{flex:1;min-width:0}.bb-ln .bb-tx b{font-weight:600}",
    ".bb-ln .bb-mt{flex:none;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap}",
    ".bb-ic{flex:none;width:20px;height:20px;margin-top:2px;border-radius:6px;display:grid;place-items:center;background:var(--key);color:var(--muted)}",
    ".bb-ic svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}",
    ".bb-ic.ok{background:color-mix(in srgb,var(--ok) 13%,var(--bg));color:var(--ok)}.bb-ic.warn{background:color-mix(in srgb,var(--warn) 14%,var(--bg));color:var(--warn)}.bb-ic.bad{background:color-mix(in srgb,var(--bad) 13%,var(--bg));color:var(--bad)}.bb-ic.go{background:var(--accbg);color:var(--acct)}",
    ".bb-pt{padding:5px 0}.bb-pt b{display:block;font-weight:600}",
    ".bb-txt{margin-top:4px}",
    ".bb-tbl{width:calc(100% - 48px);border-collapse:collapse;margin-top:16px}.bb-tbl th{text-align:left;font-weight:600;padding:8px 12px 8px 0;border-bottom:1px solid var(--line)}.bb-tbl td{padding:8px 12px 8px 0;border-bottom:1px solid var(--line);vertical-align:top}.bb-tbl tr:last-child td{border-bottom:0}",
    ".bb-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}",
    ".bb-cmp{display:grid;margin-top:16px;border:1px solid var(--line);border-radius:12px;overflow:hidden}",
    ".bb-cmp>div{padding:10px 14px;border-top:1px solid var(--line);display:flex;align-items:center;gap:8px;min-width:0}",
    ".bb-cmp>.h{border-top:0;font-weight:600}.bb-cmp>.rl{color:var(--muted)}.bb-cmp>.p{background:var(--accbg)}",
    ".bb-key{flex:none;width:26px;height:26px;border-radius:8px;display:inline-grid;place-items:center;font-weight:600;background:var(--key);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}",
    ".bb-cmp .p .bb-key,.bb-c.pick .bb-key{background:var(--acc);color:#fff}",
    ".bb-flow{margin-top:16px}",
    ".bb-st{display:flex;gap:14px;padding:10px 12px;border-radius:10px}",
    ".bb-st .n{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-weight:600;background:var(--key)}",
    ".bb-st .l{color:var(--muted)}.bb-st.hot{background:var(--accbg)}.bb-st.hot .n{background:var(--acc);color:#fff}.bb-st.hot .l{color:var(--acct);font-weight:600}",
    ".bb-ba{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}",
    ".bb-pane{border-radius:12px;padding:12px 14px;border:1px solid var(--line);white-space:pre-line}",
    ".bb-pane .l{color:var(--muted);margin-bottom:4px;white-space:normal}.bb-pane.new{border-color:var(--accln);background:var(--accbg)}.bb-pane.new .l{color:var(--acct);font-weight:600}",
    ".bb-pane img{display:block;width:100%;height:auto;border-radius:8px;background:var(--panel)}.bb-pane .cap{margin-top:8px;white-space:normal}",
    ".bb-pane mark{background:rgba(255,214,90,.5);color:inherit;border-radius:3px;padding:0 2px}",
    ".bb-box{margin-top:16px;border:1px solid var(--line);border-radius:12px;padding:14px 16px}",
    ".bb-box img{display:block;max-width:100%;border-radius:8px;margin:0 auto}",
    ".bb-bar{display:grid;grid-template-columns:minmax(90px,32%) 1fr auto;gap:12px;align-items:center;padding:5px 0}",
    ".bb-bar i{display:block;height:10px;border-radius:5px;background:var(--acc)}.bb-bar b{font-weight:600;font-variant-numeric:tabular-nums}",
    ".bb-sheet{margin-top:16px;border:1px solid var(--line);border-radius:10px;padding:18px 20px;background:var(--bg);box-shadow:0 1px 2px rgba(0,0,0,.05)}",
    ".bb-sheet p{margin:0 0 12px;white-space:pre-line}.bb-sheet p:last-child{margin-bottom:0}",
    ".bb-prose p{margin:0 0 12px;max-width:64ch;line-height:1.65}",
    ".bb-pull{font-size:18px;font-weight:600;line-height:1.45;margin:4px 0 16px;padding-left:14px;border-left:3px solid var(--acc);border-radius:0}",
    ".bb-say p{font-size:18px;line-height:1.6;margin:0 0 8px}.bb-say .ask{font-weight:600;margin-top:12px}",
    ".bb-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:16px}",
    ".bb-tile{border:1px solid var(--line);border-radius:10px;padding:10px 14px}.bb-tile .v{font-size:18px;font-weight:600;font-variant-numeric:tabular-nums}.bb-tile .k,.bb-tile .t{color:var(--muted)}",
    ".bb-miss{display:flex;align-items:center;justify-content:center;text-align:center;min-height:72px;padding:12px 14px;border:1px dashed var(--line);border-radius:10px;color:var(--muted)}",
    ".bb-fold{border-top:1px solid var(--line)}.bb>:not(.bb-fold):not(.bb-q):not(.bb-corner)+.bb-fold{margin-top:20px}",
    ".bb-fold>summary{list-style:none;cursor:pointer;padding:12px 24px;color:var(--muted);display:flex;align-items:center;gap:10px}",
    ".bb-fold>summary::-webkit-details-marker{display:none}",
    ".bb-fold>summary::before{content:'';flex:none;width:7px;height:7px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(-45deg);transition:transform .15s}",
    ".bb-fold[open]>summary::before{transform:rotate(45deg)}.bb-fold>summary b{color:var(--ink);font-weight:500}",
    ".bb-fold .bb-fb{padding:0 24px 14px 41px;color:var(--muted)}.bb-fold .bb-fb .bb-ln{color:var(--ink)}",
    ".bb-q{margin-top:22px;padding:18px 24px 18px;background:color-mix(in srgb,var(--panel) 95%,var(--acc) 5%);border-top:1px solid var(--line)}",
    ".bb>.bb-q:last-child,.bb>.bb-fold:last-child{margin-bottom:0}",
    ".bb-q .qq{font-size:18px;font-weight:600;margin-bottom:10px}",
    ".bb-c{display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:10px;border:1px solid transparent}",
    ".bb-c+.bb-c{margin-top:2px}.bb-c .tx{flex:1;min-width:0}.bb-c .bb-mt{color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap}",
    ".bb-c.pick{background:var(--accbg);border-color:var(--accln)}.bb-c .tag{color:var(--acct);font-weight:500;margin-left:8px;white-space:nowrap}.bb-c.other{color:var(--muted)}",
    ".bb-q.chips .bb-cs{display:flex;flex-wrap:wrap;gap:8px}.bb-q.chips .bb-c{border-color:var(--line);background:var(--bg);padding:6px 12px 6px 6px}.bb-q.chips .bb-c+.bb-c{margin-top:0}.bb-q.chips .bb-c.pick{border-color:var(--accln);background:var(--accbg)}",
    ".bb-aids{display:flex;flex-wrap:wrap;gap:20px;margin:12px 0 0 12px}",
    ".bb-aid{cursor:pointer;color:var(--acct);font-weight:500;border-bottom:1px dotted var(--acct);user-select:none}",
    ".bb-aid:focus-visible{outline:2px solid var(--acct);outline-offset:2px}.bb-aid.on{border-bottom-style:solid}",
    ".bb-tip{display:none;margin:10px 0 0;padding:10px 14px;border-radius:10px;background:var(--bg);border:1px solid var(--line)}",
    ".bb-tip.on{display:block}.bb-tip b{display:block;font-weight:600;margin-bottom:2px}",
    ".bb-corner{position:absolute;top:0;right:0;width:330px;height:170px;z-index:0;pointer-events:none;object-fit:cover;",
    "-webkit-mask-image:linear-gradient(to left,#000 18%,transparent 72%),linear-gradient(#000 45%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(to left,#000 18%,transparent 72%),linear-gradient(#000 45%,transparent);mask-composite:intersect}",
    ".bb-corner.hero{width:290px;height:178px;-webkit-mask-image:linear-gradient(to left,#000 50%,transparent 97%),linear-gradient(#000 62%,transparent);mask-image:linear-gradient(to left,#000 50%,transparent 97%),linear-gradient(#000 62%,transparent)}",
    ".bb.has-hero .bb-h1{max-width:440px}",
    "@media (prefers-color-scheme:dark){.bb-corner{filter:brightness(.82) saturate(.92)}}",
    ".bb[data-bb-look=forest]{--bb-acc:#3f7d4c}.bb[data-bb-look=mech]{--bb-acc:#c25a20}.bb[data-bb-look=story]{--bb-acc:#a46a2b}.bb[data-bb-look=graffiti]{--bb-acc:#c8236a}",
    ".bb.bb-tiny{padding:14px 0}.bb.bb-tiny>*{margin-left:18px;margin-right:18px}.bb.bb-tiny>:last-child{margin-bottom:0}.bb.bb-tiny .bb-ln{font-size:18px;padding:0}.bb.bb-tiny .bb-ic{margin-top:4px}",
    ".bb.bb-tiny>.bb-q{margin:14px 0 -14px}",
    ".bb-tsw{margin-top:12px}.bb-tsw .bb{padding-top:16px}.bb-tsw .bb>:last-child{margin-bottom:16px}.bb-tsw .bb-corner{height:96px;width:300px}",
    ".bb-fade{opacity:0;transform:translateY(4px);transition:opacity .35s ease,transform .35s ease}.bb-fade.in{opacity:1;transform:none}",
    "@media (prefers-reduced-motion:reduce){.bb-fade{transition:none;opacity:1;transform:none}}",
    "@media (max-width:560px){.bb>*{margin-left:18px;margin-right:18px}.bb-tbl{width:calc(100% - 36px)}.bb-q,.bb-fold>summary{padding-left:18px;padding-right:18px}.bb-corner,.bb-corner.hero{width:56%;opacity:.55}.bb.has-hero .bb-h1{max-width:none}.bb-ba{grid-template-columns:1fr}.bb-h1{font-size:24px}.bb-ln .bb-mt{display:none}}"
  ].join("");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function isArr(x) { return Object.prototype.toString.call(x) === "[object Array]"; }
  function css() {
    var old = document.getElementById("bb-css");
    if (old && old.getAttribute("data-v") === VERSION) return;
    if (old) old.parentNode.removeChild(old);
    var s = el("style"); s.id = "bb-css"; s.setAttribute("data-v", VERSION); s.textContent = CSS; document.head.appendChild(s);
  }
  function still() { return root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  // Mark a slot that is longer than its limit, so the gallery check can catch the payload.
  function fit(node, kind, text) {
    if (String(text == null ? "" : text).length > LIMIT[kind]) node.setAttribute("data-bb-long", kind);
    return node;
  }

  /* ---- shared parts ---------------------------------------------------------- */
  var ICON = {
    ok: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
    go: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><path d="M12 7v6M12 17h.01"/></svg>',
    bad: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    dot: '<svg viewBox="0 0 24 24"><path d="M12 12h.01"/></svg>'
  };
  function icon(kind) { var i = el("span", "bb-ic " + kind); i.innerHTML = ICON[kind] || ICON.dot; i.setAttribute("aria-hidden", "true"); return i; }
  // A line of text written "Label: text" draws the label bold.
  function lead(text, into) {
    var m = typeof text === "string" && /^([^:.!?\n]{2,48}):\s+([\s\S]+)$/.exec(text);
    if (!m) { into.appendChild(document.createTextNode(text == null ? "" : String(text))); return; }
    into.appendChild(el("b", null, m[1] + ": ")); into.appendChild(document.createTextNode(m[2]));
  }
  function textOf(t) { return isArr(t) ? t[0] + ": " + t[1] : t == null ? "" : String(t); }
  // One row: a mark, the text, and an optional short note on the right.
  function rowLine(kind, t, meta) {
    var r = el("div", "bb-ln"), tx = el("span", "bb-tx"), s = textOf(t);
    r.appendChild(icon(kind));
    if (isArr(t)) { tx.appendChild(el("b", null, t[0] + ": ")); tx.appendChild(document.createTextNode(t[1])); } else lead(s, tx);
    r.appendChild(fit(tx, "line", s));
    if (meta) r.appendChild(el("span", "bb-mt", meta));
    return r;
  }
  function section(label, list, kind, into) {
    if (!list || !list.length) return null;
    var d = el("div", "bb-sec bb-fade");
    if (label) d.appendChild(el("div", "bb-lab", label));
    list.forEach(function (t) { d.appendChild(rowLine(kind, t)); });
    into.appendChild(d); return d;
  }
  function pill(st) {
    if (!st || !has(st.text)) return null;
    var p = el("span", "bb-pill" + (st.tone === "warn" ? " warn" : st.tone === "bad" ? " bad" : ""));
    p.appendChild(el("i")); p.appendChild(el("span", null, st.text)); return p;
  }
  // The header every form shares: a quiet label, the status, the headline (the finding),
  // an optional line under it, and optional number chips. A headline sent as two sentences
  // keeps the first as the headline and moves the rest under it.
  function head(card, o) {
    var top = el("div", "bb-top"), pl = pill(o.status);
    if (o.eyebrow) top.appendChild(el("span", null, o.eyebrow));
    if (pl) top.appendChild(pl);
    if (top.childNodes.length) card.appendChild(top);
    var t = String(o.title == null ? "" : o.title).trim(), sub = o.sub;
    if (t.length > LIMIT.h1) {
      var m = /^(.{12,}?[.!?])\s+([\s\S]+)$/.exec(t);
      if (m && m[1].length <= LIMIT.h1) { t = m[1]; sub = [m[2], sub].filter(has).join(" "); }
    }
    if (t) card.appendChild(fit(el("div", "bb-h1", t), "h1", t));
    if (has(sub)) card.appendChild(el("div", "bb-sub", sub));
    stats(o.stats, card);
  }
  // Number chips: [value, label, tone] or {v, k, tone}.
  function stats(list, card) {
    if (!isArr(list) || !list.length) return;
    var w = el("div", "bb-stats bb-fade");
    list.forEach(function (s) {
      var a = isArr(s) ? { v: s[0], k: s[1], tone: s[2] } : (s || {});
      if (!has(a.v) && !has(a.k)) return;
      var c = el("span", "bb-chip" + (a.tone === "ok" || a.tone === "warn" ? " " + a.tone : ""));
      if (a.tone === "ok") c.appendChild(icon("ok"));
      if (has(a.v)) c.appendChild(el("b", null, String(a.v)));
      if (has(a.k)) c.appendChild(document.createTextNode(String(a.k)));
      w.appendChild(fit(c, "chip", (a.v || "") + " " + (a.k || "")));
    });
    if (w.childNodes.length) card.appendChild(w);
  }
  function fold(summary, build, card) {
    var d = el("details", "bb-fold"), s = el("summary"), b = el("div", "bb-fb");
    s.appendChild(summary); d.appendChild(s); build(b); d.appendChild(b); card.appendChild(d); return d;
  }
  function details(d, card) {
    if (!d || !isArr(d.items) || !d.items.length) return;
    fold(document.createTextNode(d.label || "Details"), function (b) {
      d.items.forEach(function (it) { b.appendChild(rowLine("dot", isArr(it) ? it : String(it))); });
    }, card);
  }
  function metaFold(meta, card) {
    if (!meta || !has(meta.line)) return;
    fold(document.createTextNode(meta.line), function (b) {
      (meta.items || []).forEach(function (it) { b.appendChild(rowLine("dot", isArr(it) ? it : String(it))); });
    }, card);
  }
  // 0.12.0: a picture that cannot be shown says so instead of an empty box.
  function picture(im, into) {
    var src = im && im.src || "";
    if (!/^(https:\/\/|data:image\/)/.test(src)) {
      into.appendChild(el("div", "bb-miss", "Picture missing: " + (src ? "it was given as " + (/^(file:|[a-zA-Z]:\\|\/)/.test(src) ? "a file path" : "an address") + " the card cannot open." : "no picture was carried in the card.")));
      return false;
    }
    var g = el("img"); g.src = src; g.alt = im.alt || ""; g.loading = "lazy";
    g.onerror = function () { var m = el("div", "bb-miss", "Picture did not load: the picture text in the card is broken or cut short."); if (g.parentNode) g.parentNode.replaceChild(m, g); };
    into.appendChild(g);
    return true;
  }

  // What each form cannot be drawn without. A payload missing one is mended into another
  // form, or drawn as a plain card carrying every word (0.14.0: never a warning box).
  function has(x) { return isArr(x) ? x.length > 0 : !!(x && String(x).trim()); }
  function paneOk(d) { return d && (has(d.text) || (d.image && has(d.image.src))); }
  var NEEDS = {
    line: function (p) { return has(p.text) ? [] : ["`text`: the one line to show"]; },
    note: function (p) { return has(p.text) ? [] : ["`text`: what to say"]; },
    receipt: function (p) { return has(p.result) ? [] : ["`result`: the outcome in one line"]; },
    answer: function (p) { return has(p.answer) ? [] : ["`answer`: the answer itself"]; },
    diff: function (p) { var w = []; if (!paneOk(p.before)) w.push("`before`: text or a picture"); if (!paneOk(p.after)) w.push("`after`: text or a picture"); return w; },
    diagnosis: function (p) { return has(p.flow) ? [] : ["`flow`: the steps from what was seen to the fix"]; },
    columns: function (p) { return has(p.options) ? [] : ["`options`: the choices side by side"]; },
    mission: function (p) { return has(p.title) ? [] : ["`title`: where things stand"]; },
    stage: function (p) { return has(p.bars) || has(p.items) || (p.image && has(p.image.src)) ? [] : ["`bars`, `items` or `image`: the thing to show"]; },
    draft: function (p) { return has(p.body) ? [] : ["`body`: the text to send"]; },
    prose: function (p) { return has(p.paras) ? [] : ["`paras`: the paragraphs"]; },
    spoken: function (p) { return has(p.lines) ? [] : ["`lines`: the sentences to say"]; },
    brief: function (p) { return has(p.last) || has(p.fresh) || has(p.next) ? [] : ["`last`, `fresh` or `next`: what the catch up says"]; },
    close: function (p) { return has(p.did) || has(p.next) ? [] : ["`did` or `next`: what the session did or what comes next"]; }
  };
  function missing(kind, p) {
    var w = NEEDS[kind] ? NEEDS[kind](p) : [];
    if (p.question && !has(p.question.q)) w.push("`question.q`: the question to ask");
    return w;
  }
  function carried(p, orig) {
    var out = [], seen = {};
    (function walk(x, key) {
      if (x == null) return;
      if (typeof x === "string") {
        if (/^(exchange|theme|kind|tone|state|src|id|url)$/.test(key) || /^data:/.test(x)) return;
        var t = x.trim(); if (t && !seen[t]) { seen[t] = 1; out.push(t); } return;
      }
      if (typeof x === "number") return;
      if (isArr(x)) { x.forEach(function (v) { walk(v, key); }); return; }
      if (typeof x === "object") for (var k in x) if (k !== "question") walk(x[k], k);
    })(p, "");
    if (orig && !seen[orig]) out.unshift(orig);
    return out;
  }
  // The last resort: the fallback line as the headline, every other word in order under it,
  // and the question panel. `why` stays only as the page marker.
  function incomplete(p, card, why, orig) {
    var got = carried(p, orig);
    if (!got.length) got = ["This reply had no words to show."];
    card.appendChild(el("div", "bb-h1", got[0]));
    got.slice(1).forEach(function (t) { card.appendChild(el("p", "bb-txt", t)); });
    if (p.question && has(p.question.q)) { try { question(p.question, card); } catch (e) {} }
  }

  // The question panel, always last. Lettered choices; the suggested one is tinted when the
  // payload names it with `pick` (a letter or a number from 0). Three aids sit under the
  // choices - More, Why and Risks - each opening its text on a click and closing on a second.
  // They show text only and never send a message, so they are not answer buttons.
  var AIDS = [["more", "More on this", "More about this question"], ["pros", "Why", "Reasons to do it"], ["risks", "Risks", "Risks"]];
  function pickIndex(q, n) {
    var k = q.pick;
    if (typeof k === "number" && k >= 0 && k < n) return k;
    if (typeof k === "string" && /^[A-Za-z]$/.test(k)) { var i = k.toUpperCase().charCodeAt(0) - 65; if (i >= 0 && i < n) return i; }
    return -1;
  }
  function question(q, into, compact) {
    if (!q) return;
    var list = (isArr(q.choices) ? q.choices : []).map(textOf);
    if (!list.length && /^(should|shall|do|does|did|is|are|can|could|will|would|has|have|want)\b/i.test(q.q || "")) list = ["Yes", "No"];
    if (!list.length || !/^(something else|none of these)/i.test(list[list.length - 1])) list.push("Something else. I'll tell you.");
    var pk = pickIndex(q, list.length - 1);
    var chips = compact && list.every(function (c, i) { return c.length <= 24 || i === list.length - 1; });
    var box = el("div", "bb-q bb-fade" + (chips ? " chips" : "")), cs = el("div", "bb-cs"), tips = [], aids = el("div", "bb-aids"), pinned = -1;
    box.appendChild(el("div", "qq", q.q));
    list.forEach(function (c, i) {
      var other = i === list.length - 1 && /^(something else|none of these)/i.test(c);
      var row = el("div", "bb-c c" + (i === pk ? " pick" : "") + (other ? " other" : ""));
      row.appendChild(el("span", "bb-key", String.fromCharCode(65 + i)));
      var id = /^([A-Z][A-Z0-9]*-[A-Z]-\d+):\s+(.+)$/.exec(c), tx = el("span", "tx");
      tx.appendChild(document.createTextNode(id && !chips ? id[2] : c));
      if (i === pk) tx.appendChild(el("span", "tag", chips ? "· Suggested" : "Suggested"));
      row.appendChild(fit(tx, "choice", id && !chips ? id[2] : c));
      if (id && !chips) row.appendChild(el("span", "bb-mt", id[1]));
      cs.appendChild(row);
    });
    box.appendChild(cs);
    function show(i) { tips.forEach(function (t, j) { t.className = "bb-tip" + (j === i ? " on" : ""); aids.children[j].className = "bb-aid" + (j === i ? " on" : ""); aids.children[j].setAttribute("aria-expanded", j === i ? "true" : "false"); }); }
    var tipHold = el("div");
    AIDS.forEach(function (a, i) {
      var b = el("span", "bb-aid", a[1]), v = q[a[0]], tip = el("div", "bb-tip");
      b.tabIndex = 0; b.setAttribute("role", "button"); b.setAttribute("aria-label", a[2]); b.setAttribute("aria-expanded", "false");
      tip.appendChild(el("b", null, a[2]));
      (isArr(v) ? v : [v || "Not given in this reply."]).forEach(function (line) { tip.appendChild(el("div", null, textOf(line))); });
      function flip() { pinned = pinned === i ? -1 : i; show(pinned); }
      b.addEventListener("click", flip);
      b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      aids.appendChild(b); tips.push(tip); tipHold.appendChild(tip);
    });
    box.appendChild(aids); box.appendChild(tipHold);
    into.appendChild(box);
  }
  function reveal(node) {
    var items = node.querySelectorAll(".bb-fade");
    Array.prototype.forEach.call(items, function (n, i) { setTimeout(function () { n.classList.add("in"); }, 60 + i * 60); });
  }
  function itemOf(it) {
    if (isArr(it)) return { id: it[0], text: it[1], state: it[2] };
    if (typeof it === "string") { var m = /^([A-Z][A-Z0-9]*-[A-Z]-\d+):\s+(.+)$/.exec(it); return m ? { id: m[1], text: m[2] } : { text: it }; }
    return it || {};
  }

  /* ---- forms, one per kind of reply ------------------------------------------- */
  var LAYOUTS = {
    // The session-open brief. The headline says where things stand; the next items ARE the
    // lettered choices when the question names them, so nothing shows twice.
    brief: function (p, card) {
      head(card, { eyebrow: p.headline ? p.title : "Catch up", status: p.status, title: p.headline || p.title, sub: p.sub, stats: p.stats });
      section("New", p.fresh, "ok", card);
      section("Last session", p.last, "ok", card);
      section("Needs a look", p.problems, "warn", card);
      var q = p.question, ids = q && isArr(q.choices) ? q.choices.map(textOf).join("\n") : "";
      var rest = (p.next || []).map(itemOf).filter(function (a) { return !(a.id && ids.indexOf(a.id) >= 0); });
      if (rest.length) {
        var d = el("div", "bb-sec bb-fade"); d.appendChild(el("div", "bb-lab", "Next up"));
        rest.forEach(function (a) { d.appendChild(rowLine("go", a.text, [a.id, a.state].filter(has).join(" · "))); });
        card.appendChild(d);
      }
      question(q, card);
      if (isArr(p.more) && p.more.length) fold(el("b", null, p.moreLabel || p.more.length + " more on the roadmap"), function (b) {
        p.more.forEach(function (it) { var a = itemOf(it); b.appendChild(rowLine("dot", a.text, a.id)); });
      }, card);
      metaFold(p.meta, card);
    },
    close: function (p, card) {
      head(card, { eyebrow: p.headline ? p.title : "Peace out", status: p.status, title: p.headline || p.title, sub: p.sub, stats: p.stats });
      section("Done", p.did, "ok", card);
      section("Next time", p.next, "go", card);
      section("Left open", p.open, "warn", card);
      question(p.question, card);
      metaFold(p.meta, card);
    },
    mission: function (p, card) {
      head(card, { eyebrow: p.eyebrow ? String(p.eyebrow).charAt(0) + String(p.eyebrow).slice(1).toLowerCase() : null, status: p.status, title: p.title, sub: p.sub, stats: p.stats });
      if (isArr(p.tiles) && p.tiles.length) {
        var w = el("div", "bb-tiles bb-fade");
        p.tiles.forEach(function (t) {
          if (!t || typeof t !== "object") return;
          var c = el("div", "bb-tile"); c.appendChild(el("div", "k", t.k));
          c.appendChild(el("div", "v", (typeof t.v === "number" ? t.v.toLocaleString() : String(t.v == null ? "" : t.v)) + (t.unit || "")));
          if (t.n) c.appendChild(el("div", "t", t.n)); w.appendChild(c);
        });
        card.appendChild(w);
      }
      (isArr(p.sections) ? p.sections : []).forEach(function (s) {
        if (!s) return; var d = el("div", "bb-sec bb-fade"); d.appendChild(el("div", "bb-lab", s.label)); d.appendChild(el("p", null, s.text)); card.appendChild(d);
      });
      details(p.details, card); question(p.question, card);
    },
    diagnosis: function (p, card) {
      head(card, { eyebrow: "What went wrong", title: p.title });
      var flow = el("div", "bb-flow bb-fade");
      (p.flow || []).forEach(function (s, i) {
        if (!s) return;
        var st = el("div", "bb-st" + (s.hot ? " hot" : "")), b = el("div");
        st.appendChild(el("span", "n", String(i + 1)));
        b.appendChild(el("div", "l", s.label)); b.appendChild(el("div", null, s.text)); st.appendChild(b); flow.appendChild(st);
      });
      card.appendChild(flow);
      details(p.details, card); question(p.question, card);
    },
    line: function (p, card) {
      card.classList.add("bb-tiny");
      card.appendChild(rowLine(p.tone === "warn" ? "warn" : p.tone === "bad" ? "bad" : "ok", p.text));
    },
    note: function (p, card) {
      card.classList.add("bb-tiny");
      card.appendChild(rowLine("dot", p.text));
    },
    draft: function (p, card) {
      head(card, { eyebrow: has(p.to) ? "Draft to " + p.to : "Draft", title: p.subject });
      var sheet = el("div", "bb-sheet bb-fade");
      String(p.body || "").split(/\n\s*\n/).forEach(function (para) { sheet.appendChild(el("p", null, para)); });
      card.appendChild(sheet);
      if (has(p.check)) { var c = el("div", "bb-sec"); c.appendChild(rowLine("warn", "Check before sending: " + p.check)); card.appendChild(c); }
      question(p.question, card);
    },
    stage: function (p, card) {
      head(card, { title: p.title });
      var box = el("div", "bb-box bb-fade");
      if (isArr(p.bars) && p.bars.length) {
        var max = Math.max.apply(null, p.bars.map(function (b) { return isArr(b) ? +b[1] || 0 : 0; })) || 1;
        p.bars.forEach(function (b) {
          if (!isArr(b)) return;
          var r = el("div", "bb-bar"), i = el("i"); i.style.width = Math.max(2, 100 * (+b[1] || 0) / max) + "%";
          r.appendChild(el("span", null, b[0])); r.appendChild(i); r.appendChild(el("b", null, (+b[1] || 0).toLocaleString())); box.appendChild(r);
        });
      }
      if (isArr(p.items) && p.items.length) p.items.forEach(function (t) { box.appendChild(rowLine("dot", t)); });
      if (p.image) picture(p.image, box);
      if (box.childNodes.length) card.appendChild(box);
      if (p.link && /^https:\/\//.test(p.link.url || "")) { var l = el("div", "bb-links"), a = el("a", "bb-chip", p.link.text || "Open full size"); a.href = p.link.url; a.target = "_blank"; a.rel = "noopener"; l.appendChild(a); card.appendChild(l); }
      if (has(p.note)) card.appendChild(el("p", "bb-sub", p.note));
      question(p.question, card);
    },
    receipt: function (p, card) {
      head(card, { eyebrow: p.label || "Done", status: p.status, title: p.result, sub: p.sub, stats: p.stats });
      section(p.label && p.exchange === "told" ? null : "What changed", p.changed, "ok", card);
      section("Not done", p.notDone, "warn", card);
      details(p.details, card); question(p.question, card);
    },
    answer: function (p, card) {
      head(card, { eyebrow: p.label, title: p.answer, stats: p.stats });
      var pts = isArr(p.points) ? p.points : [];
      if (pts.length) {
        var d = el("div", "bb-sec bb-fade");
        pts.forEach(function (t) {
          var s = textOf(t), m = isArr(t) ? [null, t[0], t[1]] : /^([^:.!?\n]{2,48}):\s+([\s\S]+)$/.exec(s), r = el("div", "bb-pt");
          if (m) { r.appendChild(el("b", null, m[1])); r.appendChild(el("span", null, String(m[2]).charAt(0).toUpperCase() + String(m[2]).slice(1))); }
          else r.textContent = s;
          d.appendChild(r);
        });
        card.appendChild(d);
      }
      if (p.table && isArr(p.table.rows) && p.table.rows.length) {
        var tb = el("table", "bb-tbl bb-fade");
        if (isArr(p.table.head)) { var hr = el("tr"); p.table.head.forEach(function (h) { hr.appendChild(el("th", null, h)); }); tb.appendChild(hr); }
        p.table.rows.forEach(function (row) { var tr = el("tr"); (isArr(row) ? row : row && typeof row === "object" ? Object.keys(row).map(function (k) { return row[k]; }) : [row]).forEach(function (c) { tr.appendChild(el("td", null, c)); }); tb.appendChild(tr); });
        card.appendChild(tb);
      }
      var src = (isArr(p.sources) ? p.sources : []).filter(function (x) { return x && /^https:\/\//.test(x.url || ""); });
      if (src.length) { var ch = el("div", "bb-links"); src.forEach(function (x) { var a = el("a", "bb-chip", x.text || x.url); a.href = x.url; a.target = "_blank"; a.rel = "noopener"; ch.appendChild(a); }); card.appendChild(ch); }
      details(p.details, card); question(p.question, card);
    },
    diff: function (p, card) {
      head(card, { eyebrow: "Changed", title: p.title });
      var ba = el("div", "bb-ba bb-fade");
      function pane(cls, d, label) {
        var n = el("div", "bb-pane " + cls); n.appendChild(el("div", "l", (d && d.label) || label));
        if (d && d.image) picture(d.image, n);
        var text = String((d && d.text) || ""), mk = cls === "new" && typeof p.changed === "string" ? text.indexOf(p.changed) : -1;
        if (!text) return n;
        var into = d && d.image ? n.appendChild(el("div", "cap")) : n;
        if (mk < 0) into.appendChild(document.createTextNode(text));
        else { into.appendChild(document.createTextNode(text.slice(0, mk))); into.appendChild(el("mark", null, p.changed)); into.appendChild(document.createTextNode(text.slice(mk + p.changed.length))); }
        return n;
      }
      ba.appendChild(pane("old", p.before, "Before")); ba.appendChild(pane("new", p.after, "After")); card.appendChild(ba);
      if (has(p.note)) card.appendChild(el("p", "bb-sub", p.note));
      question(p.question, card);
    },
    // Choose: the options side by side on the same rows. The table already names A, B and C,
    // so short choices sit in one row of chips under it.
    columns: function (p, card) {
      head(card, { eyebrow: "Choose", title: p.title });
      var opts = (isArr(p.options) ? p.options : []).filter(function (o) { return o && typeof o === "object"; }), rows = isArr(p.rows) ? p.rows : [];
      var n = Math.max.apply(null, [0].concat(opts.map(function (o) { return isArr(o.values) ? o.values.length : 0; })));
      var g = el("div", "bb-cmp bb-fade"); g.style.gridTemplateColumns = (rows.length ? "minmax(90px,0.8fr) " : "") + "repeat(" + Math.max(1, opts.length) + ",1fr)";
      if (rows.length) g.appendChild(el("div", "h"));
      opts.forEach(function (o, i) { var h = el("div", "h" + (o.pick ? " p" : "")); h.appendChild(el("span", "bb-key", String.fromCharCode(65 + i))); h.appendChild(el("span", null, o.name)); g.appendChild(h); });
      for (var r = 0; r < n; r++) {
        if (rows.length) g.appendChild(el("div", "rl", rows[r] || ""));
        opts.forEach(function (o) { var v = isArr(o.values) ? o.values[r] : ""; g.appendChild(fit(el("div", o.pick ? "p" : null, v == null ? "" : String(v)), "cell", v)); });
      }
      card.appendChild(g);
      if (has(p.note)) card.appendChild(el("p", "bb-sub", p.note));
      if (p.question) {
        var q = Object.assign({}, p.question);
        if (q.pick == null) opts.forEach(function (o, i) { if (o.pick && isArr(q.choices) && textOf(q.choices[i]) === o.name) q.pick = i; });
        question(q, card, true);
      }
    },
    prose: function (p, card) {
      var w = el("div", "bb-prose bb-fade"), paras = isArr(p.paras) ? p.paras : [], at = Math.min(p.keyAfter == null ? 1 : p.keyAfter, paras.length);
      paras.forEach(function (t, i) { if (i === at && has(p.key)) w.appendChild(el("div", "bb-pull", p.key)); w.appendChild(el("p", null, textOf(t))); });
      if (has(p.key) && at >= paras.length) w.appendChild(el("div", "bb-pull", p.key));
      card.appendChild(w); question(p.question, card);
    },
    spoken: function (p, card) {
      var w = el("div", "bb-say bb-fade");
      (isArr(p.lines) ? p.lines : []).forEach(function (t) { w.appendChild(el("p", null, textOf(t))); });
      if (has(p.ask)) w.appendChild(el("p", "ask", p.ask));
      card.appendChild(w);
    },
    // The looks on offer, each drawn in its own look, so "show me the themes" shows them.
    themes: function (p, card) {
      head(card, { eyebrow: "Looks", title: p.title || "Looks you can switch to" });
      [["default", "Default", "Plain, with the app's own colours."], ["graffiti", "Graffiti", "Brick and spray paint. The dragon opens and closes."],
       ["forest", "Forest", "Morning light through old trees."], ["mech", "Mech", "Machined steel and one warm highlight."],
       ["story", "Story", "A hedgehog with a lantern at golden hour."]].forEach(function (t) {
        var w = el("div", "bb-tsw"), c = el("div", "bb"), look = t[0] === "default" ? null : t[0];
        if (look) { c.setAttribute("data-bb-look", look); c.appendChild(corner(look, false)); }
        var top = el("div", "bb-top"); top.appendChild(el("span", null, t[1]));
        if ((p.current || "default") === t[0]) top.appendChild(pill({ text: "In use", tone: "ok" }));
        c.appendChild(top); c.appendChild(el("p", "bb-sub", t[2]));
        w.appendChild(c); card.appendChild(w);
      });
      question(p.question, card);
    }
  };

  // The look's picture in the header corner: the photo, or the hero on open and close.
  function corner(look, hero, report) {
    var h = hero && HEROES[look];
    if (h) {
      var still_ = still(), v = el(still_ ? "img" : "video", "bb-corner hero");
      v.style.objectPosition = h.focus || "50% 30%";
      if (still_) { v.src = BASE + h.still; v.alt = h.alt; if (report) report("hero, still"); return v; }
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-label", h.alt);
      v.poster = BASE + h.still; v.src = BASE + h.clip;
      if (report) {
        v.addEventListener("playing", function () { report("hero, moving"); });
        v.addEventListener("error", function () { report("hero, no clip"); var i = el("img", v.className); i.src = BASE + h.still; i.alt = h.alt; i.style.objectPosition = v.style.objectPosition; if (v.parentNode) v.parentNode.replaceChild(i, v); });
      }
      return v;
    }
    var i = el("img", "bb-corner"); i.src = BASE + "elements/" + look + "/corner.webp"; i.alt = ""; i.loading = "lazy"; return i;
  }

  // The picker: the kind of exchange decides the form.
  var PICK = {
    tiny: "line", did: "receipt", found: "answer", changed: "diff", broke: "diagnosis", choose: "columns",
    status: "mission", show: "stage", draft: "draft", think: "prose", voice: "spoken", told: "receipt",
    open: "brief", close: "close", themes: "themes"
  };
  // 0.13.0: a made-up exchange is drawn as the first structured form its fields fit, else an
  // answer card carrying every word in order, with the question panel kept.
  var GUESS = ["columns", "diagnosis", "diff", "draft", "stage"];
  function made_up(p) { return p.exchange && !PICK[p.exchange] && !(p.kind && LAYOUTS[p.kind]); }
  function guess(p) {
    for (var i = 0; i < GUESS.length; i++) if (!NEEDS[GUESS[i]](p).length) return Object.assign({}, p, { kind: GUESS[i] });
    var rest = {};
    for (var k in p) if (!/^(details|table|sources|question|exchange|theme|kind)$/.test(k)) rest[k] = p[k];
    var words = carried(rest, "");
    return { exchange: "found", theme: p.theme, answer: words[0] || "", points: words.slice(1), table: p.table, sources: p.sources, details: p.details, question: p.question };
  }
  // 0.13.2: a real exchange with a missing part is mended, not flagged.
  function mend(kind, p) {
    if (kind === "diff") {
      var one = paneOk(p.after) ? p.after : paneOk(p.before) ? p.before : null;
      if (one) {
        var words = [one.text, typeof p.changed === "string" && String(one.text || "").indexOf(p.changed) < 0 ? p.changed : "", p.note].filter(has).join(" ");
        if (one.image && has(one.image.src)) return { kind: "stage", exchange: "show", theme: p.theme, title: p.title, image: one.image, note: words, question: p.question };
        return { exchange: "found", theme: p.theme, answer: p.title || words, points: p.title ? [words] : [], details: p.details, question: p.question };
      }
    }
    var rest = {}; for (var k in p) if (k !== "kind" && k !== "exchange") rest[k] = p[k];
    return guess(rest);
  }
  function pickForm(payload) {
    if (payload.kind && LAYOUTS[payload.kind]) return payload.kind;
    var f = PICK[payload.exchange];
    return f && LAYOUTS[f] ? f : "note";
  }
  // Kept so an older themes.js still loads without an error; the textures are no longer drawn.
  function addThemes(map) { for (var k in map) THEMES[k] = map[k]; }

  // 0.12.2: a payload that is not valid JSON is repaired when the slip is a bracket, and
  // otherwise drawn as a plain card from the fallback line.
  function balance(t) {
    var out = "", stack = [], inStr = false, esc = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      if (inStr) { out += ch; if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') { inStr = true; out += ch; continue; }
      if (ch === "{" || ch === "[") { stack.push(ch === "{" ? "}" : "]"); out += ch; continue; }
      if (ch === "}" || ch === "]") { if (stack.length && stack[stack.length - 1] === ch) { stack.pop(); out += ch; } continue; }
      out += ch;
    }
    if (inStr) out += '"';
    while (stack.length) out += stack.pop();
    return out;
  }
  function salvage(t) {
    if (typeof t !== "string") return null;
    var s = t.trim(), tries = [s, balance(s), balance(s.replace(/,\s*([}\]])/g, "$1"))];
    for (var i = 0; i < tries.length; i++) {
      try { var v = JSON.parse(tries[i]); if (v && typeof v === "object" && !isArr(v)) return v; } catch (e) {}
    }
    return null;
  }
  function render(target, payload) {
    css();
    var host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;
    var orig = (host.textContent || "").trim();
    payload = payload || {};
    if (payload.exchange === "unreadable") {
      var fixed = salvage(payload.text);
      var look = (String(payload.text || "").match(/"theme"\s*:\s*"(\w+)"/) || [])[1];
      payload = fixed || { exchange: "found", answer: orig || "This reply's card could not be read.", theme: look };
    }
    try { draw(host, payload, orig); }
    catch (e) {
      try {
        host.textContent = "";
        var card = el("div", "bb");
        incomplete(payload, card, ["a shape the renderer can draw (it stopped on: " + String(e && e.message || e) + ")"], orig);
        host.appendChild(card);
        host.setAttribute("data-bb", VERSION + ":error");
      } catch (e2) { host.textContent = orig || "This reply's card could not be drawn."; }
    }
  }
  function draw(host, payload, orig) {
    host.textContent = "";
    var card = el("div", "bb");
    var guessed = made_up(payload);
    if (guessed) payload = guess(payload);
    var kind = pickForm(payload);
    var why = missing(kind, payload), mended = false;
    if (why.length) {
      var fixed = mend(kind, payload), fk = pickForm(fixed);
      if (!missing(fk, fixed).length) { payload = fixed; kind = fk; why = []; mended = true; }
    }
    if (why.length) {
      incomplete(payload, card, why, orig);
      host.appendChild(card);
      host.setAttribute("data-bb", VERSION + ":incomplete");
      return;
    }
    var look = LOOKS.indexOf(payload.theme) >= 0 ? payload.theme : null;
    if (look) card.setAttribute("data-bb-look", look);
    LOOK = look; KIND = kind;
    try {
      LAYOUTS[kind](payload, card);
      if (!card.textContent.trim() && !card.querySelector("img,video")) throw new Error("the form drew nothing");
      // 0.13.1: a question is never dropped. A form that did not draw the panel gets it here.
      if (payload.question && has(payload.question.q) && !card.querySelector(".bb-q")) question(payload.question, card);
    }
    finally { LOOK = null; KIND = null; }
    // The look's picture goes in the header corner of every form but the one-liners.
    if (look && kind !== "line" && kind !== "note") {
      var hero = HERO_FORMS.indexOf(kind) >= 0 && !!HEROES[look];
      card.insertBefore(corner(look, hero, function (what) { host.setAttribute("data-bb-art", what); }), card.firstChild);
      if (hero) card.classList.add("has-hero");
    }
    host.appendChild(card);
    if (look) host.setAttribute("data-bb-look", look);
    host.setAttribute("data-bb", VERSION + ":" + kind + (guessed ? ":guessed" : "") + (mended ? ":mended" : ""));
    reveal(card);
  }

  root.BB = { render: render, version: VERSION, kinds: Object.keys(LAYOUTS), pick: PICK, looks: LOOKS, heroes: HEROES, limits: LIMIT, addThemes: addThemes };
})(window);
