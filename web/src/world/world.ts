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
import { initWidget as initTextOutputWidget, releaseWidget as releaseTextOutputWidget, appendText as appendToTextOutput } from './object/widget/textOutput';

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
const eyeSep = 0.06;

let textOutputTestInterval: number | undefined;

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

    // Initialize TextOutput Widget
    const textOutputWidget = initTextOutputWidget();
    textOutputWidget.position.set(0, 0, -1500); // Positioned 1.5 meters away, centered vertically for now
    textOutputWidget.scale.set(1, 1, 1); // Scale is now 1:1 as widget is in mm
    scene.add(textOutputWidget);

    const generateTestString = (char: string, count: number) => char.repeat(count);
    
    // New dynamic test sequence
    const dynamicTestBatches = [
        { char: "A", count: 20,  delay: 2000 },   // Initial: 2s delay, 20 chars
        { char: "B", count: 300, delay: 1000 },   // 1s later, 300 chars
        { char: "C", count: 5,   delay: 500  },    // 0.5s later, 5 chars (very quick succession)
        { char: "D", count: 80,  delay: 4000 },   // 4s later, 80 chars
        { char: "E", count: 500, delay: 1500 },   // 1.5s later, 500 chars (large batch)
        { char: "F", count: 15,  delay: 3000 },   // 3s later, 15 chars
        { char: "G", count: 250, delay: 2000 },   // 2s later, 250 chars
        { char: "H", count: 50,  delay: 500 }     // 0.5s later, 50 chars
    ];

    let cumulativeDelay = 0;
    dynamicTestBatches.forEach((batch, index) => {
        cumulativeDelay += batch.delay;
        setTimeout(() => {
            console.log(`%c[WORLD TEST ${index+1}] Appending ${batch.count} '${batch.char}'s. Total elapsed: ${(cumulativeDelay/1000).toFixed(1)}s. Next append in: ${index < dynamicTestBatches.length - 1 ? (dynamicTestBatches[index+1].delay/1000).toFixed(1) + 's' : 'N/A'}`, 'color: magenta');
            appendToTextOutput(generateTestString(batch.char, batch.count) + "\n");
        }, cumulativeDelay);
    });

    initComposer(scene, camera, renderer);
}

function releaseWorld(){
    releaseCyberpunkSpace();
    let cube = releaseCube();
    let fps = releaseFPS();
    scene.remove(cube);
    scene.remove(fps);
    // Release TextOutput Widget
    if (textOutputTestInterval) {
        clearInterval(textOutputTestInterval);
        textOutputTestInterval = undefined;
    }
    releaseTextOutputWidget();
    // Note: The textOutputWidget itself is a THREE.Group, its children are disposed by releaseTextOutputWidget.
    // We might need to explicitly remove it from the scene if releaseTextOutputWidget doesn't handle that.
    // For now, assuming scene graph cleanup is handled if widget is removed by its release function.
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