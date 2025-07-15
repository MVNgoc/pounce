// src/App.js

import { useRef, useMemo, useState } from 'react';
import {
  Canvas,
  useFrame,
  useLoader,
  useThree,
  type ThreeEvent
} from '@react-three/fiber';
import { TextureLoader, Vector2, Mesh, ShaderMaterial, MathUtils } from 'three';
import { vertexShader, fragmentShader } from './shaders';
import './index.css';
import bg_1 from './assets/demo_1.png';
import bg_2 from './assets/demo_2.png';

function WaterEffect({ isMoving }: { isMoving: boolean }) {
  const texture1 = useLoader(TextureLoader, bg_1);
  const texture2 = useLoader(TextureLoader, bg_2);
  const meshRef = useRef<Mesh>(null!);

  const { viewport } = useThree();

  const mousePosRef = useRef(new Vector2(0.5, 0.5));

  const planeSize = useMemo(() => {
    if (!texture1.image) return [1, 1];

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
  }, [texture1, viewport]);

  const uniforms = useMemo(
    () => ({
      u_texture1: { value: texture1 },
      u_texture2: { value: texture2 },
      u_mouse: { value: new Vector2(0.5, 0.5) },
      u_time: { value: 0.0 },
      u_intensity: { value: 0.0 },
      u_radius: { value: 0.0 },
      u_ring_thickness: { value: 0.02 },
      u_pointiness: { value: 0.8 }
    }),
    [texture1, texture2]
  );

  const handlePointerMove = (event: ThreeEvent<MouseEvent>) => {
    if (event.uv) {
      mousePosRef.current.copy(event.uv);
    }
  };

  useFrame(state => {
    if (meshRef.current?.material) {
      const material = meshRef.current.material as ShaderMaterial;

      material.uniforms.u_time.value = state.clock.getElapsedTime();

      material.uniforms.u_mouse.value.copy(mousePosRef.current);

      const targetIntensity = isMoving ? 1.0 : 0.0;
      const targetRadius = isMoving ? 0.14 : 0.0;

      material.uniforms.u_intensity.value = MathUtils.lerp(
        material.uniforms.u_intensity.value,
        targetIntensity,
        0.1
      );
      material.uniforms.u_radius.value = MathUtils.lerp(
        material.uniforms.u_radius.value,
        targetRadius,
        0.05
      );
    }
  });

  return (
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

export default function App() {
  const [isMoving, setIsMoving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerMove = () => {
    setIsMoving(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsMoving(false), 150);
  };

  return (
    <div className="container">
      <Canvas
        camera={{ fov: 50, position: [0, 0, 15] }}
        onPointerMove={handlePointerMove}
      >
        <WaterEffect isMoving={isMoving} />
      </Canvas>
    </div>
  );
}
