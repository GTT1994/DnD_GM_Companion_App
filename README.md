# DnD GM Companion App

A companion app for Game Masters running Dungeons & Dragons 5e. It starts as a toolkit for running sessions at the table (combat tracker, quick lookup, random generators) and will grow into an all-in-one GM toolkit covering session prep, encounter building and a campaign wiki.

> **Status:** v0.1 (run the table) and campaigns are built.

## Features

**Home page and campaigns**
- Create campaigns, each with its own party, fight, NPCs, encounters, notes and session log
- **Quick combat** for one-off fights outside any campaign (remembered until you clear it)
- The campaign **Overview** is laid out for running a session:
  - Left: **This session**, a formatted plan (headings, bold, lists, tick-boxes) with a **Start from template** button (strong start, scenes, secrets & clues, NPCs, locations, encounters, treasure), and **Campaign notes** below it. Both save as you type
  - Right: party cards (HP bar, AC, passive Perception / Insight / Investigation, class, level and player) and **Planned encounters** with their difficulty and **Load into combat**
- **End session** saves the plan and a recap to the **Sessions** log (number, date, title), then starts the next plan with the unticked items carried over. Past sessions can be opened and edited
- PC HP carries over between fights until you heal them or take a **Long rest**
- **Add party** puts every PC into the campaign's fight at their current HP
- Export a campaign (or everything) to a backup file, and import it again, e.g. on another computer

**NPCs** (inside each campaign)
- Write your own NPCs or save generated ones: name, species (list or custom), gender, role, location, faction, attitude (Friendly / Indifferent / Hostile) and status (Alive / Dead / Missing / Unknown)
- Roleplay prompts (appearance, personality, voice, motivation, secret), a portrait image and Markdown notes, shown formatted beside the form; everything saves as you type
- Give an NPC a stat block (SRD or homebrew) and **Add to combat** puts them in the fight under their own name, with that monster's actions
- Searchable table with attitude and status filters

**Encounters** (inside each campaign)
- Prepare fights in advance: monsters (SRD or homebrew) with quantities, notes, and Planned / Used status
- Live difficulty for the party: 2014 (adjusted XP vs Easy / Medium / Hard / Deadly) or 2024 (XP vs Low / Moderate / High budgets), following the edition switch; untick PCs who aren't at the session
- **Load into combat**: replace or add to monsters already in the fight, one initiative roll per group, average or rolled HP, and optionally add the party

**Combat tracker**
- **+ Add combatant** opens a form for players and custom monsters (leave Initiative blank to roll a d20; press Enter to add). It stays open for the next one until you close it with ✕, so the tracker shows just the fight
- Turn order sorted by initiative, with a round counter and Previous / Next turn
- Damage, healing and temporary HP (damage uses up temp HP first; HP stays between 0 and max)
- Conditions from the SRD, plus Concentrating; hover a condition to read it, click it to remove it
- **Condition durations**: until removed, a number of rounds, until the start or end of someone's next turn, or save ends. Conditions that run out are removed and listed above the tracker
- **Saves waiting for you** above the tracker: "save ends" conditions at the end of the creature's turn, and Con saves when a concentrating creature takes damage. Monsters roll with their bonus; for PCs press Passed or Failed
- **Resistances, immunities and vulnerabilities** from stat blocks (and PC sheets) show as tags on each row. Those rows get a damage type picker, so typed-in player damage is adjusted (½, ×2 or 0), with a **Magical** tick-box for "from nonmagical attacks". Temporary ones (Rage, Absorb Elements) are added from + Condition, and a warning shows for conditions a creature is immune to
- **Group save**: pick the ability, DC and targets (monsters roll, players tick their result), optionally roll damage once (half or none on a success) and add a condition to everyone who failed
- **Start combat** asks for each player's initiative roll (or rolls a d20 for them); monsters roll their own
- **Undo / Redo** (⌘Z / ⇧⌘Z) for the last 20 changes, named on hover, e.g. "Undo: 8 damage to Thorin". PC HP on the party cards follows
- Edit initiative inline. Under **More ▾**: End combat, **Reset combat** (run the same fight again: full HP, no conditions, spell slots and uses back), Clear NPCs (keeps the party for the next fight) and Clear all
- The toolbar stays put at the top of the screen. Click a monster's name and the table narrows to the left while its **actions panel** slides in on the right (it also opens automatically on the monster's turn):
  - **To hit** (with advantage/disadvantage) and **Damage** buttons for every attack; a natural 20 doubles the damage dice
  - Tick boxes for extra or conditional damage, saving throw DCs, and **Apply** / **Apply half** to a target
  - **Saving throw** buttons for all six abilities (with proficiencies), and **Group save** on breath weapons and save spells, filled in for you
  - Recharge abilities, X/Day uses and legendary actions tracked with clickable pips
  - **Spellcasting**: spell slots, upcasting, X/Day spells, spell details, spell attacks and damage, and automatic Concentrating (with a Con save reminder when hit)
  - A quick dice roller for monsters you added by hand, and a history of the last 10 rolls
