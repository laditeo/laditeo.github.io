import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let camera;
let composer, renderer, mixer, clock;



  


//    container.appendChild( renderer.domElement );

const params = {
threshold: 1,
strength: 0.2,
radius: 0.1,
exposure: 1
};

init();

function init() {

const container = document.getElementById( 'myCanvas' );


clock = new THREE.Clock();

renderer = new THREE.WebGLRenderer( {
antialias: true,
canvas: container,
alpha: true 
} );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth/1.2, window.innerWidth/1.2 );



// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.toneMappingExposure = -0.4;

const scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera( 50, 1 / 1, 1, 100 );
camera.position.set( 0, 15, 0 );
scene.add( camera );





class ProgressBar {
    constructor(parentElement) {
      this.parent = parentElement;
      this.container = document.createElement('div');
      this.progressBar = document.createElement('div');

      this.container.className = 'progress-container';
      this.progressBar.className = 'progress-bar';

      this.container.appendChild(this.progressBar);
      this.parent.appendChild(this.container);
    }

    update(progress) {
      this.progressBar.style.width = `${progress * 100}%`;
    }

    hide() {
      this.container.style.display = 'none';
    }
  }

  const progressBar = new ProgressBar(document.body);

  const manager = new THREE.LoadingManager();
  manager.onProgress = function (item, loaded, total) {
    const progress = loaded / total;
    progressBar.update(progress);
  };



//ORBIT CONTROLS
const controls = new OrbitControls( camera, renderer.domElement );
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxPolarAngle = THREE.MathUtils.degToRad(110);
controls.minPolarAngle = THREE.MathUtils.degToRad(70);
controls.maxAzimuthAngle = THREE.MathUtils.degToRad(10);
controls.minAzimuthAngle = THREE.MathUtils.degToRad(-10);
controls.minDistance = 10;
controls.maxDistance = 100;
controls.enableRotate = true; 
controls.update();
controls.enablePan = false;
controls.enableZoom = false;








// LIGHTS
scene.add( new THREE.AmbientLight( 0xffffff ) );

const pointLight = new THREE.PointLight( 0x9649f9, 1000 );
pointLight.position.set( 0, 15, 0);
camera.add( pointLight );

const pointLight2 = new THREE.PointLight( 0xda8f32, 1700 );
pointLight2.position.set( -15, 0, 0);
camera.add( pointLight2 );

const pointLight3 = new THREE.PointLight( 0x0188f1, 1700 );
pointLight3.position.set( 0, -10, 20);
camera.add( pointLight3 );


const renderScene = new RenderPass( scene, camera );

const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1, 0.1, 0.8 );
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;



const outputPass = new OutputPass();

composer = new EffectComposer( renderer );
composer.addPass( renderScene );
composer.addPass( bloomPass );
composer.addPass( outputPass );







new RGBELoader(manager).load( './sky.hdr', function ( texture ) {

		texture.mapping = THREE.EquirectangularReflectionMapping;
        
        
		//scene.background = texture;
		scene.environment = texture;
        
		render(); });


const loader = new GLTFLoader(manager);
        let currentModel;
        const modelPaths = [
            'feya.glb',
           
        ];

        function loadModel(index) {
            if (currentModel) {
                scene.remove(currentModel);
            }

            loader.load(modelPaths[index], function (gltf) {
                const model = gltf.scene;
                scene.add(model);
                currentModel = model;


                model.position.set (0, -5, 0);
                model.scale.set (1, 1, 1);

                let animations = gltf.animations;
                if ( animations && animations.length ) {
                mixer = new THREE.AnimationMixer( model );
                for ( let i = 0; i < animations.length; i ++ ) {
                let animation = animations[ i ];
                mixer.clipAction( animation ).play(); }	}

                animate();   
                
            });
        }

        for (let i = 0; i < modelPaths.length; i++) {
            const linkId = "model" + (i + 1) + "Link"; // Construct the id
            document.getElementById(linkId).addEventListener('click', function () {
                loadModel(i);
            });
        }

        loadModel(0); // Load the first model initially




window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

const width = window.innerWidth;
const height = window.innerHeight;

camera.aspect = width / height;
camera.updateProjectionMatrix();

renderer.setSize( width, height );
composer.setSize( width, height );

}

function animate() {

requestAnimationFrame( animate );

const delta = clock.getDelta();



mixer.update( delta );

composer.render();

}
