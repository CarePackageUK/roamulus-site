const NS = "http://www.w3.org/2000/svg";
const mk = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const rng = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const mix = (a, b, t) => { const A = a.match(/\w\w/g).map(h => parseInt(h, 16)), B = b.match(/\w\w/g).map(h => parseInt(h, 16));
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const f = n => n.toFixed(1);

function pine(x, base, h, w, r) {
  const t = 5 + Math.floor(r() * 3), L = [], R = [];
  for (let i = 1; i <= t; i++) {
    const yy = base - h + h * (i / t) * 0.88;
    const ww = w * (0.28 + 0.72 * i / t) / 2 * (0.85 + r() * 0.3);
    const yIn = yy - h / t * 0.38;
    L.push(`${f(x - ww * 0.4)},${f(yIn)}`, `${f(x - ww)},${f(yy)}`);
    R.unshift(`${f(x + ww)},${f(yy)}`, `${f(x + ww * 0.4)},${f(yIn)}`);
  }
  const tw = Math.max(0.8, w * 0.05), ty = base - h * 0.12;
  return `M${f(x)},${f(base - h)} L${L.join(" L")} L${f(x - tw)},${f(ty)} L${f(x - tw)},${f(base)} L${f(x + tw)},${f(base)} L${f(x + tw)},${f(ty)} L${R.join(" L")} Z`;
}

function treeLayer(g, r, o) {
  let x = -40, d = "";
  while (x < o.W + 40) {
    const h = o.hMin + r() * (o.hMax - o.hMin), w = h * (0.3 + r() * 0.12);
    const inClear = o.clear && x > o.clear[0] && x < o.clear[1];
    if (!inClear && r() > o.skip) d += pine(x, o.y + r() * o.jit, h, w, r);
    x += w * o.dens * (0.45 + r() * 0.7);
  }
  mk("path", { d, fill: o.color }, g);
}

let SID = 0;
function scene(svg, o) {
  const W = o.w, H = o.h, r = rng(o.seed || 11), id = "sc" + (SID++), bl = o.blur || 6;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  const defs = mk("defs", {}, svg);
  const grad = (tag, gid, attrs, stops) => { const gr = mk(tag, Object.assign({ id: id + gid }, attrs), defs);
    stops.forEach(([of, c, op]) => mk("stop", { offset: of, "stop-color": c, "stop-opacity": op ?? 1 }, gr)); };
  grad("linearGradient", "sky", { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, "#5b878e"], [0.5, "#41707a"], [1, "#24474e"]]);
  grad("linearGradient", "fog", { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, "#d3e6e6", 0], [1, "#d3e6e6", 0.3]]);
  grad("linearGradient", "sun", { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, "#eaa383", 0], [0.62, "#eaa383", 0.6], [1, "#eaa383", 0]]);
  grad("radialGradient", "warm", {}, [[0, "#ffb257", 0.8], [1, "#ff8a2a", 0]]);
  grad("linearGradient", "win", { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, "#ffe4a6"], [1, "#f39233"]]);
  grad("linearGradient", "ground", { x1: 0, y1: 0, x2: 0, y2: 1 }, [[0, "#13282d"], [1, "#2a2a22"]]);
  const filt = (fid, sd) => { const fl = mk("filter", { id: id + fid, x: "-60%", y: "-60%", width: "220%", height: "220%" }, defs); mk("feGaussianBlur", { stdDeviation: sd }, fl); };
  filt("b", bl); filt("b2", bl * 3.5);

  mk("rect", { width: W, height: H, fill: `url(#${id}sky)` }, svg);
  if (o.sunset) mk("rect", { x: 0, y: H * (o.horizon - 0.2), width: W, height: H * 0.28, fill: `url(#${id}sun)` }, svg);

  const L = o.layers || 4, span = o.span || 0.32, ts = (o.treeScale || 1) * H;
  let yNear = H;
  for (let i = 0; i < L; i++) {
    const t = L === 1 ? 1 : i / (L - 1);
    const y = H * (o.horizon + 0.03 + t * span);
    const hMax = ts * (0.1 + 0.2 * t);
    const col = mix("#6f989e", "#0f252a", t);
    const g = mk("g", {}, svg);
    if (i === L - 1) { mk("rect", { x: 0, y: y - 1, width: W, height: H - y + 1, fill: `url(#${id}ground)` }, g); yNear = y; }
    else mk("rect", { x: 0, y: y - 1, width: W, height: H - y + 1, fill: col }, g);
    treeLayer(g, r, { W, y, hMin: hMax * 0.45, hMax, jit: hMax * 0.06, color: col, dens: (o.dens || 1), skip: o.skip ?? 0.12, clear: i >= L - 2 ? o.clear : null });
    if (i < L - 1) mk("rect", { x: 0, y: H * o.horizon - ts * 0.25, width: W, height: H, fill: `url(#${id}fog)` }, svg);
    mk("ellipse", { cx: W * (0.2 + r() * 0.6), cy: y - hMax * 0.1, rx: W * 0.65, ry: Math.max(hMax * 0.2, 6), fill: "#d6e6e6", opacity: 0.08 + 0.08 * (1 - t), filter: `url(#${id}b2)` }, svg);
  }

  // grass flecks
  let gd = "";
  for (let k = 0; k < (o.grass || 220); k++) {
    const x = r() * W, y = yNear + r() * (H - yNear), len = (1.5 + r() * 4) * (H / 400) * (0.5 + (y - yNear) / (H - yNear + 1));
    gd += `M${f(x)},${f(y)} l${f((r() - 0.5) * len * 0.6)},${f(-len)} `;
  }
  mk("path", { d: gd, stroke: "#b88a52", "stroke-width": Math.max(0.6, H / 900), opacity: 0.35, fill: "none" }, svg);

  if (o.road) {
    const yN = yNear;
    mk("path", { d: `M${f(W * 0.12)},${H} C${f(W * 0.42)},${f(H * 0.93)} ${f(W * 0.6)},${f(yN + (H - yN) * 0.35)} ${f(W * 0.55)},${f(yN)} L${f(W * 0.58)},${f(yN)} C${f(W * 0.68)},${f(yN + (H - yN) * 0.38)} ${f(W * 0.66)},${f(H * 0.93)} ${f(W * 0.6)},${H} Z`, fill: "#33464a", opacity: 0.95 }, svg);
    mk("path", { d: `M${f(W * 0.36)},${H} C${f(W * 0.54)},${f(H * 0.93)} ${f(W * 0.64)},${f(yN + (H - yN) * 0.36)} ${f(W * 0.565)},${f(yN)}`, fill: "none", stroke: "#F0B859", "stroke-width": 2, "stroke-dasharray": "8 9", opacity: 0.4 }, svg);
  }
  if (o.van) van(svg, id, o.van.x, o.van.y, o.van.s);
  // low ground mist in front
  mk("ellipse", { cx: W * 0.5, cy: H * 0.97, rx: W * 0.7, ry: H * 0.07, fill: "#cfe1e1", opacity: 0.1, filter: `url(#${id}b2)` }, svg);
}

