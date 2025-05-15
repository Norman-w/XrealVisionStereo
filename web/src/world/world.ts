import {createCluster} from "./object/cluster/factory.ts";
import {CLUSTER_SPAWN_X_RIGHT, MAX_CLUSTERS} from "./definition/constant.ts";
import {cyberClusters} from "./object/cluster/container.ts";
import * as THREE from "three";
import {initFPS, releaseFPS} from "./billboard/fps.ts";
import {initCube, releaseCube, getCubeRawGLSLShaders} from "./test-object/glslCube.ts";
import {initGroundGrid} from "./ground/grid.ts";
import {initDefaultMainLights} from "./light/main.ts";
import {camera} from "./camera/main.ts";
import {composer, initComposer, renderPass, bokehPass} from "./post-processing/composer.ts";
import {leftCamera} from "./camera/leftEyeCamera.ts";
import {rightCamera} from "./camera/rightEyeCamera.ts";
import { initPages, releasePages } from "./object/page";
import { initWidget as initTextOutputWidget, releaseWidget as releaseTextOutputWidget, appendText as appendToTextOutput } from './object/widget/textOutput';
import { initAxisIndicator, releaseAxisIndicator, type AxisIndicator } from './object/widget/axisIndicator';
import gsap from 'gsap';

// Interface for BokehPass uniforms for type safety
interface BokehPassUniforms {
    focus: THREE.Uniform;
    aperture: THREE.Uniform;
    maxblur: THREE.Uniform;
    // Add other uniforms if accessed, e.g., 'aspect' might be relevant if it needs manual update
}

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
const eyeSep = 0.06;

// let textOutputTestInterval: number | undefined; // Will be redefined for new interval
let mockTextIntervalId: number | undefined;
let cubeGLSLShaders: { vertex: string, fragments: string[] } | null = null;
let allShaderLines: string[] = [];
let axisGizmo: AxisIndicator | null = null;
let glslCube: THREE.Mesh | null = null;
let currentAxisAnimationTargetIndex: number = -1; // To track the current target

let lastAxisGizmoUpdateTimestamp: number = 0;
const axisGizmoUpdateInterval: number = 1000 / 10; // Approx. 10 FPS, 100ms interval

const axisAnimationPath: THREE.Vector3[] = [
    new THREE.Vector3(-500, 250, -800),  // 1. Top-Left-Back
    new THREE.Vector3(500, 250, -800),   // 2. Top-Right-Back
    new THREE.Vector3(500, -250, -800),  // 3. Bottom-Right-Back
    new THREE.Vector3(-500, -250, -800), // 4. Bottom-Left-Back
    new THREE.Vector3(-500, -250, -1200),// 5. Bottom-Left-Front (connects from 4)
    new THREE.Vector3(500, -250, -1200), // 6. Bottom-Right-Front
    new THREE.Vector3(500, 250, -1200),  // 7. Top-Right-Front
    new THREE.Vector3(-500, 250, -1200)  // 8. Top-Left-Front (connects to 1)
];

function animateToNextRandomPoint() {
    if (!axisGizmo) return;

    let nextIndex = currentAxisAnimationTargetIndex;
    // Ensure the next point is different from the current one
    while (nextIndex === currentAxisAnimationTargetIndex) {
        nextIndex = Math.floor(Math.random() * axisAnimationPath.length);
    }
    currentAxisAnimationTargetIndex = nextIndex;
    const targetPoint = axisAnimationPath[nextIndex];

    gsap.to(axisGizmo.position, {
        x: targetPoint.x,
        y: targetPoint.y,
        z: targetPoint.z,
        duration: 3, // Duration for each segment
        ease: "power1.inOut",
        onComplete: animateToNextRandomPoint // Loop by calling itself on complete
    });
}

function startAxisGizmoAnimation() {
    if (!axisGizmo) return;
    // Set initial position to the start of the path, or a random point
    currentAxisAnimationTargetIndex = 0; // Start with the first point for predictability
    axisGizmo.position.copy(axisAnimationPath[currentAxisAnimationTargetIndex]);
    // Start the first animation leg
    animateToNextRandomPoint();
}

