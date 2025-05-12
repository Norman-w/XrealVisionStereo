<template>
	<div class="stereo-container">
		<div id=""></div>
		<div id="left-eye-overlay" class="debug-overlay" v-show="isFullResolution">
			Left Eye
		</div>
		<div id="right-eye-overlay" class="debug-overlay" v-show="isFullResolution || !isFullResolution">
			Right Eye
		</div>
		<CPlusPlusLogs v-show="showCppLog" ref="cppLog" />
		<div ref="canvasContainer"></div>
		<button @click="toggleCppLog" class="toggle-log-button">
			{{ showCppLog ? 'Hide' : 'Show' }} Log
		</button>
	</div>
</template>

<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue';
import CPlusPlusLogs from "./CPlusPlusLogs.vue";
import {camera, cameraState} from "../world/camera/main.ts";
import {bloomPass, composer} from "../world/post-processing/composer.ts";
import {initWorld, releaseWorld, renderer, renderWorld, scene} from "../world/world.ts";
import {animateFPS} from "../world/billboard/fps.ts";
import {animateCube} from "../world/test-object/cube.ts";
import {animateCyberSpaceClusters} from "../world/object/cluster/container.ts";

const canvasContainer = ref<HTMLDivElement | null>(null);
const logContainer = ref<HTMLDivElement | null>(null);
const showCppLog = ref(false);
const cppLog = ref<InstanceType<typeof CPlusPlusLogs> | null>(null);

let animationFrameId: number;

function toggleCppLog() {
	showCppLog.value = !showCppLog.value;
}

const isFullResolution = ref(false);

function init() {
	window.addEventListener('resize', onWindowResize, false);
	(window as any).appendLogToUI = cppLog.value?.appendLog;
	initWorld(canvasContainer.value as HTMLDivElement);
	animate();
	console.log("init() finished");
}

function onWindowResize() {
	const width = window.innerWidth;
	const height = window.innerHeight;
	isFullResolution.value = width === 3840 && height === 1080;
	cameraState.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height);
	composer.setSize(width, height); // Update composer size
	document.getElementById('left-eye-overlay')!.style.display = isFullResolution.value ? 'block' : 'none';
	document.getElementById('right-eye-overlay')!.style.display = isFullResolution.value ? 'block' : 'block';
	// For UnrealBloomPass, if resolution issues arise, one might need to update its internal resolution
	// or recreate it, but composer.setSize often handles this for its passes.
	bloomPass.resolution.set(width, height);
}

function animate() {
	animationFrameId = requestAnimationFrame(animate);
	const now = performance.now();
	animateFPS(now);
	const timeValue = now * 0.001;

	animateCube(timeValue);
	animateCyberSpaceClusters(
		timeValue,
		needRemoveObj=>scene.remove(needRemoveObj),
		needAddObj=>scene.add(needAddObj)
	);
	renderWorld(isFullResolution.value);
}

onMounted(() => {
	logContainer.value = document.getElementById('cpp-log-overlay') as HTMLDivElement;
	init();
});

onUnmounted(() => {
	cancelAnimationFrame(animationFrameId);
	window.removeEventListener('resize', onWindowResize);
	releaseWorld();
	if (renderer) {
		renderer.dispose();
	}
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
/*当屏幕宽度不够3840的时候,只显示右眼满宽度*/
@media (max-width: 3840px) {
	#left-eye-overlay {
		display: none;
	}
	#right-eye-overlay {
		left: 0;
		width: 100vw; /* Full width */
	}
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