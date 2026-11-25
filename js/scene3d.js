// Hand-written WebGL2 renderer for the game mode (no library).
//
// It draws the test chamber for real: lit and shadowed walls, glossy floor,
// ceiling light strips, the cube, the puzzle pieces and portals you can see
// through. It does not own any game logic: every 3D object is the "skin"
// of a DOM element. Each frame the renderer reads where that element is in
// the CSS 3D world (same perspective, same units: CSS pixels) and draws a
// lit mesh there. The DOM stays the clickable, focusable, accessible layer
// and all puzzle code and animations keep working unchanged.
(function () {
  'use strict';

  var DEPTH = 900;      // room depth, matches --depth in the CSS
  var PERSP = 1000;     // matches `perspective` on .chamber
  var ORIGIN_Y = .42;   // matches `perspective-origin`
  var NEAR = 40, FAR = 6000, FRONT = 320; // FRONT: how far walls continue toward the viewer
  var SHADOW = 1024;

  var canvas, gl, main, shadowFbo, shadowTex;
  var progs = {}, meshes = {}, views = [];
  var current = null, skins = [];
  var dolly = { from: 0, to: 0, start: 0, ms: 1 };
  var dark = window.matchMedia('(prefers-color-scheme: dark)');

  // ---------- shaders ----------
  var VS = '#version 300 es\n' +
    'layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor;\n' +
    'uniform mat4 uVP, uWorld, uPortal, uModel, uLightVP; uniform mat3 uNormal;\n' +
    'out vec3 vWorld, vLocal, vNormal, vLNormal, vPortal; out vec4 vShadow;\n' +
    'void main(){ vec4 w = uModel * vec4(aPos, 1.); vWorld = w.xyz; vLocal = aPos; vLNormal = aNor;\n' +
    '  vNormal = uNormal * aNor; vec4 p = uPortal * w; vPortal = p.xyz; vShadow = uLightVP * w;\n' +
    '  gl_Position = uVP * uWorld * p; }';

  var FS = '#version 300 es\nprecision highp float; precision highp sampler2DShadow;\n' +
    'in vec3 vWorld, vLocal, vNormal, vLNormal, vPortal; in vec4 vShadow;\n' +
    'uniform vec3 uColor, uEmis, uRoom, uEye; uniform float uRough, uAlpha, uTime, uDark;\n' +
    'uniform int uPat, uLightN; uniform vec4 uLightPos[8]; uniform vec3 uLightCol[8];\n' +
    'uniform vec4 uClip; uniform sampler2DShadow uShadowMap; uniform vec2 uViewport;\n' +
    'out vec4 o;\n' +
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
    // the three ceiling light strips, as a function of the position on the ceiling
    'float strip(vec2 xz, float blur){ float s = 0.;\n' +
    '  for (int i = 0; i < 3; i++){ float xc = uRoom.x * (.2 + .3 * float(i)); s += 1. - smoothstep(26., 42. + blur, abs(xz.x - xc)); }\n' +
    '  return s * smoothstep(-uRoom.z + 40., -uRoom.z + 90. + blur, xz.y) * (1. - smoothstep(220., 270. + blur, xz.y)); }\n' +
    'vec3 tiles(vec2 p, float size, out float edge){ vec2 g = p / size; vec2 f = fract(g);\n' +
    '  edge = min(min(f.x, 1. - f.x), min(f.y, 1. - f.y)) * size; return vec3(.82 + hash(floor(g)) * .06); }\n' +
    'vec2 faceUV(){ vec3 a = abs(vLNormal); return a.x > .5 ? vLocal.zy : (a.y > .5 ? vLocal.xz : vLocal.xy); }\n' +
    'void main(){\n' +
    '  if (dot(uClip.xyz, vPortal) + uClip.w > 0.) discard;\n' +
    '  vec3 N = normalize(vNormal); vec3 V = normalize(uEye - vWorld); if (dot(N, V) < 0.) N = -N;\n' +
    '  vec3 alb = uColor; float rough = uRough; vec3 emis = uEmis; float alpha = uAlpha; float edge;\n' +
    '  if (uPat == 1) {\n' +                       // walls: dark metal panels. Dark = no portal can open here.
    '    vec2 p = abs(N.z) > .5 ? vWorld.xy : vWorld.zy; vec3 t = tiles(p, 120., edge);\n' +
    '    alb = vec3(.034, .037, .043) + (t - .82) * .22; alb = mix(vec3(.006), alb, smoothstep(1., 3.5, edge));\n' +
    '    alb += (1. - smoothstep(3.5, 10., edge)) * .015; rough = .38;\n' +
    '  } else if (uPat == 2) {\n' +                // floor: dark glossy tiles with a fine grate
    '    vec2 p = vWorld.xz; tiles(p, 160., edge); float gr = step(.5, fract(p.x / 9.));\n' +
    '    alb = mix(vec3(.02), vec3(.085 + gr * .04), smoothstep(1., 3., edge)); rough = .26;\n' +
    '  } else if (uPat == 3) {\n' +                // ceiling: panels and emissive strips
    '    vec2 p = vWorld.xz; vec3 t = tiles(p, 120., edge); alb = vec3(.045, .048, .055) + (t - .82) * .25; alb = mix(vec3(.006), alb, smoothstep(1., 3.5, edge));\n' +
    '    emis += vec3(.92, .97, 1.) * strip(p, 0.) * 3.2;\n' +
    '  } else if (uPat == 4) {\n' +                // weighted cube face: bumpers, seams, plate, lit lens
    '    vec2 uv = faceUV(); vec2 q = abs(uv); float r = length(uv);\n' +
    '    alb = vec3(.6);\n' +
    '    if (q.x > .19 && q.y > .19) alb = vec3(.13);\n' +
    '    if (q.x < .014 || q.y < .014) alb = vec3(.08);\n' +
    '    if (r < .3) alb = vec3(.17); if (r < .265) alb = vec3(.8);\n' +
    '    if (r < .185) alb = vec3(1., .5, .12); if (r < .13) alb = vec3(.95);\n' +
    '    if (r < .09) { alb = vec3(1., .7, .3); emis += vec3(1., .5, .12) * 2.4; }\n' +
    '    alb *= 1. - smoothstep(.45, .5, max(q.x, q.y)) * .55; rough = .42;\n' +
    '  } else if (uPat == 6) {\n' +                // hard light: striped and shimmering
    '    float s = .55 + .45 * step(.82, fract(vWorld.x / 16.)); emis *= s * (.85 + .15 * sin(uTime * 6. + vWorld.x * .05));\n' +
    '  } else if (uPat == 9) {\n' +                // panel with a darker rim
    '    vec2 uv = faceUV(); float e = min(.5 - abs(uv.x), .5 - abs(uv.y)); alb = mix(alb * .3, alb, smoothstep(0., .05, e));\n' +
    '  }\n' +
    // analytic ambient occlusion toward the room corners
    '  vec4 d1 = vec4(vWorld.y, uRoom.y - vWorld.y, vWorld.x, uRoom.x - vWorld.x); float d5 = vWorld.z + uRoom.z; float dm = 1e5;\n' +
    '  for (int i = 0; i < 4; i++) { if (d1[i] > 2.) dm = min(dm, d1[i]); } if (d5 > 2.) dm = min(dm, d5);\n' +
    '  float ao = .42 + .58 * smoothstep(0., 260., dm);\n' +
    '  float sky = dot(N, vec3(0., -1., 0.)) * .5 + .5;\n' +
    '  vec3 col = alb * mix(vec3(.2, .21, .25), vec3(.42, .43, .46), sky) * ao * mix(1., .75, uDark);\n' +
    '  float spec0 = mix(.9, .03, rough); float shin = mix(220., 8., rough);\n' +
    '  for (int i = 0; i < 8; i++) { if (i >= uLightN) break;\n' +
    '    vec3 L = uLightPos[i].xyz - vWorld; float d = length(L); L /= d; float att = 1. / (1. + pow(d / uLightPos[i].w, 2.)); float sh = 1.;\n' +
    '    if (i == 0) { vec3 pc = vShadow.xyz / vShadow.w * .5 + .5;\n' +
    '      if (pc.x > 0. && pc.x < 1. && pc.y > 0. && pc.y < 1. && pc.z < 1.) { float s = 0.;\n' +
    '        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) s += texture(uShadowMap, vec3(pc.xy + vec2(x, y) * (1.6 / ' + SHADOW + '.), pc.z - .003));\n' +
    '        sh = mix(.12, 1., s / 9.); } }\n' +
    '    float ndl = max(dot(N, L), 0.); vec3 H = normalize(L + V);\n' +
    '    col += (alb * ndl + spec0 * pow(max(dot(N, H), 0.), shin) * ndl) * uLightCol[i] * att * sh * ao;\n' +
    '  }\n' +
    '  if (uPat == 2) {\n' +                       // the glossy floor mirrors the ceiling strips
    '    vec3 R = reflect(-V, N); if (R.y < -.02) { float t = vWorld.y / -R.y; vec3 h = vWorld + R * t;\n' +
    '      float fr = .05 + .7 * pow(1. - max(dot(N, V), 0.), 3.); col += vec3(.9, .95, 1.) * strip(h.xz, t * .05) * fr * 1.5 * mix(1., .6, uDark); } }\n' +
    '  col += emis;\n' +
    '  if (alpha < 1.) { float fr = pow(1. - max(dot(N, V), 0.), 2.); alpha = clamp(alpha + fr * .5, 0., 1.); }\n' +
    '  vec2 sc = gl_FragCoord.xy / uViewport - .5; col *= 1. - dot(sc, sc) * .6;\n' +          // vignette
    '  col = col * (2.51 * col + .03) / (col * (2.43 * col + .59) + .14);\n' +                 // filmic tone mapping
    '  o = vec4(pow(clamp(col, 0., 1.), vec3(1. / 2.2)), alpha);\n' +
    '}';

  // Portal: a ring of fire around a view of the other side.
  var PORTAL_FS = '#version 300 es\nprecision highp float;\n' +
    'in vec3 vLocal, vPortal; uniform vec3 uColor; uniform float uTime; uniform int uHasView;\n' +
    'uniform sampler2D uView; uniform vec2 uViewport; uniform vec4 uClip; out vec4 o;\n' +
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);\n' +
    '  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }\n' +
    'void main(){\n' +
    '  if (dot(uClip.xyz, vPortal) + uClip.w > 0.) discard;\n' +
    '  vec2 uv = vLocal.xy * 2.8; float r = length(uv); vec2 dir = uv / max(r, 1e-4);\n' +   // r = 1 on the portal edge
    '  float n = noise(dir * 8. + vec2(uTime * 1.6, -uTime * 1.1)) * .6 + noise(dir * 17. - vec2(uTime * 2.4, uTime * 1.9)) * .4;\n' +
    '  float rr = r + (n - .5) * .07;\n' +
    '  if (rr > 1.38) discard;\n' +
    '  float core = exp(-pow((rr - .95) / .028, 2.));\n' +            // white-hot line
    '  float flame = exp(-pow((rr - .95) / .09, 2.));\n' +            // coloured flame around it
    '  float halo = exp(-pow(max(rr - .95, 0.) / .17, 2.)) * .5;\n' + // glow on the wall
    '  vec3 col = uColor * (flame * 1.7 + halo) + vec3(1.) * core * 1.1; float alpha = clamp(flame * .9 + halo * .5, 0., 1.);\n' +
    '  if (rr < .95) {\n' +
    '    vec3 inner;\n' +
    '    if (uHasView == 1) { inner = texture(uView, gl_FragCoord.xy / uViewport).rgb; }\n' +
    '    else { float a = r * 5. - uTime * 1.3; vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * dir;\n' +   // closed portal: a slow whirl
    '      inner = uColor * (.05 + .3 * noise(q * 3. + r * 2.)) * (.4 + r); }\n' +
    '    inner = mix(inner, uColor, smoothstep(.55, .95, rr) * .5);\n' +
    '    col = inner + uColor * flame * 1.7 + vec3(1.) * core * 1.1; alpha = 1.;\n' +
    '  }\n' +
    '  o = vec4(col, alpha);\n' +     // premultiplied: the glow adds light, the disc hides the wall
    '}';

  var DEPTH_VS = '#version 300 es\nlayout(location=0) in vec3 aPos; uniform mat4 uLightVP, uModel;\n' +
    'void main(){ gl_Position = uLightVP * uModel * vec4(aPos, 1.); }';
  var DEPTH_FS = '#version 300 es\nprecision highp float; void main(){}';

  function program(vs, fs) {
    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var locs = {};
    return { id: p, u: function (name) { return locs[name] || (locs[name] = gl.getUniformLocation(p, name)); } };
  }

  // ---------- meshes (unit size, centred on the origin) ----------
  function mesh(data) {
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.bindVertexArray(null);
    return { vao: vao, count: data.length / 6 };
  }
  function boxData() {
    var d = [];
    [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (n) {
      // two axes spanning the face
      var u = n[0] ? [0, 1, 0] : [1, 0, 0];
      var v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]].forEach(function (c) {
        for (var k = 0; k < 3; k++) d.push((n[k] + c[0] * u[k] + c[1] * v[k]) / 2);
        d.push(n[0], n[1], n[2]);
      });
    });
    return d;
  }
  function quadData() {
    var d = [];
    [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]].forEach(function (c) { d.push(c[0] / 2, c[1] / 2, 0, 0, 0, 1); });
    return d;
  }
  function cylData() { // axis along z
    var d = [], n = 40;
    for (var i = 0; i < n; i++) {
      var a = i / n * 6.2832, b = (i + 1) / n * 6.2832;
      var ax = Math.cos(a) / 2, ay = Math.sin(a) / 2, bx = Math.cos(b) / 2, by = Math.sin(b) / 2;
      d.push(0, 0, .5, 0, 0, 1, ax, ay, .5, 0, 0, 1, bx, by, .5, 0, 0, 1);
      d.push(0, 0, -.5, 0, 0, -1, bx, by, -.5, 0, 0, -1, ax, ay, -.5, 0, 0, -1);
      d.push(ax, ay, .5, ax * 2, ay * 2, 0, ax, ay, -.5, ax * 2, ay * 2, 0, bx, by, -.5, bx * 2, by * 2, 0);
      d.push(ax, ay, .5, ax * 2, ay * 2, 0, bx, by, -.5, bx * 2, by * 2, 0, bx, by, .5, bx * 2, by * 2, 0);
    }
    return d;
  }

  // ---------- small matrix helpers (Float32Array, column-major) ----------
  var IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0]);
  }
  function lookAt(e, t, up) {
    var z = norm([e[0] - t[0], e[1] - t[1], e[2] - t[2]]), x = norm(cross(up, z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]);
  }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  // cofactor matrix of the upper 3x3 = normal matrix (up to scale); null if the model is flat
  function normalMatrix(f) {
    var a = f[0], b = f[4], c = f[8], d = f[1], e = f[5], g = f[9], h = f[2], i = f[6], j = f[10];
    var c00 = e * j - g * i, c01 = g * h - d * j, c02 = d * i - e * h;
    if (Math.abs(a * c00 + b * c01 + c * c02) < 1e-6) return null;
    return new Float32Array([c00, c * i - b * j, b * g - c * e, c01, a * j - c * h, c * d - a * g, c02, b * h - a * i, a * e - b * d]);
  }

  // CSS perspective as a projection matrix: a point (x, y, z) of the chamber
  // lands on the same pixel as with `perspective: 1000px` in CSS.
  function cssProjection(w, h) {
    var ox = .5, oy = ORIGIN_Y, a = (FAR + NEAR) / (FAR - NEAR), b = -2 * FAR * NEAR / (FAR - NEAR);
    return new Float32Array([
      2 * PERSP / w, 0, 0, 0,
      0, -2 * PERSP / h, 0, 0,
      -(2 * ox - 1), 2 * oy - 1, -a, -1,
      -PERSP, PERSP, a * PERSP + b, PERSP
    ]);
  }

  // ---------- DOM -> world ----------
  // Matrix taking the local box of `el` (px, origin at its top-left corner)
  // to the coordinates of its chamber. The camera rotation that app.js puts
  // on .chamber-inner and .stage is left out: the renderer applies it itself.
  var memo = null;
  function localMatrix(n) {
    if (memo && memo.has(n)) return memo.get(n);
    var x = n.offsetLeft, y = n.offsetTop, p = n.parentElement;
    if (n.offsetParent !== p) { x -= p.offsetLeft; y -= p.offsetTop; }
    var m = new DOMMatrix().translateSelf(x, y, 0);
    if (!n.classList.contains('chamber-inner') && !n.classList.contains('stage')) {
      var cs = getComputedStyle(n);
      if (cs.transform !== 'none') {
        var o = cs.transformOrigin.split(' ').map(parseFloat);
        m.translateSelf(o[0], o[1], o[2] || 0).multiplySelf(new DOMMatrix(cs.transform)).translateSelf(-o[0], -o[1], -(o[2] || 0));
      }
    }
    if (memo) memo.set(n, m);
    return m;
  }
  function chain(el, root) {
    var m = DOMMatrix.fromMatrix(localMatrix(el));
    for (var n = el.parentElement; n && n !== root; n = n.parentElement) m.preMultiplySelf(localMatrix(n));
    return m;
  }

  // ---------- skins: which DOM elements become which objects ----------
  var METAL = [.2, .22, .24], WHITE = [.86, .88, .9], BLUE = [.15, .65, 1], ORANGE = [1, .6, .16];
  var SKINS = [
    ['.surf', surf], ['.tile', tile], ['.pit', pit], ['.glass', glass], ['.dropper', glass],
    ['.floor-button', button], ['.cube3d', cube],
    ['.light-bridge', bridge], ['.bridge-a', bridge], ['.bridge-c', bridge],
    ['.bridge-emitter', emitter], ['.laser-emitter', emitter], ['.laser-catcher', emitter], ['.laser-beam', laser],
    ['.launch-plate', plate], ['.ledge', ledge], ['.exit-door', door], ['.exit-door span', doorPanel],
    ['.portal', portal], ['.observation', windowPane]
  ];

  // box(...) adds a lit box covering the element: w x h in its plane, `t` thick, centred `z` px in front of the plane
  function box(out, base, w, h, t, z, props) {
    var item = { mesh: 'box', m: base.translate(w / 2, h / 2, z).scaleSelf(w, h, t), color: WHITE, rough: .6, emis: [0, 0, 0], pat: 0, alpha: 1, cast: true };
    for (var k in props) item[k] = props[k];
    out.push(item);
    return item;
  }
  function surf(el, base, w, h, out, s) {
    var color = el.getAttribute('data-portal');
    box(out, base, w, h, 4, 2, { pat: 9, cast: false });
    if (color) s.portals.push({ base: base, w: w, h: h, color: color });
  }
  function tile(el, base, w, h, out) {
    var gel = el.getAttribute('data-gel');
    if (gel === 'orange') box(out, base, w, h, 5, 2.5, { color: [1, .42, .02], rough: .12, emis: [.5, .18, 0], cast: false });
    else if (gel === 'blue') box(out, base, w, h, 5, 2.5, { color: [.08, .4, 1], rough: .12, emis: [.03, .16, .55], cast: false });
    else box(out, base, w, h, 4, 2, { pat: 9, color: [.6, .63, .66], cast: false });
  }
  function pit(el, base, w, h, out) { box(out, base, w, h, 2, 1.2, { color: [0, 0, 0], rough: 1, cast: false }); }
  function glass(el, base, w, h, out) {
    var deep = el.classList.contains('dropper') ? w : 6;
    box(out, base, w, h, deep, 0, { color: [.7, .88, 1], rough: .05, alpha: .16, cast: false });
  }
  function button(el, base, w, h, out, s) {
    var pressed = s.cleared;
    out.push({ mesh: 'cyl', m: base.translate(w / 2, h / 2, 5).scaleSelf(w, h, 10), color: METAL, rough: .35, emis: [0, 0, 0], pat: 0, alpha: 1, cast: true });
    out.push({ mesh: 'cyl', m: base.translate(w / 2, h / 2, pressed ? 12 : 19).scaleSelf(w * .7, h * .7, 10),
      color: [.9, .08, .05], rough: .25, emis: pressed ? [1.4, .12, .05] : [.25, .01, 0], pat: 0, alpha: 1, cast: true });
    if (pressed) s.lights.push({ at: base.transformPoint(new DOMPoint(w / 2, h / 2, 40)), color: [1.2, .15, .1], radius: 150 });
  }
  function cube(el, base, w, h, out) {
    if (getComputedStyle(el.parentElement).opacity === '0') return;
    box(out, base, w, w, w, 0, { pat: 4, rough: .42 });
  }
  function bridge(el, base, w, h, out, s) {
    var item = box(out, base, w, h, 3, 2, { color: [.2, .6, 1], emis: [.25, .85, 1.7], pat: 6, alpha: .8, cast: false });
    if (Math.hypot(item.m.m11, item.m.m12, item.m.m13) > 1) s.lights.push({ at: base.transformPoint(new DOMPoint(w / 2, h / 2, 30)), color: [.25, .7, 1.4], radius: 190 });
  }
  function emitter(el, base, w, h, out, s) {
    box(out, base, w, h, w, 0, { color: METAL, rough: .35 });
    var laserish = !el.classList.contains('bridge-emitter');
    var lit = el.classList.contains('laser-emitter') || el.classList.contains('bridge-emitter') || s.cleared || s.aimed;
    var color = laserish ? [1, .12, .08] : [.2, .7, 1];
    var left = el.classList.contains('laser-catcher');
    box(out, base.translate(left ? -5 : w - 5, h / 2 - 7, 0), 10, 14, 14, 0, { color: color, emis: lit ? color.map(function (c) { return c * 3; }) : [.05, 0, 0], cast: false });
  }
  function laser(el, base, w, h, out, s) {
    box(out, base, w, h, h, 0, { color: [1, .1, .05], emis: [4, .35, .2], cast: false });
    s.lights.push({ at: base.transformPoint(new DOMPoint(w * .5, h / 2, 10)), color: [1.3, .12, .06], radius: 130 });
  }
  function plate(el, base, w, h, out) {
    box(out, base, w, h, 8, 4, { color: METAL, rough: .35 });
    box(out, base.translate(w * .15, h * .3, 0), w * .7, h * .4, 3, 9.5, { color: BLUE, emis: [.2, .9, 1.8], cast: false });
  }
  function ledge(el, base, w, h, out) { box(out, base, w, h, 76, -38, { color: METAL, rough: .5, pat: 9 }); }
  function door(el, base, w, h, out, s) {
    var m = { color: METAL, rough: .3 };
    box(out, base.translate(-7, -7, 0), 7, h + 7, 30, -12, m);
    box(out, base.translate(w, -7, 0), 7, h + 7, 30, -12, m);
    box(out, base.translate(-7, -7, 0), w + 14, 7, 30, -12, m);
    box(out, base, w, h, 2, -26, { color: [1, .9, .7], emis: [1.5, 1.25, .85], cast: false }); // lit corridor behind
    if (s.cleared) s.lights.push({ at: base.transformPoint(new DOMPoint(w / 2, h * .6, 30)), color: [1.1, .9, .6], radius: 220 });
  }
  function doorPanel(el, base, w, h, out) { box(out, base, w, h, 6, -4, { pat: 9, color: [.2, .215, .235], rough: .3 }); }
  function portal(el, base, w, h, out, s) {
    // white = a surface that accepts portals: wall portals get their own white panel
    if (el.closest('.wall')) {
      box(out, base.translate(-w * .22, -h * .1, 0), w * 1.44, h * 1.2, 8, 3, { pat: 9, cast: false });
      s.keepOut.push(base.transformPoint(new DOMPoint(w / 2, h / 2, 0)), Math.max(w, h));
    }
    s.portals.push({ base: base, w: w, h: h, color: el.classList.contains('portal-orange') ? 'orange' : 'blue' });
  }
  function windowPane(el, base, w, h, out, s) {
    box(out, base.translate(-8, -8, 0), w + 16, h + 16, 10, 4, { color: METAL, rough: .3, cast: false });
    box(out, base, w, h, 4, 10, { color: [.02, .03, .04], rough: .04, emis: [.01, .015, .02], cast: false });
    s.keepOut.push(base.transformPoint(new DOMPoint(w / 2, h / 2, 0)), Math.max(w, h));
  }

  function collect(section) {
    skins = [];
    SKINS.forEach(function (entry) {
      Array.prototype.forEach.call(section.querySelectorAll(entry[0]), function (el) { skins.push({ el: el, draw: entry[1] }); });
    });
  }

  // ---------- drawing ----------
  function setItem(p, item) {
    var f = item.m.toFloat32Array ? item.m.toFloat32Array() : item.m;
    var n = normalMatrix(f);
    if (!n) return false;
    gl.uniformMatrix4fv(p.u('uModel'), false, f);
    if (p === progs.main) {
      gl.uniformMatrix3fv(p.u('uNormal'), false, n);
      gl.uniform3fv(p.u('uColor'), item.color);
      gl.uniform3fv(p.u('uEmis'), item.emis);
      gl.uniform1f(p.u('uRough'), item.rough);
      gl.uniform1f(p.u('uAlpha'), item.alpha);
      gl.uniform1i(p.u('uPat'), item.pat);
    }
    var m = meshes[item.mesh];
    gl.bindVertexArray(m.vao);
    gl.drawArrays(gl.TRIANGLES, 0, m.count);
    return true;
  }

  // One full view of the scene. `portalMat`/`clip` are set when rendering what a portal shows.
  function drawView(fs, portalMat, clip, eye, withViews, vw, vh, skip) {
    var p = progs.main;
    gl.useProgram(p.id);
    gl.uniformMatrix4fv(p.u('uVP'), false, fs.vp);
    gl.uniformMatrix4fv(p.u('uWorld'), false, fs.world);
    gl.uniformMatrix4fv(p.u('uPortal'), false, portalMat || IDENTITY);
    gl.uniformMatrix4fv(p.u('uLightVP'), false, fs.lightVP);
    gl.uniform4fv(p.u('uClip'), clip || [0, 0, 0, -1]);
    gl.uniform3fv(p.u('uEye'), eye);
    gl.uniform3f(p.u('uRoom'), fs.w, fs.h, DEPTH);
    gl.uniform2f(p.u('uViewport'), vw, vh);
    gl.uniform1f(p.u('uTime'), fs.time);
    gl.uniform1f(p.u('uDark'), dark.matches ? 1 : 0);
    gl.uniform1i(p.u('uLightN'), fs.lightN);
    gl.uniform4fv(p.u('uLightPos[0]'), fs.lightPos);
    gl.uniform3fv(p.u('uLightCol[0]'), fs.lightCol);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.uniform1i(p.u('uShadowMap'), 0);

    gl.disable(gl.BLEND); gl.depthMask(true);
    fs.items.forEach(function (item) { if (item.alpha >= 1) setItem(p, item); });
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    fs.items.forEach(function (item) { if (item.alpha < 1) setItem(p, item); });
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // portals are premultiplied

    // portals last: fire ring, and the other side when both are open
    var q = progs.portal;
    gl.useProgram(q.id);
    gl.uniformMatrix4fv(q.u('uVP'), false, fs.vp);
    gl.uniformMatrix4fv(q.u('uWorld'), false, fs.world);
    gl.uniformMatrix4fv(q.u('uPortal'), false, portalMat || IDENTITY);
    gl.uniform4fv(q.u('uClip'), clip || [0, 0, 0, -1]);
    gl.uniform2f(q.u('uViewport'), vw, vh);
    gl.uniform1f(q.u('uTime'), fs.time);
    gl.bindVertexArray(meshes.quad.vao);
    fs.portals.forEach(function (portal) {
      if (portal === skip) return; // the exit portal would sit right on the lens
      var view = withViews && portal.view;
      gl.uniform1i(q.u('uHasView'), view ? 1 : 0);
      if (view) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, view.tex); gl.uniform1i(q.u('uView'), 1); }
      gl.uniform3fv(q.u('uColor'), portal.color === 'orange' ? ORANGE : BLUE);
      gl.uniformMatrix4fv(q.u('uModel'), false, portal.base.translate(portal.w / 2, portal.h / 2, 9).scaleSelf(portal.w * 1.4, portal.h * 1.4, 1).toFloat32Array());
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
    gl.depthMask(true); gl.disable(gl.BLEND);
  }

  function target(i, w, h) {
    var v = views[i];
    if (!v) {
      v = views[i] = { fbo: gl.createFramebuffer(), tex: gl.createTexture(), depth: gl.createRenderbuffer(), w: 0, h: 0 };
    }
    if (v.w !== w || v.h !== h) {
      v.w = w; v.h = h;
      gl.bindTexture(gl.TEXTURE_2D, v.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindRenderbuffer(gl.RENDERBUFFER, v.depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, v.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, v.tex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, v.depth);
    }
    return v;
  }

  function roomItems(w, h, time, keepOut) {
    var out = [], zc = (FRONT - DEPTH) / 2, len = DEPTH + FRONT;
    function wall(x, y, z, sx, sy, sz, pat) {
      out.push({ mesh: 'box', m: new DOMMatrix().translateSelf(x, y, z).scaleSelf(sx, sy, sz), color: WHITE, rough: .62, emis: [0, 0, 0], pat: pat, alpha: 1, cast: false });
    }
    wall(w / 2, h + 10, zc, w + 40, 20, len, 2);
    wall(w / 2, -10, zc, w + 40, 20, len, 3);
    wall(w / 2, h / 2, -DEPTH - 10, w + 40, h + 40, 20, 1);
    wall(-10, h / 2, zc, 20, h, len, 1);
    wall(w + 10, h / 2, zc, 20, h, len, 1);
    // restless wall: a few panels of the back wall slide out on their own,
    // never where something is mounted (portal panel, observation window)
    [[1, 1], [3, 0], [6, 2], [8, 1], [10, 3], [4, 3], [11, 0]].forEach(function (cell, i) {
      var x = cell[0] * 120 + 60, y = cell[1] * 120 + 60;
      if (x > w - 60 || y > h * .7) return;
      for (var j = 0; j < keepOut.length; j += 2) {
        if (Math.abs(keepOut[j].z + DEPTH) < 40 && Math.hypot(keepOut[j].x - x, keepOut[j].y - y) < keepOut[j + 1] * .75 + 90) return;
      }
      var phase = (time / 1000 / (10 + i * 1.7) + i * .37) % 1;
      var t = Math.min(1, Math.max(0, (phase - .5) / .45));
      var inOut = Math.min(1, t / .3) * Math.min(1, (1 - t) / .3);
      var ext = 80 * inOut * inOut * (3 - 2 * inOut); // eased in and out, no pop
      if (ext < .5) return;
      out.push({ mesh: 'box', m: new DOMMatrix().translateSelf(x, y, -DEPTH + ext / 2).scaleSelf(117, 117, ext),
        color: [.04, .043, .05], rough: .38, emis: [0, 0, 0], pat: 9, alpha: 1, cast: true });
    });
    return out;
  }

  // Draw one frame for `section`; yaw/pitch (degrees) are the same camera angles app.js gives the DOM.
  function frame(section, yaw, pitch, time) {
    if (!gl || gl.isContextLost()) return;
    var visible = !section.classList.contains('space');
    canvas.style.visibility = visible ? '' : 'hidden';
    if (!visible) return;
    if (section !== current) { current = section; collect(section); }

    var w = main.clientWidth, h = main.clientHeight;
    var ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    var pw = Math.round(w * ratio), ph = Math.round(h * ratio);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }

    // camera: the whole world turns around a pivot in the middle of the room, and can dolly in/out
    var k = Math.min(1, (time - dolly.start) / dolly.ms), ease = 1 - Math.pow(1 - k, 3);
    var dz = dolly.from + (dolly.to - dolly.from) * ease;
    var world = new DOMMatrix().translateSelf(0, 0, dz).translateSelf(w / 2, h / 2, -DEPTH / 2)
      .rotateAxisAngleSelf(0, 1, 0, yaw).rotateAxisAngleSelf(1, 0, 0, pitch).translateSelf(-w / 2, -h / 2, DEPTH / 2);
    var inverse = world.inverse();
    var e = inverse.transformPoint(new DOMPoint(w * .5, h * ORIGIN_Y, PERSP));

    var s = { portals: [], lights: [], keepOut: [], cleared: false, aimed: false };
    var items = [];
    memo = new Map();
    skins.forEach(function (skin) {
      var el = skin.el;
      if (!el.offsetParent || !el.offsetWidth) return;
      var scene = el.closest('.level-scene');
      s.cleared = !!scene && scene.classList.contains('is-cleared');
      s.aimed = !!scene && scene.classList.contains('is-aimed');
      skin.draw(el, chain(el, section), el.offsetWidth, el.offsetHeight, items, s);
    });
    memo = null;
    items = items.concat(roomItems(w, h, time, s.keepOut));

    // lights: ceiling strips (the first one casts shadows), then portals and glowing pieces
    var dim = dark.matches ? .8 : 1;
    var lights = [
      { at: { x: w * .34, y: 40, z: -120 }, color: [2.6 * dim, 2.65 * dim, 2.7 * dim], radius: 900 },
      { at: { x: w * .2, y: 80, z: -660 }, color: [1.5 * dim, 1.52 * dim, 1.56 * dim], radius: 700 },
      { at: { x: w * .8, y: 80, z: -660 }, color: [1.5 * dim, 1.52 * dim, 1.56 * dim], radius: 700 },
      { at: { x: w / 2, y: 90, z: 120 }, color: [1.2 * dim, 1.22 * dim, 1.25 * dim], radius: 760 }
    ];
    s.portals.forEach(function (portal) {
      var c = portal.color === 'orange' ? ORANGE : BLUE;
      lights.push({ at: portal.base.transformPoint(new DOMPoint(portal.w / 2, portal.h / 2, 45)), color: [c[0] * 3.4, c[1] * 3.4, c[2] * 3.4], radius: 260 });
    });
    lights = lights.concat(s.lights).slice(0, 8);
    var lightPos = new Float32Array(32), lightCol = new Float32Array(24);
    lights.forEach(function (light, i) {
      lightPos.set([light.at.x, light.at.y, light.at.z, light.radius], i * 4);
      lightCol.set(light.color, i * 3);
    });
    // the key light hangs off-centre so that objects throw a visible shadow on the floor
    var lightVP = mul(perspective(2.1, 1.7, 30, h + 700), lookAt([w * .34, 14, -120], [w * .56, h, -430], [0, 0, -1]));

    var fs = {
      w: w, h: h, time: time / 1000, items: items, portals: s.portals, vp: cssProjection(w, h), world: world.toFloat32Array(),
      lightVP: lightVP, lightN: lights.length, lightPos: lightPos, lightCol: lightCol
    };

    // 1. shadow map
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
    gl.viewport(0, 0, SHADOW, SHADOW);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(progs.depth.id);
    gl.uniformMatrix4fv(progs.depth.u('uLightVP'), false, lightVP);
    items.forEach(function (item) { if (item.cast && item.alpha >= 1) setItem(progs.depth, item); });

    // 2. what each portal shows: the scene again, moved so that the other
    //    portal sits exactly on this one, cut at the portal's plane
    var blue = s.portals.filter(function (p) { return p.color === 'blue'; })[0];
    var orange = s.portals.filter(function (p) { return p.color === 'orange'; })[0];
    s.portals.forEach(function (p) { p.view = null; });
    if (blue && orange) {
      [[blue, orange], [orange, blue]].forEach(function (pair, i) {
        var from = pair[0].base.translate(pair[0].w / 2, pair[0].h / 2, 0);
        var to = pair[1].base.translate(pair[1].w / 2, pair[1].h / 2, 0);
        var move = from.rotateAxisAngle(0, 1, 0, 180).multiplySelf(to.inverse());
        var o = from.transformPoint(new DOMPoint(0, 0, 0)), z = from.transformPoint(new DOMPoint(0, 0, 1));
        var n = norm([z.x - o.x, z.y - o.y, z.z - o.z]);
        var virtualEye = move.inverse().transformPoint(e);
        var v = target(i, Math.round(pw / 2), Math.round(ph / 2));
        gl.bindFramebuffer(gl.FRAMEBUFFER, v.fbo);
        gl.viewport(0, 0, v.w, v.h);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawView(fs, move.toFloat32Array(), [n[0], n[1], n[2], -(n[0] * o.x + n[1] * o.y + n[2] * o.z) + 14],
          [virtualEye.x, virtualEye.y, virtualEye.z], false, v.w, v.h, pair[1]);
        pair[0].view = v;
      });
    }

    // 3. the picture
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, pw, ph);
    gl.clearColor(.02, .025, .03, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawView(fs, null, null, [e.x, e.y, e.z], true, pw, ph);
  }

  // ---------- public API ----------
  window.CV3D = {
    // Returns true when WebGL2 is available and the canvas is in place.
    init: function (mainEl) {
      main = mainEl;
      canvas = document.createElement('canvas');
      canvas.className = 'gl-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      try {
        gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
        if (!gl) return false;
        progs.main = program(VS, FS);
        progs.portal = program(VS, PORTAL_FS);
        progs.depth = program(DEPTH_VS, DEPTH_FS);
        meshes.box = mesh(boxData());
        meshes.quad = mesh(quadData());
        meshes.cyl = mesh(cylData());
        shadowTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, shadowTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW, SHADOW, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        shadowFbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
      } catch (error) {
        if (window.console) console.error('WebGL scene disabled:', error.message);
        gl = null;
        return false;
      }
      canvas.addEventListener('webglcontextlost', function (event) {
        event.preventDefault();
        document.documentElement.classList.remove('gl'); // back to the CSS 3D room
      });
      main.insertBefore(canvas, main.firstChild);
      return true;
    },
    frame: frame,
    // Camera travel on level change: fly into the room, then arrive from the depth.
    travel: function (from, to, ms) { dolly = { from: from, to: to, start: performance.now(), ms: ms }; }
  };
})();
