import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { RotateCcw, Box, BarChart3 } from 'lucide-react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface Dashboard3DProps {
  data: DataPoint[];
  title?: string;
  onToggle2D?: () => void;
}

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
];

export default function Dashboard3D({ data, title = '3D Dashboard', onToggle2D }: Dashboard3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: -0.3, y: 0.5 });
  const groupRef = useRef<THREE.Group | null>(null);
  const [hoveredBar, setHoveredBar] = useState<DataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const barMeshesRef = useRef<{ mesh: THREE.Mesh; data: DataPoint }[]>([]);
  const animFrameRef = useRef(0);

  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || data.length === 0) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6366f1, 0.5, 30);
    pointLight.position.set(-5, 8, 5);
    scene.add(pointLight);

    // Group for rotation
    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a2e, 
      transparent: true, 
      opacity: 0.3,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    group.add(ground);

    // Grid
    const gridHelper = new THREE.GridHelper(16, 16, 0x333366, 0x222244);
    gridHelper.position.y = 0;
    group.add(gridHelper);

    // Create bars
    const barMeshes: { mesh: THREE.Mesh; data: DataPoint }[] = [];
    const barWidth = Math.min(0.8, 10 / data.length);
    const spacing = barWidth * 1.5;
    const totalWidth = data.length * spacing;
    const startX = -totalWidth / 2 + spacing / 2;

    data.forEach((d, i) => {
      const normalizedHeight = (d.value / maxValue) * 6;
      const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      
      // Bar geometry with rounded top
      const geo = new THREE.BoxGeometry(barWidth, normalizedHeight, barWidth);
      const mat = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(color),
        roughness: 0.3,
        metalness: 0.4,
        emissive: new THREE.Color(color).multiplyScalar(0.15),
      });
      
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(startX + i * spacing, normalizedHeight / 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Animate in
      mesh.scale.y = 0;
      const targetScaleY = 1;
      const delay = i * 80;
      
      setTimeout(() => {
        const animateBar = () => {
          if (mesh.scale.y < targetScaleY) {
            mesh.scale.y += (targetScaleY - mesh.scale.y) * 0.12;
            if (Math.abs(mesh.scale.y - targetScaleY) < 0.01) mesh.scale.y = targetScaleY;
          }
        };
        const interval = setInterval(animateBar, 16);
        setTimeout(() => clearInterval(interval), 1000);
      }, delay);
      
      group.add(mesh);
      barMeshes.push({ mesh, data: d });

      // Label below bar
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#a0a0c0';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label, 64, 20);
      
      const labelTexture = new THREE.CanvasTexture(canvas);
      const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
      const labelSprite = new THREE.Sprite(labelMat);
      labelSprite.position.set(startX + i * spacing, -0.5, 0);
      labelSprite.scale.set(2, 0.5, 1);
      group.add(labelSprite);
    });

    barMeshesRef.current = barMeshes;
    group.rotation.x = rotationRef.current.x;
    group.rotation.y = rotationRef.current.y;

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Slow auto-rotation when not dragging
      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.002;
        group.rotation.y = rotationRef.current.y;
      }
      group.rotation.x = rotationRef.current.x;

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [data, maxValue]);

  // Mouse handlers
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - previousMouseRef.current.x;
        const dy = e.clientY - previousMouseRef.current.y;
        rotationRef.current.y += dx * 0.005;
        rotationRef.current.x += dy * 0.005;
        rotationRef.current.x = Math.max(-1, Math.min(0.5, rotationRef.current.x));
        if (groupRef.current) {
          groupRef.current.rotation.y = rotationRef.current.y;
          groupRef.current.rotation.x = rotationRef.current.x;
        }
        previousMouseRef.current = { x: e.clientX, y: e.clientY };
      }

      // Raycasting for tooltips
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (cameraRef.current && sceneRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const meshes = barMeshesRef.current.map(b => b.mesh);
        const intersects = raycasterRef.current.intersectObjects(meshes);
        
        if (intersects.length > 0) {
          const hit = barMeshesRef.current.find(b => b.mesh === intersects[0].object);
          if (hit) {
            setHoveredBar(hit.data);
            setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            container.style.cursor = 'pointer';
          }
        } else {
          setHoveredBar(null);
          container.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      container.style.cursor = 'grab';
    };

    // Touch handlers
    const handleTouchStart = (e: TouchEvent) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.touches[0].clientX - previousMouseRef.current.x;
      const dy = e.touches[0].clientY - previousMouseRef.current.y;
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x += dy * 0.005;
      rotationRef.current.x = Math.max(-1, Math.min(0.5, rotationRef.current.x));
      if (groupRef.current) {
        groupRef.current.rotation.y = rotationRef.current.y;
        groupRef.current.rotation.x = rotationRef.current.x;
      }
      previousMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = () => { isDraggingRef.current = false; };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const resetRotation = () => {
    rotationRef.current = { x: -0.3, y: 0.5 };
    if (groupRef.current) {
      groupRef.current.rotation.x = -0.3;
      groupRef.current.rotation.y = 0.5;
    }
  };

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-gradient-to-b from-background to-muted/30 border border-border">
      {/* Header */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={resetRotation}>
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
          {onToggle2D && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onToggle2D}>
              <BarChart3 className="w-3 h-3" />
              2D
            </Button>
          )}
        </div>
      </div>

      {/* 3D Viewport */}
      <div ref={mountRef} className="w-full h-full" style={{ cursor: 'grab' }} />

      {/* Tooltip */}
      {hoveredBar && (
        <div
          className="absolute pointer-events-none z-20 bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-sm"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 40 }}
        >
          <div className="font-medium text-foreground">{hoveredBar.label}</div>
          <div className="text-primary font-bold">{hoveredBar.value.toLocaleString()}</div>
        </div>
      )}

      {/* 3D Badge */}
      <div className="absolute bottom-3 left-4 flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
        <Box className="w-3 h-3" />
        3D Mode
      </div>
    </div>
  );
}
