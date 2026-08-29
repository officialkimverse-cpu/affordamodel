function diffAssumptions(prev, next) {
  const changed = {};
  const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
  for (const key of keys) {
    if (prev?.[key] !== next?.[key]) changed[key] = next[key];
  }
  return changed;
}

function scenarioLabel(changes) {
  const keys = Object.keys(changes || {});
  if (!keys.length) return '';
  return keys.map(k => `${k}=${changes[k]}`).join(', ').slice(0, 80);
}

function submitFormScenario({ current, lastAssumptions }) {
  const changes = diffAssumptions(lastAssumptions, current);
  if (!Object.keys(changes).length) {
    return { ok: false, reason: 'no_changes' };
  }
  return {
    ok: true,
    snapshot: { ...current },
    label: scenarioLabel(changes),
    changes,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { diffAssumptions, scenarioLabel, submitFormScenario };
}
