//把GLSL以RAW形式导入
import vertexShaderSource from '../../shaders/vertex.glsl?raw';
import fireFragmentShader1 from '../../shaders/fire1.fragment.glsl?raw';
import fireFragmentShader2 from '../../shaders/fire2.fragment.glsl?raw';
import fireFragmentShader3 from '../../shaders/fire3.fragment.glsl?raw';
import waterFragmentShader1 from '../../shaders/water1.fragment.glsl?raw';
import waterFragmentShader2 from '../../shaders/water2.fragment.glsl?raw';
import waterFragmentShader3 from '../../shaders/water3.fragment.glsl?raw';
import galaxyFragmentShader1 from '../../shaders/galaxy1.fragment.glsl?raw';
import galaxyFragmentShader2 from '../../shaders/galaxy2.fragment.glsl?raw';
import galaxyFragmentShader3 from '../../shaders/galaxy3.fragment.glsl?raw';
import * as THREE from "three";


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


let cube: THREE.Mesh;
const uniforms = {
    time: {value: 0.0},
};
const geometry = new THREE.BoxGeometry(2, 2, 2);
const shaderMaterials = fragmentShaders.map(fsSource => {
    return new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShaderSource,
        fragmentShader: fsSource,
    });
});

cube = new THREE.Mesh(geometry, shaderMaterials);
export const initCube = () => {
    return cube;
}

export const releaseCube = () => {
    if (cube && Array.isArray(cube.material)) {
        cube.material.forEach(m => m.dispose());
    } else if (cube && cube.material) {
        (cube.material as THREE.Material).dispose();
    }
    if (cube && cube.geometry) cube.geometry.dispose();
    return cube;
}

export const animateCube = (timeValue: number) => {
    uniforms.time.value = timeValue;
    cube.rotation.x += 0.005;
    cube.rotation.y += 0.007;
    cube.rotation.z += 0.003;
    const orbitRadius = 4.0;
    cube.position.x = orbitRadius * Math.cos(0.25 * timeValue);
    cube.position.y = orbitRadius * Math.sin(0.25 * timeValue);
    cube.position.z = 1.5 * Math.sin(0.4 * timeValue * 2.0);
}

export const getCubeRawGLSLShaders = (): { vertex: string, fragments: string[] } => {
    return {
        vertex: vertexShaderSource,
        fragments: [...fragmentShaders] // Return a copy of the array
    };
};