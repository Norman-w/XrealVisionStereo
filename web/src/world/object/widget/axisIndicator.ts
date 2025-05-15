import * as THREE from 'three';

// Default parameters
const DEFAULT_AXIS_LENGTH = 100; // mm
const DEFAULT_TEXT_COLOR = '#00FFFF'; // Techy Cyan color
const DEFAULT_FONT_SIZE_PX = 16; // Font size in pixels for canvas
const CANVAS_WIDTH = 128; // Power of 2 for texture efficiency
const CANVAS_HEIGHT = 32;  // Power of 2
const TEXT_OFFSET_FROM_AXIS_END = 15; // mm
const SPRITE_SCALE_FACTOR = 30; // Adjust to get desired text size in world units

// Helper to store canvas and context for updates
interface TextLabelSprite extends THREE.Sprite {
    canvas?: HTMLCanvasElement;
    context?: CanvasRenderingContext2D | null;
    updateText?: (text: string) => void;
}

export interface AxisIndicator extends THREE.Group {
    showValues: (values?: THREE.Vector3 | { x: number; y: number; z: number } | null) => void;
    dispose: () => void;
    _textX?: TextLabelSprite;
    _textY?: TextLabelSprite;
    _textZ?: TextLabelSprite;
    _showNumericValues: boolean;
    _axisLength: number;
}

function createAxisLine(direction: THREE.Vector3, color: THREE.ColorRepresentation, length: number): THREE.Line {
    const material = new THREE.LineBasicMaterial({ color });
    const points = [];
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(direction.clone().multiplyScalar(length));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, material);
}

function createAxisTextLabel(axisChar: string, initialValue: number, textColor: string, fontSizePx: number, position: THREE.Vector3): TextLabelSprite {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const context = canvas.getContext('2d');

    const sprite = new THREE.Sprite() as TextLabelSprite;
    sprite.canvas = canvas;
    sprite.context = context;

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });

    sprite.material = material;
    sprite.scale.set(SPRITE_SCALE_FACTOR * (CANVAS_WIDTH / CANVAS_HEIGHT), SPRITE_SCALE_FACTOR, SPRITE_SCALE_FACTOR);
    sprite.position.copy(position);

    sprite.updateText = (text: string) => {
        if (sprite.context && sprite.canvas && sprite.material.map) {
            sprite.context.clearRect(0, 0, sprite.canvas.width, sprite.canvas.height);
            sprite.context.font = `${fontSizePx}px Arial`;
            sprite.context.fillStyle = textColor;
            sprite.context.textAlign = 'left';
            sprite.context.textBaseline = 'middle';
            sprite.context.fillText(text, 5, sprite.canvas.height / 2); // Small padding
            (sprite.material.map as THREE.CanvasTexture).needsUpdate = true;
        }
    };

    sprite.updateText(`${axisChar}: ${initialValue.toFixed(2)}`);

    return sprite;
}

export function initAxisIndicator(
    showNumericValues: boolean = true,
    axisLength: number = DEFAULT_AXIS_LENGTH
): AxisIndicator {
    const group = new THREE.Group() as AxisIndicator;
    group._showNumericValues = showNumericValues;
    group._axisLength = axisLength;

    const xAxisLine = createAxisLine(new THREE.Vector3(1, 0, 0), 0xff0000, axisLength);
    group.add(xAxisLine);
    const yAxisLine = createAxisLine(new THREE.Vector3(0, 1, 0), 0x00ff00, axisLength);
    group.add(yAxisLine);
    const zAxisLine = createAxisLine(new THREE.Vector3(0, 0, 1), 0x0000ff, axisLength);
    group.add(zAxisLine);

    if (showNumericValues) {
        group._textX = createAxisTextLabel(
            'X',
            0,
            DEFAULT_TEXT_COLOR,
            DEFAULT_FONT_SIZE_PX,
            new THREE.Vector3(axisLength + TEXT_OFFSET_FROM_AXIS_END, 0, 0)
        );
        group.add(group._textX);

        group._textY = createAxisTextLabel(
            'Y',
            0,
            DEFAULT_TEXT_COLOR,
            DEFAULT_FONT_SIZE_PX,
            new THREE.Vector3(0, axisLength + TEXT_OFFSET_FROM_AXIS_END, 0)
        );
        group.add(group._textY);

        group._textZ = createAxisTextLabel(
            'Z',
            0,
            DEFAULT_TEXT_COLOR,
            DEFAULT_FONT_SIZE_PX,
            new THREE.Vector3(0, 0, axisLength + TEXT_OFFSET_FROM_AXIS_END)
        );
        group.add(group._textZ);
    }

    group.rotation.set(0, 0, 0); // No initial rotation, align with world axes

    group.showValues = (values?: THREE.Vector3 | { x: number; y: number; z: number } | null) => {
        if (!group._showNumericValues || !group._textX || !group._textY || !group._textZ) {
            return;
        }

        let xVal = 0, yVal = 0, zVal = 0;

        if (values) {
            xVal = values.x;
            yVal = values.y;
            zVal = values.z;
        } else {
            const worldPosition = new THREE.Vector3();
            group.getWorldPosition(worldPosition);
            xVal = worldPosition.x;
            yVal = worldPosition.y;
            zVal = worldPosition.z;
        }
        
        // The check for _textX, _textY, _textZ existence is done above.
        // And updateText itself has checks for canvas/context.
        if (group._textX && group._textX.updateText) {
            group._textX.updateText(`X: ${xVal.toFixed(2)}`);
        }
        if (group._textY && group._textY.updateText) {
            group._textY.updateText(`Y: ${yVal.toFixed(2)}`);
        }
        if (group._textZ && group._textZ.updateText) {
            group._textZ.updateText(`Z: ${zVal.toFixed(2)}`);
        }
    };

    group.dispose = () => {
        group.children.forEach(child => {
            if (child instanceof THREE.Line) {
                child.geometry.dispose();
                (child.material as THREE.Material).dispose();
            } else if (child instanceof THREE.Sprite && (child as TextLabelSprite).canvas) {
                // TextLabelSprite specific disposal
                const spriteLabel = child as TextLabelSprite;
                if (spriteLabel.material.map) {
                    spriteLabel.material.map.dispose(); // Dispose canvas texture
                }
                spriteLabel.material.dispose(); // Dispose sprite material
                // Canvas element itself doesn't have a dispose method, will be GC'd
            }
        });
        group._textX = undefined;
        group._textY = undefined;
        group._textZ = undefined;
    };

    if (group._showNumericValues) {
        group.showValues({ x: 0, y: 0, z: 0 });
    }

    return group;
}

export function releaseAxisIndicator(indicator: AxisIndicator | null): void {
    if (indicator) {
        if (indicator.parent) {
            indicator.parent.remove(indicator);
        }
        indicator.dispose();
    }
}

// Example usage (you would do this in your world.ts or similar):
/*
import { initAxisIndicator, releaseAxisIndicator } from './path/to/axisIndicator';

let axisGizmo: AxisIndicator | null = null;

function setupScene() {
    // ... other setup ...
    axisGizmo = initAxisIndicator(true, 150); // Show values, axis length 150mm
    axisGizmo.position.set(100, 50, -200); // Position it in the world
    scene.add(axisGizmo);

    // To update values later:
    // axisGizmo.showValues({ x: 10.5, y: 20.1, z: -5.3 });
    // Or to show its current world coordinates:
    // axisGizmo.showValues();
}

function cleanupScene() {
    releaseAxisIndicator(axisGizmo);
    axisGizmo = null;
    // ... other cleanup ...
}
*/ 