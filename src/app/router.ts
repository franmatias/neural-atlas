import { createRouter, createWebHashHistory } from 'vue-router';

export const routes = [
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
    path: '/lab/clasificacion',
    name: 'classification',
    component: () => import('@/features/training/EvaluationPage.vue'),
    props: { mode: 'classification' },
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
