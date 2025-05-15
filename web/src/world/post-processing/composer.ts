import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";
import {Camera, Scene, WebGLRenderer} from "three";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {BokehPass} from "three/examples/jsm/postprocessing/BokehPass.js";
import * as THREE from "three";
let renderPass: RenderPass;
let composer: EffectComposer;
let bloomPass: UnrealBloomPass;
let bokehPass: BokehPass;

const initComposer = (scene:Scene, camera:Camera, renderer:WebGLRenderer)=>{
    renderPass = new RenderPass(scene, camera);
    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8, // strength - Reduced from 1.2
        0.4, // radius - Reduced from 0.6
        0.5  // threshold - Increased from 0.35
    );
    composer.addPass(bloomPass);

    // bokehPass = new BokehPass(scene, camera, { // Temporarily disable BokehPass
    //     focus: 10.0,      
    //     aperture: 0.0002, 
    //     maxblur: 0.005,    
    // });
    // composer.addPass(bokehPass); // Temporarily disable BokehPass
}

export {initComposer, composer, bloomPass, renderPass, bokehPass}; // Keep bokehPass export for now, even if not added