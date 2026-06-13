'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { ACTIVITIES, ACTIVITY_CATEGORIES, CORE_ACTIVITIES } = require('../src/data');
const { evaluatePair } = require('../src/filters');
const { buildCompatibilityGraph, formQuads } = require('../src/match');
const { clampUsers, simulate } = require('../server');

function user(id, overrides = {}) {
  return {
    id,
    name: `User ${id.slice(1)}`,
    age: 30,
    location: { lat: 40.7128, lng: -74.0060 },
    filters: [
      { kind: 'activity', value: 'running' },
      { kind: 'activity', value: 'coffee' },
      { kind: 'schedule', value: 'either' },
    ],
    availability: [
      {
        date: '2024-01-15',
        block: 'morning',
        start: '2024-01-15T09:00:00Z',
        end: '2024-01-15T12:00:00Z',
      },
    ],
    pastQuadmates: [],
    quadCount: 0,
    ...overrides,
  };
}

test('pair evaluation rejects users with no shared activity', () => {
  const a = user('u1');
  const b = user('u2', {
    filters: [
      { kind: 'activity', value: 'book club' },
      { kind: 'schedule', value: 'either' },
    ],
  });

  assert.equal(evaluatePair(a, b).compatible, false);
  assert.equal(evaluatePair(a, b).reason, 'no_shared_activity');
});

test('quad formation returns one complete compatible group of four', () => {
  const users = [user('u1'), user('u2'), user('u3'), user('u4')];
  const { graph, edgeMap } = buildCompatibilityGraph(users);
  const quads = formQuads(users, graph, edgeMap);

  assert.equal(edgeMap.size, 6);
  assert.equal(quads.length, 1);
  assert.equal(quads[0].members.length, 4);
  assert.equal(quads[0].activity, 'running');
  assert.equal(quads[0].timeWindow.block, 'morning');
});

test('server clamps simulation user counts', () => {
  assert.equal(clampUsers('4'), 10);
  assert.equal(clampUsers('260'), 200);
  assert.equal(clampUsers('nope'), 60);
});

test('synthetic activity pool covers broad real-world categories', () => {
  assert.ok(ACTIVITIES.length >= 60);
  assert.deepEqual(Object.keys(ACTIVITY_CATEGORIES), [
    'Sports & Fitness',
    'Food & Drink',
    'Arts & Culture',
    'Gaming & Social',
    'Watch Parties',
    'Outdoors',
    'Creative',
    'Lifestyle',
  ]);
  for (const activity of ['basketball', 'wine tasting', 'concert', 'video games', 'camping', 'hackathon']) {
    assert.ok(ACTIVITIES.includes(activity), `missing ${activity}`);
  }
  for (const activity of ['running', 'brunch', 'coffee', 'hiking']) {
    assert.ok(CORE_ACTIVITIES.includes(activity), `missing launch wedge ${activity}`);
  }
});

test('simulation payload contains coherent stats', () => {
  const payload = simulate(20);

  assert.equal(payload.stats.userCount, 20);
  assert.equal(payload.stats.totalPairs, 190);
  assert.equal(payload.stats.matched + payload.stats.unmatched, 20);
  assert.ok(Array.isArray(payload.quads));
});
