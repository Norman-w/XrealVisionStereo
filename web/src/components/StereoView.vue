<template>
  <div class="stereo-container">
    <div id="left-eye-overlay" class="debug-overlay">Left Eye</div>
    <div id="right-eye-overlay" class="debug-overlay">Right Eye</div>
    <div id="cpp-log-overlay" v-show="showCppLog">[C++ Logs]<br /></div>
    <div ref="canvasContainer"></div>
    <button @click="toggleCppLog" class="toggle-log-button">
      {{ showCppLog ? 'Hide' : 'Show' }} Log
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

// Import shaders as raw strings
import vertexShaderSource from '../shaders/vertex.glsl?raw';
import fireFragmentShader1 from '../shaders/fire1.fragment.glsl?raw';
import fireFragmentShader2 from '../shaders/fire2.fragment.glsl?raw';
import fireFragmentShader3 from '../shaders/fire3.fragment.glsl?raw';
import waterFragmentShader1 from '../shaders/water1.fragment.glsl?raw';
import waterFragmentShader2 from '../shaders/water2.fragment.glsl?raw';
import waterFragmentShader3 from '../shaders/water3.fragment.glsl?raw';
import galaxyFragmentShader1 from '../shaders/galaxy1.fragment.glsl?raw';
import galaxyFragmentShader2 from '../shaders/galaxy2.fragment.glsl?raw';
import galaxyFragmentShader3 from '../shaders/galaxy3.fragment.glsl?raw';

const canvasContainer = ref<HTMLDivElement | null>(null);
const logContainer = ref<HTMLDivElement | null>(null);
const showCppLog = ref(false);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cube: THREE.Mesh;
let leftCamera: THREE.PerspectiveCamera;
let rightCamera: THREE.PerspectiveCamera;
const eyeSep = 0.06;

// FPS Counter
let fpsTextSprite: THREE.Sprite;
let fpsCanvas: HTMLCanvasElement, fpsContext: CanvasRenderingContext2D, fpsTexture: THREE.CanvasTexture;
let lastFPSTime = 0;
let frameCount = 0;
let currentFPS = 0;

const uniforms = {
  time: { value: 0.0 },
};

const fragmentShaders = [
  fireFragmentShader1,
  fireFragmentShader2,
  fireFragmentShader3,
  waterFragmentShader1,
  waterFragmentShader2,
  waterFragmentShader3,
  galaxyFragmentShader1,
  galaxyFragmentShader2,
  galaxyFragmentShader3,
];

let animationFrameId: number;

// Function to Append Logs to UI
function appendLog(message: string) {
  const currentLogContainer = document.getElementById('cpp-log-overlay');
  if (currentLogContainer) {
    const logEntry = document.createElement('span');
    logEntry.textContent = message;
    currentLogContainer.appendChild(logEntry);
    currentLogContainer.appendChild(document.createElement('br'));
    currentLogContainer.scrollTop = currentLogContainer.scrollHeight;
  }
  console.log("[C++ LOG]:", message);
}

function toggleCppLog() {
  showCppLog.value = !showCppLog.value;
}

function init() {
  console.log("init() called");

  // Scene
  scene = new THREE.Scene();
  console.log("Scene created");

  // FPS Counter Init
  fpsCanvas = document.createElement('canvas');
  fpsCanvas.width = 256;
  fpsCanvas.height = 128;
  fpsContext = fpsCanvas.getContext('2d')!;
  fpsContext.font = "Bold 40px Arial";
  fpsContext.fillStyle = "rgba(255,255,0,0.95)";

  fpsTexture = new THREE.CanvasTexture(fpsCanvas);
  fpsTexture.needsUpdate = true;

  const spriteMaterial = new THREE.SpriteMaterial({ map: fpsTexture });
  fpsTextSprite = new THREE.Sprite(spriteMaterial);
  const spriteScale = 2;
  fpsTextSprite.scale.set(spriteScale * (fpsCanvas.width / fpsCanvas.height), spriteScale, 1);
  fpsTextSprite.position.set(-2, 1.5, 0);
  scene.add(fpsTextSprite);
  console.log("3D FPS Counter Sprite added");

  // Main Camera
  console.log("Creating main camera...");
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.updateMatrixWorld();
  console.log("Main camera created");

  // Left Eye Camera
  console.log("Creating left camera...");
  leftCamera = new THREE.PerspectiveCamera(camera.fov, aspect / 2, camera.near, camera.far);
  leftCamera.position.copy(camera.position);
  leftCamera.position.x -= eyeSep / 2;
  scene.add(leftCamera);
  console.log("Left camera created");

  // Right Eye Camera
  console.log("Creating right camera...");
  rightCamera = new THREE.PerspectiveCamera(camera.fov, aspect / 2, camera.near, camera.far);
  rightCamera.position.copy(camera.position);
  rightCamera.position.x += eyeSep / 2;
  scene.add(rightCamera);
  console.log("Right camera created");

  // Renderer
  console.log("Creating renderer...");
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);
  renderer.setScissorTest(true);
  if (canvasContainer.value) {
    canvasContainer.value.appendChild(renderer.domElement);
  }
  console.log("Renderer created and added to DOM");

  // Geometry
  console.log("Creating geometry...");
  const geometry = new THREE.BoxGeometry(2, 2, 2);

  // Shader Materials
  console.log("Creating shader materials...");
  const shaderMaterials = fragmentShaders.map(fsSource => {
    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShaderSource,
      fragmentShader: fsSource,
    });
  });
  console.log(`Created ${shaderMaterials.length} shader materials`);

  cube = new THREE.Mesh(geometry, shaderMaterials);
  scene.add(cube);
  console.log("Cube mesh created and added to scene");

  // Grid Helper
  const gridSize = 100;
  const gridDivisions = 100;
  const gridColor = 0x888888;
  const centerLineColor = 0xcccccc;
  const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, centerLineColor, gridColor);
  gridHelper.position.y = -1.5;
  scene.add(gridHelper);
  console.log("GridHelper added to scene");

  // Lights
  console.log("Adding lights...");
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1).normalize();
  scene.add(directionalLight);
  console.log("Lights added");

  window.addEventListener('resize', onWindowResize, false);
  console.log("Resize listener added");

  // Assign the log container DOM element for appendLog after DOM is ready
  // logContainer.value = document.getElementById('cpp-log-overlay') as HTMLDivElement;


  // Expose appendLog to be callable from outside (e.g. C++ via a global function)
  (window as any).appendLogToUI = appendLog;
  console.log("appendLogToUI exposed to window");


  animate();
  console.log("init() finished");
}

