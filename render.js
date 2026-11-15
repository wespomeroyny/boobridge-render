/* BooBridge render - turns a short payload into a finished inline reply.
   The model sends { kind, title, ... }. This script picks the layout for that kind,
   applies the theme, and draws it. Text colours come from the host page's own
   variables, so light and dark both work. */
(function (root) {
  "use strict";
  var VERSION = "0.11.0";
  var BASE = ((document.currentScript && document.currentScript.src) || "").replace(/[^\/]*$/, "");
  var THEMES = {}, WAIT = [];
  // Looks: full picture themes. Each has four category pictures (i1 done, i2 next, i3 problem,
  // i4 readout), one calm header scene and a border frame, under elements/<look>/ beside this
  // file. LOOK is the look of the card being drawn; it is set only while a layout runs.
  var LOOKS = ["graffiti", "forest", "mech", "story"], LOOK = null, KIND = null;

  var CSS = [
    ".bb{font-family:inherit;color:var(--text-primary,#1c1c1a);border:0.5px solid var(--border,#d9d7cf);border-radius:14px;overflow:hidden;background:var(--surface-2,#fff)}",
    ".bb *{box-sizing:border-box}",
    ".bb-hero{position:relative;height:270px;background:#140f0d;color:#fff;overflow:hidden}",
    ".bb-hero .bb-art{position:absolute;right:0;top:0;height:100%;aspect-ratio:3/2;object-fit:cover;display:block}",
    ".bb-hero .bb-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,15,.92) 0%,rgba(5,7,15,.55) 42%,rgba(5,7,15,0) 70%)}",
    ".bb-hero .bb-over{position:absolute;left:22px;right:22px;top:20px;bottom:18px;display:flex;flex-direction:column;justify-content:space-between}",
    ".bb-eyebrow{font-size:16px;letter-spacing:.08em;color:#9fb4e8}",
    ".bb-title{font-size:30px;font-weight:500;line-height:1.2;margin:6px 0 0;max-width:62%;color:#fff}",
    ".bb-sub{font-size:16px;color:#d5def5;margin-top:8px;max-width:58%;line-height:1.5}",
    ".bb-badge{display:inline-flex;align-items:center;gap:8px;font-size:16px;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.12);border:0.5px solid rgba(255,255,255,.45);color:#fff;align-self:flex-start}",
    ".bb-dot{width:8px;height:8px;border-radius:50%;background:#5DCAA5}",
    ".bb-dot.warn{background:#EF9F27}.bb-dot.bad{background:#E24B4A}",
    "@keyframes bbpulse{0%{box-shadow:0 0 0 0 rgba(93,202,165,.7)}100%{box-shadow:0 0 0 9px rgba(93,202,165,0)}}",
    ".bb-dot.live{animation:bbpulse 1.8s infinite}",
    ".bb-body{padding:4px 22px 18px}",
    ".bb-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;padding:16px 0 4px}",
    ".bb-tile{background:var(--surface-1,#f6f5f1);border-radius:10px;padding:12px 14px}",
    ".bb-tile .k{font-size:16px;font-weight:500;color:var(--text-secondary,#5f5e5a)}",
    ".bb-tile .v{font-size:28px;font-weight:500;line-height:1.3;font-variant-numeric:tabular-nums}",
    ".bb-tile .n{font-size:16px;color:var(--text-secondary,#5f5e5a);line-height:1.4}",
    ".bb-sec{border-top:0.5px solid var(--border-strong,#c9c7bd);padding:14px 0 12px;margin-top:12px}",
    ".bb-sec .l{font-size:18px;font-weight:500;margin-bottom:4px}",
    ".bb-sec .t{font-size:16px;line-height:1.6}",
    ".bb-body>.bb-sec:first-child{border-top:0;margin-top:0}",
    ".bb-ul{margin:0;padding-left:20px}.bb-ul li{font-size:16px;line-height:1.6;margin:2px 0}.bb-ul b{font-weight:500}",
    ".bb-row{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;padding:7px 0;font-size:16px;line-height:1.5}",
    ".bb-row+.bb-row{border-top:0.5px solid var(--border,#d9d7cf)}",
    ".bb-row .id{flex:none;font-weight:500;min-width:96px}.bb-row .tx{flex:1 1 200px;min-width:0}",
    ".bb-st{flex:none;font-size:16px;padding:0 10px;border-radius:999px;background:var(--surface-1,#f6f5f1);color:var(--text-secondary,#5f5e5a)}",
    ".bb-st.go{background:var(--bg-ok,#EAF3DE);color:var(--text-ok,#27500A)}",
    ".bb-meta{margin-top:14px;border-radius:10px;background:var(--surface-1,#f6f5f1);padding:0 14px}",
    ".bb-meta summary{cursor:pointer;font-size:16px;color:var(--text-secondary,#5f5e5a);padding:10px 0}",
    ".bb-meta ul{margin:0;padding:0 0 10px 20px}.bb-meta li{font-size:16px;line-height:1.7}.bb-meta b{font-weight:500}",
    ".bb[data-bb-look],.bb.bb-bare[data-bb-look]{position:relative;overflow:hidden;background:var(--lk-bg);border:2px solid var(--lk-ol);border-top:7px solid var(--lk-st);border-radius:4px;font-family:var(--lk-ff,inherit)}",
    ".bb.bb-bare[data-bb-look]{padding:10px 12px 14px}",
    ".bb[data-bb-look]>*{position:relative}",
    ".bb[data-bb-look=graffiti]{--lk-bg:#f2f3f4;--text-primary:#141414;--text-secondary:#4a4e54;--border:rgba(20,20,20,.14);--border-strong:rgba(20,20,20,.3);--surface-1:#e3e6e9;--surface-2:#fafbfb;--bg-accent:#d3f0ec;--border-accent:#1b9e92;--bg-ok:#1b9e92;--text-ok:#fff;--lk-ol:#141414;--lk-st:#2d5fc4;--lk-hbg:#1b1512;--lk-htx:#fff}",
    ".bb[data-bb-look=graffiti] .bb-sec .l{font-weight:500;letter-spacing:.01em}",
    ".bb-lh.gd{min-height:150px;background:var(--lk-hbg)}.bb-lh.gd .ti,.bb-lh.gd .sb,.bb-lh.gd .st{color:var(--lk-htx)}",
    ".bb-lh.gd .bb-gd{position:absolute;right:0;top:0;height:100%;aspect-ratio:3/2;object-fit:cover;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 30%);mask-image:linear-gradient(90deg,transparent 0,#000 30%)}",
    "@media (max-width:520px){.bb-lh.gd .bb-gd{opacity:.45}.bb-lh.gd .ti,.bb-lh.gd .sb,.bb-lh.gd .st{text-shadow:0 1px 3px var(--lk-hbg)}}",
    ".bb[data-bb-look=graffiti] img.bb-scene:not(.hd){position:absolute;right:0;top:0;width:46%;height:110px;object-fit:cover;object-position:60% 40%;opacity:.55;pointer-events:none;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 55%),linear-gradient(180deg,#000 40%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent 0,#000 55%),linear-gradient(180deg,#000 40%,transparent 100%);mask-composite:intersect}",
    ".bb[data-bb-look=forest]{--lk-bg:#f1f5ea;--text-primary:#22301c;--text-secondary:#4d5c44;--border:rgba(40,70,20,.16);--border-strong:rgba(40,70,20,.3);--surface-1:#e4ebd8;--surface-2:#f9fbf4;--bg-accent:#dde8cc;--border-accent:#3f7d2c;--bg-ok:#3f7d2c;--text-ok:#fff;--lk-ol:#22301c;--lk-st:#4f7d2c;--lk-hbg:#18200f;--lk-htx:#fff}",
    ".bb[data-bb-look=mech]{--lk-bg:#161d28;--text-primary:#e8edf3;--text-secondary:#9fb0c3;--border:rgba(160,200,255,.16);--border-strong:rgba(160,200,255,.3);--surface-1:#212c3b;--surface-2:#0f1620;--bg-accent:#14344d;--border-accent:#4fb6ff;--bg-ok:#0b2a3d;--text-ok:#7fd6ff;--lk-ol:#05080d;--lk-st:#4fb6ff;--lk-hbg:#070b12;--lk-htx:#fff;--lk-lf:ui-monospace,Consolas,monospace;--lk-so:.7}",
    ".bb[data-bb-look=story]{--lk-bg:#fbf6ea;--text-primary:#4a3b2a;--text-secondary:#7a6851;--border:rgba(110,80,40,.2);--border-strong:rgba(110,80,40,.36);--surface-1:#f2e9d5;--surface-2:#fffaf0;--bg-accent:#f1e4c8;--border-accent:#b08a4a;--bg-ok:#f0d9b0;--text-ok:#5a4120;--lk-ol:#4a3b2a;--lk-st:#b08a4a;--lk-hbg:#f6efdf;--lk-htx:#3a2d1f;--lk-ff:Georgia,'Times New Roman',serif;--lk-so:.9}",
    ".bb img.bb-scene{position:absolute;right:0;top:0;width:58%;height:88px;object-fit:cover;object-position:70% 55%;opacity:.45;pointer-events:none;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 60%),linear-gradient(180deg,#000 35%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent 0,#000 60%),linear-gradient(180deg,#000 35%,transparent 100%);mask-composite:intersect}",
    ".bb img.bb-scene.hd{height:100%;opacity:var(--lk-so,.8);-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 55%);mask-image:linear-gradient(90deg,transparent 0,#000 55%)}",
    ".bb-lh{position:relative;min-height:96px;display:flex;align-items:center;padding:6px 10px;overflow:hidden}",
    ".bb-lh>div{position:relative}.bb-lh .ti{font-size:20px;font-weight:500}.bb-lh .sb{font-size:16px;color:var(--text-secondary)}",
    ".bb-lh .st{display:flex;align-items:center;gap:8px;font-size:16px;color:var(--text-secondary)}",
    ".bb[data-bb-look] .bb-body{padding:0 10px 10px}",
    ".bb[data-bb-look] .bb-sec,.bb[data-bb-look] .bb-body>.bb-sec:first-child{padding:7px 0;margin-top:0;border-top:1px solid var(--border)}",
    ".bb[data-bb-look] .bb-sec .l{font-family:var(--lk-lf,inherit);margin-bottom:0}",
    ".bb[data-bb-look] .bb-ul{list-style:none;padding-left:0}.bb[data-bb-look] .bb-ul li{line-height:1.45;margin:0}",
    ".bb[data-bb-look] .bb-row{padding:1px 0}.bb[data-bb-look] .bb-row+.bb-row{border-top:0}",
    ".bb[data-bb-look] .bb-meta{background:transparent;padding:0;margin:0}.bb[data-bb-look] .bb-meta summary{color:var(--text-primary);padding:4px 0}",
    ".bb[data-bb-look] .bb-q{margin-top:8px}",
    ".bb-im{display:flex;gap:12px;align-items:center}.bb-im>.tx{flex:1;min-width:0}.bb-im .bb-h{margin:0}",
    ".bb-ic{flex:none;width:44px;height:44px;object-fit:contain;filter:drop-shadow(0 3px 2px rgba(0,0,0,.3))}.bb-ic.sm{width:24px;height:24px}",
    ".bb-ic.ng{animation:bbng 2.6s ease-in-out infinite alternate}@keyframes bbng{to{transform:translateX(5px)}}",
    ".bb.bb-tsw{margin:0 0 12px}.bb-tsw .bb-lh{min-height:72px}",
    ".bb-flow{display:flex;flex-wrap:wrap;align-items:stretch;gap:8px;padding-top:6px}",
    ".bb-step{flex:1 1 130px;border:0.5px solid var(--border-strong,#c9c7bd);border-radius:10px;padding:10px 12px;background:var(--surface-1,#f6f5f1)}",
    ".bb-step .l{font-size:16px;font-weight:500;color:var(--text-secondary,#5f5e5a)}",
    ".bb-step .t{font-size:16px;line-height:1.45}",
    ".bb-step.hot{border:2px solid var(--border-accent,#378ADD);background:var(--surface-2,#fff)}",
    ".bb-det summary{cursor:pointer;font-size:16px;font-weight:500;color:var(--text-secondary,#5f5e5a);padding:12px 0 4px}",
    ".bb-det ul{margin:0 0 6px;padding-left:20px}.bb-det li{font-size:16px;line-height:1.7}.bb-det b{font-weight:500}",
    ".bb-q{background:var(--bg-accent,#E6F1FB);border-radius:10px;padding:14px 16px;margin-top:12px}",
    ".bb-q .qh{display:flex;gap:12px;align-items:flex-start;margin-bottom:8px}",
    ".bb-q .qq{flex:1;font-size:18px;font-weight:500;color:var(--text-primary,#1c1c1a)}",
    ".bb-aids{display:flex;gap:6px;flex:none}",
    ".bb-aid{box-sizing:border-box;width:28px;height:28px;border-radius:50%;display:block;padding:0;cursor:pointer;user-select:none;color:var(--text-primary,#1c1c1a);background:var(--surface-2,#fff);border:1px solid var(--border-strong,#c9c7bd)}",
    ".bb-aid svg{display:block;width:100%;height:100%}",
    ".bb-aid:focus-visible{outline:2px solid var(--text-primary,#1c1c1a);outline-offset:1px}",
    ".bb-aid.on{border-color:var(--text-primary,#1c1c1a);background:var(--text-primary,#1c1c1a);color:var(--surface-2,#fff)}",
    ".bb-tip{display:none;margin:0 0 10px;padding:10px 12px;border-radius:8px;font-size:16px;line-height:1.55;color:var(--text-primary,#1c1c1a);background:var(--surface-2,#fff);border:0.5px solid var(--border-strong,#c9c7bd)}",
    ".bb-tip.on{display:block}.bb-tip b{display:block;font-weight:600;margin-bottom:2px}.bb-tip div{margin-top:2px}",
    ".bb-q .c{display:flex;gap:10px;font-size:16px;line-height:1.6;color:var(--text-primary,#1c1c1a)}",
    ".bb-q .c b{font-weight:500;min-width:20px}",
    ".bb-note{display:flex;gap:12px;align-items:flex-start;padding:14px 18px}",
    ".bb-note .m{width:4px;align-self:stretch;border-radius:2px;background:var(--border-accent,#378ADD)}",
    ".bb-note .t{font-size:18px;line-height:1.55}",
    ".bb.bb-bare{border:0;background:transparent;overflow:visible;border-radius:0;padding:2px 6px 24px;--bbg:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")}",
    ".bb-line{display:flex;gap:10px;align-items:center;font-size:18px;line-height:1.55;padding:2px 0}",
    ".bb-orb{width:18px;height:18px;border-radius:50%;flex:none;background:radial-gradient(circle at 32% 28%,#b9f0c9,#2f9e5b 55%,#1c6b3c);box-shadow:0 1px 2px rgba(0,0,0,.35),inset 0 -2px 3px rgba(0,0,0,.25)}",
    ".bb-orb.warn{background:radial-gradient(circle at 32% 28%,#ffe2ad,#e0932a 55%,#9a5f10)}.bb-orb.bad{background:radial-gradient(circle at 32% 28%,#ffc4c0,#d8463f 55%,#8e2420)}",
    ".bb-desk{padding:20px 18px 30px;border-radius:14px;background:linear-gradient(160deg,rgba(120,120,110,.16),rgba(120,120,110,.05))}",
    ".bb[data-bb-theme] .bb-desk{background:var(--bb-desk,none) 0 0/256px,linear-gradient(160deg,rgba(120,120,110,.16),rgba(120,120,110,.05));box-shadow:inset 0 2px 6px rgba(0,0,0,.28),inset 0 0 0 1px rgba(0,0,0,.12)}",
    ".bb[data-bb-theme] .bb-stage{background:linear-gradient(180deg,rgba(27,36,48,.86),rgba(14,20,28,.93)),var(--bb-stage,none) 0 0/256px,#0e141c}",
    ".bb[data-bb-theme] .bb-slip{background:linear-gradient(color-mix(in srgb,var(--surface-1) 80%,transparent),color-mix(in srgb,var(--surface-1) 80%,transparent)),var(--bb-slip,none) 0 0/256px,var(--surface-1)}",
    ".bb-sheet{position:relative;max-width:520px;margin:0 auto;padding:22px 22px 20px;border-radius:3px;background:#fbfaf6;color:#22211e;transform:rotate(-.4deg);box-shadow:0 1px 1px rgba(0,0,0,.16),0 6px 8px -5px rgba(0,0,0,.22),0 18px 16px -14px rgba(0,0,0,.36)}",
    ".bb-sheet:before{content:'';position:absolute;inset:0;border-radius:3px;background:var(--bbg);opacity:.22;mix-blend-mode:multiply;pointer-events:none}",
    ".bb-sheet:after{content:'';position:absolute;inset:0;border-radius:3px;background:linear-gradient(115deg,rgba(255,255,255,.55),rgba(255,255,255,0) 38%,rgba(0,0,0,.05));pointer-events:none}",
    ".bb-sheet p{margin:0 0 10px;position:relative;font-size:18px;line-height:1.6;white-space:pre-line}.bb-sheet p:last-child{margin-bottom:0}",
    ".bb-sheet .to{font-size:16px;color:#6a675f;border-bottom:1px solid #e3e0d6;padding-bottom:8px}",
    ".bb-check{margin:12px 0 0;font-size:16px;color:var(--text-secondary,#5f5e5a);text-align:center}",
    ".bb-cap{font-size:19px;font-weight:600;margin:0 0 10px}",
    ".bb-stage{border-radius:16px;padding:16px;position:relative;overflow:hidden;background:linear-gradient(180deg,#1b2430,#0e141c);color:#eef2f6;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px rgba(255,255,255,.06),0 18px 16px -16px rgba(0,0,0,.5)}",
    ".bb-stage:before{content:'';position:absolute;inset:0;background:radial-gradient(120% 70% at 20% -10%,rgba(140,190,255,.28),transparent 60%),var(--bbg);opacity:.8;mix-blend-mode:soft-light;pointer-events:none}",
    ".bb-stage>*{position:relative}",
    ".bb-bar{display:grid;grid-template-columns:minmax(90px,30%) 1fr auto;gap:10px;align-items:center;margin:8px 0;font-size:16px}",
    ".bb-bar i{display:block;height:12px;border-radius:6px;background:linear-gradient(180deg,#9fd0ff,#3d8fe0 60%,#2a6fb8);box-shadow:0 2px 4px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.5)}",
    ".bb-bar b{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}",
    ".bb-stage ul{margin:0;padding-left:20px}.bb-stage li{font-size:16px;line-height:1.7}",
    ".bb-stage img{display:block;max-width:100%;border-radius:8px;margin:0 auto}",
    ".bb-stage a{color:#9fd0ff}",
    ".bb{--text-primary:var(--color-text-primary,#1c1c1a);--text-secondary:var(--color-text-secondary,#5f5e5a);--border:var(--color-border-tertiary,#d9d7cf);--border-strong:var(--color-border-secondary,#c9c7bd);--border-accent:var(--color-border-info,#378ADD);--bg-accent:var(--color-background-info,#E6F1FB);--bg-ok:var(--color-background-success,#EAF3DE);--text-ok:var(--color-text-success,#27500A);--surface-1:var(--color-background-secondary,#f6f5f1);--surface-2:var(--color-background-primary,#fff)}",
    ".bb-h{font-size:22px;font-weight:600;line-height:1.35;margin:0 0 10px}",
    ".bb-slip{position:relative;border-radius:12px;padding:14px 16px;background:var(--surface-1);border:0.5px solid var(--border);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 14px 14px -14px rgba(0,0,0,.35)}",
    ".bb-slip:before{content:'';position:absolute;inset:0;border-radius:12px;background:var(--bbg);opacity:.18;mix-blend-mode:soft-light;pointer-events:none}",
    ".bb-slip>*{position:relative}",
    ".bb-slip .l{font-size:16px;font-weight:600;color:var(--text-secondary);margin-bottom:6px}",
    ".bb-done{display:flex;gap:10px;align-items:flex-start;font-size:16px;line-height:1.55;padding:4px 0}",
    ".bb-tick{flex:none;width:16px;height:16px;margin-top:4px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#b9f0c9,#2f9e5b 55%,#1c6b3c);box-shadow:0 1px 2px rgba(0,0,0,.3);position:relative}",
    ".bb-tick:after{content:'';position:absolute;left:5px;top:2.5px;width:4px;height:7px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}",
    ".bb-pt{font-size:18px;line-height:1.6;margin:0 0 6px}",
    ".bb-lp{margin:0 0 16px}.bb-lp .k{display:block;font-size:18px;font-weight:600;line-height:1.4;margin:0 0 2px}.bb-lp .t{display:block;font-size:18px;line-height:1.6;color:var(--text-primary)}",
    ".bb-tbl{width:100%;border-collapse:collapse;font-size:16px;margin-top:8px}.bb-tbl th{text-align:left;font-weight:600;color:var(--text-secondary);padding:6px 10px 6px 0}.bb-tbl td{padding:7px 10px 7px 0;border-top:0.5px solid var(--border);vertical-align:top}",
    ".bb-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}",
    ".bb-chip{font-size:16px;padding:5px 12px;border-radius:999px;text-decoration:none;color:var(--text-primary);background:var(--surface-1);border:0.5px solid var(--border-strong);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 3px 3px -2px rgba(0,0,0,.25)}",
    ".bb-ba{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}",
    ".bb-pane{border-radius:12px;padding:12px 14px;border:0.5px solid var(--border);font-size:16px;line-height:1.55;white-space:pre-line;position:relative}",
    ".bb-pane .l{font-size:16px;font-weight:600;letter-spacing:.04em;color:var(--text-secondary);margin-bottom:4px;white-space:normal}",
    ".bb-pane.old{background:transparent;color:var(--text-secondary)}",
    ".bb-pane.new{background:var(--surface-2);border:1.5px solid var(--border-accent);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 16px 14px -14px rgba(0,0,0,.4)}",
    ".bb-pane mark{background:rgba(255,214,90,.55);color:inherit;border-radius:3px;padding:0 2px}",
    "@media (max-width:520px){.bb-ba,.bb-cols{grid-template-columns:1fr}}",
    ".bb-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:start;padding-bottom:16px}",
    ".bb-opt{border-radius:12px;padding:12px 14px;border:0.5px solid var(--border);position:relative}",
    ".bb-opt.pick{background:var(--surface-2);border:1.5px solid var(--border-accent);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 16px 14px -14px rgba(0,0,0,.4)}",
    ".bb-opt .nm{font-size:18px;font-weight:600;margin-bottom:6px}",
    ".bb-opt .tag{display:inline-block;font-size:16px;font-weight:600;letter-spacing:.04em;padding:1px 8px;border-radius:999px;background:var(--border-accent);color:#fff;margin-left:8px;vertical-align:2px}",
    ".bb-opt .r{border-top:0.5px solid var(--border);padding:6px 0;font-size:16px;line-height:1.45}",
    ".bb-opt .r span{display:block;font-size:16px;color:var(--text-secondary)}",
    ".bb-prose p{font-size:18px;line-height:1.7;margin:0 0 12px;max-width:62ch}",
    ".bb-key{font-size:21px;line-height:1.45;font-weight:600;margin:4px 0 16px;padding:2px 0 2px 14px;border-left:3px solid var(--border-accent);max-width:56ch}",
    ".bb-say p{font-size:19px;line-height:1.7;margin:0 0 8px}.bb-say .ask{font-weight:600;margin-top:14px}",
    ".bb-pane.pic{padding:10px}",
    ".bb-pane img{display:block;width:100%;height:auto;border-radius:8px;background:var(--surface-1)}",
    ".bb-pane.old img{opacity:.82}",
    ".bb-pane .cap{font-size:16px;line-height:1.45;margin-top:8px;white-space:normal}",
    ".bb-fade{opacity:0;transform:translateY(6px);transition:opacity .5s ease,transform .5s ease}",
    ".bb-fade.in{opacity:1;transform:none}",
    "@media (prefers-reduced-motion: reduce){.bb-fade{transition:none;opacity:1;transform:none}.bb-dot.live,.bb-ic.ng{animation:none}}",
    "@media (max-width:520px){.bb-title{font-size:24px;max-width:none}.bb-sub{max-width:none}.bb-hero{height:auto}.bb-hero .bb-art{position:relative;width:100%;height:auto;aspect-ratio:3/2}.bb-hero .bb-shade{display:none}.bb-hero .bb-over{position:relative;left:auto;right:auto;top:auto;bottom:auto;padding:14px 18px 16px;gap:12px}.bb-ba,.bb-cols{grid-template-columns:1fr}.bb-ic{width:38px;height:38px}.bb-im{gap:10px}.bb-lh{min-height:84px}.bb img.bb-scene{width:64%}}"
  ].join("");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // A point is "text", "Label: text" or [label, text]. A labelled point puts the label
  // on its own bold line with space between points, so a list of them is scannable.
  function point(t) {
    var k = null, v = t;
    if (Object.prototype.toString.call(t) === "[object Array]") { k = t[0]; v = t[1]; }
    else if (typeof t === "string") { var m = /^([^:.!?\n]{2,48}):\s+([\s\S]+)$/.exec(t); if (m) { k = m[1]; v = m[2].charAt(0).toUpperCase() + m[2].slice(1); } }
    if (!k) return el("p", "bb-pt", v);
    var d = el("div", "bb-lp"); d.appendChild(el("span", "k", k)); d.appendChild(el("span", "t", v)); return d;
  }
  function css() {
    if (document.getElementById("bb-css")) return;
    var s = el("style"); s.id = "bb-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function still() {
    return root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  /* ---- shared parts ---------------------------------------------------------- */
  // A list row written "Label: text" draws the label bold, so a column of rows can be scanned.
  function lead(text) {
    var s = el("span"), m = typeof text === "string" && /^([^:.!?\n]{2,48}):\s+([\s\S]+)$/.exec(text);
    if (!m) { s.textContent = text == null ? "" : text; return s; }
    var b = el("b", null, m[1] + ": "); b.style.fontWeight = "600";
    s.appendChild(b); s.appendChild(document.createTextNode(m[2])); return s;
  }
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
  // A look's picture: a category picture (i1..i4), or its header scene.
  function dragon(cls) {
    var still_ = still(), v = el(still_ ? "img" : "video", cls);
    if (still_) { v.src = BASE + "dragon-poster.jpg"; v.alt = ""; return v; }
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    v.poster = BASE + "dragon-poster.jpg"; v.src = BASE + "dragon-loop.mp4"; return v;
  }
  function pic(name, cls, look) {
    var i = el("img", cls || "bb-ic"); i.src = BASE + "elements/" + (look || LOOK) + "/" + name + ".webp"; i.alt = ""; return i;
  }
  // Put a look's category picture beside a block. With no look the block is returned as it is.
  // An empty name keeps the indent without a picture, so sections line up.
  function beside(name, node) {
    if (!LOOK) return node;
    var w = el("div", "bb-im"), t = el("div", "tx");
    w.appendChild(name ? pic(name, "bb-ic" + (name === "i2" ? " ng" : "")) : el("span", "bb-ic"));
    t.appendChild(node); w.appendChild(t); return w;
  }
  // A look's header: the title and status on the left, the calm scene fading in from the right.
  function lookHead(p, card, look) {
    // A look's hero character belongs in big headers only - the opening, the close and a
    // status - never behind body text. Graffiti's hero is the moving dragon.
    var lk = look || LOOK, gd = KIND === "brief" || KIND === "close" || KIND === "mission", h = el("div", "bb-lh" + (gd ? " gd" : "")), d = el("div");
    h.appendChild(!gd ? pic("scene", "bb-scene hd", look) : lk === "graffiti" ? dragon("bb-gd") : pic("hero", "bb-gd", lk));
    d.appendChild(el("div", "ti", p.title));
    if (p.sub) d.appendChild(el("div", "sb", p.sub));
    if (p.status) {
      var st = el("div", "st"); st.appendChild(el("span", "bb-dot live" + (p.status.tone === "warn" ? " warn" : p.status.tone === "bad" ? " bad" : "")));
      st.appendChild(el("span", null, p.status.text)); d.appendChild(st);
    }
    h.appendChild(d); card.appendChild(h);
  }
  // A titled list of short lines. A line is "text", "Label: text" or [label, text].
  function lines(label, list, into, icon) {
    if (!list || !list.length) return;
    var d = el("div", "bb-sec bb-fade"), ul = el("ul", "bb-ul");
    d.appendChild(el("div", "l", label));
    list.forEach(function (t) {
      var li = el("li");
      if (Object.prototype.toString.call(t) === "[object Array]") { li.appendChild(el("b", null, t[0] + ": ")); li.appendChild(document.createTextNode(t[1])); }
      else li.appendChild(lead(t));
      ul.appendChild(li);
    });
    if (LOOK) { var b = el("div"); b.appendChild(d.firstChild); b.appendChild(ul); d.appendChild(beside(icon || "", b)); }
    else d.appendChild(ul);
    into.appendChild(d);
  }
  // One roadmap-style row: an ID, a plain one-line meaning, and a state on the right.
  // An item is {id, text, state} or [id, text, state]; only "Ready" is tinted.
  function row(it) {
    var a = Object.prototype.toString.call(it) === "[object Array]" ? { id: it[0], text: it[1], state: it[2] } : (it || {});
    var r = el("div", "bb-row");
    if (a.id) r.appendChild(el("span", "id", a.id));
    r.appendChild(el("span", "tx", a.text));
    if (a.state) r.appendChild(el("span", "bb-st" + (/^ready$/i.test(a.state) ? " go" : ""), a.state));
    return r;
  }
  function details(d, into) {
    if (!d || !d.items || !d.items.length) return;
    var box = el("details", "bb-det bb-sec"); box.style.paddingBottom = "0";
    box.appendChild(el("summary", null, d.label || "Details"));
    var ul = el("ul");
    d.items.forEach(function (it) { var li = el("li"); li.appendChild(el("b", null, it[0] + ": ")); li.appendChild(document.createTextNode(it[1])); ul.appendChild(li); });
    box.appendChild(ul); into.appendChild(box);
  }
  // Every question carries three decision aids beside it: ? says more about the question,
  // + gives the reasons to take the recommended choice, - gives its risks. A click or tap
  // opens an aid's text and a second one closes it - the same on a desktop as on a phone,
  // never on hover. They show text only and never send a message, so they are not answer
  // buttons. The marks are drawn as shapes, not typed characters, because a typed ? + or -
  // sits off-centre in its circle by a different amount in every font.
  var MARK = '<svg viewBox="0 0 26 26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  var AIDS = [
    [MARK + '<path d="M10 10.2a3 3 0 1 1 4.6 2.5c-1 .7-1.6 1.2-1.6 2.5"/><path d="M13 18.6v.1"/></svg>', "more", "More about this question"],
    [MARK + '<path d="M13 8v10M8 13h10"/></svg>', "pros", "Reasons to do it"],
    [MARK + '<path d="M8 13h10"/></svg>', "risks", "Risks"]];
  function question(q, into) {
    if (!q) return;
    var box = el("div", "bb-q bb-fade"), head = el("div", "qh"), aids = el("div", "bb-aids"), tips = [], pinned = -1;
    head.appendChild(el("div", "qq", q.q)); head.appendChild(aids); box.appendChild(head);
    function show(i) { tips.forEach(function (t, j) { t.className = "bb-tip" + (j === i ? " on" : ""); aids.children[j].className = "bb-aid" + (j === i ? " on" : ""); aids.children[j].setAttribute("aria-expanded", j === i ? "true" : "false"); }); }
    AIDS.forEach(function (a, i) {
      var b = el("span", "bb-aid"), v = q[a[1]], tip = el("div", "bb-tip");
      b.innerHTML = a[0]; b.tabIndex = 0; b.setAttribute("role", "button"); b.setAttribute("aria-label", a[2]); b.setAttribute("aria-expanded", "false");
      tip.appendChild(el("b", null, a[2]));
      (Object.prototype.toString.call(v) === "[object Array]" ? v : [v || "Not given in this reply."]).forEach(function (line) { tip.appendChild(el("div", null, line)); });
      function flip() { pinned = pinned === i ? -1 : i; show(pinned); }
      b.addEventListener("click", flip);
      b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      aids.appendChild(b); tips.push(tip); box.appendChild(tip);
    });
    var list = (q.choices || []).slice();
    if (!list.length && /^(should|shall|do|does|did|is|are|can|could|will|would|has|have|want)\b/i.test(q.q || "")) list = ["Yes", "No"];
    if (!list.length || !/^(something else|none of these)/i.test(list[list.length - 1])) list.push("Something else. I'll tell you.");
    list.forEach(function (c, i) {
      var row = el("div", "c"); row.appendChild(el("b", null, String.fromCharCode(65 + i))); row.appendChild(el("span", null, c)); box.appendChild(row);
    });
    into.appendChild(box);
  }
  function hero(p, card, report) {
    if (LOOK) return lookHead(p, card);
    // The hero art is a short muted clip of a cartoon dragon painted on a brick wall. With
    // motion turned off, or if the clip cannot load, the same wall shows as a still picture.
    var hero = el("div", "bb-hero"), art = el(still() ? "img" : "video", "bb-art"), alt = "A cartoon dragon in a red bucket hat, painted on a brick wall, nodding to a beat";
    if (still()) { art.src = BASE + "dragon-poster.jpg"; art.alt = alt; report("dragon, still"); }
    else {
      art.muted = true; art.loop = true; art.autoplay = true; art.playsInline = true;
      art.setAttribute("muted", ""); art.setAttribute("playsinline", ""); art.setAttribute("aria-label", alt);
      art.poster = BASE + "dragon-poster.jpg"; art.src = BASE + "dragon-loop.mp4";
      art.addEventListener("playing", function () { report("dragon, moving"); });
      art.addEventListener("error", function () { report("dragon, no clip"); });
    }
    hero.appendChild(art); hero.appendChild(el("div", "bb-shade"));
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
  }
  function reveal(node) {
    var items = node.querySelectorAll(".bb-fade");
    Array.prototype.forEach.call(items, function (n, i) { setTimeout(function () { n.classList.add("in"); }, 120 + i * 90); });
  }

  /* ---- layouts, one per kind of reply ---------------------------------------- */
  var LAYOUTS = {
    mission: function (p, card, report) {
      hero(p, card, report);
      var body = el("div", "bb-body");
      if (p.tiles) body.appendChild(tiles(p.tiles));
      sections(p.sections, body); details(p.details, body); question(p.question, body);
      card.appendChild(body);
    },
    // The session-open brief. What the user steers by comes first: what the last session did,
    // what is new, the two or three items that are next (the rest fold away), and any problem.
    // Dates, sizes and health readouts sit in ONE small panel that opens on a click.
    // A session close: what this session did and what happens next time. Counts are
    // readouts, so they fold away under the line that says whether the save landed.
    close: function (p, card, report) {
      hero(p, card, report);
      var body = el("div", "bb-body");
      lines("What we did", p.did, body, "i1");
      lines("Next time", p.next, body, "i2");
      lines("Left open", p.open, body, "i3");
      if (p.meta && p.meta.line) {
        var box = el("details", "bb-meta bb-fade"), ul = el("ul");
        box.appendChild(el("summary", null, p.meta.line));
        (p.meta.items || []).forEach(function (it) { var li = el("li"); li.appendChild(el("b", null, it[0] + ": ")); li.appendChild(document.createTextNode(it[1])); ul.appendChild(li); });
        box.appendChild(ul);
        if (LOOK) { var ms = el("div", "bb-sec"); ms.appendChild(beside("i4", box)); body.appendChild(ms); }
        else body.appendChild(box);
      }
      question(p.question, body);
      card.appendChild(body);
    },
    brief: function (p, card, report) {
      hero(p, card, report);
      var body = el("div", "bb-body");
      lines("Last time", p.last, body, "i1");
      lines("New", p.fresh, body);
      if (p.next && p.next.length) {
        var d = el("div", "bb-sec bb-fade"), nx = el("div"); nx.appendChild(el("div", "l", "Next up"));
        p.next.forEach(function (it) { nx.appendChild(row(it)); });
        if (p.more && p.more.length) {
          var m = el("details", "bb-det"); m.appendChild(el("summary", null, p.moreLabel || p.more.length + " more open"));
          p.more.forEach(function (it) { m.appendChild(row(it)); }); nx.appendChild(m);
        }
        d.appendChild(beside("i2", nx)); body.appendChild(d);
      }
      lines("Problems", p.problems, body, "i3");
      if (p.meta && p.meta.line) {
        var box = el("details", "bb-meta bb-fade"), ul = el("ul");
        box.appendChild(el("summary", null, p.meta.line));
        (p.meta.items || []).forEach(function (it) { var li = el("li"); li.appendChild(el("b", null, it[0] + ": ")); li.appendChild(document.createTextNode(it[1])); ul.appendChild(li); });
        box.appendChild(ul);
        if (LOOK) { var ms = el("div", "bb-sec"); ms.appendChild(beside("i4", box)); body.appendChild(ms); }
        else body.appendChild(box);
      }
      question(p.question, body);
      card.appendChild(body);
    },
    diagnosis: function (p, card) {
      var body = el("div", "bb-body"); body.style.paddingTop = "16px";
      var head = el("div"); head.style.cssText = "display:flex;justify-content:space-between;gap:12px;align-items:center";
      var ti = el("div", null, p.title); ti.style.cssText = "font-size:22px;font-weight:500"; head.appendChild(ti);
      body.appendChild(beside("i3", head));
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
      var l = el("div", "bb-line"); l.appendChild(LOOK ? pic(p.tone && p.tone !== "ok" ? "i3" : "i1", "bb-ic sm") : el("span", "bb-orb" + (p.tone && p.tone !== "ok" ? " " + p.tone : ""))); l.appendChild(el("span", null, p.text)); card.appendChild(l);
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
      if (p.result) card.appendChild(beside("i1", el("div", "bb-h", p.result)));
      if (p.changed && p.changed.length) {
        var slip = el("div", "bb-slip"); slip.appendChild(el("div", "l", p.label || "What changed"));
        p.changed.forEach(function (c) { var r = el("div", "bb-done"); r.appendChild(el("span", "bb-tick")); r.appendChild(lead(c)); slip.appendChild(r); });
        card.appendChild(slip);
      }
      details(p.details, card); question(p.question, card);
    },
    answer: function (p, card) {
      card.classList.add("bb-bare");
      if (p.answer) card.appendChild(el("div", "bb-h", p.answer));
      (p.points || []).forEach(function (t) { card.appendChild(point(t)); });
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
      if (p.title) card.appendChild(beside("i2", el("div", "bb-h", p.title)));
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
    // The looks on offer, each drawn in its own look, so "show me the themes" shows them.
    themes: function (p, card) {
      card.classList.add("bb-bare");
      card.appendChild(el("div", "bb-h", p.title || "Themes you can switch to"));
      [["default", "Default", "The plain look."], ["graffiti", "Graffiti dragon", "Brick, spray paint and street colour."],
       ["forest", "Primal forest", "Moss, vines and misty trees."], ["mech", "Mech hangar", "Armor plate and hangar lights."],
       ["story", "Storybook", "Soft ink lines and watercolour."]].forEach(function (t) {
        var c = el("div", "bb bb-tsw"), look = t[0] === "default" ? null : t[0], d = { title: t[1], sub: t[2] };
        if ((p.current || "default") === t[0]) d.status = { text: "In use", tone: "ok" };
        if (look) { dress(c, look); lookHead(d, c, look); }
        else { var h = el("div", "bb-lh"), x = el("div"); x.appendChild(el("div", "ti", d.title)); x.appendChild(el("div", "sb", d.sub));
          if (d.status) { var st = el("div", "st"); st.appendChild(el("span", "bb-dot")); st.appendChild(el("span", null, d.status.text)); x.appendChild(st); }
          h.appendChild(x); c.appendChild(h); }
        card.appendChild(c);
      });
      question(p.question, card);
    },
    note: function (p, card) {
      var n = el("div", "bb-note"); n.appendChild(el("div", "m")); n.appendChild(el("div", "t", p.text)); card.appendChild(n);
    }
  };

  // The picker: the kind of exchange decides the form. Claude names the exchange; this table does the rest.
  // "moved" counts how often a user asked for a different shape, so the table can be tuned later.
  var PICK = {
    tiny: "line", did: "receipt", found: "answer", changed: "diff", broke: "diagnosis", choose: "columns",
    status: "mission", show: "stage", draft: "draft", think: "prose", voice: "spoken", told: "receipt",
    open: "brief", close: "close", themes: "themes"
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

  // Put a look on a card: its colours, border and type all come from the stylesheet.
  function dress(card, look) {
    card.setAttribute("data-bb-look", look);
  }
  function render(target, payload) {
    css();
    var host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) return;
    host.textContent = "";
    var card = el("div", "bb");
    var kind = pickForm(payload);
    var state = el("span"); state.className = "sr-only";
    var look = LOOKS.indexOf(payload.theme) >= 0 ? payload.theme : null;
    if (look) dress(card, look);
    LOOK = look; KIND = kind;
    try { LAYOUTS[kind](payload, card, function (what) { host.setAttribute("data-bb-art", what); }); }
    finally { LOOK = null; KIND = null; }
    // Forms with no header of their own get the scene as a faint corner; one-liners get none.
    if (look && ["mission", "brief", "close", "themes", "line", "note"].indexOf(kind) < 0) card.insertBefore(pic("scene", "bb-scene", look), card.firstChild);
    host.appendChild(card);
    if (!look) applyTheme(payload.theme, card);
    if (look) host.setAttribute("data-bb-look", look);
    host.setAttribute("data-bb", VERSION + ":" + kind);
    reveal(card);
  }

  root.BB = { render: render, version: VERSION, kinds: Object.keys(LAYOUTS), pick: PICK, looks: LOOKS, addThemes: addThemes };
})(window);
