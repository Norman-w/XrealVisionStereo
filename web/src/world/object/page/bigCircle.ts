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
            .to(params, {
                thetaLength: initialLength,
                rotation: targetRotation + Math.PI * (1.5 + Math.random()),
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

// 修改初始化圆环的函数
function initAllCircles() {
    let lastOuterRadius = 0;
    const largestCircleOuterRadius = 220;
    const minCircleInnerRadius = 60;
    const randomCircleCount = Math.floor(Math.random() * 10) + 20;
    const allCircleWidth = Math.floor(Math.random() * (largestCircleOuterRadius - minCircleInnerRadius)) + minCircleInnerRadius;

    const circleWidths = [];
    let totalWidth = 0;
    for (let i = 0; i < randomCircleCount; i++) {
        const width = Math.random() * (allCircleWidth / randomCircleCount);
        circleWidths.push(width);
        totalWidth += width;
    }

    const circleWidthsRatio = circleWidths.map((width) => width / totalWidth);

    for (let i = 0; i < randomCircleCount; i++) {
        const innerRadius = lastOuterRadius;
        const outerRadius = innerRadius + allCircleWidth * circleWidthsRatio[i];

        const circleState = new CircleState(innerRadius, outerRadius);

        circleState.circle.castShadow = true;
        circleState.circle.receiveShadow = true;

        circles.push(circleState);
        lastOuterRadius = outerRadius;
    }

    circles.forEach(circleState => {
        page.add(circleState.circle);
    });
}

// 修改 createCircle 函数（如果不再使用可以删除）

// 修改渲染函数
function renderPage() {
    // 使用 GSAP 时，不需要在这里更新动画
    // GSAP 会自动处理动画更新
}

// 修改释放函数
function releasePage() {
    // 清理所有动画和几何体
    circles.forEach(circleState => {
        circleState.animation.kill();
        circleState.geometry.dispose();
        circleState.material.dispose();
    });
    circles.length = 0;
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

export {initPage, renderPage, releasePage};