precision mediump float;
varying vec2 vUv;
uniform float time;

// Noise function (Simplex noise is great, but GLSL ES 1.0 doesn't have it built-in)
// Using a simpler pseudo-random noise for this example.
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f); // Smoothstep
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractional Brownian Motion for nebulae/gas clouds
float fbm(vec2 st, int octaves, float persistence) {
    float total = 0.0;
    float frequency = 1.0;
    float amplitude = 1.0;
    float maxValue = 0.0;
    for(int i=0; i<octaves; i++) {
        total += noise(st * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2.0;
    }
    return total/maxValue;
}

// Function to create stars with varying brightness and a slight twinkle
vec3 createStars(vec2 uv, float density, float baseBrightness, float twinkleSpeed) {
    float starValue = random(floor(uv * density));
    if (starValue > 0.992) { // Threshold for star visibility
        float brightness = pow(random(floor(uv * density) + 0.123), 10.0) * baseBrightness;
        brightness *= (0.8 + 0.2 * sin(time * twinkleSpeed + uv.x * 10.0 + uv.y * 5.0)); // Twinkle effect
        return vec3(brightness);
    }
    return vec3(0.0);
}

// Domain warping function for more organic nebulae shapes
vec2 warp(vec2 uv, float warpAmount, float warpSpeed) {
    vec2 q = vec2( fbm( uv + vec2(0.0,0.0) + time*warpSpeed*0.1, 4, 0.6),
                   fbm( uv + vec2(5.2,1.3) + time*warpSpeed*0.12, 4, 0.6) );
    return uv + warpAmount * (q - 0.5);
}

void main() {
    vec2 R = vec2(1.0, 1.0); // Assuming a square aspect ratio for uv, adjust if not
    vec2 uv = (vUv - 0.5 * R) / R.y; // Centered and aspect corrected UVs
    float t = time * 0.02;

    // --- Background: Deep space color ---
    vec3 color = vec3(0.01, 0.01, 0.03); // Very dark blue/purple

    // --- Star layers for depth ---
    // Far stars (small, dense, faint, slow twinkle)
    color += createStars(uv * 1.2, 250.0, 0.3, 0.5);
    // Mid stars (medium, less dense, brighter, medium twinkle)
    color += createStars(uv, 150.0, 0.5, 1.0);
    // Near stars (large, sparse, brightest, fast twinkle)
    color += createStars(uv * 0.8, 80.0, 0.8, 2.0);

    // --- Nebulae / Gas Clouds ---
    // Layer 1 - Large, soft background nebula (e.g., hydrogen alpha reds)
    vec2 warped_uv1 = warp(uv * 0.8 + vec2(t*0.1, -t*0.05), 0.3, 0.1);
    float nebula1_density = fbm(warped_uv1, 5, 0.5);
    nebula1_density = smoothstep(0.4, 0.7, nebula1_density);
    vec3 nebula1_color = vec3(0.5, 0.1, 0.15) * nebula1_density;
    color += nebula1_color * 0.8; // Blend softly

    // Layer 2 - More defined, colorful nebula (e.g., blues and purples for oxygen/helium)
    vec2 warped_uv2 = warp(uv * 1.5 + vec2(-t*0.15, t*0.1) + vec2(2.0,3.0), 0.4, 0.15);
    float nebula2_density = fbm(warped_uv2, 6, 0.55);
    nebula2_density = pow(smoothstep(0.3, 0.6, nebula2_density), 1.5);
    vec3 nebula2_color_base = vec3(0.1, 0.2, 0.6);
    vec3 nebula2_highlight = vec3(0.4, 0.6, 1.0);
    vec3 nebula2_color = mix(nebula2_color_base, nebula2_highlight, smoothstep(0.6, 0.9, fbm(warped_uv2*0.5,3,0.5)));
    color += nebula2_color * nebula2_density * 0.7;

    // Layer 3 - Bright, wispy filaments or shockwaves
    vec2 warped_uv3 = warp(uv * 2.5 + vec2(t*0.25, t*0.2) + vec2(5.0,1.0), 0.2, 0.2);
    float filament_density = fbm(warped_uv3, 7, 0.4);
    filament_density = 1.0 - abs(filament_density - 0.5) * 2.0; // Make it thin lines
    filament_density = pow(smoothstep(0.7, 0.9, filament_density), 2.0);
    vec3 filament_color = vec3(0.9, 0.8, 0.5) * filament_density;
    color += filament_color * 0.5;

    // --- Galaxy Core / Central Brightness (optional, subtle) ---
    float dist_to_center = length(uv);
    float core_glow = pow(1.0 - smoothstep(0.0, 0.3, dist_to_center), 3.0);
    color += vec3(0.2, 0.15, 0.1) * core_glow;

    // --- Dust Lanes (dark nebulae) ---
    // Use a different noise instance for dust
    vec2 dust_uv = uv * 1.2 + vec2(10.0, -t*0.08);
    float dust_density = fbm(dust_uv, 5, 0.65);
    dust_density = smoothstep(0.5, 0.75, dust_density) * (0.5 + 0.5 * noise(dust_uv*0.3)); // Break it up
    color *= (1.0 - dust_density * 0.4); // Darken the color

    // Final color adjustments
    color = pow(color, vec3(0.9)); // Slight gamma correction
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
} 