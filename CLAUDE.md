# CLAUDE.md

## Project
A DnD 5e companion app for Game Masters, for personal use on a laptop. See [README.md](README.md) for the roadmap.

**Stack:** React + TypeScript + Vite, React Router, Dexie (IndexedDB), TipTap (formatted notes), ESLint, Vitest. SRD rules content (2014 and 2024 editions: monsters, spells, conditions, magic items, equipment, rules) is bundled as JSON. Campaign data lives in IndexedDB; small preferences (edition, last search) in localStorage.

## Commands
- `npm run dev`: start the dev server at http://localhost:5173
- `npm run lint`: run ESLint
- `npm test`: run the Vitest unit tests
- `npm run e2e`: browser tests (`e2e/flows/`) in headless Google Chrome via playwright-core; starts its own dev server. `npm run e2e -- homebrew` runs one flow, `SHOW=1` shows the browser. Screenshots go to `e2e/screenshots/`. Run after any UI change, and add or extend a flow for new features
- `npm run build`: type-check and build into `dist/`
- `npm run srd`: re-download and rebuild the SRD data in `src/data/srd/`

## Layout
- `src/App.tsx`: routes (page addresses) and the header/footer layout
- `src/pages/`: one component per page (Home, campaign Overview with the session plan and notes, Combat, Encounters, NPCs, Sessions, Lookup, Generators)
- `src/components/`: reusable React components (one per file)
- `src/db.ts`: the Dexie database schema (tables: campaigns, pcs, combats, npcs, notes, homebrewMonsters, homebrewSpells, encounters, sessions). Combat id = campaign id, or `'quick'` for Quick combat. Homebrew indexes start `hb-`
- `src/lib/store.ts`: all database writes go through here (PC HP carry-over, cascade delete, migration); `backup.ts` for export/import
- `src/lib/`: other logic with no UI (dice, combat rules, generators), with `*.test.ts` files next to it. Database tests use `fake-indexeddb`
- `src/data/`: SRD data loader (`useSrd` merges in homebrew monsters/spells for the edition), the generated JSON (`srd/<edition>/`), and hand-written tables (quick rules, NPC names)
- `src/lib/npcFields.ts`: NPC defaults (also used by the version 4 upgrade and old backups), generated → saved NPCs, search; `npcs.ts` for NPC writes, adding to combat and portrait resizing
- `src/lib/richText.ts`: formatted notes are stored as TipTap editor JSON (`RichDoc`); template, carry-over of unticked items, old plain text. `sessions.ts` for notes/plan saving and End session; `components/RichEditor.tsx` is the editor; `useAutosave.ts` the save-as-you-type hook
- `src/lib/useCombatHistory.ts`: Undo / Redo for the combat page (`applyCombatAction` returns the state before each change; `combatHistory.ts` names changes)
- `src/lib/resistances.ts`: reads stat block resistance text into rules, gathers a combatant's defences (stat block, PC sheet, "Resistant: Fire" conditions) and adjusts damage
- Generators: `components/generators/` (one component per tab); logic in `lib/generators.ts` (NPCs, names, loot), `lib/worldGenerators.ts` (rumours, hooks, taverns, shops), `lib/randomEncounter.ts`; tables in `data/npcTables.ts`, `data/generatorTables.ts`, `data/environments.ts` (hand-tagged monster environments); `lib/generatorNotes.ts` turns results into session plan / notes text
- Dice roller: `components/DiceTray.tsx` (the 🎲 tray around every page, D key); `lib/diceRoller.ts` reads and rolls what's typed and finds dice in text; `lib/remarkDice.ts` makes dice in `<Markdown rollLabel>` clickable through `lib/diceTray.ts` context
- `src/lib/lookupFilters.ts`: monster and spell list filters (Quick Lookup and the encounter builder's `MonsterPicker filters`); the bars are `components/FilterBars.tsx`
- `src/lib/lair.ts`: lairs in the fight (a combatant with `lair` set: no HP, `LairPanel` instead of `MonsterPanel`, excluded from targets via `creatures()`) and in-lair use counts; `mob.ts` for the DMG mob attack table (`components/MobAttack.tsx`)
- `src/lib/scaleMonster.ts`: Scale CR (the DMG stats-by-CR table; numbers move by the difference between rows, HP and damage by the ratio); `components/ScaleMonster.tsx` is the panel in Quick Lookup
- Combat tracker rows (`CombatantRow.tsx`) are a `<tbody class="combatant">` each, with two lines; e2e tests find rows with `tbody.combatant`. Pop-ups (`Popover.tsx`, used by `RowMenu` ⋯ and `ConditionPicker`) are fixed to the screen so the table's scroll box can't clip them
- `src/lib/minis.ts`: mini labels (which physical mini a monster is); use `displayName(c)` for a combatant's name in lists, notices and log lines. `components/MiniLabel.tsx` has the badge and the ✎ form
- `src/lib/conditions.ts`: condition timers (run by `combatReducer` on each turn change) and the duration form; `saves.ts` for save bonuses, rolls and damage after a save
- `src/lib/encounters.ts`: encounter difficulty (2014 thresholds/multipliers, 2024 budgets) and loading encounters into combat
- `src/lib/homebrew.ts`: homebrew conversions (base + per-level dice → SRD-style tables), SRD copies, checks before saving
- `scripts/build-srd.mjs`: downloads the SRD data from 5e-bits/5e-database and trims it to what the app uses. 2024 magic items that mention a table get Open5e's SRD 5.2 text (tables intact) or a hand fix from `scripts/fixes/2024-magic-items.json`; it warns about any it can't fix. `src/data/srd.test.ts` checks the result

## Working with the developer
The developer's strong skill is SQL; their C# and Python knowledge is minimal.

- Build features directly; the developer no longer wants step-by-step walkthroughs.
- When explaining a concept, compare it to SQL only, never C#.
- Ask questions one at a time.
- Every code file starts with a comment saying what it does, and key lines get short inline comments.
