# DnD GM Companion App

A companion app for Game Masters running Dungeons & Dragons 5e. It starts as a toolkit for running sessions at the table (combat tracker, quick lookup, random generators) and will grow into an all-in-one GM toolkit covering session prep, encounter building and a campaign wiki.

> **Status:** v0.1 (run the table) is built.

## Features

**Combat tracker**
- Add players and custom monsters (leave Initiative blank to roll a d20). Press Enter to add.
- Turn order sorted by initiative, with a round counter and Previous / Next turn
- Damage, healing and temporary HP (damage uses up temp HP first; HP stays between 0 and max)
- Conditions from the SRD, plus Concentrating; hover a condition to read it, click it to remove it
- Edit initiative inline; Clear NPCs keeps the party for the next fight
- Everything is saved in the browser, so a refresh doesn't lose the fight

**Quick lookup** (press **⌘K** anywhere)
- Search conditions, monsters, spells, magic items and rules, or all of them at once
- Full monster stat blocks with **Add to combat** (each monster rolls its own initiative)
- Quick rules for the things GMs look up most (cover, DCs, exhaustion, grappling, travel pace…), plus the full SRD rules sections for 2014
- Switch between the **2014** and **2024** rules in the top right

**Generators**
- NPCs: name by ancestry, occupation, looks, personality, mannerism, motivation and a secret
- Loot: individual treasure or hoards by challenge rating, with gems and SRD magic items (click an item to read it)

## Goals

- **Laptop-first**: designed for a laptop behind the GM screen, with a keyboard and a big screen
- **Personal use**: runs locally with no accounts or server; everything keeps working offline
- **Both 5e rulesets**: supports 2014 (SRD 5.1) and 2024 (SRD 5.2), with a toggle between them
- **Fast at the table**: every action should take a click or two, or a keyboard shortcut

## Roadmap

### v0.1: Run the table ✅
Combat tracker, quick lookup and generators, as above.

### v0.2: Quality of life
- Save and load named encounters
- Condition durations and concentration reminders
- Monster stat blocks shown inside the combat tracker
- Clickable dice rolls in stat blocks
- Roll monster HP from hit dice instead of using the average

### Later: All-in-one toolkit
- Session prep: scenes, secrets and clues, planned encounters
- Encounter builder with difficulty estimates
- Campaign wiki: NPCs, locations, factions and items, all linked to each other
- Session log and recaps
- More generators: random encounters, taverns and shops, weather, rumours
- Optional: sync between devices, a second-screen view for players

## Tech Stack

| Area | Choice |
|---|---|
| Language | TypeScript |
| UI | React + Vite |
| Storage | The browser's localStorage (a database such as IndexedDB/Dexie can come later for the wiki) |
| Rules data | SRD content bundled as JSON, built from [5e-database](https://github.com/5e-bits/5e-database) |
| Tests | Vitest |

## Getting Started

Requires [Node.js](https://nodejs.org/) 20.19 or later.

```bash
npm install    # install dependencies
npm run dev    # start the dev server at http://localhost:5173
```

Other commands:

```bash
npm test       # run the unit tests
npm run lint   # check the code with ESLint
npm run build  # type-check and build into dist/
npm run srd    # re-download the SRD data into src/data/srd/
```

## Legal

D&D rules content comes from the Systems Reference Document ([SRD 5.1 and SRD 5.2](https://www.dndbeyond.com/srd)) by Wizards of the Coast LLC, licensed under Creative Commons Attribution 4.0. The data files are built from the MIT-licensed [5e-database](https://github.com/5e-bits/5e-database) project. This project is not affiliated with or endorsed by Wizards of the Coast.
