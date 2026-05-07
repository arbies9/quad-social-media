'use strict';

// Entry point — generates synthetic users, builds the compatibility graph,
// forms quads, and prints a ranked result list.
//
// Run:  npm run simulate
// Tune: edit src/data.js to narrow or widen filters and watch liquidity change.

const { generateUsers }                  = require('./data');
const { buildCompatibilityGraph, formQuads } = require('./match');

// ── formatting ────────────────────────────────────────────────────────────────

const LINE  = '─'.repeat(64);
const DLINE = '═'.repeat(64);
const pct   = n => `${(n * 100).toFixed(1)}%`;

function fmtWindow(w) {
  if (!w) return 'no shared window';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(`${w.date}T12:00:00Z`);
  return `${days[d.getUTCDay()]} ${w.date}  ${w.start.slice(11,16)}–${w.end.slice(11,16)} UTC  [${w.block}]`;
}

// ── simulation ────────────────────────────────────────────────────────────────

function run() {
  const USER_COUNT = 60;

  console.log(`\n${DLINE}`);
  console.log('  QUAD  ·  Phase 0 — Matching Algorithm Prototype');
  console.log(DLINE);

  // 1. Synthetic population
  const users = generateUsers(USER_COUNT);

  // 2. Build compatibility graph
  const { graph, edgeMap } = buildCompatibilityGraph(users);

  const edgeCount  = edgeMap.size;
  const totalPairs = (users.length * (users.length - 1)) / 2;
  const avgDeg     = ((edgeCount * 2) / users.length).toFixed(1);

  console.log(`\nGraph`);
  console.log(`  users            ${users.length}`);
  console.log(`  total pairs      ${totalPairs}`);
  console.log(`  compatible pairs ${edgeCount}  (${pct(edgeCount / totalPairs)} pass all hard filters)`);
  console.log(`  avg degree       ${avgDeg} compatible neighbors per user`);

  // 3. Form quads
  const quads    = formQuads(users, graph, edgeMap);
  const matched  = quads.length * 4;
  const leftover = users.length - matched;

  console.log(`\nResults`);
  console.log(`  quads formed     ${quads.length}`);
  console.log(`  users matched    ${matched} / ${users.length}`);
  console.log(`  unmatched        ${leftover}`);

  if (quads.length === 0) {
    console.log('\n  No quads formed — filters may be too narrow or the date range too short.');
    console.log('  Try widening activity overlap in src/data.js and re-running.');
    console.log(`\n${DLINE}\n`);
    return;
  }

  // 4. Print quads
  console.log(`\n\n${LINE}`);
  console.log('  FORMED QUADS  (ranked by final score, highest first)');
  console.log(LINE);

  quads.forEach((q, idx) => {
    const activity = (q.activity ?? 'TBD').toUpperCase();
    console.log(`\nQuad ${idx + 1}  ·  ${activity}`);
    console.log(`  Score    ${pct(q.finalScore)}  ` +
      `(raw compatibility ${pct(q.rawScore)} − diversity penalty ${pct(q.penalty)})`);
    console.log(`  When     ${fmtWindow(q.timeWindow)}`);
    console.log(`  Members`);

    for (const m of q.members) {
      const activities  = m.filters.filter(f => f.kind === 'activity').map(f => f.value).join(', ');
      const religion    = m.filters.find(f => f.kind === 'religion')?.value;
      const profession  = m.filters.find(f => f.kind === 'profession')?.value;
      const profile     = [religion, profession].filter(Boolean).join(' · ');
      const priorInQuad = m.pastQuadmates.filter(id => q.members.some(qm => qm.id === id && qm.id !== m.id)).length;
      const warn        = priorInQuad > 0 ? `  ⚠ met ${priorInQuad} member(s) before` : '';

      console.log(`    ${m.name} (${m.age})${warn}`);
      console.log(`      activities: ${activities}`);
      if (profile) console.log(`      profile:    ${profile}`);
    }
  });

  // 5. Liquidity summary
  const avgScore = quads.reduce((s, q) => s + q.finalScore, 0) / quads.length;
  const withPenalty = quads.filter(q => q.penalty > 0).length;

  console.log(`\n${LINE}`);
  console.log(`  avg quad score   ${pct(avgScore)}`);
  console.log(`  quads w/ penalty ${withPenalty} (members who'd already met)`);
  console.log(`\n  Liquidity demo — edit src/data.js:`);
  console.log(`    · Make everyone want "Christian software engineer, weekends only"`);
  console.log(`      and watch compatible pairs collapse toward zero.`);
  console.log(`    · Widen ACTIVITIES or increase USER_COUNT to restore matches.`);
  console.log(`${DLINE}\n`);
}

run();
