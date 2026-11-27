// Project the photograph onto a mesh using its estimated inverse depth.
const vertexShader = `#version 300 es
in vec3 point;
uniform vec2 fit;
uniform vec2 framing;
uniform vec3 camera;
uniform float overscan;
out vec2 uv;

void main() {
  uv = point.xy;
  vec2 screen = vec2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0) * fit + framing;
  float distance = mix(5.0, 1.18, pow(point.z, 1.45));
  vec3 view = vec3(screen * distance * overscan, distance) - camera;
  gl_Position = vec4(view.xy, view.z - 1.0, view.z);
}`;

const fragmentShader = `#version 300 es
precision mediump float;
uniform sampler2D landscape;
in vec2 uv;
out vec4 color;

void main() {
  color = texture(landscape, uv);
}`;

export async function createHighlandCamera(canvas, photograph) {
  const gl = canvas.getContext('webgl2', {alpha: false, antialias: true});
  if (!gl) return null;

  const depth = new Image();
  depth.src = new URL('./assets/scene/highland-depth.png', import.meta.url);
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
    const move = progress * progress * (3 - 2 * progress);
    // Dip toward the road, then ease the view toward the bend as the van passes.
    gl.uniform2f(fit, horizontal, vertical);
    gl.uniform2f(framing, -(mobile ? .38 : .32) * (horizontal - 1) + (mobile ? .68 : .35) * move,
      (mobile ? 0 : .08) * (vertical - 1) + .09 * move);
    gl.uniform3f(camera, .20 * move + .14 * Math.sin(Math.PI * move), -.16 * move, .51 * move);
    gl.uniform1f(overscan, 1 + .13 * move);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  };
}
