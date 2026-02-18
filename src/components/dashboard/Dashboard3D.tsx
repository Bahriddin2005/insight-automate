import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { RotateCcw, Box, BarChart3, PieChart, ScatterChart, TrendingUp, Grid3x3, ToggleLeft, ToggleRight } from 'lucide-react';
import { type DataPoint, type Chart3DType, buildBarChart, buildPieChart, buildScatterChart, buildLineChart, buildSurfaceChart } from './Chart3DBuilders';

interface Dashboard3DProps {
  data: DataPoint[];
  title?: string;
  onToggle2D?: () => void;
}

const CHART_TYPES: { type: Chart3DType; icon: typeof BarChart3; label: string }[] = [
  { type: 'bar', icon: BarChart3, label: 'Bar' },
  { type: 'pie', icon: PieChart, label: 'Pie' },
  { type: 'scatter', icon: ScatterChart, label: 'Scatter' },
  { type: 'line', icon: TrendingUp, label: 'Line' },
  { type: 'surface', icon: Grid3x3, label: 'Surface' },
];

export default function Dashboard3D({ data, title = '3D Dashboard', onToggle2D }: Dashboard3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: -0.3, y: 0.5 });
  const zoomRef = useRef(12);
  const groupRef = useRef<THREE.Group | null>(null);
  const [hoveredBar, setHoveredBar] = useState<DataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const barMeshesRef = useRef<{ mesh: THREE.Mesh; data: DataPoint }[]>([]);
  const animFrameRef = useRef(0);
  const [chartType, setChartType] = useState<Chart3DType>('bar');
  const [wireframe, setWireframe] = useState(false);
  const surfaceMeshRef = useRef<THREE.Mesh | null>(null);

  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || data.length === 0) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    const z = zoomRef.current;
    camera.position.set(0, z * 0.42, z);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0x6366f1, 0.5, 30);
    pointLight.position.set(-5, 8, 5);
    scene.add(pointLight);

    const group = new THREE.Group();
    groupRef.current = group;
    scene.add(group);

    // Ground + grid
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.3, roughness: 0.8 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    group.add(ground);
    group.add(new THREE.GridHelper(16, 16, 0x333366, 0x222244));

    // Build chart based on type
    const builders = { bar: buildBarChart, pie: buildPieChart, scatter: buildScatterChart, line: buildLineChart, surface: buildSurfaceChart };
    const result = builders[chartType](group, data, maxValue);
    barMeshesRef.current = result.meshes;
    if (chartType === 'surface' && result.surfaceMesh) {
      surfaceMeshRef.current = result.surfaceMesh;
      (result.surfaceMesh.material as THREE.MeshStandardMaterial).wireframe = wireframe;
    } else {
      surfaceMeshRef.current = null;
    }

    group.rotation.x = rotationRef.current.x;
    group.rotation.y = rotationRef.current.y;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.002;
        group.rotation.y = rotationRef.current.y;
      }
      group.rotation.x = rotationRef.current.x;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth; const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [data, maxValue, chartType, wireframe]);

  // Mouse/touch handlers
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => { isDraggingRef.current = true; previousMouseRef.current = { x: e.clientX, y: e.clientY }; };
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - previousMouseRef.current.x;
        const dy = e.clientY - previousMouseRef.current.y;
        rotationRef.current.y += dx * 0.005;
        rotationRef.current.x += dy * 0.005;
        rotationRef.current.x = Math.max(-1, Math.min(0.5, rotationRef.current.x));
        if (groupRef.current) { groupRef.current.rotation.y = rotationRef.current.y; groupRef.current.rotation.x = rotationRef.current.x; }
        previousMouseRef.current = { x: e.clientX, y: e.clientY };
      }
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (cameraRef.current && sceneRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const meshes = barMeshesRef.current.map(b => b.mesh);
        const intersects = raycasterRef.current.intersectObjects(meshes);
        if (intersects.length > 0) {
          const hit = barMeshesRef.current.find(b => b.mesh === intersects[0].object);
          if (hit) { setHoveredBar(hit.data); setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }); container.style.cursor = 'pointer'; }
        } else { setHoveredBar(null); container.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab'; }
      }
    };
    const handleMouseUp = () => { isDraggingRef.current = false; container.style.cursor = 'grab'; };

    // Zoom: scroll wheel
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(4, Math.min(30, zoomRef.current + e.deltaY * 0.01));
      if (cameraRef.current) {
        cameraRef.current.position.set(0, zoomRef.current * 0.42, zoomRef.current);
        cameraRef.current.lookAt(0, 0, 0);
      }
    };

    // Zoom: pinch
    let lastPinchDist = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      } else {
        isDraggingRef.current = true;
        previousMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist > 0) {
          const delta = (lastPinchDist - dist) * 0.05;
          zoomRef.current = Math.max(4, Math.min(30, zoomRef.current + delta));
          if (cameraRef.current) {
            cameraRef.current.position.set(0, zoomRef.current * 0.42, zoomRef.current);
            cameraRef.current.lookAt(0, 0, 0);
          }
        }
        lastPinchDist = dist;
        return;
      }
      if (!isDraggingRef.current) return;
      const dx2 = e.touches[0].clientX - previousMouseRef.current.x;
      const dy2 = e.touches[0].clientY - previousMouseRef.current.y;
      rotationRef.current.y += dx2 * 0.005;
      rotationRef.current.x += dy2 * 0.005;
      rotationRef.current.x = Math.max(-1, Math.min(0.5, rotationRef.current.x));
      if (groupRef.current) { groupRef.current.rotation.y = rotationRef.current.y; groupRef.current.rotation.x = rotationRef.current.x; }
      previousMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = () => { isDraggingRef.current = false; lastPinchDist = 0; };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const resetRotation = () => {
    rotationRef.current = { x: -0.3, y: 0.5 };
    zoomRef.current = 12;
    if (groupRef.current) { groupRef.current.rotation.x = -0.3; groupRef.current.rotation.y = 0.5; }
    if (cameraRef.current) { cameraRef.current.position.set(0, 5, 12); cameraRef.current.lookAt(0, 0, 0); }
  };

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-gradient-to-b from-background to-muted/30 border border-border">
      {/* Header */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={resetRotation}>
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
          {onToggle2D && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onToggle2D}>
              <BarChart3 className="w-3 h-3" /> 2D
            </Button>
          )}
        </div>
      </div>

      {/* Chart type selector */}
      <div className="absolute top-12 left-4 z-10 flex gap-1 bg-background/60 backdrop-blur-sm rounded-lg p-1 border border-border/50">
        {CHART_TYPES.map(ct => (
          <Button
            key={ct.type}
            variant={chartType === ct.type ? 'default' : 'ghost'}
            size="sm"
            className={`h-7 text-[10px] gap-1 px-2 ${chartType === ct.type ? '' : 'text-muted-foreground'}`}
            onClick={() => setChartType(ct.type)}
          >
            <ct.icon className="w-3 h-3" /> {ct.label}
          </Button>
        ))}
      </div>

      {/* Wireframe toggle for surface */}
      {chartType === 'surface' && (
        <div className="absolute top-12 right-4 z-10">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] gap-1 px-2"
            onClick={() => setWireframe(w => !w)}
          >
            {wireframe ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
            {wireframe ? 'Solid' : 'Wire'}
          </Button>
        </div>
      )}

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

      {/* Color legend for surface */}
      {chartType === 'surface' && (
        <div className="absolute bottom-3 right-4 z-10 flex flex-col items-end gap-1">
          <div className="text-[10px] text-muted-foreground font-medium">Value Scale</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-muted-foreground">Low</span>
            <div
              className="w-24 h-3 rounded-sm border border-border/50"
              style={{ background: 'linear-gradient(to right, rgb(0,0,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))' }}
            />
            <span className="text-[9px] text-muted-foreground">High</span>
          </div>
        </div>
      )}

      {/* 3D Badge */}
      <div className="absolute bottom-3 left-4 flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
        <Box className="w-3 h-3" />
        3D {chartType.charAt(0).toUpperCase() + chartType.slice(1)}
      </div>
    </div>
  );
}
