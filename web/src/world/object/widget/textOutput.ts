/*


这个组件是静态的内容输出窗,带有非常炫酷的效果.
背景色调是灰黑色科技感颜色,边框有霓虹灯效果的蓝色光晕
文字内容是微微发光的科技感绿色
每段话中间停顿设定的值比如0.4秒(也就是换行符用多久来显示)
一次可以接收多段话,但是总差异时间内显示出来,所以他是会自己控制速度的
    比如我们设置的是新文本使用2秒把所有的剩余没显示的显示出来,换行符认为占用10个字的时间
        我们现在已经显示了第一段的前100个字,后面还有100个字没显示,然后收到了新的4个段总计1000字
        那么我们现在总共剩余显示的段落结束符为1+4=5段共计10*5=50个字符, 然后有100+1000=1100字
        总计就是1100+50=1150个字符的时间均分总的2秒,每个字的显示时间是2/1150秒.
        这时候我们开始按照时间来更新要蹦出的文字
期初我们会设置好了组件的宽度,高度,每个格子(文字)的宽度,高度
然后按照这些信息均分成若干个等分的格子,每个格子中间可以显示一个文字
我们会用一个缓存来记录当前显示的文字,当最后一行填满以后,所有行都向上挪动然后新的行开始接收内容



* */
import * as THREE from "three";
// import { Text } from 'troika-three-text'; // REMOVED
import { gsap } from 'gsap'; // 引入 GSAP
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'; // Import FontLoader
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'; // Import TextGeometry

// --- 常量定义 ---
const widgetWidth = 1000; // 1米宽度 (1000mm)
const widgetHeight = 300; // 0.3米高度 (300mm)
const padding = 20;         // 内边距 (20mm)

const backgroundColor = 0x1a1a2e; // 深蓝灰科技感背景
const borderColor = 0x00ffff;     // 青色/蓝色霓虹灯主色
const borderGlowColor = 0x00aaff;  // 霓虹灯辉光颜色（更浅更亮一点的蓝）

// const textRows = 8; // OLD: Represents physical lines of Text objects
// const lineHeight = (widgetHeight - padding * 2) / textRows; // OLD

const characterRows = 8; // 物理字符行数
const charactersPerLine = 40; // 每行最大字符数 (估算值, 可调整)

const characterCellHeight = (widgetHeight - padding * 2) / characterRows;
const characterCellWidth = (widgetWidth - padding * 2) / charactersPerLine;

const placeholderCharColor = 0x00ff00; // 字符占位符颜色 (科技感绿色)
const placeholderCharOpacity = 0.9;
const textMaterialColor = 0x00ff00; // 文本颜色 (科技感绿色)
const textEmissiveColor = 0x00cc00; // 文本自发光颜色，比主色稍暗或不同，用于辉光感
const textCharacterSize = characterCellHeight * 0.6; // 文本字符大小，基于单元格高度
const textGeometryHeight = textCharacterSize * 0.1; // 文本几何体厚度，可以很小

const totalDurationPerAppendMs = 2000; // 新文本在2秒内显示完
const newLineCharAsLength = 10;       // 换行符等效10个字符长度

// --- 主 Widget Group ---
const widget = new THREE.Group();
let loadedFont: any | null = null; // To store the loaded font (Using any to bypass Font type issue for now)

// --- 状态类定义 (WidgetState 结构会改变) ---
class LineState {
    // text: string = ""; // No longer directly storing line text here for display
    // fullText: string = "";
    // currentIndexInFullText: number = 0;
    isProcessed: boolean = false; // Example: track if this logical line is fully typed out
}

type PendingSegment = string | { type: 'newline' };

class WidgetState {
    // lines: LineState[] = []; // OLD: No longer an array of LineState in the same way
    pendingSegments: PendingSegment[] = [];
    
    currentCharacterTimeMs: number = 50;
    timeSinceLastCharMs: number = 0;
    
    // Cursor position for typing on the physical grid
    currentTypingRow: number = 0;
    currentTypingCol: number = 0;
    
    isAnimating: boolean = false;
    displayWindowEndTime: number = 0; // Timestamp when the current display window should end

