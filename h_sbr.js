
    var hydra = new Hydra({detectAudio: false, canvas: synth})

    hydra.setResolution(500, 500);
    //window.addEventListener("resize",evt=>{hydra.setResolution(window.innerWidth, window.innerHeight)})

    //Quantum Time by @siberelis

    s0.initImage("ava.png")
    
 
   
   src(s0)

   .rotate( () => time%360 * 0.1)

   
    
    
    .repeatX(5, 0)
    .repeatY(5, 0)
    
    .modulateKaleid(src(s0))
    
    .out(o0)