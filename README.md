# QUAD

QUAD is a calendar-first, IRL friendship prototype. It forms small groups of four people around shared activities, compatible schedules, and basic trust constraints, then gives them just enough product surface to confirm, coordinate, show up, and check in.

This repo contains both:

- A dependency-free matching simulator in `src/`
- A local browser app in `public/` served by `server.js`

## Product Idea

Most social apps optimize for time in-app. QUAD is designed around the opposite: fewer screens, real plans, and stronger commitment.

Core principles:

- The calendar is the product.
- Groups are small by default: four people.
- Chat is only for logistics.
- A refundable deposit creates commitment.
- Check-in proves attendance and returns the deposit.
- The app should create in-person repetition, not endless browsing.

## Current Prototype

The current local app includes:

- Mobile and desktop routes
- Dark and light themes
- Home screen with the next confirmed quad
- Open quads for the week
- Activity preferences and settings
- Neighborhood feed for bounded invites, recaps, and tips
- Quad detail screen with members, logistics chat, deposit status, and check-in
- Notification badge and notification panel
- Algorithm lab for running the matching simulator from the UI
- Synthetic activity pool with broad categories and launch-wedge weighting

This is still a prototype. Identity verification, payments, real calendar integration, real chat, push notifications, and persistence are mocked or simulated.

## Requirements

- Node.js 18 or newer
- npm

There are no runtime package dependencies right now.

## Run Locally

```bash
npm start
```

The server starts on `127.0.0.1:3000` by default. If that port is already in use, it automatically tries the next port.

Open:

```text
http://127.0.0.1:3000/mobile
http://127.0.0.1:3000/desktop
```

If the server prints a different port, use that port instead.

Examples:

```text
http://127.0.0.1:3001/mobile
http://127.0.0.1:3001/desktop
```

The root route also works:

```text
http://127.0.0.1:3000
```

## Scripts

```bash
npm start
```

Runs the local HTTP server.

```bash
npm test
```

Runs the Node test suite.

```bash
npm run simulate
```

Runs the matching simulator in the terminal and prints formed quads, scores, activity, schedule, and graph statistics.

## Project Structure

```text
.
|-- Architecture.md       # Technical architecture and phased build plan
|-- QUAD.md               # Original product/philosophy note
|-- package.json          # Project scripts
|-- public/
|   `-- index.html        # Local app UI, styles, and client behavior
|-- server.js             # Dependency-free local server and simulation API
|-- src/
|   |-- data.js           # Synthetic users, activities, schedules
|   |-- filters.js        # Pair compatibility predicates
|   |-- match.js          # Compatibility graph and quad formation
|   `-- simulate.js       # CLI simulator
`-- test/
    `-- matching.test.js  # Unit tests for matching and simulation behavior
```

## Matching Model

The simulator does four main things:

1. Generates synthetic users with activities, schedules, location, and optional filters.
2. Evaluates pair compatibility with hard predicates.
3. Builds a compatibility graph.
4. Forms complete groups of four and scores them.

The activity pool is intentionally broad, but common launch activities are weighted more heavily so the system can still form quads with realistic early liquidity.

## API

The local server exposes one JSON endpoint:

```text
GET /api/simulate?users=100
```

The `users` value is clamped between 10 and 200.

## Verification

Current checks:

```bash
npm test
npm run simulate
```

The UI has also been manually smoke-tested locally across:

- Forced mobile route: `/mobile`
- Forced desktop route: `/desktop`
- Dark theme
- Light theme
- Narrow mobile viewport

## Current Limitations

This prototype does not yet include:

- Real authentication
- Database persistence
- Real calendar free/busy integration
- Stripe deposit holds/refunds
- Identity verification
- Real-time messaging
- Push notifications
- Production safety workflows
- App Store or native mobile packaging

Those are covered at a planning level in `Architecture.md`.

## License

Proprietary. Not for distribution.
