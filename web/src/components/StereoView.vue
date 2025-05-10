<template>
	<div class="stereo-container">
		<div id="left-eye-overlay" class="debug-overlay">Left Eye</div>
		<div id="right-eye-overlay" class="debug-overlay">Right Eye</div>
		<div id="cpp-log-overlay" v-show="showCppLog">[C++ Logs]<br/></div>
		<div ref="canvasContainer"></div>
		<button @click="toggleCppLog" class="toggle-log-button">
			{{ showCppLog ? 'Hide' : 'Show' }} Log
		</button>
	</div>
</template>

<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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
	time: {value: 0.0},
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

// Post-processing
let composer: EffectComposer;
let bloomPass: UnrealBloomPass;
let renderPass: RenderPass;
const cyberClusters: THREE.Group[] = [];
const MAX_CLUSTERS = 25; // 最大簇数量 (增加)
const CLUSTER_SPAWN_X_RIGHT = 80; // 右侧生成X坐标 (配合簇更大，可能需要调整)
const CLUSTER_DESTROY_X_LEFT = -90; // 左侧销毁X坐标 (配合簇更大)

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

function createCluster(spawnX: number): THREE.Group {
	const cluster = new THREE.Group();

	const boxHeightY = Math.random() * 12 + 26;
	const boxWidthX = boxHeightY * (Math.random() * 0.6 + 0.3);
	const boxDepthZ = boxWidthX * (Math.random() * 0.05 + 0.1);

	const blocksPerCluster = Math.floor(Math.random() * 30) + 25;

	cluster.position.x = spawnX;
	cluster.position.y = (Math.random() - 0.5) * 30;
	// Adjust Z position to be further away
	// Original: (Math.random() - 0.5) * 60 - 50; // Approx range [-80, -20)
	// New range: e.g., [-95, -35)
	cluster.position.z = (Math.random() - 0.5) * 60 - 65; // Approx range [-95, -35)

	// Create the outline for the bounding box
	const boxOutlineGeometry = new THREE.BoxGeometry(boxWidthX, boxHeightY, boxDepthZ);
	const edgesGeometry = new THREE.EdgesGeometry(boxOutlineGeometry);
	const outlineMaterial = new THREE.LineBasicMaterial({
		color: 0x0077aa, // Slightly darker blue for the lines themselves
		// color: 0x001133, // Slightly darker blue for the lines themselves
	});

	// Glow box for the outline's bloom effect
	const glowBoxMaterial = new THREE.MeshBasicMaterial({
		color: 0x004477, // Darker, less saturated blue (was 0x00aaff)
		// Removed emissive and emissiveIntensity as they are not valid for MeshBasicMaterial
		transparent: true,
		opacity: 0.12, // Further reduced opacity (was 0.15)
		side: THREE.BackSide
	});
	const glowBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(boxWidthX * 1.05, boxHeightY * 1.05, boxDepthZ * 1.05), glowBoxMaterial);
	cluster.add(glowBoxMesh);
	cluster.userData.glowBoxMaterial = glowBoxMaterial; // Store material for dynamic opacity

	const outline = new THREE.LineSegments(edgesGeometry, outlineMaterial);
	cluster.add(outline);

	for (let j = 0; j < blocksPerCluster; j++) {
		let sizeX, sizeY, sizeZ;
		let initialIntensity;
		let blockUserData;
		let materialOpacity;

		const isStructuralBlock = Math.random() < 0.20; // 20% chance of a structural block

		if (isStructuralBlock) {
			// Structural Block - Long and thin, very low emission, corner-biased
			if (Math.random() < 0.5) { // Long in X
				sizeX = boxWidthX * (Math.random() * 0.4 + 0.5);
				sizeY = boxHeightY * (Math.random() * 0.2 + 0.05);
			} else { // Long in Y
				sizeX = boxWidthX * (Math.random() * 0.2 + 0.05);
				sizeY = boxHeightY * (Math.random() * 0.4 + 0.5);
			}
			sizeZ = boxDepthZ * (Math.random() * 0.3 + 0.1);
			sizeZ = Math.max(sizeZ, 0.03);

			initialIntensity = 0.03;
			materialOpacity = Math.random() * 0.15 + 0.25;

			blockUserData = {
				brightnessSpeed: Math.random() * 0.05,
				brightnessPhase: Math.random() * Math.PI * 2,
				initialEmissiveIntensity: initialIntensity, // This will scale the base color
				minBrightnessFactor: 0.5,
				maxBrightnessFactor: 1.5,
				baseColorForBrightness: null // Placeholder, will be set below
			};

		} else {
			// Normal Flickering Block
			sizeX = Math.random() * 1.1 + 0.15;
			sizeY = Math.random() * 1.6 + 0.25;
			sizeZ = (Math.random() < 0.5) ? (Math.random() * 0.07 + 0.01) : (Math.random() * 0.3 + 0.04);
			sizeZ = Math.max(sizeZ, 0.01);

			initialIntensity = (Math.random() < 0.7) ? (Math.random() * 0.3 + 0.1) : (Math.random() * 0.4 + 0.4);
			materialOpacity = Math.random() * 0.25 + 0.35;

			blockUserData = {
				brightnessSpeed: Math.random() * 3.5 + 2.0,
				brightnessPhase: Math.random() * Math.PI * 2,
				initialEmissiveIntensity: initialIntensity, // This will scale the base color
				minBrightnessFactor: 0.05,
				maxBrightnessFactor: initialIntensity > 0.5 ? 3.0 : 4.5,
				baseColorForBrightness: null // Placeholder, will be set below
			};
		}

		const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
		const baseGreen = new THREE.Color(0x00dd00);
		// randomGreen is the full brightness base color before specific intensity scaling
		const randomGreenColor = baseGreen.clone().multiplyScalar(Math.random() * 0.4 + 0.6);
		blockUserData.baseColorForBrightness = randomGreenColor.clone(); // Store base color

		const material = new THREE.MeshBasicMaterial({
			// Set initial color by scaling baseColor with initialIntensity
			color: randomGreenColor.clone().multiplyScalar(initialIntensity),
			transparent: true,
			opacity: materialOpacity,
		});

		const block = new THREE.Mesh(geometry, material); // Create block first
		block.userData = blockUserData; // Then assign userData

		// Then set position
		if (isStructuralBlock) {
			const halfBoxWidthEffective = (boxWidthX - sizeX) / 2;
			const halfBoxHeightEffective = (boxHeightY - sizeY) / 2;
			const signX = Math.random() < 0.5 ? -1 : 1;
			const signY = Math.random() < 0.5 ? -1 : 1;
			block.position.x = signX * halfBoxWidthEffective;
			block.position.y = signY * halfBoxHeightEffective;
			block.position.z = (Math.random() - 0.5) * (boxDepthZ - sizeZ);
		} else {
			block.position.x = (Math.random() - 0.5) * (boxWidthX - sizeX);
			block.position.y = (Math.random() - 0.5) * (boxHeightY - sizeY);
			block.position.z = (Math.random() - 0.5) * (boxDepthZ - sizeZ);
		}

		cluster.add(block);
	}

	cluster.userData = {
		moveSpeed: (Math.random() * 0.03 + 0.06) * (Math.random() > 0.7 ? 1 : 3.6),
		clusterWidth: boxWidthX, // Use the defined box width
	};
	return cluster;
}

