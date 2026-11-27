// Project the photograph onto a mesh using its estimated inverse depth.
const vertexShader = `#version 300 es
in vec3 point;
uniform vec2 fit;
uniform vec2 framing;
uniform vec3 camera;
uniform float overscan;
uniform vec3 bank;
out vec2 uv;

void main() {
  uv = point.xy;
  vec2 screen = vec2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0) * fit * overscan + framing;
  float distance = mix(5.0, 1.18, pow(point.z, 1.45));
  vec3 view = vec3(screen * distance, distance) - camera;
  vec2 level = vec2(view.x * bank.z, view.y);
  vec2 rolled = mat2(bank.x, bank.y, -bank.y, bank.x) * level;
  gl_Position = vec4(rolled.x / bank.z, rolled.y, view.z - 1.0, view.z);
}`;

const fragmentShader = `#version 300 es
precision mediump float;
uniform sampler2D landscape;
in vec2 uv;
out vec4 color;

void main() {
  color = texture(landscape, uv);
}`;

async function createCamera(canvas, source, depthFile, pose) {
  const gl = canvas.getContext('webgl2', {alpha: false, antialias: true});
  if (!gl) return null;

  const photograph = typeof source === 'string' ? new Image() : source;
  if (typeof source === 'string') photograph.src = new URL(source, import.meta.url);
  const depth = new Image();
  depth.src = new URL(depthFile, import.meta.url);
  await Promise.all([depth.decode(), photograph.decode()]);

  const sample = document.createElement('canvas');
  sample.width = depth.naturalWidth;
  sample.height = depth.naturalHeight;
  const context = sample.getContext('2d');
  context.drawImage(depth, 0, 0);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;

  const columns = 300;
  const rows = 168;
  const vertices = [];
  const indices = [];

  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= columns; x++) {
      const u = x / columns;
      const v = y / rows;
      const px = Math.round(u * (sample.width - 1));
      const py = Math.round(v * (sample.height - 1));
      vertices.push(u, v, pixels[(py * sample.width + px) * 4] / 255);

      if (x < columns && y < rows) {
        const a = y * (columns + 1) + x;
        const b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }

  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexShader], [gl.FRAGMENT_SHADER, fragmentShader]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const point = gl.getAttribLocation(program, 'point');
  gl.enableVertexAttribArray(point);
  gl.vertexAttribPointer(point, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photograph);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(.063, .09, .114, 1);

  const fit = gl.getUniformLocation(program, 'fit');
  const framing = gl.getUniformLocation(program, 'framing');
  const camera = gl.getUniformLocation(program, 'camera');
  const bank = gl.getUniformLocation(program, 'bank');
  const overscan = gl.getUniformLocation(program, 'overscan');
  const imageAspect = photograph.naturalWidth / photograph.naturalHeight;

  return (progress, mobile) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const density = Math.min(devicePixelRatio, 1.5, 1920 / width);
    const pixelWidth = Math.round(width * density);
    const pixelHeight = Math.round(height * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    gl.viewport(0, 0, pixelWidth, pixelHeight);

    const aspect = width / height;
    const horizontal = Math.max(1, imageAspect / aspect);
    const vertical = Math.max(1, aspect / imageAspect);
    const view = pose(progress, mobile, horizontal, vertical);
    gl.uniform2f(fit, horizontal, vertical);
    gl.uniform2f(framing, ...view.frame);
    gl.uniform3f(camera, ...view.position);
    const cosine = Math.cos(view.roll);
    const sine = Math.sin(view.roll);
    gl.uniform3f(bank, cosine, sine, aspect);
    const widthAtBank = cosine + Math.abs(sine) / aspect;
    const heightAtBank = cosine + Math.abs(sine) * aspect;
    // Cover the viewport at both ends of the depth range as the camera turns.
    const coverage = [1.18, 5].flatMap(distance => {
      const extent = 1 - view.position[2] / distance;
      return [
        (extent * widthAtBank + Math.abs(view.frame[0] - view.position[0] / distance)) / horizontal,
        (extent * heightAtBank + Math.abs(view.frame[1] - view.position[1] / distance)) / vertical
      ];
    });
    gl.uniform1f(overscan, Math.max(view.overscan, ...coverage));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  };
}

const clamp = value => Math.max(0, Math.min(1, value));
const smoothstep = value => value * value * (3 - 2 * value);

function approach(progress, mobile, horizontal, vertical) {
  const approach = smoothstep(progress);
  const turn = smoothstep(clamp((progress - .26) / .74));
  const swing = Math.sin(Math.PI * turn);
  return {
    frame: [
      -(mobile ? .38 : .32) * (horizontal - 1) + (mobile ? 1.04 : .49) * turn,
      (mobile ? 0 : .08) * (vertical - 1) + .15 * approach
    ],
    position: [.18 * approach - .49 * turn, -.22 * approach, .69 * approach],
    roll: -.039 * swing,
    overscan: 1 + .17 * approach
  };
}

function descend(progress, mobile, horizontal, vertical) {
  const glide = Math.sin(progress * Math.PI / 2);
  const settle = smoothstep(progress);
  return {
    frame: [
      -.08 * (horizontal - 1) + (mobile ? .22 : .28) * (1 - settle) - .10 * Math.sin(Math.PI * settle),
      .18 * (vertical - 1) + .10 * glide
    ],
    position: [.12 - .22 * settle, -.18 * glide, .10 + .48 * glide],
    roll: -.024 * (1 - settle),
    overscan: 1.13 + .14 * glide
  };
}

export async function createHighlandJourney(scene, photograph) {
  const [road, valley] = await Promise.all([
    createCamera(scene.querySelector('.road-camera'), photograph, './assets/scene/highland-depth.png', approach),
    createCamera(scene.querySelector('.valley-camera'), './assets/scene/highland-valley.webp', './assets/scene/highland-valley-depth.png', descend)
  ]);
  if (!road || !valley) return null;

  return (progress, mobile) => {
    // The same transition runs in reverse when the visitor scrolls back uphill.
    const bendStart = .48;
    const bendEnd = .65;
    const transition = clamp((progress - bendStart) / (bendEnd - bendStart));
    const blend = smoothstep(transition);
    if (transition < 1) road(clamp(progress / bendEnd), mobile);
    if (transition > 0) valley(clamp((progress - bendStart) / (1 - bendStart)), mobile);
    scene.style.setProperty('--valley-blend', blend);
    scene.style.setProperty('--valley-mist', .44 * Math.sin(Math.PI * transition) ** 2);
  };
}
