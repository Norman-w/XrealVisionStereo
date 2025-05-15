import {createCluster} from "./object/cluster/factory.ts";
import {CLUSTER_SPAWN_X_RIGHT, MAX_CLUSTERS} from "./definition/constant.ts";
import {cyberClusters} from "./object/cluster/container.ts";
import * as THREE from "three";
import {initFPS, releaseFPS} from "./billboard/fps.ts";
import {initCube, releaseCube, getCubeRawGLSLShaders} from "./test-object/glslCube.ts";
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

// let textOutputTestInterval: number | undefined; // Will be redefined for new interval
let mockTextIntervalId: number | undefined;
let cubeGLSLShaders: { vertex: string, fragments: string[] } | null = null;
let allShaderLines: string[] = [];

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
    let glslCube = initCube();
    scene.add(glslCube);
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

    // Get GLSL shaders
    cubeGLSLShaders = getCubeRawGLSLShaders();
    allShaderLines = cubeGLSLShaders.vertex.split('\n');
    cubeGLSLShaders.fragments.forEach(fragShader => {
        allShaderLines.push(...fragShader.split('\n'));
    });
    // Filter out empty lines or very short lines if desired
    allShaderLines = allShaderLines.map(line => line.trim()).filter(line => line.length > 2); 

    // Remove old test sequence
    // const generateTestString = (char: string, count: number) => char.repeat(count);
    // const dynamicTestBatches = [ ... ];
    // let cumulativeDelay = 0;
    // dynamicTestBatches.forEach((batch, index) => { ... });

    // --- New "busy" text generation ---
    function getRandomInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function generateRandomGLSLSnippet(): string {
        if (allShaderLines.length === 0) return '';
        const snippetLines: string[] = [];
        const numLinesToPick = getRandomInt(1, 5); // Pick 1 to 5 lines for a snippet

        for (let i = 0; i < numLinesToPick; i++) {
            const randomIndex = Math.floor(Math.random() * allShaderLines.length);
            const line = allShaderLines[randomIndex];
            // Try to make it a bit more like a single "word" for the paragraph structure
            // by concatenating, or just return a multi-line string if paragraph handles it.
            // For now, let's treat a few lines of GLSL as a single "word"/block
            if (line) snippetLines.push(line);
        }
        // Join with space to simulate a word, or newline if textOutput handles it well visually for snippets
        return snippetLines.join(' \\n '); // Add newlines between GLSL lines for better readability in output
    }

    function generateRandomParagraph(): string {
        // A "paragraph" now consists of 1 to 3 GLSL snippets.
        const numSnippets = getRandomInt(1, 3);
        let paragraph = '';

        for (let i = 0; i < numSnippets; i++) {
            const snippet = generateRandomGLSLSnippet();
            if (snippet) {
                paragraph += snippet;
                // Add a newline between snippets within the same "paragraph" block, 
                // unless it's the last snippet in this block.
                if (i < numSnippets - 1) {
                    paragraph += '\n'; 
                }
            }
        }
        // The existing logic in appendMockText will ensure the whole paragraph block ends with a newline.
        return paragraph;
    }

    function startMockTextGeneration() {
        if (mockTextIntervalId) {
            clearInterval(mockTextIntervalId);
        }
        
        function appendMockText() {
            let paragraph = generateRandomParagraph(); // paragraph might end with \n (20% chance from generator)
            
            // Ensure that the appended block is followed by a newline.
            if (!paragraph.endsWith('\n')) {
                paragraph += '\n';
            }

            console.log(`%c[MOCK TEXT] Appending: "${paragraph.substring(0, 50)}${paragraph.length > 50 ? '...' : ''}" (now ensuring it ends with a newline character)`, 'color:dodgerblue');
            appendToTextOutput(paragraph);
            
            // Randomly add an *extra* empty line after the paragraph's own newline.
            if (Math.random() < 0.15) { // 15% chance to add an empty line
                console.log("%c[MOCK TEXT] Adding extra empty line", 'color:skyblue');
                appendToTextOutput('\n');
            }
            
            // Schedule next append with a random delay
            const randomDelay = getRandomInt(200, 1500); // 0.2s to 1.5s
            mockTextIntervalId = window.setTimeout(appendMockText, randomDelay);
        }
        
        appendMockText(); // Start the first one immediately, then it will self-schedule
    }

    startMockTextGeneration();
    // --- End new "busy" text generation ---

    initComposer(scene, camera, renderer);
}

function releaseWorld(){
    releaseCyberpunkSpace();
    let cube = releaseCube();
    let fps = releaseFPS();
    scene.remove(cube);
    scene.remove(fps);
    // Release TextOutput Widget
    // if (textOutputTestInterval) { // old interval
    //     clearInterval(textOutputTestInterval);
    //     textOutputTestInterval = undefined;
    // }
    if (mockTextIntervalId) {
        clearTimeout(mockTextIntervalId); // Use clearTimeout for IDs from setTimeout
        mockTextIntervalId = undefined;
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