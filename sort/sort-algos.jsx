// sort-algos.jsx
// Deterministic value generation + sorting "timeline" builder.
// Each algorithm records a sequence of *poses*. A pose is a full snapshot:
//   { order:[ids by slot], comparing:[ids]|null, swapping:[ids]|null,
//     pivot:id|null, sorted:[ids], weight:Number }
// The renderer interpolates bar positions between consecutive poses.
// Exports to window: genValues, buildTimeline, ALGO_LABELS.

// ── seeded RNG ──────────────────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 13 distinct-ish random integers in [12, 99]
function genValues(seed, n) {
  const rnd = mulberry32((seed * 2654435761) >>> 0);
  const vals = [], used = new Set();
  let guard = 0;
  while (vals.length < n && guard++ < 2000) {
    const v = 12 + Math.floor(rnd() * 88);
    if (!used.has(v)) { used.add(v); vals.push(v); }
  }
  while (vals.length < n) vals.push(12 + Math.floor(rnd() * 88));
  return vals;
}

// ── pose recorder ─────────────────────────────────────────────────────────
function makeRecorder(values) {
  const order = values.map((_, i) => i);   // id === original index
  const steps = [];
  const sorted = new Set();
  const snap = (meta = {}) => {
    steps.push({
      order: order.slice(),
      comparing: meta.comparing ? meta.comparing.slice() : null,
      swapping: meta.swapping ? meta.swapping.slice() : null,
      pivot: meta.pivot != null ? meta.pivot : null,
      sorted: Array.from(sorted),
      weight: meta.weight != null ? meta.weight : 0.6,
    });
  };
  return { order, steps, sorted, snap, values };
}

// ── algorithms (record poses) ───────────────────────────────────────────────
function bubble(rec) {
  const { order, snap, values, sorted } = rec;
  const n = values.length;
  snap({ weight: 1.7 });
  for (let pass = 0; pass < n - 1; pass++) {
    let swapped = false;
    for (let i = 0; i < n - 1 - pass; i++) {
      snap({ comparing: [order[i], order[i + 1]], weight: 0.5 });
      if (values[order[i]] > values[order[i + 1]]) {
        const a = order[i], b = order[i + 1];
        [order[i], order[i + 1]] = [order[i + 1], order[i]];
        snap({ swapping: [a, b], weight: 0.8 });
        swapped = true;
      }
    }
    sorted.add(order[n - 1 - pass]);
    snap({ weight: 0.35 });
    if (!swapped) { for (let k = 0; k < n - pass; k++) sorted.add(order[k]); break; }
  }
}

function selection(rec) {
  const { order, snap, values, sorted } = rec;
  const n = values.length;
  snap({ weight: 1.7 });
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    snap({ comparing: [order[minIdx]], weight: 0.3 });
    for (let j = i + 1; j < n; j++) {
      snap({ comparing: [order[minIdx], order[j]], weight: 0.26 });
      if (values[order[j]] < values[order[minIdx]]) minIdx = j;
    }
    if (minIdx !== i) {
      const a = order[i], b = order[minIdx];
      [order[i], order[minIdx]] = [order[minIdx], order[i]];
      snap({ swapping: [a, b], weight: 1.0 });
    } else {
      snap({ weight: 0.4 });
    }
    sorted.add(order[i]);
    snap({ weight: 0.28 });
  }
  sorted.add(order[n - 1]);
}

function insertion(rec) {
  const { order, snap, values, sorted } = rec;
  const n = values.length;
  snap({ weight: 1.7 });
  sorted.add(order[0]);
  for (let i = 1; i < n; i++) {
    let j = i;
    snap({ comparing: [order[j]], weight: 0.34 });
    while (j > 0 && values[order[j - 1]] > values[order[j]]) {
      snap({ comparing: [order[j - 1], order[j]], weight: 0.34 });
      const a = order[j - 1], b = order[j];
      [order[j - 1], order[j]] = [order[j], order[j - 1]];
      snap({ swapping: [a, b], weight: 0.62 });
      j--;
    }
    for (let k = 0; k <= i; k++) sorted.add(order[k]);
    snap({ weight: 0.26 });
  }
}

function quick(rec) {
  const { order, snap, values, sorted } = rec;
  const n = values.length;
  snap({ weight: 1.7 });
  function qs(lo, hi) {
    if (lo > hi) return;
    if (lo === hi) { sorted.add(order[lo]); snap({ weight: 0.2 }); return; }
    const pivotId = order[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      snap({ comparing: [order[j]], pivot: pivotId, weight: 0.36 });
      if (values[order[j]] < values[pivotId]) {
        if (i !== j) {
          const a = order[i], b = order[j];
          [order[i], order[j]] = [order[j], order[i]];
          snap({ swapping: [a, b], pivot: pivotId, weight: 0.6 });
        }
        i++;
      }
    }
    if (i !== hi) {
      const a = order[i], b = order[hi];
      [order[i], order[hi]] = [order[hi], order[i]];
      snap({ swapping: [a, b], pivot: pivotId, weight: 0.75 });
    }
    sorted.add(order[i]);
    snap({ weight: 0.3 });
    qs(lo, i - 1);
    qs(i + 1, hi);
  }
  qs(0, n - 1);
}

const ALGOS = { bubble, selection, insertion, quick };
const ALGO_LABELS = { bubble: 'BUBBLE SORT', selection: 'SELECTION SORT', insertion: 'INSERTION SORT', quick: 'QUICK SORT' };

// ── build full timeline for an algorithm ────────────────────────────────────
function buildTimeline(values, algoKey) {
  const rec = makeRecorder(values);
  (ALGOS[algoKey] || ALGOS.bubble)(rec);
  const n = values.length;
  for (let i = 0; i < n; i++) rec.sorted.add(rec.order[i]);
  rec.snap({ weight: 2.8, finale: true });   // settle + finale wave window

  const poses = rec.steps;
  const T = []; let c = 0;
  for (let i = 0; i < poses.length; i++) { c += poses[i].weight; T.push(c); }

  let sortedWeight = T[T.length - 1];
  for (let i = 0; i < poses.length; i++) {
    if (poses[i].sorted.length === n) { sortedWeight = T[i]; break; }
  }
  return { poses, T, totalWeight: c, sortedWeight, n, values };
}

Object.assign(window, { genValues, buildTimeline, ALGO_LABELS });
