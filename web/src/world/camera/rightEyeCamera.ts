import * as THREE from "three";
import {cameraState, camera} from "./main.ts";


const rightCamera = new THREE.PerspectiveCamera(camera.fov, cameraState.aspect / 2, camera.near, camera.far);

export {rightCamera};