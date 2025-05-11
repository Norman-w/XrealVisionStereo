import * as THREE from "three";

const initGroundGrid = (): THREE.GridHelper => {
    const gridSize = 120;
    const gridDivisions = 120;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0xaaaaaa, 0x777777);
    gridHelper.position.y = -8; // Grid further down
    return gridHelper;
}

export {initGroundGrid};