export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  precision mediump float;

  // Uniforms
  uniform sampler2D u_texture1; // Ảnh dưới
  uniform sampler2D u_texture2; // Ảnh trên
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform float u_intensity;
  uniform float u_radius;
  uniform float u_ring_thickness; // Độ dày của viền sóng

  // Varyings
  varying vec2 vUv;

  // Hàm snoise (không thay đổi)
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

  // --- LOGIC SHADER MỚI ---
  void main() {
    float dist = distance(vUv, u_mouse);

    // 1. TÍNH TOÁN ĐỘ MẠNH CỦA HIỆU ỨNG SÓNG (HÌNH CÁI NHẪN)
    // Tính bán kính trong của vòng tròn
    float inner_radius = u_radius - u_ring_thickness;
    // Tạo hiệu ứng mạnh dần từ trong ra ngoài...
    float ring_fade_in = smoothstep(inner_radius, u_radius, dist);
    // ...và yếu dần từ trong tâm ra
    float ring_fade_out = smoothstep(inner_radius, 0.0, dist);
    // Kết hợp lại để tạo thành một dải sóng ở viền
    float distortion_strength = (1.0 - ring_fade_in) * ring_fade_out;
    distortion_strength *= u_intensity; // Áp dụng cường độ tổng thể

    // 2. TÍNH TOÁN SỰ BIẾN DẠNG (DISPLACEMENT)
    // Vector nhiễu để tạo hình gợn sóng
    vec2 noise_vec = vec2(snoise(vUv * 5.0 + u_time * 0.5), snoise(vUv * 5.0 + u_time * 0.5));
    // Áp dụng sự biến dạng chỉ ở vùng viền sóng
    vec2 displacement = vUv + noise_vec * 0.03 * distortion_strength;

    // 3. LẤY MÀU VÀ PHA TRỘN
    // Lấy màu từ ảnh dưới (có áp dụng hiệu ứng sóng)
    vec4 color1 = texture2D(u_texture1, displacement);
    // Lấy màu từ ảnh trên (không có hiệu ứng)
    vec4 color2 = texture2D(u_texture2, vUv);

    // 4. TÍNH TOÁN VÙNG HIỂN THỊ ẢNH NỀN (HÌNH TRÒN ĐẦY)
    // Tạo ra một hình tròn đầy với cạnh mềm để pha trộn
    float mix_alpha = smoothstep(u_radius, u_radius - 0.05, dist);
    mix_alpha *= u_intensity; // Hiển thị theo cường độ chung

    // 5. MÀU CUỐI CÙNG
    // Pha trộn giữa ảnh trên và ảnh dưới dựa trên vùng tròn đầy
    gl_FragColor = mix(color2, color1, mix_alpha);
  }
`;
