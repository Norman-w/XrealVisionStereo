import * as THREE from "three";

let fpsTextSprite: THREE.Sprite;
let fpsCanvas: HTMLCanvasElement, fpsContext: CanvasRenderingContext2D, fpsTexture: THREE.CanvasTexture;
let lastFPSTime = 0;
let frameCount = 0;
let currentFPS = 0;

function initFPS() : THREE.Sprite {
    fpsCanvas = document.createElement('canvas');
    fpsCanvas.width = 256;
    fpsCanvas.height = 128;
    fpsContext = fpsCanvas.getContext('2d')!;
    fpsContext.font = "Bold 40px Arial";
    fpsContext.fillStyle = "rgba(150,150,0,0.9)"; // FPS文本颜色更暗，尝试避免辉光
    fpsTexture = new THREE.CanvasTexture(fpsCanvas);
    const spriteMaterial = new THREE.SpriteMaterial({map: fpsTexture});
    fpsTextSprite = new THREE.Sprite(spriteMaterial);
    fpsTextSprite.scale.set(2 * (256 / 128), 2, 1);
    fpsTextSprite.position.set(-2, 1.5, 0);
    return fpsTextSprite;
}

function animateFPS(now: DOMHighResTimeStamp) {
    frameCount++;

    if (now >= lastFPSTime + 1000) {
        currentFPS = frameCount;
        frameCount = 0;
        lastFPSTime = now;
        fpsContext.clearRect(0, 0, fpsCanvas.width, fpsCanvas.height);
        fpsContext.fillText(`FPS: ${currentFPS}`, 10, 50);
        fpsTexture.needsUpdate = true;
    }
}

function releaseFPS() : THREE.Sprite {
    if (fpsTextSprite) {
        fpsTextSprite.material.dispose();
        fpsTextSprite.geometry.dispose();
    }
    if (fpsCanvas) {
        fpsCanvas.width = 0;
        fpsCanvas.height = 0;
    }
    if (fpsTextSprite && fpsTextSprite.material) fpsTextSprite.material.dispose();
    if (fpsTexture) fpsTexture.dispose();
    return fpsTextSprite;
}

export {initFPS, releaseFPS, animateFPS}