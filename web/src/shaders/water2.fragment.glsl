precision mediump float;
varying vec2 vUv;
uniform float time;

// Simple pseudo-random number generator
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// 2D Noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep
    float a = rand(i + vec2(0.0, 0.0));
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian Motion (FBM)
float fbm(vec2 p, int octaves, float persistence) {
    float total = 0.0;
    float frequency = 1.0;
    float amplitude = 1.0;
    float maxValue = 0.0; // Used for normalizing result to 0.0 - 1.0
    for(int i = 0; i < octaves; i++) {
        total += noise(p * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2.0;
    }
    return total / maxValue;
}

void main() {
    vec2 uv = vUv;
    float t = time * 0.15; // Slower time for more gentle waves

    // Parameters for FBM
    int octaves = 5;
    float persistence = 0.6;

    // Create wave patterns using FBM
    // Layer 1: Broad waves
    float wave_pattern1 = fbm(uv * 3.0 + vec2(t * 0.5, -t * 0.3), octaves, persistence);
    // Layer 2: Smaller ripples
    float wave_pattern2 = fbm(uv * 7.0 + vec2(-t * 0.8, t * 0.6) + wave_pattern1 * 0.5, octaves, persistence);

    // Combine wave patterns
    float combined_waves = (wave_pattern1 * 0.7 + wave_pattern2 * 0.3);

    // Simulate water depth and color based on waves
    vec3 deep_color = vec3(0.05, 0.15, 0.4); // Darker blue for deeper parts
    vec3 shallow_color = vec3(0.2, 0.5, 0.8); // Lighter blue for wave crests
    vec3 water_color = mix(deep_color, shallow_color, combined_waves);

    // Simulate foam on wave crests
    float foam_threshold = 0.65;
    float foam_smoothness = 0.05;
    float foam_factor = smoothstep(foam_threshold - foam_smoothness, foam_threshold + foam_smoothness, combined_waves);
    vec3 foam_color = vec3(0.9, 0.9, 0.95); // Off-white foam
    water_color = mix(water_color, foam_color, foam_factor * 0.8); // Blend foam

    // Add subtle caustics effect (simplified)
    float caustics_pattern = fbm(uv * 10.0 + vec2(t * 0.2, t * 0.25) + combined_waves * 0.3, 3, 0.4);
    float caustics_intensity = smoothstep(0.5, 0.7, caustics_pattern) * 0.15;
    water_color += caustics_intensity;

    // Add specular highlights
    vec2 d = vec2(0.01, 0.0);
    float n_x = fbm( (uv + d.xy) * 4.0 + vec2(t, t*0.5), octaves, persistence) - fbm( (uv - d.xy) * 4.0 + vec2(t, t*0.5), octaves, persistence);
    float n_y = fbm( (uv + d.yx) * 4.0 + vec2(t, t*0.5), octaves, persistence) - fbm( (uv - d.yx) * 4.0 + vec2(t, t*0.5), octaves, persistence);
    vec3 normal_approx = normalize(vec3(n_x * 2.0, n_y * 2.0, 1.0)); // Amplify normal distortion for stronger highlights
    
    vec3 light_dir = normalize(vec3(0.8, 0.8, 0.3)); // Higher light source
    float specular_strength = pow(max(0.0, dot(reflect(-light_dir, normal_approx), vec3(0,0,1))), 40.0);
    water_color += vec3(1.0) * specular_strength * 0.7;

    gl_FragColor = vec4(clamp(water_color, 0.0, 1.0), 1.0);
} 