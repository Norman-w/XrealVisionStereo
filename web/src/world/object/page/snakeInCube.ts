import * as THREE from "three";
import { gsap } from "gsap"; // 引入 GSAP

const page = new THREE.Group();
const sideLength = 1000;
const innerSideLength = sideLength - 100;
const halfInnerSideLength = innerSideLength / 2;
const glowScaleFactor = 1.2; // 辉光Mesh的放大系数

// 随机生成1000个点
const points: THREE.Vector3[] = [];
for (let i = 0; i < 1000; i++) {
    points.push(new THREE.Vector3(
        Math.random() * innerSideLength - halfInnerSideLength,
        Math.random() * innerSideLength - halfInnerSideLength,
        Math.random() * innerSideLength - halfInnerSideLength
    ));
}

// 创建外部可见的立方体 (稍微调整透明度以便观察)
const outerGeometry = new THREE.BoxGeometry(sideLength, sideLength, sideLength);
const outerMaterial = new THREE.MeshBasicMaterial({
    color: 0x8888ff, // 淡蓝色以便区分
    transparent: true,
    opacity: 0.08, // 降低一点不透明度
    side: THREE.DoubleSide, // 确保内部也能看到
});
const outerCube = new THREE.Mesh(outerGeometry, outerMaterial);
page.add(outerCube);


// --- SnakeState Class ---
class SnakeState {
    head: THREE.Mesh; // 蛇头，代表当前位置
    glowHead: THREE.Mesh; // 辉光蛇头
    bodySegments: { main: THREE.Mesh, glow: THREE.Mesh }[] = []; // 存储代表路径段的 Mesh 对
    currentPathLength: number = 0; // 当前路径段的总长度

    snakeWidth: number;
    material: THREE.MeshLambertMaterial; // 改用 Lambert 材质以接收光照
    glowMaterial: THREE.MeshBasicMaterial; // 发光材质

    maxBodyLength: number; // 最大路径长度，超过则截断尾部
    points: THREE.Vector3[]; // 可用的目标点
    currentPosition: THREE.Vector3; // 当前蛇头精确位置
    currentTargetPoint: THREE.Vector3 | null = null; // 当前移动的目标点
    isMoving: boolean = false;
    speed: number = 100; // 单位/秒

    constructor(availablePoints: THREE.Vector3[]) {
        this.maxBodyLength = Math.floor(Math.random() * 200) + 100; // 100-300
        this.snakeWidth = Math.floor(Math.random() * 20) + 10; // 10-30

        const snakeColorValue = Math.random() > 0.5 ? 0x00ff00 : 0x0088ff; // 绿色或蓝色
        this.material = new THREE.MeshLambertMaterial({ // 使用 Lambert 材质
            color: snakeColorValue,
            side: THREE.DoubleSide,
        });

        // 发光效果
        this.glowMaterial = new THREE.MeshBasicMaterial({
            color: snakeColorValue,
            transparent: true,
            opacity: 0.4, // 辉光材质稍微透明
            depthWrite: false, // 辉光通常不写入深度缓冲区
            side: THREE.FrontSide, // 辉光只需要渲染外表面
        });

        this.points = [...availablePoints]; // 复制一份点位

        // 随机选择起始点
        const startPointIndex = Math.floor(Math.random() * this.points.length);
        this.currentPosition = this.points[startPointIndex].clone();
        // 从可用点中移除起始点，避免蛇一开始就选自己
        this.points.splice(startPointIndex, 1);

        // 创建蛇头 Mesh (主 Mesh)
        const headGeometry = new THREE.BoxGeometry(this.snakeWidth, this.snakeWidth, this.snakeWidth);
        this.head = new THREE.Mesh(headGeometry, this.material);
        this.head.position.copy(this.currentPosition);
        page.add(this.head); // 将蛇头添加到场景组

        // 创建辉光蛇头 Mesh
        const glowHeadGeometry = new THREE.BoxGeometry(this.snakeWidth, this.snakeWidth, this.snakeWidth); // 使用相同基础几何体
        this.glowHead = new THREE.Mesh(glowHeadGeometry, this.glowMaterial);
        this.glowHead.scale.set(glowScaleFactor, glowScaleFactor, glowScaleFactor); // 放大辉光头
        this.glowHead.position.copy(this.currentPosition);
        page.add(this.glowHead); // 将辉光蛇头添加到场景组

        // 初始时选择第一个目标点并开始移动
        this.chooseNextTargetAndMove();
    }