function stopAxisGizmoAnimation() {
    if (axisGizmo) {
        gsap.killTweensOf(axisGizmo.position); // Kill any active tweens on the position
    }
    currentAxisAnimationTargetIndex = -1; // Reset index
}

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
    glslCube = initCube();
    scene.add(glslCube!);
    let groundGrid = initGroundGrid();
    scene.add(groundGrid);
    let lights = initDefaultMainLights();
    lights.forEach(light => scene.add(light));
    let pages = initPages();
    pages.forEach(page => scene.add(page));

    cyberClusters.forEach(cluster => scene.add(cluster));
    initCyberpunkSpace();

    const textOutputWidget = initTextOutputWidget();
    textOutputWidget.position.set(0, 0, -1500); 
    textOutputWidget.scale.set(1, 1, 1); 
    scene.add(textOutputWidget);

    axisGizmo = initAxisIndicator(true, 80); 
    scene.add(axisGizmo);
    startAxisGizmoAnimation();

    cubeGLSLShaders = getCubeRawGLSLShaders();
    allShaderLines = cubeGLSLShaders.vertex.split('\n');
    cubeGLSLShaders.fragments.forEach(fragShader => {
        allShaderLines.push(...fragShader.split('\n'));
    });
    allShaderLines = allShaderLines.map(line => line.trim()).filter(line => line.length > 2); 

    function getRandomInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function generateRandomGLSLSnippet(): string {
        if (allShaderLines.length === 0) return '';
        const snippetLines: string[] = [];
        const numLinesToPick = getRandomInt(1, 5);

        for (let i = 0; i < numLinesToPick; i++) {
            const randomIndex = Math.floor(Math.random() * allShaderLines.length);
            const line = allShaderLines[randomIndex];
            if (line) snippetLines.push(line);
        }
        return snippetLines.join(' \n ');
    }

    function generateRandomParagraph(): string {
        const numSnippets = getRandomInt(1, 3);
        let paragraph = '';

        for (let i = 0; i < numSnippets; i++) {
            const snippet = generateRandomGLSLSnippet();
            if (snippet) {
                paragraph += snippet;
                if (i < numSnippets - 1) {
                    paragraph += '\n'; 
                }
            }
        }
        return paragraph;
    }

    function startMockTextGeneration() {
        if (mockTextIntervalId) {
            clearInterval(mockTextIntervalId);
        }
        
        function appendMockText() {
            let paragraph = generateRandomParagraph();
            
            if (!paragraph.endsWith('\n')) {
                paragraph += '\n';
            }

            console.log(`%c[MOCK TEXT] Appending: "${paragraph.substring(0, 50)}${paragraph.length > 50 ? '...' : ''}" (now ensuring it ends with a newline character)`, 'color:dodgerblue');
            appendToTextOutput(paragraph);
            
            if (Math.random() < 0.15) { 
                console.log("%c[MOCK TEXT] Adding extra empty line", 'color:skyblue');
                appendToTextOutput('\n');
            }
            
            const randomDelay = getRandomInt(200, 1500); 
            mockTextIntervalId = window.setTimeout(appendMockText, randomDelay);
        }
        
        appendMockText(); 
    }

    startMockTextGeneration();

    initComposer(scene, camera, renderer);

    if (bokehPass) {
        const uniforms = bokehPass.uniforms as unknown as BokehPassUniforms;
        uniforms.aperture.value = 0.0001;
        uniforms.maxblur.value = 0.002;
    }
}

function releaseWorld(){
    releaseCyberpunkSpace();
    let cube = releaseCube();
    let fps = releaseFPS();
    scene.remove(cube);
    scene.remove(fps);
    if (mockTextIntervalId) {
        clearTimeout(mockTextIntervalId);
        mockTextIntervalId = undefined;
    }
    releaseTextOutputWidget();
    if (axisGizmo) {
        releaseAxisIndicator(axisGizmo);
        axisGizmo = null;
    }
    stopAxisGizmoAnimation();
    releasePages();
    cyberClusters.length = 0;
}

