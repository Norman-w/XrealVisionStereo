import * as THREE from "three";

let camera: THREE.PerspectiveCamera;

const cameraConfig = {
    aspect: window.innerWidth / window.innerHeight,
    fov: 75,
    near: 0.1,
    far: 1000,
}

const cameraState = {
    position: new THREE.Vector3(0, 0, 12), // Camera slightly further back
    rotation: new THREE.Euler(0, 0, 0),
    zoom: 1,
    fov: cameraConfig.fov,
    aspect: cameraConfig.aspect,
    near: cameraConfig.near,
    far: cameraConfig.far,
}

camera = new THREE.PerspectiveCamera(
    cameraConfig.fov,
    cameraConfig.aspect,
    cameraConfig.near,
    cameraConfig.far
);

camera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
export {cameraState,camera};