    // 选择下一个目标点并启动移动序列
    chooseNextTargetAndMove() {
        if (this.isMoving || this.points.length === 0) {
            // 如果正在移动或没有更多点可选，则返回
            // 可以添加逻辑：如果没有点可选，则重新使用所有点
            if (this.points.length === 0) {
                console.warn("Snake ran out of unique points, reusing.");
                this.points = points.filter(p => !p.equals(this.currentPosition));
                if(this.points.length === 0) return; // Still no points? Stop.
            } else {
                return;
            }
        }
        this.isMoving = true;

        const nextTargetIndex = Math.floor(Math.random() * this.points.length);
        this.currentTargetPoint = this.points[nextTargetIndex].clone();
        // 移除选中的目标点，避免连续选择同一个点
        this.points.splice(nextTargetIndex, 1);

        // console.log(`Snake moving from ${this.currentPosition.toArray().map(n=>n.toFixed(1))} to ${this.currentTargetPoint.toArray().map(n=>n.toFixed(1))}`);

        // 开始分步移动
        this.moveAxisStep(0); // 从第一个轴开始
    }

    // 递归函数，按顺序移动 X, Y, Z 轴
    moveAxisStep(axisIndex: number, moveOrder: number[] = [0, 1, 2].sort(() => Math.random() - 0.5)) {
        if (axisIndex >= moveOrder.length || !this.currentTargetPoint) {
            // 所有轴移动完成或目标丢失
            // console.log("Segment finished");
            if (this.currentTargetPoint) { // 确保目标点存在才拷贝
                this.currentPosition.copy(this.currentTargetPoint); // 确保最终位置精确
                this.head.position.copy(this.currentPosition);
                this.glowHead.position.copy(this.currentPosition); // 同步辉光头位置
            }
            this.isMoving = false;
            // 短暂延迟后选择下一个目标
            gsap.delayedCall(0.1, () => this.chooseNextTargetAndMove());
            return;
        }

        const currentAxis = moveOrder[axisIndex]; // 0=x, 1=y, 2=z
        const axisName = ['x', 'y', 'z'][currentAxis] as 'x' | 'y' | 'z';

        const startValue = this.currentPosition[axisName];
        const endValue = this.currentTargetPoint[axisName];
        const distance = Math.abs(endValue - startValue);

        if (distance < 0.1) { // 如果该轴向距离很小，直接跳到下一步
            this.moveAxisStep(axisIndex + 1, moveOrder);
            return;
        }

        const duration = distance / this.speed; // 根据距离和速度计算动画时间

        const segmentStartPosition = this.currentPosition.clone();

        // 使用 GSAP 制作蛇头移动动画 (作用于精确位置 currentPosition)
        gsap.to(this.currentPosition, {
            [axisName]: endValue,
            duration: duration,
            ease: "none", // 匀速运动
            onUpdate: () => {
                // 实时更新蛇头和辉光蛇头 Mesh 的位置
                this.head.position.copy(this.currentPosition);
                this.glowHead.position.copy(this.currentPosition); // 同步辉光头
            },
            onComplete: () => {
                // 当前轴向移动完成
                // 1. 创建代表此路径段的 Mesh (主段和辉光段)
                this.createBodySegment(segmentStartPosition, this.currentPosition, currentAxis);

                // 2. 继续移动下一个轴向
                this.moveAxisStep(axisIndex + 1, moveOrder);
            }
        });
    }

    // 创建并添加一个身体段 (包括主段和辉光段)
    createBodySegment(start: THREE.Vector3, end: THREE.Vector3, axis: number) {
        const distance = start.distanceTo(end);
        if (distance < 0.1) return; // 距离太短，不创建

        // 主段几何体和 Mesh
        const segmentGeometry = new THREE.BoxGeometry(
            axis === 0 ? distance : this.snakeWidth,
            axis === 1 ? distance : this.snakeWidth,
            axis === 2 ? distance : this.snakeWidth
        );
        const segmentMesh = new THREE.Mesh(segmentGeometry, this.material);

        // 辉光段几何体和 Mesh
        const glowSegmentGeometry = new THREE.BoxGeometry( // 使用独立的几何体实例
            axis === 0 ? distance : this.snakeWidth,
            axis === 1 ? distance : this.snakeWidth,
            axis === 2 ? distance : this.snakeWidth
        );
        const glowSegmentMesh = new THREE.Mesh(glowSegmentGeometry, this.glowMaterial);
        glowSegmentMesh.scale.set(glowScaleFactor, glowScaleFactor, glowScaleFactor); // 放大辉光段

        // 计算段的中点位置，并设置给主段和辉光段
        const centerPosition = new THREE.Vector3().lerpVectors(start, end, 0.5);
        segmentMesh.position.copy(centerPosition);
        glowSegmentMesh.position.copy(centerPosition);

        // 添加到场景
        page.add(segmentMesh);
        page.add(glowSegmentMesh);

        // 添加到身体数组 (存储对象)
        this.bodySegments.push({ main: segmentMesh, glow: glowSegmentMesh });
        this.currentPathLength += distance; // 增加路径长度

        // 检查是否需要截断尾部
        this.trimTail();

        // --- 可选：添加闪烁效果 (只作用于主段) ---
        this.flashSegment(segmentMesh);
        // ---
    }

