import * as THREE from 'three';

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

export const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
];

export type Chart3DType = 'bar' | 'pie' | 'scatter' | 'line' | 'surface';

interface BuildResult {
  meshes: { mesh: THREE.Mesh; data: DataPoint }[];
}

function createLabel(text: string, x: number, y: number, z: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#a0a0c0';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text.length > 10 ? text.slice(0, 10) + '…' : text, 64, 20);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(2, 0.5, 1);
  return sprite;
}

function makeMaterial(color: string, metalness = 0.4) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.3,
    metalness,
    emissive: new THREE.Color(color).multiplyScalar(0.15),
  });
}

export function buildBarChart(group: THREE.Group, data: DataPoint[], maxValue: number): BuildResult {
  const meshes: BuildResult['meshes'] = [];
  const barWidth = Math.min(0.8, 10 / data.length);
  const spacing = barWidth * 1.5;
  const totalWidth = data.length * spacing;
  const startX = -totalWidth / 2 + spacing / 2;

  data.forEach((d, i) => {
    const h = (d.value / maxValue) * 6;
    const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    const geo = new THREE.BoxGeometry(barWidth, h, barWidth);
    const mesh = new THREE.Mesh(geo, makeMaterial(color));
    mesh.position.set(startX + i * spacing, h / 2, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.y = 0;
    const delay = i * 80;
    setTimeout(() => {
      const anim = () => { if (mesh.scale.y < 1) { mesh.scale.y += (1 - mesh.scale.y) * 0.12; if (Math.abs(mesh.scale.y - 1) < 0.01) mesh.scale.y = 1; } };
      const iv = setInterval(anim, 16); setTimeout(() => clearInterval(iv), 1000);
    }, delay);
    group.add(mesh);
    meshes.push({ mesh, data: d });
    group.add(createLabel(d.label, startX + i * spacing, -0.5, 0));
  });
  return { meshes };
}

export function buildPieChart(group: THREE.Group, data: DataPoint[], maxValue: number): BuildResult {
  const meshes: BuildResult['meshes'] = [];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let startAngle = 0;
  const radius = 4;
  const height = 1.2;

  data.forEach((d, i) => {
    const angle = (d.value / total) * Math.PI * 2;
    const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    const shape = new THREE.Shape();
    const segments = Math.max(8, Math.round(angle * 16));
    shape.moveTo(0, 0);
    for (let s = 0; s <= segments; s++) {
      const a = startAngle + (s / segments) * angle;
      shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    shape.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, makeMaterial(color, 0.2));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0;
    mesh.castShadow = true;
    group.add(mesh);
    meshes.push({ mesh, data: d });

    // Label at midpoint
    const midAngle = startAngle + angle / 2;
    const lx = Math.cos(midAngle) * (radius * 0.65);
    const lz = -Math.sin(midAngle) * (radius * 0.65);
    group.add(createLabel(d.label, lx, height + 0.8, lz));
    startAngle += angle;
  });
  return { meshes };
}

export function buildScatterChart(group: THREE.Group, data: DataPoint[], maxValue: number): BuildResult {
  const meshes: BuildResult['meshes'] = [];
  const spread = 10;

  data.forEach((d, i) => {
    const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    const normalizedY = (d.value / maxValue) * 6;
    const x = (i / Math.max(data.length - 1, 1)) * spread - spread / 2;
    const z = (Math.sin(i * 1.5) * 2);
    const size = 0.2 + (d.value / maxValue) * 0.4;
    const geo = new THREE.SphereGeometry(size, 16, 16);
    const mesh = new THREE.Mesh(geo, makeMaterial(color, 0.5));
    mesh.position.set(x, normalizedY, z);
    mesh.castShadow = true;
    mesh.scale.set(0, 0, 0);
    const delay = i * 60;
    setTimeout(() => {
      const anim = () => {
        if (mesh.scale.x < 1) {
          mesh.scale.x += (1 - mesh.scale.x) * 0.15;
          mesh.scale.y = mesh.scale.x;
          mesh.scale.z = mesh.scale.x;
          if (Math.abs(mesh.scale.x - 1) < 0.01) mesh.scale.set(1, 1, 1);
        }
      };
      const iv = setInterval(anim, 16); setTimeout(() => clearInterval(iv), 800);
    }, delay);
    group.add(mesh);
    meshes.push({ mesh, data: d });
    group.add(createLabel(d.label, x, -0.5, z));
  });
  return { meshes };
}

export function buildLineChart(group: THREE.Group, data: DataPoint[], maxValue: number): BuildResult {
  const meshes: BuildResult['meshes'] = [];
  const spread = 12;
  const points: THREE.Vector3[] = [];

  data.forEach((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * spread - spread / 2;
    const y = (d.value / maxValue) * 6;
    points.push(new THREE.Vector3(x, y, 0));

    // Dot at each data point
    const color = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    const geo = new THREE.SphereGeometry(0.18, 12, 12);
    const mesh = new THREE.Mesh(geo, makeMaterial(color, 0.6));
    mesh.position.set(x, y, 0);
    mesh.castShadow = true;
    group.add(mesh);
    meshes.push({ mesh, data: d });
    group.add(createLabel(d.label, x, -0.5, 0));
  });

  // Line connecting points
  if (points.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.06, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2, metalness: 0.6, emissive: new THREE.Color(0x06b6d4).multiplyScalar(0.2) });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    group.add(tube);
  }
  return { meshes };
}

export function buildSurfaceChart(group: THREE.Group, data: DataPoint[], maxValue: number): BuildResult {
  const meshes: BuildResult['meshes'] = [];
  const gridSize = Math.max(3, Math.ceil(Math.sqrt(data.length)));
  const spread = 10;
  const cellSize = spread / gridSize;

  // Build height grid from data
  const heights: number[][] = [];
  for (let z = 0; z < gridSize; z++) {
    heights[z] = [];
    for (let x = 0; x < gridSize; x++) {
      const idx = z * gridSize + x;
      heights[z][x] = idx < data.length ? (data[idx].value / maxValue) : 0;
    }
  }

  // Create surface geometry
  const geo = new THREE.PlaneGeometry(spread, spread, gridSize - 1, gridSize - 1);
  const posAttr = geo.attributes.position;
  const colors: number[] = [];

  for (let i = 0; i < posAttr.count; i++) {
    const gx = i % gridSize;
    const gz = Math.floor(i / gridSize);
    const h = heights[gz]?.[gx] ?? 0;
    posAttr.setZ(i, h * 5);

    // Color gradient: low=cool blue → high=hot red
    const t = h;
    const r = t;
    const g = Math.max(0, 1 - Math.abs(t - 0.5) * 2);
    const b = 1 - t;
    colors.push(r, g, b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.4,
    metalness: 0.3,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add point markers at peaks for interaction
  data.slice(0, gridSize * gridSize).forEach((d, i) => {
    const gx = i % gridSize;
    const gz = Math.floor(i / gridSize);
    const h = (d.value / maxValue) * 5;
    const x = (gx / (gridSize - 1)) * spread - spread / 2;
    const z2 = (gz / (gridSize - 1)) * spread - spread / 2;
    if (h > maxValue * 0.3 / maxValue * 5) {
      const dotGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      const dotMesh = new THREE.Mesh(dotGeo, makeMaterial(color, 0.5));
      dotMesh.position.set(x, h, z2);
      group.add(dotMesh);
      meshes.push({ mesh: dotMesh, data: d });
    }
  });

  // Axis labels for corners
  group.add(createLabel('Low', -spread / 2, -0.5, -spread / 2));
  group.add(createLabel('High', spread / 2, -0.5, spread / 2));

  return { meshes };
}
