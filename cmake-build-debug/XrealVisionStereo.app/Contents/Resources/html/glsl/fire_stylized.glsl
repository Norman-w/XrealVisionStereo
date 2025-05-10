// Stylized fire with UV distortion
precision mediump float;
varying vec2 vUv;
uniform float time;

// Simple noise function
float noise(vec2 p) {
    return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = vUv;
    float t = time * 0.6;

    // Create upward movement and distortion
    float distortion = noise(uv * 5.0 + vec2(0.0, -t * 1.5)) * 0.1;
    uv.x += (distortion - 0.05) * pow(1.0 - uv.y, 2.0); // More distortion near bottom
    uv.y += t * 0.5 + distortion * 0.1; // Add distortion to upward movement

    // Noise value based on distorted UVs
    float n = noise(uv * vec2(3.0, 6.0)); // Stretch vertically

    // Flame shape and intensity
    float intensity = pow(smoothstep(0.0, 0.9, 1.0 - vUv.y), 1.2);
    n *= intensity;

    // Simple color ramp
    vec3 fireColor = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.8, 0.0), smoothstep(0.3, 0.7, n));
    vec3 finalColor = mix(vec3(0.1, 0.0, 0.0), fireColor, smoothstep(0.0, 0.3, n));

    // Add some sparks (optional)
    float sparkNoise = noise(vUv * 40.0 + vec2(0.0, -t * 4.0));
    if (sparkNoise > 0.98 && intensity > 0.1) {
         finalColor = vec3(1.0, 1.0, 0.5);
    }

    gl_FragColor = vec4(finalColor, smoothstep(0.01, 0.2, n)); // Use noise for alpha fade
} 