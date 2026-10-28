import {it,expect} from 'vitest';
import {coreRecords} from '@/content/core-records';
import {concepts,searchConcepts} from '@/content/concepts';
import {concepts as original} from '@/content/legacy-concepts';
import {conceptControls} from '@/content/concept-controls';
import {topologicalOrder} from '@/domain/content/concept';
it('152 fichas completas, 500 referencias conservadas y estados honestos',()=>{
  expect(coreRecords).toHaveLength(152);expect(concepts).toHaveLength(752);expect(new Set(concepts.map(c=>c.id)).size).toBe(752);expect(coreRecords.filter(c=>c.status==='implemented')).toHaveLength(152);expect(coreRecords.filter(c=>c.status==='specified').map(c=>c.id)).toEqual([]);expect(topologicalOrder(coreRecords.map(c=>({...c})))).toHaveLength(152);
  for(const c of original)expect(concepts.some(current=>current.id===c.id)).toBe(true);
  for(const id of ['C143','C144']){const c=coreRecords.find(c=>c.id===id)!;expect(c.definition.es).toContain('comparador');expect(c.definition.es).not.toMatch(/no está implementado|alcance opcional|no activa un comparador/);expect(c.relatedControls[0]?.controlId).toMatch(/^classical-/);}
  for(const c of coreRecords){expect(c.definition.es.split(/\s+/).length).toBeGreaterThanOrEqual(40);expect(c.definition.es.split(/\s+/).length).toBeLessThanOrEqual(80);for(const r of c.relatedControls)expect(conceptControls.some(a=>a.labId===r.labId&&a.controlId===r.controlId)).toBe(true);}
  expect(searchConcepts('C148')[0]!.id).toBe('C148');expect(searchConcepts('Probability calibration')[0]!.id).toBe('C120');expect(coreRecords.find(c=>c.id==='C021')!.numericExample.z).toBe(.44);
});
