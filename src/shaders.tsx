// vertexShader không thay đổi
export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// fragmentShader đã được cập nhật với đầy đủ hàm snoise
export const fragmentShader = `
// Định nghĩa độ dài của mảng, phải khớp với giá trị trong JS
#define TRAIL_LENGTH 20

precision mediump float;

// Uniforms
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform vec2 u_trail[TRAIL_LENGTH];
uniform float u_time;
uniform float u_intensity;
uniform float u_radius;
uniform float u_ring_thickness;
uniform float u_pointiness;

varying vec2 vUv;

// ... hàm snoise không đổi ...
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
    // Tìm khoảng cách ngắn nhất đến bất kỳ điểm nào trong vệt mờ
    float min_dist = 9999.0; // Khởi tạo với một số rất lớn

    for (int i = 0; i < TRAIL_LENGTH; i++) {
        vec2 p = vUv - u_trail[i];
        p.y *= 1.0 + p.x * u_pointiness;

        float trail_falloff = 1.0 - float(i) / float(TRAIL_LENGTH);
        float current_dist = length(p) - (u_radius * trail_falloff);

        min_dist = min(min_dist, current_dist);
    }
    
    float dist = min_dist;

    float edge_smoothness = 0.01;
    float inner_dist_offset = -u_ring_thickness;
    float outer_edge = smoothstep(0.0, -edge_smoothness, dist);
    float inner_edge = smoothstep(inner_dist_offset, inner_dist_offset - edge_smoothness, dist);
    float distortion_strength = (outer_edge - inner_edge) * u_intensity;

    float reveal_alpha = smoothstep(edge_smoothness, -edge_smoothness, dist) * u_intensity;
    
    // =======================================================
    // DÒNG NÀY ĐÃ ĐƯỢC SỬA LỖI
    vec2 noise_vec = vec2(snoise(vUv * 5.0 + vec2(u_time * 0.5)));
    // =======================================================
    
    vec2 displacement = vUv + noise_vec * 0.02 * distortion_strength;
    
    vec4 distorted_color = texture2D(u_texture1, displacement);
    vec4 clear_color = texture2D(u_texture1, vUv);
    vec4 top_color = texture2D(u_texture2, vUv);
    
    vec4 final_color = mix(top_color, clear_color, reveal_alpha);
    final_color = mix(final_color, distorted_color, distortion_strength);

    gl_FragColor = final_color;
}
`;
