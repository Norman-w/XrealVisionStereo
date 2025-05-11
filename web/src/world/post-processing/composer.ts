import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";
import {Camera, Scene, WebGLRenderer} from "three";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import * as THREE from "three";
let renderPass: RenderPass;
let composer: EffectComposer;
let bloomPass: UnrealBloomPass;

const initComposer = (scene:Scene, camera:Camera, renderer:WebGLRenderer)=>{
    renderPass = new RenderPass(scene, camera);
    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.2, // strength - Reduced (was 1.7)
        0.6, // radius - Slightly reduced (was 0.7)
        0.35 // threshold - Increased (was 0.22)
    );
    composer.addPass(bloomPass);
}

export {initComposer, composer, bloomPass, renderPass};