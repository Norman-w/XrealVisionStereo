precision mediump float;
varying vec2 vUv;
uniform float time;

// Hash functions by Dave Hoskins (https://www.shadertoy.com/view/4djSRW)
vec2 hash22(vec2 p) {
    p = fract(p * vec2(5.3983, 5.4427));
    p += dot(p.yx, p.xy + vec2(21.5351, 14.3137));
    return fract(vec2(p.x * p.y * 95.4337, p.x * p.y * 97.5973));
}

// Value noise using Dave Hoskins hash
float value_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep

    vec2 res = mix(
        mix(hash22(i + vec2(0.0, 0.0)), hash22(i + vec2(1.0, 0.0)), f.x),
        mix(hash22(i + vec2(0.0, 1.0)), hash22(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
    return res.x; // Return one component of the hash as noise
}

// FBM using value_noise
float fbm_galaxy(vec2 p, int octaves, float lacunarity, float gain) {
    float total = 0.0;
    float frequency = 1.0;
    float amplitude = 0.5;
    for (int i = 0; i < octaves; i++) {
        total += value_noise(p * frequency) * amplitude;
        frequency *= lacunarity;
        amplitude *= gain;
    }
    return total;
}

// Star drawing function with size and color variation
vec3 stars_detailed(vec2 uv_stars, float base_scale, float time_offset) {
    vec3 col = vec3(0.0);
    float density_factor = 0.998;

    for (float i = 0.0; i < 3.0; i++) { // 3 layers of stars for parallax and variety
        float scale = base_scale * (1.0 + i * 1.5); // Increase scale for background stars
        vec2 p = uv_stars * scale + vec2(i * 10.0 + time_offset * (0.1 + i*0.05), i * 20.0);
        vec2 id = floor(p);
        vec2 hv = hash22(id);

        if (hv.x > density_factor) {
            float star_size = (1.0 - hv.x) / (1.0 - density_factor) * (0.01 + 0.02 / (1.0 + i)); // Smaller for further layers
            float dist_to_star = length(fract(p) - 0.5);
            float star_glow = smoothstep(star_size, 0.0, dist_to_star);
            
            // Star color variation (simple: mostly white, some blues, some yellows)
            vec3 star_color = vec3(1.0);
            if(hv.y < 0.3) star_color = vec3(0.7, 0.7, 1.0); // Bluish
            else if(hv.y > 0.7) star_color = vec3(1.0, 0.9, 0.7); // Yellowish

            col += star_glow * star_color * (0.5 + hv.y * 0.5) * (1.0 - i*0.3); // Dimmer for further layers
        }
    }
    return col;
}

void main() {
    vec2 uv = vUv - 0.5;
    float t = time * 0.03;

    // Galaxy arm distortion parameters
    float arm_angle_offset = 1.5; // How much arms are wound
    float arm_tightness = 3.0;   // How tight the spiral is
    float bulge_factor = 0.2;    // Size of the central bulge influence

    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    // Distort UVs to create spiral arms
    vec2 distorted_uv = uv;
    float spiral_strength = smoothstep(bulge_factor, 1.0, dist);
    float arm_distortion = sin(angle * arm_tightness + dist * 5.0 - t * 2.0 + arm_angle_offset) * 0.2 * spiral_strength;
    distorted_uv.x += cos(angle) * arm_distortion;
    distorted_uv.y += sin(angle) * arm_distortion;
    distorted_uv *= (1.0 + dist * 0.3); // Expand outwards

    // --- Background Starfield ---
    vec3 starfield_color = stars_detailed(uv * 0.8 + vec2(t*0.1, -t*0.05), 200.0, t);

    // --- Galaxy Gas/Dust Clouds ---
    // Use FBM for gas clouds, make them follow the spiral distortion
    float gas_noise1 = fbm_galaxy(distorted_uv * 1.5 + vec2(t * 0.2, t * 0.1), 5, 2.0, 0.5);
    gas_noise1 = smoothstep(0.2, 0.6, gas_noise1);
    
    float gas_noise2 = fbm_galaxy(distorted_uv * 3.0 - vec2(t * 0.15, t * 0.25) + gas_noise1 * 0.3, 6, 2.2, 0.45);
    gas_noise2 = smoothstep(0.25, 0.55, gas_noise2);

    // Gas colors (more vibrant)
    vec3 gas_color1 = vec3(0.3, 0.1, 0.6); // Deep purple/blue
    vec3 gas_color2 = vec3(0.7, 0.2, 0.3); // Magenta/red
    vec3 gas_color_mixed = mix(gas_color1, gas_color2, smoothstep(0.0, 1.0, sin(dist*10.0 + angle*3.0 - t*3.0)*0.5+0.5));

    vec3 final_color = starfield_color;
    final_color = mix(final_color, gas_color_mixed, (gas_noise1 * 0.6 + gas_noise2 * 0.4) * (0.5 + dist * 0.3));

    // --- Brighter Stars within the galaxy plane ---
    vec3 galaxy_stars = stars_detailed(distorted_uv * 0.5, 80.0, -t*0.5); // Denser, brighter stars in arms
    final_color += galaxy_stars * (0.3 + smoothstep(0.1, 0.5, gas_noise1 + gas_noise2) * 0.7);

    // --- Central Bulge Glow ---
    float bulge_glow = pow(1.0 - smoothstep(0.0, bulge_factor + 0.1, dist), 2.0);
    vec3 bulge_color = vec3(1.0, 0.9, 0.7); // Bright, warm white
    final_color += bulge_color * bulge_glow * 1.5;

    // Final adjustments
    final_color = pow(final_color, vec3(0.8)); // Slight gamma correction
    final_color *= (1.0 - dist * 0.2); // Fade edges slightly

    gl_FragColor = vec4(clamp(final_color, 0.0, 1.0), 1.0);
} 