function initCyberpunkSpace() {
    for (let i = 0; i < MAX_CLUSTERS / 2; i++) {
        const spawnX = CLUSTER_SPAWN_X_RIGHT - Math.random() * CLUSTER_SPAWN_X_RIGHT * 2.5; 
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
    const currentTime = performance.now(); 

    if (axisGizmo && glslCube) {
        if (currentTime - lastAxisGizmoUpdateTimestamp > axisGizmoUpdateInterval) {
            const cubePosition = new THREE.Vector3();
            glslCube.getWorldPosition(cubePosition);
            axisGizmo.showValues(cubePosition);
            lastAxisGizmoUpdateTimestamp = currentTime; 
        }
    }

    const lookAtTargetForDOF = new THREE.Vector3(0, 0, 0);
    if (glslCube) {
        glslCube.getWorldPosition(lookAtTargetForDOF);
    }

    const distanceToFocus = camera.position.distanceTo(lookAtTargetForDOF);
    console.log("Distance to Focus: ", distanceToFocus); // Log distance for debugging

    if (bokehPass) {
        const uniforms = bokehPass.uniforms as unknown as BokehPassUniforms;
        uniforms.focus.value = distanceToFocus;
    }

    if(isStereo){
        renderWorldByStereo(lookAtTargetForDOF);
        return;
    }
    renderWorldByMono(lookAtTargetForDOF);
}

function renderWorldByStereo(lookAtTarget: THREE.Vector3) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const halfWidth = width / 2;

    const mainCameraPosition = new THREE.Vector3();
    camera.getWorldPosition(mainCameraPosition);
    const mainCameraQuaternion = new THREE.Quaternion();
    camera.getWorldQuaternion(mainCameraQuaternion);

    leftCamera.fov = camera.fov;
    rightCamera.fov = camera.fov;
    leftCamera.near = camera.near;
    rightCamera.near = camera.near;
    leftCamera.far = camera.far;
    rightCamera.far = camera.far;
    leftCamera.aspect = halfWidth / height;
    rightCamera.aspect = halfWidth / height;

    const rightDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(mainCameraQuaternion);

    const leftEyeOffset = rightDirection.clone().multiplyScalar(-eyeSep / 2);
    leftCamera.position.copy(mainCameraPosition).add(leftEyeOffset);

    const rightEyeOffset = rightDirection.clone().multiplyScalar(eyeSep / 2);
    rightCamera.position.copy(mainCameraPosition).add(rightEyeOffset);

    leftCamera.lookAt(lookAtTarget);
    rightCamera.lookAt(lookAtTarget);

    leftCamera.updateProjectionMatrix();
    rightCamera.updateProjectionMatrix();

    // Left Eye
    renderPass.camera = leftCamera; 
    renderer.setViewport(0, 0, halfWidth, height);
    renderer.setScissor(0, 0, halfWidth, height);
    composer.render();

    // Right Eye
    renderPass.camera = rightCamera; 
    renderer.setViewport(halfWidth, 0, halfWidth, height);
    renderer.setScissor(halfWidth, 0, halfWidth, height);
    composer.render();
}

function renderWorldByMono(lookAtTarget: THREE.Vector3) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const mainCameraPosition = new THREE.Vector3();
    camera.getWorldPosition(mainCameraPosition);
    const mainCameraQuaternion = new THREE.Quaternion();
    camera.getWorldQuaternion(mainCameraQuaternion);

    const rightDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(mainCameraQuaternion);
    rightCamera.position.copy(mainCameraPosition).add(rightDirection.clone().multiplyScalar(eyeSep / 2));

    rightCamera.fov = camera.fov;
    rightCamera.near = camera.near;
    rightCamera.far = camera.far;
    rightCamera.aspect = width / height; 

    rightCamera.lookAt(lookAtTarget);
    rightCamera.updateProjectionMatrix();

    renderPass.camera = rightCamera;
    renderer.setViewport(0, 0, width, height);
    renderer.setScissor(0, 0, width, height);
    composer.render();
}

export {scene,renderer, initWorld, releaseWorld, renderWorld};