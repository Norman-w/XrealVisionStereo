// shaders.js - 包含所有着色器代码
// 由于本文件是新创建的，不需要使用 "// ... existing code ..." 格式

// 基础顶点着色器
const vertexShaderSource = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// 火焰着色器1 - 加强火焰效果
const fireShader1 = `
    precision mediump float;
    varying vec2 vUv;
    uniform float time;

    float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }
    float noise(vec2 co) {
        vec2 i = floor(co); vec2 f = fract(co);
        float a = rand(i); float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0)); float d = rand(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    void main() {
        vec2 uv = vUv; 
        float t = time * 0.7; // 加快速度
        
        // 添加扭曲效果
        float distortion = noise(uv * 3.0 + vec2(0.0, -t * 1.2)) * 0.1;
        uv.x += distortion * 0.3;
        uv.y += t;
        
        // 更复杂的噪声
        float n = noise(uv * 4.0);
        n += noise(uv * 8.0) * 0.5;
        
        // 优化火焰形状
        float flameShape = smoothstep(0.1, 0.9, 1.0 - vUv.y);
        flameShape *= 1.0 + 0.2 * sin(uv.x * 20.0 + time);
        n *= flameShape;
        
        // 更丰富的颜色渐变
        vec3 black = vec3(0.0);
        vec3 red = vec3(1.0, 0.1, 0.0);
        vec3 orange = vec3(1.0, 0.5, 0.0);
        vec3 yellow = vec3(1.0, 1.0, 0.2);
        
        vec3 color = black;
        color = mix(color, red, smoothstep(0.0, 0.3, n));
        color = mix(color, orange, smoothstep(0.3, 0.6, n));
        color = mix(color, yellow, smoothstep(0.6, 0.8, n));
        
        // 添加闪烁效果
        float flicker = noise(vec2(uv.x * 5.0, time * 10.0));
        color *= 0.8 + 0.4 * flicker;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// 火焰着色器2
const fireShader2 = `
    precision mediump float;
    varying vec2 vUv;
    uniform float time;

    float random (vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123); }
    float noise (vec2 st) {
        vec2 i = floor(st); vec2 f = fract(st);
        float a = random(i); float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    float fbm (vec2 st) {
        float value = 0.0; float amplitude = .5;
        for (int i = 0; i < 5; i++) {
            value += amplitude * noise(st); st *= 2.; amplitude *= .5;
        } return value;
    }
    void main() {
        vec2 uv = vUv; float t = time * 0.8;
        vec2 motion_uv = vec2(uv.x, uv.y + t);
        float n1 = fbm(motion_uv * 3.0); float n2 = fbm(motion_uv * 8.0 + n1 * 0.5);
        float combined_noise = (n1 + n2 * 0.5) / 1.5;
        float flame_intensity = pow(1.0 - vUv.y, 1.5); combined_noise *= flame_intensity;
        vec3 color = vec3(0.0);
        color = mix(color, vec3(0.8, 0.0, 0.0), smoothstep(0.0, 0.25, combined_noise));
        color = mix(color, vec3(1.0, 0.4, 0.0), smoothstep(0.25, 0.5, combined_noise));
        color = mix(color, vec3(1.0, 0.9, 0.3), smoothstep(0.5, 0.75, combined_noise));
        color = mix(color, vec3(1.0, 1.0, 0.8), smoothstep(0.75, 0.9, combined_noise));
        float flicker = pow(noise(vec2(uv.x * 10.0, t * 5.0)), 10.0);
        color += vec3(flicker * 0.2, flicker * 0.1, 0.0);
        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
`;

// 火焰着色器3（顶部，红色箭头指向）- 完全重写使其更像真实的火焰
const fireShader3 = `
    precision mediump float;
    varying vec2 vUv;
    uniform float time;

    // 更好的噪声函数
    float rand(vec2 co) { 
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float noise(vec2 co) {
        vec2 i = floor(co); vec2 f = fract(co);
        float a = rand(i); float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0)); float d = rand(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    // FBM分形布朗运动 - 创建更自然的火焰纹理
    float fbm(vec2 p) {
        float sum = 0.0;
        float amp = 1.0;
        float freq = 1.0;
        // 多个八度的噪声叠加
        for(int i = 0; i < 6; i++) {
            sum += amp * noise(p * freq);
            amp *= 0.5;
            freq *= 2.0;
            p += vec2(1.0, 3.0); // 旋转避免线性条纹
        }
        return sum;
    }
    
    void main() {
        vec2 uv = vUv;
        float t = time * 0.8;
        
        // 火焰运动 - 自下而上的流动
        vec2 flameUV = vec2(uv.x, uv.y * 1.5 + t);
        
        // 使用FBM创建火焰纹理
        float noise1 = fbm(flameUV * 3.0);
        float noise2 = fbm(flameUV * 6.0 + vec2(noise1 * 0.5, t * 0.2));
        
        // 创建火焰形状 - 底部宽顶部窄
        float flameShape = pow(1.0 - uv.y, 1.3);
        
        // 添加边缘扰动
        flameShape += 0.1 * sin(uv.x * 40.0 + time * 4.0) * pow(uv.y, 2.0);
        
        // 混合噪声和形状
        float finalNoise = noise1 * noise2 * flameShape;
        
        // 火焰渐变色 - 从内到外
        vec3 innerColor = vec3(1.0, 0.9, 0.5);  // 亮黄色中心
        vec3 midColor = vec3(1.0, 0.5, 0.0);    // 橙色过渡
        vec3 outerColor = vec3(0.9, 0.2, 0.0);  // 红色边缘
        vec3 baseColor = vec3(0.1, 0.0, 0.0);   // 深红色/黑色基础
        
        // 使用更复杂的颜色混合
        vec3 color = baseColor;
        color = mix(color, outerColor, smoothstep(0.0, 0.3, finalNoise));
        color = mix(color, midColor, smoothstep(0.3, 0.6, finalNoise));
        color = mix(color, innerColor, smoothstep(0.6, 0.9, finalNoise));
        
        // 增加亮度变化
        float brightness = 0.8 + 0.3 * sin(time * 4.0 + uv.y * 10.0);
        color *= brightness;
        
        // 添加火花效果
        float sparkThreshold = 0.98 - 0.05 * (1.0 - uv.y);
        float sparkNoise = noise(uv * 60.0 + vec2(0.0, -t * 8.0));
        if (sparkNoise > sparkThreshold && finalNoise > 0.4) {
            color = vec3(1.0, 0.9, 0.5);
        }
        
        // 使用更好的透明度渐变
        float alpha = smoothstep(0.01, 0.1, finalNoise);
        
        gl_FragColor = vec4(color, alpha);
    }
`;

// 水着色器1 - 改进水波纹效果
const waterShader1 = `
    precision mediump float;
    varying vec2 vUv;
    uniform float time;
    
    // 添加简单的噪声函数
    float rand(vec2 co) { 
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float noise(vec2 co) {
        vec2 i = floor(co); vec2 f = fract(co);
        float a = rand(i); float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0)); float d = rand(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    void main() {
        vec2 uv = vUv; 
        float t = time * 1.5;
        
        // 创建多层波浪
        float displacement = 0.0;
        
        // 水平波纹
        displacement += sin(uv.x * 20.0 + t) * 0.01;
        displacement += sin(uv.x * 30.0 + t * 0.8) * 0.007;
        
        // 垂直波纹
        displacement += cos(uv.y * 15.0 - t * 0.8) * 0.01;
        displacement += cos(uv.y * 25.0 - t * 1.2) * 0.005;
        
        // 对角线波纹
        displacement += sin((uv.x + uv.y) * 10.0 + t * 0.7) * 0.008;
        
        // 添加细节噪声
        displacement += (noise(uv * 20.0 + t * 0.1) - 0.5) * 0.005;
        
        // 计算法线扰动
        vec2 distortedUv = uv + vec2(displacement);
        
        // 深浅颜色混合
        vec3 deepWater = vec3(0.0, 0.2, 0.5);
        vec3 shallowWater = vec3(0.1, 0.4, 0.7);
        vec3 foam = vec3(0.8, 0.9, 1.0);
        
        // 使用更丰富的高光计算
        float highlight = smoothstep(-0.01, 0.01, displacement);
        
        // 混合水颜色
        vec3 waterColor = mix(deepWater, shallowWater, sin(uv.y * 5.0 + time * 0.5) * 0.5 + 0.5);
        vec3 color = mix(waterColor, foam, highlight * 0.7);
        
        // 添加闪光
        float sparkle = pow(noise(uv * 40.0 + t * 0.2), 20.0) * 0.3;
        color += sparkle * foam;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// 水着色器2（前面，蓝色箭头指向）- 加强水波动效果
const waterShader2 = `
    precision mediump float;
    varying vec2 vUv;
    uniform float time;
    
    // 噪声函数
    float rand(vec2 co) { 
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    float noise(vec2 co) {
        vec2 i = floor(co); vec2 f = fract(co);
        float a = rand(i); float b = rand(i + vec2(1.0, 0.0));
        float c = rand(i + vec2(0.0, 1.0)); float d = rand(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    // 更高级的波浪函数
    float wave(vec2 pos, float freq, float speed, float amp, float time) {
        float phase = time * speed;
        float val = sin(pos.x * freq + phase) * cos(pos.y * freq * 0.8 + phase * 1.1) * amp;
        return val;
    }
    
    void main() {
        vec2 uv = vUv;
        float t = time * 0.8;
        
        // 创建多层交叉波浪
        float displacement = 0.0;
        
        // 主要波浪
        displacement += wave(uv, 12.0, 1.0, 0.02, t);
        displacement += wave(uv * 1.2 + vec2(0.5, 0.3), 18.0, 1.3, 0.015, t);
        
        // 次要波浪
        displacement += wave(uv * 0.8 - vec2(0.2, 0.5), 20.0, 0.7, 0.01, t);
        displacement += wave(uv * 1.5 + vec2(0.1, 0.7), 15.0, 1.1, 0.008, t);
        
        // 交叉波浪(对角线方向)
        displacement += wave(vec2(uv.y, uv.x) * 1.1, 14.0, 0.9, 0.012, t);
        
        // 随机扰动
        displacement += (noise(uv * 8.0 + t * 0.4) - 0.5) * 0.02;
        
        // 计算法线扰动（为了模拟光照）
        vec2 dx = vec2(0.01, 0.0);
        vec2 dy = vec2(0.0, 0.01);
        float dhx = wave(uv + dx, 12.0, 1.0, 0.02, t) - wave(uv - dx, 12.0, 1.0, 0.02, t);
        float dhy = wave(uv + dy, 12.0, 1.0, 0.02, t) - wave(uv - dy, 12.0, 1.0, 0.02, t);
        
        // 创建法线向量
        vec3 normal = normalize(vec3(dhx, dhy, 1.0));
        
        // 光照方向
        vec3 lightDir = normalize(vec3(0.2, 0.3, 1.0));
        float diffuse = max(dot(normal, lightDir), 0.0);
        
        // 波浪方向扰动UV
        vec2 distortedUv = uv + vec2(displacement * 0.3, displacement * 0.4);
        
        // 深度变化 - 使用噪声创建不同深度的水区域
        float depth = noise(uv * 3.0 + t * 0.1);
        depth = smoothstep(0.4, 0.6, depth);
        
        // 水颜色 - 从深到浅
        vec3 deepColor = vec3(0.0, 0.1, 0.2);
        vec3 mediumColor = vec3(0.0, 0.2, 0.4);
        vec3 shallowColor = vec3(0.1, 0.3, 0.7);
        vec3 surfaceColor = vec3(0.3, 0.6, 0.9);
        
        // 混合水颜色
        vec3 waterColor = mix(deepColor, mediumColor, depth);
        waterColor = mix(waterColor, shallowColor, depth * depth);
        
        // 添加高光和反射
        float fresnel = 0.02 + 0.98 * pow(1.0 - dot(normal, vec3(0.0, 0.0, 1.0)), 5.0);
        vec3 reflection = vec3(0.8, 0.9, 1.0);
        
        // 最终颜色
        vec3 color = mix(waterColor, surfaceColor, diffuse * 0.5);
        color = mix(color, reflection, fresnel * 0.6);
        
        // 添加波峰亮光
        float caustic = pow(displacement * 10.0, 2.0);
        caustic = smoothstep(0.1, 0.3, caustic);
        color += caustic * vec3(0.3, 0.5, 0.6);
        
        // 加入随机闪光点 - 模拟水面反光
        float sparkle = pow(noise(distortedUv * 40.0 + t * 0.5), 25.0) * 0.5;
        color += sparkle * reflection;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// 水着色器3（后面，蓝色箭头指向）- 完全重写以增强水波效果
const waterShader3 = `
    precision mediump float;
    varying vec2 vUv;
    uniform float time;
    
    // 更高效的哈希函数 - 提供更好的随机性
    float hash(vec2 p) {
        p = fract(p * vec2(443.8975, 397.2973));
        p += dot(p, p + 19.19);
        return fract(p.x * p.y * 41.5453);
    }
    
    // 高质量噪声函数
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        
        // 四角插值
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        // 平滑插值
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    
    // 分形布朗运动 - 创造更自然的水面纹理
    float fbm(vec2 p, int octaves) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < 8; i++) {
            if (i >= octaves) break;
            
            value += amplitude * noise(p * frequency);
            frequency *= 2.17;
            amplitude *= 0.45;
        }
        
        return value;
    }
    
    // 复杂波浪函数 - 创造多层次水波
    float waves(vec2 pos, float time) {
        vec2 p = pos;
        
        // 增强大型波浪 - 波幅和频率都提高
        float wave1 = sin(p.x * 3.0 + time * 1.2) * 0.25 + 
                     cos(p.y * 3.5 + time * 0.8) * 0.25;
        
        // 中型波浪 - 更明显的交叉模式
        float wave2 = sin(p.x * 7.0 - time * 1.5) * 0.12 + 
                     cos(p.y * 8.0 - time * 1.2) * 0.14;
        
        // 小型波浪 - 增加细节
        float wave3 = sin(p.x * 15.0 + time * 3.0) * 0.04 + 
                     cos(p.y * 17.0 + time * 2.2) * 0.04;
                     
        // 对角线波浪 - 添加更多变化
        float wave4 = sin((p.x + p.y) * 5.0 + time * 1.3) * 0.08 +
                     cos((p.x - p.y) * 6.0 - time * 0.9) * 0.08;
        
        // 组合波浪 - 添加非线性混合以创造更自然的形态
        return wave1 + wave2 + wave3 + wave4;
    }
    
    // 添加更明显的涟漪效果
    float ripples(vec2 uv, float time) {
        float ripple = 0.0;
        
        // 第一组涟漪 - 增加强度和清晰度
        vec2 p1 = fract(uv * 3.5 - vec2(time * 0.2, time * 0.1));
        float d1 = length(p1 - 0.5);
        ripple += smoothstep(0.3, 0.1, d1) * smoothstep(0.0, 0.1, d1) * 0.8;
        
        // 第二组涟漪
        vec2 p2 = fract(uv * 2.7 - vec2(time * 0.15, -time * 0.12));
        float d2 = length(p2 - 0.5);
        ripple += smoothstep(0.25, 0.1, d2) * smoothstep(0.0, 0.1, d2) * 0.6;
        
        // 第三组涟漪
        vec2 p3 = fract(uv * 4.1 - vec2(-time * 0.1, time * 0.25));
        float d3 = length(p3 - 0.5);
        ripple += smoothstep(0.25, 0.1, d3) * smoothstep(0.0, 0.1, d3) * 0.5;
        
        // 第四组随机涟漪 - 模拟水滴落入
        vec2 p4 = fract(uv * 5.2 - vec2(sin(time * 0.3) * 0.5, cos(time * 0.4) * 0.5));
        float d4 = length(p4 - 0.5);
        ripple += smoothstep(0.2, 0.05, d4) * smoothstep(0.0, 0.05, d4) * 1.0;
        
        return ripple;
    }
    
    void main() {
        // 获取坐标和时间
        vec2 uv = vUv;
        float t = time * 0.5; // 调整时间流速，保持平衡的动态效果
        
        // 创建叠加的波浪效果
        float height = waves(uv, t);
        
        // 添加噪声扰动 - 增加随机性和自然感
        height += fbm(uv * 6.0 + t * 0.4, 5) * 0.08;
        
        // 添加涟漪 - 更明显的涟漪效果
        height += ripples(uv, t) * 0.08;
        
        // 根据高度扭曲UV - 增强折射效果
        vec2 distortedUV = uv + vec2(sin(height * 25.0) * 0.02, cos(height * 25.0) * 0.02);
        
        // 计算法线 - 增强梯度以获得更明显的立体感
        vec2 eps = vec2(0.01, 0.0);
        float heightX1 = waves(uv + eps, t) + fbm((uv + eps) * 6.0 + t * 0.4, 5) * 0.08;
        float heightX2 = waves(uv - eps, t) + fbm((uv - eps) * 6.0 + t * 0.4, 5) * 0.08;
        
        eps = vec2(0.0, 0.01);
        float heightY1 = waves(uv + eps, t) + fbm((uv + eps) * 6.0 + t * 0.4, 5) * 0.08;
        float heightY2 = waves(uv - eps, t) + fbm((uv - eps) * 6.0 + t * 0.4, 5) * 0.08;
        
        vec3 normal = normalize(vec3(
            (heightX1 - heightX2) * 30.0, // 增强法线强度
            (heightY1 - heightY2) * 30.0,
            0.8 // 降低Z分量以获得更明显的法线变化
        ));
        
        // 光照方向 - 更低的角度产生更戏剧性的光影
        vec3 lightDir = normalize(vec3(0.6, 0.7, 0.5));
        
        // 漫反射 - 增强对比度
        float diffuse = max(0.0, dot(normal, lightDir)) * 0.8 + 0.2;
        
        // 镜面反射 - 更锐利、更强烈
        vec3 reflectDir = reflect(-lightDir, normal);
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        float specular = pow(max(0.0, dot(reflectDir, viewDir)), 128.0) * 0.8;
        
        // 菲涅尔效应 - 更强的边缘反射
        float fresnel = 0.05 + 0.95 * pow(1.0 - max(0.0, dot(normal, viewDir)), 5.0);
        
        // 创造多层次水色 - 更鲜艳、更对比的颜色
        vec3 deepColor = vec3(0.0, 0.05, 0.2); // 更深的蓝色
        vec3 midColor = vec3(0.0, 0.25, 0.5);  // 中蓝色
        vec3 shallowColor = vec3(0.1, 0.5, 0.8); // 明亮的蓝色
        vec3 foamColor = vec3(0.9, 0.95, 1.0);   // 泡沫色
        
        // 基于高度混合不同的水深颜色 - 使用非线性映射创造更强的对比
        float depth = height * 0.5 + 0.5;
        depth = pow(depth, 2.5); // 增强对比度
        
        vec3 waterColor = mix(deepColor, midColor, depth);
        waterColor = mix(waterColor, shallowColor, depth * depth);
        
        // 在波峰添加泡沫 - 更明显的泡沫效果
        float foam = smoothstep(0.35, 0.7, height);
        waterColor = mix(waterColor, foamColor, foam * 0.4);
        
        // 在波谷添加深色 - 创造更自然的深度感
        float trough = smoothstep(-0.7, -0.35, height);
        waterColor = mix(waterColor, deepColor * 0.7, trough * 0.5);
        
        // 应用漫反射
        waterColor *= diffuse;
        
        // 添加高光 - 更明亮、颜色偏蓝的高光
        waterColor += specular * vec3(0.8, 0.9, 1.0);
        
        // 添加环境光反射 - 模拟天空反射，增加饱和度
        vec3 skyColor = vec3(0.4, 0.65, 1.0);
        waterColor = mix(waterColor, skyColor, fresnel * 0.7);
        
        // 随机水面闪光 - 更多、更强的闪光点，模拟阳光散射
        float sparkle = pow(noise(distortedUV * 50.0 + t * 3.0), 15.0) * fresnel * 1.5;
        waterColor += sparkle * vec3(1.0, 1.0, 0.9) * 0.5;
        
        // 添加边缘泛光 - 模拟光线透过水面边缘时的散射效果
        float edgeGlow = pow(1.0 - abs(uv.x - 0.5) * 2.0, 5.0) * pow(1.0 - abs(uv.y - 0.5) * 2.0, 5.0);
        waterColor += edgeGlow * vec3(0.2, 0.4, 0.8) * 0.2;
        
        // 增加整体饱和度和对比度
        waterColor = pow(waterColor, vec3(0.95)); // 轻微增加对比度
        
        // 输出最终颜色
        gl_FragColor = vec4(waterColor, 1.0);
    }
`;

// 导出着色器数组，以便在主脚本中使用
function getShaders() {
    return [
        fireShader1,     // Right (+X)
        fireShader2,     // Left (-X)
        fireShader3,     // Top (+Y)
        waterShader1,    // Bottom (-Y)
        waterShader2,    // Front (+Z)
        waterShader3     // Back (-Z)
    ];
} 