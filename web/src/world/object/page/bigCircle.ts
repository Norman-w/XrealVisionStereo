/*


显示一个页面主要是以一个大圆盘里面有多层环每一层在随机变化扭动的页面


* */

import * as THREE from "three";

//640*480大小的矩形页面
const edge = new THREE.PlaneGeometry(640, 480);
const page = new THREE.Group();
function initPage() {
    //创建一个材质
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
    });
    //创建一个平面
    const plane = new THREE.Mesh(edge, material);
    //设置平面的位置
    plane.position.set(0, 0, 0);
    //设置平面的旋转
    plane.rotation.set(0, 0, 0);
    //添加平面到页面
    page.add(plane);
    //设置页面的位置
    page.position.set(0, 0, -900);
    //设置页面的旋转
    page.rotation.set(0, 0, 0);
    //设置页面的缩放
    page.scale.set(1, 1, 1);
    //设置页面的透明度
    page.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.material.opacity = Math.random();
            child.material.transparent = true;
        }
    });
    //设置页面的颜色
    page.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.material.color.set(Math.random() * 0xffffff);
        }
    });
    //设置页面的材质
    page.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshBasicMaterial({
                color: Math.random() * 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: Math.random(),
            });
        }
    });
    //设置页面的边框(如果设置为true则只显示边框)
    page.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.material.wireframe = false;
        }
    });
    //设置页面的阴影
    page.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    //返回THREE对象
    return page;
}

function renderPage() {

}
function releasePage() {
}

export { initPage, renderPage, releasePage };