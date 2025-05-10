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

// FBM函数 - 产生分形噪声
float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 5; i++) { // 迭代次数可以调整波纹复杂度
        sum += amp * noise(p);
        p *= 2.0; // 每次迭代频率加倍
        amp *= 0.5; // 每次迭代振幅减半
    }
    return sum;
}

void main() {
    vec2 uv = vUv;
    float t = time * 0.2; // 减慢水波速度

    // 产生两层波纹，方向不同，速度不同
    float wave1 = fbm(uv * 5.0 + vec2(t, t * 0.5)); 
    float wave2 = fbm(uv * 6.0 + vec2(-t * 0.4, t));

    // 混合波纹，并用sin函数产生更平滑的周期性起伏
    float mixed_waves = sin( (wave1 + wave2) * 5.0 + t * 2.0 ); // 调整乘数和时间因子改变波纹外观

    // 模拟水的颜色，可以根据mixed_waves的值来调整颜色深浅
    vec3 waterColor = vec3(0.1, 0.3, 0.7); // 基础水蓝色
    waterColor += mixed_waves * 0.2; // 波峰亮一点，波谷暗一点

    // 增加高光效果 - 基于波纹的法线近似值（简化版）
    vec2 d = vec2(0.01, 0.0); // 微小位移用于计算梯度
    float n_x = fbm( (uv + d.xy) * 5.0 + vec2(t, t*0.5)) - fbm( (uv - d.xy) * 5.0 + vec2(t, t*0.5));
    float n_y = fbm( (uv + d.yx) * 5.0 + vec2(t, t*0.5)) - fbm( (uv - d.yx) * 5.0 + vec2(t, t*0.5));
    vec3 normal_approx = normalize(vec3(n_x, n_y, 1.0)); // 简化的法线
    
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5)); // 光源方向
    float specular = pow(max(0.0, dot(reflect(-lightDir, normal_approx), vec3(0,0,1))), 32.0); // 简化观察方向为(0,0,1)
    
    waterColor += vec3(1.0) * specular * 0.8; // 添加高光

    gl_FragColor = vec4(clamp(waterColor, 0.0, 1.0), 1.0);
} 