/* BooBridge render - turns a short payload into a finished inline reply.
   The model sends { kind, title, ... }. This script picks the layout for that kind,
   applies the theme, and draws it. Text colours come from the host page's own
   variables, so light and dark both work. */
(function (root) {
  "use strict";
  var VERSION = "0.6.0";
  var BASE = ((document.currentScript && document.currentScript.src) || "").replace(/[^\/]*$/, "");
  var THEMES = {}, WAIT = [];
  var THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  var TEX = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/";

  var CSS = [
    ".bb{font-family:inherit;color:var(--text-primary,#1c1c1a);border:0.5px solid var(--border,#d9d7cf);border-radius:14px;overflow:hidden;background:var(--surface-2,#fff)}",
    ".bb *{box-sizing:border-box}",
    ".bb-hero{position:relative;height:270px;background:#05070f;color:#fff;overflow:hidden}",
    ".bb-hero canvas{position:absolute;inset:0;width:100%;height:100%;display:block}",
    ".bb-hero .bb-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,15,.92) 0%,rgba(5,7,15,.55) 42%,rgba(5,7,15,0) 70%)}",
    ".bb-hero .bb-over{position:absolute;left:22px;right:22px;top:20px;bottom:18px;display:flex;flex-direction:column;justify-content:space-between}",
    ".bb-eyebrow{font-size:13px;letter-spacing:.08em;color:#9fb4e8}",
    ".bb-title{font-size:28px;font-weight:500;line-height:1.2;margin:6px 0 0;max-width:62%;color:#fff}",
    ".bb-sub{font-size:15px;color:#d5def5;margin-top:8px;max-width:58%;line-height:1.5}",
    ".bb-badge{display:inline-flex;align-items:center;gap:8px;font-size:13px;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.12);border:0.5px solid rgba(255,255,255,.45);color:#fff;align-self:flex-start}",
    ".bb-dot{width:8px;height:8px;border-radius:50%;background:#5DCAA5}",
    ".bb-dot.warn{background:#EF9F27}.bb-dot.bad{background:#E24B4A}",
    "@keyframes bbpulse{0%{box-shadow:0 0 0 0 rgba(93,202,165,.7)}100%{box-shadow:0 0 0 9px rgba(93,202,165,0)}}",
    ".bb-dot.live{animation:bbpulse 1.8s infinite}",
    ".bb-body{padding:4px 22px 18px}",
    ".bb-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;padding:16px 0 4px}",
    ".bb-tile{background:var(--surface-1,#f6f5f1);border-radius:10px;padding:12px 14px}",
    ".bb-tile .k{font-size:14px;font-weight:500;color:var(--text-secondary,#5f5e5a)}",
    ".bb-tile .v{font-size:26px;font-weight:500;line-height:1.3;font-variant-numeric:tabular-nums}",
    ".bb-tile .n{font-size:14px;color:var(--text-secondary,#5f5e5a);line-height:1.4}",
    ".bb-sec{border-top:0.5px solid var(--border-strong,#c9c7bd);padding:14px 0 12px;margin-top:12px}",
    ".bb-sec .l{font-size:16px;font-weight:500;margin-bottom:4px}",
    ".bb-sec .t{font-size:15px;line-height:1.6}",
    ".bb-flow{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;padding-top:6px}",
    ".bb-step{flex:1 1 130px;border:0.5px solid var(--border-strong,#c9c7bd);border-radius:10px;padding:10px 12px;background:var(--surface-1,#f6f5f1)}",
    ".bb-step .l{font-size:13px;font-weight:500;color:var(--text-secondary,#5f5e5a)}",
    ".bb-step .t{font-size:15px;line-height:1.45}",
    ".bb-step.hot{border:2px solid var(--border-accent,#378ADD);background:var(--surface-2,#fff)}",
    ".bb-det summary{cursor:pointer;font-size:15px;font-weight:500;color:var(--text-secondary,#5f5e5a);padding:12px 0 4px}",
    ".bb-det ul{margin:0 0 6px;padding-left:20px}.bb-det li{font-size:15px;line-height:1.7}.bb-det b{font-weight:500}",
    ".bb-q{background:var(--bg-accent,#E6F1FB);border-radius:10px;padding:14px 16px;margin-top:12px}",
    ".bb-q .qq{font-size:16px;font-weight:500;margin-bottom:8px;color:var(--text-primary,#1c1c1a)}",
    ".bb-q .c{display:flex;gap:10px;font-size:15px;line-height:1.6;color:var(--text-primary,#1c1c1a)}",
    ".bb-q .c b{font-weight:500;min-width:20px}",
    ".bb-note{display:flex;gap:12px;align-items:flex-start;padding:14px 18px}",
    ".bb-note .m{width:4px;align-self:stretch;border-radius:2px;background:var(--border-accent,#378ADD)}",
    ".bb-note .t{font-size:16px;line-height:1.55}",
    ".bb.bb-bare{border:0;background:transparent;overflow:visible;border-radius:0;padding:2px 6px 24px;--bbg:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")}",
    ".bb-line{display:flex;gap:10px;align-items:center;font-size:16px;line-height:1.55;padding:2px 0}",
    ".bb-orb{width:18px;height:18px;border-radius:50%;flex:none;background:radial-gradient(circle at 32% 28%,#b9f0c9,#2f9e5b 55%,#1c6b3c);box-shadow:0 1px 2px rgba(0,0,0,.35),inset 0 -2px 3px rgba(0,0,0,.25)}",
    ".bb-orb.warn{background:radial-gradient(circle at 32% 28%,#ffe2ad,#e0932a 55%,#9a5f10)}.bb-orb.bad{background:radial-gradient(circle at 32% 28%,#ffc4c0,#d8463f 55%,#8e2420)}",
    ".bb-desk{padding:20px 18px 30px;border-radius:14px;background:linear-gradient(160deg,rgba(120,120,110,.16),rgba(120,120,110,.05))}",
    ".bb[data-bb-theme] .bb-desk{background:var(--bb-desk,none) 0 0/256px,linear-gradient(160deg,rgba(120,120,110,.16),rgba(120,120,110,.05));box-shadow:inset 0 2px 6px rgba(0,0,0,.28),inset 0 0 0 1px rgba(0,0,0,.12)}",
    ".bb[data-bb-theme] .bb-stage{background:linear-gradient(180deg,rgba(27,36,48,.86),rgba(14,20,28,.93)),var(--bb-stage,none) 0 0/256px,#0e141c}",
    ".bb[data-bb-theme] .bb-slip{background:linear-gradient(color-mix(in srgb,var(--surface-1) 80%,transparent),color-mix(in srgb,var(--surface-1) 80%,transparent)),var(--bb-slip,none) 0 0/256px,var(--surface-1)}",
    ".bb-sheet{position:relative;max-width:520px;margin:0 auto;padding:22px 22px 20px;border-radius:3px;background:#fbfaf6;color:#22211e;transform:rotate(-.4deg);box-shadow:0 1px 1px rgba(0,0,0,.16),0 6px 8px -5px rgba(0,0,0,.22),0 18px 16px -14px rgba(0,0,0,.36)}",
    ".bb-sheet:before{content:'';position:absolute;inset:0;border-radius:3px;background:var(--bbg);opacity:.22;mix-blend-mode:multiply;pointer-events:none}",
    ".bb-sheet:after{content:'';position:absolute;inset:0;border-radius:3px;background:linear-gradient(115deg,rgba(255,255,255,.55),rgba(255,255,255,0) 38%,rgba(0,0,0,.05));pointer-events:none}",
    ".bb-sheet p{margin:0 0 10px;position:relative;font-size:16px;line-height:1.6;white-space:pre-line}.bb-sheet p:last-child{margin-bottom:0}",
    ".bb-sheet .to{font-size:14px;color:#6a675f;border-bottom:1px solid #e3e0d6;padding-bottom:8px}",
    ".bb-check{margin:12px 0 0;font-size:15px;color:var(--text-secondary,#5f5e5a);text-align:center}",
    ".bb-cap{font-size:17px;font-weight:600;margin:0 0 10px}",
    ".bb-stage{border-radius:16px;padding:16px;position:relative;overflow:hidden;background:linear-gradient(180deg,#1b2430,#0e141c);color:#eef2f6;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(255,255,255,.06),0 18px 16px -16px rgba(0,0,0,.5)}",
    ".bb-stage:before{content:'';position:absolute;inset:0;background:radial-gradient(120% 70% at 20% -10%,rgba(140,190,255,.28),transparent 60%),var(--bbg);opacity:.8;mix-blend-mode:soft-light;pointer-events:none}",
    ".bb-stage>*{position:relative}",
    ".bb-bar{display:grid;grid-template-columns:minmax(90px,30%) 1fr auto;gap:10px;align-items:center;margin:8px 0;font-size:15px}",
    ".bb-bar i{display:block;height:12px;border-radius:6px;background:linear-gradient(180deg,#9fd0ff,#3d8fe0 60%,#2a6fb8);box-shadow:0 2px 4px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.5)}",
    ".bb-bar b{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}",
    ".bb-stage ul{margin:0;padding-left:20px}.bb-stage li{font-size:15px;line-height:1.7}",
    ".bb-stage img{display:block;max-width:100%;border-radius:8px;margin:0 auto}",
    ".bb-stage a{color:#9fd0ff}",
    ".bb{--text-primary:var(--color-text-primary,#1c1c1a);--text-secondary:var(--color-text-secondary,#5f5e5a);--border:var(--color-border-tertiary,#d9d7cf);--border-strong:var(--color-border-secondary,#c9c7bd);--border-accent:var(--color-border-info,#378ADD);--bg-accent:var(--color-background-info,#E6F1FB);--surface-1:var(--color-background-secondary,#f6f5f1);--surface-2:var(--color-background-primary,#fff)}",
    ".bb-h{font-size:20px;font-weight:600;line-height:1.35;margin:0 0 10px}",
    ".bb-slip{position:relative;border-radius:12px;padding:14px 16px;background:var(--surface-1);border:0.5px solid var(--border);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 14px 14px -14px rgba(0,0,0,.35)}",
    ".bb-slip:before{content:'';position:absolute;inset:0;border-radius:12px;background:var(--bbg);opacity:.18;mix-blend-mode:soft-light;pointer-events:none}",
    ".bb-slip>*{position:relative}",
    ".bb-slip .l{font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:6px}",
    ".bb-done{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.55;padding:4px 0}",
    ".bb-tick{flex:none;width:16px;height:16px;margin-top:4px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#b9f0c9,#2f9e5b 55%,#1c6b3c);box-shadow:0 1px 2px rgba(0,0,0,.3);position:relative}",
    ".bb-tick:after{content:'';position:absolute;left:5px;top:2.5px;width:4px;height:7px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}",
    ".bb-pt{font-size:16px;line-height:1.6;margin:0 0 6px}",
    ".bb-tbl{width:100%;border-collapse:collapse;font-size:15px;margin-top:8px}.bb-tbl th{text-align:left;font-weight:600;color:var(--text-secondary);padding:6px 10px 6px 0}.bb-tbl td{padding:7px 10px 7px 0;border-top:0.5px solid var(--border);vertical-align:top}",
    ".bb-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}",
    ".bb-chip{font-size:14px;padding:5px 12px;border-radius:999px;text-decoration:none;color:var(--text-primary);background:var(--surface-1);border:0.5px solid var(--border-strong);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 3px 3px -2px rgba(0,0,0,.25)}",
    ".bb-ba{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}",
    ".bb-pane{border-radius:12px;padding:12px 14px;border:0.5px solid var(--border);font-size:15px;line-height:1.55;white-space:pre-line;position:relative}",
    ".bb-pane .l{font-size:13px;font-weight:600;letter-spacing:.04em;color:var(--text-secondary);margin-bottom:4px;white-space:normal}",
    ".bb-pane.old{background:transparent;color:var(--text-secondary)}",
    ".bb-pane.new{background:var(--surface-2);border:1.5px solid var(--border-accent);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 16px 14px -14px rgba(0,0,0,.4)}",
    ".bb-pane mark{background:rgba(255,214,90,.55);color:inherit;border-radius:3px;padding:0 2px}",
    "@media (max-width:520px){.bb-ba,.bb-cols{grid-template-columns:1fr}}",
    ".bb-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:start;padding-bottom:16px}",
    ".bb-opt{border-radius:12px;padding:12px 14px;border:0.5px solid var(--border);position:relative}",
    ".bb-opt.pick{background:var(--surface-2);border:1.5px solid var(--border-accent);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 16px 14px -14px rgba(0,0,0,.4)}",
    ".bb-opt .nm{font-size:16px;font-weight:600;margin-bottom:6px}",
    ".bb-opt .tag{display:inline-block;font-size:12px;font-weight:600;letter-spacing:.04em;padding:1px 8px;border-radius:999px;background:var(--border-accent);color:#fff;margin-left:8px;vertical-align:2px}",
    ".bb-opt .r{border-top:0.5px solid var(--border);padding:6px 0;font-size:15px;line-height:1.45}",
    ".bb-opt .r span{display:block;font-size:13px;color:var(--text-secondary)}",
    ".bb-prose p{font-size:16px;line-height:1.7;margin:0 0 12px;max-width:62ch}",
    ".bb-key{font-size:19px;line-height:1.45;font-weight:600;margin:4px 0 16px;padding:2px 0 2px 14px;border-left:3px solid var(--border-accent);max-width:56ch}",
    ".bb-say p{font-size:17px;line-height:1.7;margin:0 0 8px}.bb-say .ask{font-weight:600;margin-top:14px}",
    ".bb-pane.pic{padding:10px}",
    ".bb-pane img{display:block;width:100%;height:auto;border-radius:8px;background:var(--surface-1)}",
    ".bb-pane.old img{opacity:.82}",
    ".bb-pane .cap{font-size:14px;line-height:1.45;margin-top:8px;white-space:normal}",
    ".bb-fade{opacity:0;transform:translateY(6px);transition:opacity .5s ease,transform .5s ease}",
    ".bb-fade.in{opacity:1;transform:none}",
    "@media (prefers-reduced-motion: reduce){.bb-fade{transition:none;opacity:1;transform:none}.bb-dot.live{animation:none}}",
    "@media (max-width:520px){.bb-title{font-size:22px;max-width:70%}.bb-sub{max-width:70%}.bb-hero{height:240px}.bb-ba,.bb-cols{grid-template-columns:1fr}}"
  ].join("");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function css() {
    if (document.getElementById("bb-css")) return;
    var s = el("style"); s.id = "bb-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function still() {
    return root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function script(url, done) {
    if (root.THREE) return done(true);
    var s = el("script"); s.src = url;
    s.onload = function () { done(!!root.THREE); };
    s.onerror = function () { done(false); };
    document.head.appendChild(s);
  }

  /* ---- hero art -------------------------------------------------------------- */
  function paintFallback(canvas) {
    var w = canvas.width = canvas.clientWidth * 2, h = canvas.height = canvas.clientHeight * 2;
    var x = canvas.getContext("2d");
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#05070f"); g.addColorStop(1, "#16204a");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    var r = x.createRadialGradient(w * .8, h * 1.1, 10, w * .8, h * 1.1, h);
    r.addColorStop(0, "rgba(120,170,255,.9)"); r.addColorStop(1, "rgba(120,170,255,0)");
    x.fillStyle = r; x.fillRect(0, 0, w, h);
    x.fillStyle = "#fff";
    for (var i = 0; i < 220; i++) x.fillRect((i * 7919) % w, (i * 104729) % h, 2, 2);
  }

  function globe(canvas, report) {
    var T = root.THREE, renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    } catch (e) { paintFallback(canvas); return report("painted"); }
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    var scene = new T.Scene();
    scene.background = new T.Color(0x05070f);
    var cam = new T.PerspectiveCamera(32, 2, 0.1, 100);
    cam.position.set(-1.25, 0.25, 4.6);
    cam.lookAt(-1.25, -0.1, 0);

    var sun = new T.DirectionalLight(0xfff4e0, 1.25); sun.position.set(-4, 2.2, 3.5); scene.add(sun);
    scene.add(new T.AmbientLight(0x23304f, 0.9));

    var loader = new T.TextureLoader(); loader.setCrossOrigin("anonymous");
    var earth = new T.Mesh(new T.SphereGeometry(1.45, 64, 64),
      new T.MeshPhongMaterial({ color: 0x224488, shininess: 16, specular: new T.Color(0x333333) }));
    earth.rotation.z = 0.41;
    var world = new T.Group(); world.position.set(0.55, -0.55, 0); world.add(earth); scene.add(world);
    var loaded = 0;
    loader.load(TEX + "earth_atmos_2048.jpg", function (t) {
      earth.material.map = t; earth.material.color.set(0xffffff); earth.material.needsUpdate = true;
      loaded++; report("photo");
    }, undefined, function () { report("globe, no photo"); });
    loader.load(TEX + "earth_specular_2048.jpg", function (t) { earth.material.specularMap = t; earth.material.needsUpdate = true; });
    var clouds = new T.Mesh(new T.SphereGeometry(1.47, 64, 64),
      new T.MeshLambertMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    clouds.rotation.z = 0.41; world.add(clouds);
    loader.load(TEX + "earth_clouds_1024.png", function (t) { clouds.material.map = t; clouds.material.opacity = 0.85; clouds.material.needsUpdate = true; });

    var halo = new T.Mesh(new T.SphereGeometry(1.56, 48, 48),
      new T.MeshBasicMaterial({ color: 0x4f8dff, transparent: true, opacity: 0.13, side: T.BackSide }));
    world.add(halo);

    var n = 900, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), d = 30 + Math.random() * 30;
      pos[i * 3] = d * Math.sin(b) * Math.cos(a); pos[i * 3 + 1] = d * Math.cos(b); pos[i * 3 + 2] = -Math.abs(d * Math.sin(b) * Math.sin(a));
    }
    var sg = new T.BufferGeometry(); sg.setAttribute("position", new T.BufferAttribute(pos, 3));
    scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 0.16, sizeAttenuation: true })));

    var ringPts = [];
    for (var k = 0; k <= 128; k++) { var th = k / 128 * 6.283; ringPts.push(new T.Vector3(Math.cos(th) * 2.05, 0, Math.sin(th) * 2.05)); }
    var ring = new T.Line(new T.BufferGeometry().setFromPoints(ringPts),
      new T.LineBasicMaterial({ color: 0x9fb4e8, transparent: true, opacity: 0.35 }));
    var orbit = new T.Group(); orbit.rotation.set(0.5, 0, 0.35); orbit.add(ring);
    var sat = new T.Mesh(new T.SphereGeometry(0.035, 12, 12), new T.MeshBasicMaterial({ color: 0xffd98a }));
    orbit.add(sat); world.add(orbit);

    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
    size(); root.addEventListener("resize", size);

    var visible = true, t0 = performance.now();
    if (root.IntersectionObserver) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(canvas);
    }
    function frame(now) {
      var t = (now - t0) / 1000;
      earth.rotation.y = 2.4 + t * 0.05; clouds.rotation.y = 2.4 + t * 0.065;
      sat.position.set(Math.cos(t * 0.5) * 2.05, 0, Math.sin(t * 0.5) * 2.05);
      renderer.render(scene, cam);
    }
    function loop(now) { if (visible) frame(now); if (!still()) root.requestAnimationFrame(loop); }
    if (still()) { var tries = 0; var iv = setInterval(function () { frame(performance.now()); if (++tries > 12) clearInterval(iv); }, 400); }
    else root.requestAnimationFrame(loop);
  }

  /* ---- shared parts ---------------------------------------------------------- */
  function tiles(list) {
    var wrap = el("div", "bb-tiles");
    (list || []).forEach(function (t) {
      var c = el("div", "bb-tile bb-fade");
      c.appendChild(el("div", "k", t.k));
      var v = el("div", "v", String(t.v)); c.appendChild(v);
      if (t.n) c.appendChild(el("div", "n", t.n));
      wrap.appendChild(c);
      var num = typeof t.v === "number" ? t.v : null;
      if (num !== null && !still()) {
        var start = null, fmt = function (x) { return Math.round(x).toLocaleString(); };
        v.textContent = "0";
        var step = function (ts) {
          if (start === null) start = ts;
          var p = Math.min(1, (ts - start) / 1100), e = 1 - Math.pow(1 - p, 3);
          v.textContent = fmt(num * e) + (t.unit || "");
          if (p < 1) root.requestAnimationFrame(step);
        };
        root.requestAnimationFrame(step);
      } else if (num !== null) v.textContent = num.toLocaleString() + (t.unit || "");
    });
    return wrap;
  }
  function sections(list, into) {
    (list || []).forEach(function (s) {
      var d = el("div", "bb-sec bb-fade");
      d.appendChild(el("div", "l", s.label)); d.appendChild(el("div", "t", s.text));
      into.appendChild(d);
    });
  }
  function details(d, into) {
    if (!d || !d.items || !d.items.length) return;
    var box = el("details", "bb-det bb-sec"); box.style.paddingBottom = "0";
    box.appendChild(el("summary", null, d.label || "Details"));
    var ul = el("ul");
    d.items.forEach(function (it) { var li = el("li"); li.appendChild(el("b", null, it[0] + ": ")); li.appendChild(document.createTextNode(it[1])); ul.appendChild(li); });
    box.appendChild(ul); into.appendChild(box);
  }
  function question(q, into) {
    if (!q) return;
    var box = el("div", "bb-q bb-fade"); box.appendChild(el("div", "qq", q.q));
    (q.choices || []).forEach(function (c, i) {
      var row = el("div", "c"); row.appendChild(el("b", null, String.fromCharCode(65 + i))); row.appendChild(el("span", null, c)); box.appendChild(row);
    });
    into.appendChild(box);
  }
  function reveal(node) {
    var items = node.querySelectorAll(".bb-fade");
    Array.prototype.forEach.call(items, function (n, i) { setTimeout(function () { n.classList.add("in"); }, 120 + i * 90); });
  }

  /* ---- layouts, one per kind of reply ---------------------------------------- */
  var LAYOUTS = {
    mission: function (p, card, report) {
      var hero = el("div", "bb-hero"), canvas = el("canvas");
      canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "The Earth turning slowly in space");
      hero.appendChild(canvas); hero.appendChild(el("div", "bb-shade"));
      var over = el("div", "bb-over"), top = el("div");
      if (p.eyebrow) top.appendChild(el("div", "bb-eyebrow", p.eyebrow));
      top.appendChild(el("div", "bb-title", p.title));
      if (p.sub) top.appendChild(el("div", "bb-sub", p.sub));
      over.appendChild(top);
      if (p.status) {
        var b = el("div", "bb-badge"), dot = el("span", "bb-dot live" + (p.status.tone === "warn" ? " warn" : p.status.tone === "bad" ? " bad" : ""));
        b.appendChild(dot); b.appendChild(el("span", null, p.status.text)); over.appendChild(b);
      }
      hero.appendChild(over); card.appendChild(hero);
      var body = el("div", "bb-body");
      if (p.tiles) body.appendChild(tiles(p.tiles));
      sections(p.sections, body); details(p.details, body); question(p.question, body);
      card.appendChild(body);
      script(THREE_URL, function (ok) { if (ok) globe(canvas, report); else { paintFallback(canvas); report("painted"); } });
    },
    diagnosis: function (p, card) {
      var body = el("div", "bb-body"); body.style.paddingTop = "16px";
      var head = el("div"); head.style.cssText = "display:flex;justify-content:space-between;gap:12px;align-items:center";
      var ti = el("div", null, p.title); ti.style.cssText = "font-size:20px;font-weight:500"; head.appendChild(ti);
      body.appendChild(head);
      var flow = el("div", "bb-flow");
      (p.flow || []).forEach(function (s) {
        var st = el("div", "bb-step bb-fade" + (s.hot ? " hot" : "")); st.appendChild(el("div", "l", s.label)); st.appendChild(el("div", "t", s.text)); flow.appendChild(st);
      });
      var sec = el("div", "bb-sec"); sec.appendChild(flow); body.appendChild(sec);
      sections(p.sections, body); details(p.details, body); question(p.question, body);
      card.appendChild(body);
    },
    line: function (p, card) {
      card.classList.add("bb-bare");
      var l = el("div", "bb-line"); l.appendChild(el("span", "bb-orb" + (p.tone && p.tone !== "ok" ? " " + p.tone : ""))); l.appendChild(el("span", null, p.text)); card.appendChild(l);
    },
    draft: function (p, card) {
      card.classList.add("bb-bare");
      var desk = el("div", "bb-desk"), sheet = el("div", "bb-sheet");
      var head = [p.to ? "To: " + p.to : "", p.subject ? "Subject: " + p.subject : ""].filter(Boolean).join("  ·  ");
      if (head) sheet.appendChild(el("p", "to", head));
      String(p.body || "").split(/\n\s*\n/).forEach(function (para) { sheet.appendChild(el("p", null, para)); });
      desk.appendChild(sheet); card.appendChild(desk);
      if (p.check) card.appendChild(el("p", "bb-check", "Check before sending: " + p.check));
      question(p.question, card);
    },
    stage: function (p, card) {
      card.classList.add("bb-bare");
      if (p.title) card.appendChild(el("div", "bb-cap", p.title));
      var st = el("div", "bb-stage");
      if (p.bars && p.bars.length) {
        var max = Math.max.apply(null, p.bars.map(function (b) { return +b[1] || 0; })) || 1;
        p.bars.forEach(function (b) {
          var r = el("div", "bb-bar"), i = el("i"); i.style.width = Math.max(2, 100 * (+b[1] || 0) / max) + "%";
          r.appendChild(el("span", null, b[0])); r.appendChild(i); r.appendChild(el("b", null, (+b[1]).toLocaleString())); st.appendChild(r);
        });
      }
      if (p.items && p.items.length) { var ul = el("ul"); p.items.forEach(function (t) { ul.appendChild(el("li", null, t)); }); st.appendChild(ul); }
      if (p.image && /^(https:\/\/|data:image\/)/.test(p.image.src || "")) { var im = el("img"); im.src = p.image.src; im.alt = p.image.alt || ""; im.loading = "lazy"; st.appendChild(im); }
      if (p.link && /^https:\/\//.test(p.link.url || "")) { var a = el("a", null, p.link.text || "Open full size"); a.href = p.link.url; a.target = "_blank"; a.rel = "noopener"; var w = el("div"); w.style.marginTop = "10px"; w.appendChild(a); st.appendChild(w); }
      card.appendChild(st);
      if (p.note) card.appendChild(el("p", "bb-check", p.note));
      question(p.question, card);
    },
    receipt: function (p, card) {
      card.classList.add("bb-bare");
      if (p.result) card.appendChild(el("div", "bb-h", p.result));
      if (p.changed && p.changed.length) {
        var slip = el("div", "bb-slip"); slip.appendChild(el("div", "l", p.label || "What changed"));
        p.changed.forEach(function (c) { var r = el("div", "bb-done"); r.appendChild(el("span", "bb-tick")); r.appendChild(el("span", null, c)); slip.appendChild(r); });
        card.appendChild(slip);
      }
      details(p.details, card); question(p.question, card);
    },
    answer: function (p, card) {
      card.classList.add("bb-bare");
      if (p.answer) card.appendChild(el("div", "bb-h", p.answer));
      (p.points || []).forEach(function (t) { card.appendChild(el("p", "bb-pt", t)); });
      if (p.table && p.table.rows && p.table.rows.length) {
        var tb = el("table", "bb-tbl");
        if (p.table.head) { var hr = el("tr"); p.table.head.forEach(function (h) { hr.appendChild(el("th", null, h)); }); tb.appendChild(hr); }
        p.table.rows.forEach(function (row) { var tr = el("tr"); row.forEach(function (c) { tr.appendChild(el("td", null, c)); }); tb.appendChild(tr); });
        card.appendChild(tb);
      }
      var src = (p.sources || []).filter(function (x) { return /^https:\/\//.test(x.url || ""); });
      if (src.length) { var ch = el("div", "bb-chips"); src.forEach(function (x) { var a = el("a", "bb-chip", x.text || x.url); a.href = x.url; a.target = "_blank"; a.rel = "noopener"; ch.appendChild(a); }); card.appendChild(ch); }
      details(p.details, card); question(p.question, card);
    },
    diff: function (p, card) {
      card.classList.add("bb-bare");
      if (p.title) card.appendChild(el("div", "bb-h", p.title));
      var ba = el("div", "bb-ba");
      function pane(cls, d, fallback) {
        var n = el("div", "bb-pane " + cls); n.appendChild(el("div", "l", (d && d.label) || fallback));
        var im = d && d.image;
        if (im && /^(https:\/\/|data:image\/)/.test(im.src || "")) { var g = el("img"); g.src = im.src; g.alt = im.alt || ""; g.loading = "lazy"; n.appendChild(g); n.classList.add("pic"); }
        var text = String((d && d.text) || ""), mk = cls === "new" && p.changed ? text.indexOf(p.changed) : -1;
        if (!text) return n;
        if (n.classList.contains("pic")) { var cap = el("div", "cap"); n.appendChild(cap); var keep = n; n = cap; var done = function () { return keep; }; }
        if (mk < 0) n.appendChild(document.createTextNode(text));
        else { n.appendChild(document.createTextNode(text.slice(0, mk))); n.appendChild(el("mark", null, p.changed)); n.appendChild(document.createTextNode(text.slice(mk + p.changed.length))); }
        return done ? done() : n;
      }
      ba.appendChild(pane("old", p.before, "BEFORE")); ba.appendChild(pane("new", p.after, "AFTER")); card.appendChild(ba);
      if (p.note) card.appendChild(el("p", "bb-check", p.note));
      question(p.question, card);
    },
    columns: function (p, card) {
      card.classList.add("bb-bare");
      if (p.title) card.appendChild(el("div", "bb-h", p.title));
      var cols = el("div", "bb-cols"), rows = p.rows || [];
      (p.options || []).forEach(function (o) {
        var c = el("div", "bb-opt" + (o.pick ? " pick" : "")), nm = el("div", "nm", o.name);
        if (o.pick) nm.appendChild(el("span", "tag", "MY PICK"));
        c.appendChild(nm);
        (o.values || []).forEach(function (v, i) { var r = el("div", "r"); if (rows[i]) r.appendChild(el("span", null, rows[i])); r.appendChild(document.createTextNode(v)); c.appendChild(r); });
        cols.appendChild(c);
      });
      card.appendChild(cols);
      if (p.note) card.appendChild(el("p", "bb-pt", p.note));
      question(p.question, card);
    },
    prose: function (p, card) {
      card.classList.add("bb-bare");
      var w = el("div", "bb-prose"), paras = p.paras || [], at = Math.min(p.keyAfter == null ? 1 : p.keyAfter, paras.length);
      paras.forEach(function (t, i) { if (i === at && p.key) w.appendChild(el("div", "bb-key", p.key)); w.appendChild(el("p", null, t)); });
      if (p.key && at >= paras.length) w.appendChild(el("div", "bb-key", p.key));
      card.appendChild(w); question(p.question, card);
    },
    spoken: function (p, card) {
      card.classList.add("bb-bare");
      var w = el("div", "bb-say");
      (p.lines || []).forEach(function (t) { w.appendChild(el("p", null, t)); });
      if (p.ask) w.appendChild(el("p", "ask", p.ask));
      card.appendChild(w);
    },
    note: function (p, card) {
      var n = el("div", "bb-note"); n.appendChild(el("div", "m")); n.appendChild(el("div", "t", p.text)); card.appendChild(n);
    }
  };

  // The picker: the kind of exchange decides the form. Claude names the exchange; this table does the rest.
  // "moved" counts how often a user asked for a different shape, so the table can be tuned later.
  var PICK = {
    tiny: "line", did: "receipt", found: "answer", changed: "diff", broke: "diagnosis", choose: "columns",
    status: "mission", show: "stage", draft: "draft", think: "prose", voice: "spoken", told: "receipt"
  };
  function pickForm(payload) {
    if (payload.kind && LAYOUTS[payload.kind]) return payload.kind;
    var f = PICK[payload.exchange];
    return f && LAYOUTS[f] ? f : "note";
  }

  // Themes: optional textures for the surfaces under the content. Loaded once, only when a payload asks.
  function addThemes(map) { for (var k in map) THEMES[k] = map[k]; var q = WAIT; WAIT = []; q.forEach(function (f) { f(); }); }
  function applyTheme(name, card) {
    if (!name) return;
    function go() {
      var t = THEMES[name]; if (!t) return;
      card.setAttribute("data-bb-theme", name);
      ["desk", "stage", "slip"].forEach(function (k) { if (t[k]) card.style.setProperty("--bb-" + k, "url(" + t[k] + ")"); });
    }
    if (THEMES[name]) return go();
    WAIT.push(go);
    if (!BASE || document.getElementById("bb-themes")) return;
    var s = document.createElement("script"); s.id = "bb-themes"; s.src = BASE + "themes.js"; document.head.appendChild(s);
  }

  function render(target, payload) {
    css();
    var host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;
    host.textContent = "";
    var card = el("div", "bb");
    var kind = pickForm(payload);
    var state = el("span"); state.className = "sr-only";
    LAYOUTS[kind](payload, card, function (what) { host.setAttribute("data-bb-art", what); });
    host.appendChild(card);
    applyTheme(payload.theme, card);
    host.setAttribute("data-bb", VERSION + ":" + kind);
    reveal(card);
  }

  root.BB = { render: render, version: VERSION, kinds: Object.keys(LAYOUTS), pick: PICK, addThemes: addThemes };
})(window);