- Everything is saved in the browser's database, so a refresh doesn't lose the fight

**Quick lookup** (press **⌘K** anywhere)
- Search conditions, monsters, spells, magic items, equipment (with prices, damage and armour class) and rules, or all of them at once
- Full monster stat blocks with **Add to combat** (each monster rolls its own initiative)
- Quick rules for the things GMs look up most (cover, DCs, exhaustion, grappling, travel pace…), plus the full SRD rules sections for 2014
- Switch between the **2014** and **2024** rules in the top right

**Homebrew**
- Your own monsters and spells, in a shared library used by every campaign
- Start from scratch, or press **Make homebrew copy** on any SRD monster or spell in Quick Lookup
- Monster editor with a live stat block preview: attacks, damage dice, saving throws, Recharge / X per day uses, legendary actions and spellcasting (SRD or homebrew spells)
- Spell editor: spell attack or saving throw, damage and healing as base dice plus extra per level
- Tag each entry 2014, 2024 or Both; homebrew appears in Quick Lookup and works in the combat tracker's actions panel like SRD content
- Export / import the homebrew library on its own (and it's included in **Export all**)

**Generators** (one tab each; inside a campaign, results can be saved to it)
- **NPC**: name by species and gender, occupation, looks, personality, mannerism, motivation and a secret; save the good ones as NPCs
- **Names**: ten names at a time by species and gender; **Make NPC** on any of them
- **Encounter**: monsters from an environment (forest, underdark, urban…) at the difficulty you pick, balanced for the party (or a size and level you type), with a reason they're there. **Save as encounter** or **Load into combat**. Homebrew monsters can be given environments
- **Rumours & hooks**: rumours marked true, partly true or false (with what's really going on), and plot hooks with a giver, goal, catch and reward
- **Tavern**: name, innkeeper, atmosphere, patrons, menu and prices, and rumours
- **Shop**: general store, blacksmith, alchemist, fletcher or magic shop in a village, town or city, with a shopkeeper and priced stock (click an item to look it up)
- **Loot**: individual treasure or hoards by challenge rating, with gems and SRD magic items
- Rumours, hooks, taverns and shops have **Add to session plan** (under the template's matching heading) and **Add to campaign notes**; innkeepers and shopkeepers can be saved as NPCs

## Goals

- **Laptop-first**: designed for a laptop behind the GM screen, with a keyboard and a big screen
- **Personal use**: runs locally with no accounts or server; everything keeps working offline
- **Both 5e rulesets**: supports 2014 (SRD 5.1) and 2024 (SRD 5.2), with a toggle between them
- **Fast at the table**: every action should take a click or two, or a keyboard shortcut

## Roadmap

### v0.1: Run the table ✅
Combat tracker, quick lookup and generators, as above.

### Campaigns ✅
Home page, campaigns with party, combat, NPCs and notes, Quick combat, backups.

### Monster actions ✅
Actions panel in the combat tracker with attack, damage and spell rolls, and limited-use tracking.

### Homebrew ✅
Homebrew monsters and spells with editors, SRD copies, edition tags and export/import.

### Encounters ✅
Prepared encounters with difficulty for the party, loaded into combat with group initiative and optional rolled HP.

### NPCs ✅
Custom NPCs with species, gender, role, location, faction, attitude, status, portrait, Markdown notes and a stat block for combat.

### Session prep and log ✅
Session plan with a template and tick-boxes, formatted campaign notes, party cards, planned encounters on the Overview, and End session into an editable session log.

### More generators ✅
Names, random encounters by environment, rumours and plot hooks, taverns and shops, plus equipment in Quick Lookup.

### Combat quality of life ✅
Condition durations, saves waiting above the tracker (save ends and concentration), monster saving throw buttons, group saves, the initiative prompt, Undo / Redo, Reset combat, and resistances / immunities / vulnerabilities applied to damage.

### Later: All-in-one toolkit
- Campaign wiki: locations, factions and items, linked to each other and to NPCs
- More generators: weather, travel events, settlements, dungeon dressing and traps
- Optional: sync between devices, a second-screen view for players

## Tech Stack

| Area | Choice |
|---|---|
| Language | TypeScript |
| UI | React + Vite |
| Storage | IndexedDB (the browser's built-in database) via [Dexie](https://dexie.org/); small preferences in localStorage |
| Page addresses | React Router |
| Formatted notes | [TipTap](https://tiptap.dev/) editor |
| Rules data | SRD content bundled as JSON, built from [5e-database](https://github.com/5e-bits/5e-database) (plus [Open5e](https://open5e.com) for 2024 magic item tables) |
| Tests | Vitest (unit), playwright-core with Chrome (browser flows) |

## Getting Started

Requires [Node.js](https://nodejs.org/) 20.19 or later.

```bash
npm install    # install dependencies
npm run dev    # start the dev server at http://localhost:5173
```

Other commands:

```bash
npm test       # run the unit tests
npm run e2e    # run the browser tests (needs Google Chrome installed)
npm run lint   # check the code with ESLint
npm run build  # type-check and build into dist/
npm run srd    # re-download the SRD data into src/data/srd/
```

## Known limitations

- **Encounter difficulty tables** (2014 XP thresholds and multipliers, 2024 XP budgets) were entered by hand in `src/lib/encounters.ts`, because they aren't in the SRD data source. Check them against your books.
- **Quick rules** (`src/data/quickRules.ts`) are a hand-written summary, not official text. The 2024 data has no full rules sections, so only the quick rules show in 2024 mode.
- **Loot tables** are simplified, not the official treasure tables. Magic items come from the SRD.
- **Missing source text:** five 2024 entries end mid-sentence in the 5e-database data and can't be rebuilt from it: *Vampire Weakness* (Vampire Spawn and the three Vampire forms) and the Sphinx of Valor's *Roar*.
- **Legendary actions** default to 3 per round, because the data doesn't record the number; change it per monster with − / + in the actions panel.
- **Spells without damage data** (e.g. Hold Person, Counterspell) show their text only in the actions panel; there's nothing to roll.
- **Extra damage tick boxes** use a text rule to guess whether an extra damage part is conditional (e.g. "if the attack roll had Advantage"). Check the ticks on unusual monsters.
- **Previous turn** moves the turn marker back but doesn't undo condition timers that ran out or counted down; use **Undo** to fully reverse a Next turn.
- **Undo history** lasts while the combat page is open, and covers changes made in the tracker (not monsters added from Quick Lookup, encounters, NPCs or Add party).
- **Group save damage** from a monster's action uses its first damage part (e.g. a breath weapon's dice); edit the box for anything else.
- **Monster environments** for random encounters were tagged by hand in `src/data/environments.ts` (the SRD data doesn't have them), loosely following the DMG. Adjust the lists to taste.
- **Magic item prices** in shops are hand-written bands by rarity, since the SRD doesn't price magic items. Mundane equipment uses the SRD list prices.
- **Unusual resistances** the app can't check (e.g. "from magic weapons wielded by good creatures", "damage from spells", silvered or adamantine weapons) are shown with a ⚠ on the tag and not applied automatically.
- **NPC portraits** are shrunk to 256 px and stored in the database, so each one adds roughly 10–30 KB to a backup file.
- **Data lives in this browser only.** Clearing site data deletes it, so use **Export all** on the home page for backups.

## Legal

D&D rules content comes from the Systems Reference Document ([SRD 5.1 and SRD 5.2](https://www.dndbeyond.com/srd)) by Wizards of the Coast LLC, licensed under Creative Commons Attribution 4.0. The data files are built from the MIT-licensed [5e-database](https://github.com/5e-bits/5e-database) project; 2024 magic item tables come from [Open5e](https://open5e.com)'s copy of SRD 5.2 (CC-BY-4.0), because the 5e-database copies lost their layout. This project is not affiliated with or endorsed by Wizards of the Coast.
