# CLAUDE.md

## Project
A DnD 5e companion app for Game Masters, for personal use on a laptop. See [README.md](README.md) for the roadmap.

**Stack:** React + TypeScript + Vite, ESLint, Vitest. SRD rules content (2014 and 2024 editions) is bundled as JSON. App data is saved in the browser's localStorage.

## Commands
- `npm run dev`: start the dev server at http://localhost:5173
- `npm run lint`: run ESLint
- `npm test`: run the Vitest unit tests
- `npm run build`: type-check and build into `dist/`
- `npm run srd`: re-download and rebuild the SRD data in `src/data/srd/`

## Layout
- `src/components/`: React components (one per file)
- `src/lib/`: logic with no UI (dice, combat rules, storage hooks), with `*.test.ts` files next to it
- `src/data/`: SRD data loader, the generated JSON (`srd/<edition>/`), and hand-written tables (quick rules, NPC names)
- `scripts/build-srd.mjs`: downloads the SRD data from 5e-bits/5e-database and trims it to what the app uses

## Working with the developer
The developer's strong skill is SQL; their C# and Python knowledge is minimal.

- Build features directly; the developer no longer wants step-by-step walkthroughs.
- When explaining a concept, compare it to SQL only, never C#.
- Ask questions one at a time.
- Every code file starts with a comment saying what it does, and key lines get short inline comments.
