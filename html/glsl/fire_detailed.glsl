// More detailed procedural fire with multiple noise layers
precision mediump float;
varying vec2 vUv;
uniform float time;

// 2D Random
float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth Interpolation
    vec2 u = f*f*(3.0-2.0*f);
    // u = smoothstep(0.,1.,f); // Alternative interpolation

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

// Fractional Brownian Motion
float fbm (vec2 st) {
    // Initial values
    float value = 0.0;
    float amplitude = .5;
    float frequency = 0.;
    // Loop of octaves
    for (int i = 0; i < 5; i++) { // 5 octaves
        value += amplitude * noise(st);
        st *= 2.;
        amplitude *= .5;
    }
    return value;
}

void main() {
    vec2 uv = vUv;
    float t = time * 0.8; // Slightly faster

    // Create upward motion by subtracting time from y-coordinate
    vec2 motion_uv = vec2(uv.x, uv.y + t);

    // Layered noise for detail
    float n1 = fbm(motion_uv * 3.0); // Base noise
    float n2 = fbm(motion_uv * 8.0 + n1 * 0.5); // Detail noise, perturbed by base

    float combined_noise = (n1 + n2 * 0.5) / 1.5; // Combine and normalize roughly

    // Flame shape (more intense at the bottom)
    float flame_intensity = pow(1.0 - vUv.y, 1.5); // Sharper falloff
    combined_noise *= flame_intensity;

    // Sharper color gradient
    vec3 color = vec3(0.0);
    color = mix(color, vec3(0.8, 0.0, 0.0), smoothstep(0.0, 0.25, combined_noise)); // Dark Red
    color = mix(color, vec3(1.0, 0.4, 0.0), smoothstep(0.25, 0.5, combined_noise)); // Orange
    color = mix(color, vec3(1.0, 0.9, 0.3), smoothstep(0.5, 0.75, combined_noise)); // Yellow
    color = mix(color, vec3(1.0, 1.0, 0.8), smoothstep(0.75, 0.9, combined_noise)); // Bright Yellow/White

    // Add some faint vertical flickering lines
    float flicker = pow(noise(vec2(uv.x * 10.0, t * 5.0)), 10.0);
    color += vec3(flicker * 0.2, flicker * 0.1, 0.0);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
} 