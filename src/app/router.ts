import { createRouter, createWebHashHistory } from 'vue-router';

export const routes = [
  {
    path: '/lab/experimentos/importancia',
    name: 'permutation',
    component: () => import('@/features/experiments/PermutationPage.vue'),
  },
  {
    path: '/lab/experimentos/rejilla',
    name: 'grid-search',
    component: () => import('@/features/experiments/GridSearchPage.vue'),
  },
  {
    path: '/lab/experimentos/clasicos',
    name: 'classical',
    component: () => import('@/features/classical/ClassicalPage.vue'),
  },
  {
    path: '/sin-conexion',
    name: 'offline',
    component: () => import('@/features/offline/OfflinePage.vue'),
  },
  {
    path: '/docencia',
    name: 'teaching',
    component: () => import('@/features/teaching/TeachingPage.vue'),
  },
  {
    path: '/conceptos/paquetes',
    name: 'concept-packs',
    component: () => import('@/features/glossary/CatalogPage.vue'),
  },
  {
    path: '/conceptos/mapa',
    name: 'concept-map',
    component: () => import('@/features/glossary/ConceptMapPage.vue'),
  },
  {
    path: '/conceptos/:id',
    name: 'concept-detail',
    component: () => import('@/features/glossary/ConceptPage.vue'),
  },
  {
    path: '/repaso',
    name: 'review',
    component: () => import('@/features/glossary/ReviewPage.vue'),
  },
  { path: '/', name: 'home', component: () => import('@/features/home/HomePage.vue') },
  {
    path: '/laboratorios',
    name: 'laboratories',
    component: () => import('@/features/laboratories/LaboratoriesPage.vue'),
  },
  {
    path: '/lab/datos',
    name: 'datasets',
    component: () => import('@/features/datasets/DatasetsPage.vue'),
  },
  {
    path: '/lab/neurona',
    name: 'neuron',
    component: () => import('@/features/neuron/NeuronPage.vue'),
  },
  {
    path: '/lab/arquitectura/frontera',
    name: 'binary-visual',
    component: () => import('@/features/decision/BinaryDecisionPage.vue'),
  },
  {
    path: '/lab/clasificacion/visual',
    name: 'multiclass-visual',
    component: () => import('@/features/decision/MulticlassDecisionPage.vue'),
  },
  {
    path: '/lab/arquitectura',
    name: 'architecture',
    component: () => import('@/features/network/ArchitecturePage.vue'),
  },
  {
    path: '/lab/activaciones',
    name: 'activations',
    component: () => import('@/features/network/ActivationsPage.vue'),
  },
  {
    path: '/lab/propagacion',
    name: 'propagation',
    component: () => import('@/features/network/PropagationPage.vue'),
  },
  {
    path: '/lab/experimentos/robustez',
    name: 'robustness',
    component: () => import('@/features/experiments/RobustnessPage.vue'),
  },
  {
    path: '/lab/experimentos',
    name: 'experiments',
    component: () => import('@/features/experiments/ExperimentsPage.vue'),
  },
  {
    path: '/lab/generalizacion/capacidad',
    name: 'capacity',
    component: () => import('@/features/generalization/CapacityPage.vue'),
  },
  {
    path: '/lab/generalizacion',
    name: 'generalization',
    component: () => import('@/features/generalization/GeneralizationPage.vue'),
  },
  {
    path: '/lab/optimizacion',
    name: 'optimization',
    component: () => import('@/features/landscape/LandscapePage.vue'),
  },
  {
    path: '/lab/vision',
    name: 'vision',
    component: () => import('@/features/vision/VisionPage.vue'),
  },
  {
    path: '/lab/:slug',
    name: 'planned-lab',
    component: () => import('@/features/planned/PlannedPage.vue'),
  },
  {
    path: '/lab/entrenamiento',
    name: 'training',
    component: () => import('@/features/training/TrainingPage.vue'),
  },
  {
    path: '/lab/clasificacion/etica',
    name: 'group-ethics',
    component: () => import('@/features/ethics/EthicsPage.vue'),
  },
  {
    path: '/lab/clasificacion',
    name: 'classification',
    component: () => import('@/features/training/EvaluationPage.vue'),
    props: { mode: 'classification' },
  },
  {
    path: '/lab/regresion/funciones',
    name: 'function-approximation',
    component: () => import('@/features/functions/FunctionsPage.vue'),
  },
  {
    path: '/lab/regresion',
    name: 'regression',
    component: () => import('@/features/training/EvaluationPage.vue'),
    props: { mode: 'regression' },
  },
  {
    path: '/glosario',
    name: 'glossary',
    component: () => import('@/features/glossary/GlossaryPage.vue'),
  },
  {
    path: '/ajustes',
    name: 'settings',
    component: () => import('@/features/settings/SettingsPage.vue'),
  },
  {
    path: '/taller',
    name: 'workshops',
    component: () => import('@/features/workshops/WorkshopsPage.vue'),
  },
  {
    path: '/modelos',
    name: 'models',
    component: () => import('@/features/models/ModelsPage.vue'),
  },
  {
    path: '/biblioteca',
    name: 'library',
    component: () => import('@/features/library/LibraryPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/features/planned/NotFoundPage.vue'),
  },
];

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
