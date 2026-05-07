'use strict';

// Compatibility graph construction and greedy quad formation.
//
// The graph is an undirected weighted graph: nodes are users, edges are
// mutually-compatible pairs (pass all hard filters in filters.js).
//
// Quad formation is a greedy k-clique search of size 4 on this graph.
// "Greedy" = anchor on the most-connected user, pick the highest-scoring
// triple of neighbors that are also mutually compatible, and additionally
// share a live time window. A production solver would use an integer program
// or branch-and-bound; this heuristic is good enough to validate the algorithm.

const { evaluatePair, diversityPenalty } = require('./filters');

// ── edge key ──────────────────────────────────────────────────────────────────

// Canonical edge key: lower numeric index first to avoid duplicates.
// User IDs are "u1", "u2", …, "u60" — parse the integer suffix.
function edgeKey(aId, bId) {
  const a = parseInt(aId.slice(1), 10);
  const b = parseInt(bId.slice(1), 10);
  return a < b ? `${aId}:${bId}` : `${bId}:${aId}`;
}

// ── graph construction ────────────────────────────────────────────────────────

function buildCompatibilityGraph(users) {
  const graph   = new Map(users.map(u => [u.id, []]));
  const edgeMap = new Map(); // edgeKey → { score, shared }

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const result = evaluatePair(users[i], users[j]);
      if (!result.compatible) continue;

      const key = edgeKey(users[i].id, users[j].id);
      edgeMap.set(key, { score: result.score, shared: result.shared });
      graph.get(users[i].id).push({ userId: users[j].id, score: result.score });
      graph.get(users[j].id).push({ userId: users[i].id, score: result.score });
    }
  }

  return { graph, edgeMap };
}

function compatible(edgeMap, aId, bId) { return edgeMap.has(edgeKey(aId, bId)); }
function pairScore(edgeMap, aId, bId)  { return edgeMap.get(edgeKey(aId, bId))?.score ?? 0; }

// ── quad scoring ──────────────────────────────────────────────────────────────

function scoreQuad(quad, edgeMap) {
  let total = 0, pairs = 0;
  for (let i = 0; i < quad.length; i++) {
    for (let j = i + 1; j < quad.length; j++) {
      total += pairScore(edgeMap, quad[i].id, quad[j].id);
      pairs++;
    }
  }
  const rawScore  = total / pairs;
  const penalty   = diversityPenalty(quad);
  const finalScore = Math.max(0, rawScore - penalty);
  return { rawScore, penalty, finalScore };
}

// ── time window selection ─────────────────────────────────────────────────────

const BLOCK_HOURS = { morning: ['09','12'], afternoon: ['12','17'], evening: ['17','21'] };

// Returns the first (date, block) slot where all four members are free,
// or null if no shared window exists.
function pickTimeWindow(quad) {
  const keySets = quad.map(u => new Set(u.availability.map(w => `${w.date}:${w.block}`)));

  for (const key of keySets[0]) {
    if (keySets.slice(1).every(s => s.has(key))) {
      const [date, block] = key.split(':');
      const [sh, eh] = BLOCK_HOURS[block];
      return { date, block, start: `${date}T${sh}:00:00Z`, end: `${date}T${eh}:00:00Z` };
    }
  }
  return null;
}

// ── activity selection ────────────────────────────────────────────────────────

// Pick the activity with the highest member count; ties broken by first found.
function pickActivity(quad) {
  const counts = new Map();
  for (const u of quad) {
    for (const f of u.filters) {
      if (f.kind === 'activity') counts.set(f.value, (counts.get(f.value) ?? 0) + 1);
    }
  }
  let best = null, bestCount = 0;
  for (const [activity, count] of counts) {
    if (count > bestCount) { best = activity; bestCount = count; }
  }
  return best;
}

// ── quad formation ────────────────────────────────────────────────────────────

function formQuads(users, graph, edgeMap) {
  const available = new Set(users.map(u => u.id));
  const byId      = new Map(users.map(u => [u.id, u]));
  const quads     = [];

  // Anchor on the most-connected users first to maximize coverage
  const sorted = [...users].sort(
    (a, b) => (graph.get(b.id)?.length ?? 0) - (graph.get(a.id)?.length ?? 0)
  );

  for (const anchor of sorted) {
    if (!available.has(anchor.id)) continue;

    // Snapshot available neighbors, sorted by pairwise score descending
    const neighbors = (graph.get(anchor.id) ?? [])
      .filter(e => available.has(e.userId))
      .sort((a, b) => b.score - a.score)
      .slice(0, 25); // cap search breadth for O(n) performance

    let bestQuad   = null;
    let bestScore  = -Infinity;

    // Find the highest-scoring triple that is:
    //   1. A mutual clique with the anchor (all 6 pairs are compatible)
    //   2. Has at least one shared 4-way time window
    for (let i = 0; i < neighbors.length; i++) {
      const n1 = neighbors[i];
      for (let j = i + 1; j < neighbors.length; j++) {
        const n2 = neighbors[j];
        if (!compatible(edgeMap, n1.userId, n2.userId)) continue;

        for (let k = j + 1; k < neighbors.length; k++) {
          const n3 = neighbors[k];
          if (!compatible(edgeMap, n1.userId, n3.userId)) continue;
          if (!compatible(edgeMap, n2.userId, n3.userId)) continue;

          const quad = [
            anchor,
            byId.get(n1.userId),
            byId.get(n2.userId),
            byId.get(n3.userId),
          ];

          const timeWindow = pickTimeWindow(quad);
          if (!timeWindow) continue; // no live window — skip this clique

          const { finalScore } = scoreQuad(quad, edgeMap);
          if (finalScore > bestScore) {
            bestScore = finalScore;
            bestQuad  = { quad, timeWindow };
          }
        }
      }
    }

    if (bestQuad) {
      const { quad, timeWindow } = bestQuad;
      quads.push({
        id:       `q${quads.length + 1}`,
        members:  quad,
        activity: pickActivity(quad),
        timeWindow,
        ...scoreQuad(quad, edgeMap),
      });
      for (const m of quad) available.delete(m.id);
    }
  }

  return quads.sort((a, b) => b.finalScore - a.finalScore);
}

module.exports = { buildCompatibilityGraph, formQuads, scoreQuad };
