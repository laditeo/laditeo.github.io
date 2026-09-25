

    if (window.__hydraDispose) {
      try { window.__hydraDispose(); } catch (e) {}
    }

    var synthEl = document.getElementById('synth') || (typeof synth !== 'undefined' ? synth : null);
    if (!synthEl) { console.warn('[hydra] #synth missing'); }
    var hydra = new Hydra({detectAudio: false, canvas: synthEl})

    hydra.setResolution(500, 500);

    //Quantum Time by @siberelis

    function hydraLivePatch() {
      s0.initImage("ava.png")
      src(s0)
      .rotate( () => time%360 * -0.8)
      .repeatX(5, 0)
      .repeatY(5, 0)
      .rotate( () => time%360 * -0.2)
      .modulateRotate(src(s0),10)
      .out(o0)
    }
    hydraLivePatch();

    // Pause generative loop offscreen/hidden — resume same live patch (not a video bake)
    var hydraOnScreen = true;
    var hydraPaused = false;
    var hydraVisObs = null;
    function hydraApplyPause() {
      var wantPause = document.hidden || !hydraOnScreen;
      if (wantPause === hydraPaused) return;
      hydraPaused = wantPause;
      try {
        if (wantPause) {
          if (typeof hush === 'function') hush();
          else if (hydra && typeof hydra.hush === 'function') hydra.hush();
        } else {
          hydraLivePatch();
        }
      } catch (ePause) {}
    }
    try {
      if (typeof IntersectionObserver !== 'undefined' && synthEl) {
        hydraVisObs = new IntersectionObserver(function (ents) {
          var on = false;
          for (var i = 0; i < ents.length; i++) if (ents[i].isIntersecting) on = true;
          hydraOnScreen = on;
          hydraApplyPause();
        }, { root: null, threshold: 0.01 });
        hydraVisObs.observe(synthEl);
      }
    } catch (eHVis) {}
    document.addEventListener('visibilitychange', hydraApplyPause);

    window.__hydraDispose = function () {
      try { document.removeEventListener('visibilitychange', hydraApplyPause); } catch (eVis0) {}
      try { if (hydraVisObs) hydraVisObs.disconnect(); } catch (eVis1) {}
      try { if (typeof hush === 'function') hush(); } catch (e0) {}
      try { if (hydra && typeof hydra.hush === 'function') hydra.hush(); } catch (e1) {}
      try {
        if (hydra && typeof hydra.destroy === 'function') hydra.destroy();
        else if (hydra && hydra.synth && typeof hydra.synth.destroy === 'function') hydra.synth.destroy();
      } catch (e2) {}
      window.__hydraDispose = null;
    };
