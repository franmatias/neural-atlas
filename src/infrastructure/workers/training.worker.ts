/// <reference lib="webworker" />
import { TrainingRuntime } from '@/application/training/runtime';
const runtime = new TrainingRuntime({
  now: () => performance.now(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  send: (event) => self.postMessage(event),
});
self.onmessage = (event) => runtime.receive(event.data);
