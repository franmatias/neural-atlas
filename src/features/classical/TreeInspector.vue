<script setup lang="ts">
import { computed } from 'vue';
import type { TreeNode } from '@/domain/classical/estimators';
const props = defineProps<{ root: TreeNode; features: string[]; highlight: number[] }>();
const rows = computed(() => {
  const all: TreeNode[] = [];
  function walk(n: TreeNode) {
    all.push(n);
    if (n.left) {
      walk(n.left);
      walk(n.right!);
    }
  }
  walk(props.root);
  return all;
});
const graph = computed(() => {
  const nodes: { id: number; x: number; y: number; parent: number | null }[] = [];
  function walk(n: TreeNode, lo: number, hi: number, parent: number | null) {
    nodes.push({ id: n.id, x: (lo + hi) / 2, y: 25 + n.depth * 60, parent });
    if (n.left) {
      walk(n.left, lo, (lo + hi) / 2, n.id);
      walk(n.right!, (lo + hi) / 2, hi, n.id);
    }
  }
  walk(props.root, 20, 880, null);
  return nodes;
});
</script>
<template>
  <div
    class="table-scroll"
    tabindex="0"
    role="region"
    aria-label="Estructura del árbol con desplazamiento"
  >
    <svg
      viewBox="0 0 900 295"
      role="img"
      aria-label="Árbol de decisiones y ruta de la sonda"
      style="min-width: 650px; width: 100%; height: auto"
    >
      <title>El nodo cero es la raíz. La tabla aporta reglas, soporte e impureza.</title>
      <g v-for="n in graph" :key="n.id">
        <line
          v-if="n.parent !== null"
          :x1="graph.find((p) => p.id === n.parent)?.x"
          :y1="graph.find((p) => p.id === n.parent)?.y"
          :x2="n.x"
          :y2="n.y"
          :stroke="highlight.includes(n.id) ? 'var(--accent)' : 'var(--muted)'"
          :stroke-width="highlight.includes(n.id) ? 3 : 1"
        />
        <circle
          :cx="n.x"
          :cy="n.y"
          r="15"
          :fill="highlight.includes(n.id) ? 'var(--wash)' : 'var(--surface)'"
          stroke="var(--accent)"
        />
        <text :x="n.x" :y="n.y + 4" text-anchor="middle" fill="var(--ink)" font-size="12">
          {{ n.id }}
        </text>
      </g>
    </svg>
    <table>
      <caption>
        Reglas del árbol · raíz en profundidad cero
      </caption>
      <thead>
        <tr>
          <th>Nodo</th>
          <th>Profundidad</th>
          <th>Filas</th>
          <th>Impureza</th>
          <th>Regla / hoja</th>
          <th>Salida</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="n in rows" :key="n.id" :class="{ selected: highlight.includes(n.id) }">
          <th scope="row">{{ n.id }}{{ highlight.includes(n.id) ? ' · sonda' : '' }}</th>
          <td>{{ n.depth }}</td>
          <td>{{ n.count }}</td>
          <td>{{ n.impurity.toFixed(5) }}</td>
          <td>
            {{
              n.feature === undefined
                ? 'Hoja'
                : `${features[n.feature]} ≤ ${n.threshold?.toFixed(5)}`
            }}
          </td>
          <td>{{ n.output.map((v) => v.toFixed(4)).join(' · ') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
.table-scroll {
  overflow: auto;
}
table {
  min-width: 650px;
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--line);
}
.selected {
  background: var(--wash);
}
</style>
