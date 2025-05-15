import * as THREE from "three";
import gsap from 'gsap'; // 首先需要安装并导入 gsap

const page = new THREE.Group();

function initPanel() {
    const panelWidth = 640;
    const panelHeight = 480;
    //显示一个面板
    const panelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    const panelMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() * 0x444444 + 0x111111, // 随机偏暗颜色
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.1,
    });
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    panelMesh.position.set(0, 0, 0);
    panelMesh.rotation.set(0, 0, 0);
    panelMesh.scale.set(1, 1, 1);
    panelMesh.castShadow = true;
    panelMesh.receiveShadow = true;
    panelMesh.name = "panel";
    panelMesh.visible = true;
    return panelMesh;
}

class CircleState {
    circle: THREE.Mesh;
    geometry: THREE.RingGeometry;
    material: THREE.MeshBasicMaterial;
    animation: gsap.core.Timeline;

    constructor(innerRadius: number, outerRadius: number) {
        // 随机初始长度和角度
        const initialLength = Math.PI * (0.25 + Math.random() * 0.75); // 1/4 到 1 圆之间随机
        const initialRotation = Math.PI * 2 * Math.random(); // 0 到 2π 之间随机旋转角度

        this.geometry = new THREE.RingGeometry(
            innerRadius,
            outerRadius,
            32,
            1,
            0,
            initialLength
        );

        this.material = new THREE.MeshBasicMaterial({
            color: Math.random() * 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: Math.random() * 0.3 + 0.5, // 增加最小透明度
            polygonOffset: true, // Enable polygon offset
            polygonOffsetFactor: -1, // Try -1 first
            polygonOffsetUnits: -1   // Try -1 first
        });

        this.circle = new THREE.Mesh(this.geometry, this.material);
        // 设置随机初始旋转角度
        this.circle.rotation.z = initialRotation;

        this.animation = gsap.timeline({
            repeat: -1,
            yoyo: true
        });

        this.startAnimation(initialLength, initialRotation);
    }

    startAnimation(initialLength: number, initialRotation: number) {
        const params = {
            thetaLength: initialLength,
            rotation: initialRotation
        };

        // 随机目标长度和旋转角度
        const targetLength = Math.PI * (1.25 + Math.random() * 0.5); // 5/4 到 7/4 之间
        const targetRotation = initialRotation + Math.PI * (1.5 + Math.random()); // 在初始角度基础上增加 1.5π 到 2.5π

        this.animation
            .to(params, {
                thetaLength: targetLength,
                rotation: targetRotation,
                duration: 2 + Math.random() * 3,
                ease: "power2.inOut",
                onUpdate: () => {
                    const newGeometry = new THREE.RingGeometry(
                        this.geometry.parameters.innerRadius,
                        this.geometry.parameters.outerRadius,
                        32,
                        1,
                        0,
                        params.thetaLength
                    );

                    this.geometry.dispose();
                    this.geometry = newGeometry;
                    this.circle.geometry = this.geometry;
                    this.circle.rotation.z = params.rotation;
                }
            })
            .to(params, { // Chained .to() for the reverse animation
                thetaLength: initialLength,
                rotation: targetRotation + Math.PI * (1.5 + Math.random()), // Further rotate for yoyo effect
                duration: 2 + Math.random() * 3,
                ease: "power2.inOut",
                onUpdate: () => {
                    const newGeometry = new THREE.RingGeometry(
                        this.geometry.parameters.innerRadius,
                        this.geometry.parameters.outerRadius,
                        32,
                        1,
                        0,
                        params.thetaLength
                    );

                    this.geometry.dispose();
                    this.geometry = newGeometry;
                    this.circle.geometry = this.geometry;
                    this.circle.rotation.z = params.rotation;
                }
            });
    }
}

const circles: CircleState[] = [];
const numberOfCircles = 10; // 创建10个圆环
const radiusStep = 20; // 每个圆环半径增加20
const initialRadius = 50; // 第一个圆环的内半径

function initAllCircles() {
    for (let i = 0; i < numberOfCircles; i++) {
        const innerRadius = initialRadius + i * radiusStep;
        const outerRadius = innerRadius + radiusStep * (0.3 + Math.random() * 0.4); // 外半径稍微随机一点，但要大于内半径
        const circleState = new CircleState(innerRadius, outerRadius);
        circles.push(circleState);
        page.add(circleState.circle);
    }
}

function initPage() {
    // 初始化页面
    initAllCircles();
    const panel = initPanel();
    page.add(panel);
    page.position.set(300, 0, -700);
    page.rotation.set(0, 0, 0);
    page.scale.set(1, 1, 1);
    page.castShadow = true;
    page.receiveShadow = true;
    page.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    page.name = "page";
    page.visible = true;
    return page;
}

function releasePage() {
    circles.forEach(circleState => {
        circleState.animation.kill(); // 停止动画
        circleState.geometry.dispose();
        circleState.material.dispose();
        page.remove(circleState.circle);
    });
    circles.length = 0; // 清空数组

    const panel = page.getObjectByName("panel") as THREE.Mesh;
    if (panel) {
        if (panel.geometry) {
            panel.geometry.dispose();
        }
        if (panel.material) {
            // Check if material is an array or single material
            if (Array.isArray(panel.material)) {
                panel.material.forEach(m => m.dispose());
            } else {
                (panel.material as THREE.Material).dispose();
            }
        }
        page.remove(panel);
    }
    // page group本身不需要特殊dispose，子对象移除和dispose后，它会被垃圾回收
}

export { initPage, releasePage };