// Simple procedural fire effect
precision mediump float; // Necessary for GLSL ES
varying vec2 vUv;       // Texture coordinates from vertex shader
uniform float time;     // Time uniform for animation

// Basic pseudo-random noise function
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

// Basic noise function (can be replaced with simplex/perlin)
float noise(vec2 co) {
    vec2 i = floor(co);
    vec2 f = fract(co);
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = vUv;
    float t = time * 0.5; // Control speed

    // Add upward movement
    uv.y += t;

    // Generate noise pattern
    float n = noise(uv * 4.0); // Control scale

    // Create flame shape (more intense at bottom, fades up)
    float flameShape = smoothstep(0.1, 0.8, 1.0 - vUv.y); // Inverted vUv.y for bottom-up effect
    n *= flameShape;

    // Color gradient: black -> red -> orange -> yellow
    vec3 black = vec3(0.0, 0.0, 0.0);
    vec3 red = vec3(1.0, 0.1, 0.0);
    vec3 orange = vec3(1.0, 0.5, 0.0);
    vec3 yellow = vec3(1.0, 1.0, 0.2);

    vec3 color = black;
    color = mix(color, red, smoothstep(0.0, 0.3, n));
    color = mix(color, orange, smoothstep(0.3, 0.6, n));
    color = mix(color, yellow, smoothstep(0.6, 0.8, n));

    // Ensure full alpha
    gl_FragColor = vec4(color, 1.0);
} 