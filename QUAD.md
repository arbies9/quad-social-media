# QUAD

Structure for adult friendship.

This repository is the engineering starting point for QUAD — a calendar-driven, IRL-only friendship platform whose product, philosophy, and business model are described in detail in `docs/strategy-memo.docx`. Read the memo first; everything in this repo is downstream of it.

## What's in here

- `docs/strategy-memo.docx` — the full strategy memo. Single source of truth for product decisions.
- `ARCHITECTURE.md` — technical architecture, vendor stack, build phases, and scope estimates.
- `src/` — a working prototype of the matching engine. Generates synthetic users, evaluates filters, builds a compatibility graph, forms quads of four, scores them by compatibility and diversity, and prints results. Runs end-to-end with no external dependencies.
- `.vscode/` — recommended VS Code workspace settings.

## Quick start

```bash
npm install
npm run simulate
```

You should see a list of formed quads with members, activity, time window, and compatibility/diversity scores. Try editing `src/data.js` to make filters narrower (e.g., everyone wants "Christian software engineer, weekends only") and re-run — you'll watch liquidity collapse in real time. That's the most important tension in the product, and you can see it on day one.

## What this prototype proves

The simulator is intentionally minimal but covers the algorithmic core:

1. **Filter predicate evaluation** — binary, falsifiable filters. Either a candidate passes or doesn't. No vibes.
2. **Compatibility graph construction** — bipartite logic over filter pairs.
3. **Quad formation** — k-clique search of size 4 on the compatibility graph (greedy heuristic; production would use a more sophisticated solver).
4. **Diversity penalty** — quads composed of people who've already met before are scored lower, to expand the social graph rather than recycle it.
5. **Liquidity stress** — narrow filters reduce viable matches; you can see this on the live output.

What it does NOT yet have (intentionally, so you can build them):
- Real geospatial indexing (uses simple haversine; production would use H3 or PostGIS).
- Time-zone handling.
- Online (streaming) matching for events arriving in real time.
- Reputation state machine.
- Dead-chat detection.
- The deposit / payment flow.
- Calendar integration.
- The mobile / web client.

These are tracked in `ARCHITECTURE.md` with a phased build plan.

## Project structure

```
quad/
├── README.md             # This file
├── ARCHITECTURE.md       # Technical architecture and build phases
├── docs/
│   └── strategy-memo.docx
├── src/
│   ├── data.js           # Synthetic user generation
│   ├── filters.js        # Predicate evaluation
│   ├── match.js          # Compatibility graph + quad formation
│   └── simulate.js       # Entry point — runs the simulation
├── .vscode/
│   └── settings.json     # VS Code workspace config
├── package.json
└── .gitignore
```

## Philosophy reminders

When in doubt, these are the non-negotiables that constrain every technical choice (full reasoning in the memo):

1. **No AI in the conversation.** Algorithms run the calendar, never the social layer. No chatbot. No AI-written content. No learned compatibility scores that tell humans who's right for them.
2. **No chat as the product.** Chat exists only to execute plans. Direct messaging is unlocked through repeat exposure, not handed out by default.
3. **No doomscroll.** Time-in-app is a cost, not a metric. No infinite feed. No vanity counts. The home screen is your calendar.

If a feature you're considering violates one of these, default to *don't ship it*.

## License

Proprietary. Not for distribution.