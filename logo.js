
// import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
	 
	 //Scene
      var scene2 = new THREE.Scene();
	
	  

      //Camera
		var height = 100;
		var width = 100;
		var distance = 1000;
		var diag = Math.sqrt((height*height)+(width*width))
		var fov = 2 * Math.atan((diag) / (2 * distance)) * (180 / Math.PI); //Field of View
		var camera2 = new THREE.PerspectiveCamera(5, 1 / 1, 0.3, distance);
	
  
    camera2.position.y = 0
    camera2.position.x = 0
    camera2.position.z = -90




      //Canvas
      var logoCanv = document.getElementById('logoCanvas');

      //Renderer
      var renderer2 = new THREE.WebGLRenderer({
        antialias: true,
        canvas: logoCanv,
		alpha: true
      });


		//renderer.setClearColor(0x000000);
		renderer2.setPixelRatio(window.devicePixelRatio);
		renderer2.setSize(100, 100);
		renderer2.shadowMap.enabled = true;
    	renderer2.shadowMap.type = THREE.PCFSoftShadowMap;
    	renderer2.gammaInput = true;
    	renderer2.gammaOutput = true;
    	renderer2.antialias = true;
		document.body.appendChild( renderer2.domElement );

		//LIGHTS
		var light2 = new THREE.AmbientLight(0xffffff, 0.7);
		light2.power = 10;  // GE Lumens @ 60W incade.
		light2.decay = 2;
		light2.distance = Infinity;
		light2.position.set(0, 2, 0);
		light2.castShadow = false;
		light2.shadowCameraVisible = false;
		scene2.add(light2);

		//OrbitControls
		controls = new THREE.OrbitControls(
			camera2, renderer2.domElement 
     );
	 controls.target.set(0, 0, 0);
	 controls.enableDamping = true;
	 controls.maxPolarAngle = THREE.MathUtils.degToRad(150);
	 controls.minPolarAngle = THREE.MathUtils.degToRad(50);

	 
	//  controls.maxAzimuthAngle = THREE.MathUtils.degToRad(0);
	//  controls.minAzimuthAngle = THREE.MathUtils.degToRad(0);




	 controls.minDistance = 10;
	 controls.maxDistance = 100;
	 controls.enableRotate = true; 
	 controls.update();
	 controls.enablePan = false;
	 controls.enableDamping = true;
	 controls.enableZoom = false;


 	 controls.addEventListener('end', () => {
 	 controls.reset();});
   

		
		// Instantiate a loader
		var loader = new THREE.GLTFLoader();
		loader.load('logo.glb', handle_load);

		var mixer;

		var mesh;

	function handle_load(gltf)
	{
        mesh = gltf.scene;
        scene2.add( mesh );
		mesh.rotation.y = 91;
   		mesh.position.y = 0;
		


	//	mixer = new THREE.AnimationMixer( mesh );

        let animations = gltf.animations;
        if ( animations && animations.length ) {
        mixer = new THREE.AnimationMixer( mesh );
        for ( let i = 0; i < animations.length; i ++ ) {
        let animation = animations[ i ];
        mixer.clipAction( animation ).play(); }	}
	}


	//Render loop
	render();

	var delta = 1;
	var prevTime = Date.now();




	function render() {
		//exposure
//	renderer2.toneMappingExposure = Math.pow(0.7, 5.0);  // -> exposure: 0.168
		
var clock;
clock = new THREE.Clock();
		
		requestAnimationFrame(render);
		
			
			//	controls.update();
			//	mesh.rotation.y += 0.001;
				
				var delta = clock.getDelta();
		
				renderer2.render(scene2, camera2);

				if (mixer) mixer.update(clock.getDelta()*50);

	}
   

	//fix 3d on all devices!