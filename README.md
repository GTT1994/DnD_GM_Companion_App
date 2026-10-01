# DnD GM Companion App

A companion app for Game Masters running Dungeons & Dragons 5e. It starts as a toolkit for running sessions at the table (combat tracker, quick lookup, random generators) and will grow into an all-in-one GM toolkit covering session prep, encounter building and a campaign wiki.

> **Status:** Planning. No code yet.

## Goals

- **Laptop-first**: designed for a laptop behind the GM screen, with a keyboard and a big screen
- **Personal use**: runs locally with no accounts or server; everything keeps working offline
- **Both 5e rulesets**: supports 2014 (SRD 5.1) and 2024 (SRD 5.2), with a toggle between them
- **Fast at the table**: every action should take a click or two, or a keyboard shortcut

## Roadmap

### v0.1: Run the table (MVP)

**Combat tracker (lean)**
- [ ] Add players and monsters to an encounter
- [ ] Enter or roll initiative, then sort into turn order
- [ ] Track HP (damage/heal), AC and temp HP
- [ ] Apply and remove conditions
- [ ] Round counter and next/previous turn
- [ ] Add a monster straight from the Quick Lookup

**Quick lookup**
- [ ] Conditions
- [ ] Monsters (SRD stat blocks)
- [ ] Spells
- [ ] Rules snippets (cover, grappling, exhaustion, travel pace, DCs, etc.)
- [ ] Search box that opens from anywhere with a keyboard shortcut
- [ ] 2014 / 2024 ruleset toggle

**Random generators**
- [ ] NPC: name, race, personality trait, mannerism
- [ ] Loot and treasure by challenge level (CR) or tier

### v0.2: Quality of life
- Save and reload encounters
- Condition durations and concentration reminders
- Monster stat blocks shown inside the combat tracker
- Clickable dice rolls

### Later: All-in-one toolkit
- Session prep: scenes, secrets and clues, planned encounters
- Encounter builder with difficulty estimates
- Campaign wiki: NPCs, locations, factions and items, all linked to each other
- Session log and recaps
- More generators: random encounters, taverns and shops, weather, rumours
- Optional: sync between devices, a second-screen view for players

## Planned Tech Stack

| Area | Choice | Why |
|---|---|---|
| Language | TypeScript | Typed like C#, and the standard for modern web apps |
| UI | React + Vite | Most popular modern web stack, fast to develop with |
| Storage | IndexedDB via [Dexie](https://dexie.org/) | Saves data in the browser with no server needed; SQLite is an option later for the wiki |
| Rules data | SRD content bundled as JSON | Works offline; 2014 data from [5e-database](https://github.com/5e-bits/5e-database), 2024 data still to be sourced or converted |

## Getting Started

Requires [Node.js](https://nodejs.org/) 20.19 or later.

```bash
npm install    # install dependencies
npm run dev    # start the dev server at http://localhost:5173
```

## Legal

D&D rules content comes from the Systems Reference Document ([SRD 5.1 and SRD 5.2](https://www.dndbeyond.com/srd)), licensed under Creative Commons Attribution 4.0. This project is not affiliated with or endorsed by Wizards of the Coast.
