


    if (window.__hydraDispose) {
      try { window.__hydraDispose(); } catch (e) {}
    }

    var synthEl = document.getElementById('synth') || (typeof synth !== 'undefined' ? synth : null);
    if (!synthEl) { console.warn('[hydra] #synth missing'); }
    var hydra = new Hydra({detectAudio: false, canvas: synthEl})

    hydra.setResolution(500, 500);

    //Quantum Time by @siberelis

    s0.initImage("ava.png")

    src(s0)

    .rotate( () => time%360 * -0.8)


    .repeatX(5, 0)
    .repeatY(5, 0)

    .rotate( () => time%360 * -0.2)

    .modulateRotate(src(s0),10)

    .out(o0)

    window.__hydraDispose = function () {
      try { if (typeof hush === 'function') hush(); } catch (e0) {}
      try { if (hydra && typeof hydra.hush === 'function') hydra.hush(); } catch (e1) {}
      try {
        if (hydra && typeof hydra.destroy === 'function') hydra.destroy();
        else if (hydra && hydra.synth && typeof hydra.synth.destroy === 'function') hydra.synth.destroy();
      } catch (e2) {}
      window.__hydraDispose = null;
    };
