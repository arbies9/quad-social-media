'use strict';

// Filter predicate evaluation — the binary, falsifiable core of QUAD matching.
// No vibes, no learned scores. Either a candidate passes the predicate or doesn't.

const EARTH_RADIUS_KM = 6371;
const MAX_DISTANCE_KM = 8;            // ~5 miles — one neighborhood
const DIVERSITY_PENALTY_PER_PAIR = 0.15; // applied per pair who've already met

// ── geo ───────────────────────────────────────────────────────────────────────

function toRad(deg) { return (deg * Math.PI) / 180; }

function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getValues(user, kind) {
  return user.filters.filter(f => f.kind === kind).map(f => f.value);
}

function sharedActivities(userA, userB) {
  const setA = new Set(getValues(userA, 'activity'));
  return getValues(userB, 'activity').filter(a => setA.has(a));
}

// True if any (date, block) slot appears in both users' availability lists
function hasTimeOverlap(userA, userB) {
  const keysA = new Set(userA.availability.map(w => `${w.date}:${w.block}`));
  return userB.availability.some(w => keysA.has(`${w.date}:${w.block}`));
}

// ── pairwise evaluation ───────────────────────────────────────────────────────

// Returns { compatible, score, shared, distKm } for a user pair.
// Hard gates: distance, shared activity, time overlap.
// Soft bonuses: schedule alignment, optional filter matches.
function evaluatePair(userA, userB) {
  const distKm = haversineKm(userA.location, userB.location);
  if (distKm > MAX_DISTANCE_KM)
    return { compatible: false, score: 0, reason: 'distance' };

  const shared = sharedActivities(userA, userB);
  if (shared.length === 0)
    return { compatible: false, score: 0, reason: 'no_shared_activity' };

  if (!hasTimeOverlap(userA, userB))
    return { compatible: false, score: 0, reason: 'no_time_overlap' };

  // Base score: activity Jaccard similarity
  const union = new Set([...getValues(userA, 'activity'), ...getValues(userB, 'activity')]);
  let score = shared.length / union.size;

  // Schedule alignment bonus
  const schA = getValues(userA, 'schedule')[0];
  const schB = getValues(userB, 'schedule')[0];
  if (schA === schB || schA === 'either' || schB === 'either') score += 0.1;

  // Optional filter bonuses (religion, profession)
  for (const kind of ['religion', 'profession']) {
    const vA = getValues(userA, kind)[0];
    const vB = getValues(userB, kind)[0];
    if (vA && vB && vA === vB) score += 0.05;
  }

  return { compatible: true, score: Math.min(1.0, score), shared, distKm };
}

// ── diversity ─────────────────────────────────────────────────────────────────

// Penalty for quads where members have already met: widens the social graph
// instead of recycling existing relationships.
function diversityPenalty(quad) {
  let priorPairs = 0;
  for (let i = 0; i < quad.length; i++) {
    for (let j = i + 1; j < quad.length; j++) {
      if (quad[i].pastQuadmates.includes(quad[j].id)) priorPairs++;
    }
  }
  return priorPairs * DIVERSITY_PENALTY_PER_PAIR;
}

module.exports = {
  evaluatePair,
  diversityPenalty,
  sharedActivities,
  haversineKm,
  MAX_DISTANCE_KM,
};
