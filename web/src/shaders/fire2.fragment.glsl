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