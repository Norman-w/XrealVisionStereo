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