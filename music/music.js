(() => {
  "use strict";

  // Camera constants copied from Genki Space (GrammarCanvas.tsx)
  const MIN_ZOOM = 0.18;
  const MAX_ZOOM = 1.8;
  const FIT_PADDING = 0.22;
  const RMB_ZOOM_SPEED = 0.006;

  const STORE_KEY = "laditeo.art/music.layout.v1";
  const ASSET_DIR = "/music%20and%20art";
  const BAR_COUNT = 48;
  const API = "/music/api";
  const CATALOG_URL = "/music%20and%20art/catalog.json";
  let serverRev = 0;

  async function loadCatalog() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(CATALOG_URL, { cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error("http " + res.status);
      const obj = await res.json();
      if (obj && Array.isArray(obj.tracks) && Array.isArray(obj.images)) return obj;
    } catch {
      /* offline — FILES fallback */
    }
    return null;
  }

  function slugify(s) {
    const slug = String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\u0430-\u044f\u0451]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return slug || "f" + Date.now().toString(36);
  }

  function enqueueFull(url, ok, fail) {
    fullQueue.push({ url, done: false, ok, fail });
    pumpFullQueue();
  }

  function swapWhenDecoded(img, url, then) {
    img.src = url;
    if (typeof img.decode === "function") {
      img.decode().then(then).catch(then);
    } else {
      img.addEventListener("load", then, { once: true });
      img.addEventListener("error", then, { once: true });
    }
  }
  let sharedTimer = 0;

  function myUid() {
    try {
      let u = localStorage.getItem("laditeo.art/music.uid");
      if (!u) {
        u = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        localStorage.setItem("laditeo.art/music.uid", u);
      }
      return u;
    } catch {
      return "anon";
    }
  }

  function scheduleSharedSave() {
    clearTimeout(sharedTimer);
    sharedTimer = setTimeout(() => pushLayout(null), 2500);
  }

  async function fetchJSON(url, opts, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs || 8000);
    try {
      const res = await fetch(url, { ...(opts || {}), signal: ctrl.signal });
      if (!res.ok) throw new Error("http " + res.status);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  async function loadServerLayout() {
    try {
      const obj = await fetchJSON(API + "/layout", null, 4000);
      if (obj && typeof obj.rev === "number") return obj;
    } catch {
      /* offline — local only */
    }
    return null;
  }

  const FILES = [
    { id: "ayylchemy", file: "AYYLCHEMY.flac", stream: "AYYLCHEMY-stream.mp3", title: "AYYLCHEMY", duration: 230.4, peaks: [0.703, 0.709, 0.644, 0.756, 0.861, 0.889, 1, 0.835, 0.647, 0.774, 0.871, 1, 0.988, 1, 0.946, 0.895, 1, 1, 0.799, 0.576, 0.534, 1, 0.796, 0.959, 0.715, 0.642, 0.832, 1, 0.842, 0.283, 0.637, 1, 1, 0.788, 1, 0.725, 1, 1, 0.906, 0.395, 0.66, 0.833, 0.835, 0.803, 0.575, 0.672, 0.63, 0.752, 0.795, 0.636, 0.797, 1, 0.75, 1, 0.947, 1, 1, 1, 0.397, 0.393, 0.334, 0.385, 0.445, 0.652, 0.456, 0.449, 0.382, 0.501, 0.655, 0.339, 0.263, 0.218, 0.331, 0.234, 0.274, 0.242, 0.152, 0.206, 0.097, 0.566, 0.76, 0.663, 0.755, 0.717, 0.745, 0.753, 0.663, 0.665, 0.762, 0.643, 0.582, 0.849, 0.9, 1, 0.76, 0.834, 0.689, 0.858, 0.758, 0.529, 0.851, 0.667, 0.681, 0.732, 0.808, 0.821, 0.66, 0.711, 0.635, 0.599, 1, 0.676, 0.801, 0.684, 0.653, 0.576, 0.6, 0.573, 0.603, 0.784], kind: "audio", x: 80, y: -350 },
    { id: "notify", file: "NOTIFY.flac", stream: "NOTIFY-stream.mp3", title: "NOTIFY", duration: 272.0, peaks: [0.624, 0.575, 0.575, 0.576, 0.576, 0.57, 0.502, 0.567, 0.58, 0.62, 0.575, 0.575, 0.581, 0.536, 0.568, 0.591, 0.58, 0.58, 0.688, 0.561, 0.592, 0.612, 0.627, 0.599, 0.672, 0.628, 0.559, 0.534, 0.465, 0.477, 0.43, 0.547, 0.697, 0.645, 0.572, 0.484, 0.478, 0.417, 0.69, 0.6, 0.911, 0.979, 0.631, 0.789, 1, 0.69, 0.412, 0.478, 0.707, 0.413, 0.534, 0.828, 0.534, 0.646, 0.799, 0.454, 0.815, 0.485, 0.54, 0.401, 0.247, 0.321, 0.267, 0.405, 0.538, 0.454, 0.272, 0.445, 0.473, 0.449, 0.444, 0.527, 0.376, 0.633, 0.42, 0.222, 0.522, 0.483, 0.54, 0.447, 0.415, 0.389, 0.335, 0.459, 0.411, 0.38, 0.43, 0.385, 0.353, 0.38, 0.581, 0.411, 0.401, 0.333, 0.331, 0.373, 0.29, 0.436, 0.436, 0.495, 0.457, 0.322, 0.257, 0.186, 0.156, 0.312, 0.125, 0.221, 0.204, 0.059, 0.307, 0.404, 0.413, 0.38, 0.491, 0.382, 0.471, 0.562, 0.695, 0.6], kind: "audio", x: 80, y: -170 },
    { id: "need4speed", file: "need4speed.flac", stream: "need4speed-stream.mp3", title: "need4speed", duration: 230.04, peaks: [0.333, 0.723, 0.754, 0.715, 0.598, 0.719, 0.718, 0.759, 0.656, 0.651, 0.733, 0.638, 0.701, 0.69, 0.69, 0.742, 0.753, 0.631, 0.782, 0.713, 0.693, 0.717, 0.688, 0.728, 0.764, 0.612, 0.7, 0.767, 0.734, 0.604, 0.756, 0.752, 0.819, 0.809, 0.859, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.988, 0.98, 1, 0.954, 0.925, 0.924, 0.931, 0.917, 0.895, 0.904, 0.858, 0.931, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.972, 0.618, 0.22, 0.028, 0.009], kind: "audio", x: 80, y: 10 },
    { id: "ufo-plants", file: "UFO_PLANTS.flac", stream: "UFO_PLANTS-stream.mp3", title: "UFO PLANTS", duration: 410.32, peaks: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.952, 0.965, 0.945, 1, 0.959, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.467, 0.619, 0.748, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.324, 0.24, 0.102, 0.116, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.376, 0.398, 0.338, 0.83, 1, 0.762, 0.747, 0.881, 0.376, 0.786, 0.885, 1, 0.95, 0.839, 0.744, 0.717, 1, 0.902, 0.729, 0.766, 0.463, 0.455, 0.296, 0.362, 0.326, 0.573, 0.541, 1, 0.733, 0.875, 0.972, 0.73, 0.763, 0.628, 0.509, 0.348, 0.248, 0.146], kind: "audio", x: 80, y: 190 },
    { id: "buddha-108", file: "CSMSJL & T3O - Buddha 108.flac", stream: "CSMSJL & T3O - Buddha 108-stream.mp3", title: "CSMSJL & T3O - Buddha 108", duration: 357.02, peaks: [0.741, 0.698, 0.628, 0.728, 0.851, 1, 1, 1, 1, 0.618, 0.764, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.977, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.975, 0.882, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.935, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.889, 0.739, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.996, 1, 1, 1, 0.802, 0.621, 0.404, 0.216, 0.016, 0.003], kind: "audio", x: 80, y: 370 },
    { id: "tphphp", file: "TPHPHP.mp3", stream: "TPHPHP-stream.mp3", title: "TPHPHP", duration: 452.87, peaks: [0.343, 0.39, 0.487, 1, 0.821, 0.835, 0.876, 0.646, 0.53, 0.512, 0.837, 1, 1, 0.919, 1, 0.944, 0.795, 0.744, 0.959, 0.736, 0.832, 0.763, 0.972, 0.645, 0.982, 0.992, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.828, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.674, 0.562, 0.885, 0.813, 0.824, 0.804, 0.759, 0.761, 0.748, 0.696, 0.756, 0.652, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.982, 1, 1, 1, 0.785, 0.882, 1, 1, 1, 0.879, 0.972, 1, 1, 1, 0.962, 1, 1, 1, 1, 1, 1, 1, 0.68, 0.295, 0.312, 0.399, 0.46, 0.493, 0.497, 0.476, 0.329, 0.224, 0.564, 0.795, 0.993, 0.805, 1, 1, 1, 1, 1, 1, 1, 0.826, 0.473, 0.187], kind: "audio", x: 80, y: 550 },
    { id: "balance", file: "BALANCE crop.jpg", kind: "image", x: -580, y: -420, baseW: 360, scale: 1 },
    { id: "dorisuii", file: "dorisuii crop.jpg", kind: "image", x: -540, y: -40, baseW: 320, scale: 1 },
    { id: "holo", file: "holo.jpg", kind: "image", x: -540, y: 300, baseW: 300, scale: 1 },
    { id: "message", file: "message.jpg", kind: "image", x: -540, y: 560, baseW: 300, scale: 1 },
    { id: "blond6", file: "blond6.jpg", kind: "image", x: 560, y: -420, baseW: 340, scale: 1 },
    { id: "peaches", file: "peaches.jpg", kind: "image", x: 580, y: -120, baseW: 300, scale: 1 },
    { id: "seebetea", file: "SeeBeTea.jpg", kind: "image", x: 560, y: 140, baseW: 320, scale: 1 },
    { id: "siberelis", file: "SIBERELIS_ETH_REALM.jpg", kind: "image", x: 560, y: 420, baseW: 340, scale: 1 },
    { id: "spiritech-fairy", file: "spiritech_fairy.jpg", kind: "image", x: 580, y: 700, baseW: 300, scale: 1 },
  ];

  const PLAY_ICON =
    '<svg class="icon-play" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4.2 2.4v11.2c0 .5.6.8 1 .5l8.2-5.6c.4-.3.4-.9 0-1.2L5.2 1.9c-.4-.3-1 0-1 .5z"/></svg>';
  const PAUSE_ICON =
    '<svg class="icon-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.2" y="2.4" width="3.2" height="11.2" rx="1" fill="currentColor"/><rect x="9.6" y="2.4" width="3.2" height="11.2" rx="1" fill="currentColor"/></svg>';
  const DOWNLOAD_ICON =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.5a.75.75 0 0 1 .75.75v6.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V2.25A.75.75 0 0 1 8 1.5zm-4.75 10.5a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5h-9.5z"/></svg>';

  const stage = document.getElementById("stage");
  const world = document.getElementById("world");

  const vp = { x: 0, y: 0, zoom: 1 };
  const items = new Map();
  let zTop = 10;
  let saveTimer = 0;
  let audioCtx = null;
  let analyser = null;
  let analyserBuf = null;
  let liveRaf = 0;
  let currentAudio = null;

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function clampZoom(z) {
    return clamp(z, MIN_ZOOM, MAX_ZOOM);
  }

  function assetUrl(file) {
    return `${ASSET_DIR}/${encodeURIComponent(file)}`;
  }

  function thumbFile(file) {
    return file.replace(/\.jpg$/i, "-thumb.jpg");
  }

  // Lazy full-image loading: thumbs paint instantly, full frames load
  // at most FULL_CONCURRENCY at a time, viewport-first (server is HTTP/1.1).
  const FULL_CONCURRENCY = 2;
  const fullQueue = [];
  let fullActive = 0;
  let fullObserver = null;
  // While audio is starving, image full-frames yield the connections.
  let audioHungry = false;

  function setAudioHungry(v) {
    audioHungry = v;
    if (!v) pumpFullQueue();
  }

  function pumpFullQueue() {
    while (!audioHungry && fullActive < FULL_CONCURRENCY && fullQueue.length) {
      const job = fullQueue.shift();
      if (!job || job.done) continue;
      job.done = true;
      fullActive++;
      const loader = new Image();
      loader.decoding = "async";
      const fin = () => {
        fullActive--;
        pumpFullQueue();
      };
      loader.onload = () => {
        job.ok();
        fin();
      };
      loader.onerror = () => {
        job.fail();
        fin();
      };
      loader.src = job.url;
    }
  }

  const pendingFull = new Map();

  function watchFull(el, cb) {
    if (!("IntersectionObserver" in window)) {
      cb();
      return;
    }
    if (!fullObserver) {
      fullObserver = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              fullObserver.unobserve(e.target);
              const fns = pendingFull.get(e.target) || [];
              pendingFull.delete(e.target);
              fns.forEach((fn) => fn());
            }
          }
        },
        { rootMargin: "1000px" },
      );
    }
    if (!pendingFull.has(el)) pendingFull.set(el, []);
    pendingFull.get(el).push(cb);
    fullObserver.observe(el);
  }

  // Safety: load everything eventually even if observer never fires.
  setTimeout(() => {
    if (fullObserver) fullObserver.disconnect();
    for (const fns of pendingFull.values()) fns.forEach((fn) => fn());
    pendingFull.clear();
    pumpFullQueue();
  }, 6000);

  function titleFromFile(file) {
    return file.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  }

  function fileExt(file) {
    const i = file.lastIndexOf(".");
    return i >= 0 ? file.slice(i + 1).toUpperCase() : "";
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  function updateTime(item) {
    if (!item.timeEl) return;
    const t = displayTime(item);
    const dur = item.duration || 0;
    item.timeEl.textContent = `${formatTime(t)} / ${formatTime(dur)}`;
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makePeaks(seed, n) {
    let s = hashString(seed) || 1;
    const rand = () => {
      s = Math.imul(s, 16807) % 2147483647;
      return (s & 0x7fffffff) / 2147483647;
    };
    const raw = [];
    for (let i = 0; i < n; i++) {
      const env = 0.35 + 0.65 * Math.sin((i / (n - 1)) * Math.PI);
      raw.push((0.18 + rand() * 0.82) * env);
    }
    const out = raw.slice();
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < n - 1; i++) {
        out[i] = raw[i] * 0.45 + out[i - 1] * 0.25 + raw[i + 1] * 0.3;
      }
    }
    return out.map((v) => clamp(v, 0.12, 1));
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveStore, 180);
  }

  function collectLayout() {
    const payload = { items: {}, comments: [] };
    for (const [id, item] of items) {
      if (id === "save-all") continue;
      if (item.kind === "comment") {
        payload.comments.push({
          cid: id,
          name: item.name,
          text: item.text,
          x: Math.round(item.x * 10) / 10,
          y: Math.round(item.y * 10) / 10,
          z: item.z,
          ts: item.ts,
          updatedAt: item.updatedAt,
          owner: item.owner || "",
        });
      } else {
        payload.items[id] = {
          x: Math.round(item.x * 10) / 10,
          y: Math.round(item.y * 10) / 10,
          scale: item.scale || 1,
          z: item.z,
        };
      }
    }
    return payload;
  }

  function saveStore() {
    const layout = collectLayout();
    const payload = {
      rev: serverRev,
      vp: { x: vp.x, y: vp.y, zoom: vp.zoom },
      items: layout.items,
      comments: layout.comments,
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
    } catch {
      /* storage full — ignore */
    }
  }

  async function pushLayout() {
    const sync = document.querySelector(".sync");
    const txt = sync ? sync.querySelector(".sync-text") : null;
    if (sync) {
      sync.hidden = false;
      sync.classList.remove("is-ok", "is-fail");
      sync.classList.add("is-busy");
    }
    if (txt) txt.textContent = "Saving\u2026";
    const done = (ok) => {
      if (!sync) return;
      sync.classList.remove("is-busy");
      sync.classList.add(ok ? "is-ok" : "is-fail");
      if (txt) txt.textContent = ok ? "\u2713 Saved" : "\u2715 retry";
      clearTimeout(sync._hide);
      sync._hide = setTimeout(() => {
        sync.hidden = true;
      }, ok ? 3000 : 4000);
    };
    try {
      const fresh = await fetchJSON(API + "/layout", null, 5000).catch(() => null);
      const local = collectLayout();
      if (fresh && fresh.rev && fresh.rev !== serverRev) {
        const byId = new Map((fresh.comments || []).map((c) => [c.cid, c]));
        for (const c of local.comments) {
          const prev = byId.get(c.cid);
          if (!prev || (c.updatedAt || 0) >= (prev.updatedAt || 0)) byId.set(c.cid, c);
        }
        local.comments = [...byId.values()];
      }
      const rev = Date.now();
      const res = await fetchJSON(
        API + "/layout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rev,
            auth: myUid(),
            items: local.items,
            comments: local.comments,
          }),
        },
        10000,
      );
      serverRev = (res && res.rev) || rev;
      saveStore();
      done(true);
    } catch (err) {
      console.warn("shared save failed", err);
      done(false);
    }
  }
  function applyViewport() {
    world.style.transform = `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`;
    const gap = 28 * vp.zoom;
    stage.style.backgroundSize = `${gap}px ${gap}px`;
    stage.style.backgroundPosition = `${vp.x}px ${vp.y}px`;
  }

  function zoomAtClient(clientX, clientY, nextZoom, hardClamp = true) {
    const rect = stage.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const z = hardClamp ? clampZoom(nextZoom) : nextZoom;
    if (z === vp.zoom) return;
    const worldX = (px - vp.x) / vp.zoom;
    const worldY = (py - vp.y) / vp.zoom;
    vp.zoom = z;
    vp.x = px - worldX * z;
    vp.y = py - worldY * z;
    applyViewport();
  }

  function screenToWorld(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return {
      x: (clientX - rect.left - vp.x) / vp.zoom,
      y: (clientY - rect.top - vp.y) / vp.zoom,
    };
  }

  function placeItem(item) {
    item.el.style.left = `${item.x}px`;
    item.el.style.top = `${item.y}px`;
    item.el.style.zIndex = String(item.z);
    if (item.kind === "image") {
      item.el.style.setProperty("--w", `${item.baseW * item.scale}px`);
    }
  }

  function bringFront(item) {
    zTop += 1;
    item.z = zTop;
    item.el.style.zIndex = String(item.z);
  }

  function itemSize(item) {
    return {
      w: item.el.offsetWidth || (item.kind === "audio" ? 320 : item.baseW * item.scale),
      h: item.el.offsetHeight || 96,
    };
  }

  function computeFitViewport() {
    const fallback = { x: 0, y: 0, zoom: MIN_ZOOM };
    if (stage.clientWidth < 8 || stage.clientHeight < 8) return fallback;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const item of items.values()) {
      const { w, h } = itemSize(item);
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + w);
      maxY = Math.max(maxY, item.y + h);
    }
    if (!Number.isFinite(minX)) return fallback;
    const bw = Math.max(80, maxX - minX);
    const bh = Math.max(80, maxY - minY);
    const pad = 1 + FIT_PADDING * 2;
    const zoom = clampZoom(
      Math.min(stage.clientWidth / (bw * pad), stage.clientHeight / (bh * pad)),
    );
    return {
      zoom,
      x: stage.clientWidth / 2 - (minX + bw / 2) * zoom,
      y: stage.clientHeight / 2 - (minY + bh / 2) * zoom,
    };
  }


  function fillRoundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    ctx.fill();
  }


  function ensureAudioGraph() {
    if (audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    analyser.connect(audioCtx.destination);
    analyserBuf = new Uint8Array(analyser.frequencyBinCount);
  }

  function hookMediaElement(audio) {
    if (audio._srcNode) return;
    ensureAudioGraph();
    audio._srcNode = audioCtx.createMediaElementSource(audio);
    audio._srcNode.connect(analyser);
  }

  function bufferedAt(item, t) {
    try {
      const br = item.audio ? item.audio.buffered : null;
      if (!br) return false;
      for (let r = 0; r < br.length; r++) {
        if (t >= br.start(r) - 0.05 && t <= br.end(r) + 0.05) return true;
      }
    } catch {
      /* no buffered data yet */
    }
    return false;
  }

  function drawWave(item) {
    const canvas = item.wave;
    if (!canvas) return;
    const ctx = item.waveCtx;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 186;
    const cssH = canvas.clientHeight || 40;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    const bars = item.peaks;
    // Aggregate peaks to fit canvas width: fixed bar pitch, bucket peaks.
    const cols = Math.max(24, Math.min(bars.length, Math.max(1, Math.floor(cssW / 3))));
    const gap = Math.max(1 * dpr, w * 0.004);
    const barW = Math.max(1 * dpr, (w - gap * (cols - 1)) / cols);
    const dur = item.duration || 0;
    const t = displayTime(item);
    const progress = dur > 0 ? clamp(t / dur, 0, 1) : 0;
    const playing = item.audio && !item.audio.paused && !item.audio.ended;
    let live = null;
    if (playing && analyser && currentAudio === item.audio) {
      analyser.getByteFrequencyData(analyserBuf);
      live = analyserBuf;
    }
    for (let j = 0; j < cols; j++) {
      const a0 = Math.floor((j * bars.length) / cols);
      const a1 = Math.max(a0 + 1, Math.floor(((j + 1) * bars.length) / cols));
      let amp = 0;
      for (let k = a0; k < a1 && k < bars.length; k++) amp = Math.max(amp, bars[k]);
      if (live) {
        const bin = live[Math.min(live.length - 1, 2 + Math.floor(j * (24 / cols)))];
        amp = clamp(amp * 0.52 + (bin / 255) * 0.7, 0.08, 1);
      }
      const bh = Math.max(2 * dpr, amp * h * 0.88);
      const x = j * (barW + gap);
      const y = (h - bh) / 2;
      const filled = j / cols <= progress;
      const cached = !filled && dur > 0 && bufferedAt(item, ((j + 0.5) / cols) * dur);
      ctx.fillStyle = filled
        ? "rgb(0, 158, 172)"
        : cached
          ? "rgb(118, 198, 208)"
          : "rgba(0, 158, 172, 0.28)";
      fillRoundRect(ctx, x, y, barW, bh, Math.min(barW / 2, 2.2 * dpr));
    }
    updateTime(item);
  }

  function tickLive() {
    let any = false;
    for (const item of items.values()) {
      if (item.kind !== "audio") continue;
      if (item.audio && !item.audio.paused && !item.audio.ended) any = true;
      if (item.audio) updateTime(item);
      drawWave(item);
    }
    liveRaf = any ? requestAnimationFrame(tickLive) : 0;
  }

  function startLive() {
    if (!liveRaf) liveRaf = requestAnimationFrame(tickLive);
  }

  function displayTime(item) {
    if (item._visualTime != null) return item._visualTime;
    if (item.audio && item.audio.getAttribute("src")) return item.audio.currentTime;
    return item._resumeAt || 0;
  }

  function pauseOthers(except) {
    for (const item of items.values()) {
      if (item.kind !== "audio" || item.audio === except) continue;
      const a = item.audio;
      if (!a.paused) a.pause();
      if (!a.ended && a.readyState > 0 && a.getAttribute("src")) {
        // Free connections: abort background buffering, remember position.
        try {
          item._resumeAt = a.currentTime;
        } catch {
          item._resumeAt = 0;
        }
        a.removeAttribute("src");
        a.load();
      }
      item.playBtn.setAttribute("aria-pressed", "false");
    }
  }

  async function togglePlay(item) {
    if (performance.now() < (item._scrubUntil || 0)) return;
    const audio = item.audio;
    if (!audio.getAttribute("src")) {
      audio.preload = "metadata";
      audio.src = item.url;
      const rt = item._resumeAt || 0;
      item._resumeAt = 0;
      if (rt > 0.5) {
        const apply = () => {
          try {
            audio.currentTime = rt;
          } catch {
            /* metadata not ready — stays at 0, user seeks */
          }
          audio.removeEventListener("loadedmetadata", apply);
        };
        audio.addEventListener("loadedmetadata", apply);
      }
    }
    if (audio.paused) {
      pauseOthers(audio);
      hookMediaElement(audio);
      if (audioCtx.state === "suspended") await audioCtx.resume();
      if (item._pendingSeek != null) {
        try {
          audio.currentTime = item._pendingSeek;
          item._pendingSeek = null;
        } catch {
          /* metadata not ready — loadedmetadata handler applies it */
        }
      }
      try {
        await audio.play();
      } catch (err) {
        console.warn("play failed", err);
        return;
      }
      currentAudio = audio;
      // Buffer whole file in background while playing (disk cache) —
      // revisits and seeks become instant.
      if (audio.preload !== "auto") audio.preload = "auto";
      item.playBtn.setAttribute("aria-pressed", "true");
      startLive();
    } else {
      audio.pause();
      item.playBtn.setAttribute("aria-pressed", "false");
      drawWave(item);
    }
  }

  // Telegram-style: if the track is fully in disk cache, save from cache
  // with zero network; otherwise fall back to a plain download.
  async function saveFromCache(item) {
    const url = assetUrl(item.file);
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error("cache miss");
      const blob = await res.blob();
      if (!blob.size) throw new Error("empty");
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj;
      a.download = item.file;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(obj), 5000);
    } catch {
      const a = document.createElement("a");
      a.href = url;
      a.download = item.file;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  function commitSeek(item, t) {    // Normal HTTP streaming: browser fetches the chunk via Range itself.
    try {
      item.audio.currentTime = t;
    } catch {
      /* not ready yet — visual scrub still applies */
    }
  }

  function seekFromEvent(item, e) {
    const hit = item.waveHit;
    const width = hit.offsetWidth;
    if (width < 2) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const p = clamp((world.x - item.x - hit.offsetLeft) / width, 0, 1);
    const dur = item.duration || (Number.isFinite(item.audio.duration) ? item.audio.duration : 0);
    if (!Number.isFinite(dur) || dur <= 0) return;
    const t = p * dur;
    // Visual follows finger instantly; real seek is debounced so the
    // browser isn't drowned in Range requests while scrubbing lossless.
    item._visualTime = t;
    item._scrubUntil = performance.now() + 600;
    drawWave(item);
    clearTimeout(item._seekTimer);
    item._seekTimer = setTimeout(() => commitSeek(item, t), 120);
  }

  function finishSeek(item, e) {
    if (!item._seeking) return;
    if (e) seekFromEvent(item, e);
    item._seeking = false;
    clearTimeout(item._seekTimer);
    const t = item._visualTime;
    item._scrubUntil = performance.now() + 600;
    if (t == null) {
      drawWave(item);
      return;
    }
    if (item.audio.paused) {
      // Standing track: park playhead + warm cache progressively, no autoplay.
      // Visual stays at target until 'seeked' confirms it.
      item._pendingSeek = t;
      try {
        item.audio.preload = "auto";
      } catch {
        /* ignore */
      }
      commitSeek(item, t);
    } else {
      item._visualTime = null;
      commitSeek(item, t);
    }
    drawWave(item);
  }

  function buildAudio(spec, saved) {
    const el = document.createElement("article");
    el.className = "item item-audio";
    el.dataset.id = spec.id;
    el.innerHTML = `
      <div class="audio-title"></div>
      <div class="voice">
        <button class="play" type="button" aria-label="Play" aria-pressed="false" tabindex="-1">${PLAY_ICON}${PAUSE_ICON}</button>
        <div class="wave-hit"><canvas class="wave"></canvas></div>
        <span class="time">0:00 / 0:00</span>
        <span class="ext">${fileExt(spec.file)}</span>
        <a class="download" href="${assetUrl(spec.file)}" download="${spec.file.replace(/"/g, "")}" aria-label="Download" title="Download">${DOWNLOAD_ICON}</a>
      </div>
      <audio preload="metadata" playsinline></audio>
    `;
    const item = {
      id: spec.id,
      kind: "audio",
      file: spec.file,
      url: assetUrl(spec.file),
      x: saved?.x ?? spec.x,
      y: saved?.y ?? spec.y,
      z: saved?.z ?? ++zTop,
      scale: 1,
      el,
      titleEl: el.querySelector(".audio-title"),
      playBtn: el.querySelector(".play"),
      waveHit: el.querySelector(".wave-hit"),
      wave: el.querySelector(".wave"),
      timeEl: el.querySelector(".time"),
      audio: el.querySelector("audio"),
      peaks: spec.peaks || makePeaks(spec.file, BAR_COUNT),
      duration: spec.duration || 0,
      waveCtx: null,
    };
    item.waveCtx = item.wave.getContext("2d");
    item.el.draggable = false;
    item.playBtn.draggable = false;
    item.audio.preload = "metadata";
    item.titleEl.textContent = spec.title;
    updateTime(item);
    item.audio.src = item.url;
    item.audio.controls = false;

    const stopGhost = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    item.el.addEventListener("dragstart", stopGhost);
    item.playBtn.addEventListener("dragstart", stopGhost);
    item.waveHit.addEventListener("dragstart", stopGhost);
    item.el.addEventListener("selectstart", stopGhost);

    const dl = el.querySelector(".download");
    dl.addEventListener("pointerdown", (e) => e.stopPropagation());
    dl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      saveFromCache(item);
    });

    item.playBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      item._playArmed = { x: e.clientX, y: e.clientY };
      try {
        item.playBtn.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });
    item.playBtn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const armed = item._playArmed;
      item._playArmed = null;
      try {
        item.playBtn.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!armed || item._seeking) return;
      if (Math.hypot(e.clientX - armed.x, e.clientY - armed.y) > 10) return;
      togglePlay(item);
    });
    item.playBtn.addEventListener("pointercancel", () => {
      item._playArmed = false;
    });
    item.playBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    item.waveHit.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      item._playArmed = null;
      item._seeking = true;
      try {
        item.waveHit.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      seekFromEvent(item, e);
    });
    item.waveHit.addEventListener("pointermove", (e) => {
      if (!item._seeking) return;
      e.preventDefault();
      seekFromEvent(item, e);
    });
    const endSeek = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        item.waveHit.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      finishSeek(item, e);
    };
    item.waveHit.addEventListener("pointerup", endSeek);
    item.waveHit.addEventListener("pointercancel", endSeek);
    item.waveHit.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    item.waveHit.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    item.audio.addEventListener("loadedmetadata", () => {
      const d = item.audio.duration;
      if (!item.duration && Number.isFinite(d) && d > 0) {
        item.duration = d;
        updateTime(item);
        drawWave(item);
      }
      if (item._pendingSeek != null) {
        try {
          item.audio.currentTime = item._pendingSeek;
        } catch {
          /* still not ready — stays parked visually */
        }
        drawWave(item);
      }
    });
    item.audio.addEventListener("timeupdate", () => {
      if (!liveRaf) drawWave(item);
    });
    item.audio.addEventListener("seeking", () => {
      drawWave(item);
    });    item.audio.addEventListener("seeked", () => {
      item._visualTime = null;
      updateTime(item);
      drawWave(item);
    });
    item.audio.addEventListener("progress", () => {
      if (!liveRaf) drawWave(item);
    });
    const setHungry = (v) => {
      setAudioHungry(v);
      item.playBtn.classList.toggle("is-waiting", v);
    };
    item.audio.addEventListener("waiting", () => setHungry(true));
    item.audio.addEventListener("seeking", () => setHungry(true));
    item.audio.addEventListener("playing", () => setHungry(false));
    item.audio.addEventListener("canplay", () => setHungry(false));
    item.audio.addEventListener("pause", () => setHungry(false));
    item.audio.addEventListener("ended", () => setHungry(false));
    item.audio.addEventListener("error", () => setHungry(false));
    item.audio.addEventListener("pause", () => {
      if (item._seeking || performance.now() < (item._scrubUntil || 0)) return;
      item.playBtn.setAttribute("aria-pressed", "false");
      drawWave(item);
    });
    item.audio.addEventListener("ended", () => {
      item.playBtn.setAttribute("aria-pressed", "false");
      item.audio.currentTime = 0;
      drawWave(item);
    });


    world.appendChild(el);
    items.set(item.id, item);
    placeItem(item);
    drawWave(item);
    return item;
  }

  function buildImage(spec, saved) {
    const el = document.createElement("article");
    el.className = "item item-image";
    el.dataset.id = spec.id;
    el.innerHTML = `<img alt="" draggable="false" class="is-blur"><svg class="resize" viewBox="0 0 28 28" aria-hidden="true"><path class="resize-outline" d="M28 0A28 28 0 0 1 0 28"/><path class="resize-line" d="M28 0A28 28 0 0 1 0 28"/></svg>`;
    const img = el.querySelector("img");
    const fullUrl = assetUrl(spec.file);
    const midUrl = spec.mid ? assetUrl(spec.mid) : fullUrl;
    const thumbUrl = spec.thumb ? assetUrl(spec.thumb) : assetUrl(thumbFile(spec.file));
    const unblur = () => img.classList.remove("is-blur");
    img.decoding = "async";
    img.setAttribute("fetchpriority", "high");
    img.src = thumbUrl;
    img.alt = titleFromFile(spec.file);
    watchFull(el, () => {
      enqueueFull(
        midUrl,
        () => {
          swapWhenDecoded(img, midUrl, () => {
            unblur();
            setTimeout(() => {
              enqueueFull(
                fullUrl,
                () => swapWhenDecoded(img, fullUrl, () => {}),
                () => {},
              );
            }, 6000);
          });
        },
        unblur,
      );
    });
    const item = {
      id: spec.id,
      kind: "image",
      file: spec.file,
      x: saved?.x ?? spec.x,
      y: saved?.y ?? spec.y,
      z: saved?.z ?? ++zTop,
      baseW: spec.baseW,
      scale: saved?.scale ?? spec.scale ?? 1,
      el,
      img,
      resize: el.querySelector(".resize"),
    };
    world.appendChild(el);
    items.set(item.id, item);
    placeItem(item);
    return item;
  }

  function buildSaveCard(spec, saved) {
    const el = document.createElement("article");
    el.className = "item item-action";
    el.dataset.id = spec.id;
    el.innerHTML = `<div class="action-title">SHARED CANVAS</div>
      <div class="action-sub">positions + comments, for everyone</div>
      <button class="card-btn" type="button">Save for all</button>
      <div class="action-status">not saved yet</div>`;
    const item = {
      id: spec.id,
      kind: "action",
      x: saved?.x ?? spec.x,
      y: saved?.y ?? spec.y,
      z: saved?.z ?? ++zTop,
      scale: 1,
      el,
      statusEl: el.querySelector(".action-status"),
      btn: el.querySelector(".card-btn"),
    };
    item.btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    item.btn.addEventListener("click", (e) => {
      e.stopPropagation();
      pushLayout(item);
    });
    world.appendChild(el);
    items.set(item.id, item);
    placeItem(item);
    return item;
  }

  function authorName() {
    try {
      return localStorage.getItem("laditeo.art/music.author") || "anon";
    } catch {
      return "anon";
    }
  }

  function isMine(item) {
    return !item.owner || item.owner === myUid();
  }

  // --- Славянский Круголет (упрощённо: сутки с 18:00, Новолетие ~22.09) ---
  const KOLO_U = ["", "А", "В", "Г", "Д", "Є", "Ѕ", "Ꙁ", "И", "Ѳ"];
  const KOLO_T = ["", "І", "К", "Л", "М", "Н", "Ѯ", "О", "П", "Ч"];
  const KOLO_H = ["", "Р", "С", "Т", "У", "Ф", "Х", "Ѱ", "Ѡ", "Ц"];
  const KOLO_MONTHS = [
    "Рамхатъ", "Айлѣтъ", "Бейлѣтъ", "Гэйлетъ", "Дайлѣтъ",
    "Эйлѣтъ", "Вэйлетъ", "Хейлѣтъ", "Тайлѣтъ",
  ];

  function koloTriad(t) {
    return (
      KOLO_H[Math.floor(t / 100)] + KOLO_T[Math.floor((t % 100) / 10)] + KOLO_U[t % 10]
    );
  }

  function koloNum(n) {
    n = Math.floor(n);
    if (!(n > 0)) return "0";
    let out = "";
    let k = 0;
    while (n > 0) {
      const g = n % 1000;
      if (g) out = "҂".repeat(k) + koloTriad(g) + out;
      n = Math.floor(n / 1000);
      k++;
    }
    return out + "҄";
  }

  function koloDayStart(date) {
    const y = date.getFullYear();
    const jan = new Date(y, 0, 1).getTimezoneOffset();
    const jul = new Date(y, 6, 1).getTimezoneOffset();
    return date.getTimezoneOffset() < Math.max(jan, jul) ? 19 : 18;
  }

  function koloStr(date) {
    const startH = koloDayStart(date);
    const d = new Date(date.getTime());
    if (d.getHours() < startH) d.setDate(d.getDate() - 1);
    const gy = d.getFullYear();
    const newYear = d.getMonth() > 8 || (d.getMonth() === 8 && d.getDate() >= 22);
    const sy = newYear ? gy + 5509 : gy + 5508;
    const start = new Date(newYear ? gy : gy - 1, 8, 22, 12, 0, 0, 0);
    const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    let day = Math.round((noon - start) / 86400000) + 1;
    const lens = sy % 16 === 0
      ? [41, 41, 41, 41, 41, 41, 41, 41, 41]
      : [41, 40, 41, 40, 41, 40, 41, 40, 41];
    let m = 0;
    while (m < 8 && day > lens[m]) {
      day -= lens[m];
      m++;
    }
    const base = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(), startH, 0, 0, 0,
    );
    if (date < base) base.setDate(base.getDate() - 1);
    const el = date - base;
    const hour = (Math.floor(el / 5400000) + 15) % 16 + 1;
    const inHour = el % 5400000;
    const part = Math.min(144, Math.floor(inHour / 37500) + 1);
    const mig = Math.floor(((inHour % 37500) * 70917120) / 37500) % 70917120;
    return (
      `${koloNum(sy)} ⁖ ${koloNum(m + 1)} ⁖ ` +
      `${koloNum(day)} ⁖ ${koloNum(hour)} ⁖ ` +
      `${koloNum(part)} ⁖ ${koloNum(mig)}`
    );
  }

  function paintComment(item) {
    item.el.classList.toggle("mine", isMine(item));
    const q = (s) => item.el.querySelector(s);
    q(".comment-name").textContent = item.name || "anon";
    q(".comment-text").textContent = item.text || "(empty — tap \u270e to edit)";
    const d = new Date((item.ts || 0) * 1000);
    const timeEl = q(".comment-time");
    timeEl.textContent = "";
    if (item.ts) {
      timeEl.textContent =
        d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5) + " ";
      const k = document.createElement("span");
      k.className = "kolo";
      k.textContent = "⁖ " + koloStr(d);
      timeEl.appendChild(k);
    }
  }

  function openEditor(item) {
    const q = (s) => item.el.querySelector(s);
    q(".cedit-name").value = item.name || "anon";
    q(".cedit-text").value = item.text || "";
    q(".comment-view").hidden = true;
    q(".comment-editor").hidden = false;
    item.el.classList.add("show-tools");
    setTimeout(() => q(".cedit-text").focus({ preventScroll: true }), 50);
  }

  function commentAct(item, act) {
    const q = (s) => item.el.querySelector(s);
    if ((act === "edit" || act === "del") && !isMine(item)) return;
    if (act === "edit") {
      openEditor(item);
    } else if (act === "cancel") {
      q(".comment-view").hidden = false;
      q(".comment-editor").hidden = true;
    } else if (act === "save") {
      item.name = q(".cedit-name").value.trim().slice(0, 40) || "anon";
      item.text = q(".cedit-text").value.trim().slice(0, 1000);
      item.updatedAt = Date.now();
      try {
        localStorage.setItem("laditeo.art/music.author", item.name);
      } catch {
        /* ignore */
      }
      paintComment(item);
      q(".comment-view").hidden = false;
      q(".comment-editor").hidden = true;
      scheduleSave();
      const card = items.get("save-all");
      pushLayout(card || null);
    } else if (act === "del") {
      if (!window.confirm("Delete this comment for everyone?")) return;
      item.el.remove();
      items.delete(item.id);
      scheduleSave();
      const card = items.get("save-all");
      pushLayout(card || null);
    }
  }

  function buildComment(c) {
    const el = document.createElement("article");
    el.className = "item item-comment";
    el.dataset.id = c.cid;
    el.innerHTML = `<div class="comment-tools">
        <button class="tool-btn" type="button" data-act="edit" title="Edit" aria-label="Edit">\u270e</button>
        <button class="tool-btn" type="button" data-act="del" title="Delete" aria-label="Delete">\u00d7</button>
      </div>
      <div class="comment-view">
        <div class="comment-name"></div>
        <div class="comment-text"></div>
        <div class="comment-time"></div>
      </div>
      <div class="comment-editor" hidden>
        <input class="cedit-name" maxlength="40" placeholder="name" autocomplete="off">
        <textarea class="cedit-text" rows="3" maxlength="1000" placeholder="comment"></textarea>
        <div class="cedit-row">
          <button class="tool-btn wide" type="button" data-act="save">save</button>
          <button class="tool-btn wide" type="button" data-act="cancel">cancel</button>
        </div>
      </div>`;
    const item = {
      id: c.cid,
      kind: "comment",
      name: c.name || "anon",
      text: c.text || "",
      ts: c.ts || Math.floor(Date.now() / 1000),
      updatedAt: c.updatedAt || 0,
      owner: c.owner || "",
      x: Number.isFinite(+c.x) ? +c.x : 0,
      y: Number.isFinite(+c.y) ? +c.y : 0,
      z: Number.isFinite(+c.z) ? +c.z : ++zTop,
      scale: 1,
      el,
    };
    paintComment(item);
    el.querySelectorAll("button").forEach((b) => {
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        commentAct(item, b.dataset.act);
      });
    });
    let downPos = null;
    el.addEventListener("pointerdown", (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener("pointerup", (e) => {
      if (!downPos) return;
      const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      downPos = null;
      if (moved < 10 && !e.target.closest("button, input, textarea") && isMine(item)) {
        el.classList.toggle("show-tools");
      }
    });
    world.appendChild(el);
    items.set(item.id, item);
    placeItem(item);
    return item;
  }

  const FAB_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12 3.2C6.8 3.2 2.8 6.7 2.8 11c0 2.5 1.4 4.7 3.5 6.1L5 21.2l4.3-1.7c.9.3 1.8.4 2.7.4 5.2 0 9.2-3.6 9.2-7.9S17.2 3.2 12 3.2z"/><path d="M12 8.2v5.6M9.2 11h5.6" stroke="rgb(0,158,172)" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function buildChrome() {
    if (document.querySelector(".fab")) return;
    const fab = document.createElement("button");
    fab.className = "fab";
    fab.type = "button";
    fab.title = "New comment";
    fab.setAttribute("aria-label", "New comment");
    fab.innerHTML = FAB_SVG;
    fab.addEventListener("click", () => {
      const r = stage.getBoundingClientRect();
      const wpt = screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
      const now = Date.now();
      const item = buildComment({
        cid: "c" + now.toString(36),
        owner: myUid(),
        name: authorName(),
        text: "",
        x: Math.round(wpt.x - 150),
        y: Math.round(wpt.y - 60),
        z: ++zTop,
        ts: Math.floor(now / 1000),
        updatedAt: now,
      });
      bringFront(item);
      scheduleSave();
      scheduleSharedSave();
      openEditor(item);
    });
    document.body.appendChild(fab);
    if (!document.querySelector(".sync")) {
      const sync = document.createElement("div");
      sync.className = "sync";
      sync.hidden = true;
      sync.innerHTML = `<span class="sync-ring" aria-hidden="true"></span><span class="sync-text"></span>`;
      document.body.appendChild(sync);
    }
    bindDropZone();
  }

  function bindDropZone() {
    let overlay = null;

    function showOverlay() {
      if (overlay) return;
      overlay = document.createElement("div");
      overlay.className = "drop-overlay";
      overlay.innerHTML = '<div class="drop-overlay-inner"><span class="drop-icon" aria-hidden="true">▼</span><span class="drop-text">Drop files here</span><span class="drop-hint">images + audio → music page</span></div>';
      document.body.appendChild(overlay);
    }

    function hideOverlay() {
      if (!overlay) return;
      overlay.remove();
      overlay = null;
    }

    // Chrome/Brave need on* assignments on document for reliable capture
    document.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      if (!overlay) showOverlay();
      return false;
    };

    document.ondragenter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showOverlay();
      return false;
    };

    document.ondragleave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rel = e.relatedTarget || e.target;
      if (rel && document.contains(rel)) return;
      hideOverlay();
      return false;
    };

    document.ondrop = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideOverlay();
      const files = e.dataTransfer?.files;
      if (!files || !files.length) return;
      const accepted = ["audio/flac", "audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/x-flac", "application/ogg", "image/jpeg", "image/png", "image/webp", "image/jpg"];
      let uploaded = 0;
      for (const file of files) {
        if (!accepted.includes(file.type)) continue;
        try {
          const buf = await file.arrayBuffer();
          const name = encodeURIComponent(file.name);
          const res = await fetch("/music-drop/" + name, {
            method: "PUT",
            body: buf,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          });
          if (res.ok) uploaded++;
        } catch {
          /* skip */
        }
      }
      if (uploaded) scheduleSharedSave();
      return false;
    };
  }

  function initItems(base, cat) {
    const store = loadStore();
    const storedItems = store?.items || {};
    const baseItems = (base && base.items) || {};
    const useServer =
      !!base && base.rev !== (store?.rev ?? -1) && Object.keys(baseItems).length > 0;
    serverRev = (base && base.rev) || store?.rev || 0;

    const byFile = new Map();
    for (const spec of FILES) {
      if (spec.file) byFile.set(spec.file, spec);
    }

    const audioSpecs = [];
    const imageSpecs = [];
    if (cat) {
      for (const t of cat.tracks || []) {
        const known = byFile.get(t.file);
        audioSpecs.push({
          id: (known && known.id) || slugify(t.file.replace(/\.[^.]+$/, "")),
          file: t.file,
          title: t.title || titleFromFile(t.file),
          duration: t.duration || 0,
          peaks: t.peaks && t.peaks.length ? t.peaks : null,
          kind: "audio",
          _known: known || null,
        });
      }
      for (const im of cat.images || []) {
        const known = byFile.get(im.file);
        imageSpecs.push({
          id: (known && known.id) || slugify(im.file.replace(/\.[^.]+$/, "")),
          file: im.file,
          mid: im.mid || null,
          thumb: im.thumb || null,
          kind: "image",
          baseW:
            (known && known.baseW) ||
            Math.max(280, Math.min(380, Math.round((im.w || 1000) / 5))),
          scale: 1,
          _known: known || null,
        });
      }
    } else {
      for (const spec of FILES) {
        if (spec.kind === "audio") {
          audioSpecs.push({ ...spec, title: spec.title || titleFromFile(spec.file) });
        } else if (spec.kind === "image") {
          imageSpecs.push({ ...spec });
        }
      }
    }

    const resolvePos = (spec) => {
      const st = storedItems[spec.id];
      const bs = baseItems[spec.id];
      if (bs && (useServer || !st)) return { x: bs.x, y: bs.y, z: bs.z };
      if (st) return { x: st.x, y: st.y, z: st.z };
      const kn = spec._known;
      if (kn && Number.isFinite(kn.x) && Number.isFinite(kn.y)) {
        return { x: kn.x, y: kn.y };
      }
      return null;
    };

    let audioY = -530;
    for (const s of audioSpecs) {
      const p = resolvePos(s);
      if (p) {
        s.x = p.x;
        s.y = p.y;
        s._z = p.z;
        audioY = Math.max(audioY, p.y);
      } else {
        audioY += 180;
        s.x = 80;
        s.y = audioY;
        s._z = undefined;
      }
    }
    let leftY = -740;
    let rightY = -740;
    let side = 1;
    for (const s of imageSpecs) {
      const p = resolvePos(s);
      if (p) {
        s.x = p.x;
        s.y = p.y;
        s._z = p.z;
        if (p.x < 80) leftY = Math.max(leftY, p.y + 340);
        else rightY = Math.max(rightY, p.y + 340);
      } else {
        side = 1 - side;
        if (side === 0) {
          s.x = -560;
          s.y = leftY;
          leftY += 400;
        } else {
          s.x = 560;
          s.y = rightY;
          rightY += 400;
        }
        s._z = undefined;
      }
    }

    for (const s of audioSpecs) {
      const it = buildAudio(s, { x: s.x, y: s.y, scale: 1, z: s._z });
      zTop = Math.max(zTop, it.z);
    }
    for (const s of imageSpecs) {
      const it = buildImage(s, { x: s.x, y: s.y, scale: 1, z: s._z });
      zTop = Math.max(zTop, it.z);
    }
    let comments = [];
    if (useServer && base.comments && base.comments.length) comments = base.comments;
    else if (store?.comments && store.comments.length) comments = store.comments;
    else if (base?.comments && base.comments.length) comments = base.comments;
    for (const c of comments) {
      if (!c || !c.cid || items.has(c.cid)) continue;
      const it = buildComment(c);
      zTop = Math.max(zTop, it.z);
    }
    if (useServer || !store) scheduleSave();
    if (store?.vp && Number.isFinite(store.vp.zoom)) {
      vp.x = store.vp.x;
      vp.y = store.vp.y;
      vp.zoom = clampZoom(store.vp.zoom);
      applyViewport();
    } else {
      Object.assign(vp, computeFitViewport());
      applyViewport();
    }
    const images = [...items.values()].filter((i) => i.kind === "image");
    Promise.all(
      images.map(
        (item) =>
          new Promise((resolve) => {
            if (item.img.complete && item.img.naturalWidth) resolve();
            else item.img.addEventListener("load", resolve, { once: true });
            item.img.addEventListener("error", resolve, { once: true });
          }),
      ),
    ).then(() => {
      if (!loadStore()?.vp) {
        Object.assign(vp, computeFitViewport());
        applyViewport();
      }
    });
  }

  function bindCamera() {
    const pointers = new Map();
    let mode = null;
    let pan = null;
    let drag = null;
    let resize = null;
    let rmb = null;
    let pinchStart = null;

    function setMode(next) {
      mode = next;
      stage.classList.toggle("is-panning", next === "pan");
      stage.classList.toggle("is-dragging", next === "drag");
      stage.classList.toggle("is-resizing", next === "resize");
      stage.classList.toggle("is-pinching", next === "pinch");
    }

    function itemFromTarget(target) {
      const node = target && target.closest ? target.closest(".item") : null;
      if (!node) return null;
      return items.get(node.dataset.id) || null;
    }

    function viewportPoint(clientX, clientY) {
      const r = stage.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    }

    function cancelItemGesture() {
      if (drag && drag.item) drag.item.el.classList.remove("is-held");
      drag = null;
      pan = null;
      resize = null;
      rmb = null;
    }

    function pinchFromPointers() {
      const pts = [...pointers.values()];
      if (pts.length < 2) {
        pinchStart = null;
        return;
      }
      const [first, second] = pts;
      const midpoint = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (!pinchStart) {
        cancelItemGesture();
        pinchStart = {
          x: vp.x,
          y: vp.y,
          zoom: vp.zoom,
          midpoint,
          distance,
        };
        setMode("pinch");
        return;
      }
      if (pinchStart.distance <= 0) return;
      const z = clampZoom(pinchStart.zoom * (distance / pinchStart.distance));
      const worldX = (pinchStart.midpoint.x - pinchStart.x) / pinchStart.zoom;
      const worldY = (pinchStart.midpoint.y - pinchStart.y) / pinchStart.zoom;
      vp.zoom = z;
      vp.x = midpoint.x - worldX * z;
      vp.y = midpoint.y - worldY * z;
      applyViewport();
    }

    let gestureZoom = null;
    const MAX_ZOOM_STEP = 8;
    const PAN_REST = 1600;
    const axisFree =
      typeof CSS !== "undefined" && CSS.supports && CSS.supports("scroll-axis-lock", "none");
    let panLock = false;
    let panAccX = 0;
    let panAccY = 0;
    let panFlushRaf = 0;
    let zoomAnim = { z: vp.zoom, fx: 0, fy: 0, raf: 0 };

    function restPanScroll() {
      panLock = true;
      stage.scrollLeft = PAN_REST;
      stage.scrollTop = PAN_REST;
      panLock = false;
    }

    function flushPanAcc() {
      panFlushRaf = 0;
      if (panAccX === 0 && panAccY === 0) return;
      vp.x -= panAccX;
      vp.y -= panAccY;
      panAccX = 0;
      panAccY = 0;
      applyViewport();
      scheduleSave();
    }

    function queuePan(dx, dy) {
      panAccX += dx;
      panAccY += dy;
      if (!panFlushRaf) panFlushRaf = requestAnimationFrame(flushPanAcc);
    }

    function tickZoom() {
      const target = zoomAnim.z;
      const next = vp.zoom + (target - vp.zoom) * 0.28;
      if (Math.abs(next - target) < 0.0005) {
        zoomAtClient(zoomAnim.fx, zoomAnim.fy, target, true);
        zoomAnim.raf = 0;
        scheduleSave();
        return;
      }
      zoomAtClient(zoomAnim.fx, zoomAnim.fy, next, true);
      zoomAnim.raf = requestAnimationFrame(tickZoom);
    }

    function queueZoom(clientX, clientY, nextZoom) {
      zoomAnim.fx = clientX;
      zoomAnim.fy = clientY;
      zoomAnim.z = clampZoom(nextZoom);
      if (!zoomAnim.raf) zoomAnim.raf = requestAnimationFrame(tickZoom);
    }

    function pinchZoomDelta(e) {
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= 320;
      if (!Number.isFinite(dy) || dy === 0) return 0;
      if (Math.abs(dy) > MAX_ZOOM_STEP) dy = MAX_ZOOM_STEP * Math.sign(dy);
      return -dy / 200;
    }

    function onWheel(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (gestureZoom != null) return;
        const dz = pinchZoomDelta(e);
        if (dz === 0) return;
        const from = zoomAnim.raf ? zoomAnim.z : vp.zoom;
        queueZoom(e.clientX, e.clientY, from * Math.exp(dz));
        return;
      }
      if (axisFree) return;
      e.preventDefault();
      queuePan(e.deltaX, e.deltaY);
    }

    function onStageScroll() {
      if (panLock) return;
      const dx = stage.scrollLeft - PAN_REST;
      const dy = stage.scrollTop - PAN_REST;
      if (dx === 0 && dy === 0) return;
      vp.x -= dx;
      vp.y -= dy;
      applyViewport();
      restPanScroll();
      scheduleSave();
    }

    function onGestureStart(e) {
      e.preventDefault();
      gestureZoom = vp.zoom;
      zoomAnim.z = vp.zoom;
      if (zoomAnim.raf) {
        cancelAnimationFrame(zoomAnim.raf);
        zoomAnim.raf = 0;
      }
    }

    function onGestureChange(e) {
      e.preventDefault();
      if (gestureZoom == null) gestureZoom = vp.zoom;
      zoomAtClient(e.clientX, e.clientY, gestureZoom * e.scale, true);
    }

    function onGestureEnd(e) {
      e.preventDefault();
      gestureZoom = null;
      zoomAnim.z = vp.zoom;
      scheduleSave();
    }

    function beginPan(e) {
      setMode("pan");
      pan = { x: e.clientX, y: e.clientY, vx: vp.x, vy: vp.y };
    }

    function beginDrag(item, e) {
      bringFront(item);
      item.el.classList.add("is-held");
      setMode("drag");
      const w = screenToWorld(e.clientX, e.clientY);
      drag = { item, dx: w.x - item.x, dy: w.y - item.y };
    }

    function beginResize(item, e) {
      bringFront(item);
      setMode("resize");
      resize = { item };
    }

    function onPointerDown(e) {
      const target = e.target;
      if (
        e.button !== 2 &&
        target.closest &&
        target.closest(".play, .wave-hit, .download, .card-btn, .tool-btn, input, textarea")
      ) {
        return;
      }
      if (e.pointerType === "touch") e.preventDefault();
      pointers.set(e.pointerId, viewportPoint(e.clientX, e.clientY));
      if (pointers.size >= 2) {
        e.preventDefault();
        pinchFromPointers();
        return;
      }
      if (e.button === 1) {
        e.preventDefault();
        beginPan(e);
        return;
      }
      if (e.button === 2) {
        rmb = { lastX: e.clientX, lastY: e.clientY };
        return;
      }
      if (e.button !== 0) return;
      e.preventDefault();
      const item = itemFromTarget(target);
      if (item && target.closest && target.closest(".resize")) {
        beginResize(item, e);
        return;
      }
      if (item) {
        beginDrag(item, e);
        return;
      }
      beginPan(e);
    }

    function onPointerMove(e) {
      if (pointers.has(e.pointerId)) {
        pointers.set(e.pointerId, viewportPoint(e.clientX, e.clientY));
        if (pointers.size >= 2) {
          e.preventDefault();
          pinchFromPointers();
          return;
        }
      }
      if (rmb) {
        const dx = e.clientX - rmb.lastX;
        const dy = e.clientY - rmb.lastY;
        rmb.lastX = e.clientX;
        rmb.lastY = e.clientY;
        const along = dx - dy;
        if (along !== 0) {
          zoomAtClient(e.clientX, e.clientY, vp.zoom * Math.exp(along * RMB_ZOOM_SPEED), true);
        }
        return;
      }
      if (mode === "pinch") return;
      for (const it of items.values()) {
        if (it.kind === "audio" && it._seeking) {
          seekFromEvent(it, e);
          return;
        }
      }
      if (resize) {
        const wpos = screenToWorld(e.clientX, e.clientY);
        const newW = Math.max(8, wpos.x - resize.item.x);
        resize.item.scale = clamp(newW / resize.item.baseW, 0.35, 3.2);
        placeItem(resize.item);
        return;
      }
      if (drag) {
        const wpos = screenToWorld(e.clientX, e.clientY);
        drag.item.x = wpos.x - drag.dx;
        drag.item.y = wpos.y - drag.dy;
        placeItem(drag.item);
        return;
      }
      if (pan) {
        vp.x = pan.vx + (e.clientX - pan.x);
        vp.y = pan.vy + (e.clientY - pan.y);
        applyViewport();
      }
    }

    function endPointer(e) {
      pointers.delete(e.pointerId);
      for (const it of items.values()) {
        if (it.kind === "audio" && it._seeking) finishSeek(it, e);
      }
      if (pointers.size >= 2) {
        pinchFromPointers();
        return;
      }
      if (pinchStart) {
        pinchStart = null;
        scheduleSave();
        setMode(null);
      }
      if (rmb && (e.button === 2 || e.type === "pointercancel")) rmb = null;
      if (drag && drag.item) drag.item.el.classList.remove("is-held");
      if (mode === "drag" || mode === "pan" || mode === "resize") {
        scheduleSave();
        if (mode === "drag" || mode === "resize") scheduleSharedSave();
        setMode(null);
      }
      drag = null;
      pan = null;
      resize = null;
    }

    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("scroll", onStageScroll, { passive: true });
    stage.addEventListener("gesturestart", onGestureStart, { passive: false });
    stage.addEventListener("gesturechange", onGestureChange, { passive: false });
    stage.addEventListener("gestureend", onGestureEnd, { passive: false });
    stage.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", endPointer, true);
    window.addEventListener("pointercancel", endPointer, true);
    window.addEventListener("resize", restPanScroll);
    window.addEventListener(
      "mousedown",
      (e) => {
        if (e.button === 1) e.preventDefault();
      },
      true,
    );
    stage.addEventListener("auxclick", (e) => {
      if (e.button === 1) e.preventDefault();
    });
    stage.addEventListener("contextmenu", (e) => e.preventDefault());
    stage.addEventListener("dragstart", (e) => e.preventDefault());
    stage.addEventListener("selectstart", (e) => e.preventDefault());
    restPanScroll();
  }

  Promise.all([loadServerLayout(), loadCatalog()]).then(
    ([base, cat]) => {
      try {
        initItems(base, cat);
      } catch (err) {
        console.warn("init failed, retrying local", err);
        initItems(null, null);
      }
      bindCamera();
      applyViewport();
      buildChrome();
    },
    () => {
      initItems(null, null);
      bindCamera();
      applyViewport();
      buildChrome();
    },
  );
})();
