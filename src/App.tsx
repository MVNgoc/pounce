import { useState, useRef, useMemo } from 'react';
import {
  Canvas,
  useLoader,
  useThree,
  useFrame,
  type ThreeEvent
} from '@react-three/fiber';
import { TextureLoader, Vector2, ShaderMaterial, Mesh, MathUtils } from 'three';
import bg_1 from './assets/demo_1_full.png';
import bg_2 from './assets/demo_2_full.png';
import { fragmentShader, vertexShader } from './shaders';

// Hằng số định nghĩa độ dài của vệt mờ (số lượng điểm).
const TRAIL_LENGTH = 25;

// Component chính tạo hiệu ứng nước.
function WaterEffect({ isMoving }: { isMoving: boolean }) {
  // Sử dụng hook `useLoader` của R3F để tải các texture (hình ảnh).
  const texture1 = useLoader(TextureLoader, bg_1); // Texture cho lớp nền
  const texture2 = useLoader(TextureLoader, bg_2); // Texture cho lớp UI/nội dung

  // Tạo một 'tham chiếu' (`ref`) để có thể truy cập trực tiếp đến đối tượng mesh.
  const meshRef = useRef<Mesh>(null!);

  // Lấy thông tin về kích thước của khung nhìn (viewport) để tính toán tỷ lệ.
  const { viewport } = useThree();

  // Dùng `useRef` để lưu trữ mảng các vị trí của vệt mờ.
  // `useRef` được dùng vì việc cập nhật vị trí mỗi frame không cần kích hoạt re-render component.
  const trailRef = useRef(
    // Khởi tạo một mảng có độ dài `TRAIL_LENGTH`.
    Array.from({ length: TRAIL_LENGTH }, () => new Vector2(0.5, 0.5))
    // Mỗi phần tử trong mảng là một `Vector2` với vị trí ban đầu ở giữa màn hình.
  );

  // Sử dụng `useMemo` để tính toán và ghi nhớ kích thước của tấm plane.
  // Chỉ tính toán lại khi `texture1` hoặc `viewport` thay đổi, giúp tối ưu hiệu suất.
  const planeSize = useMemo(() => {
    // Nếu texture chưa tải xong, trả về kích thước mặc định.
    if (!texture1.image) return [1, 1];

    // Đoạn code này đảm bảo tấm plane có tỷ lệ khung hình giống hệt ảnh nền
    // và lấp đầy màn hình mà không bị bóp méo.
    const imageAspect = texture1.image.width / texture1.image.height;
    const viewportAspect = viewport.width / viewport.height;

    let width, height;

    if (imageAspect > viewportAspect) {
      width = viewport.width;
      height = width / imageAspect;
    } else {
      height = viewport.height;
      width = height * imageAspect;
    }

    return [width, height];
  }, [texture1, viewport]); // Dependencies của useMemo.

  // Dùng `useMemo` để định nghĩa các 'uniform' - các biến được truyền từ JavaScript vào shader.
  // Chỉ tạo lại object này khi texture thay đổi.
  const uniforms = useMemo(
    () => ({
      u_texture1: { value: texture1 }, // Gửi texture 1 vào shader.
      u_texture2: { value: texture2 }, // Gửi texture 2 vào shader.
      u_trail: { value: trailRef.current }, // Gửi mảng vị trí vệt mờ vào shader.
      u_time: { value: 0.0 }, // Thời gian trôi qua, dùng cho các animation tự động.
      u_intensity: { value: 0.0 }, // Cường độ của hiệu ứng.
      u_radius: { value: 0.0 }, // Bán kính của hiệu ứng.
      // Các uniform cũ có thể không cần dùng nữa, tùy thuộc vào shader cuối cùng của bạn.
      u_ring_thickness: { value: 0.02 },
      u_pointiness: { value: 0.8 }
    }),
    [texture1, texture2] // Dependencies của useMemo.
  );

  // Hàm xử lý sự kiện khi chuột di chuyển trên tấm plane.
  const handlePointerMove = (event: ThreeEvent<MouseEvent>) => {
    // `event.uv` là tọa độ (u, v) của con trỏ trên bề mặt mesh, giá trị từ 0.0 đến 1.0.
    if (event.uv) {
      // Cập nhật vị trí mục tiêu mà vệt mờ sẽ đuổi theo.
      mouseTarget.copy(event.uv);
    }
  };

  // Dùng `useMemo` để tạo một đối tượng `Vector2` duy nhất, lưu trữ vị trí mục tiêu của chuột.
  const mouseTarget = useMemo(() => new Vector2(0.5, 0.5), []);

  // `useFrame` là một hook của R3F, nó sẽ gọi hàm này ở mỗi khung hình (khoảng 60 lần/giây).
  // Đây là vòng lặp animation chính của chúng ta.
  useFrame(state => {
    // Đảm bảo material của mesh đã tồn tại.
    if (meshRef.current?.material) {
      const material = meshRef.current.material as ShaderMaterial;

      // Cập nhật uniform thời gian bằng thời gian đã trôi qua của ứng dụng.
      material.uniforms.u_time.value = state.clock.getElapsedTime();

      // Lấy ra mảng các vị trí từ ref.
      const trail = trailRef.current;
      const targetPos = mouseTarget;

      // Vòng lặp để cập nhật vị trí cho từng điểm trong vệt mờ.
      trail.forEach((point, i) => {
        if (i === 0) {
          // Điểm đầu tiên (`i === 0`) sẽ đuổi theo vị trí con trỏ chuột (`targetPos`).
          // `lerp` (Linear Interpolation) tạo ra chuyển động mượt mà. 0.3 là hệ số làm mượt.
          point.lerp(targetPos, 0.3);
        } else {
          // Các điểm còn lại sẽ đuổi theo điểm ngay phía trước nó (`trail[i - 1]`).
          point.lerp(trail[i - 1], 0.3);
        }
      });
      // Gửi mảng vị trí đã được cập nhật vào cho shader.
      material.uniforms.u_trail.value = trail;

      // Xác định cường độ và bán kính mục tiêu của hiệu ứng dựa trên prop `isMoving`.
      const targetIntensity = isMoving ? 1.0 : 0.0; // 1.0 nếu chuột đang di chuyển.
      const targetRadius = isMoving ? 0.08 : 0.0; // 0.14 nếu chuột đang di chuyển.

      // Làm mượt giá trị cường độ để hiệu ứng xuất hiện và biến mất từ từ.
      material.uniforms.u_intensity.value = MathUtils.lerp(
        material.uniforms.u_intensity.value,
        targetIntensity,
        0.1 // Hệ số làm mượt
      );
      // Làm mượt giá trị bán kính.
      material.uniforms.u_radius.value = MathUtils.lerp(
        material.uniforms.u_radius.value,
        targetRadius,
        0.05 // Hệ số làm mượt
      );
    }
  });

  // Trả về đối tượng mesh để render.
  return (
    <mesh ref={meshRef} onPointerMove={handlePointerMove}>
      {/* Hình dạng của mesh là một tấm plane (mặt phẳng). */}
      <planeGeometry args={planeSize as [number, number]} />
      {/* Vật liệu của mesh là một shader tùy chỉnh. */}
      <shaderMaterial
        // `key` giúp React tạo lại material khi shader thay đổi.
        key={vertexShader + fragmentShader}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

// Component App chính, chứa Canvas và quản lý trạng thái di chuyển của chuột.
export default function App() {
  // Tạo một state để theo dõi xem con trỏ chuột có đang di chuyển hay không.
  const [isMoving, setIsMoving] = useState(false);
  // Dùng `useRef` để lưu ID của `setTimeout`, giúp chúng ta có thể hủy nó khi cần.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hàm này được gọi mỗi khi chuột di chuyển trên toàn bộ `Canvas`.
  const handlePointerMove = () => {
    // Khi chuột di chuyển, đặt trạng thái `isMoving` thành `true`.
    setIsMoving(true);
    // Hủy timeout cũ (nếu có) để đặt lại bộ đếm thời gian.
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Đặt một bộ đếm thời gian. Sau 150ms không di chuyển chuột...
    timeoutRef.current = setTimeout(() => setIsMoving(false), 150); // ...sẽ đặt `isMoving` thành `false`.
  };

  return (
    <div className="container">
      {/* Canvas là khu vực render 3D của R3F. */}
      <Canvas
        camera={{ fov: 50, position: [0, 0, 15] }}
        // Gắn hàm xử lý sự kiện vào `Canvas`.
        onPointerMove={handlePointerMove}
      >
        {/* Render component hiệu ứng và truyền trạng thái `isMoving` vào làm prop. */}
        <WaterEffect isMoving={isMoving} />
      </Canvas>
    </div>
  );
}
