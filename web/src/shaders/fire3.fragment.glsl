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