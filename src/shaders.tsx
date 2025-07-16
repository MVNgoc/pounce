export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
#define TRAIL_LENGTH 40
#define METABALL_THRESHOLD 0.7 
#define EDGE_THICKNESS 0.15 

precision mediump float;

uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform vec2 u_trail[TRAIL_LENGTH];
uniform float u_time;
uniform float u_intensity;
uniform float u_radius;
uniform float u_aspect;

varying vec2 vUv;

// Hàm snoise... (giữ nguyên)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    float total_energy = 0.0;

    // SỬA LẠI: Tính toán energy đúng cách
    for (int i = 0; i < TRAIL_LENGTH; i++) {
        vec2 p = vUv - u_trail[i];
        p.x *= u_aspect;
        float trail_falloff = 1.0 - float(i) / float(TRAIL_LENGTH);
        float radius = u_radius * trail_falloff;
        float dist = length(p);
        
        // Năng lượng sẽ là 1 ở tâm và giảm dần ra ngoài bán kính
        total_energy += smoothstep(radius, radius * 0.5, dist);
    }
    
    // Giới hạn energy để tránh các giá trị quá lớn
    total_energy = clamp(total_energy, 0.0, 1.0);

    // SỬA LẠI: Dùng smoothstep để có cạnh mềm mại
    float reveal_alpha = smoothstep(METABALL_THRESHOLD - 0.1, METABALL_THRESHOLD + 0.1, total_energy);
    reveal_alpha *= u_intensity;

    // Tính toán vùng viền gợn sóng
    float ring_start = METABALL_THRESHOLD - EDGE_THICKNESS;
    float ring_end = METABALL_THRESHOLD + EDGE_THICKNESS;
    float distortion_ring = smoothstep(ring_start, METABALL_THRESHOLD, total_energy) - smoothstep(METABALL_THRESHOLD, ring_end, total_energy);
    float distortion_strength = distortion_ring * u_intensity;

    // SỬA LẠI: Cú pháp tạo nhiễu
    vec2 noise_vec = vec2(snoise(vUv * 5.0 + u_time * 0.5), snoise(vUv * 5.0 - u_time * 0.5));
    vec2 displacement = vUv + noise_vec * 0.03 * distortion_strength;
    
    // Phần pha trộn màu giữ nguyên logic đúng ban đầu
    vec4 distorted_color = texture2D(u_texture1, displacement);
    vec4 clear_color = texture2D(u_texture1, vUv);
    vec4 top_color = texture2D(u_texture2, vUv);

    vec4 base_mixed_color = mix(top_color, clear_color, reveal_alpha);
    vec4 final_color = mix(base_mixed_color, distorted_color, distortion_strength);

    gl_FragColor = final_color;
}
`;