function van(svg, id, x, y, s) {
  const g = mk("g", {}, svg);
  const P = (a, b) => `${f(x + a * s)},${f(y + b * s)}`;
  mk("ellipse", { cx: x - 30 * s, cy: y - 46 * s, rx: 200 * s, ry: 120 * s, fill: `url(#${id}warm)`, opacity: 0.55 }, g);
  mk("ellipse", { cx: x - 10 * s, cy: y + 4 * s, rx: 170 * s, ry: 18 * s, fill: "#ff9a3c", opacity: 0.3, filter: `url(#${id}b)` }, g);
  // fairy lights
  let lp = `M${P(-98, -86)}`;
  for (let k = 1; k <= 8; k++) { const t = k / 8; lp += ` L${P(-98 - t * 120, -86 + Math.sin(t * Math.PI) * 16 + t * 34)}`; }
  mk("path", { d: lp, stroke: "#0d1b1e", "stroke-width": 0.8 * s, fill: "none", opacity: 0.6 }, g);
  for (let k = 1; k <= 7; k++) { const t = k / 8, lx = x + (-98 - t * 120) * s, ly = y + (-86 + Math.sin(t * Math.PI) * 16 + t * 34) * s;
    mk("circle", { cx: lx, cy: ly, r: 5 * s, fill: "#ffc56b", opacity: 0.75, filter: `url(#${id}b)` }, g);
    mk("circle", { cx: lx, cy: ly, r: 1.7 * s, fill: "#fff0c6" }, g); }
  // body
  mk("path", { d: `M${P(-100, -16)} L${P(-100, -80)} Q${P(-100, -90)} ${P(-90, -90)} L${P(46, -90)} Q${P(56, -90)} ${P(62, -83)} L${P(90, -53)} Q${P(100, -48)} ${P(100, -38)} L${P(100, -16)} Z`,
    fill: "#1a2d31", stroke: "#5a7d83", "stroke-width": 1.2 * s, "stroke-opacity": 0.45 }, g);
  mk("path", { d: `M${P(-95, -88)} L${P(46, -88)}`, stroke: "#8fb0b4", "stroke-width": 1.4 * s, opacity: 0.35 }, g);
  mk("path", { d: `M${P(-80, -95)} L${P(30, -95)}`, stroke: "#22383c", "stroke-width": 3 * s, "stroke-linecap": "round" }, g);
  const wins = [[-88, -76, 34, 24], [-46, -76, 50, 24], [14, -78, 30, 60]];
  wins.forEach(([a, b, w, h]) => mk("rect", { x: x + a * s, y: y + b * s, width: w * s, height: h * s, rx: 4 * s, fill: "#ffb04d", opacity: 0.9, filter: `url(#${id}b)` }, g));
  wins.forEach(([a, b, w, h]) => mk("rect", { x: x + a * s, y: y + b * s, width: w * s, height: h * s, rx: 4 * s, fill: `url(#${id}win)` }, g));
  mk("path", { d: `M${P(14, -18)} L${P(44, -18)} L${P(72, 8)} L${P(-8, 8)} Z`, fill: "#ffb04d", opacity: 0.4, filter: `url(#${id}b)` }, g);
  mk("path", { d: `M${P(53, -84)} L${P(84, -53)} L${P(53, -53)} Z`, fill: "#c97a3c", opacity: 0.5 }, g);
  mk("path", { d: `M${P(-100, -40)} L${P(14, -40)} M${P(44, -40)} L${P(100, -40)}`, stroke: "#0f1d20", "stroke-width": 2 * s, opacity: 0.6 }, g);
  [-62, 66].forEach(a => { mk("circle", { cx: x + a * s, cy: y - 14 * s, r: 16 * s, fill: "#0b1416" }, g); mk("circle", { cx: x + a * s, cy: y - 14 * s, r: 7 * s, fill: "#34494d" }, g); });
  // lantern
  mk("circle", { cx: x - 150 * s, cy: y - 6 * s, r: 14 * s, fill: "#ffb04d", opacity: 0.6, filter: `url(#${id}b)` }, g);
  mk("rect", { x: x - 153 * s, y: y - 14 * s, width: 6 * s, height: 10 * s, rx: 1.5 * s, fill: "#ffd690" }, g);
}

