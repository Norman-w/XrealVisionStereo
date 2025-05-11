import * as THREE from 'three';
import {cameraState, camera} from "./main.ts";

const leftCamera = new THREE.PerspectiveCamera(camera.fov, cameraState.aspect / 2, camera.near, camera.far);
export {leftCamera};
