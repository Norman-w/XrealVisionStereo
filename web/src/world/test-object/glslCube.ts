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


let glslCube: THREE.Mesh;
const uniforms = {
    time: {value: 0.0},
};
const geometry = new THREE.BoxGeometry(100, 100, 100);
const shaderMaterials = fragmentShaders.map(fsSource => {
    return new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShaderSource,
        fragmentShader: fsSource,
    });
});

glslCube = new THREE.Mesh(geometry, shaderMaterials);
export const initCube = () => {
    return glslCube;
}

export const releaseCube = () => {
    if (glslCube && Array.isArray(glslCube.material)) {
        glslCube.material.forEach(m => m.dispose());
    } else if (glslCube && glslCube.material) {
        (glslCube.material as THREE.Material).dispose();
    }
    if (glslCube && glslCube.geometry) glslCube.geometry.dispose();
    return glslCube;
}

export const animateCube = (timeValue: number) => {
    uniforms.time.value = timeValue;
    glslCube.rotation.x += 0.005;
    glslCube.rotation.y += 0.007;
    glslCube.rotation.z += 0.003;
    const orbitRadius = 3.0;//公转半径
    const cubeOffsetInWorld = new THREE.Vector3(50, 0, -1200);
    glslCube.position.x = orbitRadius * 50 * Math.cos(0.25 * timeValue) + cubeOffsetInWorld.x;
    glslCube.position.y = orbitRadius * Math.sin(0.25 * timeValue);
    glslCube.position.z = 1000 * Math.sin(0.4 * timeValue * 2.0)  + cubeOffsetInWorld.z;
}

export const getCubeRawGLSLShaders = (): { vertex: string, fragments: string[] } => {
    return {
        vertex: vertexShaderSource,
        fragments: [...fragmentShaders] // Return a copy of the array
    };
};