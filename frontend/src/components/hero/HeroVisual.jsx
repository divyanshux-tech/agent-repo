import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Line, PointMaterial, Points } from '@react-three/drei';
import * as THREE from 'three';

const Globe = () => {
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  // Simple route arc using a bezier curve
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.5, 0.5, 0.8),   // Start (Delhi approx)
    new THREE.Vector3(1, 1, 1.2),       // Middle control point
    new THREE.Vector3(0.2, -0.3, 0.9)   // End (Goa approx)
  );
  
  const points = curve.getPoints(50);

  return (
    <group ref={groupRef}>
      {/* Base Globe */}
      <Sphere args={[1, 64, 64]}>
        <meshStandardMaterial 
          color="#FFF7ED" 
          roughness={0.8}
          metalness={0.1}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {/* Wireframe overlay for a tech feel */}
      <Sphere args={[1.01, 32, 32]}>
        <meshBasicMaterial 
          color="#FED7AA" 
          wireframe
          transparent
          opacity={0.3}
        />
      </Sphere>

      {/* Route Arc */}
      <Line
        points={points}
        color="#F97316"
        lineWidth={3}
        dashed
        dashScale={5}
        dashSize={1}
        dashOffset={0}
      />
      
      {/* Start Point */}
      <mesh position={[0.5, 0.5, 0.8]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#EA580C" />
      </mesh>

      {/* End Point */}
      <mesh position={[0.2, -0.3, 0.9]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#EA580C" />
      </mesh>
    </group>
  );
};

export const HeroVisual = () => {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center relative pointer-events-none">
      <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
        <ambientLight intensity={1.5} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={2} color="#F97316" />
        <Globe />
      </Canvas>
    </div>
  );
};