    // 截断尾部逻辑
    trimTail() {
        const maxSegments = Math.floor(this.maxBodyLength / this.snakeWidth); // 估算最大段数

        while (this.bodySegments.length > maxSegments && this.bodySegments.length > 0) {
            const tailSegmentPair = this.bodySegments.shift(); // 移除数组头部的旧段对
            if (tailSegmentPair) {
                // 移除主段和辉光段
                page.remove(tailSegmentPair.main);
                page.remove(tailSegmentPair.glow);
                // 释放几何体资源
                tailSegmentPair.main.geometry.dispose();
                tailSegmentPair.glow.geometry.dispose(); // 释放辉光段几何体
            }
            // 这里没有精确更新 currentPathLength，如果需要精确控制长度，需要调整
        }
    }

    // 可选：段创建时的闪烁效果 (只作用于主段)
    flashSegment(segment: THREE.Mesh) {
        const originalColor = (segment.material as THREE.MeshLambertMaterial).color.getHex();
        // const flashColor = 0xffffff; // 闪烁为白色 (变量未使用，但效果是白色)
        const duration = 0.1; // 闪烁持续时间

        gsap.timeline()
            .to((segment.material as THREE.MeshLambertMaterial).color, { r: 1, g: 1, b: 1, duration: duration / 2 }) // 变白
            .to((segment.material as THREE.MeshLambertMaterial).color, { r: new THREE.Color(originalColor).r, g: new THREE.Color(originalColor).g, b: new THREE.Color(originalColor).b, duration: duration / 2 }); // 恢复原色
    }
}

// --- 全局管理 ---
let snakes: SnakeState[] = [];
const snakeCount = Math.floor(Math.random() * 8) + 3; // 3-10 条蛇

function initAllSnakes() {
    // 清理旧的蛇（如果重新初始化）
    snakes.forEach(snake => {
        // 移除头和辉光头
        if(snake.head) page.remove(snake.head);
        if(snake.glowHead) page.remove(snake.glowHead);
        // 移除所有身体段和辉光段
        snake.bodySegments.forEach(segPair => {
            if(segPair.main) page.remove(segPair.main);
            if(segPair.glow) page.remove(segPair.glow);
            // 几何体在 trimTail 中已释放，这里无需重复释放
        });
        // 如果需要，可以显式释放头的几何体 (虽然通常可重用)
        // if(snake.head && snake.head.geometry) snake.head.geometry.dispose();
        // if(snake.glowHead && snake.glowHead.geometry) snake.glowHead.geometry.dispose();
    });
    snakes = []; // 清空数组

    for (let i = 0; i < snakeCount; i++) {
        snakes.push(new SnakeState(points));
    }
    console.log(`Initialized ${snakes.length} snakes.`);
}

// --- 盒子旋转动画 ---
function startBoxRotationAnimation() {
    const duration = 1.1; // 快速切换视角的时间（秒）
    const delay = 3.0; // 切换视角之间的间隔（秒）

    // 计算随机目标旋转角度 (限制在 +/- 45度 范围内，避免过度旋转)
    const targetRotation = {
        x: (Math.random() - 0.5) * (Math.PI / 2), // -PI/4 to +PI/4
        y: (Math.random() - 0.5) * (Math.PI / 2), // -PI/4 to +PI/4
        z: 0 // 通常不旋转 Z 轴，保持上下方向
        // z: (Math.random() - 0.5) * (Math.PI / 4) // 如果需要 Z 轴旋转
    };

    gsap.to(page.rotation, {
        x: targetRotation.x,
        y: targetRotation.y,
        z: targetRotation.z,
        duration: duration,
        ease: "power2.inOut", // 非线性缓动，实现 "嗖" 的效果
        onComplete: () => {
            // 动画完成后，安排下一次调用
            gsap.delayedCall(delay, startBoxRotationAnimation);
        }
    });
}


// --- 初始化页面 ---
function initPage() {
    // 添加一些基本光照，因为我们用了 Lambert 材质
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 环境光
    page.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // 平行光
    directionalLight.position.set(500, 1000, 750);
    page.add(directionalLight);

    initAllSnakes(); // 初始化所有蛇

    // 设置整个页面的初始位置和旋转 (可以根据需要调整)
    page.position.set(-1000, 0, -2500);
    page.rotation.set(0, 0, 0); // 初始不旋转

    // 启动盒子旋转动画循环
    startBoxRotationAnimation();

    return page;
}


// 导出 page 对象和初始化函数
export { page, initPage };

// 注意：你需要确保在你的主渲染循环中调用了 GSAP 的更新（如果项目中单独管理动画循环）
// 或者如果你的项目是基于 Three.js 的标准 requestAnimationFrame 循环，
// 并且没有使用 GSAP，你需要：
// 1. 移除所有 gsap 相关代码。
// 2. 在 SnakeState 中实现 update(deltaTime) 方法来手动更新蛇头位置。
// 3. 创建一个全局的 updateSnakes(deltaTime) 函数，在主循环中调用，
//    该函数遍历所有 snakes 并调用它们的 update 方法。
// 4. 手动实现段的闪烁动画（如果需要）。
// 5. 手动实现盒子的旋转动画。