    // We might not need a per-line state array if we manage chars directly
    // constructor(numPhysicalLines: number) { ... } // OLD

    getTotalEquivalentCharsPending(): number { // Added back for appendText calculation
        let totalChars = 0;
        this.pendingSegments.forEach(segment => {
            if (typeof segment === 'string') {
                totalChars += segment.length;
            } else if (segment.type === 'newline') {
                totalChars += newLineCharAsLength; // newLineCharAsLength is a global const
            }
        });
        return totalChars;
    }
}

let globalWidgetState: WidgetState;

// --- 初始化函数 ---

/**
 * 初始化组件的背景面板
 */
function initBackgroundPanel(): THREE.Mesh {
    const panelGeometry = new THREE.PlaneGeometry(widgetWidth, widgetHeight);
    const panelMaterial = new THREE.MeshBasicMaterial({
        color: backgroundColor,
        transparent: true,
        opacity: 0.85 // 可以带一点透明度
    });
    const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
    panelMesh.position.z = -1; // 稍微往后一点，避免与边框或文字 Z-fighting
    return panelMesh;
}

/**
 * 初始化组件的边框和霓虹灯效果
 * (这里使用简化的线条模拟，Bloom 效果需要在项目级别EffectComposer中配合)
 */
function initBorder(): THREE.Group {
    const borderGroup = new THREE.Group();
    const halfW = widgetWidth / 2;
    const halfH = widgetHeight / 2;

    const pointsArr = [
        new THREE.Vector3(-halfW, -halfH, 0),
        new THREE.Vector3( halfW, -halfH, 0),
        new THREE.Vector3( halfW,  halfH, 0),
        new THREE.Vector3(-halfW,  halfH, 0),
        new THREE.Vector3(-halfW, -halfH, 0) // 闭合路径
    ];

    // 主边框线
    const borderLineGeometry = new THREE.BufferGeometry().setFromPoints(pointsArr);
    const borderLineMaterial = new THREE.LineBasicMaterial({
        color: borderColor,
        linewidth: 2 // 注意: LineBasicMaterial 的 linewidth 在大部分现代GPU上可能固定为1
    });
    const borderLine = new THREE.Line(borderLineGeometry, borderLineMaterial);
    borderGroup.add(borderLine);

    const glowLineMaterial = new THREE.LineBasicMaterial({
        color: borderGlowColor,
        linewidth: 4, // 更粗一点
        transparent: true,
        opacity: 0.6
    });
    const glowLine = new THREE.Line(borderLineGeometry.clone(), glowLineMaterial); // 复用几何体
    glowLine.scale.set(1.02, 1.02, 1.02); // 稍微放大一点点，使其在主边框外侧
    borderGroup.add(glowLine);
    
    return borderGroup;
}

let characterPlaceholders: THREE.Mesh[][] = []; // 2D array for char placeholders
let characterMaterials: THREE.MeshBasicMaterial[][] = []; // Store materials for visibility toggling

/**
 * 初始化字符占位符网格
 */
function initCharacterPlaceholders(font: any): void {
    characterPlaceholders = []; // Clear previous placeholders
    characterMaterials = [];

    const startX = -widgetWidth / 2 + padding + characterCellWidth / 2;
    const startY =  widgetHeight / 2 - padding - characterCellHeight / 2;

    for (let r = 0; r < characterRows; r++) {
        const rowPlaceholders: THREE.Mesh[] = [];
        const rowMaterials: THREE.MeshBasicMaterial[] = [];
        for (let c = 0; c < charactersPerLine; c++) {
            // Create a basic material for each character, initially invisible
            const charMaterial = new THREE.MeshBasicMaterial({
                color: textMaterialColor,
                transparent: true,
                opacity: placeholderCharOpacity, // Use this for now, can adjust
                visible: false
            });
            
            // Placeholder geometry for now, will be replaced by TextGeometry
            // Or, create an empty mesh and add geometry later
            const charMesh = new THREE.Mesh(new THREE.BufferGeometry(), charMaterial); 
            
            charMesh.position.set(
                startX + c * characterCellWidth,
                startY - r * characterCellHeight,
                0.1 // Slightly in front of the background
            );
            widget.add(charMesh);
            rowPlaceholders.push(charMesh);
            rowMaterials.push(charMaterial);
        }
        characterPlaceholders.push(rowPlaceholders);
        characterMaterials.push(rowMaterials);
    }
    loadedFont = font; // Store the loaded font
}