function onWindowResize() {
  console.log("onWindowResize() called");
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const now = performance.now();
  frameCount++;

  if (now >= lastFPSTime + 1000) {
    currentFPS = frameCount;
    frameCount = 0;
    lastFPSTime = now;

    fpsContext.clearRect(0, 0, fpsCanvas.width, fpsCanvas.height);
    fpsContext.fillStyle = "rgba(255,255,0,0.95)";
    fpsContext.fillText(`FPS: ${currentFPS}`, 10, 50);
    fpsTexture.needsUpdate = true;
  }

  const timeValue = performance.now() * 0.001;
  uniforms.time.value = timeValue;

  cube.rotation.x += 0.005;
  cube.rotation.y += 0.007;
  cube.rotation.z += 0.003;

  const orbitRadius = 2.0;
  const orbitSpeed = 0.3;
  cube.position.x = orbitRadius * Math.cos(orbitSpeed * timeValue);
  cube.position.y = orbitRadius * Math.sin(orbitSpeed * timeValue);

  const zAmplitude = 1.0;
  const zFrequency = 0.5;
  cube.position.z = zAmplitude * Math.sin(zFrequency * timeValue * 2.0);

  renderStereo();
}

function renderStereo() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const halfWidth = width / 2;

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

  leftCamera.updateProjectionMatrix();
  rightCamera.updateProjectionMatrix();

  renderer.setViewport(0, 0, halfWidth, height);
  renderer.setScissor(0, 0, halfWidth, height);
  renderer.render(scene, leftCamera);

  renderer.setViewport(halfWidth, 0, halfWidth, height);
  renderer.setScissor(halfWidth, 0, halfWidth, height);
  renderer.render(scene, rightCamera);
}

onMounted(() => {
  // Ensure DOM is ready before initializing Three.js
  // and trying to get elements by ID for the log container.
  logContainer.value = document.getElementById('cpp-log-overlay') as HTMLDivElement; // Assign here
  init();
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer) {
    renderer.dispose();
  }
  if (canvasContainer.value && renderer) {
     if (renderer.domElement && canvasContainer.value.contains(renderer.domElement)) {
        canvasContainer.value.removeChild(renderer.domElement);
     }
  }
  // Clean up global function if needed
  delete (window as any).appendLogToUI;
});

// Expose appendLog for potential external calls (e.g., from other JS modules or C++)
// This is already done in init, but if you need it available before init, define it here too.
// (window as any).appendLogToUI = appendLog;

</script>

<style scoped>
.stereo-container {
  width: 100vw;
  height: 100vh;
  margin: 0;
  overflow: hidden;
  background-color: #000;
  position: relative; /* Needed for absolute positioning of overlays */
}

/* Styles for debug overlays */
.debug-overlay {
  position: absolute;
  top: 0;
  height: 100vh; /* Full height */
  width: 50vw; /* Half width */
  border: 2px solid yellow;
  box-sizing: border-box; /* Include border in width/height */
  pointer-events: none; /* Allow clicks to pass through */
  color: yellow;
  font-size: 24px;
  font-family: sans-serif;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Align text to top */
  padding-top: 20px;
  z-index: 10; /* Ensure overlays are above canvas but below log */
}

#left-eye-overlay {
  left: 0;
}

#right-eye-overlay {
  left: 50vw; /* Start at halfway point */
}

/* Styles for C++ Log Overlay */
#cpp-log-overlay {
  position: fixed; /* Fixed position */
  bottom: 10px;
  left: 10px;
  width: calc(100vw - 20px); /* Full width minus padding */
  height: 150px; /* Fixed height */
  background-color: rgba(0, 0, 0, 0.7); /* Semi-transparent black */
  border: 1px solid #555;
  color: #0f0; /* Green text */
  font-family: monospace;
  font-size: 12px;
  overflow-y: scroll; /* Enable vertical scrolling */
  padding: 5px;
  box-sizing: border-box;
  z-index: 100; /* Ensure it's on top */
  /* pointer-events: none; /* Allow clicks to pass through - REMOVED FOR BUTTON */
}

.toggle-log-button {
  position: fixed;
  top: 10px;
  right: 10px;
  padding: 8px 12px;
  background-color: #444;
  color: white;
  border: 1px solid #666;
  border-radius: 4px;
  cursor: pointer;
  z-index: 101; /* Above the log overlay */
}

.toggle-log-button:hover {
  background-color: #555;
}

/* Ensure canvas is block and takes up space, though renderer appends it */
:deep(canvas) { /* Use :deep to target canvas appended by Three.js */
  display: block;
}
</style> 