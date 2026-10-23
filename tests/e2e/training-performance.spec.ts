import { test, expect } from '@playwright/test';
import { readdirSync, writeFileSync } from 'node:fs';
import { defaultSpec } from '../../src/domain/network/model';
import { defaultOptimizer } from '../../src/domain/training/optimizer';
import type { TrainingInput } from '../../src/domain/training/session';
test('P-Max: pausa y cancelación p95 ≤ 250 ms con 10.000 × 32 y seis capas de 64', async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  const asset = readdirSync('dist/assets').find((file) => /^training\.worker-.*\.js$/.test(file));
  expect(asset).toBeTruthy();
  const rows = Array.from({ length: 10000 }, (_, index) =>
    Array.from({ length: 32 }, (_, feature) => Math.sin(index * 0.01 + feature)),
  );
  const input: TrainingInput = {
    train: {
      ids: rows.slice(0, 8000).map((_, i) => `train-${i}`),
      x: rows.slice(0, 8000),
      y: rows.slice(0, 8000).map((_, i) => i % 10),
    },
    validation: {
      ids: rows.slice(8000).map((_, i) => `validation-${i}`),
      x: rows.slice(8000),
      y: rows.slice(8000).map((_, i) => i % 10),
    },
    config: {
      spec: {
        ...defaultSpec,
        inputs: 32,
        hidden: [64, 64, 64, 64, 64, 64],
        task: 'multiclass',
        classes: 10,
      },
      seed: 42,
      initialization: 'xavier',
      optimizer: { ...defaultOptimizer },
      epochs: 2,
      batchSize: 8000,
      loss: 'mse',
    },
    dataHash: 'a'.repeat(64),
    splitHash: 'b'.repeat(64),
    pipelineHash: 'c'.repeat(64),
    classOrder: Array.from({ length: 10 }, (_, i) => String(i)),
  };
  await page.goto('');
  const result = await page.evaluate(
    async ({ input, asset }) => {
      return await new Promise<{ latencies: number[]; p95: number; maxSliceMs: number }>(
        (resolve, reject) => {
          const worker = new Worker(new URL(`assets/${asset}`, location.href), { type: 'module' });
          let request = 0,
            started = 0,
            maxSliceMs = 0;
          const latencies: number[] = [];
          const send = (type: string, payload: unknown = {}) =>
            worker.postMessage({
              protocolVersion: 1,
              sessionId: 'benchmark',
              runId: 'pmax',
              revision: 1,
              requestId: ++request,
              type,
              payload,
            });
          const heartbeat = setInterval(() => send('PING'), 500);
          const run = () => {
            send('RUN', { pace: 0 });
            setTimeout(() => {
              started = performance.now();
              send(latencies.length % 2 === 0 ? 'PAUSE' : 'CANCEL');
            }, 35);
          };
          worker.onerror = (event) => {
            clearInterval(heartbeat);
            worker.terminate();
            reject(Error(event.message));
          };
          worker.onmessage = ({ data }) => {
            maxSliceMs = Math.max(maxSliceMs, data.maxSliceMs);
            if (data.type === 'RECOVERY_CHECKPOINT') send('RECOVERY_ACK', { update: data.update });
            if (data.type === 'READY') run();
            if (data.type === 'ERROR') {
              clearInterval(heartbeat);
              worker.terminate();
              reject(Error(data.code));
            }
            if (data.type === 'PAUSED' || data.type === 'CANCELLED') {
              latencies.push(performance.now() - started);
              if (latencies.length === 10) {
                clearInterval(heartbeat);
                worker.terminate();
                resolve({ latencies, p95: [...latencies].sort((a, b) => a - b)[9]!, maxSliceMs });
              } else setTimeout(run, 0);
            }
          };
          send('INIT', { input });
        },
      );
    },
    { input, asset },
  );
  writeFileSync(
    testInfo.outputPath('pmax-latency.json'),
    JSON.stringify({ project: testInfo.project.name, ...result }, null, 2),
  );
  await testInfo.attach('pmax-latency', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  });
  expect(result.latencies).toHaveLength(10);
  expect(result.p95).toBeLessThanOrEqual(250);
});
