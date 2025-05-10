precision mediump float;
varying vec2 vUv;
uniform float time;

// Pseudo-random number generator
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Noise function for stars and gas clouds
float noise(vec2 p, float scale) {
    return rand(floor(p * scale)) * (1.0 / scale); // Simple value noise
}

// FBM for more complex structures (e.g., gas clouds)
float fbm(vec2 p, float scale, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = scale;
    for (int i = 0; i < octaves; i++) {
        value += noise(p, frequency) * amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Function to create stars
float stars(vec2 uv, float density, float brightness_variation) {
    float star_val = rand(floor(uv * density));
    if (star_val > 0.995) { // Adjust threshold for star density
        float star_brightness = rand(floor(uv * density) + vec2(1.0,1.0)); // Vary brightness
        return pow(star_brightness, brightness_variation) * smoothstep(0.995, 1.0, star_val);
    }
    return 0.0;
}

void main() {
    vec2 uv = vUv - 0.5; // Center coordinates
    float t = time * 0.05; // Slow time for cosmic evolution

    // Basic rotation for a swirling effect
    float angle = atan(uv.y, uv.x) + t * 0.5; // Angle for rotation
    float dist_from_center = length(uv);
    mat2 rotation_matrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 rotated_uv = uv * rotation_matrix; // Apply simple rotation
    
    rotated_uv += vec2(sin(t*0.2 + dist_from_center * 2.0) * 0.1, 
                       cos(t*0.3 + dist_from_center * 2.5) * 0.1); // Add some warping

    // --- Star Layers ---
    // Far, dense stars (small and faint)
    float s1 = stars(rotated_uv + vec2(23.4, 56.7) + t * 0.01, 150.0, 15.0);
    // Closer, sparser stars (brighter)
    float s2 = stars(rotated_uv + vec2(87.1, 12.3) - t * 0.02, 80.0, 10.0);
    // Very close, bright stars (blinking effect)
    float s3_density = 30.0;
    float s3_blink = sin(time * 2.0 + rand(floor(rotated_uv * s3_density)) * 6.28) * 0.5 + 0.5;
    float s3 = stars(rotated_uv + vec2(45.6, 98.0) + t * 0.005, s3_density, 5.0) * s3_blink;
    
    vec3 star_color = vec3(s1*0.6 + s2*0.8 + s3);
    star_color = pow(star_color, vec3(1.2)); // Boost brightness a bit

    // --- Gas Clouds / Nebulae ---
    // Use FBM for gas clouds, distorted by distance and time
    vec2 gas_uv1 = rotated_uv * (2.0 - dist_from_center * 0.8) + vec2(t * 0.1, -t*0.05);
    float gas1 = fbm(gas_uv1, 1.0, 5);
    gas1 = smoothstep(0.3, 0.7, gas1); // Make edges smoother

    vec2 gas_uv2 = rotated_uv * (1.5 + dist_from_center * 0.5) + vec2(-t * 0.07, t*0.12);
    float gas2 = fbm(gas_uv2, 1.5, 6);
    gas2 = smoothstep(0.4, 0.6, gas2);

    // Nebulae colors
    vec3 nebula_color1 = vec3(0.1, 0.2, 0.5); // Blueish nebula
    vec3 nebula_color2 = vec3(0.4, 0.1, 0.3); // Reddish/Purple nebula

    vec3 final_color = star_color;
    final_color = mix(final_color, nebula_color1, gas1 * 0.6); // Blend nebula 1
    final_color = mix(final_color, nebula_color2, gas2 * 0.5); // Blend nebula 2

    // Add a central glow / core
    float core_intensity = 1.0 - smoothstep(0.0, 0.15, dist_from_center);
    core_intensity *= core_intensity; // Sharpen the falloff
    vec3 core_color = vec3(0.9, 0.8, 0.6); // Bright yellowish core
    final_color += core_color * core_intensity * 0.5;

    // Vignette effect to darken edges
    float vignette = smoothstep(0.3, 0.7, dist_from_center);
    final_color *= (1.0 - vignette * 0.3);

    gl_FragColor = vec4(clamp(final_color, 0.0, 1.0), 1.0);
} 