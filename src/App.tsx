// src/App.js

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
import { TextureLoader, Vector2, Mesh, ShaderMaterial, MathUtils } from 'three';
import { vertexShader, fragmentShader } from './shaders';
import './index.css';
import bg_1 from './assets/demo_1.png';
import bg_2 from './assets/demo_2.png';

// ========================================================================
// Component WaterEffect giờ sẽ tự quản lý vị trí chuột
// ========================================================================
function WaterEffect({ isMoving }: { isMoving: boolean }) {
  const texture1 = useLoader(TextureLoader, bg_1);
  const texture2 = useLoader(TextureLoader, bg_2);
  const meshRef = useRef<Mesh>(null!);

  // Dùng ref để lưu trữ vị trí chuột. Cách này không gây re-render.
  const mousePosRef = useRef(new Vector2(0.5, 0.5));

  const aspect = useMemo(() => (texture1.image ? texture1.image.width / texture1.image.height : 1), [texture1]);
  const planeSize = useMemo(() => {
    const width = 15;
    const height = width / aspect;
    return [width, height];
  }, [aspect]);

  const uniforms = useMemo(
    () => ({
      u_texture1: { value: texture1 },
      u_texture2: { value: texture2 },
      // Giá trị của u_mouse sẽ được cập nhật liên tục trong useFrame
      u_mouse: { value: new Vector2(0.5, 0.5) },
      u_time: { value: 0.0 },
      u_intensity: { value: 0.0 },
      u_radius: { value: 0.0 }
    }),
    [texture1, texture2]
  );

  // Hàm xử lý sự kiện di chuột, được đặt ngay trong component này
  const handlePointerMove = (event: ThreeEvent<MouseEvent>) => {
    // Khi chuột di chuyển trên mesh, cập nhật giá trị trong ref
    if (event.uv) {
      mousePosRef.current.copy(event.uv);
    }
  };

  useFrame(state => {
    if (meshRef.current?.material) {
      const material = meshRef.current.material as ShaderMaterial;

      // Cập nhật uniform thời gian
      material.uniforms.u_time.value = state.clock.getElapsedTime();
      
      // Lấy giá trị từ ref và cập nhật vào uniform
      material.uniforms.u_mouse.value.copy(mousePosRef.current);
      
      // Logic làm mờ hiệu ứng vẫn giữ nguyên
      const targetIntensity = isMoving ? 1.0 : 0.0;
      const targetRadius = isMoving ? 0.12 : 0.0;

      material.uniforms.u_intensity.value = MathUtils.lerp(
        material.uniforms.u_intensity.value,
        targetIntensity,
        0.1
      );
      material.uniforms.u_radius.value = MathUtils.lerp(
        material.uniforms.u_radius.value,
        targetRadius,
        0.1
      );
    }
  });

  return (
    // Gắn sự kiện onPointerMove trực tiếp vào mesh này
    <mesh ref={meshRef} onPointerMove={handlePointerMove}>
      <planeGeometry args={planeSize as [number, number]} />
      <shaderMaterial
        key={vertexShader + fragmentShader}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

// ========================================================================
// Component App chính giờ chỉ quản lý việc chuột có di chuyển hay không
// ========================================================================
export default function App() {
  const [isMoving, setIsMoving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hàm này giờ chỉ có nhiệm vụ set isMoving, không cần raycaster
  const handlePointerMove = () => {
    setIsMoving(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsMoving(false), 150);
  };

  return (
    <div className="container">
      {/* Sự kiện trên Canvas giờ chỉ dùng để xác định xem chuột có dừng hay không */}
      <Canvas camera={{ fov: 50, position: [0, 0, 15] }} onPointerMove={handlePointerMove}>
        {/* Truyền isMoving xuống để có hiệu ứng fade out */}
        <WaterEffect isMoving={isMoving} />
      </Canvas>
    </div>
  );
}