// Function to update or create text geometry for a specific cell
function updateCharacterCell(row: number, col: number, char: string | null): void {
    if (!loadedFont || row < 0 || row >= characterRows || col < 0 || col >= charactersPerLine) {
        return;
    }

    const charMesh = characterPlaceholders[row][col];
    const charMaterial = characterMaterials[row][col];

    if (char && char !== ' ') { // If char is not null or space, create/update TextGeometry
        // Dispose old geometry if it exists
        if (charMesh.geometry && charMesh.geometry !== (THREE.BufferGeometry.prototype)) { // Avoid disposing the initial empty BufferGeometry prototype
             if (charMesh.geometry !== null && typeof (charMesh.geometry as THREE.BufferGeometry).dispose === 'function') {
                (charMesh.geometry as THREE.BufferGeometry).dispose();
            }
        }
        
        const textGeo = new TextGeometry(char, {
            font: loadedFont,
            size: textCharacterSize,
            depth: textGeometryHeight,
            curveSegments: 4, // Lower for pixel font
            bevelEnabled: false
        });
        textGeo.center(); // Center the geometry
        charMesh.geometry = textGeo;
        charMaterial.visible = true;
    } else { // If char is null or space, make it invisible and clear geometry
        charMaterial.visible = false;
        // Optionally, dispose and replace with a simple geometry if memory is a concern for many empty cells
        if (charMesh.geometry && charMesh.geometry !== (THREE.BufferGeometry.prototype)) {
             if (charMesh.geometry !== null && typeof (charMesh.geometry as THREE.BufferGeometry).dispose === 'function') {
                (charMesh.geometry as THREE.BufferGeometry).dispose();
            }
            charMesh.geometry = new THREE.BufferGeometry(); // Reset to empty geometry
        }
    }
}

// --- 主初始化和导出 ---
// let physicalTextLines: Text[] = []; // REMOVED

export function initWidget(): THREE.Group {
    // Clear existing children and dispose resources
    while(widget.children.length > 0){
        const child = widget.children[0];
        widget.remove(child);
        if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                 const material = child.material;
                 if (Array.isArray(material)) material.forEach(m => m.dispose());
                 else (material as THREE.Material).dispose();
            }
        }
    }
    characterPlaceholders = []; 
    characterMaterials = [];
    loadedFont = null;

    globalWidgetState = new WidgetState();

    const backgroundPanel = initBackgroundPanel();
    widget.add(backgroundPanel);

    const border = initBorder();
    widget.add(border);

    // Load font and then initialize character placeholders
    const fontLoader = new FontLoader();
    fontLoader.load('fonts/press_start_2p_regular.typeface.json', 
        (font) => { // onLoad callback
            console.log("Font loaded successfully!");
            initCharacterPlaceholders(font);
            // If there was any pending text added before font loaded, maybe trigger an update
            if (globalWidgetState && globalWidgetState.pendingSegments.length > 0 && !globalWidgetState.isAnimating) {
                console.log("[TEXTOUTPUT] Font loaded, pending text exists. Starting animation ticker.");
                globalWidgetState.isAnimating = true;
                // Reset time since last char to ensure smooth start with potentially new char time.
                globalWidgetState.timeSinceLastCharMs = 0; 
                gsap.ticker.add(typewriterUpdate);
            }
        },
        (xhr) => { // onProgress callback
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => { // onError callback
            console.error("Error loading font:", error);
             // Fallback or error handling: Initialize with placeholders if font fails?
            // For now, just log the error. The widget won't display text.
        }
    );

    return widget;
}

