
    var hydra = new Hydra({detectAudio: false, canvas: synth})

    hydra.setResolution(500, 500);
    //window.addEventListener("resize",evt=>{hydra.setResolution(window.innerWidth, window.innerHeight)})

    //Quantum Time by @siberelis

    shape(12,0.4)

    .repeatX(2)
    .repeatY(2)

    .modulate(shape(16,0.05,0.7))
    .scrollX(-0.5)
    .scrollX(() => 0.00001*mouse.x)
    .scrollY(-0.55)
    .scrollY(() => 0.00001*mouse.y)

    //.diff(shape(16,0.1,1)
    .repeatX(12)
    .repeatY(12)
    .scrollX(-1)
    .scrollX(() => -0.0005*mouse.x)
    .scrollY(-1)
    .scrollY(() => -0.0005*mouse.y)


    .diff(gradient(0.001)).saturate(0.73)
    .modulate(noise(1,0.01))
    .modulateRotate(noise(0.5,0.01))
    .diff(src(o0).modulate(osc(0.0001)))

    //.modulate(shape(16,0.2,0.5))
    //.repeatX(2)
    //.repeatY(2)
    //          .rotate(5)
    //          .kaleid(3)
    //          .contrast((({time}) => Math.sin(time) * 0.2 ))
    //          .modulateRotate(osc(1,1,1)))

    //.diff(shape(12,0.2)
    //.mult(solid(1,1,1))
    //.repeatX(50)
    //.repeatY(50)
    //.modulate(noise(1,0.1))
    //.modulateRotate(noise(0.5,0.01)))
    .out(o0)
