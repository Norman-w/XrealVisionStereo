import {createCluster} from "./object/cluster/factory.ts";
import {CLUSTER_SPAWN_X_RIGHT, MAX_CLUSTERS} from "./definition/constant.ts";
import {cyberClusters} from "./object/cluster/container.ts";
import * as THREE from "three";
import {initFPS, releaseFPS} from "./billboard/fps.ts";
import {initCube, releaseCube} from "./test-object/cube.ts";
import {initGroundGrid} from "./ground/grid.ts";
import {initDefaultMainLights} from "./light/main.ts";
import {camera} from "./camera/main.ts";
import {composer, initComposer, renderPass} from "./post-processing/composer.ts";
import {leftCamera} from "./camera/leftEyeCamera.ts";
import {rightCamera} from "./camera/rightEyeCamera.ts";
import {initPages} from "./object/page";

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
const eyeSep = 0.06;


function initWorld(canvasContainer: HTMLDivElement){
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    renderer.setScissorTest(true);
    if (canvasContainer) {
        canvasContainer.appendChild(renderer.domElement);
    }

    let fps = initFPS();
    scene.add(fps);
    let cube = initCube();
    scene.add(cube);
    let groundGrid = initGroundGrid();
    scene.add(groundGrid);
    let lights = initDefaultMainLights();
    lights.forEach(light => scene.add(light));
    let pages = initPages();
    pages.forEach(page => scene.add(page));

    cyberClusters.forEach(cluster => scene.add(cluster));
    initCyberpunkSpace();

    initComposer(scene, camera, renderer);
}

function releaseWorld(){
    releaseCyberpunkSpace();
    let cube = releaseCube();
    let fps = releaseFPS();
    scene.remove(cube);
    scene.remove(fps);
}

function initCyberpunkSpace() {
    for (let i = 0; i < MAX_CLUSTERS / 2; i++) {
        const spawnX = CLUSTER_SPAWN_X_RIGHT - Math.random() * CLUSTER_SPAWN_X_RIGHT * 2.5; // Wider initial spread
        const cluster = createCluster(spawnX);
        cyberClusters.push(cluster);
    }
    console.log(`Initial clusters: ${cyberClusters.length}`);
}

function releaseCyberpunkSpace() {
    cyberClusters.forEach(cluster => {
        scene.remove(cluster);
        cluster.children.forEach((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    (child.material as THREE.Material).dispose();
                }
                if (child.geometry) {
                    child.geometry.dispose();
                }
            } else if (child instanceof THREE.LineSegments) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    (child.material as THREE.Material).dispose();
                }
            }
        });
    });
    cyberClusters.length = 0;
}

function renderWorld(isStereo: boolean) {
    if(isStereo){
        renderWorldByStereo();
        return;
    }
    renderWorldByMono();
}

function renderWorldByStereo() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const halfWidth = width / 2;

    // Update eye cameras (aspect, fov, near, far, position, lookAt)
    leftCamera.aspect = halfWidth / height;
    rightCamera.aspect = halfWidth / height;
    leftCamera.fov = camera.fov;
    rightCamera.fov = camera.fov;
    leftCamera.near = camera.near;
    rightCamera.near = camera.near;
    leftCamera.far = camera.far;
    rightCamera.far = camera.far;
    leftCamera.position.set(-eyeSep / 2, 0, 5);
    rightCamera.position.set(eyeSep / 2, 0, 5);
    leftCamera.lookAt(0, 0, 0);
    rightCamera.lookAt(0, 0, 0);

    // Left Eye
    renderPass.camera = leftCamera;
    leftCamera.updateProjectionMatrix();
    renderer.setViewport(0, 0, halfWidth, height);
    renderer.setScissor(0, 0, halfWidth, height);
    composer.render();

    // Right Eye
    renderPass.camera = rightCamera;
    rightCamera.updateProjectionMatrix();
    renderer.setViewport(halfWidth, 0, halfWidth, height);
    renderer.setScissor(halfWidth, 0, halfWidth, height);
    composer.render();
}

function renderWorldByMono() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    //只显示左眼
    renderPass.camera = camera;
    camera.updateProjectionMatrix();
    renderer.setViewport(0, 0, width, height);
    renderer.setScissor(0, 0, width, height);
    composer.render();
}

export {scene,renderer, initWorld, releaseWorld, renderWorld};