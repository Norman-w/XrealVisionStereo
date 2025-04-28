// Simple sine wave ripples
precision mediump float;
varying vec2 vUv;
uniform float time;
// uniform sampler2D baseTexture; // Optional: uncomment if you want to distort a texture

void main() {
    vec2 uv = vUv;
    float t = time * 1.5;

    // Simple sine wave displacement
    float displacement = sin(uv.x * 20.0 + t) * 0.01 + cos(uv.y * 15.0 - t * 0.8) * 0.01;

    // Apply displacement to UVs
    vec2 distortedUv = uv + vec2(displacement);

    // --- Option 1: Solid Color Water ---
    vec3 waterColor = vec3(0.1, 0.4, 0.7);
    // Add a simple highlight based on the displacement (fake lighting)
    float highlight = smoothstep(-0.015, 0.015, displacement); // Brighter on wave crests
    vec3 color = mix(waterColor * 0.8, vec3(1.0), highlight * 0.5); // Mix with white highlight

    // --- Option 2: Distort a Texture (Uncomment uniform above) ---
    // vec3 color = texture2D(baseTexture, distortedUv).rgb;

    gl_FragColor = vec4(color, 1.0);
} 