precision mediump float;
varying vec2 vUv;
uniform float time;

// IQ's noise functions (https://www.shadertoy.com/view/MsfGzr)
vec2 hash( vec2 p ) { 
    p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) ); 
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float noise( vec2 p ) {
    vec2 i = floor( p );
    vec2 f = fract( p );
    vec2 u = f*f*(3.0-2.0*f);
    return mix( mix( dot( hash( i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ), 
                     dot( hash( i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                mix( dot( hash( i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ), 
                     dot( hash( i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}

// FBM using IQ's noise
float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 6; i++) { // 6 octaves for detailed water
        sum += amp * noise(p);
        p *= 2.1; // Slightly non-integer multiplier can look more organic
        amp *= 0.5;
    }
    return sum;
}

// Rotate UVs
mat2 rotate2D(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
    vec2 uv = vUv;
    float t = time * 0.1; // Slow down time significantly for a calmer sea

    // Define water layers with different scales, speeds, and directions
    vec2 uv1 = uv * 2.0; // Larger scale waves
    uv1 = rotate2D(0.2) * uv1; // Rotate for varied direction
    float wave1 = fbm(uv1 + vec2(t * 0.3, t * 0.2));

    vec2 uv2 = uv * 5.0; // Medium scale ripples
    uv2 = rotate2D(-0.35) * uv2;
    float wave2 = fbm(uv2 + vec2(-t * 0.5, t * 0.4));

    vec2 uv3 = uv * 12.0; // Small details, chop
    uv3 = rotate2D(0.5) * uv3;
    float wave3 = fbm(uv3 + vec2(t * 0.8, -t * 0.6));

    // Combine waves: weighted sum for different contributions
    float height = wave1 * 0.6 + wave2 * 0.3 + wave3 * 0.1;

    // Color mapping based on wave height (more nuanced)
    vec3 sky_color = vec3(0.3, 0.5, 0.8); // Reflection of the sky
    vec3 deep_water_color = vec3(0.02, 0.1, 0.25);
    vec3 mid_water_color = vec3(0.1, 0.3, 0.6);
    vec3 shallow_water_color = vec3(0.3, 0.6, 0.9); // Lighter for crests

    vec3 water_color = mix(deep_water_color, mid_water_color, smoothstep(-0.5, 0.0, height));
    water_color = mix(water_color, shallow_water_color, smoothstep(0.0, 0.5, height));
    water_color = mix(water_color, sky_color, smoothstep(0.2, 0.6, height) * 0.3); // Sky reflection on flatter parts

    // Enhanced foam simulation
    float foam_noise = noise(uv * 20.0 + t * 2.0); // Noise for foam texture
    float foam_amount = smoothstep(0.3, 0.5, height) * (1.0 - smoothstep(0.45, 0.6, height)); // Foam on crests
    foam_amount *= smoothstep(0.3, 0.6, foam_noise); // Break up foam with noise
    vec3 foam_color = vec3(0.95, 0.95, 1.0);
    water_color = mix(water_color, foam_color, foam_amount * 0.9);

    // Dynamic specular highlights
    // Approximate normal by sampling height at nearby points
    vec2 eps = vec2(0.005, 0.0);
    float h_plus_x = fbm((uv + eps.xy) * 2.0 + vec2(t*0.3, t*0.2)) * 0.6 + 
                     fbm((uv + eps.xy) * 5.0 + vec2(-t*0.5, t*0.4)) * 0.3;
    float h_minus_x = fbm((uv - eps.xy) * 2.0 + vec2(t*0.3, t*0.2)) * 0.6 + 
                      fbm((uv - eps.xy) * 5.0 + vec2(-t*0.5, t*0.4)) * 0.3;
    float h_plus_y = fbm((uv + eps.yx) * 2.0 + vec2(t*0.3, t*0.2)) * 0.6 + 
                     fbm((uv + eps.yx) * 5.0 + vec2(-t*0.5, t*0.4)) * 0.3;
    float h_minus_y = fbm((uv - eps.yx) * 2.0 + vec2(t*0.3, t*0.2)) * 0.6 + 
                      fbm((uv - eps.yx) * 5.0 + vec2(-t*0.5, t*0.4)) * 0.3;

    vec3 normal = normalize(vec3( (h_minus_x - h_plus_x) * 50.0,  // Multiply to make effect more pronounced
                                   (h_minus_y - h_plus_y) * 50.0,
                                   1.0 ));

    vec3 light_pos = vec3(1.0, 2.0, 1.0); // Light position relative to surface point
    vec3 view_dir = vec3(0.0, 0.0, 1.0);  // Assuming orthographic or distant camera view
    vec3 light_dir = normalize(light_pos - vec3(uv, height)); // Light direction from surface point
    vec3 halfway_dir = normalize(light_dir + view_dir);
    float specular = pow(max(dot(normal, halfway_dir), 0.0), 64.0); // Blinn-Phong specular
    specular *= (0.5 + abs(height) * 0.5); // More specular on wave crests/troughs

    water_color += vec3(1.0) * specular * 0.8;

    gl_FragColor = vec4(clamp(water_color, 0.0, 1.0), 1.0);
} 