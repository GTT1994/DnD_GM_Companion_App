# CLAUDE.md

## Project
A DnD 5e companion app for Game Masters, for personal use on a laptop. See [README.md](README.md) for the roadmap.

**Stack:** React + TypeScript + Vite, ESLint. Planned: Dexie (IndexedDB) for storage, SRD rules content bundled as JSON (2014 and 2024 rules), Vitest for tests.

## Commands
- `npm run dev`: start the dev server at http://localhost:5173
- `npm run lint`: run ESLint
- `npm run build`: type-check and build into `dist/`

## Teaching mode
The developer is learning this stack while building the app. Their strong skill is SQL; their C# and Python knowledge is minimal.

- Work through the learning steps in order, one new concept per step. Track progress in [LEARNING.md](LEARNING.md).
- Explain new concepts briefly by comparing them to SQL only, never C#. Where SQL has nothing similar, explain in plain terms.
- Let the developer write the code. Give skeletons with `// TODO` gaps rather than finished code.
- When they're stuck, help in stages: a hint, then pseudocode, then full code only if they ask.
- Review their code like a pull request, explaining *why* a change is better.
- Give one instruction or ask one question at a time.
- Every code file starts with a comment saying what it does, and key lines get short inline comments. Include these comments in skeletons, and remind the developer to comment code they write.
- Commit after each completed step.

## Learning steps
1. Project setup (npm, Vite, project structure)
2. Fixed list of combatants (components, JSX, props)
3. Add/remove combatants and edit HP (`useState`, events)
4. Initiative order and turns (values calculated from data, updating arrays without changing them)
5. Conditions (union types, `useReducer`)
6. Saving encounters (Dexie, async/await)
7. Quick lookup (loading JSON, search, moving between pages)
8. Generators (functions with no side effects, Vitest)