function initCyberpunkSpace() {
	for (let i = 0; i < MAX_CLUSTERS / 2; i++) {
		const spawnX = CLUSTER_SPAWN_X_RIGHT - Math.random() * CLUSTER_SPAWN_X_RIGHT * 2.5; // Wider initial spread
		const cluster = createCluster(spawnX);
		scene.add(cluster);
		cyberClusters.push(cluster);
	}
	console.log(`Initial clusters: ${cyberClusters.length}`);
}

function init() {
	console.log("init() called");

	scene = new THREE.Scene();
	console.log("Scene created");

	fpsCanvas = document.createElement('canvas');
	fpsCanvas.width = 256;
	fpsCanvas.height = 128;
	fpsContext = fpsCanvas.getContext('2d')!;
	fpsContext.font = "Bold 40px Arial";
	fpsContext.fillStyle = "rgba(150,150,0,0.9)"; // FPS文本颜色更暗，尝试避免辉光
	fpsTexture = new THREE.CanvasTexture(fpsCanvas);
	const spriteMaterial = new THREE.SpriteMaterial({map: fpsTexture});
	fpsTextSprite = new THREE.Sprite(spriteMaterial);
	fpsTextSprite.scale.set(2 * (256 / 128), 2, 1);
	fpsTextSprite.position.set(-2, 1.5, 0);
	// FPS text will not be added to bloom layer by default
	scene.add(fpsTextSprite);
	console.log("3D FPS Counter Sprite added");

	const aspect = window.innerWidth / window.innerHeight;
	camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
	camera.position.set(0, 0, 12); // Camera slightly further back

	leftCamera = new THREE.PerspectiveCamera(camera.fov, aspect / 2, camera.near, camera.far);
	rightCamera = new THREE.PerspectiveCamera(camera.fov, aspect / 2, camera.near, camera.far);
	scene.add(leftCamera);
	scene.add(rightCamera);

	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0x000000);
	renderer.setScissorTest(true);
	if (canvasContainer.value) {
		canvasContainer.value.appendChild(renderer.domElement);
	}

	// Post-processing Setup
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
	console.log("EffectComposer and UnrealBloomPass initialized");

	const geometry = new THREE.BoxGeometry(2, 2, 2);
	const shaderMaterials = fragmentShaders.map(fsSource => {
		return new THREE.ShaderMaterial({
			uniforms: uniforms,
			vertexShader: vertexShaderSource,
			fragmentShader: fsSource,
		});
	});
	cube = new THREE.Mesh(geometry, shaderMaterials);
	scene.add(cube);

	const gridSize = 120;
	const gridDivisions = 120;
	const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0xaaaaaa, 0x777777);
	gridHelper.position.y = -8; // Grid further down
	scene.add(gridHelper);

	const ambientLight = new THREE.AmbientLight(0x606060);
	scene.add(ambientLight);
	const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
	directionalLight.position.set(1, 1.5, 1).normalize();
	scene.add(directionalLight);

	initCyberpunkSpace();

	window.addEventListener('resize', onWindowResize, false);
	(window as any).appendLogToUI = appendLog;
	animate();
	console.log("init() finished");
}

