// Hand-written quick reference for the rules GMs look up most during play.
// Written in Markdown. Entries marked with one edition only appear for that edition;
// the rest are the same in both.

import type { Edition } from '../types'
import type { TextEntry } from './srd'

type QuickRule = TextEntry & { edition?: Edition }

const quickRules: QuickRule[] = [
  {
    index: 'quick-typical-dcs',
    name: 'Typical Difficulty Classes',
    desc: `| Task | DC |
|---|---|
| Very easy | 5 |
| Easy | 10 |
| Medium | 15 |
| Hard | 20 |
| Very hard | 25 |
| Nearly impossible | 30 |`,
  },
  {
    index: 'quick-cover',
    name: 'Cover',
    desc: `| Cover | Effect |
|---|---|
| Half (e.g. low wall, another creature) | +2 to AC and Dexterity saving throws |
| Three-quarters (e.g. arrow slit, thick tree trunk) | +5 to AC and Dexterity saving throws |
| Total (completely concealed) | Can't be targeted directly by an attack or spell |

If a target is behind more than one source of cover, only the most protective one applies.`,
  },
  {
    index: 'quick-concentration',
    name: 'Concentration',
    edition: '2014',
    desc: `When you take damage while concentrating on a spell, make a **Constitution saving throw**. The DC is **10 or half the damage taken**, whichever is higher. Make a separate save for each source of damage.

Concentration also ends if you cast another concentration spell, are incapacitated, or die.`,
  },
  {
    index: 'quick-concentration',
    name: 'Concentration',
    edition: '2024',
    desc: `When you take damage while concentrating on a spell, make a **Constitution saving throw**. The DC is **10 or half the damage taken**, whichever is higher, up to a maximum of **DC 30**.

Concentration also ends if you cast another concentration spell, have the Incapacitated condition, or die.`,
  },
  {
    index: 'quick-death-saves',
    name: 'Death Saving Throws',
    desc: `At the start of each turn at 0 HP, roll a d20 with no modifiers:

- **10 or higher:** success. **Under 10:** failure.
- **3 successes:** stable (unconscious, no more saves). **3 failures:** dead.
- **Natural 1:** counts as two failures. **Natural 20:** regain 1 HP.
- **Damage while at 0 HP:** one failure (a critical hit is two). If the damage equals or exceeds the creature's HP maximum, it dies instantly.`,
  },
  {
    index: 'quick-exhaustion',
    name: 'Exhaustion',
    edition: '2014',
    desc: `| Level | Effect |
|---|---|
| 1 | Disadvantage on ability checks |
| 2 | Speed halved |
| 3 | Disadvantage on attack rolls and saving throws |
| 4 | Hit point maximum halved |
| 5 | Speed reduced to 0 |
| 6 | Death |

Effects add up. A long rest with food and drink removes one level.`,
  },
  {
    index: 'quick-exhaustion',
    name: 'Exhaustion',
    edition: '2024',
    desc: `Each level of Exhaustion gives:

- **−2 per level** to every D20 Test (ability checks, attack rolls and saving throws)
- **Speed reduced by 5 feet per level**

At **level 6** the creature dies. Finishing a Long Rest removes one level.`,
  },
  {
    index: 'quick-grappling',
    name: 'Grappling',
    edition: '2014',
    desc: `Use one attack of the Attack action. The target must be no more than one size larger and within reach.

- Make a **Strength (Athletics)** check against the target's **Strength (Athletics) or Dexterity (Acrobatics)** check (target's choice). On a win, the target is **Grappled** (speed 0).
- **Escaping:** use an action for a Strength (Athletics) or Dexterity (Acrobatics) check against the grappler's Strength (Athletics).
- **Moving a grappled creature:** your speed is halved, unless the creature is two or more sizes smaller.`,
  },
  {
    index: 'quick-grappling',
    name: 'Grappling',
    edition: '2024',
    desc: `Use an **Unarmed Strike** to grapple. The target must be no more than one size larger and within reach.

- The target makes a **Strength or Dexterity saving throw** (its choice) against **DC 8 + your Strength modifier + your Proficiency Bonus**. On a failure, it has the **Grappled** condition.
- **Escaping:** the target uses an action for a Strength (Athletics) or Dexterity (Acrobatics) check against the same DC.
- **Moving a grappled creature:** each foot costs 1 extra foot, unless the creature is Tiny or two or more sizes smaller.`,
  },
  {
    index: 'quick-actions',
    name: 'Actions in Combat',
    edition: '2014',
    desc: `**Attack**, **Cast a Spell**, **Dash** (extra movement equal to your speed), **Disengage** (no opportunity attacks this turn), **Dodge** (attacks against you have disadvantage; advantage on Dex saves), **Help** (an ally gets advantage), **Hide**, **Ready** (prepare a reaction to a trigger), **Search**, **Use an Object**.`,
  },
  {
    index: 'quick-actions',
    name: 'Actions in Combat',
    edition: '2024',
    desc: `**Attack**, **Dash** (extra movement equal to your Speed), **Disengage** (no Opportunity Attacks this turn), **Dodge** (attacks against you have Disadvantage; Advantage on Dex saves), **Help** (an ally gets Advantage), **Hide**, **Influence** (Charisma check to sway a creature), **Magic** (cast a spell or use a magic item), **Ready**, **Search**, **Study** (Intelligence check to recall or investigate), **Utilize** (use a nonmagical object).`,
  },
  {
    index: 'quick-travel-pace',
    name: 'Travel Pace',
    edition: '2014',
    desc: `| Pace | Per minute | Per hour | Per day | Effect |
|---|---|---|---|---|
| Fast | 400 ft | 4 miles | 30 miles | −5 to passive Wisdom (Perception) |
| Normal | 300 ft | 3 miles | 24 miles | — |
| Slow | 200 ft | 2 miles | 18 miles | Can travel stealthily |`,
  },
  {
    index: 'quick-travel-pace',
    name: 'Travel Pace',
    edition: '2024',
    desc: `| Pace | Per hour | Per day | Effect |
|---|---|---|---|
| Fast | 4 miles | 30 miles | Disadvantage on Wisdom (Perception or Survival) checks |
| Normal | 3 miles | 24 miles | Disadvantage on Dexterity (Stealth) checks |
| Slow | 2 miles | 18 miles | Advantage on Wisdom (Perception or Survival) checks |`,
  },
  {
    index: 'quick-falling',
    name: 'Falling',
    desc: `A fall deals **1d6 bludgeoning damage per 10 feet** fallen, to a maximum of **20d6**. The creature lands **prone** unless it avoids taking any damage from the fall.`,
  },
  {
    index: 'quick-suffocating',
    name: 'Suffocating',
    edition: '2014',
    desc: `A creature can hold its breath for **1 + Constitution modifier minutes** (minimum 30 seconds).

When it runs out of breath, it survives for a number of rounds equal to its **Constitution modifier** (minimum 1). At the start of its next turn, it drops to 0 HP and is dying.`,
  },
  {
    index: 'quick-suffocating',
    name: 'Suffocating',
    edition: '2024',
    desc: `A creature can hold its breath for **1 + Constitution modifier minutes** (minimum 30 seconds).

When it runs out of breath, it gains **1 Exhaustion level at the end of each of its turns**. When it can breathe again, it removes all Exhaustion levels gained this way.`,
  },
  {
    index: 'quick-resting',
    name: 'Resting',
    edition: '2014',
    desc: `- **Short rest (1 hour):** spend Hit Dice to regain HP (roll each die + Constitution modifier).
- **Long rest (8 hours, at least 6 asleep):** regain all lost HP and up to half your total Hit Dice (minimum 1). Only one long rest per 24 hours. An hour or more of walking, fighting or casting spells interrupts it.`,
  },
  {
    index: 'quick-resting',
    name: 'Resting',
    edition: '2024',
    desc: `- **Short Rest (1 hour):** spend Hit Point Dice to regain HP (roll each die + Constitution modifier).
- **Long Rest (8 hours):** regain all lost HP and all spent Hit Point Dice, and remove one Exhaustion level. Only one Long Rest per 24 hours. Rolling Initiative, casting a spell other than a cantrip, taking damage, or an hour of walking interrupts it.`,
  },
  {
    index: 'quick-vision',
    name: 'Vision and Light',
    desc: `- **Lightly obscured** (dim light, patchy fog): disadvantage on Wisdom (Perception) checks that rely on sight.
- **Heavily obscured** (darkness, thick fog): a creature trying to see something there is effectively **Blinded**.
- **Darkvision:** within its range, dim light counts as bright light and darkness counts as dim light (no colour, only shades of grey).`,
  },
]

// The quick rules for one edition.
export function quickRulesFor(edition: Edition): TextEntry[] {
  return quickRules.filter((r) => !r.edition || r.edition === edition)
}
