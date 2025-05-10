// More complex water ripples using multiple sine waves and noise
precision mediump float;
varying vec2 vUv;
uniform float time;
// uniform sampler2D baseTexture; // Optional base texture
// uniform samplerCube skybox; // Optional reflection map

// Pseudo-random noise
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}
float noise(vec2 co) {
    vec2 i = floor(co); vec2 f = fract(co);
    float a = rand(i); float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0)); float d = rand(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Function to create moving waves
float wave(vec2 pos, float freq, float speed, float amplitude) {
    return sin(pos.x * freq + time * speed) * amplitude;
}

void main() {
    vec2 uv = vUv;
    float t = time;

    // Combine multiple waves moving in different directions
    float displacement = 0.0;
    displacement += wave(uv, 15.0, 1.0, 0.01);
    displacement += wave(uv.yx + vec2(0.3, 0.1), 20.0, 0.7, 0.012); // Rotate and offset
    displacement += wave(uv + vec2(0.1, 0.4), 12.0, 1.3, 0.008);

    // Add noise to break regularity
    displacement += (noise(uv * 10.0 + t * 0.2) - 0.5) * 0.01;

    vec2 distortedUv = uv + vec2(displacement);

    // Base water color
    vec3 waterColor = vec3(0.05, 0.3, 0.6);

    // Caustics-like effect (bright lines)
    float caustic = pow(abs(0.5 - fract(displacement * 10.0)), 20.0); // Sharpen the peaks/troughs
    caustic *= smoothstep(0.0, 0.01, abs(displacement)); // Only show near waves
    vec3 color = waterColor + vec3(0.8, 0.9, 1.0) * caustic * 0.8; // Add bright caustic color

    // --- Optional: Add simple reflection (fake Fresnel) ---
    // float fresnel = pow(1.0 - dot(vec3(0.0, 0.0, 1.0), normalize(vec3(displacement * 5.0, displacement * 5.0, 1.0))), 3.0);
    // color = mix(color, vec3(0.8, 0.9, 1.0), fresnel * 0.5); // Mix with sky color

    // --- Optional: Use distorted UVs for texture lookup ---
    // color = texture2D(baseTexture, distortedUv).rgb;
    // color += vec3(0.8, 0.9, 1.0) * caustic * 0.8; // Add caustics on top

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
} 