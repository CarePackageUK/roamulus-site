import {channelLand, harborDrive} from './day-one-map-data.js';

const departure = [-1.109, 50.811];
const harbor = harborDrive[0];
const campsite = harborDrive.at(-1);
const crossing = [departure, [-1.106, 50.785], [-1.070, 50.755], [-.952, 50.714],
  [-.84, 50.61], [-.63, 50.27], [-.43, 49.88], [-.29, 49.53], [-.24, 49.33], harbor];

// Simplified harbor outline and canal for the close-up. The driving line uses OSM geometry.
const harborLand = [[[-.275, 49.291], [-.261, 49.2915], [-.254, 49.2916], [-.2495, 49.2911],
  [-.2485, 49.2898], [-.2481, 49.2877], [-.2482, 49.284], [-.2494, 49.2802], [-.251, 49.272],
  [-.275, 49.272]], [[-.2468, 49.289], [-.244, 49.2872], [-.2403, 49.287], [-.236, 49.29],
  [-.227, 49.292], [-.227, 49.272], [-.2491, 49.272], [-.2481, 49.2802], [-.2472, 49.284]]];
const harborStreets = [
  [[-.263, 49.2872], [-.256, 49.2879], [-.2512, 49.2881], [-.2495, 49.2884]],
  [[-.263, 49.2844], [-.257, 49.2847], [-.253, 49.2855], [-.2503, 49.2854]],
  [[-.26, 49.2797], [-.256, 49.28], [-.253, 49.281], [-.2505, 49.2833]],
  [[-.2557, 49.2915], [-.2556, 49.288], [-.256, 49.2848], [-.256, 49.28]],
  [[-.2522, 49.2909], [-.2523, 49.288], [-.253, 49.2855], [-.253, 49.281]]
];

function trace(points, progress, paint) {
  const lengths = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * progress;
  let current = points[0];
  paint(current, true);
  for (let i = 0; i < lengths.length && remaining > 0; i++) {
    const ratio = Math.min(1, remaining / lengths[i]);
    const from = points[i];
    const to = points[i + 1];
    current = [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio];
    paint(current, false);
    remaining -= lengths[i];
  }
  return current;
}

export function createDayOneMap(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  function line(points) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  }

  function dot([x, y], radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function label([x, y], text, spot = false, side = 'right') {
    const size = spot ? 13 : 11;
    ctx.font = `${spot ? '600' : '400'} ${size}px ui-monospace, monospace`;
    const textWidth = ctx.measureText(text).width + 18;
    const width = canvas.clientWidth;
    if (side === 'right' && x + textWidth > width && x >= textWidth) side = 'left';
    if (side === 'left' && x < textWidth && x + textWidth <= width) side = 'right';
    ctx.textAlign = side === 'right' ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#11252c';
    const labelX = x + (side === 'right' ? 13 : -13);
    ctx.strokeText(text, labelX, y);
    ctx.fillStyle = spot ? '#f1f1dd' : '#96aba9';
    ctx.fillText(text, labelX, y);
  }

  function scene(width, height, local, progress) {
    const center = local ? [-.2504, 49.2857] : [-.67, 50.055 + .06 * (1 - 2 * progress)];
    const range = local ? .0106 : 2.22 - .15 * progress;
    const scale = height / range;
    const ratio = Math.cos(center[1] * Math.PI / 180);
    const project = ([x, y]) => [width / 2 + (x - center[0]) * scale * ratio, height / 2 - (y - center[1]) * scale];

    const water = ctx.createLinearGradient(0, 0, width, height);
    water.addColorStop(0, '#19333f');
    water.addColorStop(1, '#10242e');
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, width, height);

    for (const area of local ? harborLand : channelLand) {
      line(area.map(project));
      ctx.closePath();
      ctx.fillStyle = '#273e3b';
      ctx.fill();
      ctx.strokeStyle = '#607a70';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.strokeStyle = '#d2e4df12';
    ctx.lineWidth = 1;
    for (let x = width / 2 % 45; x < width; x += 45) { line([[x, 0], [x, height]]); ctx.stroke(); }
    for (let y = height / 2 % 45; y < height; y += 45) { line([[0, y], [width, y]]); ctx.stroke(); }

    if (local) {
      for (const street of harborStreets) {
        line(street.map(project));
        ctx.strokeStyle = '#a3b0a53d';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      label(project([-.2544, 49.2863]), 'OUISTREHAM', false, 'left');
    } else {
      label(project([-.91, 51.01]), 'ENGLAND');
      label(project([-.17, 49.06]), 'NORMANDY');
      label([width * .14, height * .49], 'THE CHANNEL');
    }

    const route = (local ? harborDrive : crossing).map(project);
    line(route);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f0b85968';
    ctx.lineWidth = 2;
    ctx.setLineDash(local ? [] : [3, 7]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    const marker = trace(route, progress, ([x, y], first) => first ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.strokeStyle = '#f0b859';
    ctx.lineWidth = local ? 3 : 2.75;
    ctx.stroke();
    const start = route[0];
    const end = route.at(-1);
    dot(start, 4, '#f5c56b');
    dot(end, 4, '#f5c56b');
    label(start, local ? 'Ferry terminal' : 'Portsmouth', true, 'left');
    label(end, local ? 'First overnight stop' : 'Caen / Ouistreham', true);
    dot(marker, 12, '#f0b85940');
    dot(marker, 6, '#f5c56b');
    dot(marker, 2.5, '#172934');
  }

  return (crossingProgress, roadProgress, closeUp) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const density = Math.min(devicePixelRatio, 1.5);
    const pixelWidth = Math.round(width * density);
    const pixelHeight = Math.round(height * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.setTransform(density, 0, 0, density, 0, 0);
    ctx.globalAlpha = 1;
    if (closeUp < 1) scene(width, height, false, crossingProgress);
    if (closeUp > 0) {
      ctx.globalAlpha = closeUp;
      scene(width, height, true, roadProgress);
      ctx.globalAlpha = 1;
    }
  };
}
