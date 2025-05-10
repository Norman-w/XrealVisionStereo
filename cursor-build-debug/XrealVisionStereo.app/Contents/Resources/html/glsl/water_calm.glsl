// Calm water surface with subtle noise and reflection effect
precision mediump float;
varying vec2 vUv;
uniform float time;
// uniform samplerCube skybox; // Optional: for reflections

// Simple noise
float noise(vec2 p) {
    return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float snoise(vec2 v) { // Smoother noise variant
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,-0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); } // Helper for snoise

void main() {
    vec2 uv = vUv;
    float t = time * 0.1; // Slow time for calm water

    // Subtle UV distortion using smoother noise
    float displacement = snoise(uv * 5.0 + t) * 0.005; // Very small amplitude
    displacement += snoise(uv * 15.0 - t * 0.5) * 0.003;
    vec2 distortedUv = uv + vec2(displacement);

    // Base color (deep blue/cyan)
    vec3 baseColor = vec3(0.0, 0.15, 0.3);

    // Simulate reflection using Fresnel-like effect based on view angle (approximated)
    // We assume a view vector straight on (0,0,1) for simplicity here.
    // A real implementation needs camera position & surface normal.
    vec3 normal = normalize(vec3(displacement * 10.0, displacement * 10.0, 1.0)); // Perturbed normal
    vec3 viewDir = vec3(0.0, 0.0, 1.0); // Simplified view direction
    float fresnel = 0.02 + 0.98 * pow(1.0 - dot(normal, viewDir), 5.0); // Basic Fresnel term

    // Simple sky color for reflection
    vec3 skyColor = vec3(0.4, 0.6, 0.9);

    // Combine base color and reflection
    vec3 color = mix(baseColor, skyColor, fresnel);

    // --- Optional: Use skybox for reflection (uncomment uniform above) ---
    // Assumes view vector calculation and reflection vector `R` are done correctly
    // vec3 R = reflect(-viewDir, normal);
    // vec3 reflectionColor = textureCube(skybox, R).rgb;
    // color = mix(baseColor, reflectionColor, fresnel);

    gl_FragColor = vec4(color, 1.0);
} 