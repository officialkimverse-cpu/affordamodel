const { test } = require('node:test');
const assert = require('node:assert/strict');
const { diffAssumptions, scenarioLabel, submitFormScenario } = require('../lib/scenario');

test('diffAssumptions lists only keys that changed', () => {
  const prev = { vacancy_rate: 5, tax_abatement: 0, units: 100 };
  const next = { vacancy_rate: 7, tax_abatement: 0, units: 100 };
  assert.deepEqual(diffAssumptions(prev, next), { vacancy_rate: 7 });
});

test('diffAssumptions returns empty object when nothing changed', () => {
  const snap = { vacancy_rate: 5, tax_abatement: 0 };
  assert.deepEqual(diffAssumptions(snap, { ...snap }), {});
});

test('scenarioLabel summarizes changed keys', () => {
  const label = scenarioLabel({ tax_abatement: 20, vacancy_rate: 7 });
  assert.match(label, /tax_abatement=20/);
  assert.match(label, /vacancy_rate=7/);
});

test('submitFormScenario refuses to add a point when inputs are unchanged', () => {
  const last = { vacancy_rate: 5, tax_abatement: 0 };
  const result = submitFormScenario({ current: { ...last }, lastAssumptions: last });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no_changes');
});

test('submitFormScenario records a new scenario when inputs changed', () => {
  const last = { vacancy_rate: 5, tax_abatement: 0 };
  const current = { vacancy_rate: 5, tax_abatement: 20 };
  const result = submitFormScenario({ current, lastAssumptions: last });
  assert.equal(result.ok, true);
  assert.deepEqual(result.snapshot, current);
  assert.match(result.label, /tax_abatement=20/);
});
