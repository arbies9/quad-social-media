'use strict';

// Synthetic user generation for the QUAD Phase-0 matching prototype.
// Edit ACTIVITIES, RELIGIONS, PROFESSIONS, or the filter probability weights
// below to stress-test liquidity — narrow filters collapse match counts fast.

const ACTIVITIES = [
  'running', 'brunch', 'hiking', 'coffee', 'dinner',
  'pickleball', 'yoga', 'book club', 'trivia night', 'museum visit',
];

const RELIGIONS  = ['Christian', 'Jewish', 'Muslim', 'Hindu', 'Buddhist', 'Agnostic'];
const PROFESSIONS = ['tech', 'finance', 'medicine', 'law', 'creative', 'education', 'nonprofit'];
const SCHEDULES  = ['weekday', 'weekend', 'either'];

const BLOCKS = ['morning', 'afternoon', 'evening'];
const BLOCK_HOURS = {
  morning:   { start: '09', end: '12' },
  afternoon: { start: '12', end: '17' },
  evening:   { start: '17', end: '21' },
};

// Synthetic location — Brooklyn/LES, ~0.09 deg ≈ 8 km across
const BASE_LAT = 40.7128;
const BASE_LNG = -74.0060;

// ── helpers ──────────────────────────────────────────────────────────────────

function rand(arr)           { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max)   { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }
function sample(arr, n)      { return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length)); }

// ── availability ─────────────────────────────────────────────────────────────

// Returns a list of date+block time windows for the next 14 days.
// Each entry is { date, block, start (ISO), end (ISO) }.
function generateAvailability(schedulePreference) {
  const windows = [];
  const ORIGIN = new Date('2024-01-13T00:00:00Z'); // Saturday — gives a mix of both weekday and weekend days

  for (let d = 1; d <= 14; d++) {
    const date = new Date(ORIGIN);
    date.setUTCDate(ORIGIN.getUTCDate() + d);
    const dow = date.getUTCDay(); // 0=Sun 6=Sat
    const isWeekend = dow === 0 || dow === 6;

    if (schedulePreference === 'weekday' && isWeekend) continue;
    if (schedulePreference === 'weekend' && !isWeekend) continue;
    if (Math.random() < 0.55) continue; // ~45 % of eligible days are free

    const dateStr = date.toISOString().slice(0, 10);
    const dayBlocks = BLOCKS.filter(() => Math.random() < 0.45);
    if (dayBlocks.length === 0) dayBlocks.push(rand(BLOCKS)); // guarantee ≥ 1

    for (const block of dayBlocks) {
      const h = BLOCK_HOURS[block];
      windows.push({
        date: dateStr,
        block,
        start: `${dateStr}T${h.start}:00:00Z`,
        end:   `${dateStr}T${h.end}:00:00Z`,
      });
    }
  }

  return windows;
}

// ── names ────────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Harper', 'Skyler', 'Jamie', 'Blake', 'Drew', 'Reese', 'Cameron', 'Sam',
  'Charlie', 'Dakota', 'Elliot', 'Finley', 'Hayden', 'Jesse', 'Kerry', 'Lee',
  'Mika', 'Nico', 'Parker', 'River', 'Sage', 'Tatum', 'Adrian', 'Bailey',
  'Cody', 'Devon', 'Emmett', 'Frankie', 'Gray', 'Hunter', 'Ivy', 'Jaden',
  'Kendall', 'Logan', 'Marley', 'Noel', 'Oakley', 'Peyton', 'Reid', 'Sloane',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
  'Thompson', 'Martinez', 'Robinson', 'Clark', 'Lewis', 'Lee', 'Walker', 'Hall',
  'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott',
  'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez',
];

// ── main export ───────────────────────────────────────────────────────────────

function generateUsers(n = 60) {
  const users = [];

  for (let i = 0; i < n; i++) {
    const schedule = rand(SCHEDULES);
    const activities = sample(ACTIVITIES, randInt(2, 4));

    const filters = activities.map(a => ({ kind: 'activity', value: a }));
    filters.push({ kind: 'schedule', value: schedule });
    if (Math.random() < 0.55) filters.push({ kind: 'religion',   value: rand(RELIGIONS) });
    if (Math.random() < 0.55) filters.push({ kind: 'profession', value: rand(PROFESSIONS) });

    users.push({
      id:            `u${i + 1}`,
      name:          `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
      age:           randInt(24, 42),
      location: {
        lat: BASE_LAT + randFloat(-0.045, 0.045),
        lng: BASE_LNG + randFloat(-0.045, 0.045),
      },
      filters,
      availability:  generateAvailability(schedule),
      pastQuadmates: [],
      quadCount:     0,
    });
  }

  // Seed a handful of prior quad relationships (simulates users with history)
  for (let i = 0; i < 25; i++) {
    const a = randInt(0, n - 1);
    let b = randInt(0, n - 1);
    while (b === a) b = randInt(0, n - 1);
    if (!users[a].pastQuadmates.includes(users[b].id)) {
      users[a].pastQuadmates.push(users[b].id);
      users[b].pastQuadmates.push(users[a].id);
    }
  }

  return users;
}

module.exports = { generateUsers, ACTIVITIES, BLOCK_HOURS };
