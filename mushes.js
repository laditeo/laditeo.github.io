import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

let camera;
let composer, renderer, mixer, clock;



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


const scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera( 50, 500 / 500, 1, 100 );
camera.position.set( 0, 0, 10 );
scene.add( camera );


}





//ORBIT CONTROLS
const controls = new OrbitControls( camera, renderer.domElement );
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.maxPolarAngle = THREE.MathUtils.degToRad(100);
controls.minPolarAngle = THREE.MathUtils.degToRad(80);
controls.maxAzimuthAngle = THREE.MathUtils.degToRad(10);
controls.minAzimuthAngle = THREE.MathUtils.degToRad(-10);
controls.minDistance = 6;
controls.maxDistance = 8;
controls.enableRotate = true; 
controls.update();
controls.enablePan = false;
//	controls.enableZoom = false;

// controls.addEventListener('end', () => {
// controls.reset();
// });

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








	// Instantiate a loader
  var loader = new GLTFLoader();
  loader.load('feya.glb', handle_load);

  var mesh;

function handle_load(gltf)
{
      mesh = gltf.scene;
      scene.add( mesh );
  mesh.rotation.y = 91;
  mesh.position.y = -4.7;

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
