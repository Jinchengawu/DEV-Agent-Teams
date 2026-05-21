---
name: threejs
description: Three.js 3D 图形开发
tags: [frontend, threejs, 3d, webgl, graphics]
---

# Three.js 3D 开发技能

## 触发条件

- 3D 场景创建
- WebGL 渲染
- 3D 模型加载
- 动画和交互

## 项目初始化

```bash
# 安装
npm install three @types/three

# React Three Fiber
npm install @react-three/fiber @react-three/drei
```

## 基础示例

```typescript
// src/Scene.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Sphere } from '@react-three/drei';

function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      <Box args={[1, 1, 1]} position={[-1.5, 0, 0]}>
        <meshStandardMaterial color="orange" />
      </Box>
      
      <Sphere args={[0.5, 32, 32]} position={[1.5, 0, 0]}>
        <meshStandardMaterial color="blue" />
      </Sphere>
      
      <OrbitControls />
    </Canvas>
  );
}

export default Scene;
```

## Three.js 原生

```typescript
// src/three-scene.ts
import * as THREE from 'three';

// 创建场景
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 创建几何体
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

// 动画循环
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}

animate();
```

## 模型加载

```typescript
// 加载 GLTF 模型
import { useGLTF } from '@react-three/drei';

function Model({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// 使用
<Canvas>
  <Model url="/models/character.glb" />
</Canvas>
```

## 材质和纹理

```typescript
// 纹理加载
import { useTexture } from '@react-three/drei';

function TexturedBox() {
  const texture = useTexture('/textures/wood.jpg');
  
  return (
    <Box args={[1, 1, 1]}>
      <meshStandardMaterial map={texture} />
    </Box>
  );
}
```

## 物理效果

```typescript
// 使用 @react-three/rapier 物理引擎
import { Physics, RigidBody } from '@react-three/rapier';

function PhysicsScene() {
  return (
    <Physics>
      <RigidBody>
        <Box position={[0, 5, 0]}>
          <meshStandardMaterial color="red" />
        </Box>
      </RigidBody>
      
      <RigidBody type="fixed">
        <Box position={[0, -1, 0]} args={[10, 1, 10]}>
          <meshStandardMaterial color="gray" />
        </Box>
      </RigidBody>
    </Physics>
  );
}
```

## 最佳实践

### 性能优化
- 使用实例化渲染
- 几何体合并
- 纹理压缩
- LOD（细节层次）

### 代码组织
- 组件化场景
- 状态管理
- 事件处理

### 响应式
```typescript
// 自适应窗口大小
function ResponsiveCanvas() {
  const { size } = useThree();
  
  useEffect(() => {
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
  }, [size]);
}
```

---

**技能版本**：v1.0
