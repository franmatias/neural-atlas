import { describe, expect, it } from 'vitest';
import { workshops } from '@/content/workshops';
import { runWorkshop } from '@/application/workshops/experiments';
import {
  defaultWorkshopOptions,
  definitionHash,
  evaluateRule,
  importWorkshop,
  exportWorkshop,
  ruleSchema,
  type WorkshopEvidence,
} from '@/application/workshops/contracts';
import { newProgress, validateProgress } from '@/application/workshops/progress';
import { executeDataJob } from '@/application/data/jobs';
import { WorkshopLibrary } from '@/infrastructure/storage/workshop-library';
import { libraryPort } from '../fixtures/library-port';
import {
  readWorkshopDrafts,
  writeWorkshopDraft,
  progressKey,
} from '@/infrastructure/persistence/workshop-progress';
describe('Talleres POE: motor, reglas y persistencia', () => {
  it.each(workshops)(
    '$id registra evidencia reproducible, reglas y un recorrido completo',
    (definition) => {
      const options = { ...defaultWorkshopOptions, budgetAccepted: true };
      const evidence = runWorkshop(definition.caseId, options);
      expect(definition.steps[2]!.rules.every((rule) => evaluateRule(rule, '', evidence))).toBe(
        true,
      );
      expect(
        executeDataJob({ kind: 'workshop', payload: { caseId: definition.caseId, options } }),
      ).toMatchObject({ caseId: definition.caseId, metrics: evidence.metrics });
      const progress = newProgress(definition, options);
      progress.step = 5;
      progress.evidence = evidence;
      for (const step of definition.steps)
        progress.answers[step.id] =
          'Mi hipótesis se contrasta con estas medidas y reconozco sus límites.';
      expect(validateProgress(definition, progress).step).toBe(5);
      if (definition.caseId === 'T02')
        expect(evidence.metrics.distance).toBeCloseTo(0.6 / Math.hypot(1, 0.5), 12);
      if (definition.caseId === 'T03')
        expect(evidence.metrics).toMatchObject({ linearExample: 3, mlpCorrect: 4 });
      if (definition.caseId === 'T04')
        expect(evidence.metrics.gradientError as number).toBeLessThan(1e-5);
      if (definition.caseId === 'T05')
        expect(evidence.curves.map((run) => run.history.length)).toEqual([13, 13, 13, 13, 13, 13]);
    },
  );
  it('rechaza presupuestos, opciones y reglas inválidas; evalúa operadores cerrados sin ejecutar texto', () => {
    expect(() => runWorkshop('T05', defaultWorkshopOptions)).toThrow('WORKSHOP_BUDGET');
    expect(() =>
      runWorkshop('invalid' as WorkshopEvidence['caseId'], defaultWorkshopOptions),
    ).toThrow('WORKSHOP_CASE');
    expect(() => runWorkshop('T01', { ...defaultWorkshopOptions, seed: -1 })).toThrow();
    expect(() => ruleSchema.parse({ operator: 'eval', code: 'alert(1)' })).toThrow();
    expect(() =>
      ruleSchema.parse({ operator: 'equals', metric: '__proto__', value: true }),
    ).toThrow();
    expect(evaluateRule({ operator: 'range', metric: 'distance', min: 0, max: 1 }, '')).toBe(false);
    expect(evaluateRule({ operator: 'finite', metrics: ['lossBefore'] }, '')).toBe(false);
    expect(
      evaluateRule({ operator: 'changed', before: 'biasBefore', after: 'biasAfter' }, ''),
    ).toBe(false);
    expect(evaluateRule({ operator: 'compareRuns', minimum: 6 }, '')).toBe(false);
    expect(evaluateRule({ operator: 'splitDisjoint' }, '')).toBe(false);
    expect(
      evaluateRule(
        { operator: 'compareObservation', minLength: 20 },
        'Respuesta larga sin ninguna evidencia.',
      ),
    ).toBe(false);
    const zeroBias = runWorkshop('T02', { ...defaultWorkshopOptions, bias: 0 });
    expect(workshops[1]!.steps[2]!.rules.every((rule) => evaluateRule(rule, '', zeroBias))).toBe(
      false,
    );
  });
  it('comparte actividad sin soluciones, preserva versión y rechaza archivos/estructura excesivos', () => {
    const def = workshops[1]!;
    const student = importWorkshop(exportWorkshop(def, false));
    expect(student.steps.every((step) => step.solution === undefined)).toBe(true);
    expect(definitionHash(student)).toBe(definitionHash(def));
    expect(importWorkshop(exportWorkshop(def, true)).steps[4]!.solution).toBeDefined();
    expect(() => importWorkshop('{"__proto__":{}}')).toThrow();
    expect(() => importWorkshop('invalid')).toThrow();
    expect(() => importWorkshop(' '.repeat(1024 * 1024 + 1))).toThrow('WORKSHOP_SIZE');
    const wrong = JSON.parse(exportWorkshop(def, false)) as { steps: { type: string }[] };
    wrong.steps.reverse();
    expect(() => importWorkshop(JSON.stringify(wrong))).toThrow();
  });
  it('valida procedencia, opciones y pasos antes de restaurar evidencias', () => {
    const def = workshops[0]!,
      original = newProgress(def, defaultWorkshopOptions);
    const wrong = structuredClone(original);
    wrong.definitionHash = '0'.repeat(64);
    expect(() => validateProgress(def, wrong)).toThrow('WORKSHOP_VERSION');
    wrong.definitionHash = original.definitionHash;
    wrong.step = 3;
    expect(() => validateProgress(def, wrong)).toThrow('WORKSHOP_EVIDENCE');
    wrong.step = 1;
    expect(() => validateProgress(def, wrong)).toThrow('WORKSHOP_PROGRESS');
    wrong.step = 0;
    wrong.evidence = runWorkshop('T02', defaultWorkshopOptions);
    expect(() => validateProgress(def, wrong)).toThrow('WORKSHOP_EVIDENCE');
    wrong.evidence = runWorkshop('T01', defaultWorkshopOptions);
    wrong.options.seed = 123;
    expect(() => validateProgress(def, wrong)).toThrow('WORKSHOP_CONFIG');
  });
  it('guarda atómicamente cuadernos, detecta revisión obsoleta/cuota y no elimina evidencias', async () => {
    const port = libraryPort(),
      library = new WorkshopLibrary(() => port.factory);
    const definition = workshops[0]!,
      progress = newProgress(definition, defaultWorkshopOptions);
    expect(await library.list()).toEqual([]);
    const first = await library.save(definition, progress, 0);
    expect((await library.list())[0]!.revision).toBe(1);
    await expect(library.save(definition, progress, 0)).rejects.toMatchObject({ code: 'CONFLICT' });
    port.failWrite(new DOMException('full', 'QuotaExceededError'));
    await expect(library.save(definition, progress, 1)).rejects.toMatchObject({ code: 'QUOTA' });
    expect((await library.list())[0]!.integrity).toBe(first.integrity);
    expect((await library.save(definition, progress, 1)).revision).toBe(2);
    await expect(library.remove(first.id, 1)).rejects.toMatchObject({ code: 'CONFLICT' });
    const stored = port.tables.learningEvidence!.get(first.id) as { progress: { step: number } };
    stored.progress.step = 5;
    await expect(library.list()).rejects.toMatchObject({ code: 'CORRUPT' });
    await library.remove(first.id, 2);
    expect(await library.list()).toEqual([]);
  });
  it('LocalStorage solo guarda borradores y referencias con presupuesto y degradación independiente', () => {
    const progress = newProgress(workshops[0]!, defaultWorkshopOptions);
    progress.answers.hipotesis = 'Texto que debo conservar antes de ejecutar.';
    expect(writeWorkshopDraft(progress)).toBe(true);
    expect(readWorkshopDrafts()[0]!.answers.hipotesis).toContain('conservar');
    expect(localStorage.getItem(progressKey)).not.toContain('model');
    const deny = {
      getItem: () => {
        throw new Error('Denied');
      },
      setItem: () => {
        throw new Error('Denied');
      },
    };
    expect(readWorkshopDrafts(deny)).toEqual([]);
    expect(writeWorkshopDraft(progress, deny)).toBe(false);
    localStorage.setItem(progressKey, 'invalid');
    expect(readWorkshopDrafts()).toEqual([]);
    localStorage.setItem(progressKey, ' '.repeat(230000));
    expect(readWorkshopDrafts()).toEqual([]);
    progress.evidence = runWorkshop('T01', defaultWorkshopOptions);
    expect(writeWorkshopDraft(progress)).toBe(true);
    expect(readWorkshopDrafts()[0]!.evidenceRefs).toEqual([progress.evidence.id]);
    expect(readWorkshopDrafts()[0]).not.toHaveProperty('evidence');
  });
});
