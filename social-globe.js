(function () {
  'use strict';

  function boot() {
    if (typeof THREE === 'undefined') {
      console.warn('[social-globe] waiting for THREE…');
      setTimeout(boot, 50);
      return;
    }
    init();
  }

  function init() {
    if (window.__socialGlobeDispose) {
      try { window.__socialGlobeDispose(); } catch (e) {}
    }

    var canvas = document.getElementById('social-globe-canvas');
    if (!canvas) {
      console.warn('[social-globe] canvas missing');
      return;
    }

    var ICONS = [
      { src: 'svg/VK.svg', href: 'https://vk.com/laditeo', label: 'VK' },
      { src: 'svg/T.svg', href: 'https://t.me/laditeo', label: 'Telegram' },
      { src: 'svg/twitter.svg', href: '#', label: 'Twitter' },
      { src: 'svg/b.svg', href: 'https://bsky.app/profile/laditeo.art', label: 'Bluesky' },
      { src: 'svg/a.svg', href: 'https://artstation.com/laditeo', label: 'ArtStation' },
      { src: 'svg/bc.svg', href: 'https://laditeo.bandcamp.com', label: 'Bandcamp' },
      { src: 'svg/You.svg', href: 'https://www.youtube.com/@0737asmr', label: 'YouTube' },
      { src: 'svg/reddit.svg', href: '#', label: 'Reddit' },
      { src: 'svg/P.svg', href: '#', label: 'Pinterest' },
      { src: 'svg/instagram.svg', href: '#', label: 'Instagram' },
      { src: 'svg/soundcloud.svg', href: '#', label: 'SoundCloud' },
      { src: 'svg/objkt.svg', href: '#', label: 'objkt' },
      { src: 'svg/500px.svg', href: '#', label: '500px' },
      { src: 'svg/vgen.svg', href: 'https://vgen.co/laditeo', label: 'VGen' },
      { src: 'svg/pixiv.svg', href: '#', label: 'pixiv' },
      { src: 'svg/furaffinity.svg', href: 'https://www.furaffinity.net/user/laditeo', label: 'FurAffinity' },
      { src: 'svg/e621.svg', href: 'https://e621.net/users/laditeo', label: 'e621' }
    ];
    var cloud = ICONS.concat(ICONS);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 7.8);

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: true
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var group = new THREE.Group();
    group.rotation.x = 0.22;
    scene.add(group);

    var RADIUS = 1.65;
    var BASE = 0.68;
    var sprites = [];

    function fibonacciPoints(count, radius) {
      var pts = [];
      var golden = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < count; i++) {
        var y = 1 - (i / Math.max(count - 1, 1)) * 2;
        var r = Math.sqrt(Math.max(0, 1 - y * y));
        var theta = golden * i + 0.35;
        pts.push(new THREE.Vector3(
          Math.cos(theta) * r * radius,
          y * radius,
          Math.sin(theta) * r * radius
        ));
      }
      return pts;
    }

    var points = fibonacciPoints(cloud.length, RADIUS);

    function loadTexture(url) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.decoding = 'async';
        img.onload = function () {
          var size = 128;
          var c = document.createElement('canvas');
          c.width = size;
          c.height = size;
          var ctx = c.getContext('2d');
          ctx.clearRect(0, 0, size, size);
          var scale = Math.min(size / img.width, size / img.height) * 0.86;
          var w = img.width * scale;
          var h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          var tex = new THREE.CanvasTexture(c);
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.needsUpdate = true;
          resolve(tex);
        };
        img.onerror = reject;
        img.src = url;
      });
    }

    function placeholderTexture(label) {
      var size = 128;
      var c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#1a5167';
      ctx.beginPath();
      ctx.arc(64, 64, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((label || '?').slice(0, 2), 64, 66);
      var tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    // Parametric volume fog from center (raymarched sphere) + Perlin turbulence
    // Turbulence is in globe/group local space so the fog pattern follows icon rotation
    var fogFall = 2.47;
    var fogAlpha = 1;
    var fogDith = 1; // 0 = smooth post, N = chunky Bayer levels on final render
    var fogGrain = 6; // Bayer cell size in CSS px (pinch changes density via iconScale)
    var fogNoiseAmp = 0.35;
    var fogNoiseScale = 1.35;
    var fogNoiseSpeed = 0.18;

    var fogUniforms = {
      uCamPos: { value: new THREE.Vector3() },
      uCenter: { value: new THREE.Vector3(0, 0, 0) },
      uRadius: { value: RADIUS * 1.05 },
      uFall: { value: fogFall },
      uAlpha: { value: fogAlpha },
      uTime: { value: 0 },
      uNoiseAmp: { value: fogNoiseAmp },
      uNoiseScale: { value: fogNoiseScale },
      uNoiseSpeed: { value: fogNoiseSpeed },
      uGroupInv: { value: new THREE.Matrix3() } // world → globe-local (rotation only)
    };
    var fogRot4 = new THREE.Matrix4();
    var fogRot3 = new THREE.Matrix3();

    var fogVert = [
      'varying vec3 vWorldPos;',
      'void main() {',
      '  vec4 wp = modelMatrix * vec4(position, 1.0);',
      '  vWorldPos = wp.xyz;',
      '  gl_Position = projectionMatrix * viewMatrix * wp;',
      '}'
    ].join('\n');

    // Classic 3D value/perlin-ish noise (iq-style hash + gradient)
    var fogFrag = [
      'precision highp float;',
      'uniform vec3 uCamPos;',
      'uniform vec3 uCenter;',
      'uniform float uRadius;',
      'uniform float uFall;',
      'uniform float uAlpha;',
      'uniform float uTime;',
      'uniform float uNoiseAmp;',
      'uniform float uNoiseScale;',
      'uniform float uNoiseSpeed;',
      'uniform mat3 uGroupInv;',
      'varying vec3 vWorldPos;',
      '',
      'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
      'vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
      'vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }',
      'vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }',
      '',
      'float snoise(vec3 v) {',
      '  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);',
      '  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);',
      '  vec3 i = floor(v + dot(v, C.yyy));',
      '  vec3 x0 = v - i + dot(i, C.xxx);',
      '  vec3 g = step(x0.yzx, x0.xyz);',
      '  vec3 l = 1.0 - g;',
      '  vec3 i1 = min(g.xyz, l.zxy);',
      '  vec3 i2 = max(g.xyz, l.zxy);',
      '  vec3 x1 = x0 - i1 + C.xxx;',
      '  vec3 x2 = x0 - i2 + C.yyy;',
      '  vec3 x3 = x0 - D.yyy;',
      '  i = mod289(i);',
      '  vec4 p = permute(permute(permute(',
      '    i.z + vec4(0.0, i1.z, i2.z, 1.0))',
      '    + i.y + vec4(0.0, i1.y, i2.y, 1.0))',
      '    + i.x + vec4(0.0, i1.x, i2.x, 1.0));',
      '  float n_ = 0.142857142857;',
      '  vec3 ns = n_ * D.wyz - D.xzx;',
      '  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);',
      '  vec4 x_ = floor(j * ns.z);',
      '  vec4 y_ = floor(j - 7.0 * x_);',
      '  vec4 x = x_ * ns.x + ns.yyyy;',
      '  vec4 y = y_ * ns.x + ns.yyyy;',
      '  vec4 h = 1.0 - abs(x) - abs(y);',
      '  vec4 b0 = vec4(x.xy, y.xy);',
      '  vec4 b1 = vec4(x.zw, y.zw);',
      '  vec4 s0 = floor(b0) * 2.0 + 1.0;',
      '  vec4 s1 = floor(b1) * 2.0 + 1.0;',
      '  vec4 sh = -step(h, vec4(0.0));',
      '  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;',
      '  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;',
      '  vec3 p0 = vec3(a0.xy, h.x);',
      '  vec3 p1 = vec3(a0.zw, h.y);',
      '  vec3 p2 = vec3(a1.xy, h.z);',
      '  vec3 p3 = vec3(a1.zw, h.w);',
      '  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));',
      '  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;',
      '  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);',
      '  m = m * m;',
      '  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));',
      '}',
      '',
      'float fbm(vec3 p) {',
      '  float f = 0.0;',
      '  float a = 0.5;',
      '  for (int i = 0; i < 4; i++) {',
      '    f += a * snoise(p);',
      '    p = p * 2.02 + 17.0;',
      '    a *= 0.5;',
      '  }',
      '  return f;',
      '}',
      '',
      'bool intersectSphere(vec3 ro, vec3 rd, vec3 c, float r, out float t0, out float t1) {',
      '  vec3 oc = ro - c;',
      '  float b = dot(oc, rd);',
      '  float ct = dot(oc, oc) - r * r;',
      '  float h = b * b - ct;',
      '  if (h < 0.0) return false;',
      '  h = sqrt(h);',
      '  t0 = -b - h;',
      '  t1 = -b + h;',
      '  return t1 > 0.0;',
      '}',
      '',
      'float hash21(vec2 p) {',
      '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);',
      '}',
      '',
      'void main() {',
      '  vec3 ro = uCamPos;',
      '  vec3 rd = normalize(vWorldPos - uCamPos);',
      '  float t0, t1;',
      '  if (!intersectSphere(ro, rd, uCenter, uRadius, t0, t1)) discard;',
      '  t0 = max(t0, 0.0);',
      '  const int STEPS = 28;',
      '  float dt = (t1 - t0) / float(STEPS);',
      '  // Per-pixel jitter breaks concentric raymarch shells (ellipse rings)',
      '  float jitter = hash21(gl_FragCoord.xy);',
      '  float acc = 0.0;',
      '  float fall = max(uFall, 0.15);',
      '  float ang = uTime * uNoiseSpeed;',
      '  float ca = cos(ang); float sa = sin(ang);',
      '  float ang2 = ang * 0.41;',
      '  float cb = cos(ang2); float sb = sin(ang2);',
      '  for (int i = 0; i < STEPS; i++) {',
      '    float t = t0 + (float(i) + jitter) * dt;',
      '    if (t > t1) break;',
      '    vec3 p = ro + rd * t;',
      '    // Globe-local turbulence: follows icon/group rotation',
      '    vec3 q = uGroupInv * (p - uCenter);',
      '    // Optional slow local drift (nSpd) — still locked to globe frame',
      '    q = vec3(ca * q.x + sa * q.z, q.y, -sa * q.x + ca * q.z);',
      '    q = vec3(q.x, cb * q.y - sb * q.z, sb * q.y + cb * q.z);',
      '    vec3 np = q * uNoiseScale;',
      '    float n = fbm(np);',
      '    float dist = length(p - uCenter) / uRadius;',
      '    dist = dist + n * uNoiseAmp;',
      '    float dens = pow(clamp(1.0 - dist, 0.0, 1.0), fall);',
      '    dens *= (1.0 + 0.12 * n);',
      '    dens = max(dens, 0.0);',
      '    acc += dens * dt * 2.4;',
      '  }',
      '  float a = clamp(acc * uAlpha, 0.0, 1.0);',
      '  if (a < 0.004) discard;',
      '  // Mild bias — keep soft edge without hard iso-ellipse rings',
      '  a = 1.0 - pow(1.0 - a, 1.55);',
      '  // Premultiplied white — prevents gray fringe when canvas composites over page',
      '  gl_FragColor = vec4(a, a, a, a);',
      '}'
    ].join('\n');

    var fogMat = new THREE.ShaderMaterial({
      uniforms: fogUniforms,
      vertexShader: fogVert,
      fragmentShader: fogFrag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.BackSide,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    });
    var fogGeo = new THREE.SphereGeometry(1, 32, 24);
    var fogMesh = new THREE.Mesh(fogGeo, fogMat);
    fogMesh.scale.setScalar(RADIUS * 1.05);
    fogMesh.renderOrder = 45;
    fogMesh.frustumCulled = false;
    // Sphere mesh stays in scene (raymarch in world); noise samples in group-local space
    fogMesh.layers.set(0); // dither pass only — icons on layer 1 composite on top
    scene.add(fogMesh);

    function applyFogParams() {
      fogUniforms.uFall.value = fogFall;
      fogUniforms.uAlpha.value = fogAlpha * 0.95;
      fogUniforms.uRadius.value = RADIUS * 1.05;
      fogUniforms.uNoiseAmp.value = fogNoiseAmp;
      fogUniforms.uNoiseScale.value = fogNoiseScale;
      fogUniforms.uNoiseSpeed.value = fogNoiseSpeed;
    }
    applyFogParams();
    var fogTime0 = performance.now();

    // Screen-space Bayer dither (applied after scene render)
    var BAYER8 = [
      0,48,12,60,3,51,15,63, 32,16,44,28,35,19,47,31,
      8,56,4,52,11,59,7,55, 40,24,36,20,43,27,39,23,
      2,50,14,62,1,49,13,61, 34,18,46,30,33,17,45,29,
      10,58,6,54,9,57,5,53, 42,26,38,22,41,25,37,21
    ];
    var bayerData = new Uint8Array(64 * 4);
    for (var bi = 0; bi < 64; bi++) {
      var bv = Math.round(((BAYER8[bi] + 0.5) / 64) * 255);
      bayerData[bi * 4] = bv;
      bayerData[bi * 4 + 1] = bv;
      bayerData[bi * 4 + 2] = bv;
      bayerData[bi * 4 + 3] = 255;
    }
    var bayerTex = new THREE.DataTexture(bayerData, 8, 8, THREE.RGBAFormat);
    bayerTex.magFilter = THREE.NearestFilter;
    bayerTex.minFilter = THREE.NearestFilter;
    bayerTex.wrapS = THREE.RepeatWrapping;
    bayerTex.wrapT = THREE.RepeatWrapping;
    bayerTex.needsUpdate = true;
    var sceneRT = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false
    });
    var ditherMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBayer: { value: bayerTex },
        levels: { value: 1 },
        grain: { value: 6 },
        uPR: { value: 1 },
        uRes: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  gl_Position = vec4(position.xy, 0.0, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tDiffuse;',
        'uniform sampler2D tBayer;',
        'uniform float levels;',
        'uniform float grain;',
        'uniform float uPR;',
        'uniform vec2 uRes;',
        'varying vec2 vUv;',
        'void main() {',
        '  if (levels < 0.5) { gl_FragColor = texture2D(tDiffuse, vUv); return; }',
        '  float g = max(grain, 1.0) * max(uPR, 1.0);',
        '  vec2 centered = gl_FragCoord.xy - 0.5 * uRes;',
        '  vec2 cell = floor(centered / g);',
        '  // One sample per Bayer cell — no sub-cell shapes from smooth fog',
        '  vec2 cellCenter = (cell + 0.5) * g + 0.5 * uRes;',
        '  vec2 cellUv = cellCenter / uRes;',
        '  vec4 c = texture2D(tDiffuse, cellUv);',
        '  float a = c.a;',
        '  vec3 rgb = a > 0.001 ? c.rgb / max(a, 0.001) : vec3(1.0);',
        '  float lum = max(rgb.r, max(rgb.g, rgb.b));',
        '  if (lum > 0.7 && abs(rgb.r - rgb.g) < 0.12 && abs(rgb.g - rgb.b) < 0.12) rgb = vec3(1.0);',
        '  float thr = texture2D(tBayer, fract((cell + 0.5) / 8.0)).r;',
        '  // levels=1 → hard 0/1 presence; higher = stepped opacity',
        '  float q = floor(a * levels + thr);',
        '  q = clamp(q, 0.0, levels) / levels;',
        '  gl_FragColor = vec4(rgb * q, q);',
        '}'
      ].join('\n'),
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    });
    var postScene = new THREE.Scene();
    var postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ditherMat));
    function resizeSceneRT() {
      var w = Math.max(1, renderer.domElement.width);
      var h = Math.max(1, renderer.domElement.height);
      if (sceneRT.width !== w || sceneRT.height !== h) sceneRT.setSize(w, h);
    }

    cloud.forEach(function (item, idx) {
      loadTexture(item.src).catch(function () {
        return placeholderTexture(item.label);
      }).then(function (texture) {
        var material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          opacity: 0.95
        });
        var sprite = new THREE.Sprite(material);
        sprite.position.copy(points[idx]);
        sprite.scale.set(BASE, BASE, 1);
        sprite.userData = { href: item.href, label: item.label, base: BASE };
        sprite.layers.set(1); // sharp overlay — not Bayer-dithered with fog
        group.add(sprite);
        sprites.push(sprite);
      });
    });

    var globeCssSize = 360;
    function resize() {
      var parent = canvas.parentElement;
      var size = Math.min(parent ? parent.clientWidth : globeCssSize, globeCssSize);
      if (size < 160) size = 220;
      renderer.setSize(size, size, false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
      resizeSceneRT();
    }
    resize();

    var dragging = false;
    var lastX = 0;
    var lastY = 0;
    var velX = 0;
    var velY = 0;
    var idle = true;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var didGesture = false; // drag or pinch — never open link on release
    var TAP_PX = 10;

    // 1:1: finger delta maps to surface rotation via projected sphere radius in px
    function dragFactor() {
      var h = canvas.clientHeight || 300;
      var fov = camera.fov * Math.PI / 180;
      var rPx = (RADIUS / (camera.position.z * Math.tan(fov / 2))) * (h / 2);
      return 1 / Math.max(rPx, 1);
    }
    // pinch/wheel: icon size; Bayer density (cells/px from center), not corner UV scale
    var ICON_MIN = 0.55;
    var ICON_MAX = 1.9;
    // Adaptive start: desktop near min; tablet/phone (coarse / narrow / high DPR) larger
    function defaultIconScale() {
      var dpr = window.devicePixelRatio || 1;
      if (dpr > 3) dpr = 3;
      var shortSide = Math.min(window.innerWidth || 360, window.innerHeight || 360);
      var coarse = false;
      try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e0) {}
      var scale = ICON_MIN;
      if (coarse || shortSide < 920) scale = 1.12;
      if (dpr > 1.25) scale *= 1 + Math.min(0.4, (dpr - 1) * 0.22);
      if (scale < ICON_MIN) scale = ICON_MIN;
      if (scale > ICON_MAX) scale = ICON_MAX;
      return scale;
    }
    var iconScale = defaultIconScale();
    var pinchStartDist = 0;
    var pinchStartScale = iconScale;
    var pinching = false;

    function refreshAdaptiveIconScale() {
      if (pinching) return;
      var next = defaultIconScale();
      // lift undersized defaults after rotate; don't shrink a user pinch-up
      if (next > iconScale) iconScale = next;
      pinchStartScale = iconScale;
    }
    window.addEventListener('orientationchange', function () {
      setTimeout(refreshAdaptiveIconScale, 180);
    });
    window.addEventListener('resize', function () {
      refreshAdaptiveIconScale();
    });

    function touchDist(ev) {
      if (!ev.touches || ev.touches.length < 2) return 0;
      var a = ev.touches[0];
      var b = ev.touches[1];
      var dx = a.clientX - b.clientX;
      var dy = a.clientY - b.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function clientPoint(ev) {
      if (ev.touches && ev.touches.length) return ev.touches[0];
      if (ev.changedTouches && ev.changedTouches.length) return ev.changedTouches[0];
      return ev;
    }

    function openHit(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      var hits = raycaster.intersectObjects(sprites, false);
      if (!hits.length) return;
      hits.sort(function (a, b) {
        return (b.object.renderOrder || 0) - (a.object.renderOrder || 0);
      });
      var href = hits[0].object.userData.href;
      if (!href || href === '#') return;
      window.open(href, '_blank', 'noopener,noreferrer');
    }

    function onPointerDown(ev) {
      if (ev.pointerType === 'touch') return;
      dragging = true;
      idle = false;
      moved = false;
      didGesture = false;
      lastX = ev.clientX;
      lastY = ev.clientY;
      startX = ev.clientX;
      startY = ev.clientY;
      velX = 0;
      velY = 0;
      if (ev.cancelable) ev.preventDefault();
      if (canvas.setPointerCapture && ev.pointerId != null) {
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
      }
    }
    function onPointerMove(ev) {
      if (ev.pointerType === 'touch') return;
      if (!dragging) return;
      var dx = ev.clientX - lastX;
      var dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > TAP_PX) {
        moved = true;
        didGesture = true;
      }
      var f = dragFactor();
      group.rotation.y += dx * f;
      group.rotation.x += dy * f;
      group.rotation.x = Math.max(-1, Math.min(1, group.rotation.x));
      velX = dx * f;
      velY = dy * f;
      if (ev.cancelable) ev.preventDefault();
    }
    function onPointerUp(ev) {
      if (ev.pointerType === 'touch') return;
      if (ev && ev.cancelable) ev.preventDefault();
      var open = !didGesture && !moved;
      dragging = false;
      idle = true;
      if (open && ev) openHit(ev.clientX, ev.clientY);
    }

    function onTouchStart(ev) {
      if (ev.cancelable) ev.preventDefault();
      idle = false;
      if (ev.touches.length >= 2) {
        pinching = true;
        dragging = false;
        didGesture = true; // pinch never opens a link
        pinchStartDist = touchDist(ev);
        pinchStartScale = iconScale;
        return;
      }
      // fresh single-finger gesture only — not residual after pinch
      pinching = false;
      dragging = true;
      moved = false;
      didGesture = false;
      var p = clientPoint(ev);
      lastX = p.clientX;
      lastY = p.clientY;
      startX = p.clientX;
      startY = p.clientY;
      velX = 0;
      velY = 0;
    }
    function onTouchMove(ev) {
      if (ev.cancelable) ev.preventDefault();
      if (ev.touches.length >= 2) {
        pinching = true;
        dragging = false;
        didGesture = true;
        var d = touchDist(ev);
        if (pinchStartDist > 0 && d > 0) {
          // pinch-out (d larger) -> larger icons; pinch-in -> smaller
          var next = pinchStartScale * (d / pinchStartDist);
          iconScale = Math.max(ICON_MIN, Math.min(ICON_MAX, next));
        }
        return;
      }
      if (!dragging || pinching) return;
      var p = clientPoint(ev);
      var dx = p.clientX - lastX;
      var dy = p.clientY - lastY;
      lastX = p.clientX;
      lastY = p.clientY;
      if (Math.hypot(p.clientX - startX, p.clientY - startY) > TAP_PX) {
        moved = true;
        didGesture = true;
      }
      var f = dragFactor();
      group.rotation.y += dx * f;
      group.rotation.x += dy * f;
      group.rotation.x = Math.max(-1, Math.min(1, group.rotation.x));
      velX = dx * f;
      velY = dy * f;
    }
    function onTouchEnd(ev) {
      if (ev.cancelable) ev.preventDefault();
      if (ev.touches && ev.touches.length >= 2) {
        pinchStartDist = touchDist(ev);
        pinchStartScale = iconScale;
        didGesture = true;
        return;
      }
      if (ev.touches && ev.touches.length === 1) {
        // one finger left after pinch/drag — keep suppressing open
        if (pinching) didGesture = true;
        pinching = false;
        dragging = true;
        var p = ev.touches[0];
        lastX = p.clientX;
        lastY = p.clientY;
        startX = p.clientX;
        startY = p.clientY;
        return;
      }
      var open = !didGesture && !moved;
      var end = (ev.changedTouches && ev.changedTouches[0]) || null;
      pinching = false;
      dragging = false;
      idle = true;
      if (open && end) {
        openHit(end.clientX, end.clientY);
      }
    }
    function onWheel(ev) {
      ev.preventDefault();
      // scroll up = denser (larger icons), scroll down = sparser
      var next = iconScale * (ev.deltaY > 0 ? 0.94 : 1.06);
      iconScale = Math.max(ICON_MIN, Math.min(ICON_MAX, next));
      idle = false;
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

    var raycaster = new THREE.Raycaster();
    // icons live on layer 1 (fog on 0) — must match or clicks miss
    raycaster.layers.enable(1);
    var pointer = new THREE.Vector2();

    var worldPos = new THREE.Vector3();
    var viewPos = new THREE.Vector3();
    var running = true;
    var raf = 0;

    function tick() {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (!dragging && !pinching) {
        group.rotation.y += velX;
        group.rotation.x += velY;
        group.rotation.x = Math.max(-1, Math.min(1, group.rotation.x));
        velX *= 0.94;
        velY *= 0.94;
        if (idle && Math.abs(velX) < 0.0007 && Math.abs(velY) < 0.0007) {
          group.rotation.y += 0.00085;
        }
      }
      group.updateMatrixWorld(true);

      // volume fog: noise locked to globe rotation (+ optional local nSpd drift)
      fogUniforms.uCamPos.value.copy(camera.position);
      fogUniforms.uTime.value = (performance.now() - fogTime0) * 0.001;
      fogRot4.extractRotation(group.matrixWorld);
      fogRot3.setFromMatrix4(fogRot4);
      fogRot3.transpose(); // R^T = R^{-1} for pure rotation
      fogUniforms.uGroupInv.value.copy(fogRot3);

      var halfTan = Math.tan((camera.fov * Math.PI / 180) * 0.5);
      for (var s = 0; s < sprites.length; s++) {
        var sprite = sprites[s];
        sprite.getWorldPosition(worldPos);
        viewPos.copy(worldPos).applyMatrix4(camera.matrixWorldInverse);
        var z = -viewPos.z;
        // +1 = toward camera (front), -1 = away (back)
        var facing = (viewPos.z + camera.position.z) / RADIUS;
        if (facing > 1) facing = 1;
        if (facing < -1) facing = -1;
        // soft size falloff toward rim/back; opacity is separate
        var sizeVis = 0.55 + 0.45 * ((facing + 1) * 0.5);
        var ndcX = (z > 0.001) ? (viewPos.x / (z * halfTan)) : 0;
        var ax = Math.abs(ndcX);
        var side = 1 - Math.pow(Math.min(1, ax / 0.95), 1.5);
        if (side < 0) side = 0;
        var scale = sprite.userData.base * iconScale * (0.62 + sizeVis * side * 0.55);
        sprite.scale.set(scale, scale, 1);
        // depth opacity: closest 100% → equator 50% → far 10%, smooth
        var depthT = (facing + 1) * 0.5; // 1 front … 0.5 mid … 0 back
        var opacity;
        if (depthT >= 0.5) {
          // front half: mid 0.5 → front 1.0
          var u = (depthT - 0.5) / 0.5;
          u = u * u * (3 - 2 * u);
          opacity = 0.50 + u * 0.50;
        } else {
          // back half: back 0.1 → mid 0.5
          var u2 = depthT / 0.5;
          u2 = u2 * u2 * (3 - 2 * u2);
          opacity = 0.10 + u2 * 0.40;
        }
        sprite.material.opacity = opacity;
        sprite.renderOrder = Math.round(60 + ((facing + 1) * 0.5) * 140);
      }
      // scene → RT → Bayer dither on alpha → screen
      ditherMat.uniforms.levels.value = fogDith;
      // pinch → density: larger icons => coarser cells; linear across full icon range
      var tIcon = (iconScale - ICON_MIN) / (ICON_MAX - ICON_MIN);
      if (tIcon < 0) tIcon = 0;
      if (tIcon > 1) tIcon = 1;
      var gLo = Math.max(1, fogGrain * 0.4);
      var gHi = Math.max(gLo + 2, fogGrain * 2.8);
      ditherMat.uniforms.grain.value = gLo + tIcon * (gHi - gLo);
      ditherMat.uniforms.uPR.value = renderer.getPixelRatio();
      ditherMat.uniforms.uRes.value.set(renderer.domElement.width, renderer.domElement.height);
      if (fogDith > 0) {
        // 1) fog only → RT → Bayer to screen
        camera.layers.set(0);
        renderer.setRenderTarget(sceneRT);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        ditherMat.uniforms.tDiffuse.value = sceneRT.texture;
        renderer.clear();
        renderer.render(postScene, postCam);
        // 2) icons on top, no dither (sharp)
        camera.layers.set(1);
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(scene, camera);
        renderer.autoClear = true;
        camera.layers.enable(0);
        camera.layers.enable(1);
      } else {
        camera.layers.enable(0);
        camera.layers.enable(1);
        renderer.render(scene, camera);
      }
    }

    // Debug sliders under globe + autosave
    (function bindGlobeDebug() {
      var wrap = document.getElementById('social-globe');
      var panel = document.getElementById('globe-light-debug');
      var gapEl = document.getElementById('fld-gGap');
      var sizeEl = document.getElementById('fld-gSize');
      var iconEl = document.getElementById('fld-gIcon');
      var fallEl = document.getElementById('fld-gFall');
      var fogEl = document.getElementById('fld-gFog');
      var dithEl = document.getElementById('fld-gDith');
      var grainEl = document.getElementById('fld-gGrain');
      var nAmpEl = document.getElementById('fld-gNAmp');
      var nScaleEl = document.getElementById('fld-gNScale');
      var nSpdEl = document.getElementById('fld-gNSpd');
      var statusEl = document.getElementById('fld-g-save-status');
      var saveWrap = document.getElementById('fld-g-save');
      if (!wrap) return;
      var KEY = 'laditeo.globeDebug.v3';
      var FIELDS = [
        'fld-gGap','fld-gSize','fld-gIcon','fld-gFall','fld-gFog','fld-gDith','fld-gGrain',
        'fld-gNAmp','fld-gNScale','fld-gNSpd'
      ];
      function setOut(id, text) {
        var o = document.getElementById(id);
        if (o) o.textContent = text;
      }
      function setStatus(state, text) {
        if (saveWrap) saveWrap.dataset.state = state;
        if (statusEl) statusEl.textContent = text;
      }
      function collect() {
        var o = { v: 1, t: Date.now() };
        for (var i = 0; i < FIELDS.length; i++) {
          var el = document.getElementById(FIELDS[i]);
          if (el) o[FIELDS[i]] = el.value;
        }
        return o;
      }
      function applyStored(data) {
        if (!data) return;
        for (var i = 0; i < FIELDS.length; i++) {
          var id = FIELDS[i];
          if (data[id] == null) continue;
          var el = document.getElementById(id);
          if (!el) continue;
          el.value = String(data[id]);
        }
      }
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) applyStored(JSON.parse(raw));
      } catch (e) {}
      function sync() {
        var gap = gapEl ? parseFloat(gapEl.value) : 22;
        var sz = sizeEl ? Math.round(parseFloat(sizeEl.value)) : 360;
        var ic = iconEl ? parseFloat(iconEl.value) : BASE;
        var fall = fallEl ? parseFloat(fallEl.value) : 2.47;
        var fog = fogEl ? parseFloat(fogEl.value) : 1;
        var dith = dithEl ? parseFloat(dithEl.value) : 1;
        var grain = grainEl ? parseFloat(grainEl.value) : 6;
        var nAmp = nAmpEl ? parseFloat(nAmpEl.value) : 0.35;
        var nScale = nScaleEl ? parseFloat(nScaleEl.value) : 1.35;
        var nSpd = nSpdEl ? parseFloat(nSpdEl.value) : 0.18;
        wrap.style.marginTop = gap + 'px';
        wrap.style.width = sz + 'px';
        wrap.style.maxWidth = sz + 'px';
        wrap.style.minHeight = Math.max(180, Math.round(sz * 0.72)) + 'px';
        globeCssSize = sz;
        resize();
        BASE = ic;
        for (var i = 0; i < sprites.length; i++) {
          if (sprites[i] && sprites[i].userData) sprites[i].userData.base = ic;
        }
        fogFall = fall;
        fogDith = dith;
        fogGrain = grain;
        fogAlpha = fog;
        fogNoiseAmp = nAmp;
        fogNoiseScale = nScale;
        fogNoiseSpeed = nSpd;
        applyFogParams();
        var soft = Math.max(0.35, Math.min(1.4, fall));
        var a = Math.round(22 + soft * 8);
        var b = Math.round(52 + soft * 12);
        var c = Math.round(72 + soft * 10);
        var mask = 'radial-gradient(ellipse 62% 58% at 50% 48%, #000 ' + a + '%, rgba(0,0,0,0.7) ' + b + '%, transparent ' + c + '%)';
        wrap.style.webkitMaskImage = mask;
        wrap.style.maskImage = mask;
        setOut('fld-gGap-val', String(Math.round(gap)));
        setOut('fld-gSize-val', String(sz));
        setOut('fld-gIcon-val', ic.toFixed(2));
        setOut('fld-gFall-val', fall.toFixed(2));
        setOut('fld-gFog-val', fog.toFixed(2));
        setOut('fld-gDith-val', String(Math.round(dith)));
        setOut('fld-gGrain-val', String(Math.round(grain)));
        setOut('fld-gNAmp-val', nAmp.toFixed(2));
        setOut('fld-gNScale-val', nScale.toFixed(2));
        setOut('fld-gNSpd-val', nSpd.toFixed(2));
      }
      var timer = null;
      function scheduleSave() {
        setStatus('saving', 'saving…');
        clearTimeout(timer);
        timer = setTimeout(function () {
          try {
            localStorage.setItem(KEY, JSON.stringify(collect()));
            setStatus('saved', 'saved');
          } catch (err) {
            setStatus('err', 'err');
          }
        }, 420);
      }
      if (panel) {
        panel.addEventListener('input', function () {
          sync();
          scheduleSave();
        });
      } else {
        [gapEl, sizeEl, iconEl, fallEl, fogEl, dithEl, grainEl, nAmpEl, nScaleEl, nSpdEl].forEach(function (el) {
          if (el) el.addEventListener('input', function () { sync(); scheduleSave(); });
        });
      }
      sync();
      try {
        if (!localStorage.getItem(KEY)) {
          localStorage.setItem(KEY, JSON.stringify(collect()));
          setStatus('saved', 'saved');
        } else {
          setStatus('ready', 'ready');
        }
      } catch (e2) {
        setStatus('ready', 'ready');
      }
    })();

    tick();

    var ro = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(resize);
      ro.observe(canvas.parentElement || canvas);
    } else {
      window.addEventListener('resize', resize);
    }

    console.info('[social-globe] ready');
    window.__socialGlobeDispose = function () {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
      canvas.removeEventListener('wheel', onWheel);
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', resize);
      scene.remove(fogMesh);
      if (fogMat) fogMat.dispose();
      if (fogGeo) fogGeo.dispose();
      if (bayerTex) bayerTex.dispose();
      if (sceneRT) sceneRT.dispose();
      if (ditherMat) ditherMat.dispose();
      sprites.forEach(function (sp) {
        if (sp.material.map) sp.material.map.dispose();
        sp.material.dispose();
        group.remove(sp);
      });
      renderer.dispose();
      window.__socialGlobeDispose = null;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
