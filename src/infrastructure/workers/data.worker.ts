import { handleDataJob, type DataJob } from '@/application/data/jobs';
// Entry point only; the tested handler owns all dispatch and error handling.
self.onmessage = (event: MessageEvent<{ id: number; job: DataJob }>) => {
  self.postMessage(handleDataJob(event.data.id, event.data.job));
};