export function releaseWidget(): void {
    if (globalWidgetState && globalWidgetState.isAnimating) {
        gsap.ticker.remove(typewriterUpdate);
        globalWidgetState.isAnimating = false;
    }
    // characterPlaceholders are children of 'widget', their geometry/material is disposed in initWidget's cleanup loop for now.
    // If not, explicit disposal here would be: 
    characterPlaceholders.forEach(row => row.forEach(charMesh => {
        if (charMesh.geometry) charMesh.geometry.dispose();
        // Materials are in characterMaterials and will be disposed below if needed
        // if (charMesh.material) (charMesh.material as THREE.Material).dispose(); // No, use characterMaterials
    }));
    characterPlaceholders = [];
    characterMaterials.forEach(row => row.forEach(material => material.dispose()));
    characterMaterials = [];
     while(widget.children.length > 0){
        const child = widget.children[0];
        widget.remove(child);
        if ((child as THREE.Mesh).geometry) {
            (child as THREE.Mesh).geometry.dispose();
        }
        if ((child as THREE.Mesh).material) {
             const material = (child as THREE.Mesh).material;
             if (Array.isArray(material)) material.forEach(m => m.dispose());
             else (material as THREE.Material).dispose();
        }
    }
    console.log("TextOutput widget released (custom grid).");
}

export function appendText(textToAppend: string): void {
    if (!globalWidgetState) {
        console.error("Widget not initialized. Call initWidget() first.");
        return;
    }
    // console.log(`%c[TEXTOUTPUT] appendText called. Current queue length (segments): ${globalWidgetState.pendingSegments.length}`, 'color: blue', { textToAppend }); // Keep for debug

    const newSegments: PendingSegment[] = [];
    const splitByNewline = textToAppend.split('\n');
    splitByNewline.forEach((segment, index) => {
        if (segment.length > 0) newSegments.push(segment);
        if (index < splitByNewline.length - 1) newSegments.push({ type: 'newline' });
    });

    globalWidgetState.pendingSegments.push(...newSegments);
    // console.log(`%c[TEXTOUTPUT] New queue length (segments): ${globalWidgetState.pendingSegments.length}`, 'color: blue'); // Keep for debug

    const totalEquivalentChars = globalWidgetState.getTotalEquivalentCharsPending();
    // const prevCharTime = globalWidgetState.currentCharacterTimeMs; // Keep for debug
    if (totalEquivalentChars > 0) {
        globalWidgetState.currentCharacterTimeMs = totalDurationPerAppendMs / totalEquivalentChars;
    } else {
        globalWidgetState.currentCharacterTimeMs = 50;
    }
    // console.log(
    //     `%c[TEXTOUTPUT] Recalculated currentCharacterTimeMs. Prev: ${prevCharTime.toFixed(2)}ms, New: ${globalWidgetState.currentCharacterTimeMs.toFixed(2)}ms (Total Chars: ${totalEquivalentChars}, Duration: ${totalDurationPerAppendMs}ms)`,
    //     'color: green'
    // ); // Keep for debug
    
    // Set/reset the display window end time
    globalWidgetState.displayWindowEndTime = performance.now() + totalDurationPerAppendMs;
    console.log(`%c[TEXTOUTPUT] Display window set to end at: ${new Date(globalWidgetState.displayWindowEndTime).toLocaleTimeString()}`, 'color: purple');

    globalWidgetState.timeSinceLastCharMs = 0; // Reset accumulated time to apply new speed immediately for the next frame calculation

    if (!globalWidgetState.isAnimating && globalWidgetState.pendingSegments.length > 0) {
        // console.log("%c[TEXTOUTPUT] Starting animation ticker.", 'color: orange'); // Keep for debug
        globalWidgetState.isAnimating = true;
        gsap.ticker.add(typewriterUpdate);
    }
}