function onWindowResize() {
	const width = window.innerWidth;
	const height = window.innerHeight;
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height);
	composer.setSize(width, height); // Update composer size
	// For UnrealBloomPass, if resolution issues arise, one might need to update its internal resolution
	// or recreate it, but composer.setSize often handles this for its passes.
	bloomPass.resolution.set(width, height);
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
		fpsContext.fillText(`FPS: ${currentFPS}`, 10, 50);
		fpsTexture.needsUpdate = true;
	}

	const timeValue = now * 0.001;
	uniforms.time.value = timeValue;

	cube.rotation.x += 0.005;
	cube.rotation.y += 0.007;
	cube.rotation.z += 0.003;
	const orbitRadius = 4.0;
	cube.position.x = orbitRadius * Math.cos(0.25 * timeValue);
	cube.position.y = orbitRadius * Math.sin(0.25 * timeValue);
	cube.position.z = 1.5 * Math.sin(0.4 * timeValue * 2.0);

	const clustersToRemove: THREE.Group[] = [];
	const baseGlowBoxOpacity = 0.12; // Store the base opacity for the glow box
	const tempClusterForward = new THREE.Vector3();
	const tempVecToCamera = new THREE.Vector3();
	const tempClusterWorldQuaternion = new THREE.Quaternion();

	cyberClusters.forEach(cluster => {
		cluster.position.x -= cluster.userData.moveSpeed;
		cluster.lookAt(camera.position.x, cluster.position.y, camera.position.z);

		// Dynamically adjust glowBox opacity based on orientation to camera
		if (cluster.userData.glowBoxMaterial) {
			const glowMaterial = cluster.userData.glowBoxMaterial as THREE.MeshBasicMaterial;

			// Get the cluster's forward direction (local -Z axis in world space)
			tempClusterForward.set(0, 0, -1);
			cluster.getWorldQuaternion(tempClusterWorldQuaternion);
			tempClusterForward.applyQuaternion(tempClusterWorldQuaternion);

			// Get the vector from cluster to camera
			tempVecToCamera.subVectors(camera.position, cluster.position).normalize();

			const dot = tempClusterForward.dot(tempVecToCamera);

			let opacityFactor = 1.0;
			if (dot > 0.5) { // If more than half of the "front" is facing the camera
				const t = (dot - 0.5) / 0.5; // Normalize dot from [0.5, 1] to [0, 1]
				opacityFactor = 1.0 - t * 0.95; // Reduce opacity by up to 95% (making it very faint)
			}
			glowMaterial.opacity = baseGlowBoxOpacity * Math.max(0, opacityFactor); // Ensure opacity is not negative
		}

		cluster.children.forEach(block => {
			if (block instanceof THREE.Mesh && block.userData && block.userData.baseColorForBrightness) {
				const material = block.material as THREE.MeshBasicMaterial;
				const ud = block.userData;
				const brightnessMultiplier = (ud.maxBrightnessFactor - ud.minBrightnessFactor) *
					(0.5 + 0.5 * Math.sin(timeValue * ud.brightnessSpeed + ud.brightnessPhase)) +
					ud.minBrightnessFactor;
				const currentBrightnessScale = ud.initialEmissiveIntensity * brightnessMultiplier;

				// Update material color based on calculated brightness
				material.color.copy(ud.baseColorForBrightness).multiplyScalar(currentBrightnessScale);
			}
		});

		if (cluster.position.x + cluster.userData.clusterWidth / 2 < CLUSTER_DESTROY_X_LEFT) {
			clustersToRemove.push(cluster);
		}
	});

	clustersToRemove.forEach(cluster => {
		scene.remove(cluster);
		cluster.children.forEach(child => {
			if (child instanceof THREE.Mesh) {
				child.geometry.dispose();
				(child.material as THREE.Material).dispose();
			} else if (child instanceof THREE.LineSegments) { // Also dispose LineSegments
				child.geometry.dispose();
				(child.material as THREE.Material).dispose();
			}
		});
		const index = cyberClusters.indexOf(cluster);
		if (index > -1) cyberClusters.splice(index, 1);
	});

	if (cyberClusters.length < MAX_CLUSTERS) {
		if (Math.random() < 0.08) { // Slightly increased spawn chance
			const newCluster = createCluster(CLUSTER_SPAWN_X_RIGHT);
			scene.add(newCluster);
			cyberClusters.push(newCluster);
		}
	}

	renderStereo();
}

function renderStereo() {
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

onMounted(() => {
	logContainer.value = document.getElementById('cpp-log-overlay') as HTMLDivElement;
	init();
});

onUnmounted(() => {
	cancelAnimationFrame(animationFrameId);
	window.removeEventListener('resize', onWindowResize);

	cyberClusters.forEach(cluster => {
		scene.remove(cluster);
		cluster.children.forEach(child => {
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

	// Dispose main cube materials if they are ShaderMaterial
	if (cube && Array.isArray(cube.material)) {
		cube.material.forEach(m => m.dispose());
	} else if (cube && cube.material) {
		(cube.material as THREE.Material).dispose();
	}
	if (cube && cube.geometry) cube.geometry.dispose();
	if (scene && cube) scene.remove(cube);

	// Dispose FPS sprite material and texture
	if (fpsTextSprite && fpsTextSprite.material) fpsTextSprite.material.dispose();
	if (fpsTexture) fpsTexture.dispose();
	if (scene && fpsTextSprite) scene.remove(fpsTextSprite);

	if (renderer) {
		renderer.dispose();
	}
	// composer passes are typically managed by the composer or renderer dispose cycle

	delete (window as any).appendLogToUI;
});

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