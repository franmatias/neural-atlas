<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { usePreferencesStore } from '@/stores/preferences';
import type { LandscapeResult } from '@/application/training/landscape';
const props = defineProps<{ result: LandscapeResult; index: number }>();
const emit = defineEmits<{ unavailable: [] }>();
const prefs = usePreferencesStore(),
  host = ref<HTMLElement>(),
  failed = ref(false),
  stats = ref('');
const labels = ref<{ text: string; x: number; y: number }[]>([]);
let renderer: THREE.WebGLRenderer | undefined,
  controls: OrbitControls | undefined,
  observer: InstanceType<typeof globalThis.ResizeObserver> | undefined;
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100),
  meshGroup = new THREE.Group(),
  paths = new THREE.Group();
scene.add(meshGroup, paths);
const colors = ['#007969', '#b23d08', '#375ac9', '#9b3c92'];
function disposeGroup(group: THREE.Group) {
  for (const o of [...group.children]) {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      o.geometry.dispose();
      const m = o.material;
      (Array.isArray(m) ? m : [m]).forEach((v) => v.dispose());
    }
    group.remove(o);
  }
}
function draw() {
  if (renderer && !failed.value) {
    renderer.render(scene, camera);
    labels.value = [
      ['x', new THREE.Vector3(2.2, 0, 2)],
      ['y', new THREE.Vector3(-2, 0, -2.2)],
      ['Pérdida', new THREE.Vector3(-2, 3.2, 2)],
    ].map(([text, point]) => {
      const p = (point as THREE.Vector3).project(camera);
      return {
        text: text as string,
        x: ((p.x + 1) / 2) * (host.value?.clientWidth ?? 0),
        y: ((1 - p.y) / 2) * 420,
      };
    });
    stats.value = `${renderer.info.render.triangles} triángulos · ${renderer.info.memory.geometries} geometrías`;
  }
}
function position(x: number, y: number, loss: number) {
  const g = props.result.grid;
  return new THREE.Vector3(
    ((x - g.bounds[0]) / (g.bounds[1] - g.bounds[0])) * 4 - 2,
    ((loss - g.min) / (g.max - g.min || 1)) * 3,
    -(((y - g.bounds[2]) / (g.bounds[3] - g.bounds[2])) * 4 - 2),
  );
}
function updatePaths() {
  renderer?.domElement.setAttribute('data-step', String(props.index));
  disposeGroup(paths);
  props.result.paths.forEach((p, i) => {
    const points = p.points.slice(0, props.index + 1).map((v) => position(v.x, v.y, v.loss));
    if (!points.length) return;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: colors[i], depthTest: false }),
    );
    line.renderOrder = 2;
    paths.add(line);
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      new THREE.MeshBasicMaterial({ color: colors[i], depthTest: false }),
    );
    dot.renderOrder = 3;
    dot.position.copy(points.at(-1)!);
    paths.add(dot);
  });
  draw();
}
function build() {
  disposeGroup(meshGroup);
  const g = props.result.grid,
    n = g.resolution,
    positions: number[] = [],
    color: number[] = [],
    indices: number[] = [];
  g.values.forEach((loss, i) => {
    const x = g.bounds[0] + ((i % n) / (n - 1)) * (g.bounds[1] - g.bounds[0]),
      y = g.bounds[2] + (Math.floor(i / n) / (n - 1)) * (g.bounds[3] - g.bounds[2]);
    positions.push(...position(x, y, loss).toArray());
    const c = new THREE.Color().setHSL(
      0.5 - (0.45 * (loss - g.min)) / (g.max - g.min || 1),
      0.58,
      0.35,
    );
    color.push(c.r, c.g, c.b);
  });
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      indices.push(a, a + 1, a + n, a + 1, a + n + 1, a + n);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  meshGroup.add(
    new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    ),
  );
  const ink = prefs.resolvedTheme === 'dark' ? '#d4e5e2' : '#243e43';
  meshGroup.add(
    new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.25 }),
    ),
  );
  for (const endpoint of [
    new THREE.Vector3(2.1, 0, 2),
    new THREE.Vector3(-2, 0, -2.1),
    new THREE.Vector3(-2, 3.1, 2),
  ])
    meshGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2, 0, 2), endpoint]),
        new THREE.LineBasicMaterial({ color: ink }),
      ),
    );
  updatePaths();
}
function reset() {
  camera.position.set(6, 5, 7);
  controls?.target.set(0, 1, 0);
  controls?.update();
  draw();
}
function rotate(direction: number) {
  camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * 0.2);
  controls?.update();
  draw();
}
function zoom(factor: number) {
  camera.position
    .sub(new THREE.Vector3(0, 1, 0))
    .multiplyScalar(factor)
    .add(new THREE.Vector3(0, 1, 0));
  controls?.update();
  draw();
}
function fail() {
  failed.value = true;
  emit('unavailable');
}
const lost = (event: Event) => {
  event.preventDefault();
  fail();
};
onMounted(() => {
  try {
    const canvas = document.createElement('canvas'),
      context = canvas.getContext('webgl2', { antialias: true });
    if (!context) {
      fail();
      return;
    }
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
    renderer.setClearColor(prefs.resolvedTheme === 'dark' ? '#101820' : '#f6f5f0');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.setAttribute(
      'aria-label',
      'Malla 3D de pérdida; controles de cámara debajo',
    );
    renderer.domElement.setAttribute('role', 'img');
    host.value!.appendChild(renderer.domElement);
    canvas.addEventListener('webglcontextlost', lost);
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = false;
    controls.autoRotate = false;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.addEventListener('change', draw);
    observer = new globalThis.ResizeObserver(() => {
      if (!host.value || !renderer) return;
      const w = host.value.clientWidth;
      renderer.setSize(w, 420);
      camera.aspect = w / 420;
      camera.updateProjectionMatrix();
      draw();
    });
    observer.observe(host.value!);
    reset();
    build();
  } catch {
    fail();
  }
});
watch(
  () => props.result,
  () => {
    if (renderer) build();
  },
);
watch(
  () => props.index,
  () => {
    if (renderer) updatePaths();
  },
);
watch(
  () => prefs.resolvedTheme,
  () => {
    if (renderer) {
      renderer.setClearColor(prefs.resolvedTheme === 'dark' ? '#101820' : '#f6f5f0');
      build();
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  observer?.disconnect();
  controls?.removeEventListener('change', draw);
  controls?.dispose();
  disposeGroup(meshGroup);
  disposeGroup(paths);
  if (renderer) {
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    renderer.dispose();
    renderer.domElement.remove();
  }
});
</script>
<template>
  <div class="surface-3d">
    <p v-if="failed" role="status">
      Vista 3D no disponible. Usa los contornos 2D y la tabla: contienen los mismos datos.
    </p>
    <template v-else>
      <div ref="host" class="gpu-surface">
        <span
          v-for="label in labels"
          :key="label.text"
          class="axis-label"
          :style="{ left: `${label.x}px`, top: `${label.y}px` }"
          aria-hidden="true"
          >{{ label.text }}</span
        >
      </div>
      <div class="actions">
        <button class="button secondary" @click="rotate(-1)">Girar izquierda</button
        ><button class="button secondary" @click="rotate(1)">Girar derecha</button
        ><button class="button secondary" @click="zoom(0.9)">Acercar</button
        ><button class="button secondary" @click="zoom(1.1)">Alejar</button
        ><button class="button secondary" @click="reset">Reiniciar cámara</button>
      </div>
      <p>
        Altura lineal normalizada: pérdida {{ result.grid.min.toPrecision(4) }} →
        {{ result.grid.max.toPrecision(4) }}. Suelo: x e y; altura: pérdida. Órbita arrastrando;
        zoom con rueda. {{ stats }}. Render bajo demanda, sin autorrotación.
      </p>
    </template>
  </div>
</template>
<style scoped>
.gpu-surface {
  position: relative;
  height: 420px;
  max-width: 100%;
  overflow: hidden;
}
.axis-label {
  position: absolute;
  transform: translate(-50%, -50%);
  font-weight: 700;
  color: var(--ink);
  padding: 0.15rem 0.3rem;
  background: var(--surface);
  pointer-events: none;
  border-radius: 0.2rem;
  font-size: 0.8rem;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
p {
  font-size: 0.85rem;
  color: var(--muted);
}
</style>