function typewriterUpdate(_time: number, deltaTimeInSeconds: number) { // deltaTime is in seconds
    const MAX_DELTA_TIME_MS = 100; // Max allowed deltaTime in milliseconds (e.g., for 10 FPS as a cap)
    let deltaTimeMs = deltaTimeInSeconds * 1000;

    if (deltaTimeMs > MAX_DELTA_TIME_MS) {
        console.warn(`%c[TICKER] Original deltaTime was too large (${deltaTimeMs.toFixed(2)}ms), clamping to ${MAX_DELTA_TIME_MS}ms`, 'color:brown');
        deltaTimeMs = MAX_DELTA_TIME_MS;
    }

    const currentTime = performance.now();
    console.log(`%c[TICKER] dT: ${deltaTimeMs.toFixed(2)}ms, Orig_dT_s: ${deltaTimeInSeconds.toFixed(4)}s, currentTime: ${currentTime.toFixed(2)}, charTime: ${globalWidgetState ? globalWidgetState.currentCharacterTimeMs.toFixed(2) : 'N/A'}ms`, 'color:gray'); // DEBUG LOG, showing clamped and original
    let gs = globalWidgetState; // shorthand for globalWidgetState

    if (!gs || !gs.isAnimating) return;

    // Check if display window has expired
    if (currentTime > gs.displayWindowEndTime) {
        console.log("%c[TEXTOUTPUT] Display window expired. Clearing pending segments and stopping animation.", 'color: red');
        gs.pendingSegments = []; // Discard remaining text
        gs.isAnimating = false;
        gsap.ticker.remove(typewriterUpdate);
        return;
    }

    gs.timeSinceLastCharMs += deltaTimeMs; // Accumulate time in milliseconds USING CLAMPED deltaTimeMs

    if (gs.currentCharacterTimeMs <= 0) {
        console.warn("[TEXTOUTPUT] currentCharacterTimeMs is zero or negative, animation might behave unexpectedly.");
        // If queue still has items, but char time is bad, maybe stop to prevent issues
        if (gs.pendingSegments.length > 0) { 
            // Decide: stop or use a default safe char time? For now, let it try to proceed or be caught by window expiry.
        }
        //return; // Or try to recover/stop
    }

    const charsToShowThisFrame = gs.currentCharacterTimeMs > 0 ? Math.floor(gs.timeSinceLastCharMs / gs.currentCharacterTimeMs) : (gs.pendingSegments.length > 0 ? 1:0) ;

    if (charsToShowThisFrame > 0 && gs.pendingSegments.length > 0) {
        // console.log(`[TEXTOUTPUT] Frame: deltaTime=${(deltaTime*1000).toFixed(1)}, accTime=${gs.timeSinceLastCharMs.toFixed(1)}, charTime=${gs.currentCharacterTimeMs.toFixed(1)}, charsThisFrame=${charsToShowThisFrame}`);
        let charsProcessedThisFrame = 0;
        while (charsProcessedThisFrame < charsToShowThisFrame && gs.pendingSegments.length > 0) {
            // Check again for display window expiry inside the loop for very long frames / many chars
            if (performance.now() > gs.displayWindowEndTime) {
                console.log("%c[TEXTOUTPUT] Display window expired DURING char processing loop.", 'color: red');
                gs.pendingSegments = [];
                gs.isAnimating = false;
                gsap.ticker.remove(typewriterUpdate);
                return;
            }

            const currentSegment = gs.pendingSegments[0];

            if (typeof currentSegment === 'string') {
                if (currentSegment.length > 0) {
                    const charToDisplay = currentSegment.charAt(0);
                    if (gs.currentTypingRow < characterRows && gs.currentTypingCol < charactersPerLine) {
                        updateCharacterCell(gs.currentTypingRow, gs.currentTypingCol, charToDisplay);
                        gs.currentTypingCol++;
                    }
                    // else: typing cursor is out of bounds, char is effectively skipped for display on grid

                    const remainingSegment = currentSegment.substring(1);
                    if (remainingSegment.length === 0) gs.pendingSegments.shift();
                    else gs.pendingSegments[0] = remainingSegment;
                    
                    if (gs.currentTypingCol >= charactersPerLine) { // Auto-wrap
                        gs.currentTypingCol = 0;
                        gs.currentTypingRow++;
                        // Scroll if auto-wrap moves past last row
                        if (gs.currentTypingRow >= characterRows) {
                            for (let r = 0; r < characterRows - 1; r++) {
                                for (let c = 0; c < charactersPerLine; c++) {
                                    // Shift text content up
                                    const charMeshBelow = characterPlaceholders[r+1][c];
                                    const charMeshCurrent = characterPlaceholders[r][c];
                                    const materialCurrent = characterMaterials[r][c];
                                    const materialBelow = characterMaterials[r+1][c];

                                    if (charMeshCurrent && charMeshBelow && materialCurrent && materialBelow) {
                                        if (materialBelow.visible && charMeshBelow.geometry && charMeshBelow.geometry !== (THREE.BufferGeometry.prototype)) {
                                            // If the cell below had visible text, copy its geometry
                                            if (charMeshCurrent.geometry && charMeshCurrent.geometry !== (THREE.BufferGeometry.prototype)) {
                                                charMeshCurrent.geometry.dispose();
                                            }
                                            charMeshCurrent.geometry = charMeshBelow.geometry.clone(); // Clone geometry
                                            materialCurrent.visible = true;
                                        } else {
                                            // If cell below was empty/invisible, make current cell empty/invisible
                                            if (charMeshCurrent.geometry && charMeshCurrent.geometry !== (THREE.BufferGeometry.prototype)) {
                                                charMeshCurrent.geometry.dispose();
                                                charMeshCurrent.geometry = new THREE.BufferGeometry();
                                            }
                                            materialCurrent.visible = false;
                                        }
                                    }
                                }
                            }
                            for (let c = 0; c < charactersPerLine; c++) {
                                // Clear the last line
                                updateCharacterCell(characterRows - 1, c, null);
                            }
                            gs.currentTypingRow = characterRows - 1;
                        }
                    }
                } else { // Empty string segment
                    gs.pendingSegments.shift();
                    continue; // Don't count this as a processed char for time consumption (or do?)
                               // For now, let it pass, an empty string segment takes no time essentially.
                }
            } else if (currentSegment.type === 'newline') {
                gs.currentTypingCol = 0;
                gs.currentTypingRow++;
                gs.pendingSegments.shift();

                if (gs.currentTypingRow >= characterRows) { // Scroll if newline moves past last row
                     for (let r = 0; r < characterRows - 1; r++) {
                        for (let c = 0; c < charactersPerLine; c++) {
                           // Shift text content up (similar to auto-wrap scroll)
                            const charMeshBelow = characterPlaceholders[r+1][c];
                            const charMeshCurrent = characterPlaceholders[r][c];
                            const materialCurrent = characterMaterials[r][c];
                            const materialBelow = characterMaterials[r+1][c];

                            if (charMeshCurrent && charMeshBelow && materialCurrent && materialBelow) {
                                if (materialBelow.visible && charMeshBelow.geometry && charMeshBelow.geometry !== (THREE.BufferGeometry.prototype)) {
                                    if (charMeshCurrent.geometry && charMeshCurrent.geometry !== (THREE.BufferGeometry.prototype)) {
                                        charMeshCurrent.geometry.dispose();
                                    }
                                    charMeshCurrent.geometry = charMeshBelow.geometry.clone();
                                    materialCurrent.visible = true;
                                } else {
                                    if (charMeshCurrent.geometry && charMeshCurrent.geometry !== (THREE.BufferGeometry.prototype)) {
                                        charMeshCurrent.geometry.dispose();
                                        charMeshCurrent.geometry = new THREE.BufferGeometry();
                                    }
                                    materialCurrent.visible = false;
                                }
                            }
                        }
                    }
                    for (let c = 0; c < charactersPerLine; c++) {
                        // Clear the last line
                        updateCharacterCell(characterRows - 1, c, null);
                    }
                    gs.currentTypingRow = characterRows - 1;
                }
            }
            charsProcessedThisFrame++;
        } // End while loop for charsToShowThisFrame
        
        // Deduct the time for the characters actually processed in this frame
        // More accurate: gs.timeSinceLastCharMs -= charsProcessedThisFrame * gs.currentCharacterTimeMs;
        // Simpler with Math.floor and then modulo for remainder:
        if(gs.currentCharacterTimeMs > 0) { // ensure not dividing by zero
            gs.timeSinceLastCharMs = gs.timeSinceLastCharMs % gs.currentCharacterTimeMs;
        }

    } // End if charsToShowThisFrame > 0

    if (gs.pendingSegments.length === 0 && gs.isAnimating) {
        // console.log("%c[TEXTOUTPUT] Animation ticker removed (queue empty, final check).", 'color: orange'); // Keep for debug
        gs.isAnimating = false;
        gsap.ticker.remove(typewriterUpdate);
    }
}

export { WidgetState }; // LineState might be removed or changed