import * as THREE from 'https://unpkg.com/three@0.182.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.182.0/examples/jsm/loaders/GLTFLoader.js?module';

import { MouseController } from './mouseController.js';
import { FishController } from './fishController.js';

let scene, camera, renderer, timer;
let controls;
let fishControllers;

const modelUrls = ['../static/models/yellowtetra_anim.glb', '../static/models/neontetra_anim.glb'];

init();

/**
 * scene init
 */
async function init(){

    scene = new THREE.Scene();

    /**
     * Set perspective camera
     */
    camera = new THREE.PerspectiveCamera(60, 1, 0.001, 1000);
    camera.position.z = 5;

    const ambientLight = new THREE.AmbientLight(0x0058ff);
    ambientLight.intensity = 4;
    scene.add( ambientLight );

    /**
     * Set fog color to canvas background color
     */
    const canvas = document.querySelector('canvas');
	const style = window.getComputedStyle ? getComputedStyle(canvas, null) : el.currentStyle;
    const rgb = style["background-color"];
    let bgColor = new THREE.Color(rgb);
    bgColor.lerp(new THREE.Color(0x0058ff), 0.4); // Add some blue to make it more dramatic
    scene.fog = new THREE.Fog( bgColor, 1, 30 );

    timer = new THREE.Timer();
    timer.connect( document ); 

    /**
     * Set renderer
     */
    renderer = new THREE.WebGLRenderer({alpha: true});
    renderer.setSize( window.innerWidth, window.innerHeight );

    renderer.setAnimationLoop( animate );
    document.body.appendChild( renderer.domElement );

    /**
     * Spawn some fishes
     */
    controls = new MouseController( camera, document, renderer, {} );
    fishControllers = [];
    spawnFish(30, 20, modelUrls);

}

function spawnFish(num, maxDistance, urls){
    const gltfLoader = new GLTFLoader();
    
    for(let i=0; i<num; i++){
        const url = urls[Math.floor(Math.random()*urls.length)];
        gltfLoader.load(url, (gltf) => {

            const fish = gltf.scene;
            const outer_fish = fish.getObjectByName('fish');
            const inner_fish = fish.getObjectByName('inner');

            /**
             * Modify materials
             */
            if(outer_fish){
                outer_fish.material.transparent = true;
                outer_fish.material.opacity = 0.5;
            }
            if(inner_fish){
                const material = new THREE.MeshNormalMaterial();
                inner_fish.material = material;
            }

            /**
             * Push the model into scene with a controller
             */
            if(fish){

                // Spawn them at random positions
                fish.position.x = Math.random() * 2 * maxDistance - maxDistance;
                fish.position.y = Math.random() * 2 * maxDistance - maxDistance;
                fish.position.z = Math.random() *     maxDistance - maxDistance * 2/3;

                fishControllers.push(new FishController(fish, controls, gltf.animations, {maxDistance:maxDistance}));

                //fish.add(new THREE.AxesHelper(1));
                scene.add(fish);
            }
        });
    }
}

/**
 * Update
 */
function animate() {

    timer.update();
    const t  = timer.getElapsed()*1000;
    const dt = timer.getDelta()*1000;

    for (let i=0; i<fishControllers.length; i++){
        fishControllers[i].update(t, dt);
    }

    controls.update(t, dt);
    renderer.render( scene, camera );

}