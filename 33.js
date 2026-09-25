
// import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

	 // Soft-nav remount: kill previous fairy RAF / WebGL before re-init
	 if (window.__feyaDispose) {
		 try { window.__feyaDispose(); } catch (e) {}
	 }

	 //Scene
      var scene = new THREE.Scene();
	
	  

      //Camera
		var height = 500;
		var width = 500;
		var distance = 1000;
		var diag = Math.sqrt((height*height)+(width*width))
		var fov = 2 * Math.atan((diag) / (2 * distance)) * (180 / Math.PI); //Field of View
		var camera = new THREE.PerspectiveCamera(8, 1 / 1, 0.3, distance);
	
  
    camera.position.y = 0
    camera.position.x = 0
    camera.position.z = -90




      //Canvas
      var myCanvas = document.getElementById('myCanvas');
      if (!myCanvas) {
        console.error('[feya] #myCanvas missing — abort');
        throw new Error('[feya] #myCanvas missing');
      }

      //Renderer
      var renderer = new THREE.WebGLRenderer({
        antialias: false,
        canvas: myCanvas,
		alpha: true,
		powerPreference: 'high-performance'
      });


		//renderer.setClearColor(0x000000);
		// Low internal res + CSS upscale (no post filter) — cheap PS1 pixels
		var PS1_W = 488;
		var PS1_H = 488;
		renderer.setPixelRatio(1);
		renderer.setSize(PS1_W, PS1_H, false); // false = keep CSS size (stage fills canvas)
		renderer.setClearColor(0x000000, 0);
		renderer.shadowMap.enabled = true;
    	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		// Fixed look vs OS HDR on/off (r137: outputEncoding; SRGBColorSpace is newer)
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.0;
		if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
			renderer.outputColorSpace = THREE.SRGBColorSpace;
		} else if (THREE.sRGBEncoding !== undefined) {
			renderer.outputEncoding = THREE.sRGBEncoding;
		}

		//LIGHTS — brighter fill (PBR mats look dark on ambient-only)
		var light = new THREE.AmbientLight(0xffffff, 0);
		scene.add(light);
		var hemi = new THREE.HemisphereLight(0xffffff, 0xffe0d0, 0.71);
		hemi.position.set(0, 10, 0);
		scene.add(hemi);
		var key = new THREE.DirectionalLight(0xffffff, 1.40);
		key.position.set(-40, 30, -60); // roughly from camera side
		scene.add(key);
		// rim / back-left lamp (viewer left = -X, behind = +Z)
		var back = new THREE.DirectionalLight(0xbfe0ff, 0.85);
		back.position.set(-70, 20, 95); // left + deep behind → contour rim
		scene.add(back);


	function feyaHsvToHex(h, s, v) {
		h = ((h % 360) + 360) % 360;
		s = Math.max(0, Math.min(100, s)) / 100;
		v = Math.max(0, Math.min(100, v)) / 100;
		var c = v * s;
		var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
		var m = v - c;
		var r = 0, g = 0, b = 0;
		if (h < 60) { r = c; g = x; }
		else if (h < 120) { r = x; g = c; }
		else if (h < 180) { g = c; b = x; }
		else if (h < 240) { g = x; b = c; }
		else if (h < 300) { r = x; b = c; }
		else { r = c; b = x; }
		function byte(n) {
			var k = Math.round((n + m) * 255);
			return ('0' + Math.max(0, Math.min(255, k)).toString(16)).slice(-2);
		}
		return '#' + byte(r) + byte(g) + byte(b);
	}
		// Debug sliders (right of canvas) — pick values, then tell me
		(function bindFeyaLightDebug() {
			var ambEl = document.getElementById('fld-amb');
			var hemiEl = document.getElementById('fld-hemi');
			var keyEl = document.getElementById('fld-key');
			var bkEl = document.getElementById('fld-bk');
			var lhEl = document.getElementById('fld-lh');
			var lsEl = document.getElementById('fld-ls');
			var lvEl = document.getElementById('fld-lv');
			var bhEl = document.getElementById('fld-bkH');
			var bsEl = document.getElementById('fld-bkS');
			var bvEl = document.getElementById('fld-bkV');
			if (!ambEl || !hemiEl || !keyEl) return;

			function setOut(id, text) {
				var o = document.getElementById(id);
				if (o) o.textContent = text;
			}
			function applyLitColor(hex) {
				var c = new THREE.Color(hex);
				light.color.copy(c);
				key.color.copy(c);
				hemi.color.copy(c);
				setOut('fld-color-val', hex.toLowerCase());
			}
			function applyBackColor(hex) {
				var c = new THREE.Color(hex);
				back.color.copy(c);
				setOut('fld-bkColor-val', hex.toLowerCase());
			}
			function sync() {
				light.intensity = parseFloat(ambEl.value);
				hemi.intensity = parseFloat(hemiEl.value);
				key.intensity = parseFloat(keyEl.value);
				if (bkEl) back.intensity = parseFloat(bkEl.value);
				setOut('fld-amb-val', light.intensity.toFixed(2));
				setOut('fld-hemi-val', hemi.intensity.toFixed(2));
				setOut('fld-key-val', key.intensity.toFixed(2));
				if (bkEl) setOut('fld-bk-val', back.intensity.toFixed(2));
				if (lhEl && lsEl && lvEl) {
					var h = parseFloat(lhEl.value);
					var s = parseFloat(lsEl.value);
					var v = parseFloat(lvEl.value);
					setOut('fld-lh-val', String(Math.round(h)));
					setOut('fld-ls-val', String(Math.round(s)));
					setOut('fld-lv-val', String(Math.round(v)));
					applyLitColor(feyaHsvToHex(h, s, v));
				} else {
					applyLitColor('#ffffff');
				}
				if (bhEl && bsEl && bvEl) {
					var bh = parseFloat(bhEl.value);
					var bs = parseFloat(bsEl.value);
					var bv = parseFloat(bvEl.value);
					setOut('fld-bkH-val', String(Math.round(bh)));
					setOut('fld-bkS-val', String(Math.round(bs)));
					setOut('fld-bkV-val', String(Math.round(bv)));
					applyBackColor(feyaHsvToHex(bh, bs, bv));
				}
			}
			ambEl.addEventListener('input', sync);
			hemiEl.addEventListener('input', sync);
			keyEl.addEventListener('input', sync);
			if (bkEl) bkEl.addEventListener('input', sync);
			if (lhEl) lhEl.addEventListener('input', sync);
			if (lsEl) lsEl.addEventListener('input', sync);
			if (lvEl) lvEl.addEventListener('input', sync);
			if (bhEl) bhEl.addEventListener('input', sync);
			if (bsEl) bsEl.addEventListener('input', sync);
			if (bvEl) bvEl.addEventListener('input', sync);
			sync();
		})();

		//OrbitControls
		controls = new THREE.OrbitControls(
			camera, renderer.domElement 
     );
	 // Original framing: look at origin from z=-90, FOV 8
	 controls.target.set(0, 0, 0);
	 controls.enableDamping = true;
	 var feyaCamMinDeg = 46;
	 var feyaCamMaxDeg = 85;
	 var feyaCamSoftDeg = 14; // soft slowdown band near edges
	 controls.maxPolarAngle = THREE.MathUtils.degToRad(feyaCamMaxDeg);
	 controls.minPolarAngle = THREE.MathUtils.degToRad(feyaCamMinDeg);
	 controls.polarSoftZone = THREE.MathUtils.degToRad(feyaCamSoftDeg);
	//  controls.maxAzimuthAngle = THREE.MathUtils.degToRad(20);
	//  controls.minAzimuthAngle = THREE.MathUtils.degToRad(-20);
	 controls.minDistance = 12;
	 controls.maxDistance = 300;
	 controls.enableRotate = true; 
	 controls.enablePan = false;
	 controls.enableDamping = true;
	 controls.dampingFactor = 0.14;
	 controls.rotateSpeed = 0.48; // Android-friendly; was 0.9 (too twitchy)
	 controls.enableZoom = false;
	 camera.position.set(0, 0, -90);
	 camera.fov = 8;
	 camera.updateProjectionMatrix();
	 controls.update();
	 // Android: keep page from stealing the drag
	 if (renderer && renderer.domElement) {
		renderer.domElement.style.touchAction = 'none';
		renderer.domElement.style.userSelect = 'none';
		renderer.domElement.style.webkitUserSelect = 'none';
	 }

	 // Pinch dolly-zoom: one z drives FOV + distance between panel limits
	 var feyaZoomMin = 0;
	 var feyaZoomMax = 1;
	 var feyaZoomSoft = 0.12;
	 var feyaZoomSpringTo = null;
	 var feyaFovAt0 = 22;  // wide (fov↑)
	 var feyaFovAt1 = 5;   // tele (fov↓)
	 var feyaDistAt0 = 32.3; // near
	 var feyaDistAt1 = 143.8; // far
	 var feyaZoomSens = 1.25;
	 var feyaCamY = 0;
	 var feyaCamTilt = 90; // polar deg — 90 = horizontal
	 var _feyaZoomOff = new THREE.Vector3();
	 var feyaZoom = (8 - feyaFovAt0) / (feyaFovAt1 - feyaFovAt0); // ~0.82, matches FOV 8
	 function syncOrbitDistanceLimits() {
		var lo = Math.min(feyaDistAt0, feyaDistAt1);
		var hi = Math.max(feyaDistAt0, feyaDistAt1);
		controls.minDistance = Math.max(8, lo * 0.85);
		controls.maxDistance = hi * 1.15;
	 }
	 syncOrbitDistanceLimits();
	 function applyFeyaZoom(z) {
		feyaZoom = z;
		var fov = feyaFovAt0 + (feyaFovAt1 - feyaFovAt0) * z;
		var dist = feyaDistAt0 + (feyaDistAt1 - feyaDistAt0) * z;
		dist = Math.max(controls.minDistance, Math.min(controls.maxDistance, dist));
		camera.fov = fov;
		camera.updateProjectionMatrix();
		_feyaZoomOff.copy(camera.position).sub(controls.target);
		if (_feyaZoomOff.lengthSq() < 1e-8) _feyaZoomOff.set(0, 0, -1);
		_feyaZoomOff.setLength(dist);
		camera.position.copy(controls.target).add(_feyaZoomOff);
	 }
	 function setFeyaCamY(y) {
		feyaCamY = y;
		_feyaZoomOff.copy(camera.position).sub(controls.target);
		controls.target.set(controls.target.x, y, controls.target.z);
		camera.position.copy(controls.target).add(_feyaZoomOff);
	 }
	 function setFeyaCamTilt(deg) {
		feyaCamTilt = deg;
		var phi = THREE.MathUtils.degToRad(deg);
		// Panel may look flatter/steeper than orbit soft clamps — widen to fit
		controls.minPolarAngle = Math.min(THREE.MathUtils.degToRad(feyaCamMinDeg), phi);
		controls.maxPolarAngle = Math.max(THREE.MathUtils.degToRad(feyaCamMaxDeg), phi);
		var dist = camera.position.distanceTo(controls.target);
		var theta = controls.getAzimuthalAngle ? controls.getAzimuthalAngle() : 0;
		camera.position.set(
			controls.target.x + dist * Math.sin(phi) * Math.sin(theta),
			controls.target.y + dist * Math.cos(phi),
			controls.target.z + dist * Math.sin(phi) * Math.cos(theta)
		);
		controls.update();
	 }
	 function rubberZoom(raw) {
		if (raw < feyaZoomMin) {
			var o = feyaZoomMin - raw;
			return feyaZoomMin - feyaZoomSoft * (1 - Math.exp(-o / feyaZoomSoft));
		}
		if (raw > feyaZoomMax) {
			var o2 = raw - feyaZoomMax;
			return feyaZoomMax + feyaZoomSoft * (1 - Math.exp(-o2 / feyaZoomSoft));
		}
		return raw;
	 }
	 // Do NOT applyFeyaZoom on load — keep original camera pose until pinch / panel edit
	 (function bindFeyaZoomPinch() {
		var el = renderer && renderer.domElement;
		if (!el) return;
		var active = false;
		var startPinch = 0;
		var startZoom = feyaZoom;

		function touchDist(ev) {
			if (!ev.touches || ev.touches.length < 2) return 0;
			var a = ev.touches[0];
			var b = ev.touches[1];
			return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
		}
		function onStart(ev) {
			if (!ev.touches || ev.touches.length !== 2) return;
			active = true;
			feyaZoomSpringTo = null;
			startPinch = touchDist(ev);
			startZoom = feyaZoom;
			if (ev.cancelable) ev.preventDefault();
		}
		function onMove(ev) {
			if (!active || !ev.touches || ev.touches.length < 2) return;
			if (ev.cancelable) ev.preventDefault();
			var d = touchDist(ev);
			if (startPinch < 10 || d < 10) return;
			var raw = startZoom + Math.log(d / startPinch) / Math.LN2 * feyaZoomSens;
			applyFeyaZoom(rubberZoom(raw));
		}
		function onEnd(ev) {
			if (ev.touches && ev.touches.length >= 2) {
				startPinch = touchDist(ev);
				startZoom = feyaZoom;
				return;
			}
			if (!active) return;
			active = false;
			var clamped = Math.max(feyaZoomMin, Math.min(feyaZoomMax, feyaZoom));
			if (Math.abs(clamped - feyaZoom) > 0.004) feyaZoomSpringTo = clamped;
			else feyaZoomSpringTo = null;
		}
		el.addEventListener('touchstart', onStart, { passive: false });
		el.addEventListener('touchmove', onMove, { passive: false });
		el.addEventListener('touchend', onEnd, { passive: false });
		el.addEventListener('touchcancel', onEnd, { passive: false });
	 })();
	 function tickFeyaFovSpring() {
		if (feyaZoomSpringTo == null) return;
		var next = feyaZoom + (feyaZoomSpringTo - feyaZoom) * 0.22;
		if (Math.abs(feyaZoomSpringTo - next) < 0.004) {
			applyFeyaZoom(feyaZoomSpringTo);
			feyaZoomSpringTo = null;
		} else {
			applyFeyaZoom(next);
		}
	 }

	 // Anim rate (mutable; top-tray speed slider). Wall-clock based — Hz-independent.
	var FEYA_FIXED_DT = 1 / 60;
	var FEYA_MAX_FRAME_DT = 0.1;
	var FEYA_ANIM_RATE = 1; // 1× realtime
	var feyaAnimAcc = 0;

	 // Top panel: FOV/zoom limits + height + tilt
	 (function bindFeyaCamPanel() {
		var panel = document.getElementById('feya-cam-panel');
		if (!panel) return;
		var fovLoEl = document.getElementById('fld-fovLo');
		var fovHiEl = document.getElementById('fld-fovHi');
		var zoomLoEl = document.getElementById('fld-zoomLo');
		var zoomHiEl = document.getElementById('fld-zoomHi');
		var yEl = document.getElementById('fld-camY');
		var tiltEl = document.getElementById('fld-camTilt');
		var speedEl = document.getElementById('fld-animSpeed');
		var KEY = 'laditeo.feyaCamPanel.v2';
		function setOut(id, text) {
			var o = document.getElementById(id);
			if (o) o.textContent = text;
		}
		function readLimits() {
			var flo = parseFloat(fovLoEl.value);
			var fhi = parseFloat(fovHiEl.value);
			if (flo > fhi - 1) {
				if (document.activeElement === fovLoEl) {
					fhi = flo + 1;
					fovHiEl.value = String(fhi);
				} else {
					flo = fhi - 1;
					fovLoEl.value = String(flo);
				}
			}
			var zlo = parseFloat(zoomLoEl.value);
			var zhi = parseFloat(zoomHiEl.value);
			if (zlo > zhi - 1) {
				if (document.activeElement === zoomLoEl) {
					zhi = zlo + 1;
					zoomHiEl.value = String(zhi);
				} else {
					zlo = zhi - 1;
					zoomLoEl.value = String(zlo);
				}
			}
			// fov↑ = wide end (z=0), fov↓ = tele (z=1)
			feyaFovAt0 = fhi;
			feyaFovAt1 = flo;
			feyaDistAt0 = zlo;
			feyaDistAt1 = zhi;
			syncOrbitDistanceLimits();
			setOut('fld-fovLo-val', flo.toFixed(1) + '°');
			setOut('fld-fovHi-val', fhi.toFixed(1) + '°');
			setOut('fld-zoomLo-val', zlo.toFixed(1));
			setOut('fld-zoomHi-val', zhi.toFixed(1));
		}
		function onLimits() {
			readLimits();
			applyFeyaZoom(feyaZoom);
		}
		function onY() {
			var y = parseFloat(yEl.value);
			setFeyaCamY(y);
			setOut('fld-camY-val', y.toFixed(1));
		}
		function onTilt() {
			var d = parseFloat(tiltEl.value);
			setFeyaCamTilt(d);
			setOut('fld-camTilt-val', d.toFixed(1) + '°');
		}
		function onSpeed() {
			if (!speedEl) return;
			var s = parseFloat(speedEl.value);
			if (!isFinite(s)) s = 1;
			if (s < 0) s = 0;
			if (s > 4) s = 4;
			FEYA_ANIM_RATE = s;
			setOut('fld-animSpeed-val', s.toFixed(2) + '×');
		}
		function collect() {
			return {
				v: 1,
				fovLo: fovLoEl.value,
				fovHi: fovHiEl.value,
				zoomLo: zoomLoEl.value,
				zoomHi: zoomHiEl.value,
				camY: yEl.value,
				camTilt: tiltEl.value,
				animSpeed: speedEl ? speedEl.value : '1',
				zoom: feyaZoom
			};
		}
		var statusEl = document.getElementById('fld-cam-save-status');
		var saveWrap = document.getElementById('fld-cam-save');
		function setStatus(state, text) {
			if (saveWrap) saveWrap.dataset.state = state;
			if (statusEl) statusEl.textContent = text;
		}
		function applySaved(data) {
			if (!data) return;
			if (data.fovLo != null) fovLoEl.value = String(data.fovLo);
			if (data.fovHi != null) fovHiEl.value = String(data.fovHi);
			if (data.zoomLo != null) zoomLoEl.value = String(data.zoomLo);
			if (data.zoomHi != null) zoomHiEl.value = String(data.zoomHi);
			if (data.camY != null) yEl.value = String(data.camY);
			if (data.camTilt != null) tiltEl.value = String(data.camTilt);
			if (data.animSpeed != null && speedEl) speedEl.value = String(data.animSpeed);
			if (typeof data.zoom === 'number' && isFinite(data.zoom)) feyaZoom = data.zoom;
			readLimits();
			applyFeyaZoom(feyaZoom);
			onY();
			onTilt();
			onSpeed();
		}
		var saved = null;
		try {
			var raw = localStorage.getItem(KEY);
			if (raw) saved = JSON.parse(raw);
		} catch (e) {}
		if (saved) {
			applySaved(saved);
		} else {
			readLimits();
			setOut('fld-camY-val', '0');
			setOut('fld-camTilt-val', '90°');
			onSpeed();
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
		fovLoEl.addEventListener('input', function () { onLimits(); scheduleSave(); });
		fovHiEl.addEventListener('input', function () { onLimits(); scheduleSave(); });
		zoomLoEl.addEventListener('input', function () { onLimits(); scheduleSave(); });
		zoomHiEl.addEventListener('input', function () { onLimits(); scheduleSave(); });
		yEl.addEventListener('input', function () { onY(); scheduleSave(); });
		tiltEl.addEventListener('input', function () { onTilt(); scheduleSave(); });
		if (speedEl) speedEl.addEventListener('input', function () { onSpeed(); scheduleSave(); });
		// persist zoom after pinch settles
		var _apply = applyFeyaZoom;
		applyFeyaZoom = function (z) {
			_apply(z);
			scheduleSave();
		};
		// seed defaults like light/globe panels
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

	(function bindFeyaCamDebug() {
		var minEl = document.getElementById('fld-camMin');
		var maxEl = document.getElementById('fld-camMax');
		var fillEl = document.getElementById('fld-cam-fill');
		var outEl = document.getElementById('fld-cam-val');
		if (!minEl || !maxEl) return;
		var GAP = 5;
		var RMIN = parseFloat(minEl.min);
		var RMAX = parseFloat(minEl.max);
		function sync(from) {
			var lo = Math.round(parseFloat(minEl.value));
			var hi = Math.round(parseFloat(maxEl.value));
			if (lo > hi - GAP) {
				if (from === 'min') { hi = lo + GAP; maxEl.value = String(hi); }
				else { lo = hi - GAP; minEl.value = String(lo); }
			}
			feyaCamMinDeg = lo;
			feyaCamMaxDeg = hi;
			controls.minPolarAngle = THREE.MathUtils.degToRad(lo);
			controls.maxPolarAngle = THREE.MathUtils.degToRad(hi);
			controls.polarSoftZone = THREE.MathUtils.degToRad(feyaCamSoftDeg);
			if (outEl) outEl.textContent = lo + '–' + hi + '°';
			// fill between thumbs (vertical track: top = max deg visually via rtl)
			if (fillEl) {
				var span = RMAX - RMIN;
				var topPct = ((RMAX - hi) / span) * 100;
				var botPct = ((lo - RMIN) / span) * 100;
				fillEl.style.top = topPct + '%';
				fillEl.style.bottom = botPct + '%';
			}
		}
		minEl.addEventListener('input', function () { sync('min'); });
		maxEl.addEventListener('input', function () { sync('max'); });
		// raise z-index of the thumb being dragged
		minEl.addEventListener('pointerdown', function () { minEl.style.zIndex = 3; maxEl.style.zIndex = 2; });
		maxEl.addEventListener('pointerdown', function () { maxEl.style.zIndex = 3; minEl.style.zIndex = 2; });
		sync('max');
	})();

 	//  controls.addEventListener('end', () => {
 	//  controls.reset();});
   

		


		// --- PS1 look: low drawing-buffer + coarse vertex snap (no post filter) ---
	// Snap grid << render res → wobbly “упоротый” PS1 vertex crawl
	var SNAP_W = 84;
	var SNAP_H = 84;
	var uSnap = { value: new THREE.Vector2(SNAP_W, SNAP_H) };
	var feyaEmissiveMats = [];

	// Debug: pixelization res + vertex snap grid
	(function bindFeyaPs1Debug() {
		var resEl = document.getElementById('fld-res');
		var snapEl = document.getElementById('fld-snap');
		if (!resEl || !snapEl) return;
		function setOut(id, text) {
			var o = document.getElementById(id);
			if (o) o.textContent = text;
		}
		function syncRes() {
			var r = Math.max(16, Math.round(parseFloat(resEl.value)));
			PS1_W = r;
			PS1_H = r;
			renderer.setSize(PS1_W, PS1_H, false);
			setOut('fld-res-val', String(r));
		}
		function syncSnap() {
			var s = Math.max(8, Math.round(parseFloat(snapEl.value)));
			SNAP_W = s;
			SNAP_H = s;
			uSnap.value.set(s, s);
			setOut('fld-snap-val', String(s));
		}
		resEl.addEventListener('input', syncRes);
		snapEl.addEventListener('input', syncSnap);
		// init from current
		resEl.value = String(PS1_W);
		snapEl.value = String(SNAP_W);
		syncRes();
		syncSnap();
	})();
	function applyFeyaEmissive(intensity) {
		for (var i = 0; i < feyaEmissiveMats.length; i++) {
			var m = feyaEmissiveMats[i];
			if (!m) continue;
			m.emissiveIntensity = intensity;
			// older three: scale emissive color if no emissiveIntensity
			if (!('emissiveIntensity' in THREE.MeshStandardMaterial.prototype) && m.emissive) {
				m.emissive.setRGB(intensity, intensity, intensity);
			}
			m.needsUpdate = true;
		}
		var o = document.getElementById('fld-emis-val');
		if (o) o.textContent = intensity.toFixed(2);
	}

	(function bindFeyaEmisDebug() {
		var el = document.getElementById('fld-emis');
		if (!el) return;
		el.addEventListener('input', function () {
			applyFeyaEmissive(parseFloat(el.value));
		});
	})();


	function patchPS1Snap(mat) {
		if (!mat || mat.userData.ps1Snap) return;
		mat.userData.ps1Snap = true;
		var prev = mat.onBeforeCompile;
		mat.onBeforeCompile = function (shader) {
			if (typeof prev === 'function') prev(shader);
			shader.uniforms.uSnap = uSnap;
			shader.vertexShader = 'uniform vec2 uSnap;\n' + shader.vertexShader;
			shader.vertexShader = shader.vertexShader.replace(
				'#include <project_vertex>',
				[
					'#include <project_vertex>',
					'// PS1 vertex snap to low-res pixel grid',
					'gl_Position.xy = gl_Position.xy / gl_Position.w;',
					'gl_Position.xy = floor(gl_Position.xy * uSnap + 0.5) / uSnap;',
					'gl_Position.xy *= gl_Position.w;'
				].join('\n')
			);
		};
		mat.needsUpdate = true;
	}

	// Thin tea stream / liquid collapses on coarse snap — skip those mats
	function isTeaLiquidMat(mat, obj) {
		var n = ((mat && mat.name) || '') + ' ' + ((obj && obj.name) || '');
		return /tea|cha(\.|$)|stream|pour|liquid/i.test(n);
	}

	function applyPS1ToObject(root) {
		root.traverse(function (obj) {
			if (!obj.isMesh) return;
			var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
			for (var i = 0; i < mats.length; i++) {
				if (!mats[i]) continue;
				if ('vertexColors' in mats[i] && mats[i].vertexColors !== undefined) {
					if (obj.geometry && obj.geometry.attributes && obj.geometry.attributes.color) {
						mats[i].vertexColors = true;
					}
				}
				// wings / coco / glow parts — emissiveMap (Material.002)
				var mn = (mats[i].name || '');
				if (mats[i].emissiveMap || /Material\.002/i.test(mn)) {
					if (feyaEmissiveMats.indexOf(mats[i]) < 0) feyaEmissiveMats.push(mats[i]);
					if (mats[i].emissiveIntensity === undefined) mats[i].emissiveIntensity = 1;
				}
				// keep stream visible: no coarse vertex snap on tea/cha liquids
				if (isTeaLiquidMat(mats[i], obj)) continue;
				patchPS1Snap(mats[i]);
			}
		});
	}


		// Instantiate a loader
		var loader = new THREE.GLTFLoader();
		loader.load('feya.glb', handle_load, undefined, function (err) {
			console.error('[feya] GLTF load failed', err);
		});

		var mixer;

		var mesh;


	// Minecraft-style blob shadow under feet (boot VC tint ~#de5e3e)
	// Camera is nearly side-on, so a flat ground plane is edge-on and invisible —
	// tip it toward the camera a bit and draw without depth so it reads under the feet.
	var bootShadow = null;
	var bootShadowFall = 1;
	// 8x8 Bayer — hard ordered dither for chunky 8-bit falloff
	var BAYER8 = [
		[ 0,32, 8,40, 2,34,10,42],
		[48,16,56,24,50,18,58,26],
		[12,44, 4,36,14,46, 6,38],
		[60,28,52,20,62,30,54,22],
		[ 3,35,11,43, 1,33, 9,41],
		[51,19,59,27,49,17,57,25],
		[15,47, 7,39,13,45, 5,37],
		[63,31,55,23,61,29,53,21]
	];
	function paintBootShadowTexture(texCanvas, falloff) {
		var size = texCanvas.width;
		var ctx = texCanvas.getContext('2d');
		var img = ctx.createImageData(size, size);
		var data = img.data;
		var cx = (size - 1) * 0.5;
		var cy = (size - 1) * 0.5;
		var rx = size * 0.5 * 0.98;
		var ry = rx * 0.72; // slight Z stretch for side view
		var fall = Math.max(0.15, falloff || 1);
		// fewer alpha steps = harsher 8-bit look (8 levels incl. 0)
		var levels = 8;
		for (var y = 0; y < size; y++) {
			for (var x = 0; x < size; x++) {
				var nx = (x - cx) / rx;
				var ny = (y - cy) / ry;
				var d = Math.sqrt(nx * nx + ny * ny);
				// soft core → edge, shaped by falloff (higher = softer longer tail)
				var t = Math.max(0, Math.min(1, d));
				var a = Math.pow(1 - t, fall);
				// Bayer threshold in 0..1
				var thr = (BAYER8[y & 7][x & 7] + 0.5) / 64;
				// quantize with dither: map to level, then hard on/off within band
				var q = a * (levels - 1);
				var base = Math.floor(q);
				var frac = q - base;
				var step = base + (frac > thr ? 1 : 0);
				if (step > levels - 1) step = levels - 1;
				var outA = step / (levels - 1);
				// crunch further: snap to pure 0 or stepped whites (no smooth grey ramp in RGB)
				var i = (y * size + x) * 4;
				var v = outA > 0 ? 255 : 0;
				data[i] = v;
				data[i + 1] = v;
				data[i + 2] = v;
				data[i + 3] = Math.round(outA * 255);
			}
		}
		ctx.putImageData(img, 0, 0);
	}
	function makeBootShadow() {
		var size = 256;
		var c = document.createElement('canvas');
		c.width = size;
		c.height = size;
		paintBootShadowTexture(c, bootShadowFall);
		var tex = new THREE.CanvasTexture(c);
		tex.magFilter = THREE.NearestFilter;
		tex.minFilter = THREE.NearestFilter;
		tex.generateMipmaps = false;
		tex.needsUpdate = true;
		var mat = new THREE.MeshBasicMaterial({
			map: tex,
			color: 0xde5e3e,
			transparent: true,
			depthWrite: false,
			depthTest: true, // mesh in front occludes the blob
			side: THREE.DoubleSide,
			opacity: 1
		});
		mat.userData.shadowCanvas = c;
		mat.userData.shadowTex = tex;
		// larger diameter under feet
		var geo = new THREE.PlaneGeometry(15, 19);
		var shadow = new THREE.Mesh(geo, mat);
		shadow.rotation.set(-Math.PI / 2, 0, 0);
		shadow.position.set(0, -4.55, 0);
		shadow.renderOrder = -2; // draw before character
		shadow.name = 'feyaBootShadow';
		shadow.frustumCulled = false;
		// avoid z-fight with soles
		shadow.material.polygonOffset = true;
		shadow.material.polygonOffsetFactor = 1;
		shadow.material.polygonOffsetUnits = 1;
		return shadow;
	}
	function updateBootShadow() {
		if (!bootShadow) return;
		var fy = mesh ? mesh.position.y : -4.7;
		bootShadow.rotation.set(-Math.PI / 2, 0, 0);
		// slightly below soles so feet depth-test over the blob
		bootShadow.position.set(0, fy - 0.02, 0);
	}

	function handle_load(gltf)
	{
        mesh = gltf.scene;
        scene.add( mesh );
		console.info('[feya] mesh loaded', mesh);
		mesh.rotation.y = 91;
    mesh.position.y = -4.7;
		applyPS1ToObject(mesh);
		var emisEl = document.getElementById('fld-emis');
		applyFeyaEmissive(emisEl ? parseFloat(emisEl.value) : 1);
		bootShadow = makeBootShadow();
		patchPS1Snap(bootShadow.material);
		scene.add(bootShadow);
		updateBootShadow();
		(function bindFeyaShadowDebug() {
			var hEl = document.getElementById('fld-shH');
			var sEl = document.getElementById('fld-shS');
			var vEl = document.getElementById('fld-shV');
			var sizeEl = document.getElementById('fld-shOp');
			var aEl = document.getElementById('fld-shA');
			var fallEl = document.getElementById('fld-shFall');
			if (!bootShadow || !bootShadow.material) return;
			function setOut(id, text) {
				var o = document.getElementById(id);
				if (o) o.textContent = text;
			}
			function rebuildFall(fall) {
				bootShadowFall = fall;
				var c = bootShadow.material.userData.shadowCanvas;
				var tex = bootShadow.material.userData.shadowTex;
				if (!c || !tex) return;
				paintBootShadowTexture(c, fall);
				tex.needsUpdate = true;
			}
			function sync(opts) {
				opts = opts || {};
				var h = hEl ? parseFloat(hEl.value) : 14;
				var s = sEl ? parseFloat(sEl.value) : 86;
				var v = vEl ? parseFloat(vEl.value) : 87;
				var hex = feyaHsvToHex(h, s, v);
				var sz = sizeEl ? parseFloat(sizeEl.value) : 1;
				var alpha = aEl ? parseFloat(aEl.value) : 1;
				var fall = fallEl ? parseFloat(fallEl.value) : 1;
				bootShadow.material.color.set(hex);
				bootShadow.scale.set(sz, sz, sz);
				bootShadow.material.opacity = alpha;
				if (opts.rebuild || Math.abs(fall - bootShadowFall) > 1e-6) rebuildFall(fall);
				bootShadow.material.needsUpdate = true;
				setOut('fld-shH-val', String(Math.round(h)));
				setOut('fld-shS-val', String(Math.round(s)));
				setOut('fld-shV-val', String(Math.round(v)));
				setOut('fld-shColor-val', hex.toLowerCase());
				setOut('fld-shOp-val', sz.toFixed(2));
				setOut('fld-shA-val', alpha.toFixed(2));
				setOut('fld-shFall-val', fall.toFixed(2));
			}
			if (hEl) hEl.addEventListener('input', function () { sync(); });
			if (sEl) sEl.addEventListener('input', function () { sync(); });
			if (vEl) vEl.addEventListener('input', function () { sync(); });
			if (sizeEl) sizeEl.addEventListener('input', function () { sync(); });
			if (aEl) aEl.addEventListener('input', function () { sync(); });
			if (fallEl) fallEl.addEventListener('input', function () { sync({ rebuild: true }); });
			sync({ rebuild: true });
		})();

	// Auto-save debug sliders → localStorage (+ spinner)
	(function bindFeyaDebugPersist() {
		var panel = document.getElementById('feya-light-debug');
		var statusEl = document.getElementById('fld-save-status');
		var wrap = document.getElementById('fld-save');
		if (!panel) return;
		var KEY = 'laditeo.feyaDebug.v3';
		var FIELDS = [
			'fld-amb','fld-hemi','fld-key','fld-bk','fld-res','fld-snap','fld-emis',
			'fld-shH','fld-shS','fld-shV','fld-shOp','fld-shA','fld-shFall',
			'fld-lh','fld-ls','fld-lv','fld-bkH','fld-bkS','fld-bkV',
			'fld-camMin','fld-camMax'
		];
		function setStatus(state, text) {
			if (wrap) wrap.dataset.state = state;
			if (statusEl) statusEl.textContent = text;
		}
		function collect() {
			var o = { v: 3, t: Date.now() };
			for (var i = 0; i < FIELDS.length; i++) {
				var el = document.getElementById(FIELDS[i]);
				if (el) o[FIELDS[i]] = el.value;
			}
			return o;
		}
		function apply(data) {
			if (!data) return;
			for (var i = 0; i < FIELDS.length; i++) {
				var id = FIELDS[i];
				if (data[id] == null) continue;
				var el = document.getElementById(id);
				if (!el) continue;
				el.value = String(data[id]);
				el.dispatchEvent(new Event('input', { bubbles: true }));
			}
		}
		try {
			var raw = localStorage.getItem(KEY);
			if (raw) apply(JSON.parse(raw));
		} catch (e) {}
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
		panel.addEventListener('input', scheduleSave);
		// seed current baked defaults so first paint is also persisted
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

		


	//	mixer = new THREE.AnimationMixer( mesh );

        let animations = gltf.animations;
        if ( animations && animations.length ) {
        mixer = new THREE.AnimationMixer( mesh );
        for ( let i = 0; i < animations.length; i ++ ) {
        let animation = animations[ i ];
        mixer.clipAction( animation ).play(); }	}
	}


	//Render loop — clock/flags must exist before first render()
	var feyaClock = new THREE.Clock();
	var feyaRunning = true;
	var feyaRaf = 0;
	// Fixed-step anim vars declared above (before cam panel)
	function render() {
		if (!feyaRunning) return;
		feyaRaf = requestAnimationFrame(render);
		var frameDt = feyaClock.getDelta();
		if (frameDt > FEYA_MAX_FRAME_DT) frameDt = FEYA_MAX_FRAME_DT;
		if (frameDt < 0) frameDt = 0;
		feyaAnimAcc += frameDt;
		// avoid spiral of death after long tab-throttle
		if (feyaAnimAcc > FEYA_MAX_FRAME_DT) feyaAnimAcc = FEYA_MAX_FRAME_DT;
		while (feyaAnimAcc >= FEYA_FIXED_DT) {
			if (mixer) mixer.update(FEYA_FIXED_DT * FEYA_ANIM_RATE);
			feyaAnimAcc -= FEYA_FIXED_DT;
		}
		if (controls) controls.update();
		tickFeyaFovSpring();
		if (typeof updateFeyaDebugSpoilerGate === 'function') updateFeyaDebugSpoilerGate();
		updateBootShadow();
		renderer.render(scene, camera);
	}
	window.__feyaDispose = function () {
		feyaRunning = false;
		cancelAnimationFrame(feyaRaf);
		try { if (controls && controls.dispose) controls.dispose(); } catch (e1) {}
		try { if (renderer) renderer.dispose(); } catch (e2) {}
		window.__feyaDispose = null;
	};
	render();

	var delta = 0;
	var prevTime = Date.now();





	// Debug ··· only when orbit looks at fairy's back (fade via CSS)
	var feyaDebugSpoilerEl = document.getElementById('feya-debug-spoiler');
	var feyaDebugShow = false;
	function updateFeyaDebugSpoilerGate() {
		if (!feyaDebugSpoilerEl || !controls || !controls.getAzimuthalAngle) return;
		// Front start: camera z<0 → theta ≈ ±π; back: camera +Z → theta ≈ 0
		var th = controls.getAzimuthalAngle();
		while (th > Math.PI) th -= Math.PI * 2;
		while (th < -Math.PI) th += Math.PI * 2;
		var half = 0.95; // ~54° window around back
		var show = Math.abs(th) <= half;
		// if sliders already open, keep them (don't auto-close when facing front)
		if (feyaDebugSpoilerEl.open) show = true;
		if (show === feyaDebugShow) return;
		feyaDebugShow = show;
		feyaDebugSpoilerEl.classList.toggle('is-visible', show);
		feyaDebugSpoilerEl.setAttribute('aria-hidden', show ? 'false' : 'true');
	}

	//fix 3d on all devices!